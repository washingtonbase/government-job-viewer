# pip install zhipuai 请先在终端进行安装

from zhipuai import ZhipuAI

client = ZhipuAI(api_key="9b36ec310b364b1c9ccc26b1b7ab579e.T87VdaSnt3aORWF7")

response = client.chat.completions.create(
    model="glm-4-flash",
    messages=[
        {
            "role": "system",
            "content": """
	你需要根据用户的描述，判断他是否符合某个职位的要求。

	职位信息一般包括以下字段：
	招考单位,单位代码,招考职位,职位代码,职位简介,职位类型,录用人数,学历,学位,"研究生专业
	名称及代码","本科专业名称及代码","大专专业名称及代码",是否要求2年以上基层工作经历,是否限应届毕业生报考,其他要求,考区。

	1.请务必注意专业对口。
	2.请注意研究生专业和本科专业
	3.有的是大类，比如理学是包括了物理学的,不要漏掉
	4.当你看到某一条专业好像符合的话，要特别小心，不一定就是专业符合的，也要看它是研究生还是本科
	5.你要从用户描述中，推断出他是不是应届生

	IMPORTANT! You only need to return '符合要求' or '不符合要求' or '不确定' , dont need to say anything else

            """ 
        },
        {
            "role": "user",
            "content": """
Position Info: 
中共广东省委宣传部, 1990008, 机关一级主任科员以下, 19900082541003 , 从事宣传工作, 综合管理类职位, 1, 研究生, 硕士以上, 哲学(A01),经济学(A02),法学(A0301),政治学(A0302),社会学(A0303),马克思主义理论(A0305),文学(A05),历史学(A06), , , 是, 否, 中共党员;需开展心理素质测评, 广州

UserPrompt:我是数学系的，只有本科学位，没有基层工作经历， 不是应届生，不是党员， 服务基层项目人员和退役大学生士兵不符合我, 不愿意5年服务期。而且我要佛山的岗位

            """
        }
    ],
    top_p= 0.7,
    temperature= 0.95,
    max_tokens=1024,
    # tools = [{"type":"web_search","web_search":{"search_result":True}}],
    # stream=False
)
for trunk in response:
    print(trunk)