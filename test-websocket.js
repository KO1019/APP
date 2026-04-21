const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:9091/api/v1/voice/realtime');

ws.on('open', () => {
  console.log('✅ WebSocket connected to Express');
  ws.send(JSON.stringify({ type: 'test' }));
});

ws.on('message', (data) => {
  console.log('📨 Received:', data.toString());
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
  console.log('❌ WebSocket closed:', { code, reason: reason.toString() });
});
