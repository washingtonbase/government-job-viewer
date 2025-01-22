// 用户提示
const userPrompt = "我是物理系的，只有本科学位，没有基层工作经历， 不是应届生，不是党员， 服务基层项目人员和退役大学生士兵不符合我, 不愿意工作5年。而且我要湛江的岗位";

// 连接到 WebSocket 服务
const socket = new WebSocket('ws://localhost:8080/ws');

// 监听连接成功事件
socket.onopen = () => {
    console.log('WebSocket 连接成功');
    // 发送用户提示
    socket.send(JSON.stringify({ user_prompt: userPrompt }));
};

// 监听消息事件
socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'progress') {
        console.log('当前进度:', data.message);
    } else if (data.type === 'result') {
        socket.close(); // 关闭连接
    }
};

// 监听连接关闭事件
socket.onclose = () => {
    console.log('WebSocket 连接关闭');
};

// 监听连接错误事件
socket.onerror = (error) => {
    console.log('WebSocket 连接出错:', error);
};