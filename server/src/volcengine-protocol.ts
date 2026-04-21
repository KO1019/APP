/**
 * 豆包实时语音对话API 二进制协议编解码器
 * 参考: https://www.volcengine.com/docs/6561/1594356
 */

// 事件ID定义
export const EVENT_ID = {
  START_CONNECTION: 1,
  FINISH_CONNECTION: 2,
  START_SESSION: 100,
  FINISH_SESSION: 102,
  TASK_REQUEST: 200,
  CHAT_TEXT_QUERY: 501,
  // 服务端事件
  CONNECTION_STARTED: 50,
  CONNECTION_FAILED: 51,
  CONNECTION_FINISHED: 52,
  SESSION_STARTED: 150,
  SESSION_FINISHED: 152,
  SESSION_FAILED: 153,
  ASR_INFO: 50,
  ASR_RESPONSE: 451,
  ASR_ENDED: 459,
  CHAT_RESPONSE: 550,
  CHAT_TEXT_QUERY_CONFIRMED: 553,
  CHAT_ENDED: 559,
  TTS_SENTENCE_START: 350,
  TTS_SENTENCE_END: 351,
  TTS_RESPONSE: 352,
  TTS_ENDED: 359,
} as const;

// Message Type定义
const MESSAGE_TYPE = {
  FULL_CLIENT_REQUEST: 0b0001,
  AUDIO_ONLY_REQUEST: 0b0010,
  FULL_SERVER_RESPONSE: 0b1001,
  AUDIO_ONLY_SERVER_RESPONSE: 0b1011,
  ERROR: 0b1111,
} as const;

// Message type specific flags
const FLAGS = {
  NO_SEQUENCE: 0b0000,
  HAS_SEQUENCE: 0b0100,
  HAS_EVENT: 0b0100,
  FINISH_SESSION: 0b0000,
  FINISH_CONNECTION: 0b0100,
} as const;

// Serialization method
const SERIALIZATION = {
  RAW: 0b0000,
  JSON: 0b0001,
} as const;

// Compression method
const COMPRESSION = {
  NONE: 0b0000,
  GZIP: 0b0001,
} as const;

/**
 * 构建二进制帧
 */
export function buildBinaryFrame(
  messageType: number,
  flags: number,
  serialization: number,
  compression: number,
  eventId?: number,
  sessionId?: string,
  payload?: Buffer | string
): Buffer {
  // 计算header大小
  let headerSize = 4; // 基础4字节
  const optionalFields: Buffer[] = [];

  // 可选字段：event ID
  if (eventId !== undefined && flags & 0b0100) {
    const eventBuffer = Buffer.alloc(4);
    eventBuffer.writeUInt32BE(eventId, 0);
    optionalFields.push(eventBuffer);
    headerSize += 4;
  }

  // 可选字段：session ID size + session ID
  if (sessionId !== undefined) {
    const sessionIdBuffer = Buffer.from(sessionId);
    const sessionIdSizeBuffer = Buffer.alloc(4);
    sessionIdSizeBuffer.writeUInt32BE(sessionIdBuffer.length, 0);
    optionalFields.push(sessionIdSizeBuffer, sessionIdBuffer);
    headerSize += 4 + sessionIdBuffer.length;
  }

  // 构建payload
  let payloadBuffer: Buffer;
  if (payload === undefined) {
    payloadBuffer = Buffer.alloc(0);
  } else if (typeof payload === 'string') {
    payloadBuffer = Buffer.from(payload, 'utf-8');
  } else {
    payloadBuffer = payload;
  }

  // 构建header
  const headerBuffer = Buffer.alloc(4);
  const headerSizeValue = (headerSize / 4) & 0x0F; // 右4位是header size (4的倍数)
  headerBuffer[0] = 0b00010000 | headerSizeValue; // Protocol version 1 + header size
  headerBuffer[1] = (messageType << 4) | (flags & 0x0F); // Message type + flags
  headerBuffer[2] = (serialization << 4) | (compression & 0x0F); // Serialization + compression
  headerBuffer[3] = 0x00; // Reserved

  // 构建payload size字段（4字节）
  const payloadSizeBuffer = Buffer.alloc(4);
  payloadSizeBuffer.writeUInt32BE(payloadBuffer.length, 0);

  // 组合所有部分
  return Buffer.concat([headerBuffer, ...optionalFields, payloadSizeBuffer, payloadBuffer]);
}

/**
 * 解析二进制帧
 */
export interface ParsedFrame {
  messageType: number;
  flags: number;
  serialization: number;
  compression: number;
  eventId?: number;
  sessionId?: string;
  payload: Buffer;
}

export function parseBinaryFrame(buffer: Buffer): ParsedFrame | null {
  if (buffer.length < 8) {
    return null; // 最小4字节header + 4字节payload size
  }

  // 解析header（前4字节）
  const protocolVersion = (buffer[0] >> 4) & 0x0F;
  const headerSizeValue = buffer[0] & 0x0F;
  const headerSize = headerSizeValue * 4;

  if (protocolVersion !== 0b0001 || headerSize < 4) {
    return null; // 不支持的协议版本或无效的header size
  }

  const messageType = (buffer[1] >> 4) & 0x0F;
  const flags = buffer[1] & 0x0F;
  const serialization = (buffer[2] >> 4) & 0x0F;
  const compression = buffer[2] & 0x0F;

  let offset = 4;
  let eventId: number | undefined;
  let sessionId: string | undefined;

  // 解析可选字段
  if (flags & 0b0100 && offset + 4 <= buffer.length) {
    eventId = buffer.readUInt32BE(offset);
    offset += 4;
  }

  // 如果有session ID
  if (offset + 4 <= buffer.length) {
    const sessionIdSize = buffer.readUInt32BE(offset);
    offset += 4;
    if (sessionIdSize > 0 && offset + sessionIdSize <= buffer.length) {
      sessionId = buffer.subarray(offset, offset + sessionIdSize).toString('utf-8');
      offset += sessionIdSize;
    }
  }

  // 读取payload size
  if (offset + 4 > buffer.length) {
    return null;
  }
  const payloadSize = buffer.readUInt32BE(offset);
  offset += 4;

  // 读取payload
  let payload: Buffer;
  if (offset + payloadSize > buffer.length) {
    return null;
  }
  payload = buffer.subarray(offset, offset + payloadSize);

  return {
    messageType,
    flags,
    serialization,
    compression,
    eventId,
    sessionId,
    payload,
  };
}

/**
 * 构建StartConnection事件帧
 */
export function buildStartConnectionFrame(): Buffer {
  return buildBinaryFrame(
    MESSAGE_TYPE.FULL_CLIENT_REQUEST,
    FLAGS.HAS_EVENT,
    SERIALIZATION.JSON,
    COMPRESSION.NONE,
    EVENT_ID.START_CONNECTION,
    undefined,
    JSON.stringify({})
  );
}

/**
 * 构建StartSession事件帧
 */
export interface StartSessionPayload {
  bot_name?: string;
  system_role?: string;
  speaking_style?: string;
  dialog_id?: string;
  character_manifest?: string;
  model?: string;
  enable_music?: boolean;
}

export function buildStartSessionFrame(
  sessionId: string,
  payload: StartSessionPayload
): Buffer {
  const requestBody = {
    dialog: {
      bot_name: payload.bot_name || '豆包',
      system_role: payload.system_role || '你是一位温暖、专业的心理陪伴助手。',
      speaking_style: payload.speaking_style,
      dialog_id: payload.dialog_id || '',
      character_manifest: payload.character_manifest,
      extra: {
        model: payload.model || '1.2.1.1',
        enable_music: payload.enable_music || false,
      },
    },
  };

  return buildBinaryFrame(
    MESSAGE_TYPE.FULL_CLIENT_REQUEST,
    FLAGS.HAS_EVENT,
    SERIALIZATION.JSON,
    COMPRESSION.NONE,
    EVENT_ID.START_SESSION,
    sessionId,
    JSON.stringify(requestBody)
  );
}

/**
 * 构建TaskRequest事件帧（发送音频）
 */
export function buildTaskRequestFrame(sessionId: string, audioData: Buffer): Buffer {
  return buildBinaryFrame(
    MESSAGE_TYPE.AUDIO_ONLY_REQUEST,
    0,
    SERIALIZATION.RAW,
    COMPRESSION.NONE,
    undefined,
    sessionId,
    audioData
  );
}

/**
 * 构建FinishSession事件帧
 */
export function buildFinishSessionFrame(sessionId: string): Buffer {
  return buildBinaryFrame(
    MESSAGE_TYPE.FULL_CLIENT_REQUEST,
    FLAGS.HAS_EVENT,
    SERIALIZATION.JSON,
    COMPRESSION.NONE,
    EVENT_ID.FINISH_SESSION,
    sessionId,
    JSON.stringify({})
  );
}

/**
 * 构建FinishConnection事件帧
 */
export function buildFinishConnectionFrame(): Buffer {
  return buildBinaryFrame(
    MESSAGE_TYPE.FULL_CLIENT_REQUEST,
    FLAGS.HAS_EVENT,
    SERIALIZATION.JSON,
    COMPRESSION.NONE,
    EVENT_ID.FINISH_CONNECTION,
    undefined,
    JSON.stringify({})
  );
}

/**
 * 构建ChatTextQuery事件帧（文本输入）
 */
export function buildChatTextQueryFrame(sessionId: string, text: string): Buffer {
  const requestBody = {
    content: text,
  };

  return buildBinaryFrame(
    MESSAGE_TYPE.FULL_CLIENT_REQUEST,
    FLAGS.HAS_EVENT,
    SERIALIZATION.JSON,
    COMPRESSION.NONE,
    EVENT_ID.CHAT_TEXT_QUERY,
    sessionId,
    JSON.stringify(requestBody)
  );
}
