package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

const (
	host     = "pgm-bp1q66wv427tl61nqo.rwlb.rds.aliyuncs.com"
	port     = 5432
	user     = "normal"
	password = "normal@1"
	dbname   = "postgres" // 默认连接到 postgres 数据库
)

// func main() {
// 	// 构建连接字符串
// 	psqlInfo := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
// 		host, port, user, password, dbname)

// 	// 连接数据库
// 	db, err := sql.Open("postgres", psqlInfo)
// 	if err != nil {
// 		log.Fatalf("无法连接数据库: %v", err)
// 	}
// 	defer db.Close()

// 	// 检查连接是否成功
// 	err = db.Ping()
// 	if err != nil {
// 		log.Fatalf("无法 ping 数据库: %v", err)
// 	}
// 	fmt.Println("成功连接到数据库！")

// 	// 查询所有数据库
// 	rows, err := db.Query("SELECT datname FROM pg_database;")
// 	if err != nil {
// 		log.Fatalf("无法查询数据库: %v", err)
// 	}
// 	defer rows.Close()

// 	// 遍历查询结果
// 	fmt.Println("数据库列表：")
// 	for rows.Next() {
// 		var dbName string
// 		err := rows.Scan(&dbName)
// 		if err != nil {
// 			log.Fatalf("无法读取数据库名称: %v", err)
// 		}
// 		fmt.Println(dbName)
// 	}

// 	// 检查遍历过程中是否有错误
// 	if err = rows.Err(); err != nil {
// 		log.Fatalf("遍历结果时出错: %v", err)
// 	}
// }

func initDBTable(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS api_keys (
			id SERIAL PRIMARY KEY,
			key TEXT NOT NULL UNIQUE,
			is_active BOOLEAN NOT NULL DEFAULT TRUE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
	`)
	if err != nil {
		return fmt.Errorf("创建表失败: %v", err)
	}
	return nil
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

	// 初始化表
	err = initDBTable(db)
	if err != nil {
		log.Fatalf("初始化表失败: %v", err)
	}

	// 其他代码...
}
