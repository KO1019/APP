import WebSocket from 'ws';
import {
  buildStartConnectionFrame,
  buildStartSessionFrame,
  buildChatTextQueryFrame
} from './src/volcengine-protocol.js';
import dotenv from 'dotenv';

dotenv.config();

const APP_ID = process.env.VOLCENGINE_SPEECH_APP_ID;
const ACCESS_TOKEN = process.env.VOLCENGINE_ACCESS_TOKEN;
const VOLCENGINE_WS_URL = 'wss://openspeech.bytedance.com/api/v3/realtime/dialogue';

console.log('连接到豆包API:', VOLCENGINE_WS_URL);
console.log('APP ID:', APP_ID);
console.log('Access Token:', ACCESS_TOKEN.substring(0, 10) + '...');

const connectId = crypto.randomUUID();
const ws = new WebSocket(VOLCENGINE_WS_URL, {
  headers: {
    'X-Api-App-ID': APP_ID,
    'X-Api-Access-Key': ACCESS_TOKEN,
    'X-Api-Resource-Id': 'volc.speech.dialog',
    'X-Api-App-Key': 'PlgvMymc7f3tQnJ6',
    'X-Api-Connect-Id': connectId,
  }
});

let sessionId = null;

ws.on('open', () => {
  console.log('✅ WebSocket连接成功');

  // 发送StartConnection
  const startConnFrame = buildStartConnectionFrame(APP_ID, ACCESS_TOKEN);
  console.log('📤 发送StartConnection，hex:', startConnFrame.toString('hex'));
  ws.send(startConnFrame);
});

ws.on('message', (data) => {
  console.log('📥 收到消息，大小:', data.length);
  console.log('hex:', data.toString('hex'));

  // 解析响应
  const byte0 = data[0];
  const headerSize = (byte0 & 0x0F) * 4;
  const messageId = (data[1] >> 4) & 0x0F;

  // event_id在header之后
  const eventId = data.readUInt32BE(headerSize);

  console.log('headerSize:', headerSize, 'messageId:', messageId, 'eventId:', eventId);

  // ConnectionStarted (50) - 发送StartSession
  if (eventId === 50) {
    sessionId = 'test-session-' + Date.now();
    console.log('✅ 收到ConnectionStarted，发送StartSession，sessionId:', sessionId);

    const startSessFrame = buildStartSessionFrame(sessionId, {
      bot_name: '豆包',
      system_role: '你是一个友好的助手',
      speaking_style: '简洁明了',
      extra: {
        recv_timeout: 10,
        input_mod: 'text'
      }
    });
    console.log('📤 StartSession hex:', startSessFrame.toString('hex').substring(0, 80) + '...');
    ws.send(startSessFrame);
  }
  // SessionStarted (150)
  else if (eventId === 150) {
    console.log('✅ 收到SessionStarted，会话已建立！');
    // 可以发送SayHello或ChatTextQuery
    const helloFrame = buildStartSessionFrame(sessionId, {
      bot_name: '豆包',
      system_role: '你是一个友好的助手',
      speaking_style: '简洁明了',
      extra: {
        recv_timeout: 10,
        input_mod: 'text'
      }
    });
    console.log('📤 发送ChatTextQuery');
    ws.send(buildChatTextQueryFrame(sessionId, '你好'));
  }
  // ChatResponse (550)
  else if (eventId === 550) {
    console.log('✅ 收到ChatResponse');
    // 解析payload（需要gzip解压）
    // 简化处理，暂时只打印
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket错误:', error);
});

ws.on('close', (code, reason) => {
  console.log('❌ WebSocket关闭，code:', code, 'reason:', reason.toString());
  process.exit(0);
});

// 10秒后超时
setTimeout(() => {
  console.log('⏰ 10秒超时，关闭连接');
  ws.close();
  process.exit(0);
}, 10000);
