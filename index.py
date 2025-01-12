from openai import OpenAI
import csv
import os
from tqdm import tqdm  # 导入 tqdm 库
from concurrent.futures import ThreadPoolExecutor, as_completed  # 导入并发模块

# 初始化 OpenAI 客户端
client = OpenAI(
    api_key="your-key",
    base_url="https://api.deepseek.com",
)

# 发送消息并获取模型响应
def send_messages(messages):
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=messages,
    )
    return response.choices[0].message.content

# 判别函数
def judge_position(position_info, user_prompt):
    # 系统提示，描述职位信息的字段
    system_prompt = """
    你需要根据用户的描述，判断他是否符合某个职位的要求。
    
    职位信息一般包括以下字段：
    招考单位,单位代码,招考职位,职位代码,职位简介,职位类型,录用人数,学历,学位,"研究生专业
    名称及代码","本科专业名称及代码","大专专业名称及代码",是否要求2年以上基层工作经历,是否限应届毕业生报考,其他要求,考区。
    
    1.请务必注意专业对口。
    2.请注意研究生专业和本科专业
    
    
    """ + """\n IMPORTANT! You only need to return '符合要求' or '不符合要求' or '不确定' , dont need to say anything else"""
    
    # 构造消息
    messages = [
        {"role": "system", "content": system_prompt},  # 系统提示
        {"role": "user", "content": f"Position Info: {position_info}\nUser Prompt: {user_prompt}"}
    ]
    # 调用大模型
    result = send_messages(messages)
    # 返回判别结果
    return result

# 处理单行数据的函数
def process_row(row, user_prompt, qualified_writer, unqualified_writer, uncertain_writer):
    position_info = ", ".join(row)  # 将每一行转换为字符串
    result = judge_position(position_info, user_prompt)
    if "符合要求" == result:
        qualified_writer.writerow(row)  # 写入符合要求的文件
    elif "不符合要求" == result:
        unqualified_writer.writerow(row)  # 写入不符合要求的文件
    else:
        uncertain_writer.writerow(row)  # 写入不确定的文件

# 读取 CSV 文件并判别每一行
def process_csv(file_path, user_prompt):
    # 创建结果文件夹
    result_dir = "results"
    os.makedirs(result_dir, exist_ok=True)

    # 获取输入文件名（不带扩展名）
    file_name = os.path.splitext(os.path.basename(file_path))[0]

    # 打开结果文件
    with open(f"{result_dir}/{file_name}_qualified.csv", mode='w', encoding='utf-8', newline='') as qualified_file, \
         open(f"{result_dir}/{file_name}_unqualified.csv", mode='w', encoding='utf-8', newline='') as unqualified_file, \
         open(f"{result_dir}/{file_name}_uncertain.csv", mode='w', encoding='utf-8', newline='') as uncertain_file:
        
        # 创建 CSV 写入器
        qualified_writer = csv.writer(qualified_file)
        unqualified_writer = csv.writer(unqualified_file)
        uncertain_writer = csv.writer(uncertain_file)

        # 打开源 CSV 文件并读取总行数（用于进度条）
        with open(file_path, mode='r', encoding='utf-8') as file:
            total_rows = sum(1 for row in csv.reader(file)) - 1  # 减去表头行

        # 重新打开源 CSV 文件并处理每一行
        with open(file_path, mode='r', encoding='utf-8') as file:
            reader = csv.reader(file)
            header = next(reader)  # 读取表头

            # 写入表头到结果文件
            qualified_writer.writerow(header)
            unqualified_writer.writerow(header)
            uncertain_writer.writerow(header)

            # 使用 ThreadPoolExecutor 实现多并发
            with ThreadPoolExecutor(max_workers=500) as executor:  # 设置最大并发数为 10
                futures = [executor.submit(process_row, row, user_prompt, qualified_writer, unqualified_writer, uncertain_writer) for row in reader]

                # 使用 tqdm 显示进度条
                for future in tqdm(as_completed(futures), total=total_rows, desc="处理进度"):
                    future.result()  # 等待任务完成

    print("处理完成！")
    print(f"- 符合要求的职位已保存到 '{result_dir}/{file_name}_qualified.csv'。")
    print(f"- 不符合要求的职位已保存到 '{result_dir}/{file_name}_unqualified.csv'。")
    print(f"- 不确定的职位已保存到 '{result_dir}/{file_name}_uncertain.csv'。")

# 示例：用户提示
user_prompt = "我是计算机系的，只有本科学位，基层工作经历， 不是应届生，不是党员， 服务基层项目人员和退役大学生士兵不符合我"

# 处理 CSV 文件
process_csv("files/xian.csv", user_prompt)
process_csv("files/xiang.csv", user_prompt)  # 处理另一个文件
process_csv("files/gongan.csv", user_prompt)
process_csv("files/jianchayuan.csv", user_prompt)
# 测试函数
def test_judge_position():
    # 示例职位信息
    position_info = (
"""
广州市政务服务和数据管理局,1160554,基础设施股一级科员,11605542557002 ,从事电子政务外网基础设施建设等工作,综合管理类职位,1,本科,学士,,工学(B08),,否,否,,广州
"""
    )

    # 用户提示
    user_prompt = "我是计算机系的，只有本科学位，基层工作经历， 不是应届生，不是党员"

    # 调用判别函数
    result = judge_position(position_info, user_prompt)

    # 输出结果
    print(f"职位信息: {position_info}")
    print(f"用户提示: {user_prompt}")
    print(f"判别结果: {result}")

# 运行测试
# test_judge_position()
