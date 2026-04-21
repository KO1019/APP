// 分析文档中的hex示例
const hex = [17, 20, 16, 0, 0, 0, 0, 100, 0, 0, 0, 36, 55, 53, 97, 54, 49, 50, 54, 101, 45, 52, 50, 55, 102, 45, 52, 57, 97, 49, 45, 97, 50, 99, 49, 45, 54, 50, 49, 49, 52, 51, 99, 98, 57, 100, 98, 51, 0, 0, 0, 60];

console.log('byte0:', hex[0].toString(16), '=', hex[0].toString(2).padStart(8, '0'));
console.log('  left 4 bits (version):', (hex[0] >> 4).toString(2).padStart(4, '0'), '=', (hex[0] >> 4));
console.log('  right 4 bits (header size):', (hex[0] & 0x0F).toString(2).padStart(4, '0'), '=', (hex[0] & 0x0F), '*', 4, '=', (hex[0] & 0x0F) * 4);

console.log('\nbyte1:', hex[1].toString(16), '=', hex[1].toString(2).padStart(8, '0'));
console.log('  left 4 bits (message type):', (hex[1] >> 4).toString(2).padStart(4, '0'), '=', (hex[1] >> 4));
console.log('  right 4 bits (flags):', (hex[1] & 0x0F).toString(2).padStart(4, '0'), '=', (hex[1] & 0x0F));

console.log('\nbyte2:', hex[2].toString(16), '=', hex[2].toString(2).padStart(8, '0'));
console.log('  left 4 bits (serialization):', (hex[2] >> 4).toString(2).padStart(4, '0'), '=', (hex[2] >> 4));
console.log('  right 4 bits (compression):', (hex[2] & 0x0F).toString(2).padStart(4, '0'), '=', (hex[2] & 0x0F));

console.log('\nbyte3:', hex[3].toString(16), '=', hex[3].toString(2).padStart(8, '0'));
console.log('  reserved');

console.log('\nbytes 4-7 (event ID):');
const eventId = Buffer.from(hex.slice(4, 8)).readUInt32BE(0);
console.log('  value:', eventId);

console.log('\nbytes 8-11 (session ID size):');
const sessionIdSize = Buffer.from(hex.slice(8, 12)).readUInt32BE(0);
console.log('  value:', sessionIdSize);

console.log('\nbytes 12-47 (session ID):');
const sessionId = Buffer.from(hex.slice(12, 12 + sessionIdSize)).toString('utf-8');
console.log('  value:', sessionId);

console.log('\nbytes 48-51 (payload size):');
const payloadSize = Buffer.from(hex.slice(48, 52)).readUInt32BE(0);
console.log('  value:', payloadSize);

console.log('\nbytes 52-111 (payload):');
const payload = Buffer.from(hex.slice(52, 52 + payloadSize)).toString('utf-8');
console.log('  value:', payload);

console.log('\n--- Verification ---');
console.log('header size from byte0:', (hex[0] & 0x0F) * 4);
console.log('actual header bytes (0-11):', 12, 'bytes');
console.log('sessionId bytes (12-47):', 36, 'bytes');
console.log('payload size bytes (48-51):', 4, 'bytes');
console.log('payload bytes (52-111):', 60, 'bytes');
console.log('total frame length:', hex.length, 'bytes');
console.log('Expected: 4(header) + 4(eventId) + 4(sessionIdSize) + 36(sessionId) + 4(payloadSize) + 60(payload) =', 4+4+4+36+4+60);
