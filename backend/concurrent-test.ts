const CONCURRENCY = 50;
// WebSocket 服务器地址
const SERVER_URL = 'wss://func-ccba-whirddnmxd.cn-hangzhou.fcapp.run/ws';

// 用户提示
const USER_PROMPT = "我是数学系的，只有本科学位，没有基层工作经历， 不是应届生，不是党员， 服务基层项目人员和退役大学生士兵不符合我, 不愿意工作5年。而且我要广州的岗位";

// 记录测试结果
let completed = 0;
let successCount = 0;
let failureCount = 0;
let startTime;

// 创建 WebSocket 客户端
function createClient(id) {
    const ws = new WebSocket(SERVER_URL);

    ws.onopen = () => {
        console.log(`客户端 ${id} 连接成功`);
        // 发送用户提示
        ws.send(JSON.stringify({ user_prompt: USER_PROMPT }));
    };

    ws.onmessage = (event) => {
        const message = JSON.parse(event.data.toString()); // 将 Buffer 转换为字符串
        if (message.type === 'result') {
            console.log(`客户端 ${id} 收到最终结果`);
            successCount++;
            completed++;
            ws.close();

            // 所有客户端完成后，输出测试结果
            if (completed === CONCURRENCY) {
                const endTime = Date.now();
                const duration = (endTime - startTime) / 1000; // 转换为秒
                console.log(`测试完成，总耗时: ${duration} 秒`);
                console.log(`成功请求: ${successCount}, 失败请求: ${failureCount}`);
            }
        } else if (message.type === 'error') {
            console.error(`客户端 ${id} 收到错误:`, message.error);
            failureCount++;
            completed++;
            ws.close();

            // 所有客户端完成后，输出测试结果
            if (completed === CONCURRENCY) {
                const endTime = Date.now();
                const duration = (endTime - startTime) / 1000; // 转换为秒
                console.log(`测试完成，总耗时: ${duration} 秒`);
                console.log(`成功请求: ${successCount}, 失败请求: ${failureCount}`);
            }
        }
    };

    ws.onclose = (event) => {
        if (event.code !== 1000) {
            console.error(`客户端 ${id} 连接断开，错误码: ${event.code}`);
            failureCount++;
        }
        completed++;

        // 所有客户端完成后，输出测试结果
        if (completed === CONCURRENCY) {
            const endTime = Date.now();
            const duration = (endTime - startTime) / 1000; // 转换为秒
            console.log(`测试完成，总耗时: ${duration} 秒`);
            console.log(`成功请求: ${successCount}, 失败请求: ${failureCount}`);
        }
    };

    ws.onerror = (error) => {
        console.error(`客户端 ${id} 连接出错:`, error);
        failureCount++;
        completed++;

        // 所有客户端完成后，输出测试结果
        if (completed === CONCURRENCY) {
            const endTime = Date.now();
            const duration = (endTime - startTime) / 1000; // 转换为秒
            console.log(`测试完成，总耗时: ${duration} 秒`);
            console.log(`成功请求: ${successCount}, 失败请求: ${failureCount}`);
        }
    };

    // 设置超时机制（10秒）
    setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
            console.error(`客户端 ${id} 请求超时`);
            failureCount++;
            completed++;
            ws.close();

            // 所有客户端完成后，输出测试结果
            if (completed === CONCURRENCY) {
                const endTime = Date.now();
                const duration = (endTime - startTime) / 1000; // 转换为秒
                console.log(`测试完成，总耗时: ${duration} 秒`);
                console.log(`成功请求: ${successCount}, 失败请求: ${failureCount}`);
            }
        }
    }, 1000000); // 1000秒超时
}

// 启动并发测试
function runConcurrencyTest() {
    console.log(`启动并发测试，并发数: ${CONCURRENCY}`);
    startTime = Date.now();

    for (let i = 1; i <= CONCURRENCY; i++) {
        // 增加请求间隔，避免瞬间创建大量连接
        setTimeout(() => {
            createClient(i);
        }, i * 1000); // 每个客户端间隔 100 毫秒
    }
}

// 运行测试
runConcurrencyTest();