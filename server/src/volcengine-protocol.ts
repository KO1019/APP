// 火山引擎实时语音API二进制协议实现

// 消息类型
export enum MessageType {
  FullClientRequest = 0b0001,    // 客户端文本事件
  FullServerResponse = 0b1001,  // 服务端文本事件
  AudioOnlyRequest = 0b0010,     // 客户端音频数据
  AudioOnlyResponse = 0b1011,   // 服务端音频数据
  Error = 0b1111,                // 错误事件
}

// 序列化方法
export enum Serialization {
  Raw = 0b0000,    // 无序列化（二进制音频）
  JSON = 0b0001,   // JSON序列化
}

// 压缩方法
export enum Compression {
  None = 0b0000,   // 无压缩
  Gzip = 0b0001,   // gzip压缩
}

// Message type specific flags
export enum Flags {
  None = 0b0000,
  WithEvent = 0b0100,  // 携带event ID
}

/**
 * 构建二进制帧
 * @param messageType 消息类型
 * @param flags 特殊标志
 * @param serialization 序列化方法
 * @param compression 压缩方法
 * @param eventId 事件ID（可选）
 * @param sessionId 会话ID（可选）
 * @param payload 负载数据（可选）
 */
export function buildBinaryFrame(
  messageType: MessageType,
  flags: Flags,
  serialization: Serialization,
  compression: Compression,
  eventId?: number,
  sessionId?: string,
  payload?: Buffer | string
): Buffer {
  // 构建payload
  let payloadBuffer: Buffer;
  if (payload === undefined) {
    payloadBuffer = Buffer.alloc(0);
  } else if (typeof payload === 'string') {
    payloadBuffer = Buffer.from(payload, 'utf-8');
  } else {
    payloadBuffer = payload;
  }

  // 计算header大小（用于byte0右4位）
  // 注意：header size字段只包含固定长度的字段，不包含variable length的sessionId！
  let headerSizeForField = 4; // 基础4字节
  const optionalFields: Buffer[] = [];

  // 可选字段：event ID
  if (eventId !== undefined && flags & 0b0100) {
    const eventBuffer = Buffer.alloc(4);
    eventBuffer.writeUInt32BE(eventId, 0);
    optionalFields.push(eventBuffer);
    headerSizeForField += 4;
  }

  // 可选字段：session ID size + session ID
  let sessionIdBuffer: Buffer | null = null;
  if (sessionId !== undefined) {
    sessionIdBuffer = Buffer.from(sessionId);
    const sessionIdSizeBuffer = Buffer.alloc(4);
    sessionIdSizeBuffer.writeUInt32BE(sessionIdBuffer.length, 0);
    optionalFields.push(sessionIdSizeBuffer);
    // sessionId本身也作为header的一部分（紧接在sessionIdSize之后）
    optionalFields.push(sessionIdBuffer);
    // sessionIdSize字段算在header size字段中，但sessionId本身不算！
    headerSizeForField += 4;
  }

  // 构建payload size字段（4字节）
  const payloadSizeBuffer = Buffer.alloc(4);
  payloadSizeBuffer.writeUInt32BE(payloadBuffer.length, 0);

  // 构建header
  const headerBuffer = Buffer.alloc(4);
  const headerSizeValue = (headerSizeForField / 4) & 0x0F; // 右4位是header size (4的倍数)
  headerBuffer[0] = 0b00010000 | headerSizeValue; // Protocol version 1 + header size
  headerBuffer[1] = (messageType << 4) | (flags & 0x0F); // Message type + flags
  headerBuffer[2] = (serialization << 4) | (compression & 0x0F); // Serialization + compression
  headerBuffer[3] = 0x00; // Reserved

  // 组合所有部分
  // 顺序: header -> optionalFields (eventId, sessionIdSize, sessionId) -> payload -> payloadSize
  // 等等，payload size应该在payload之后吗？不对，应该在payload之前！
  // 重新看文档... payload size应该紧接在header之后！
  // 正确顺序: header -> optionalFields -> payloadSize -> payload
  return Buffer.concat([
    headerBuffer,
    ...optionalFields,
    payloadSizeBuffer,
    payloadBuffer,
  ]);
}

/**
 * 解析二进制帧
 * @param data 二进制数据
 */
export function parseBinaryFrame(data: Buffer) {
  // 解析header
  const protocolVersion = (data[0] >> 4) & 0x0F;
  const headerSize = (data[0] & 0x0F) * 4; // 右4位是header size (4的倍数)
  const messageType = (data[1] >> 4) & 0x0F;
  const flags = data[1] & 0x0F;
  const serialization = (data[2] >> 4) & 0x0F;
  const compression = data[2] & 0x0F;
  const reserved = data[3];

  let offset = 4; // header结束后

  // 解析可选字段
  let eventId: number | undefined;
  let sessionId: string | undefined;
  let sessionIdSize: number | undefined;

  // 如果携带event ID
  if (flags & 0b0100) {
    eventId = data.readUInt32BE(offset);
    offset += 4;
  }

  // 如果有session ID（通过检查剩余数据判断）
  if (offset + 4 < data.length) {
    sessionIdSize = data.readUInt32BE(offset);
    offset += 4;

    if (sessionIdSize > 0 && offset + sessionIdSize <= data.length) {
      sessionId = data.slice(offset, offset + sessionIdSize).toString('utf-8');
      offset += sessionIdSize;
    }
  }

  // 读取payload size
  const payloadSize = data.readUInt32BE(offset);
  offset += 4;

  // 读取payload
  const payload = data.slice(offset, offset + payloadSize);

  return {
    protocolVersion,
    headerSize,
    messageType,
    flags,
    serialization,
    compression,
    eventId,
    sessionId,
    payload,
  };
}

// 事件ID
export enum EventId {
  StartConnection = 1,
  FinishConnection = 2,
  StartSession = 100,
  FinishSession = 102,
  TaskRequest = 200,
  SayHello = 300,
  ChatTTSText = 500,
  ChatTextQuery = 501,
  ChatRAGText = 502,

  // 服务端事件
  ConnectionStarted = 50,
  ConnectionFailed = 51,
  ConnectionFinished = 52,
  SessionStarted = 150,
  SessionFinished = 152,
  SessionFailed = 153,
  UsageResponse = 154,
  TTSSentenceStart = 350,
  TTSSentenceEnd = 351,
  TTSResponse = 352,
  TTSEnded = 359,
  ASRInfo = 450,
  ASRResponse = 451,
  ASREnded = 459,
  ChatResponse = 550,
  ChatEnded = 559,
}

/**
 * 构建StartConnection帧
 */
export function buildStartConnectionFrame(): Buffer {
  return buildBinaryFrame(
    MessageType.FullClientRequest,
    Flags.WithEvent,
    Serialization.JSON,
    Compression.None,
    EventId.StartConnection,
    undefined,
    '{}'
  );
}

/**
 * 构建StartSession帧
 */
export function buildStartSessionFrame(sessionId: string, dialogConfig: any): Buffer {
  return buildBinaryFrame(
    MessageType.FullClientRequest,
    Flags.WithEvent,
    Serialization.JSON,
    Compression.None,
    EventId.StartSession,
    sessionId,
    JSON.stringify({ dialog: dialogConfig })
  );
}

/**
 * 构建FinishSession帧
 */
export function buildFinishSessionFrame(sessionId: string): Buffer {
  return buildBinaryFrame(
    MessageType.FullClientRequest,
    Flags.WithEvent,
    Serialization.JSON,
    Compression.None,
    EventId.FinishSession,
    sessionId,
    '{}'
  );
}

/**
 * 构建FinishConnection帧
 */
export function buildFinishConnectionFrame(): Buffer {
  return buildBinaryFrame(
    MessageType.FullClientRequest,
    Flags.WithEvent,
    Serialization.JSON,
    Compression.None,
    EventId.FinishConnection,
    undefined,
    '{}'
  );
}

/**
 * 构建TaskRequest帧（音频数据）
 */
export function buildTaskRequestFrame(audioData: Buffer): Buffer {
  return buildBinaryFrame(
    MessageType.AudioOnlyRequest,
    Flags.None,
    Serialization.Raw,
    Compression.None,
    undefined,
    undefined,
    audioData
  );
}

/**
 * 构建ChatTextQuery帧
 */
export function buildChatTextQueryFrame(sessionId: string, text: string): Buffer {
  return buildBinaryFrame(
    MessageType.FullClientRequest,
    Flags.WithEvent,
    Serialization.JSON,
    Compression.None,
    EventId.ChatTextQuery,
    sessionId,
    JSON.stringify({ text })
  );
}

/**
 * 构建音频数据帧
 */
export function buildAudioFrame(audioData: Buffer): Buffer {
  return buildBinaryFrame(
    MessageType.AudioOnlyRequest,
    Flags.None,
    Serialization.Raw,
    Compression.None,
    undefined,
    undefined,
    audioData
  );
}
