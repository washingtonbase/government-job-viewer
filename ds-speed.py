import time
from openai import OpenAI

# 记录开始时间
start_time = time.time()

# 设置 API 客户端
client = OpenAI(api_key="sk-cfdb4341e754486f87a604c05c361c53", base_url="https://api.deepseek.com")

# 发送请求并获取响应
response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[
        {"role": "system", "content": "You are a helpful assistant"},
        {"role": "user", "content": "Hello"},
    ],
    stream=False
)

# 输出响应内容
print(response.choices[0].message.content)

# 记录结束时间并计算耗时
end_time = time.time()
elapsed_time = end_time - start_time
print(f"耗时: {elapsed_time:.4f}秒")
