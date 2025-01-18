package main

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func initClient() *openai.Client {
	client := openai.NewClient(
		option.WithAPIKey("sk-b653ec6d51bd49dc9a933723679b81c9"), // 替换为你的 API Key
		option.WithBaseURL("https://api.deepseek.com"),
	)
	return client
}

func judgePosition(client *openai.Client, positionInfo, userPrompt string) (string, error) {
	systemPrompt := `
	你需要根据用户的描述，判断他是否符合某个职位的要求。
	
	职位信息一般包括以下字段：
	招考单位,单位代码,招考职位,职位代码,职位简介,职位类型,录用人数,学历,学位,"研究生专业
	名称及代码","本科专业名称及代码","大专专业名称及代码",是否要求2年以上基层工作经历,是否限应届毕业生报考,其他要求,考区。
	
	1.请务必注意专业对口。
	2.请注意研究生专业和本科专业
	3.有的是大类，比如理学是包括了物理学的,不要漏掉
	4.当你看到某一条专业好像符合的话，要特别小心，不一定就是专业符合的，也要看它是研究生还是本科
	
	IMPORTANT! You only need to return '符合要求' or '不符合要求' or '不确定' , dont need to say anything else
	`

	messages := []openai.ChatCompletionMessageParamUnion{
		openai.SystemMessage(systemPrompt),
		openai.UserMessage(fmt.Sprintf("Position Info: %s\nUser Prompt: %s", positionInfo, userPrompt)),
	}

	resp, err := client.Chat.Completions.New(context.TODO(), openai.ChatCompletionNewParams{
		Messages: openai.F(messages),
		Model:    openai.F("deepseek-chat"),
	})
	if err != nil {
		log.Printf("调用 OpenAI API 失败: %v\n", err)
		return "", err
	}
	return resp.Choices[0].Message.Content, nil
}

// 任务函数类型
type TaskFunc func(interface{}) interface{}

// 并行执行任务
// 并行执行任务
// 并行执行任务
func ParallelTasks(data []interface{}, concurrency int, task TaskFunc, progress func(int)) []interface{} {
	var wg sync.WaitGroup
	results := make([]interface{}, len(data))
	taskChan := make(chan int, concurrency)   // 控制并发数
	progressChan := make(chan int, len(data)) // 用于按顺序更新进度

	// 启动任务 Goroutine
	for i, item := range data {
		wg.Add(1)
		taskChan <- i // 占用一个并发槽
		go func(i int, item interface{}) {
			defer wg.Done()
			results[i] = task(item) // 执行任务
			progressChan <- i + 1   // 发送进度到通道
			<-taskChan              // 释放并发槽
		}(i, item)
	}

	// 启动一个单独的 Goroutine 来处理进度更新
	go func() {
		processed := 0
		for p := range progressChan {
			fmt.Print(p)
			processed++
			progress(processed) // 按顺序更新进度
		}
	}()

	wg.Wait()
	close(progressChan) // 关闭进度通道
	return results
}

var wsMutex sync.Mutex // 全局互斥锁

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	// 升级 HTTP 连接为 WebSocket 连接
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("升级 WebSocket 失败: %v\n", err)
		return
	}
	defer conn.Close()

	// 读取客户端消息
	_, message, err := conn.ReadMessage()
	if err != nil {
		log.Printf("读取客户端消息失败: %v\n", err)
		return
	}

	// 解析用户提示
	var request struct {
		UserPrompt string `json:"user_prompt"`
	}
	if err := json.Unmarshal(message, &request); err != nil {
		log.Printf("解析用户提示失败: %v\n", err)
		return
	}

	// 读取职位信息
	positions, err := readPositions("../test.csv")
	if err != nil {
		log.Printf("读取职位信息失败: %v\n", err)
		return
	}

	// 初始化 OpenAI 客户端
	client := initClient()

	// 将职位信息转换为 []interface{}
	data := make([]interface{}, len(positions))
	for i, position := range positions {
		data[i] = position
	}

	// 定义任务函数
	task := func(item interface{}) interface{} {
		position := item.(string)
		result, err := judgePosition(client, position, request.UserPrompt)
		if err != nil {
			log.Printf("判别职位失败: %v\n", err)
			return "不确定"
		}
		return result
	}

	// 定义进度函数
	progress := func(processed int) {
		total := len(data)
		progress := processed * 100 / total
		log.Printf("当前进度: %d%%\n", progress)

		// 推送进度到客户端
		progressMessage := map[string]interface{}{
			"type":    "progress",
			"message": progress,
		}

		// 加锁保护 WebSocket 写入操作
		wsMutex.Lock()
		defer wsMutex.Unlock()

		if err := conn.WriteJSON(progressMessage); err != nil {
			log.Printf("推送进度失败: %v\n", err)
			return
		}
	}

	// 并发处理任务
	results := ParallelTasks(data, 10, task, progress)

	// 分类结果
	qualified := make([]string, 0)
	unqualified := make([]string, 0)
	uncertain := make([]string, 0)
	for i, result := range results {
		switch result {
		case "符合要求":
			qualified = append(qualified, positions[i])
		case "不符合要求":
			unqualified = append(unqualified, positions[i])
		default:
			uncertain = append(uncertain, positions[i])
		}
	}

	// 将结果写入 CSV 文件
	if err := writeResults("../results/qualified.csv", qualified); err != nil {
		log.Printf("写入符合要求的职位失败: %v\n", err)
	}
	if err := writeResults("../results/unqualified.csv", unqualified); err != nil {
		log.Printf("写入不符合要求的职位失败: %v\n", err)
	}
	if err := writeResults("../results/uncertain.csv", uncertain); err != nil {
		log.Printf("写入不确定的职位失败: %v\n", err)
	}

	// 推送最终结果到客户端
	finalResult := map[string]interface{}{
		"type":        "result",
		"qualified":   qualified,
		"unqualified": unqualified,
		"uncertain":   uncertain,
	}
	if err := conn.WriteJSON(finalResult); err != nil {
		log.Printf("推送最终结果失败: %v\n", err)
	}
}

func readPositions(filePath string) ([]string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		return nil, err
	}

	positions := make([]string, 0)
	for _, record := range records[1:] { // 跳过表头
		positions = append(positions, strings.Join(record, ", "))
	}
	return positions, nil
}

func writeResults(filePath string, data []string) error {
	file, err := os.Create(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	for _, item := range data {
		if err := writer.Write([]string{item}); err != nil {
			return err
		}
	}
	writer.Flush()
	return writer.Error()
}

func main() {
	http.HandleFunc("/ws", handleWebSocket)
	log.Println("WebSocket 服务器启动，监听 :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("服务器启动失败: %v\n", err)
	}
}
