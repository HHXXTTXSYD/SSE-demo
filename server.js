const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// 存储所有SSE连接的客户端
let clients = [];

// 基本路由 - 提供HTML页面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// SSE端点 - 核心功能
app.get('/events', (req, res) => {
  console.log('新客户端连接到SSE');
  
  // 设置SSE响应头
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // 创建客户端对象
  const clientId = Date.now();
  const newClient = {
    id: clientId,
    response: res
  };

  // 添加到客户端列表
  clients.push(newClient);

  // 发送欢迎消息
  res.write(`data: {"type": "connection", "message": "连接成功！客户端ID: ${clientId}", "timestamp": "${new Date().toISOString()}"}\n\n`);

  // 处理客户端断开连接
  req.on('close', () => {
    console.log(`客户端 ${clientId} 断开连接`);
    clients = clients.filter(client => client.id !== clientId);
  });
});

// 发送消息到所有客户端的函数
function broadcastToAllClients(data) {
  clients.forEach(client => {
    try {
      client.response.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.log('发送消息失败:', error);
    }
  });
}

// API端点 - 手动发送消息
app.post('/send-message', (req, res) => {
  const { message } = req.body;
  
  const data = {
    type: 'message',
    message: message || '这是一条测试消息',
    timestamp: new Date().toISOString(),
    clients: clients.length
  };

  broadcastToAllClients(data);
  
  res.json({ 
    success: true, 
    message: '消息已发送', 
    clientCount: clients.length 
  });
});

// 获取当前连接的客户端数量
app.get('/clients', (req, res) => {
  res.json({ 
    clientCount: clients.length,
    clients: clients.map(c => ({ id: c.id }))
  });
});

// 定时发送消息 - 模拟实时数据
let messageCounter = 0;
setInterval(() => {
  messageCounter++;
  const data = {
    type: 'auto',
    message: `自动消息 #${messageCounter}`,
    timestamp: new Date().toISOString(),
    counter: messageCounter,
    clientCount: clients.length
  };
  
  if (clients.length > 0) {
    console.log(`发送自动消息给 ${clients.length} 个客户端`);
    broadcastToAllClients(data);
  }
}, 5000); // 每5秒发送一次

// 模拟股票价格更新
let stockPrice = 100;
setInterval(() => {
  // 随机变化股票价格
  const change = (Math.random() - 0.5) * 10;
  stockPrice = Math.max(50, stockPrice + change);
  
  const data = {
    type: 'stock',
    symbol: 'DEMO',
    price: stockPrice.toFixed(2),
    change: change.toFixed(2),
    timestamp: new Date().toISOString()
  };
  
  if (clients.length > 0) {
    broadcastToAllClients(data);
  }
}, 2000); // 每2秒更新一次

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 SSE服务器运行在 http://localhost:${PORT}`);
  console.log(`📡 SSE端点: http://localhost:${PORT}/events`);
  console.log(`📋 管理面板: http://localhost:${PORT}`);
}); 