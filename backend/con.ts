const CONCURRENCY = 100; // 并发客户端数量
const SERVER_URL = 'ws://localhost:8080/ws'; // WebSocket 服务器地址
const USER_PROMPT = "我是物理系的，只有本科学位，没有基层工作经历， 不是应届生，不是党员， 服务基层项目人员和退役大学生士兵不符合我, 不愿意工作5年。而且我要湛江的岗位";

// 记录测试结果
let completed = 0;
let startTime;

// 创建 WebSocket 客户端
function createClient(id) {
    const socket = new WebSocket(SERVER_URL);

    socket.onopen = () => {
        console.log(`客户端 ${id} 连接成功`);
        // 发送用户提示
        socket.send(JSON.stringify({ user_prompt: USER_PROMPT }));
    };

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'progress') {
            console.log(`客户端 ${id} 收到进度: ${message.message}`);
        } else if (message.type === 'result') {
            console.log(`客户端 ${id} 收到最终结果`);
            completed++;
            socket.close();

            // 所有客户端完成后，输出测试结果
            if (completed === CONCURRENCY) {
                const endTime = Date.now();
                const duration = (endTime - startTime) / 1000; // 转换为秒
                console.log(`测试完成，总耗时: ${duration} 秒`);
            }
        }
    };

    socket.onclose = () => {
        console.log(`客户端 ${id} 连接关闭`);
    };

    socket.onerror = (error) => {
        console.error(`客户端 ${id} 连接出错:`, error);
    };
}

// 启动并发测试
function runConcurrencyTest() {
    console.log(`启动并发测试，并发数: ${CONCURRENCY}`);
    startTime = Date.now();

    for (let i = 1; i <= CONCURRENCY; i++) {
        createClient(i);
    }
}

// 运行测试
runConcurrencyTest();