// 火山引擎实时语音API二进制协议实现
// 参考官方Python示例: https://www.volcengine.com/docs/6561/1594356?lang=zh

import * as zlib from 'zlib';

// 协议常量
const PROTOCOL_VERSION = 0b0001;

// Message Type
const CLIENT_FULL_REQUEST = 0b0001;
const CLIENT_AUDIO_ONLY_REQUEST = 0b0010;
const SERVER_FULL_RESPONSE = 0b1001;
const SERVER_ACK = 0b1011;
const SERVER_ERROR_RESPONSE = 0b1111;

// Message Type Specific Flags
const NO_SEQUENCE = 0b0000;
const POS_SEQUENCE = 0b0001;
const NEG_SEQUENCE = 0b0010;
const NEG_SEQUENCE_1 = 0b0011;
const MSG_WITH_EVENT = 0b0100;

// Message Serialization
const NO_SERIALIZATION = 0b0000;
const JSON_SERIALIZATION = 0b0001;
const THRIFT = 0b0011;
const CUSTOM_TYPE = 0b1111;

// Message Compression
const NO_COMPRESSION = 0b0000;
const GZIP = 0b0001;
const CUSTOM_COMPRESSION = 0b1111;

// 事件ID
export const EventId = {
  StartConnection: 1,
  StartSession: 100,
  FinishSession: 102,
  TaskRequest: 200,
  SayHello: 300,
  EndASR: 400,
  ChatTTSText: 500,
  ChatTextQuery: 501,
  ChatRAGText: 502,
  UpdateConfig: 201,
  ConnectionStarted: 50,
  ConnectionFailed: 51,
  SessionStarted: 150,
  SessionFailed: 153,
  UsageResponse: 154,
  TTSResponse: 352,
  ASRInfo: 450,
  ASRResponse: 451,
  ASREnded: 459,
  ChatResponse: 550,
  ChatEnded: 559,
  DialogCommonError: 599,
} as const;

/**
 * 构建二进制header（参考Python示例的generate_header函数）
 */
function generateHeader(
  message_type: number = CLIENT_FULL_REQUEST,
  message_type_specific_flags: number = MSG_WITH_EVENT,
  serial_method: number = JSON_SERIALIZATION,
  compression_type: number = GZIP,
  extension_header: Buffer = Buffer.alloc(0)
): Buffer {
  const header = Buffer.alloc(4 + extension_header.length);

  // byte0: protocol version (4 bits) + header size (4 bits)
  const header_size = Math.floor(extension_header.length / 4) + 1;
  header[0] = (PROTOCOL_VERSION << 4) | header_size;

  // byte1: message type (4 bits) + message type specific flags (4 bits)
  header[1] = (message_type << 4) | message_type_specific_flags;

  // byte2: serialization method (4 bits) + compression type (4 bits)
  header[2] = (serial_method << 4) | compression_type;

  // byte3: reserved
  header[3] = 0x00;

  // extension header
  if (extension_header.length > 0) {
    extension_header.copy(header, 4);
  }

  return header;
}

/**
 * 构建StartConnection帧
 * 参考Python: start_connection_request = bytearray(protocol.generate_header())
 *           start_connection_request.extend(int(1).to_bytes(4, 'big'))
 */
export function buildStartConnectionFrame(): Buffer {
  // 暂时不使用GZIP压缩，调试用
  const useCompression = false;

  // header
  const header = generateHeader(
    CLIENT_FULL_REQUEST,
    MSG_WITH_EVENT,
    JSON_SERIALIZATION,
    useCompression ? GZIP : NO_COMPRESSION
  );

  // event id (4 bytes)
  const eventBuffer = Buffer.alloc(4);
  eventBuffer.writeUInt32BE(EventId.StartConnection, 0);

  // payload (empty JSON: {})
  let payload: Buffer | string = JSON.stringify({});
  if (useCompression) {
    payload = zlib.gzipSync(Buffer.from(payload, 'utf-8'));
  } else {
    payload = Buffer.from(payload, 'utf-8');
  }

  // payload size (4 bytes)
  const payloadSizeBuffer = Buffer.alloc(4);
  payloadSizeBuffer.writeUInt32BE(payload.length, 0);

  return Buffer.concat([header, eventBuffer, payloadSizeBuffer, payload]);
}

/**
 * 构建StartSession帧
 */
export function buildStartSessionFrame(sessionId: string, dialogConfig: Record<string, any>): Buffer {
  // 暂时不使用GZIP压缩，调试用
  const useCompression = false;

  // header
  const header = generateHeader(
    CLIENT_FULL_REQUEST,
    MSG_WITH_EVENT,
    JSON_SERIALIZATION,
    useCompression ? GZIP : NO_COMPRESSION
  );

  // event id (4 bytes)
  const eventBuffer = Buffer.alloc(4);
  eventBuffer.writeUInt32BE(EventId.StartSession, 0);

  // session id size (4 bytes)
  const sessionIdBuffer = Buffer.from(sessionId, 'utf-8');
  const sessionIdSizeBuffer = Buffer.alloc(4);
  sessionIdSizeBuffer.writeUInt32BE(sessionIdBuffer.length, 0);

  // payload
  let payload: Buffer | string = JSON.stringify({ dialog: dialogConfig });
  if (useCompression) {
    payload = zlib.gzipSync(Buffer.from(payload, 'utf-8'));
  } else {
    payload = Buffer.from(payload, 'utf-8');
  }

  // payload size (4 bytes)
  const payloadSizeBuffer = Buffer.alloc(4);
  payloadSizeBuffer.writeUInt32BE(payload.length, 0);

  return Buffer.concat([
    header,
    eventBuffer,
    sessionIdSizeBuffer,
    sessionIdBuffer,
    payloadSizeBuffer,
    payload
  ]);
}

/**
 * 构建TaskRequest帧（上传音频）
 * 参考Python: task_request = bytearray(
 *               protocol.generate_header(message_type=protocol.CLIENT_AUDIO_ONLY_REQUEST,
 *                                        serial_method=protocol.NO_SERIALIZATION))
 *           task_request.extend(int(200).to_bytes(4, 'big'))
 *           task_request.extend((len(self.session_id)).to_bytes(4, 'big'))
 *           task_request.extend(str.encode(self.session_id))
 *           payload_bytes = gzip.compress(audio)
 *           task_request.extend((len(payload_bytes)).to_bytes(4, 'big'))
 *           task_request.extend(payload_bytes)
 */
export function buildTaskRequestFrame(audioData: Buffer): Buffer {
  // 暂时不使用GZIP压缩，调试用
  const useCompression = false;

  // header (音频数据，使用CLIENT_AUDIO_ONLY_REQUEST和NO_SERIALIZATION)
  const header = generateHeader(
    CLIENT_AUDIO_ONLY_REQUEST,
    MSG_WITH_EVENT,
    NO_SERIALIZATION,
    useCompression ? GZIP : NO_COMPRESSION
  );

  // event id (4 bytes)
  const eventBuffer = Buffer.alloc(4);
  eventBuffer.writeUInt32BE(EventId.TaskRequest, 0);

  // session id size (4 bytes) - 注意：audio request也需要session id
  const sessionIdSizeBuffer = Buffer.alloc(4);
  sessionIdSizeBuffer.writeUInt32BE(0, 0); // 暂时设为0，实际应该传session id

  // payload (压缩后的音频)
  let payload: Buffer;
  if (useCompression) {
    payload = zlib.gzipSync(audioData);
  } else {
    payload = audioData;
  }

  // payload size (4 bytes)
  const payloadSizeBuffer = Buffer.alloc(4);
  payloadSizeBuffer.writeUInt32BE(payload.length, 0);

  return Buffer.concat([
    header,
    eventBuffer,
    sessionIdSizeBuffer,
    payloadSizeBuffer,
    payload
  ]);
}

/**
 * 构建TaskRequest帧（带sessionId）
 */
export function buildTaskRequestFrameWithSession(sessionId: string, audioData: Buffer): Buffer {
  // 暂时不使用GZIP压缩，调试用
  const useCompression = false;

  // header (音频数据，使用CLIENT_AUDIO_ONLY_REQUEST和NO_SERIALIZATION)
  const header = generateHeader(
    CLIENT_AUDIO_ONLY_REQUEST,
    MSG_WITH_EVENT,
    NO_SERIALIZATION,
    useCompression ? GZIP : NO_COMPRESSION
  );

  // event id (4 bytes)
  const eventBuffer = Buffer.alloc(4);
  eventBuffer.writeUInt32BE(EventId.TaskRequest, 0);

  // session id size (4 bytes)
  const sessionIdBuffer = Buffer.from(sessionId, 'utf-8');
  const sessionIdSizeBuffer = Buffer.alloc(4);
  sessionIdSizeBuffer.writeUInt32BE(sessionIdBuffer.length, 0);

  // payload (压缩后的音频)
  let payload: Buffer;
  if (useCompression) {
    payload = zlib.gzipSync(audioData);
  } else {
    payload = audioData;
  }

  // payload size (4 bytes)
  const payloadSizeBuffer = Buffer.alloc(4);
  payloadSizeBuffer.writeUInt32BE(payload.length, 0);

  return Buffer.concat([
    header,
    eventBuffer,
    sessionIdSizeBuffer,
    sessionIdBuffer,
    payloadSizeBuffer,
    payload
  ]);
}

/**
 * 构建ChatTextQuery帧
 * 参考Python: chat_text_query_request = bytearray(protocol.generate_header())
 *           chat_text_query_request.extend(int(501).to_bytes(4, 'big'))
 *           payload_bytes = str.encode(json.dumps(payload))
 *           payload_bytes = gzip.compress(payload_bytes)
 *           chat_text_query_request.extend((len(self.session_id)).to_bytes(4, 'big'))
 *           chat_text_query_request.extend(str.encode(self.session_id))
 *           chat_text_query_request.extend((len(payload_bytes)).to_bytes(4, 'big'))
 *           chat_text_query_request.extend(payload_bytes)
 */
export function buildChatTextQueryFrame(sessionId: string, text: string): Buffer {
  // 暂时不使用GZIP压缩，调试用
  const useCompression = false;

  // header
  const header = generateHeader(
    CLIENT_FULL_REQUEST,
    MSG_WITH_EVENT,
    JSON_SERIALIZATION,
    useCompression ? GZIP : NO_COMPRESSION
  );

  // event id (4 bytes)
  const eventBuffer = Buffer.alloc(4);
  eventBuffer.writeUInt32BE(EventId.ChatTextQuery, 0);

  // payload
  let payload: Buffer | string = JSON.stringify({ content: text });
  if (useCompression) {
    payload = zlib.gzipSync(Buffer.from(payload, 'utf-8'));
  } else {
    payload = Buffer.from(payload, 'utf-8');
  }

  // session id size (4 bytes)
  const sessionIdBuffer = Buffer.from(sessionId, 'utf-8');
  const sessionIdSizeBuffer = Buffer.alloc(4);
  sessionIdSizeBuffer.writeUInt32BE(sessionIdBuffer.length, 0);

  // payload size (4 bytes)
  const payloadSizeBuffer = Buffer.alloc(4);
  payloadSizeBuffer.writeUInt32BE(payload.length, 0);

  return Buffer.concat([
    header,
    eventBuffer,
    sessionIdSizeBuffer,
    sessionIdBuffer,
    payloadSizeBuffer,
    payload
  ]);
}

/**
 * 构建FinishSession帧
 */
export function buildFinishSessionFrame(sessionId: string): Buffer {
  // 暂时不使用GZIP压缩，调试用
  const useCompression = false;

  // header
  const header = generateHeader(
    CLIENT_FULL_REQUEST,
    MSG_WITH_EVENT,
    JSON_SERIALIZATION,
    useCompression ? GZIP : NO_COMPRESSION
  );

  // event id (4 bytes)
  const eventBuffer = Buffer.alloc(4);
  eventBuffer.writeUInt32BE(EventId.FinishSession, 0);

  // payload (empty JSON: {})
  let payload: Buffer | string = JSON.stringify({});
  if (useCompression) {
    payload = zlib.gzipSync(Buffer.from(payload, 'utf-8'));
  } else {
    payload = Buffer.from(payload, 'utf-8');
  }

  // session id size (4 bytes)
  const sessionIdBuffer = Buffer.from(sessionId, 'utf-8');
  const sessionIdSizeBuffer = Buffer.alloc(4);
  sessionIdSizeBuffer.writeUInt32BE(sessionIdBuffer.length, 0);

  // payload size (4 bytes)
  const payloadSizeBuffer = Buffer.alloc(4);
  payloadSizeBuffer.writeUInt32BE(payload.length, 0);

  return Buffer.concat([
    header,
    eventBuffer,
    sessionIdSizeBuffer,
    sessionIdBuffer,
    payloadSizeBuffer,
    payload
  ]);
}

/**
 * 构建FinishConnection帧
 */
export function buildFinishConnectionFrame(): Buffer {
  // 暂时不使用GZIP压缩，调试用
  const useCompression = false;

  // header
  const header = generateHeader(
    CLIENT_FULL_REQUEST,
    NO_SEQUENCE,
    JSON_SERIALIZATION,
    useCompression ? GZIP : NO_COMPRESSION
  );

  // event id (4 bytes)
  const eventBuffer = Buffer.alloc(4);
  eventBuffer.writeUInt32BE(EventId.ConnectionFailed, 0);

  // payload (empty JSON: {})
  let payload: Buffer | string = JSON.stringify({});
  if (useCompression) {
    payload = zlib.gzipSync(Buffer.from(payload, 'utf-8'));
  } else {
    payload = Buffer.from(payload, 'utf-8');
  }

  // payload size (4 bytes)
  const payloadSizeBuffer = Buffer.alloc(4);
  payloadSizeBuffer.writeUInt32BE(payload.length, 0);

  return Buffer.concat([
    header,
    eventBuffer,
    payloadSizeBuffer,
    payload
  ]);
}

/**
 * 解析二进制帧（参考Python示例的parse_response函数）
 */
export function parseBinaryFrame(data: Buffer): {
  messageType: number;
  flags: number;
  eventId?: number;
  payload: Buffer;
} | null {
  try {
    // byte0: protocol version (4 bits) + header size (4 bits, 单位是4字节)
    const headerSizeInWords = data[0] & 0x0F;  // header size，单位是4字节
    const headerSizeInBytes = headerSizeInWords * 4;  // 转换为字节

    // byte1: message type (4 bits) + message type specific flags (4 bits)
    const messageType = (data[1] >> 4) & 0x0F;
    const flags = data[1] & 0x0F;

    // byte2: serialization method (4 bits) + compression type (4 bits)
    const serializationMethod = (data[2] >> 4) & 0x0F;
    const compressionType = data[2] & 0x0F;

    // header extensions (从byte4开始，到header结束)
    const headerExtensions = data.slice(4, headerSizeInBytes);

    // payload从header之后开始
    let payload = data.slice(headerSizeInBytes);
    let eventId: number | undefined = undefined;

    // 如果有event flag，解析event id
    if (flags & MSG_WITH_EVENT) {
      if (payload.length < 4) {
        console.error('Payload too short for event_id');
        return null;
      }
      eventId = payload.readUInt32BE(0);
      payload = payload.slice(4);
    }

    // 如果是服务端响应，解析session id和payload
    if (messageType === SERVER_FULL_RESPONSE || messageType === SERVER_ACK) {
      if (payload.length < 4) {
        console.error('Payload too short for session_id_size');
        return null;
      }
      const sessionIdSize = payload.readInt32BE(0);
      payload = payload.slice(4);

      if (payload.length < sessionIdSize) {
        console.error(`Payload too short for session_id: expected ${sessionIdSize}, got ${payload.length}`);
        return null;
      }
      const sessionId = payload.slice(0, sessionIdSize);
      payload = payload.slice(sessionIdSize);

      if (payload.length < 4) {
        console.error('Payload too short for payload_size');
        return null;
      }
      const payloadSize = payload.readUInt32BE(0);
      payload = payload.slice(4);

      if (payload.length < payloadSize) {
        console.error(`Payload size mismatch: expected ${payloadSize}, got ${payload.length}`);
        return null;
      }
      payload = payload.slice(0, payloadSize);
    } else if (messageType === SERVER_ERROR_RESPONSE) {
      // 错误帧：code (4 bytes) + payload_size (4 bytes) + payload
      if (payload.length < 8) {
        console.error('Payload too short for error frame');
        return null;
      }
      payload = payload.slice(4);  // 跳过code
      const payloadSize = payload.readUInt32BE(0);
      payload = payload.slice(4);

      if (payload.length < payloadSize) {
        console.error(`Error payload size mismatch: expected ${payloadSize}, got ${payload.length}`);
        return null;
      }
      payload = payload.slice(0, payloadSize);
    }

    return {
      messageType,
      flags,
      eventId,
      payload
    };
  } catch (error) {
    console.error('Failed to parse binary frame:', error);
    return null;
  }
}
