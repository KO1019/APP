import WebSocket from 'ws';

// WebSocket URL（后端代理）
const WS_URL = 'ws://localhost:9091/api/v1/voice/realtime';

console.log('=== WebSocket 实时语音完整测试 ===\n');

const ws = new WebSocket(WS_URL);

let sessionId = null;
let audioBuffer = [];
let receivedError = null;
let connectionReady = false;

console.log('⏳ 等待连接建立...\n');

ws.on('open', () => {
  console.log('✅ [1/4] WebSocket 连接成功建立！\n');
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    console.log('📨 收到消息:', message);

    if (message.type === 'connection_ready') {
      sessionId = message.sessionId;
      connectionReady = true;
      console.log(`✅ [2/4] 连接就绪，Session ID: ${sessionId}`);
      console.log('✅ Session 已完全就绪！\n');

      // 等待一小段时间后发送 SayHello
      setTimeout(() => {
        console.log('📤 [3/4] 发送 SayHello 打招呼...');
        ws.send(JSON.stringify({ type: 'text_input', text: '你好，今天天气怎么样？' }));
      }, 500);
    } else if (message.type === 'audio') {
      console.log('🎵 收到音频数据，大小:', message.data.length, '字节');
      audioBuffer.push(Buffer.from(message.data, 'base64'));
    } else if (message.type === 'error') {
      receivedError = message.error || message.code;
      console.log(`❌ 收到错误: ${receivedError}`);
      console.log(`   错误详情:`, message);
    } else if (message.type === 'session_ended') {
      console.log('🔚 Session 已结束');
    }
  } catch (e) {
    console.log('⚠️ 无法解析消息:', data.toString());
  }
});

ws.on('close', (code, reason) => {
  console.log(`\n🔌 WebSocket 连接关闭`);
  console.log(`   关闭代码: ${code}`);
  console.log(`   关闭原因: ${reason ? reason.toString() : '无'}\n`);

  // 汇总测试结果
  console.log('=== 测试结果 ===');
  if (receivedError) {
    console.log(`❌ 测试失败: ${receivedError}`);
  } else if (audioBuffer.length > 0) {
    console.log('✅ 测试成功: 收到音频数据');
    console.log(`   总音频大小: ${audioBuffer.reduce((a, b) => a + b.length, 0)} 字节`);
    console.log(`   音频包数量: ${audioBuffer.length}`);
  } else if (connectionReady) {
    console.log('⚠️ 测试不完整: 连接成功但未收到音频');
  } else {
    console.log('❌ 测试失败: 连接未就绪');
  }
});

// 设置超时
const TIMEOUT_MS = 60000;
const timeoutId = setTimeout(() => {
  console.log(`\n⏱️ 测试超时 (${TIMEOUT_MS}ms)，强制关闭连接\n`);
  ws.close(1005, '测试超时');
}, TIMEOUT_MS);

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n\n正在优雅关闭...');
  clearTimeout(timeoutId);
  ws.send(JSON.stringify({ type: 'end_session' }));
  setTimeout(() => {
    ws.close();
    process.exit(0);
  }, 1000);
});
