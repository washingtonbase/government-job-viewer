package main

import (
	"context"
	"fmt"
	"io"

	ark "github.com/sashabaranov/go-openai"
)

func main() {
	config := ark.DefaultConfig("86840b22-2b87-42a7-b066-95030dc7d511")
	config.BaseURL = "https://ark.cn-beijing.volces.com/api/v3"
	client := ark.NewClientWithConfig(config)

	fmt.Println("----- standard request -----")
	resp, err := client.CreateChatCompletion(
		context.Background(),
		ark.ChatCompletionRequest{
			Model: "ep-20250123190419-k9b5x",
			Messages: []ark.ChatCompletionMessage{
				{
					Role:    ark.ChatMessageRoleSystem,
					Content: "你是豆包，是由字节跳动开发的 AI 人工智能助手",
				},
				{
					Role:    ark.ChatMessageRoleUser,
					Content: "常见的十字花科植物有哪些？",
				},
			},
		},
	)
	if err != nil {
		fmt.Printf("ChatCompletion error: %v\n", err)
		return
	}
	fmt.Println(resp.Choices[0].Message.Content)

	fmt.Println("----- streaming request -----")
	stream, err := client.CreateChatCompletionStream(
		context.Background(),
		ark.ChatCompletionRequest{
			Model: "ep-20250123190419-k9b5x",
			Messages: []ark.ChatCompletionMessage{
				{
					Role:    ark.ChatMessageRoleSystem,
					Content: "你是豆包，是由字节跳动开发的 AI 人工智能助手",
				},
				{
					Role:    ark.ChatMessageRoleUser,
					Content: "常见的十字花科植物有哪些？",
				},
			},
		},
	)
	if err != nil {
		fmt.Printf("stream chat error: %v\n", err)
		return
	}
	defer stream.Close()

	for {
		recv, err := stream.Recv()
		if err == io.EOF {
			return
		}
		if err != nil {
			fmt.Printf("Stream chat error: %v\n", err)
			return
		}

		if len(recv.Choices) > 0 {
			fmt.Print(recv.Choices[0].Delta.Content)
		}
	}
}

// package main

// import (
// 	"context"

// 	"github.com/openai/openai-go"

// 	"github.com/openai/openai-go/option"
// )

// func main() {

// 	client := openai.NewClient(

// 		option.WithAPIKey("86840b22-2b87-42a7-b066-95030dc7d511"), // defaults to os.LookupEnv("OPENAI_API_KEY")

// 		option.WithBaseURL("https://ark.cn-beijing.volces.com/api"),
// 	)

// 	chatCompletion, err := client.Chat.Completions.New(context.TODO(), openai.ChatCompletionNewParams{

// 		Messages: openai.F([]openai.ChatCompletionMessageParamUnion{

// 			openai.UserMessage("Say this is a test"),
// 		}),

// 		Model: openai.F("ep-20250123190419-k9b5x"),
// 	})

// 	if err != nil {

// 		panic(err.Error())

// 	}

// 	println(chatCompletion.Choices[0].Message.Content)

// }
