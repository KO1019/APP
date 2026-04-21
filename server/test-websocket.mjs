import WebSocket from 'ws';

console.log('Testing WebSocket connection to Express...');
const ws = new WebSocket('ws://localhost:9091/api/v1/voice/realtime');

ws.on('open', () => {
  console.log('✅ WebSocket connected to Express');
  console.log('Sending test message...');
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

setTimeout(() => {
  ws.close();
  process.exit(0);
}, 3000);
