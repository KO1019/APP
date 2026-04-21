import * as protocol from './src/volcengine-protocol.ts';

// 测试StartConnection
console.log('=== 测试StartConnection ===');
const startConnFrame = protocol.buildStartConnectionFrame(
  '5883642625',
  'test_token'
);
console.log('StartConnection hex:', startConnFrame.toString('hex'));
console.log('StartConnection bytes:', Array.from(startConnFrame));

// 对比文档hex: [17 20 16 0 0 0 0 1 0 0 0 2 123 125]
console.log('文档hex:', '1720160000000001000000027b7d');

console.log('\n=== 测试StartSession ===');
const sessionId = '75a6126e-427f-49a1-a2c1-621143cb9db3';
const dialogConfig = {
  bot_name: '豆包',
  dialog_id: ''
};
const startSessFrame = protocol.buildStartSessionFrame(sessionId, dialogConfig);
console.log('StartSession hex:', startSessFrame.toString('hex').substring(0, 120) + '...');

// 对比文档hex: [17 20 16 0 0 0 0 100 0 0 0 36 ...]
console.log('文档hex开头:', '17201600000000006400000024...');
