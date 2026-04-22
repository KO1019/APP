#!/usr/bin/env python3
"""
AI情绪日记 & 心理状态智能陪伴系统 - Python后端服务
使用FastAPI + WebSocket + 火山引擎RealtimeAPI
"""

import os
import json
import uuid
import hashlib
import asyncio
import struct
import zlib
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import websockets
import httpx
from supabase import create_client, Client

# 环境变量配置
JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key-change-in-production')

# 豆包ARK API配置（语言模型）
ARK_BASE_URL = os.getenv('ARK_BASE_URL', 'https://ark.cn-beijing.volces.com/api/v3')
ARK_API_KEY = os.getenv('ARK_API_KEY', '')
ARK_CHAT_MODEL = os.getenv('ARK_CHAT_MODEL', 'ep-20250212215003-7j9f8')

# 豆包语音API配置（从环境变量读取）
VOLCENGINE_SPEECH_APP_ID = os.getenv('VOLCENGINE_SPEECH_APP_ID', '') or os.getenv('COZE_VOLCENGINE_SPEECH_APP_ID', '')
VOLCENGINE_SPEECH_SECRET_KEY = os.getenv('VOLCENGINE_SPEECH_SECRET_KEY', '') or os.getenv('COZE_VOLCENGINE_SPEECH_SECRET_KEY', '')
VOLCENGINE_ACCESS_TOKEN = os.getenv('VOLCENGINE_ACCESS_TOKEN', '') or os.getenv('COZE_VOLCENGINE_ACCESS_TOKEN', '')
VOLCENGINE_API_KEY = os.getenv('VOLCENGINE_API_KEY', '') or os.getenv('COZE_VOLCENGINE_API_KEY', '')

# Supabase配置
SUPABASE_URL = os.getenv('SUPABASE_URL', '') or os.getenv('COZE_SUPABASE_URL', '')
SUPABASE_KEY = os.getenv('SUPABASE_KEY', '') or os.getenv('COZE_SUPABASE_ANON_KEY', '')

# 初始化FastAPI应用
app = FastAPI(title="AI情绪日记 & 心理状态智能陪伴系统", version="1.0.0")

# CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JWT认证
security = HTTPBearer()

# Supabase客户端
supabase: Optional[Client] = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


# ========== 数据模型 ==========

class UserRegister(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    nickname: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str


class DiaryCreate(BaseModel):
    content: str
    mood: Optional[str] = None
    tags: Optional[List[str]] = None
    title: Optional[str] = None


class ChatMessage(BaseModel):
    message: str
    diaryId: Optional[str] = None


class TextInput(BaseModel):
    text: str


# ========== 辅助函数 ==========

def get_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """从JWT Token中获取用户ID"""
    try:
        import jwt
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload.get('userId')
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")


def generate_token(user_id: str) -> str:
    """生成JWT Token"""
    import jwt
    return jwt.encode({'userId': user_id}, JWT_SECRET, algorithm='HS256')


def hash_password(password: str) -> str:
    """哈希密码"""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    """验证密码"""
    return hashlib.sha256(password.encode()).hexdigest() == hashed


# ========== 火山引擎RealtimeAPI二进制协议实现 ==========

class VolcengineProtocol:
    """火山引擎实时语音API二进制协议"""

    # 协议常量
    PROTOCOL_VERSION = 0b0001

    # Message Type
    CLIENT_FULL_REQUEST = 0b0001
    CLIENT_AUDIO_ONLY_REQUEST = 0b0010
    SERVER_FULL_RESPONSE = 0b1001
    SERVER_ACK = 0b1011
    SERVER_ERROR_RESPONSE = 0b1111

    # Message Type Specific Flags
    NO_SEQUENCE = 0b0000
    POS_SEQUENCE = 0b0001
    NEG_SEQUENCE = 0b0010
    NEG_SEQUENCE_1 = 0b0011
    MSG_WITH_EVENT = 0b0100

    # Message Serialization
    NO_SERIALIZATION = 0b0000
    JSON_SERIALIZATION = 0b0001
    THRIFT = 0b0011
    CUSTOM_TYPE = 0b1111

    # Message Compression
    NO_COMPRESSION = 0b0000
    GZIP = 0b0001
    CUSTOM_COMPRESSION = 0b1111

    # 事件ID
    StartConnection = 1
    StartSession = 100
    FinishSession = 102
    TaskRequest = 200
    SayHello = 300
    EndASR = 400
    ChatTTSText = 500
    ChatTextQuery = 501
    ChatRAGText = 502
    UpdateConfig = 201
    ConnectionStarted = 50
    ConnectionFailed = 51
    SessionStarted = 150
    SessionFailed = 153
    UsageResponse = 154
    TTSResponse = 352
    ASRInfo = 450
    ASRResponse = 451
    ASREnded = 459
    ChatResponse = 550
    ChatEnded = 559
    DialogCommonError = 599

    @staticmethod
    def generate_header(
        message_type: int = CLIENT_FULL_REQUEST,
        message_type_specific_flags: int = MSG_WITH_EVENT,
        serial_method: int = JSON_SERIALIZATION,
        compression_type: int = GZIP,
        extension_header: bytes = b''
    ) -> bytes:
        """构建二进制header"""
        header_size = (len(extension_header) // 4) + 1
        header = bytearray(4 + len(extension_header))

        # byte0: protocol version + header size
        header[0] = (VolcengineProtocol.PROTOCOL_VERSION << 4) | header_size

        # byte1: message type + flags
        header[1] = (message_type << 4) | message_type_specific_flags

        # byte2: serialization + compression
        header[2] = (serial_method << 4) | compression_type

        # byte3: reserved
        header[3] = 0x00

        # extension header
        if extension_header:
            header[4:] = extension_header

        return bytes(header)

    @staticmethod
    def build_start_connection_frame() -> bytes:
        """构建StartConnection帧"""
        use_compression = False

        header = VolcengineProtocol.generate_header(
            message_type=VolcengineProtocol.CLIENT_FULL_REQUEST,
            message_type_specific_flags=VolcengineProtocol.MSG_WITH_EVENT,
            serial_method=VolcengineProtocol.JSON_SERIALIZATION,
            compression_type=VolcengineProtocol.GZIP if use_compression else VolcengineProtocol.NO_COMPRESSION
        )

        # event id
        event_id = VolcengineProtocol.StartConnection
        event_bytes = struct.pack('>I', event_id)

        # payload
        payload = json.dumps({}).encode('utf-8')
        if use_compression:
            payload = zlib.compress(payload)

        # payload size
        payload_size_bytes = struct.pack('>I', len(payload))

        return header + event_bytes + payload_size_bytes + payload

    @staticmethod
    def build_start_session_frame(session_id: str, dialog_config: Dict[str, Any]) -> bytes:
        """构建StartSession帧"""
        use_compression = False

        header = VolcengineProtocol.generate_header(
            message_type=VolcengineProtocol.CLIENT_FULL_REQUEST,
            message_type_specific_flags=VolcengineProtocol.MSG_WITH_EVENT,
            serial_method=VolcengineProtocol.JSON_SERIALIZATION,
            compression_type=VolcengineProtocol.GZIP if use_compression else VolcengineProtocol.NO_COMPRESSION
        )

        # event id
        event_id = VolcengineProtocol.StartSession
        event_bytes = struct.pack('>I', event_id)

        # session id
        session_id_bytes = session_id.encode('utf-8')
        session_id_size_bytes = struct.pack('>I', len(session_id_bytes))

        # payload
        payload = json.dumps({"dialog": dialog_config}).encode('utf-8')
        if use_compression:
            payload = zlib.compress(payload)

        # payload size
        payload_size_bytes = struct.pack('>I', len(payload))

        return header + event_bytes + session_id_size_bytes + session_id_bytes + payload_size_bytes + payload

    @staticmethod
    def build_chat_text_query_frame(session_id: str, text: str) -> bytes:
        """构建ChatTextQuery帧（文本输入）"""
        use_compression = False

        header = VolcengineProtocol.generate_header(
            message_type=VolcengineProtocol.CLIENT_FULL_REQUEST,
            message_type_specific_flags=VolcengineProtocol.MSG_WITH_EVENT,
            serial_method=VolcengineProtocol.JSON_SERIALIZATION,
            compression_type=VolcengineProtocol.GZIP if use_compression else VolcengineProtocol.NO_COMPRESSION
        )

        # event id
        event_id = VolcengineProtocol.ChatTextQuery
        event_bytes = struct.pack('>I', event_id)

        # payload
        payload = json.dumps({"content": text}).encode('utf-8')
        if use_compression:
            payload = zlib.compress(payload)

        # session id
        session_id_bytes = session_id.encode('utf-8')
        session_id_size_bytes = struct.pack('>I', len(session_id_bytes))

        # payload size
        payload_size_bytes = struct.pack('>I', len(payload))

        return header + event_bytes + session_id_size_bytes + session_id_bytes + payload_size_bytes + payload

    @staticmethod
    def build_task_request_frame(session_id: str, audio_data: bytes) -> bytes:
        """构建TaskRequest帧（音频上传）"""
        use_compression = False

        header = VolcengineProtocol.generate_header(
            message_type=VolcengineProtocol.CLIENT_AUDIO_ONLY_REQUEST,
            message_type_specific_flags=VolcengineProtocol.MSG_WITH_EVENT,
            serial_method=VolcengineProtocol.NO_SERIALIZATION,
            compression_type=VolcengineProtocol.GZIP if use_compression else VolcengineProtocol.NO_COMPRESSION
        )

        # event id
        event_id = VolcengineProtocol.TaskRequest
        event_bytes = struct.pack('>I', event_id)

        # session id
        session_id_bytes = session_id.encode('utf-8')
        session_id_size_bytes = struct.pack('>I', len(session_id_bytes))

        # payload
        payload = audio_data
        if use_compression:
            payload = zlib.compress(payload)

        # payload size
        payload_size_bytes = struct.pack('>I', len(payload))

        return header + event_bytes + session_id_size_bytes + session_id_bytes + payload_size_bytes + payload

    @staticmethod
    def build_finish_session_frame(session_id: str) -> bytes:
        """构建FinishSession帧"""
        use_compression = False

        header = VolcengineProtocol.generate_header(
            message_type=VolcengineProtocol.CLIENT_FULL_REQUEST,
            message_type_specific_flags=VolcengineProtocol.MSG_WITH_EVENT,
            serial_method=VolcengineProtocol.JSON_SERIALIZATION,
            compression_type=VolcengineProtocol.GZIP if use_compression else VolcengineProtocol.NO_COMPRESSION
        )

        # event id
        event_id = VolcengineProtocol.FinishSession
        event_bytes = struct.pack('>I', event_id)

        # payload
        payload = json.dumps({}).encode('utf-8')
        if use_compression:
            payload = zlib.compress(payload)

        # session id
        session_id_bytes = session_id.encode('utf-8')
        session_id_size_bytes = struct.pack('>I', len(session_id_bytes))

        # payload size
        payload_size_bytes = struct.pack('>I', len(payload))

        return header + event_bytes + session_id_size_bytes + session_id_bytes + payload_size_bytes + payload

    @staticmethod
    def parse_binary_frame(data: bytes) -> Optional[Dict[str, Any]]:
        """解析二进制帧"""
        try:
            # byte0: protocol + header size
            header_size_words = data[0] & 0x0F
            header_size_bytes = header_size_words * 4

            # byte1: message type + flags
            message_type = (data[1] >> 4) & 0x0F
            flags = data[1] & 0x0F

            # byte2: serialization + compression
            serialization_method = (data[2] >> 4) & 0x0F
            compression_type = data[2] & 0x0F

            # payload starts after header
            payload = data[header_size_bytes:]
            event_id = None

            # parse event id if present
            if flags & VolcengineProtocol.MSG_WITH_EVENT:
                if len(payload) < 4:
                    return None
                event_id = struct.unpack('>I', payload[0:4])[0]
                payload = payload[4:]

            # parse session id and payload for server responses
            if message_type in [VolcengineProtocol.SERVER_FULL_RESPONSE, VolcengineProtocol.SERVER_ACK]:
                if len(payload) < 4:
                    return None
                session_id_size = struct.unpack('>I', payload[0:4])[0]
                payload = payload[4:]

                if len(payload) < session_id_size:
                    return None
                session_id = payload[0:session_id_size].decode('utf-8')
                payload = payload[session_id_size:]

                if len(payload) < 4:
                    return None
                payload_size = struct.unpack('>I', payload[0:4])[0]
                payload = payload[4:]

                if len(payload) < payload_size:
                    return None
                payload = payload[0:payload_size]

                # decompress if needed
                if compression_type == VolcengineProtocol.GZIP:
                    payload = zlib.decompress(payload)

                return {
                    "messageType": message_type,
                    "flags": flags,
                    "eventId": event_id,
                    "sessionId": session_id,
                    "payload": payload
                }

            elif message_type == VolcengineProtocol.SERVER_ERROR_RESPONSE:
                # error frame: code + payload_size + payload
                if len(payload) < 8:
                    return None
                error_code = struct.unpack('>I', payload[0:4])[0]
                payload = payload[4:]

                payload_size = struct.unpack('>I', payload[0:4])[0]
                payload = payload[4:]

                if len(payload) < payload_size:
                    return None
                payload = payload[0:payload_size]

                # decompress if needed
                if compression_type == VolcengineProtocol.GZIP:
                    payload = zlib.decompress(payload)

                return {
                    "messageType": message_type,
                    "flags": flags,
                    "eventId": event_id,
                    "errorCode": error_code,
                    "payload": payload
                }

            return {
                "messageType": message_type,
                "flags": flags,
                "eventId": event_id,
                "payload": payload
            }

        except Exception as e:
            print(f"Failed to parse binary frame: {e}")
            return None


# ========== LLM API调用 ==========

async def call_llm_stream(messages: List[Dict[str, str]], on_chunk: callable):
    """流式调用LLM"""
    if not ARK_API_KEY:
        # fallback response
        fallback = "抱歉，AI功能暂时不可用。请先配置豆包ARK API Key。"
        for char in fallback:
            on_chunk(char)
            await asyncio.sleep(0.03)
        return

    try:
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {ARK_API_KEY}'
        }

        payload = {
            'model': ARK_CHAT_MODEL,
            'messages': messages,
            'temperature': 0.8,
            'stream': True
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream('POST', f'{ARK_BASE_URL}/chat/completions', headers=headers, json=payload) as response:
                if response.status_code != 200:
                    raise Exception(f"ARK API error: {response.status_code}")

                async for line in response.aiter_lines():
                    if line.startswith('data: '):
                        data = line[6:]
                        if data == '[DONE]':
                            continue
                        try:
                            json_data = json.loads(data)
                            if json_data.get('choices') and json_data['choices'][0].get('delta', {}).get('content'):
                                on_chunk(json_data['choices'][0]['delta']['content'])
                        except:
                            pass
    except Exception as e:
        print(f"Error calling LLM: {e}")
        fallback = "抱歉，AI服务暂时不可用。请稍后再试。"
        for char in fallback:
            on_chunk(char)
            await asyncio.sleep(0.03)


# ========== FastAPI路由 ==========

@app.get('/api/v1/health')
async def health_check():
    """健康检查"""
    return {"status": "ok"}


@app.post('/api/v1/auth/register')
async def register(user: UserRegister):
    """用户注册"""
    # 参数校验
    if len(user.username) < 3 or len(user.username) > 20:
        raise HTTPException(status_code=400, detail="Username must be 3-20 characters")

    if len(user.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    # 检查用户名是否存在
    existing = supabase.table('users').select('*').eq('username', user.username).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Username already exists")

    # 创建用户
    password_hash = hash_password(user.password)
    new_user = supabase.table('users').insert({
        'username': user.username,
        'password_hash': password_hash,
        'email': user.email,
        'nickname': user.nickname or user.username,
        'cloud_sync_enabled': False
    }).select('id, username, email, nickname, created_at').execute()

    # 生成JWT Token
    token = generate_token(new_user.data[0]['id'])

    return {
        "user": new_user.data[0],
        "token": token
    }


@app.post('/api/v1/auth/login')
async def login(user: UserLogin):
    """用户登录"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    # 查找用户
    result = supabase.table('users').select('*').eq('username', user.username).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    user_data = result.data[0]

    # 验证密码
    if not verify_password(user.password, user_data['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # 生成JWT Token
    token = generate_token(user_data['id'])

    return {
        "user": {
            "id": user_data['id'],
            "username": user_data['username'],
            "email": user_data.get('email'),
            "nickname": user_data.get('nickname'),
            "avatar": user_data.get('avatar'),
            "cloud_sync_enabled": user_data.get('cloud_sync_enabled'),
            "created_at": user_data['created_at']
        },
        "token": token
    }


@app.get('/api/v1/auth/me')
async def get_current_user(user_id: str = Depends(get_user_id)):
    """获取当前用户信息"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    result = supabase.table('users').select('id, username, email, nickname, avatar, cloud_sync_enabled, created_at').eq('id', user_id).single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")

    return {"user": result.data}


@app.post('/api/v1/diaries')
async def create_diary(diary: DiaryCreate, user_id: str = Depends(get_user_id)):
    """创建日记"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    insert_data = {"content": diary.content, "user_id": user_id}

    if diary.title:
        insert_data["title"] = diary.title
    if diary.mood:
        insert_data["mood"] = diary.mood
    if diary.tags:
        insert_data["tags"] = diary.tags

    result = supabase.table('diaries').insert(insert_data).select().single().execute()

    # TODO: 异步进行情绪分析

    return result.data


@app.get('/api/v1/diaries')
async def get_diaries(user_id: str = Depends(get_user_id)):
    """获取日记列表"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    result = supabase.table('diaries').select('*').eq('user_id', user_id).order('created_at', desc=True).limit(50).execute()

    return result.data or []


@app.delete('/api/v1/diaries/{diary_id}')
async def delete_diary(diary_id: str, user_id: str = Depends(get_user_id)):
    """删除日记"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    supabase.table('diaries').delete().eq('id', diary_id).eq('user_id', user_id).execute()

    return {"success": True}


@app.post('/api/v1/chat')
async def chat_stream(chat: ChatMessage, user_id: str = Depends(get_user_id)):
    """AI对话（流式响应）"""

    async def generate():
        full_response = ""

        async def on_chunk(chunk: str):
            nonlocal full_response
            full_response += chunk
            yield f"data: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"

        # 构建对话历史
        messages = []

        if chat.diaryId:
            # 获取关联的日记
            if supabase:
                diary_result = supabase.table('diaries').select('content').eq('id', chat.diaryId).maybe_single().execute()
                if diary_result.data:
                    messages.append({
                        "role": "system",
                        "content": f"你是一位温暖、专业的心理陪伴助手。用户刚刚写了一篇日记，内容如下：\n\n{diary_result.data['content']}\n\n请以共情的方式回应用户，帮助他们理解自己的情绪。"
                    })

        # 获取最近对话历史
        if supabase:
            conv_result = supabase.table('conversations').select('user_message, ai_message').order('created_at', desc=True).limit(5).execute()
            if conv_result.data:
                for conv in reversed(conv_result.data):
                    messages.append({"role": "user", "content": conv['user_message']})
                    messages.append({"role": "assistant", "content": conv['ai_message']})

        if not messages or messages[0]['role'] != 'system':
            messages.insert(0, {
                "role": "system",
                "content": "你是一位温暖、专业的心理陪伴助手。请以共情的方式倾听用户的情绪，帮助他们理解和表达自己的感受。"
            })

        messages.append({"role": "user", "content": chat.message})

        # 流式调用LLM
        await call_llm_stream(messages, on_chunk)

        yield "data: [DONE]\n\n"

        # 保存对话记录
        if supabase:
            supabase.table('conversations').insert({
                'user_id': user_id,
                'user_message': chat.message,
                'ai_message': full_response,
                'related_diary_id': chat.diaryId
            }).execute()

    return StreamingResponse(generate(), media_type="text/event-stream; charset=utf-8")


@app.get('/api/v1/conversations')
async def get_conversations(user_id: str = Depends(get_user_id)):
    """获取对话列表"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    result = supabase.table('conversations').select('*').eq('user_id', user_id).order('created_at', desc=True).limit(100).execute()

    return result.data or []


# ========== WebSocket实时语音对话 ==========

@app.websocket('/api/v1/voice/realtime')
async def websocket_voice_realtime(websocket: WebSocket):
    """WebSocket实时语音对话"""
    await websocket.accept()

    volc_ws: Optional[websockets.WebSocketClientProtocol] = None
    session_id = str(uuid.uuid4())

    try:
        # 连接到豆包实时语音API
        if not VOLCENGINE_SPEECH_APP_ID:
            await websocket.send_json({
                "type": "error",
                "message": "豆包语音API配置缺失，请在环境变量中配置VOLCENGINE_SPEECH_APP_ID"
            })
            return

        access_token = VOLCENGINE_ACCESS_TOKEN
        if not access_token:
            # TODO: 使用Secret Key获取Access Token
            pass

        # 连接到豆包API
        volc_ws = await websockets.connect(
            'wss://openspeech.bytedance.com/api/v3/realtime/dialogue',
            extra_headers={
                'X-Api-App-ID': VOLCENGINE_SPEECH_APP_ID,
                'X-Api-Access-Key': access_token,
                'X-Api-Resource-Id': 'volc.speech.dialog',
                'X-Api-App-Key': 'PlgvMymc7f3tQnJ6',
            }
        )

        print(f"✅ Connected to Volcengine API, session_id: {session_id}")

        # 发送StartConnection
        start_connection_frame = VolcengineProtocol.build_start_connection_frame()
        await volc_ws.send(start_connection_frame)
        print("✅ StartConnection sent")

        # 监听豆包API响应
        async def listen_volcengine():
            try:
                while True:
                    data = await volc_ws.recv()
                    if isinstance(data, bytes):
                        frame = VolcengineProtocol.parse_binary_frame(data)
                        if frame:
                            await handle_volcengine_frame(websocket, frame)
            except websockets.exceptions.ConnectionClosed:
                print("Volcengine connection closed")
            except Exception as e:
                print(f"Error listening to Volcengine: {e}")

        # 启动监听任务
        listen_task = asyncio.create_task(listen_volcengine())

        # 监听客户端消息
        async def listen_client():
            try:
                while True:
                    data = await websocket.receive()
                    if 'text' in data:
                        message = json.loads(data['text'])
                        await handle_client_message(websocket, volc_ws, session_id, message)
                    elif 'bytes' in data:
                        # 音频数据
                        audio_frame = VolcengineProtocol.build_task_request_frame(session_id, data['bytes'])
                        await volc_ws.send(audio_frame)
            except WebSocketDisconnect:
                print("Client disconnected")
            except Exception as e:
                print(f"Error listening to client: {e}")

        # 启动监听任务
        listen_client_task = asyncio.create_task(listen_client())

        # 等待任一任务完成
        await asyncio.wait([listen_task, listen_client_task], return_when=asyncio.FIRST_COMPLETED)

    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.send_json({
            "type": "error",
            "message": str(e)
        })
    finally:
        # 关闭连接
        if volc_ws:
            try:
                finish_frame = VolcengineProtocol.build_finish_session_frame(session_id)
                await volc_ws.send(finish_frame)
                await volc_ws.close()
            except:
                pass
        await websocket.close()


async def handle_volcengine_frame(websocket: WebSocket, frame: Dict[str, Any]):
    """处理豆包API返回的帧"""
    event_id = frame.get('eventId')
    payload = frame.get('payload', b'')

    try:
        if event_id == VolcengineProtocol.ConnectionStarted:
            print("✅ ConnectionStarted")
            # 发送StartSession
            dialog_config = {
                "asr": {
                    "extra": {
                        "end_smooth_window_ms": 1500,
                    },
                },
                "tts": {
                    "speaker": "zh_female_yunxia_moon_bigtts",
                    "audio_config": {
                        "channel": 1,
                        "format": "pcm",
                        "sample_rate": 24000,
                    },
                },
                "dialog": {
                    "model": "1.2.1.1",
                    "bot_name": "豆包",
                    "system_role": "你是一个温暖、友好的心理陪伴助手",
                    "speaking_style": "温柔、耐心",
                    "extra": {
                        "strict_audit": False,
                        "audit_response": "",
                        "input_mod": "text",  # 纯文本输入模式
                        "enable_conversation_truncate": False,
                        "enable_loudness_norm": False,
                    },
                },
            }

            # 获取session_id
            session_id = frame.get('sessionId', str(uuid.uuid4()))

            start_session_frame = VolcengineProtocol.build_start_session_frame(session_id, dialog_config)
            await websocket._send_websocket_message(start_session_frame)  # 发送到豆包
            print("✅ StartSession sent")

            # 通知客户端
            await websocket.send_json({
                "type": "connection_ready",
                "sessionId": session_id
            })

        elif event_id == VolcengineProtocol.SessionStarted:
            print("✅ SessionStarted")
            session_info = json.loads(payload.decode('utf-8'))
            await websocket.send_json({
                "type": "session_ready",
                "sessionId": session_info.get('dialog_id')
            })

        elif event_id == VolcengineProtocol.ChatResponse:
            # AI回复文本
            chat_response = json.loads(payload.decode('utf-8'))
            await websocket.send_json({
                "type": "chat_response",
                "data": chat_response
            })

        elif event_id == VolcengineProtocol.TTSResponse:
            # 音频数据
            await websocket.send_json({
                "type": "tts_audio",
                "data": payload.hex()  # 发送hex字符串，避免base64编码问题
            })

        elif event_id == VolcengineProtocol.ChatEnded:
            # 聊天结束
            chat_ended = json.loads(payload.decode('utf-8'))
            await websocket.send_json({
                "type": "chat_ended",
                "data": chat_ended
            })

        elif frame.get('messageType') == VolcengineProtocol.SERVER_ERROR_RESPONSE:
            # 错误帧
            error_info = json.loads(payload.decode('utf-8'))
            await websocket.send_json({
                "type": "error",
                "message": f"豆包API错误: {error_info.get('error', '未知错误')}",
                "details": error_info
            })

    except Exception as e:
        print(f"Error handling Volcengine frame: {e}")


async def handle_client_message(websocket: WebSocket, volc_ws: websockets.WebSocketClientProtocol, session_id: str, message: Dict[str, Any]):
    """处理客户端消息"""
    msg_type = message.get('type')

    if msg_type == 'text_input':
        # 文本输入
        text = message.get('text')
        if text and volc_ws:
            chat_text_query_frame = VolcengineProtocol.build_chat_text_query_frame(session_id, text)
            await volc_ws.send(chat_text_query_frame)
            print(f"✅ ChatTextQuery sent: {text}")

    elif msg_type == 'end_session':
        # 结束会话
        if volc_ws:
            finish_frame = VolcengineProtocol.build_finish_session_frame(session_id)
            await volc_ws.send(finish_frame)
            print("✅ FinishSession sent")


# ========== 主程序 ==========

if __name__ == '__main__':
    print("🚀 Starting Python backend server...")
    print(f"📦 Port: {os.getenv('PORT', 9091)}")
    print(f"🔗 ARK API Key: {'✅ Configured' if ARK_API_KEY else '❌ Not configured'}")
    print(f"🎤 Volcengine APP ID: {'✅ Configured' if VOLCENGINE_SPEECH_APP_ID else '❌ Not configured'}")
    print(f"🗄️  Supabase: {'✅ Configured' if supabase else '❌ Not configured'}")

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv('PORT', 9091)))
