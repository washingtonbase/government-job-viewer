package main

import (
	"context"
	"database/sql"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"golang.org/x/sync/semaphore"

	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// var BASE_URL = "https://ark.cn-beijing.volces.com/"
// var MODEL = "ep-20250123190419-k9b5x" // 豆包

var BASE_URL = "https://api.deepseek.com"
var MODEL = "deepseek-chat"

// var BASE_URL = "https://open.bigmodel.cn/api/paas/v4/"
// var MODEL = "glm-4-flash"

// var BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"

// 初始化 KeyManager
var keyManager = NewKeyManager([]string{
	// "9b36ec310b364b1c9ccc26b1b7ab579e.T87VdaSnt3aORWF7", // 智谱
	// "a76f1b079de9426da487f4510582e8de.oHIO0mS4n6vcDkiI",
	// "86840b22-2b87-42a7-b066-95030dc7d511", // 豆包
	// "441986b8-e91a-4429-9621-9ea8641ccc30",
	// "sk-43437784f4d04795af090b62117aa688", // DeepSeek
	"sk-11157ac1b4c54a399bbaafce1aa9226b",
}, checkKey)

// 全局变量：标记当前环境
var isTestEnv bool = false // true 表示测试环境，false 表示生产环境

// 全局变量：存储职位信息
var positions []string

// KeyManager 管理一组 API Key
type KeyManager struct {
	keys          []string          // 所有 Key
	status        map[string]bool   // Key 状态（true: 可用, false: 不可用）
	mutex         sync.Mutex        // 保护并发访问
	checker       func(string) bool // 检查 Key 是否可用的函数
	forceFailTime time.Time         // 强制失效时间
}

// NewKeyManager 初始化 Key 管理器
func NewKeyManager(keys []string, checker func(string) bool) *KeyManager {
	status := make(map[string]bool)
	for _, key := range keys {
		status[key] = true // 初始状态为可用
	}

	return &KeyManager{
		keys:          keys,
		status:        status,
		mutex:         sync.Mutex{}, // 显式初始化 mutex
		checker:       checker,
		forceFailTime: time.Now().Add(1000 * time.Second), // 初始化 forceFailTime
	}
}

// GetKey 获取一个可用的 Key
func (m *KeyManager) GetKey() (string, bool) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	// 如果当前时间超过强制失效时间，直接返回不可用
	if isTestEnv && !m.forceFailTime.IsZero() && time.Now().After(m.forceFailTime) {
		return "", false
	}

	// 收集所有可用的 Key
	var availableKeys []string
	for _, key := range m.keys {
		if m.status[key] {
			availableKeys = append(availableKeys, key)
		}
	}
	// 如果没有可用的 Key，返回 false
	if len(availableKeys) == 0 {
		return "", false
	}
	randomIndex := rand.Intn(len(availableKeys))
	return availableKeys[randomIndex], true
}

// ReportUnavailable 报告 Key 不可用
func (m *KeyManager) ReportUnavailable(key string) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	m.status[key] = false // 标记为不可用
	log.Printf("Key %s 被报告为不可用\n", key)
}

func (m *KeyManager) KeysHealthCheck() {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	for _, key := range m.keys {
		m.status[key] = m.checker(key)
	}
}

func (m *KeyManager) AddKey(key string) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	// 如果 Key 已经存在，则不添加
	for _, k := range m.keys {
		if k == key {
			return
		}
	}

	// 添加新的 Key 并标记为可用
	m.keys = append(m.keys, key)
	m.status[key] = true
	log.Printf("Key %s 已添加\n", key)
}

// LoadKeysFromDB 从数据库加载 Key 和状态
func (m *KeyManager) LoadKeysFromDB(db *sql.DB) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	// 查询数据库中的所有 Key
	rows, err := db.Query("SELECT key, is_active FROM api_keys")
	if err != nil {
		return fmt.Errorf("查询数据库失败: %v", err)
	}
	defer rows.Close()

	// 清空当前的 Key 和状态
	m.keys = []string{}
	m.status = make(map[string]bool)

	// 遍历查询结果，加载到 KeyManager
	for rows.Next() {
		var key string
		var isActive bool
		if err := rows.Scan(&key, &isActive); err != nil {
			return fmt.Errorf("读取数据失败: %v", err)
		}
		m.keys = append(m.keys, key)
		m.status[key] = isActive
		fmt.Printf("%v \n", key)
	}

	// 检查遍历过程中是否有错误
	if err := rows.Err(); err != nil {
		return fmt.Errorf("遍历数据失败: %v", err)
	}

	log.Println("从数据库加载 Key 成功")
	return nil
}

// 检查 Key 是否可用的函数
func checkKey(key string) bool {

	// 生产环境：正常检查 Key 是否可用
	client := openai.NewClient(
		option.WithAPIKey(key),
		option.WithBaseURL(BASE_URL),
	)

	// 发送测试 Completion 请求
	_, err := client.Chat.Completions.New(context.TODO(), openai.ChatCompletionNewParams{
		Messages: openai.F([]openai.ChatCompletionMessageParamUnion{
			openai.UserMessage("Test"),
		}),
		Model: openai.F(MODEL),
	})

	return err == nil
}

// 初始化 OpenAI 客户端
func initClient() (*openai.Client, string, error) {
	key, ok := keyManager.GetKey()
	if !ok {
		return nil, "", errors.New("ALL API KEYS FAILED")
	}

	client := openai.NewClient(
		option.WithAPIKey(key),
		option.WithBaseURL(BASE_URL),
	)
	return client, key, nil
}

// 判别职位
func judgePosition(client *openai.Client, positionInfo, userPrompt string) (string, error) {
	systemPrompt := `
	你需要根据用户的描述，判断他是否符合某个职位的要求。

	IMPORTANT! You only need to return '符合要求' or '不符合要求' or '不确定' , dont need to say anything else
	`

	messages := []openai.ChatCompletionMessageParamUnion{
		openai.SystemMessage(systemPrompt),
		openai.UserMessage(fmt.Sprintf("Position Info: %s\nUser Prompt: %s", positionInfo, userPrompt)),
	}

	resp, err := client.Chat.Completions.New(context.TODO(), openai.ChatCompletionNewParams{
		Messages: openai.F(messages),
		Model:    openai.F(MODEL),
	})
	if err != nil {
		return "", errors.New("请求错误")
	}
	// fmt.Print(resp.Choices[0].Message.Content + "\n")
	// fmt.Print(positionInfo + "\n")
	if resp.Choices[0].Message.Content == "符合要求" {
		return positionInfo, nil
	} else {
		return "", nil
	}
}

/*
1. 控制并发数
2. 任何一个任务失败，取消其他任务
3. 错误也要抛出
4. 资源回收
5. 返回已完成的结果
6. 实时显示进度
7. 保证任何情况下（无论完成还是错误）结束后，不会有尚未结束的子 routine

中间一共两个地方会出错：progress 和 task

todo: 限制传入的 task 一定没有任何子 routine。 最好能通过类型检查实现

todo: ParallelTasks 能否嵌套使用

todo: 让外部可以把 ParallelTasks 取消

todo: 如果我忘记把 progressChan 关闭，进度 routine 就会泄露。 Golang 如何通过静态检查发现这一点

todo: 使用并发安全的 array 来存储 results

todo: 标记 task 为互相绝不会发生资源共享的函数
*/
func ParallelTasks(data []interface{}, concurrency int, task func(interface{}) (interface{}, error), progress func(int) error) (result []interface{}, err_ error) {
	ctx, cancel := context.WithCancelCause(context.Background())
	defer cancel(nil)

	var wg_task sync.WaitGroup
	var wg_progress sync.WaitGroup

	sem := semaphore.NewWeighted(int64(concurrency)) // 控制并发数
	var mu sync.Mutex                                // 保护 results 的并发访问
	var results []interface{}

	progressChan := make(chan int, len(data)) // 进度通道

	defer func() {
		close(progressChan)
		wg_progress.Wait()
	}()

	// 启动进度更新 Goroutine
	wg_progress.Add(1)
	go func() {
		defer wg_progress.Done()
		processed := 0
		for range progressChan {
			processed++
			err := progress(processed)
			if err != nil {
				cancel(errors.New("progress 遇到错误"))
				err_ = err
			}
		}
	}()

	// 启动任务 Goroutine
	for i, item := range data {
		i, item := i, item // 避免闭包捕获问题
		if err := sem.Acquire(ctx, 1); err != nil {
			fmt.Printf("获取锁错误 %v 这个原因", context.Cause(ctx))
			break
		}

		wg_task.Add(1)

		go func() {
			defer wg_task.Done()

			defer sem.Release(1)

			select {
			case <-ctx.Done():
			default:
				res, err := task(item)
				if err != nil {
					cancel(err)
					err_ = err
				}

				mu.Lock()
				defer mu.Unlock()
				if res != "" {
					// todo 其实不应该在 ParallelTasks 里面做这种判断的。理想情况下，task 应该能返回字符串或者 nil，结果为 nil 的时候再舍弃。但现在由于我不知道如何声明 task 的返回值为 string | nil（golang 似乎没有联合类型），所以只能返回字符串
					results = append(results, res) // 将结果添加到 results
				}

				progressChan <- i // 发送进度
			}
		}()
	}

	wg_task.Wait()
	return results, err_
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	var wsMutex sync.Mutex // 全局互斥锁
	// 升级 HTTP 连接为 WebSocket 连接
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("升级 WebSocket 失败: %v\n", err)
		return
	}
	defer func() {
		// 这个非常重要，直接 conn.Close() 会返回 1006，属于非正常关闭
		conn.WriteControl(
			websocket.CloseMessage,
			websocket.FormatCloseMessage(websocket.CloseNormalClosure, "正常关闭"),
			time.Now().Add(time.Second),
		)
		conn.Close()
	}()

	// 创建一个 context 用于管理 Goroutine 生命周期
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// 读取客户端消息
	_, message, err := conn.ReadMessage()
	if err != nil {
		log.Printf("读取客户端消息失败: %v\n", err)
		return
	}

	// 解析用户消息
	var request struct {
		UserPrompt string `json:"user_prompt"`
		APIKey     string `json:"api_key"`
	}

	if err := json.Unmarshal(message, &request); err != nil {
		log.Printf("解析用户消息失败: %v\n", err)
		return
	}

	// 如果 api_key 不为空，添加到 KeyManager
	if request.APIKey != "" {
		keyManager.AddKey(request.APIKey)
	}

	key, ok := keyManager.GetKey()
	if !ok {
		errorMessage := map[string]interface{}{
			"type":  "error",
			"error": "ALL API KEYS FAILED",
		}
		if err := conn.WriteJSON(errorMessage); err != nil {
			log.Printf("推送错误信息失败: %v\n", err)
		}
		return
	} else {
		fmt.Print(key)
	}

	// 将职位信息转换为 []interface{}
	data := make([]interface{}, len(positions))
	for i, position := range positions {
		data[i] = position
	}

	// 定义任务函数
	task := func(item interface{}) (interface{}, error) {
		position := item.(string)

		// 初始化 OpenAI 客户端
		client, key, err := initClient()
		if err != nil {
			return nil, err
		}

		// 判别职位
		result, err := judgePosition(client, position, request.UserPrompt)
		if err != nil {
			keyManager.ReportUnavailable(key) // 报告 Key 不可用
			return nil, err
		}
		return result, err
	}

	// 定义进度函数
	progress := func(processed int) error {
		wsMutex.Lock()
		defer wsMutex.Unlock()
		total := len(data)

		// 推送进度到客户端
		progressMessage := map[string]interface{}{
			"type":      "progress",
			"processed": processed,
			"total":     total,
		}

		if err := conn.WriteJSON(progressMessage); err != nil {
			fmt.Printf("推送进度失败 %v\n", err)
			return errors.New("推送进度失败")
		}
		return nil
	}

	// 在测试环境中，模拟 Key 失效
	if isTestEnv {
		// 启动 Goroutine 定期标记 Key 为不可用
		go func() {
			ticker := time.NewTicker(10 * time.Second) // 创建一个定时器，每隔 10 秒触发一次
			defer ticker.Stop()                        // 确保在 Goroutine 退出时停止定时器

			for {
				select {
				case <-ticker.C: // 定时器触发
					key, ok := keyManager.GetKey() // 使用 GetKey 获取一个可用的 Key
					if !ok {
						log.Println("没有可用的 Key")
						continue
					}

					keyManager.ReportUnavailable(key) // 标记 Key 为不可用
					log.Printf("Key %s 被标记为不可用\n", key)

				case <-ctx.Done(): // 上下文被取消
					return // 退出 Goroutine
				}
			}
		}()
	}
	results, err := ParallelTasks(data, 100, task, progress)
	if err != nil {
		error_message := map[string]interface{}{
			"type":   "error",
			"error":  err.Error(),
			"result": results,
		}
		if err := conn.WriteJSON(error_message); err != nil {
			fmt.Print("向前端推送错误失败")
		}
	}
	// 推送最终结果到客户端
	finalResult := map[string]interface{}{
		"type":      "result",
		"qualified": results,
	}

	wsMutex.Lock()
	defer wsMutex.Unlock()
	if err := conn.WriteJSON(finalResult); err != nil {
		fmt.Printf("推送最终结果失败: %v\n", err)

	}
}

func readPositions(filePath string) ([]string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("无法打开文件: %v", err)
	}
	defer file.Close()

	// 创建 CSV 读取器并启用 LazyQuotes
	reader := csv.NewReader(file)
	reader.LazyQuotes = true    // 允许未转义的双引号
	reader.FieldsPerRecord = -1 // 允许每行的字段数量不一致

	// 读取所有记录
	records, err := reader.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("解析 CSV 文件失败: %v", err)
	}

	// 获取表头
	headers := records[0]

	// 生成 JSON 格式的数据
	positions := make([]string, 0)
	for _, record := range records[1:] { // 跳过表头
		if len(record) == len(headers) { // 字段数量匹配
			rowData := make(map[string]string)
			for i, value := range record {
				rowData[headers[i]] = value
			}
			jsonData, err := json.MarshalIndent(rowData, "", "  ")
			if err != nil {
				// 如果 JSON 转换失败，使用原字符串拼接
				positions = append(positions, strings.Join(record, ", "))
			} else {
				positions = append(positions, string(jsonData))
			}
		} else {
			// 字段数量不匹配，使用原字符串拼接
			positions = append(positions, strings.Join(record, ", "))
		}
	}

	return positions, nil
}

func connectDB(user, password, host, port, dbname string) (*sql.DB, error) {
	connStr := fmt.Sprintf("user=%s password=%s dbname=%s host=%s port=%s sslmode=disable",
		user, password, dbname, host, port)
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("无法连接数据库: %v", err)
	}

	err = db.Ping()
	if err != nil {
		return nil, fmt.Errorf("无法 ping 数据库: %v", err)
	}

	return db, nil
}

func saveKeysToDB(db *sql.DB, keys []string, status map[string]bool) error {
	// 开启事务
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("开启事务失败: %v", err)
	}

	// 插入或更新 Key
	for _, key := range keys {
		isActive := status[key]
		_, err := tx.Exec(`
			INSERT INTO api_keys (key, is_active)
			VALUES ($1, $2)
			ON CONFLICT (key) DO UPDATE
			SET is_active = EXCLUDED.is_active, updated_at = CURRENT_TIMESTAMP
		`, key, isActive)
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("插入或更新 Key 失败: %v", err)
		}
	}

	// 提交事务
	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("提交事务失败: %v", err)
	}

	return nil
}

func main() {
	// 加载 .env 文件
	err := godotenv.Load()
	if err != nil {
		log.Fatalf("加载 .env 文件失败: %v", err)
	}

	// 获取环境变量
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbName := os.Getenv("DB_NAME")

	// 连接数据库
	db, err := connectDB(dbUser, dbPassword, dbHost, dbPort, dbName)
	if err != nil {
		log.Fatalf("数据库连接失败: %v", err)
	}
	defer db.Close()

	// 从数据库加载 Key
	if err := keyManager.LoadKeysFromDB(db); err != nil {
		log.Fatalf("从数据库加载 Key 失败: %v", err)
	}

	// 在程序启动时读取职位信息
	positions, err = readPositions("./files/hunan/total.csv")
	fmt.Print("读取职位表完成")
	if err != nil {
		log.Fatalf("读取职位信息失败: %v", err)
	}

	go func() {
		ticker := time.NewTicker(5 * time.Minute) // 每 5 分钟执行一次
		defer ticker.Stop()

		for range ticker.C {
			keyManager.mutex.Lock()
			keys := keyManager.keys
			status := keyManager.status
			keyManager.mutex.Unlock()

			err := saveKeysToDB(db, keys, status)
			if err != nil {
				log.Printf("存储 API Keys 失败: %v", err)
			} else {
				log.Println("API Keys 已存储到数据库")
			}
		}
	}()

	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		keyManager.KeysHealthCheck()
		for range ticker.C {
			keyManager.KeysHealthCheck()
		}
	}()

	// 启动 WebSocket 服务器
	http.HandleFunc("/ws", handleWebSocket)
	log.Println("WebSocket 服务器启动，监听 :8080")

	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("服务器启动失败: %v\n", err)
	}
}
