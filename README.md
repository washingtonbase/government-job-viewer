### DeepSeek + 公务员岗位筛选器

![alt text](image-1.png)

#### **技术栈**： 

后端：**Go**

前端: **Next.js + Tailwind CSS + Shadcn** 组件库

部署：**Docker + Serverless 函数计算 + PostgreSQL 数据库，部署于阿里云**

网络：**Websocket** 通信

#### **应用场景**：

每年公务员考试中，岗位多达数千甚至上万个，每个岗位都有一定要求。考生需要**筛选**出那些自身条件符合报名要求的岗位。

假如我的自身情况是： “大学本科读马克思主义”；  某个岗位要求是：“所有文科类专业”

***从意思上看，两者绝对相符；但两句话没有任何一个字是重复的***

所以用机械 SQL 查询就容易错选漏选；而 **AI 可以理解语义、推理**，从而避免错选漏选。

#### **工作原理**：

用户输入他对自身的描述。筛选器拿着这个描述，**遍历**岗位列表，逐个拿去询问 DeepSeek 。 DeepSeek 根据用户描述、岗位描述判断两者是否匹配并返回 True / False。最终向用户返回 True 列表。

#### **难点** 

1. **token 成本**

   假如某次省考有 5000 个岗位，那么用户一次查询，我们后端就需要向 DeepSeek API 询问 5000 个问题，会耗费大量 token 。 

2. **并发控制、进度显示、协程取消**

   5000 次请求，耗时也是比较大的，所以要并发发起，但是要实现恒定大小的**并发池**，以防止触发 DeepSeek 限速，同时需要在每个问题问完时，向前端**推送**进度。并发协程启动后，当其中一个协程发生错误，可**取消**其他协程。

3. **部署可扩容与持久化**

   为了响应多用户访问，采取函数计算，我只需提供**无状态镜像**，阿里云按当前负载程度自动按需创建实例。 需要持久化的数据主要是所有用户的 keys ，将其存储在云数据库中。

#### **实现**

- **用 API key 池解决 token 耗费**

  本产品早在 DeepSeek 爆火前已经构思出来了，当时 DeepSeek 服务还是非常顺畅的，并且每位新用户都有 10 元**免费**券。 采取的设计是：**所有用户捐献自己的 DeepSeek key** 。 我们维护一个 **API key 池**，每个用户会把自己的 DeepSeek key 加入到 key 池中，单个用户的 5000 次请求分散在所有人的 key 上，类似于**负载均衡**，避免单个 key 达到速率限制。

  若某个 key 被限速了，它会在一定时间内恢复，因此 key 池会定期进行**健康检查**，维护可用和不可用 key 列表。

  这种做法基于一个基础假设： 对于非技术人员来说，一般用网页版而不是API，所以 DeepSeek key 的免费10元额度没多大用处，**愿意拿出来共享以换取选岗机会**。（在 DeepSeek 尚未走红时，这个假设还是合理的）

  

- 用**协程、锁、信号量、取消机制、WaitGroup** 实现**并发控制、进度显示、协程取消**

  响应用户的一次查询时，我们要发起 5000 次 DeepSeek 请求，为避免 DeepSeek 限速，并发数只能设置在 200 左右（可调整）。  维护一个**并发池**，池中每时每刻只有 200 个请求在进行，其他请求在池外竞争进入池中。  

  - 首先同时创建 5000 个**协程**，每个协程负责发起一次 DeepSeek 请求

  - 用数值为 200 的**信号量**，当一个请求进入并发池，会从信号量中 `acquire` 1 ，直至其完成后 `release`1，以此控制同一时刻只有 200 个请求在进行

  - 不同协程间是有共享变量的。 包括共享的 **websocket 接口**以及**当前进度计数器**（每个协程完成请求时会向计数器加一然后通过 websocket 接口发送给前端）。 所有协程会并发使用共享变量，因此需要加**锁**来保证安全。

  - 当其中一个协程请求错误时，说明 key 已经不可用，那么剩余没完成的请求都应该被取消掉。  然而此时所有的协程都已经启动，为了**取消已启动协程**， 需要用 **Context** ，通过它来传递取消事件。 

  - 防范协程的**泄露**。 有可能出现这样一种情况：**父协程已结束，子协程还在进行中**。 若父协程已进行**资源回收**，比如**关闭 websocket 连接**。 迟迟结束的子协程再去使用已关闭的接口会造成错误。因此需要正确使用 **WaitGroup**  等待所有子协程的完成，还要**正确处理**子协程取消等等**边界情况**。

    

  #### 以上对并发编程的讨论可浓缩成一个函数

  可在此处[查看](https://github.com/washingtonbase/government-job-viewer/blob/94c31eeed6f24f5ae754e91f74f9ed3b87a4322e/backend/index.go#L268) ，这个 `ParallelTasks` **健壮地**完成了这样一件事： 给定一组 `data` 、一个任务处理函数 `task`、一个消息通知回调 `progress`。

  - `task` 并发作用在 `data` 每个元素上

  - 并发数可控

  - `progress` 可向外界发送进度

  - 无子协程泄露

    

#### **方案权衡** ：

1. **用 RAG 还是暴力遍历**

   一个常见但有误区的思路是使用 RAG ，将岗位信息先用 **Embedding** 模型转换为**语义向量**。 通过**向量数据库**检索的方法，比较岗位信息向量 vs 用户情况向量的**相似度**，设置阈值返回。 这样，即使岗位很多，也只需要一次 Embedding 处理，就可以反复响应用户请求。 这看似美好，似乎节约了大量 token 成本，实则准确度不够高。

   向量检索通常要设定一个阈值，相似性超过阈值的条目才会被考虑。但我们这个场景里，**是没有阈值这回事的，岗位和用户描述是否相符，是有客观对错的。**

    **语义向量始终无法包含全部信息，也无法进行深度的逻辑推理**。  最保险的方法，还是**直接把所有岗位要求的原始语句输入到 LLM 中推理判断**。

   

2. **向 DeepSeek 的请求，由客户端发起还是由服务端发起？**

   如果由用户浏览器来向 DeepSeek 发起请求，则不再需要复杂的后端，能够节省大量的费用。

   但chrome 浏览器的最大请求并发数是 6 个，岗位数往往由数千甚至上万个，耗时太长。而且 go 原生就带有许多适用于**并发编程的原语**，因此决定由 go 后端来负责并发请求。

#### 尚未实现的设计：

1. DeepSeek 可能采取 IP 限速，单纯更换 api key 无法绕开，因此需要用 **IP 代理池**
1. 既然并发请求 DeepSeek API 需要绕很多弯路，考虑**自部署** DeepSeek 模型的方案。 但根据目前**跟阿里云的沟通**，他们也还无法建立比 DeepSeek 更便宜、并发数更高的推理服务。
