import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:9091/api/v1/voice/realtime');

ws.on('open', () => {
  console.log('✅ Connected to backend');
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('📥 Received:', message);

  if (message.type === 'connection_ready') {
    console.log('✅ Connection ready, session ID:', message.sessionId);
    // 延迟1秒再发送文本消息
    setTimeout(() => {
      console.log('📤 Sending text_input: 你好');
      ws.send(JSON.stringify({
        type: 'text_input',
        text: '你好'
      }));
    }, 1000);
  }
  // SessionStarted
  else if (message.type === 'session_ready') {
    console.log('✅ Session ready');
  }
  // ASR结果
  else if (message.type === 'asr_result') {
    console.log('🎤 ASR:', message.data);
  }
  // Chat响应
  else if (message.type === 'chat_response') {
    console.log('💬 Chat:', message.data);
  }
  // 音频数据
  else if (message.type === 'audio_data') {
    console.log('🔊 Audio:', message.data.length, 'bytes');
  }
  // 错误
  else if (message.type === 'error') {
    console.error('❌ Error:', message.message);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

ws.on('close', (code, reason) => {
  console.log('❌ WebSocket closed, code:', code, 'reason:', reason.toString());
});

setTimeout(() => {
  console.log('⏰ 15秒超时，关闭连接');
  ws.close();
}, 15000);
