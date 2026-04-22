const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

console.log('=== WebSocket 实时语音完整测试 ===\n');

const ws = new WebSocket('ws://localhost:9091/api/v1/voice/realtime');
let sessionId = '';
let audioBuffer = Buffer.alloc(0);
let testPhase = 'connect'; // connect -> text_input -> audio_received -> voice_input

ws.on('open', () => {
  console.log('✅ [1/4] WebSocket 连接成功建立！');
  testPhase = 'connect';
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());

    if (message.type === 'connection_ready') {
      sessionId = message.sessionId;
      console.log('✅ [2/4] 连接就绪，Session ID:', sessionId);
      testPhase = 'text_input';

      // 1.5秒后发送文字输入
      setTimeout(() => {
        console.log('📤 [3/4] 发送文字输入测试...');
        ws.send(JSON.stringify({
          type: 'text_input',
          text: '你好，今天天气怎么样？'
        }));
      }, 1500);
    }

    if (message.type === 'session_ready') {
      console.log('✅ Session 已完全就绪！');
    }

    if (message.type === 'text') {
      console.log('📝 收到豆包文字回复:', message.text);
    }

    if (message.type === 'audio') {
      // 累积音频数据
      if (message.audio) {
        const audioChunk = Buffer.from(message.audio, 'base64');
        audioBuffer = Buffer.concat([audioBuffer, audioChunk]);
        console.log(`🎵 收到音频片段: ${audioChunk.length} bytes (总计: ${audioBuffer.length} bytes)`);
      }
    }

    if (message.type === 'audio_complete') {
      console.log('✅ [4/4] 音频接收完成！');
      console.log(`📦 总音频大小: ${audioBuffer.length} bytes`);

      // 保存音频到文件
      const audioPath = path.join(__dirname, 'doubao-response.pcm');
      fs.writeFileSync(audioPath, audioBuffer);
      console.log(`💾 音频已保存到: ${audioPath}`);
      console.log('');
      console.log('📌 提示：音频格式为 PCM, 单声道, 24000Hz, 16bit');
      console.log('📌 可以使用以下命令播放（如果系统支持）:');
      console.log(`   play -r 24000 -e signed -b 16 -c 1 ${audioPath}`);

      // 3秒后关闭连接
      setTimeout(() => {
        console.log('');
        console.log('📝 测试完成，准备关闭连接...');
        ws.close();
      }, 3000);
    }

    if (message.type === 'error') {
      console.error('❌ 收到错误:', message.error);
    }

    if (message.type === 'connection_closed') {
      console.log('🔌 连接已关闭:', message.code, message.reason);
    }
  } catch (e) {
    // 非JSON消息，可能是二进制数据
    console.log('📨 收到非JSON消息:', data.length, 'bytes');
  }
});

ws.on('close', (code, reason) => {
  console.log('🔌 WebSocket 连接关闭');
  console.log('   关闭代码:', code);
  console.log('   关闭原因:', reason?.toString() || '无');

  if (audioBuffer.length > 0) {
    console.log('');
    console.log('📊 测试总结:');
    console.log(`   - 接收音频总大小: ${audioBuffer.length} bytes`);
    console.log(`   - 测试阶段: ${testPhase}`);
  } else {
    console.log('');
    console.log('⚠️ 警告: 未接收到任何音频数据');
  }

  process.exit(0);
});

ws.on('error', (error) => {
  console.error('❌ WebSocket 错误:', error.message);
  console.error('   错误详情:', error);
  process.exit(1);
});

// 60秒超时
setTimeout(() => {
  console.log('⏱️ 测试超时 (60秒)，强制关闭连接');
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'end_session' }));
    setTimeout(() => ws.close(), 1000);
  } else {
    process.exit(1);
  }
}, 60000);

console.log('⏳ 等待连接建立...\n');
