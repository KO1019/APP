// 测试sessionId长度
const sessionId = 'session_1776800147768_5dsk7c';
console.log('sessionId string:', sessionId);
console.log('sessionId length:', sessionId.length);
console.log('sessionId bytes:', Buffer.from(sessionId));
console.log('sessionId byte length:', Buffer.from(sessionId).length);
console.log('sessionId hex:', Buffer.from(sessionId).toString('hex'));
console.log('Expected header size:', 4 + 4 + 4 + 28); // 40
