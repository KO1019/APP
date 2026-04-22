#!/usr/bin/env python3
"""
AI情绪日记 & 心理状态智能陪伴系统 - Python后端服务
使用FastAPI + WebSocket + 火山引擎RealtimeAPI（官方Python示例）
"""

import os
import uuid
import hashlib
import asyncio
import json
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import httpx
from supabase import create_client, Client
from dotenv import load_dotenv

# 加载.env文件（使用绝对路径）
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path)

# 环境变量配置
JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key-change-in-production')

# 豆包ARK API配置（语言模型）
ARK_BASE_URL = os.getenv('ARK_BASE_URL', 'https://ark.cn-beijing.volces.com/api/v3')
ARK_API_KEY = os.getenv('ARK_API_KEY', '')
ARK_CHAT_MODEL = os.getenv('ARK_CHAT_MODEL', 'ep-20250212215003-7j9f8')

# 豆包语音API配置（从.env文件读取）
VOLCENGINE_SPEECH_APP_ID = os.getenv('VOLCENGINE_SPEECH_APP_ID', '')
VOLCENGINE_SPEECH_SECRET_KEY = os.getenv('VOLCENGINE_SPEECH_SECRET_KEY', '')
VOLCENGINE_ACCESS_TOKEN = os.getenv('VOLCENGINE_ACCESS_TOKEN', '')
VOLCENGINE_API_KEY = os.getenv('VOLCENGINE_API_KEY', '')

# Supabase配置（从环境变量读取）
SUPABASE_URL = os.getenv('SUPABASE_URL', '')
SUPABASE_KEY = os.getenv('SUPABASE_KEY', '')

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


# ========== 导入实时语音客户端 ==========
import config
import protocol
from realtime_dialog_client import RealtimeDialogClient


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


class ChangePassword(BaseModel):
    """修改密码"""
    old_password: str
    new_password: str


class PrivacySettings(BaseModel):
    """隐私设置"""
    cloud_sync_enabled: bool
    data_encryption_enabled: bool
    anonymous_analytics: bool


class UpdateProfile(BaseModel):
    """更新用户资料"""
    nickname: Optional[str] = None
    email: Optional[str] = None
    avatar: Optional[str] = None


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
        raise HTTPException(status_code=400, detail="用户名长度必须在3-20个字符之间")

    if len(user.password) < 6:
        raise HTTPException(status_code=400, detail="密码长度至少6个字符")

    if not supabase:
        raise HTTPException(
            status_code=503,
            detail="数据库未配置，请在.env文件中配置SUPABASE_URL和SUPABASE_KEY"
        )

    # 检查用户名是否存在
    existing = supabase.table('users').select('*').eq('username', user.username).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="用户名已存在")

    # 创建用户
    password_hash = hash_password(user.password)
    new_user = supabase.table('users').insert({
        'username': user.username,
        'password_hash': password_hash,
        'email': user.email,
        'nickname': user.nickname or user.username,
        'cloud_sync_enabled': False
    }).execute()

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
        raise HTTPException(
            status_code=503,
            detail="数据库未配置，请在.env文件中配置SUPABASE_URL和SUPABASE_KEY"
        )

    # 查找用户
    result = supabase.table('users').select('*').eq('username', user.username).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    user_data = result.data[0]

    # 验证密码
    if not verify_password(user.password, user_data['password_hash']):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

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

    result = supabase.table('users').select('id, username, email, nickname, avatar, cloud_sync_enabled, data_encryption_enabled, anonymous_analytics, created_at').eq('id', user_id).single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")

    return {"user": result.data}


@app.post('/api/v1/auth/change-password')
async def change_password(data: ChangePassword, user_id: str = Depends(get_user_id)):
    """修改密码"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    # 参数校验
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="新密码长度至少6个字符")

    # 获取用户信息
    result = supabase.table('users').select('id, password_hash').eq('id', user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="用户不存在")

    user_data = result.data[0]

    # 验证旧密码
    if not verify_password(data.old_password, user_data['password_hash']):
        raise HTTPException(status_code=401, detail="旧密码错误")

    # 更新密码
    new_password_hash = hash_password(data.new_password)
    supabase.table('users').update({'password_hash': new_password_hash}).eq('id', user_id).execute()

    return {"message": "密码修改成功"}


@app.post('/api/v1/auth/privacy-settings')
async def update_privacy_settings(settings: PrivacySettings, user_id: str = Depends(get_user_id)):
    """更新隐私设置"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    # 更新隐私设置
    supabase.table('users').update({
        'cloud_sync_enabled': settings.cloud_sync_enabled,
        'data_encryption_enabled': settings.data_encryption_enabled,
        'anonymous_analytics': settings.anonymous_analytics
    }).eq('id', user_id).execute()

    return {"message": "隐私设置更新成功"}


@app.get('/api/v1/auth/privacy-settings')
async def get_privacy_settings(user_id: str = Depends(get_user_id)):
    """获取隐私设置"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    result = supabase.table('users').select('cloud_sync_enabled, data_encryption_enabled, anonymous_analytics').eq('id', user_id).single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="用户不存在")

    return {"settings": result.data}


@app.post('/api/v1/auth/profile')
async def update_profile(profile: UpdateProfile, user_id: str = Depends(get_user_id)):
    """更新用户资料"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    # 构建更新数据
    update_data = {}
    if profile.nickname is not None:
        update_data['nickname'] = profile.nickname
    if profile.email is not None:
        update_data['email'] = profile.email
    if profile.avatar is not None:
        update_data['avatar'] = profile.avatar

    # 更新用户资料
    if update_data:
        supabase.table('users').update(update_data).eq('id', user_id).execute()

    return {"message": "资料更新成功"}


@app.get('/api/v1/app/about')
async def get_about_info():
    """获取关于信息"""
    return {
        "app_name": "情绪日记",
        "version": "1.0.0",
        "description": "用心记录，温暖陪伴",
        "features": [
            "情绪日记记录",
            "AI智能陪伴",
            "心理健康建议",
            "数据加密保护"
        ],
        "privacy_policy": "我们重视您的隐私，所有数据均经过加密处理，您可以随时删除自己的数据。",
        "contact": "support@example.com"
    }


class VersionCheckRequest(BaseModel):
    """版本检查请求"""
    platform: str  # android 或 ios
    current_version: str
    build_number: Optional[int] = None


@app.post('/api/v1/app/check-update')
async def check_update(request: VersionCheckRequest):
    """
    检查APP更新
    返回是否有新版本、版本号、更新说明、下载链接等
    """
    if not supabase:
        # 没有配置数据库，返回无更新
        return {
            "has_update": False,
            "current_version": request.current_version,
            "latest_version": request.current_version,
            "force_update": False,
            "update_url": "",
            "release_notes": "",
            "release_date": ""
        }

    try:
        # 获取当前平台的激活版本
        result = supabase.table('app_versions').select('*').eq('platform', request.platform.lower()).eq('is_active', True).execute()
    except Exception as e:
        # 表不存在或其他错误，返回无更新
        print(f"Error checking updates: {e}")
        return {
            "has_update": False,
            "current_version": request.current_version,
            "latest_version": request.current_version,
            "force_update": False,
            "update_url": "",
            "release_notes": "",
            "release_date": ""
        }

    if not result.data:
        # 没有激活的版本，返回无更新
        return {
            "has_update": False,
            "current_version": request.current_version,
            "latest_version": request.current_version,
            "force_update": False,
            "update_url": "",
            "release_notes": "",
            "release_date": ""
        }

    latest_version = result.data[0]

    # 简单的版本比较逻辑（假设版本格式为 major.minor.patch）
    def version_to_tuple(version_str):
        parts = version_str.split('.')
        return tuple(int(part) for part in parts if part.isdigit())

    current_tuple = version_to_tuple(request.current_version)
    latest_tuple = version_to_tuple(latest_version["version"])

    has_update = latest_tuple > current_tuple

    # 如果构建号也提供了，也比较构建号
    if request.build_number is not None:
        if latest_version["build_number"] > request.build_number:
            has_update = True
        elif latest_version["build_number"] <= request.build_number:
            has_update = False

    return {
        "has_update": has_update,
        "current_version": request.current_version,
        "latest_version": latest_version["version"],
        "force_update": latest_version["force_update"],
        "update_url": latest_version.get("update_url", ""),
        "release_notes": latest_version["release_notes"],
        "release_date": latest_version["release_date"].isoformat() if latest_version["release_date"] else ""
    }


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

    result = supabase.table('diaries').insert(insert_data).execute()

    # TODO: 异步进行情绪分析

    return result.data[0] if result.data else None


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


class GenerateDiaryFromChat(BaseModel):
    """从聊天记录生成日记"""
    conversation_text: str
    conversation_id: Optional[str] = None


@app.post('/api/v1/diaries/generate-from-chat')
async def generate_diary_from_chat(data: GenerateDiaryFromChat, user_id: str = Depends(get_user_id)):
    """从聊天记录生成日记"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    try:
        from coze_coding_dev_sdk import LLMClient
        from coze_coding_utils.runtime_ctx.context import Context, new_context
        from langchain_core.messages import SystemMessage, HumanMessage
        import json

        ctx = new_context(method="invoke")
        client = LLMClient(ctx=ctx)

        # 构建prompt
        system_prompt = """你是一位专业的日记助手。请根据用户和AI的对话记录，生成一篇结构化的日记。

日记格式要求：
1. **标题**：简洁概括对话的主题或核心内容（不超过20字）
2. **日期**：今天的日期
3. **心情**：根据对话内容判断用户的主要情绪（只能选择：开心、兴奋、平静、中性、焦虑、悲伤、愤怒、疲惫）
4. **内容**：将对话内容整理成流畅的日记，第一人称叙述，保持对话的精髓和情感
5. **标签**：根据对话内容提取3-5个关键词标签

返回格式（JSON）：
{
  "title": "标题",
  "mood": "心情",
  "content": "日记内容",
  "tags": ["标签1", "标签2", "标签3"]
}

注意：
- 日记内容要自然流畅，不要简单复制对话
- 保持情感的真实性
- 标签要与内容相关
- 只返回JSON，不要有其他文字"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"以下是对话记录：\n\n{data.conversation_text}\n\n请根据这段对话生成日记。")
        ]

        # 调用LLM生成日记
        response = client.invoke(messages=messages, temperature=0.7, thinking="disabled")

        # 提取响应内容
        def get_text_content(content):
            if isinstance(content, str):
                return content
            elif isinstance(content, list):
                if content and isinstance(content[0], str):
                    return " ".join(content)
                else:
                    return " ".join(item.get("text", "") for item in content if isinstance(item, dict) and item.get("type") == "text")
            return str(content)

        diary_json_str = get_text_content(response.content)

        # 解析JSON
        # 尝试从响应中提取JSON部分
        json_start = diary_json_str.find('{')
        json_end = diary_json_str.rfind('}') + 1

        if json_start == -1 or json_end == 0:
            raise HTTPException(status_code=500, detail="AI生成的日记格式错误")

        diary_json_str = diary_json_str[json_start:json_end]

        diary_data = json.loads(diary_json_str)

        # 验证字段
        if not all(key in diary_data for key in ['title', 'mood', 'content']):
            raise HTTPException(status_code=500, detail="AI生成的日记缺少必要字段")

        # 保存日记到数据库
        insert_data = {
            "user_id": user_id,
            "title": diary_data.get('title', ''),
            "content": diary_data.get('content', ''),
            "mood": diary_data.get('mood', '中性'),
            "tags": diary_data.get('tags', [])
        }

        result = supabase.table('diaries').insert(insert_data).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="保存日记失败")

        diary = result.data[0]

        return {
            "success": True,
            "diary": diary,
            "message": "日记生成成功"
        }

    except json.JSONDecodeError as e:
        print(f"Error parsing AI response: {e}")
        print(f"Response content: {diary_json_str if 'diary_json_str' in locals() else 'N/A'}")
        raise HTTPException(status_code=500, detail="解析AI生成的日记失败")

    except Exception as e:
        print(f"Error generating diary from chat: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"生成日记失败: {str(e)}")


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


# ========== 会话管理（用于HTTP长轮询） ==========
import asyncio
voice_sessions = {}  # session_id -> {'client': RealtimeDialogClient, 'message_queue': asyncio.Queue, 'lock': asyncio.Lock}


class SessionCreate(BaseModel):
    """创建会话请求"""
    pass


class AudioUpload(BaseModel):
    """音频上传请求"""
    session_id: str
    audio_data: str  # Base64编码的音频数据


class PollMessages(BaseModel):
    """轮询消息请求"""
    session_id: str


@app.post('/api/v1/voice/session/create')
async def create_voice_session():
    """创建语音会话（HTTP长轮询模式）"""
    session_id = str(uuid.uuid4())
    message_queue = asyncio.Queue()
    lock = asyncio.Lock()

    voice_sessions[session_id] = {
        'client': None,
        'message_queue': message_queue,
        'lock': lock,
        'created_at': asyncio.get_event_loop().time()
    }

    print(f"[HTTP] Created session: {session_id}")
    return {"session_id": session_id, "type": "session_created"}


@app.post('/api/v1/voice/session/connect')
async def connect_voice_session(request: dict):
    """连接到豆包API（HTTP长轮询模式）"""
    session_id = request.get('session_id')

    if session_id not in voice_sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    async with voice_sessions[session_id]['lock']:
        if voice_sessions[session_id]['client'] is not None:
            return {"status": "already_connected"}

        # 检查配置
        if not VOLCENGINE_SPEECH_APP_ID or not VOLCENGINE_ACCESS_TOKEN:
            raise HTTPException(status_code=500, detail="豆包语音API配置缺失")

        print(f"[HTTP] Connecting to Volcengine API, session_id: {session_id}")

        # 创建实时语音客户端
        client = RealtimeDialogClient(
            config=config.ws_connect_config,
            session_id=session_id,
            output_audio_format="pcm",
            mod=None,
            recv_timeout=120
        )

        await client.connect()
        voice_sessions[session_id]['client'] = client

        # 启动监听豆包API响应的任务
        asyncio.create_task(listen_volcengine_http(session_id, client, voice_sessions[session_id]['message_queue']))

        print(f"[HTTP] Connected to Volcengine API, session_id: {session_id}")

        return {"status": "connected", "type": "connection_ready", "session_id": session_id}


async def listen_volcengine_http(session_id: str, client: RealtimeDialogClient, message_queue: asyncio.Queue):
    """监听豆包API响应（HTTP长轮询模式）"""
    try:
        print(f"[HTTP] listen_volcengine started, session_id: {session_id}")
        while session_id in voice_sessions:
            try:
                response = await asyncio.wait_for(client.receive_server_response(), timeout=5)
                print(f"[HTTP] Received response from Volcengine, session_id: {session_id}: {response}")

                # 转换响应格式
                http_response = await convert_to_http_response(response)
                await message_queue.put(http_response)

            except asyncio.TimeoutError:
                # 超时继续等待
                continue
            except Exception as e:
                print(f"[HTTP] Error listening to Volcengine, session_id: {session_id}: {e}")
                await message_queue.put({
                    "type": "error",
                    "message": str(e)
                })
                break
    except Exception as e:
        print(f"[HTTP] listen_volcengine error, session_id: {session_id}: {e}")


async def convert_to_http_response(response: Dict[str, Any]) -> Dict[str, Any]:
    """将豆包API响应转换为HTTP响应格式 - 按照官方API事件类型"""
    result = {}
    message_type = response.get('message_type', '')
    payload_msg = response.get('payload_msg')
    event = response.get('event')

    if event == 50:  # ConnectionStarted
        result = {"type": "connection_started"}

    elif event == 150:  # SessionStarted
        result = {
            "type": "session_ready",
            "dialog_id": payload_msg.get('dialog_id') if isinstance(payload_msg, dict) else None
        }

    elif event == 152:  # SessionStopped
        result = {"type": "session_stopped"}

    elif event == 451:  # ASRResponse - 用户语音识别结果
        if isinstance(payload_msg, dict) and 'results' in payload_msg:
            results = payload_msg['results']
            for res in results:
                text = res.get('text', '')
                is_interim = res.get('is_interim', False)
                result = {
                    "type": "asr_text",
                    "data": {
                        "text": text,
                        "is_interim": is_interim,
                        "is_final": not is_interim
                    }
                }

    elif event == 459:  # ASREnded - 用户说话结束
        result = {"type": "asr_ended"}

    elif event == 550:  # ChatResponse - AI回复文本
        if isinstance(payload_msg, dict):
            content = payload_msg.get('content', '')
            result = {
                "type": "llm_response",
                "data": {
                    "content": content
                }
            }

    elif event == 559:  # ChatEnded - AI文本回复结束
        result = {"type": "chat_ended"}

    elif event == 352:  # TTSResponse - AI回复音频
        result = {"type": "tts_audio"}
        if payload_msg:
            if isinstance(payload_msg, bytes):
                result['audio_data'] = payload_msg.hex()
            elif isinstance(payload_msg, str):
                result['audio_data'] = payload_msg

    elif event == 359:  # TTSEnded - AI音频结束
        result = {"type": "tts_ended"}

    else:
        result = {"type": "unknown", "event": event, "message_type": message_type}

    return result


@app.post('/api/v1/voice/send')
async def send_to_voice_session(request: dict):
    """向语音会话发送消息（HTTP长轮询模式）"""
    session_id = request.get('session_id')
    msg_type = request.get('type')

    if session_id not in voice_sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = voice_sessions[session_id]
    client = session['client']

    if client is None:
        raise HTTPException(status_code=400, detail="Session not connected")

    try:
        if msg_type == 'text_input':
            # 文本输入
            text = request.get('text')
            if text:
                await client.chat_text_query(text)
                print(f"[HTTP] ChatTextQuery sent, session_id: {session_id}: {text}")

        elif msg_type == 'audio_input':
            # 音频输入
            audio_hex = request.get('audio_data')
            if audio_hex:
                audio_bytes = bytes.fromhex(audio_hex)
                await client.task_request(audio_bytes)
                print(f"[HTTP] Audio data sent, session_id: {session_id}, size: {len(audio_bytes)}")

        elif msg_type == 'end_session':
            # 结束会话
            try:
                await client.finish_session()
                print(f"[HTTP] FinishSession sent, session_id: {session_id}")
            except Exception as e:
                print(f"Error finishing session: {e}")

        return {"status": "sent"}

    except Exception as e:
        print(f"[HTTP] Error sending message, session_id: {session_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/api/v1/voice/poll')
async def poll_voice_messages(request: dict):
    """轮询会话消息（HTTP长轮询模式）"""
    session_id = request.get('session_id')

    if session_id not in voice_sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = voice_sessions[session_id]
    message_queue = session['message_queue']

    try:
        # 等待消息，最长30秒
        message = await asyncio.wait_for(message_queue.get(), timeout=30)
        return message
    except asyncio.TimeoutError:
        return {"type": "keep_alive"}
    except Exception as e:
        print(f"[HTTP] Error polling messages, session_id: {session_id}: {e}")
        return {"type": "error", "message": str(e)}


@app.post('/api/v1/voice/session/close')
async def close_voice_session(request: dict):
    """关闭语音会话（HTTP长轮询模式）"""
    session_id = request.get('session_id')

    if session_id not in voice_sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = voice_sessions[session_id]
    client = session['client']

    try:
        if client:
            await client.finish_session()
            await client.close()
    except Exception as e:
        print(f"Error closing client: {e}")

    del voice_sessions[session_id]
    print(f"[HTTP] Closed session: {session_id}")

    return {"status": "closed"}


# ========== WebSocket实时语音对话（使用官方Python示例） ==========

@app.websocket('/api/v1/voice/realtime')
async def websocket_voice_realtime(websocket: WebSocket):
    """WebSocket实时语音对话 - 使用火山引擎官方Python示例"""
    await websocket.accept()

    session_id = str(uuid.uuid4())
    client = None

    try:
        print(f"[WS] New WebSocket connection, session_id: {session_id}")

        # 检查配置
        if not VOLCENGINE_SPEECH_APP_ID or not VOLCENGINE_ACCESS_TOKEN:
            print(f"[WS] Error: Missing configuration")
            await websocket.send_json({
                "type": "error",
                "message": "豆包语音API配置缺失，请在.env文件中配置VOLCENGINE_SPEECH_APP_ID和VOLCENGINE_ACCESS_TOKEN"
            })
            return

        print(f"[WS] Creating RealtimeDialogClient...")
        # 创建实时语音客户端
        client = RealtimeDialogClient(
            config=config.ws_connect_config,
            session_id=session_id,
            output_audio_format="pcm",
            mod=None,  # 使用配置文件中的 input_mod 设置
            recv_timeout=120  # 超时时间120秒，与配置文件一致
        )

        print(f"[WS] Connecting to Volcengine API...")
        # 连接到豆包API
        await client.connect()
        print(f"✅ Connected to Volcengine API, session_id: {session_id}")

        # 通知客户端连接就绪
        await websocket.send_json({
            "type": "connection_ready",
            "sessionId": session_id
        })
        print(f"[WS] Sent connection_ready message")

        # 监听豆包API响应
        async def listen_volcengine():
            try:
                print(f"[WS] listen_volcengine started")
                while True:
                    response = await client.receive_server_response()
                    print(f"[WS] Received response from Volcengine: {response}")
                    await handle_volcengine_response(websocket, response)
            except asyncio.CancelledError:
                print(f"[WS] listen_volcengine cancelled")
                raise
            except Exception as e:
                print(f"[WS] Error listening to Volcengine: {e}")
                import traceback
                traceback.print_exc()
                await websocket.send_json({
                    "type": "error",
                    "message": f"监听豆包API错误: {str(e)}"
                })
                raise

        # 监听客户端消息
        async def listen_client():
            try:
                print(f"[WS] listen_client started")
                while True:
                    data = await websocket.receive()
                    print(f"[WS] Received message from client: {type(data)}")
                    if 'text' in data:
                        message = json.loads(data['text'])
                        print(f"[WS] Client message: {message}")
                        await handle_client_message(websocket, client, message)
                    elif 'bytes' in data:
                        print(f"[WS] Received audio data from client")
                        # 音频数据 - 使用TaskRequest
                        await client.task_request(data['bytes'])
            except asyncio.CancelledError:
                print(f"[WS] listen_client cancelled")
                raise
            except WebSocketDisconnect:
                print(f"[WS] Client disconnected normally")
                raise
            except Exception as e:
                print(f"[WS] Error listening to client: {e}")
                import traceback
                traceback.print_exc()
                raise

        # 启动监听任务
        listen_volcengine_task = asyncio.create_task(listen_volcengine())
        listen_client_task = asyncio.create_task(listen_client())

        print(f"[WS] Waiting for tasks...")
        # 等待任一任务完成
        await asyncio.wait([listen_volcengine_task, listen_client_task], return_when=asyncio.FIRST_COMPLETED)
        print(f"[WS] One of the tasks completed")

    except WebSocketDisconnect:
        print(f"[WS] Client disconnected (WebSocketDisconnect)")
    except Exception as e:
        print(f"[WS] WebSocket error: {e}")
        import traceback
        traceback.print_exc()
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e)
            })
        except:
            pass
    finally:
        # 关闭连接
        print(f"[WS] Closing connection, session_id: {session_id}")
        try:
            if client:
                await client.finish_session()
                await client.close()
        except Exception as e:
            print(f"[WS] Error closing client: {e}")
        print(f"[WS] Connection closed")
        await websocket.close()


async def handle_volcengine_response(websocket: WebSocket, response: Dict[str, Any]):
    """处理豆包API返回的响应 - 按照官方API事件类型"""
    try:
        message_type = response.get('message_type', '')
        payload_msg = response.get('payload_msg')
        event = response.get('event')

        # 打印响应信息
        print(f"📥 Volcengine response: event={event}, message_type={message_type}")

        # 连接相关事件
        if event == 50:  # ConnectionStarted
            print("✅ ConnectionStarted")
            await websocket.send_json({
                "type": "connection_started",
            })

        elif event == 150:  # SessionStarted
            print("✅ SessionStarted")
            await websocket.send_json({
                "type": "session_ready",
                "dialog_id": payload_msg.get('dialog_id') if isinstance(payload_msg, dict) else None
            })

        # ASR语音识别事件
        elif event == 451:  # ASRResponse - 用户语音识别结果
            if isinstance(payload_msg, dict) and 'results' in payload_msg:
                results = payload_msg['results']
                for result in results:
                    text = result.get('text', '')
                    is_interim = result.get('is_interim', False)
                    print(f"💬 ASRResponse: text={text}, is_interim={is_interim}")
                    await websocket.send_json({
                        "type": "asr_text",
                        "data": {
                            "text": text,
                            "is_interim": is_interim,
                            "is_final": not is_interim
                        }
                    })

        elif event == 459:  # ASREnded - 用户说话结束
            print("✅ ASREnded")
            await websocket.send_json({
                "type": "asr_ended",
            })

        # AI对话事件
        elif event == 550:  # ChatResponse - AI回复文本
            if isinstance(payload_msg, dict):
                content = payload_msg.get('content', '')
                print(f"💬 ChatResponse: {content}")
                await websocket.send_json({
                    "type": "llm_response",
                    "data": {
                        "content": content
                    }
                })

        elif event == 559:  # ChatEnded - AI文本回复结束
            print("✅ ChatEnded")
            await websocket.send_json({
                "type": "chat_ended",
            })

        # TTS音频事件
        elif event == 352:  # TTSResponse - AI回复音频
            if isinstance(payload_msg, bytes):
                print(f"🎵 TTSResponse: {len(payload_msg)} bytes")
                await websocket.send_json({
                    "type": "tts_audio",
                    "data": payload_msg.hex()  # 发送hex字符串
                })

        elif event == 359:  # TTSEnded - AI音频结束
            print("✅ TTSEnded")
            await websocket.send_json({
                "type": "tts_ended",
            })

        # 错误事件
        elif message_type == 'SERVER_ERROR_RESPONSE' or 'code' in response:
            error_msg = payload_msg if isinstance(payload_msg, str) else str(payload_msg)
            print(f"❌ Server Error: {response.get('code')} - {error_msg}")
            await websocket.send_json({
                "type": "error",
                "message": f"豆包API错误 [{response.get('code')}]: {error_msg}"
            })

    except Exception as e:
        print(f"Error handling Volcengine response: {e}")
        import traceback
        traceback.print_exc()


async def handle_client_message(websocket: WebSocket, client: RealtimeDialogClient, message: Dict[str, Any]):
    """处理客户端消息"""
    msg_type = message.get('type')

    if msg_type == 'text_input':
        # 文本输入 - 使用ChatTextQuery
        text = message.get('text')
        if text:
            await client.chat_text_query(text)
            print(f"✅ ChatTextQuery sent: {text}")

    elif msg_type == 'end_session':
        # 结束会话
        try:
            await client.finish_session()
            print("✅ FinishSession sent")
        except Exception as e:
            print(f"Error finishing session: {e}")


# ========== 版本管理API ==========

class CreateVersion(BaseModel):
    """创建版本"""
    version: str
    build_number: int
    platform: str  # android 或 ios
    force_update: bool = False
    release_notes: str
    update_url: Optional[str] = None


class UpdateVersion(BaseModel):
    """更新版本"""
    version: Optional[str] = None
    build_number: Optional[int] = None
    force_update: Optional[bool] = None
    release_notes: Optional[str] = None
    update_url: Optional[str] = None


@app.post('/api/v1/admin/versions')
async def create_version(version_data: CreateVersion):
    """创建新版本"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    # 检查版本号是否已存在
    existing = supabase.table('app_versions').select('*').eq('platform', version_data.platform).eq('version', version_data.version).execute()

    if existing.data:
        raise HTTPException(status_code=400, detail="该平台的此版本号已存在")

    # 创建版本
    result = supabase.table('app_versions').insert({
        "version": version_data.version,
        "build_number": version_data.build_number,
        "platform": version_data.platform,
        "force_update": version_data.force_update,
        "release_notes": version_data.release_notes,
        "update_url": version_data.update_url,
        "is_active": False,  # 新版本默认不激活
    }).execute()

    return {"success": True, "version": result.data[0]}


@app.get('/api/v1/admin/versions')
async def get_all_versions(platform: Optional[str] = None):
    """获取所有版本"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    query = supabase.table('app_versions').select('*').order('release_date', desc=True)

    if platform:
        query = query.eq('platform', platform)

    result = query.execute()

    return {"success": True, "versions": result.data}


@app.get('/api/v1/admin/versions/{version_id}')
async def get_version(version_id: str):
    """获取单个版本详情"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    result = supabase.table('app_versions').select('*').eq('id', version_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="版本不存在")

    return {"success": True, "version": result.data[0]}


@app.put('/api/v1/admin/versions/{version_id}')
async def update_version(version_id: str, version_data: UpdateVersion):
    """更新版本"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    # 构建更新数据
    update_data = {}
    if version_data.version is not None:
        update_data['version'] = version_data.version
    if version_data.build_number is not None:
        update_data['build_number'] = version_data.build_number
    if version_data.force_update is not None:
        update_data['force_update'] = version_data.force_update
    if version_data.release_notes is not None:
        update_data['release_notes'] = version_data.release_notes
    if version_data.update_url is not None:
        update_data['update_url'] = version_data.update_url

    result = supabase.table('app_versions').update(update_data).eq('id', version_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="版本不存在")

    return {"success": True, "version": result.data[0]}


@app.delete('/api/v1/admin/versions/{version_id}')
async def delete_version(version_id: str):
    """删除版本"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    result = supabase.table('app_versions').delete().eq('id', version_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="版本不存在")

    return {"success": True}


@app.post('/api/v1/admin/versions/{version_id}/activate')
async def activate_version(version_id: str):
    """激活版本（推送给用户）"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    # 获取要激活的版本
    version_result = supabase.table('app_versions').select('*').eq('id', version_id).execute()

    if not version_result.data:
        raise HTTPException(status_code=404, detail="版本不存在")

    version = version_result.data[0]

    # 取消该平台所有版本的激活状态
    supabase.table('app_versions').update({'is_active': False}).eq('platform', version['platform']).execute()

    # 激活当前版本
    result = supabase.table('app_versions').update({'is_active': True}).eq('id', version_id).execute()

    return {"success": True, "version": result.data[0]}


@app.get('/api/v1/admin/versions/active')
async def get_active_versions():
    """获取当前激活的版本"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    result = supabase.table('app_versions').select('*').eq('is_active', True).execute()

    return {"success": True, "versions": result.data}


# ========== 主程序 ==========

if __name__ == '__main__':
    print("🚀 Starting Python backend server...")
    # 优先读取 SERVER_PORT（启动脚本设置），其次读取 PORT，默认使用 9091
    port = int(os.getenv('SERVER_PORT') or os.getenv('PORT') or '9091')
    print(f"📦 Port: {port}")
    print(f"🔗 ARK API Key: {'✅ Configured' if ARK_API_KEY else '❌ Not configured'}")
    print(f"🎤 Volcengine APP ID: {'✅ Configured' if VOLCENGINE_SPEECH_APP_ID else '❌ Not configured'}")
    print(f"🎤 Volcengine Access Token: {'✅ Configured' if VOLCENGINE_ACCESS_TOKEN else '❌ Not configured'}")
    print(f"🗄️  Supabase: {'✅ Configured' if supabase else '❌ Not configured'}")

    uvicorn.run(app, host="0.0.0.0", port=port)
