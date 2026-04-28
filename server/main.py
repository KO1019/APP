#!/usr/bin/env python3
"""
AI情绪日记 & 心理状态智能陪伴系统 - Python后端服务
使用FastAPI + WebSocket + 火山引擎RealtimeAPI（官方Python示例）
"""

import os
import io
import uuid
import hashlib
import asyncio
import json
import httpx
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from passlib.context import CryptContext

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, File, Form, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse, StreamingResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv
from pathlib import Path

# 数据库适配器（MySQL）
from db_adapter import db_client

# 对象存储（阿里云OSS）
from oss_storage import oss_storage, check_oss_config

# 加载.env文件（使用绝对路径）
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path)

# ===== 管理后台配置 =====
# ⚠️ 生产环境请使用环境变量或配置文件
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "admin_token_2024_change_me")

# 密码加密配置
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 环境变量配置（从.env文件读取）
JWT_SECRET = os.getenv('JWT_SECRET')

# 豆包ARK API配置（语言模型）
ARK_BASE_URL = os.getenv('ARK_BASE_URL')
ARK_API_KEY = os.getenv('ARK_API_KEY')
ARK_CHAT_MODEL = os.getenv('ARK_CHAT_MODEL')

# 豆包语音API配置（从.env文件读取）
VOLCENGINE_SPEECH_APP_ID = os.getenv('VOLCENGINE_SPEECH_APP_ID')
VOLCENGINE_SPEECH_SECRET_KEY = os.getenv('VOLCENGINE_SPEECH_SECRET_KEY')
VOLCENGINE_ACCESS_TOKEN = os.getenv('VOLCENGINE_ACCESS_TOKEN')
VOLCENGINE_API_KEY = os.getenv('VOLCENGINE_API_KEY')

# Supabase配置（从环境变量读取）
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_KEY)

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

# ========== 挂载版本管理后台 ==========
import version_manager_web
app.mount("/version-manager", version_manager_web.app)

# JWT认证
security = HTTPBearer()

# 管理员认证依赖

# 数据库客户端（MySQL适配器，模拟Supabase API）
# 不再使用 Supabase，改用 MySQL + db_adapter


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
    mood_intensity: Optional[int] = None
    weather: Optional[str] = None
    tags: Optional[List[str]] = None
    title: Optional[str] = None
    images: Optional[List[str]] = None
    location: Optional[Dict[str, Any]] = None
    template_id: Optional[str] = None
    created_at: Optional[str] = None


class ChatMessage(BaseModel):
    message: str
    conversationId: Optional[str] = None
    diaryId: Optional[str] = None


class TextInput(BaseModel):
    text: str


class ChangePassword(BaseModel):
    """修改密码"""
    old_password: str
    new_password: str


class FileUploadResponse(BaseModel):
    """文件上传响应"""
    key: str
    url: str
    size: int
    content_type: str
    filename: str
    is_public: bool


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
    """验证密码（支持 bcrypt 和 SHA256）"""
    # 如果是 bcrypt 哈希（以 $2b$ 开头）
    if hashed.startswith('$2b$'):
        return pwd_context.verify(password, hashed)
    # 如果是 SHA256 哈希（64位十六进制）
    elif len(hashed) == 64 and all(c in '0123456789abcdef' for c in hashed.lower()):
        return hashlib.sha256(password.encode()).hexdigest() == hashed
    # 其他格式暂时不支持
    else:
        return False


# ========== LLM API调用 ==========
from model_manager import model_manager, TaskType

async def call_llm_stream(messages: List[Dict[str, str]], on_chunk: callable):
    """流式调用LLM（使用模型管理器，支持自动故障切换）"""
    try:
        full_text = ""
        async for chunk in model_manager.call_model(
            task_type=TaskType.CHAT,
            messages=messages,
            stream=True
        ):
            full_text += chunk
            on_chunk(chunk)

        return full_text

    except Exception as e:
        print(f"[LLM] 调用失败: {str(e)}")
        # fallback response
        fallback = "抱歉，AI功能暂时不可用。请稍后重试。"
        for char in fallback:
            on_chunk(char)
            await asyncio.sleep(0.03)
        return fallback


# ========== FastAPI路由 ==========

@app.get('/api/v1/health')
async def health_check():
    """健康检查"""
    return {"status": "ok"}


# 下载信息缓存
_download_info_cache = None
_download_info_cache_time = None
_download_info_cache_ttl = 30  # 缓存30秒

@app.get('/api/v1/app/download')
async def get_app_download_info():
    """获取APP下载链接（从数据库读取管理员推送的版本，带缓存）"""
    global _download_info_cache, _download_info_cache_time

    try:
        import time
        current_time = time.time()

        # 检查缓存
        if _download_info_cache and _download_info_cache_time:
            if current_time - _download_info_cache_time < _download_info_cache_ttl:
                # 返回缓存，但增加当前时间戳
                response = _download_info_cache.copy()
                response['_cached'] = True
                response['_cache_time'] = current_time - _download_info_cache_time
                return response

        # 初始化为空，表示暂未开放
        android_info = {
            "name": "Android",
            "url": None,
            "version": "1.0.0",
            "size": "50MB",
            "min_version": "Android 8.0",
            "available": False
        }

        ios_info = {
            "name": "iOS",
            "url": None,
            "version": "1.0.0",
            "size": "45MB",
            "min_version": "iOS 14.0",
            "available": False
        }

        # 从数据库获取激活的版本
        if db_client:
            try:
                # MySQL数据库查询
                result = db_client.table('versions').select('*').eq('is_active', 1).execute()

                if result and hasattr(result, 'data') and result.data:
                    for version in result.data:
                        if version.get('platform') == 'android':
                            if version.get('file_url'):
                                android_info["url"] = version['file_url']
                                android_info["version"] = version.get('version_name', '1.0.0')
                                android_info["build_number"] = version.get('build_number', '1')
                                android_info["version_code"] = version.get('version_code', '1')
                                android_info["release_notes"] = version.get('release_notes', '')
                                android_info["available"] = True
                                if version.get('file_size'):
                                    size_mb = version['file_size'] / (1024 * 1024)
                                    android_info["size"] = f"{size_mb:.1f}MB"
                        elif version.get('platform') == 'ios':
                            if version.get('file_url'):
                                ios_info["url"] = version['file_url']
                                ios_info["version"] = version.get('version_name', '1.0.0')
                                ios_info["build_number"] = version.get('build_number', '1')
                                ios_info["version_code"] = version.get('version_code', '1')
                                ios_info["release_notes"] = version.get('release_notes', '')
                                ios_info["available"] = True
                                if version.get('file_size'):
                                    size_mb = version['file_size'] / (1024 * 1024)
                                    ios_info["size"] = f"{size_mb:.1f}MB"
            except Exception as e:
                print(f"Database query error: {e}")

        response = {
            "android": android_info,
            "ios": ios_info,
            "download_page": "https://anjia.work/download",
            "_cached": False,
            "_cache_time": 0
        }

        # 更新缓存
        _download_info_cache = response
        _download_info_cache_time = current_time

        return response
    except Exception as e:
        # 出错时返回默认数据（暂未开放）
        print(f"Error fetching download info: {e}")
        return {
            "android": {
                "name": "Android",
                "url": None,
                "version": "1.0.0",
                "size": "50MB",
                "min_version": "Android 8.0",
                "available": False
            },
            "ios": {
                "name": "iOS",
                "url": None,
                "version": "1.0.0",
                "size": "45MB",
                "min_version": "iOS 14.0",
                "available": False
            },
            "download_page": "https://anjia.work/download",
            "_error": str(e)
        }


@app.post('/api/v1/auth/register')
async def register(user: UserRegister):
    """用户注册"""
    # 参数校验
    if len(user.username) < 3 or len(user.username) > 20:
        raise HTTPException(status_code=400, detail="用户名长度必须在3-20个字符之间")

    if len(user.password) < 6:
        raise HTTPException(status_code=400, detail="密码长度至少6个字符")

    if not db_client:
        raise HTTPException(
            status_code=503,
            detail="数据库未配置，请检查MySQL配置"
        )

    # 检查用户名是否存在
    existing = db_client.table('users').select('*').eq('username', user.username).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="用户名已存在")

    # 创建用户
    password_hash = hash_password(user.password)
    new_user = db_client.table('users').insert({
        'id': str(uuid.uuid4()),  # 显式设置UUID
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


@app.post('/api/v1/login')
async def admin_login(user: UserLogin):
    """管理员登录（检查 is_admin 字段）"""
    if not db_client:
        raise HTTPException(
            status_code=503,
            detail="数据库未配置，请检查MySQL配置"
        )

    # 查找用户
    result = db_client.table('users').select('*').eq('username', user.username).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    user_data = result.data[0]

    # 验证密码
    if not verify_password(user.password, user_data['password_hash']):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    # 检查是否为管理员
    if not user_data.get('is_admin', False):
        raise HTTPException(status_code=403, detail="无管理员权限，拒绝访问")

    # 生成JWT Token
    token = generate_token(user_data['id'])

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_data['id'],
            "username": user_data['username'],
            "email": user_data.get('email'),
            "nickname": user_data.get('nickname'),
            "avatar": user_data.get('avatar'),
            "is_admin": user_data.get('is_admin', False),
            "is_active": user_data.get('is_active', True)
        }
    }


@app.post('/api/v1/auth/login')
async def login(user: UserLogin):
    """用户登录"""
    if not db_client:
        raise HTTPException(
            status_code=503,
            detail="数据库未配置，请检查MySQL配置"
        )

    # 查找用户
    result = db_client.table('users').select('*').eq('username', user.username).execute()
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
            "is_admin": user_data.get('is_admin', False),  # 添加管理员权限字段
            "created_at": user_data['created_at']
        },
        "token": token
    }


@app.get('/api/v1/auth/me')
async def get_current_user(user_id: str = Depends(get_user_id)):
    """获取当前用户信息"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Database not configured")

    result = db_client.table('users').select('id, username, email, nickname, avatar, cloud_sync_enabled, is_admin, data_encryption_enabled, anonymous_analytics, created_at').eq('id', user_id).single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")

    return {"user": result.data}


@app.post('/api/v1/auth/change-password')
async def change_password(data: ChangePassword, user_id: str = Depends(get_user_id)):
    """修改密码"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Database not configured")

    # 参数校验
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="新密码长度至少6个字符")

    # 获取用户信息
    result = db_client.table('users').select('id, password_hash').eq('id', user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="用户不存在")

    user_data = result.data[0]

    # 验证旧密码
    if not verify_password(data.old_password, user_data['password_hash']):
        raise HTTPException(status_code=401, detail="旧密码错误")

    # 更新密码
    new_password_hash = hash_password(data.new_password)
    db_client.table('users').update({'password_hash': new_password_hash}).eq('id', user_id).execute()

    return {"message": "密码修改成功"}


@app.post('/api/v1/auth/privacy-settings')
async def update_privacy_settings(settings: PrivacySettings, user_id: str = Depends(get_user_id)):
    """更新隐私设置"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Database not configured")

    # 更新隐私设置
    db_client.table('users').update({
        'cloud_sync_enabled': settings.cloud_sync_enabled,
        'data_encryption_enabled': settings.data_encryption_enabled,
        'anonymous_analytics': settings.anonymous_analytics
    }).eq('id', user_id).execute()

    return {"message": "隐私设置更新成功"}


@app.get('/api/v1/auth/privacy-settings')
async def get_privacy_settings(user_id: str = Depends(get_user_id)):
    """获取隐私设置"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Database not configured")

    result = db_client.table('users').select('cloud_sync_enabled, data_encryption_enabled, anonymous_analytics').eq('id', user_id).single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="用户不存在")

    return {"settings": result.data}


@app.post('/api/v1/auth/profile')
async def update_profile(profile: UpdateProfile, user_id: str = Depends(get_user_id)):
    """更新用户资料"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Database not configured")

    # 如果要更新头像，先删除旧头像
    if profile.avatar is not None:
        # 获取当前用户信息
        current_user = db_client.table('users').select('avatar').eq('id', user_id).single().execute()
        old_avatar = current_user.data.get('avatar') if current_user.data else None

        # 如果旧头像存在且与新头像不同，删除旧头像
        if old_avatar and old_avatar != profile.avatar:
            try:
                # 从URL中提取OSS key
                # 格式: https://bucket.oss-region.aliyuncs.com/folder/path/file.ext
                if old_avatar.startswith('https://') or old_avatar.startswith('http://'):
                    # 移除域名部分
                    url_parts = old_avatar.split('/', 3)
                    if len(url_parts) >= 4:
                        old_key = url_parts[3]
                        # 删除旧头像
                        oss_storage.delete_file(old_key)
                        print(f"[Profile] 已删除旧头像: {old_key}")
            except Exception as e:
                # 删除失败不影响更新操作
                print(f"[Profile] 删除旧头像失败: {e}")

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
        db_client.table('users').update(update_data).eq('id', user_id).execute()

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
    if not db_client:
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
        result = db_client.table('versions').select('*').eq('platform', request.platform.lower()).eq('is_active', True).execute()
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
        "release_date": latest_version.get("release_date", "")
    }


@app.post('/api/v1/diaries')
async def create_diary(diary: DiaryCreate, user_id: str = Depends(get_user_id)):
    """创建日记"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Database not configured")

    insert_data = {
        "content": diary.content,
        "user_id": user_id
    }

    if diary.title:
        insert_data["title"] = diary.title
    if diary.mood:
        insert_data["mood"] = diary.mood
    if diary.mood_intensity:
        insert_data["mood_intensity"] = diary.mood_intensity
    if diary.weather:
        insert_data["weather"] = diary.weather
    if diary.tags:
        insert_data["tags"] = diary.tags
    if diary.images:
        insert_data["images"] = diary.images
    if diary.location:
        insert_data["location"] = diary.location
    if diary.template_id:
        insert_data["template_id"] = diary.template_id

    result = db_client.table('diaries').insert(insert_data).execute()

    # TODO: 异步进行情绪分析

    return result.data[0] if result.data else None


@app.get('/api/v1/diaries')
async def get_diaries(
    user_id: str = Depends(get_user_id),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """
    获取日记列表

    Query参数:
    - start_date: 开始日期（ISO格式，如：2026-04-01）
    - end_date: 结束日期（ISO格式，如：2026-04-30）
    """
    if not db_client:
        raise HTTPException(status_code=500, detail="Database not configured")

    # 构建查询
    query = db_client.table('diaries').select('*').eq('user_id', user_id)

    # 添加日期筛选
    if start_date:
        query = query.gte('created_at', start_date)
    if end_date:
        query = query.lte('created_at', end_date)

    result = query.order('created_at', desc=True).range(0, 49).execute()

    return result.data or []


@app.get('/api/v1/diaries/{diary_id}')
async def get_diary_detail(diary_id: str, user_id: str = Depends(get_user_id)):
    """获取日记详情"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Database not configured")

    result = db_client.table('diaries').select('*').eq('id', diary_id).eq('user_id', user_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Diary not found")

    return result.data[0]


@app.delete('/api/v1/diaries/{diary_id}')
async def delete_diary(diary_id: str, user_id: str = Depends(get_user_id)):
    """删除日记"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Database not configured")

    db_client.table('diaries').delete().eq('id', diary_id).eq('user_id', user_id).execute()

    return {"success": True}


@app.put('/api/v1/diaries/{diary_id}')
async def update_diary(diary_id: str, diary: DiaryCreate, user_id: str = Depends(get_user_id)):
    """更新日记"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Database not configured")

    # 检查日记是否存在且属于该用户
    check_result = db_client.table('diaries').select('id').eq('id', diary_id).eq('user_id', user_id).execute()
    if not check_result.data:
        raise HTTPException(status_code=404, detail="Diary not found")

    # 更新日记
    update_data = {
        **diary.dict(exclude_unset=True),
        'updated_at': datetime.now().isoformat(),
    }

    result = db_client.table('diaries').update(update_data).eq('id', diary_id).eq('user_id', user_id).execute()

    # TODO: 如果情绪或内容发生变化，重新进行情绪分析

    return result.data[0] if result.data else None


class GenerateDiaryFromChat(BaseModel):
    """从聊天记录生成日记"""
    conversation: str
    conversation_id: Optional[str] = None


@app.post('/api/v1/diaries/generate-from-chat')
async def generate_diary_from_chat(data: GenerateDiaryFromChat, user_id: str = Depends(get_user_id)):
    """从聊天记录生成日记"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Database not configured")

    import json

    try:
        from langchain_core.messages import SystemMessage, HumanMessage

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
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"以下是对话记录：\n\n{data.conversation}\n\n请根据这段对话生成日记。"}
        ]

        # 使用已有的LLM调用方式
        response_text = ""

        def collect_response(chunk: str):
            nonlocal response_text
            response_text += chunk

        await call_llm_stream(messages, collect_response)

        if not response_text:
            raise HTTPException(status_code=500, detail="AI未返回任何内容")

        # 提取响应内容
        diary_json_str = response_text.strip()

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
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": diary_data.get('title', ''),
            "content": diary_data.get('content', ''),
            "mood": diary_data.get('mood', '中性'),
            "tags": diary_data.get('tags', []),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }

        result = db_client.table('diaries').insert(insert_data).execute()

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
        response_queue = []

        def on_chunk(chunk: str):
            nonlocal full_response
            full_response += chunk
            response_queue.append(chunk)

        # 构建对话历史
        messages = []

        # 检查用户是否在询问日记相关内容
        diary_keywords = ['日记', '今天写', '今天的日记', '记录', '写日记', '写过什么']
        is_asking_about_diary = any(keyword in chat.message for keyword in diary_keywords)

        if chat.diaryId:
            # 获取关联的日记
            if db_client:
                diary_result = db_client.table('diaries').select('content').eq('id', chat.diaryId).maybe_single().execute()
                if diary_result.data:
                    messages.append({
                        "role": "system",
                        "content": f"你是一位温暖、专业的心理陪伴助手。用户刚刚写了一篇日记，内容如下：\n\n{diary_result.data['content']}\n\n请以共情的方式回应用户，帮助他们理解自己的情绪。"
                    })
        elif is_asking_about_diary and db_client:
            # 用户询问日记相关内容，自动获取今天的日记
            try:
                from datetime import datetime, timedelta
                today = datetime.now().date()
                tomorrow = today + timedelta(days=1)

                # 获取今天的所有日记
                diaries_result = db_client.table('diaries')\
                    .select('id, content, mood, created_at')\
                    .gte('created_at', today.isoformat())\
                    .lt('created_at', tomorrow.isoformat())\
                    .order('created_at', desc=True)\
                    .execute()

                if diaries_result.data:
                    # 构建日记摘要
                    diary_summaries = []
                    for diary in diaries_result.data:
                        mood_emoji = {
                            '开心': '😊', '兴奋': '🤩', '平静': '😌', '中性': '😐',
                            '焦虑': '😰', '悲伤': '😢', '愤怒': '😠', '疲惫': '😫'
                        }
                        emoji = mood_emoji.get(diary.get('mood', '中性'), '😐')
                        diary_summaries.append(f"{emoji} {diary['content']}")

                    diary_text = "\n\n".join(diary_summaries)
                    messages.append({
                        "role": "system",
                        "content": f"你是一位温暖、专业的心理陪伴助手。用户在询问他今天写的日记。以下是用户今天写的内容：\n\n{diary_text}\n\n请以共情的方式回应用户，帮助他们理解和表达自己的感受。"
                    })
                else:
                    # 今天没有写日记
                    messages.append({
                        "role": "system",
                        "content": "你是一位温暖、专业的心理陪伴助手。用户询问今天的日记，但他今天还没有写日记。请温柔地提醒用户，鼓励他们记录今天的感受和经历。"
                    })
            except Exception as e:
                print(f"Error fetching today's diaries: {e}")
                # 获取失败时使用默认提示
                messages.append({
                    "role": "system",
                    "content": "你是一位温暖、专业的心理陪伴助手。用户询问日记相关内容，但获取日记时出现了问题。请以共情的方式回应用户。"
                })

        # 获取最近对话历史
        if db_client:
            try:
                import json
                conv_result = db_client.table('conversations').select('messages').order('created_at', desc=True).range(0, 4).execute()
                if conv_result.data:
                    for conv in reversed(conv_result.data):
                        messages_str = conv.get('messages')
                        if messages_str:
                            try:
                                messages_json = json.loads(messages_str)
                                if isinstance(messages_json, list):
                                    for msg in messages_json:
                                        if msg.get('role') in ['user', 'assistant']:
                                            messages.append(msg)
                            except json.JSONDecodeError:
                                pass
            except Exception as e:
                print(f"Error fetching conversation history: {e}")

        if not messages or messages[0]['role'] != 'system':
            messages.insert(0, {
                "role": "system",
                "content": "你是一位温暖、专业的心理陪伴助手。请以共情的方式倾听用户的情绪，帮助他们理解和表达自己的感受。"
            })

        messages.append({"role": "user", "content": chat.message})

        # 流式调用LLM
        await call_llm_stream(messages, on_chunk)

        # 发送所有响应数据
        for chunk in response_queue:
            yield f"data: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"

        yield "data: [DONE]\n\n"

        # 保存对话记录
        if db_client:
            try:
                # 获取当前会话或创建新会话
                session_id = chat.conversationId or str(uuid.uuid4())

                # 检查会话是否已存在
                existing_conv = db_client.table('conversations').select('*').eq('id', session_id).execute()

                user_msg = {"role": "user", "content": chat.message}
                ai_msg = {"role": "assistant", "content": full_response}

                if existing_conv.data:
                    # 更新现有会话的消息列表
                    current_messages = existing_conv.data[0].get('messages', [])
                    if isinstance(current_messages, list):
                        current_messages.append(user_msg)
                        current_messages.append(ai_msg)
                        import json
                        db_client.table('conversations').update({
                            'messages': json.dumps(current_messages, ensure_ascii=False),
                            'updated_at': datetime.now().isoformat()
                        }).eq('id', session_id).execute()
                else:
                    # 创建新会话
                    import json
                    db_client.table('conversations').insert({
                        'id': session_id,
                        'user_id': user_id,
                        'title': chat.message[:50] if len(chat.message) > 50 else chat.message,  # 使用第一条消息作为标题
                        'messages': json.dumps([user_msg, ai_msg], ensure_ascii=False)
                    }).execute()
            except Exception as e:
                print(f"Error saving conversation: {e}")

    return StreamingResponse(generate(), media_type="text/event-stream; charset=utf-8")


@app.get('/api/v1/conversations')
async def get_conversations(user_id: str = Depends(get_user_id)):
    """获取对话列表"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Database not configured")

    result = db_client.table('conversations').select('*').eq('user_id', user_id).order('created_at', desc=True).range(0, 99).execute()

    # 转换数据格式：从messages JSON字段中提取user_message和ai_message
    import json
    conversations = []
    for conv in (result.data or []):
        messages_data = conv.get('messages', '')
        user_message = ''
        ai_message = ''

        try:
            # messages 可能已经被db_adapter解析为list，或者是JSON字符串
            messages = messages_data if isinstance(messages_data, list) else json.loads(messages_data) if isinstance(messages_data, str) else []

            if isinstance(messages, list):
                # 找到用户消息和AI消息
                for msg in messages:
                    if msg.get('role') == 'user' and not user_message:
                        user_message = msg.get('content', '')
                    elif msg.get('role') == 'assistant' and not ai_message:
                        ai_message = msg.get('content', '')
                    if user_message and ai_message:
                        break
        except (json.JSONDecodeError, TypeError):
            pass

        conversations.append({
            'id': conv.get('id'),
            'user_message': user_message,
            'ai_message': ai_message,
            'related_diary_id': conv.get('related_diary_id'),
            'created_at': conv.get('created_at'),
            'user_id': conv.get('user_id'),
            'title': conv.get('title', '')
        })

    return conversations


@app.delete('/api/v1/conversations/{conversation_id}')
async def delete_conversation(conversation_id: str, user_id: str = Depends(get_user_id)):
    """删除对话"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Database not configured")

    # 检查对话是否存在且属于当前用户
    result = db_client.table('conversations').select('*').eq('id', conversation_id).maybe_single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if result.data.get('user_id') != user_id:
        raise HTTPException(status_code=403, detail="You don't have permission to delete this conversation")

    # 删除对话
    db_client.table('conversations').delete().eq('id', conversation_id).execute()

    return {"success": True, "message": "Conversation deleted successfully"}


@app.get('/api/v1/conversations/{conversation_id}')
async def get_conversation_by_id(conversation_id: str, user_id: str = Depends(get_user_id)):
    """获取单个对话详情"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Database not configured")

    # 检查对话是否存在且属于当前用户
    result = db_client.table('conversations').select('*').eq('id', conversation_id).execute()

    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conv_data = result.data[0]

    if conv_data.get('user_id') != user_id:
        raise HTTPException(status_code=403, detail="You don't have permission to access this conversation")

    # 转换数据格式
    import json
    messages_data = conv_data.get('messages', '')
    user_message = ''
    ai_message = ''

    try:
        # messages 可能已经被db_adapter解析为list，或者是JSON字符串
        messages = messages_data if isinstance(messages_data, list) else json.loads(messages_data) if isinstance(messages_data, str) else []

        if isinstance(messages, list):
            for msg in messages:
                if msg.get('role') == 'user' and not user_message:
                    user_message = msg.get('content', '')
                elif msg.get('role') == 'assistant' and not ai_message:
                    ai_message = msg.get('content', '')
                if user_message and ai_message:
                    break
    except (json.JSONDecodeError, TypeError):
        pass

    return {
        'id': conv_data.get('id'),
        'user_message': user_message,
        'ai_message': ai_message,
        'created_at': conv_data.get('created_at'),
        'user_id': conv_data.get('user_id'),
        'title': conv_data.get('title', '')
    }


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
    version_name: str  # 版本号，如 "2.0.0"
    version_code: int  # 版本代码，如 2
    build_number: int  # 构建号，如 200
    platform: str  # android 或 ios
    release_notes: str  # 更新说明
    file_url: str  # 下载链接
    file_size: Optional[int] = None  # 文件大小（字节）
    checksum: Optional[str] = None  # 文件校验和
    min_sdk_version: Optional[int] = None  # 最低SDK版本（Android）


class UpdateVersion(BaseModel):
    """更新版本"""
    version_name: Optional[str] = None
    version_code: Optional[int] = None
    build_number: Optional[int] = None
    release_notes: Optional[str] = None
    file_url: Optional[str] = None
    file_size: Optional[int] = None
    checksum: Optional[str] = None
    min_sdk_version: Optional[int] = None


# 管理员认证相关
def verify_admin_token(request: Request) -> bool:
    """验证管理员 token"""
    # 优先从 Authorization header 中获取 token
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.replace('Bearer ', '')
    else:
        # 其次从 cookie 中获取 token
        token = request.cookies.get('admin_token')

    if not token:
        return False

    # 验证 token（这里简化处理，实际应该更安全）
    if token == ADMIN_TOKEN:
        return True

    return False


@app.post('/api/v1/admin/login')
async def admin_login(username: str = Form(...), password: str = Form(...)):
    """管理员登录 - 验证用户密码和管理员权限"""
    if not db_client:
        raise HTTPException(
            status_code=503,
            detail="数据库未配置，请检查MySQL配置"
        )

    # 查找用户
    result = db_client.table('users').select('*').eq('username', username).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    user_data = result.data[0]

    # 验证密码
    if not verify_password(password, user_data['password_hash']):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    # 检查是否为管理员
    if not user_data.get('is_admin', False):
        raise HTTPException(status_code=403, detail="无管理员权限，拒绝访问")

    # 登录成功，设置cookie并返回token
    response = JSONResponse({
        "success": True,
        "message": "登录成功",
        "access_token": ADMIN_TOKEN,
        "user": {"username": user_data['username'], "nickname": user_data.get('nickname')}
    })
    response.set_cookie(
        key="admin_token",
        value=ADMIN_TOKEN,
        httponly=True,
        max_age=3600 * 24  # 24 小时
    )
    return response


@app.post('/api/v1/admin/logout')
async def admin_logout():
    """管理员登出"""
    response = JSONResponse({"success": True, "message": "登出成功"})
    response.delete_cookie("admin_token")
    return response


@app.get('/api/v1/admin/check-auth')
async def check_auth(request: Request):
    """检查认证状态"""
    is_authenticated = verify_admin_token(request)
    return {"authenticated": is_authenticated}


@app.post('/api/v1/admin/versions')
async def create_version(version_data: CreateVersion, request: Request):
    """创建新版本"""
    # 验证认证
    if not verify_admin_token(request):
        raise HTTPException(status_code=401, detail="未授权")

    if not db_client:
        raise HTTPException(status_code=500, detail="Admin database not configured")

    # 检查版本号是否已存在
    existing = db_client.table('versions').select('*').eq('platform', version_data.platform).eq('version_code', version_data.version_code).execute()

    if existing.data:
        raise HTTPException(status_code=400, detail="该平台的此版本代码已存在")

    # 创建版本
    version_id = f"v{version_data.version_name.replace('.', '_')}-{version_data.platform}"

    result = db_client.table('versions').insert({
        "id": version_id,
        "version_name": version_data.version_name,
        "version_code": version_data.version_code,
        "build_number": version_data.build_number,
        "platform": version_data.platform,
        "release_notes": version_data.release_notes,
        "file_url": version_data.file_url,
        "file_size": version_data.file_size,
        "checksum": version_data.checksum,
        "min_sdk_version": version_data.min_sdk_version,
        "is_active": False,  # 新版本默认不激活
    }).execute()

    return {"success": True, "version": result.data[0]}


@app.get('/api/v1/admin/versions')
async def get_all_versions(platform: Optional[str] = None):
    """获取所有版本"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Admin database not configured")

    query = db_client.table('versions').select('*').order('created_at', desc=True)

    if platform:
        query = query.eq('platform', platform)

    result = query.execute()

    return {"success": True, "versions": result.data}


@app.get('/api/v1/admin/versions/active')
async def get_active_versions():
    """获取当前激活的版本"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Admin database not configured")

    result = db_client.table('versions').select('*').eq('is_active', True).execute()

    return {"success": True, "versions": result.data}


@app.get('/api/v1/admin/versions/{version_id}')
async def get_version(version_id: str):
    """获取单个版本详情"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Admin database not configured")

    result = db_client.table('versions').select('*').eq('id', version_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="版本不存在")

    return {"success": True, "version": result.data[0]}


@app.put('/api/v1/admin/versions/{version_id}')
async def update_version(version_id: str, version_data: UpdateVersion):
    """更新版本"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Admin database not configured")

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

    result = db_client.table('versions').update(update_data).eq('id', version_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="版本不存在")

    return {"success": True, "version": result.data[0]}


@app.delete('/api/v1/admin/versions/{version_id}')
async def delete_version(version_id: str):
    """删除版本"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Admin database not configured")

    result = db_client.table('versions').delete().eq('id', version_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="版本不存在")

    return {"success": True}


@app.post('/api/v1/admin/versions/{version_id}/activate')
async def activate_version(version_id: str):
    """激活版本（推送给用户）"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Admin database not configured")

    # 获取要激活的版本
    version_result = db_client.table('versions').select('*').eq('id', version_id).execute()

    if not version_result.data:
        raise HTTPException(status_code=404, detail="版本不存在")

    version = version_result.data[0]

    # 取消该平台所有版本的激活状态
    db_client.table('versions').update({'is_active': False}).eq('platform', version['platform']).execute()

    # 激活当前版本
    result = db_client.table('versions').update({'is_active': True}).eq('id', version_id).execute()

    return {"success": True, "version": result.data[0]}


# ========== 模型管理API ==========

@app.get('/api/v1/admin/models/status')
async def get_models_status():
    """获取所有模型的状态（管理员接口）"""
    status = model_manager.get_model_status()
    return {
        "success": True,
        "models": status
    }


@app.get('/api/v1/admin/models')
async def get_all_models():
    """获取所有模型的详细配置（管理员接口）"""
    models_info = []
    for model_name, config in model_manager.models.items():
        models_info.append({
            "name": model_name,
            "provider": config.provider.value,
            "base_url": config.base_url,
            "max_tokens": config.max_tokens,
            "temperature": config.temperature,
            "timeout": config.timeout,
            "enabled": config.enabled,
            "priority": config.priority,
            "supports_stream": config.supports_stream,
            "cost_factor": config.cost_factor,
            "cannot_switch": config.cannot_switch,
            "failure_count": model_manager.failure_count.get(model_name, 0),
            "is_blacklisted": model_manager.is_model_blacklisted(model_name),
            "last_failure_time": model_manager.last_failure_time.get(model_name, 0)
        })

    return {
        "success": True,
        "models": models_info
    }


@app.put('/api/v1/admin/models/{model_name}/enable')
async def enable_model(model_name: str):
    """启用模型（管理员接口）"""
    if model_name not in model_manager.models:
        raise HTTPException(status_code=404, detail="模型不存在")

    model_manager.models[model_name].enabled = True
    return {
        "success": True,
        "message": f"模型 {model_name} 已启用"
    }


@app.put('/api/v1/admin/models/{model_name}/disable')
async def disable_model(model_name: str):
    """禁用模型（管理员接口）"""
    if model_name not in model_manager.models:
        raise HTTPException(status_code=404, detail="模型不存在")

    model_manager.models[model_name].enabled = False
    return {
        "success": True,
        "message": f"模型 {model_name} 已禁用"
    }


@app.put('/api/v1/admin/models/{model_name}/unblacklist')
async def unblacklist_model(model_name: str):
    """从黑名单中移除模型（管理员接口）"""
    if model_name not in model_manager.models:
        raise HTTPException(status_code=404, detail="模型不存在")

    # 清空失败计数
    if model_name in model_manager.failure_count:
        model_manager.failure_count[model_name] = 0

    # 清空最后失败时间
    if model_name in model_manager.last_failure_time:
        model_manager.last_failure_time[model_name] = 0

    return {
        "success": True,
        "message": f"模型 {model_name} 已从黑名单中移除"
    }


@app.put('/api/v1/admin/models/{model_name}/reset-failure')
async def reset_model_failure(model_name: str):
    """重置模型失败计数（管理员接口）"""
    if model_name not in model_manager.models:
        raise HTTPException(status_code=404, detail="模型不存在")

    if model_name in model_manager.failure_count:
        model_manager.failure_count[model_name] = 0

    if model_name in model_manager.last_failure_time:
        model_manager.last_failure_time[model_name] = 0

    return {
        "success": True,
        "message": f"模型 {model_name} 的失败计数已重置"
    }


@app.put('/api/v1/admin/models/{model_name}/config')
async def update_model_config(model_name: str, config_update: Dict[str, Any]):
    """更新模型配置（管理员接口）"""
    if model_name not in model_manager.models:
        raise HTTPException(status_code=404, detail="模型不存在")

    model = model_manager.models[model_name]

    # 允许更新的字段
    allowed_fields = ['temperature', 'max_tokens', 'timeout', 'priority', 'cost_factor']
    updated_fields = []

    for field in allowed_fields:
        if field in config_update:
            setattr(model, field, config_update[field])
            updated_fields.append(field)

    if not updated_fields:
        raise HTTPException(status_code=400, detail="没有有效的配置字段")

    return {
        "success": True,
        "message": f"模型 {model_name} 配置已更新",
        "updated_fields": updated_fields
    }


@app.get('/api/v1/admin/models/tasks')
async def get_task_models():
    """获取各任务类型对应的模型列表（管理员接口）"""
    task_models = {}
    for task_type, model_names in model_manager.task_models.items():
        task_models[task_type.value] = model_names

    return {
        "success": True,
        "task_models": task_models
    }


# ========== 用户管理API ==========

class UserUpdate(BaseModel):
    nickname: Optional[str] = None
    email: Optional[str] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None


class PasswordUpdate(BaseModel):
    new_password: str


class WelcomeContentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None
    button_text: Optional[str] = None
    is_active: Optional[bool] = None


class AnnouncementCreate(BaseModel):
    title: str
    content: str
    image_url: Optional[str] = None
    button_text: Optional[str] = "我知道了"
    priority: Optional[int] = 0
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    is_active: Optional[bool] = True
    target_user_type: Optional[str] = "all"  # all, new, active, inactive
    is_update_announcement: Optional[bool] = False  # 是否为更新公告


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None
    button_text: Optional[str] = None
    priority: Optional[int] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    is_active: Optional[bool] = None
    target_user_type: Optional[str] = None
    is_update_announcement: Optional[bool] = None  # 是否为更新公告
    target_user_type: Optional[str] = None


@app.get('/api/v1/admin/users')
async def get_all_users(skip: int = 0, limit: int = 50):
    """获取所有用户列表（管理员接口）"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Admin database not configured")

    # 获取所有用户
    all_result = db_client.table('users').select('*').order('created_at', desc=True).execute()
    total = len(all_result.data)

    # 分页获取用户列表
    result = db_client.table('users').select('*')\
        .order('created_at', desc=True)\
        .range(skip, skip + limit - 1)\
        .execute()

    # 统计每个用户的活跃度（日记数量）
    user_ids = [u['id'] for u in result.data]
    diary_stats = {}
    if user_ids:
        # 批量查询所有日记
        diaries_result = db_client.table('diaries').select('*').execute()
        # 统计每个用户的日记数
        for diary in diaries_result.data:
            user_id = diary.get('user_id')
            if user_id:
                diary_stats[user_id] = diary_stats.get(user_id, 0) + 1

    # 为每个用户添加活跃度数据
    users_with_stats = []
    for user in result.data:
        user_data = user.copy()
        user_data['diary_count'] = diary_stats.get(user['id'], 0)
        users_with_stats.append(user_data)

    return {
        "success": True,
        "users": users_with_stats,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@app.get('/api/v1/admin/users/{user_id}')
async def get_user_by_id(user_id: str):
    """获取指定用户详情（管理员接口）"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Admin database not configured")

    result = db_client.table('users').select('*').eq('id', user_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="用户不存在")

    user = result.data[0]

    # 获取用户的日记统计
    diary_result = db_client.table('diaries').select('*', count='exact').eq('user_id', user_id).execute()
    user['diary_count'] = diary_result.count if hasattr(diary_result, 'count') else 0

    # 获取最近的登录记录（如果有的话）
    # TODO: 需要在数据库中添加登录记录表

    return {
        "success": True,
        "user": user
    }


@app.put('/api/v1/admin/users/{user_id}')
async def update_user(user_id: str, user_update: UserUpdate):
    """更新用户信息（管理员接口）"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Admin database not configured")

    # 检查用户是否存在
    existing = db_client.table('users').select('*').eq('id', user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="用户不存在")

    # 更新用户信息
    update_data = {k: v for k, v in user_update.dict().items() if v is not None}
    update_data['updated_at'] = datetime.now().isoformat()

    result = db_client.table('users').update(update_data).eq('id', user_id).execute()

    return {
        "success": True,
        "message": "用户信息更新成功",
        "user": result.data[0] if result.data else existing.data[0]
    }


@app.put('/api/v1/admin/users/{user_id}/password')
async def reset_user_password(user_id: str, password_update: PasswordUpdate):
    """重置用户密码（管理员接口）"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Admin database not configured")

    # 检查用户是否存在
    existing = db_client.table('users').select('*').eq('id', user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="用户不存在")

    # 校验密码长度
    if len(password_update.new_password) < 6:
        raise HTTPException(status_code=400, detail="密码长度至少6个字符")

    # 更新密码
    password_hash = hash_password(password_update.new_password)
    update_data = {
        'password_hash': password_hash,
        'updated_at': datetime.now().isoformat()
    }

    db_client.table('users').update(update_data).eq('id', user_id).execute()

    return {
        "success": True,
        "message": "密码重置成功"
    }


@app.delete('/api/v1/admin/users/{user_id}')
async def delete_user(user_id: str):
    """删除用户（管理员接口）"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Admin database not configured")

    # 检查用户是否存在
    existing = db_client.table('users').select('*').eq('id', user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="用户不存在")

    # 删除用户的所有日记
    db_client.table('diaries').delete().eq('user_id', user_id).execute()

    # 删除用户
    db_client.table('users').delete().eq('id', user_id).execute()

    return {
        "success": True,
        "message": "用户删除成功"
    }


@app.get('/api/v1/admin/users/{user_id}/diaries')
async def get_user_diaries(user_id: str, skip: int = 0, limit: int = 20):
    """获取指定用户的日记列表（管理员接口）"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Admin database not configured")

    # 检查用户是否存在
    existing = db_client.table('users').select('*').eq('id', user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="用户不存在")

    # 获取用户日记
    result = db_client.table('diaries').select('*')\
        .eq('user_id', user_id)\
        .order('created_at', desc=True)\
        .range(skip, skip + limit - 1)\
        .execute()

    return {
        "success": True,
        "diaries": result.data,
        "user_id": user_id
    }


@app.get('/api/v1/admin/stats')
async def get_admin_stats():
    """获取管理员统计数据（管理员接口）"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Admin database not configured")

    try:
        # 获取用户总数
        users_result = db_client.table('users').select('*').execute()
        total_users = len(users_result.data) if users_result.data else 0

        # 获取管理员数量
        try:
            admin_result = db_client.table('users').select('*').eq('is_admin', 1).execute()
            admin_count = len(admin_result.data) if admin_result.data else 0
        except Exception:
            # 如果 is_admin 字段不存在，返回 0
            admin_count = 0

        # 获取活跃用户数量（最近30天有日记的用户）
        thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
        active_users_result = db_client.table('diaries').select('user_id')\
            .gte('created_at', thirty_days_ago)\
            .execute()
        active_user_ids = set(d['user_id'] for d in active_users_result.data) if active_users_result.data else set()
        active_users_count = len(active_user_ids)

        # 获取日记总数
        diaries_result = db_client.table('diaries').select('*').execute()
        total_diaries = len(diaries_result.data) if diaries_result.data else 0

        # 获取最近30天的日记数量
        recent_diaries_result = db_client.table('diaries').select('*')\
            .gte('created_at', thirty_days_ago)\
            .execute()
        recent_diaries_count = len(recent_diaries_result.data) if recent_diaries_result.data else 0

        return {
            "success": True,
            "stats": {
                "total_users": total_users,
                "admin_count": admin_count,
                "active_users_count": active_users_count,
                "total_diaries": total_diaries,
                "recent_diaries_count": recent_diaries_count
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计数据失败: {str(e)}")




# ========== 欢迎内容管理API ==========

class WelcomeContentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None
    button_text: Optional[str] = None
    is_active: Optional[bool] = None


class AnnouncementCreate(BaseModel):
    title: str
    content: str
    image_url: Optional[str] = None
    button_text: Optional[str] = "我知道了"
    priority: Optional[int] = 0
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    is_active: Optional[bool] = True
    target_user_type: Optional[str] = "all"  # all, new, active, inactive


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None
    button_text: Optional[str] = None
    priority: Optional[int] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    is_active: Optional[bool] = None
    target_user_type: Optional[str] = None


@app.get('/api/v1/welcome')
async def get_welcome_content():
    """获取激活的欢迎内容"""
    try:
        result = db_client.table('welcome_content').select('*')\
            .eq('is_active', True)\
            .execute()

        if result.data and len(result.data) > 0:
            return {"success": True, "welcome": result.data[0]}

        return {"success": True, "welcome": None}
    except Exception as e:
        print(f"Error fetching welcome content: {e}")
        return {"success": True, "welcome": None}


@app.post('/api/v1/user/welcome/{welcome_id}/viewed')
async def mark_welcome_viewed(welcome_id: str, token: str = Depends(security)):
    """标记用户已查看欢迎内容"""
    # 从 token 获取用户 ID
    user_id = await get_user_id_from_token(token)

    # 检查是否已标记
    existing = db_client.table('user_welcome_status').select('*')\
        .eq('user_id', user_id)\
        .eq('welcome_id', welcome_id)\
        .execute()

    if existing.data:
        return {"success": True, "message": "Already viewed"}

    # 标记为已查看
    db_client.table('user_welcome_status').insert({
        'id': str(uuid.uuid4()),
        'user_id': user_id,
        'welcome_id': welcome_id
    }).execute()

    return {"success": True, "message": "Marked as viewed"}


@app.get('/api/v1/admin/welcome')
async def get_all_welcome_content():
    """获取所有欢迎内容（管理员接口）"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Admin database not configured")

    result = db_client.table('welcome_content').select('*').execute()

    return {"success": True, "welcome_contents": result.data}


@app.post('/api/v1/admin/welcome')
async def create_welcome_content(welcome: WelcomeContentUpdate):
    """创建欢迎内容（管理员接口）"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Admin database not configured")

    new_welcome = {
        'id': str(uuid.uuid4()),
        'title': welcome.title or '欢迎使用',
        'content': welcome.content or '',
        'image_url': welcome.image_url,
        'button_text': welcome.button_text or '开始使用',
        'is_active': welcome.is_active if welcome.is_active is not None else True
    }

    result = db_client.table('welcome_content').insert(new_welcome).execute()

    return {"success": True, "welcome": result.data[0]}


@app.put('/api/v1/admin/welcome/{welcome_id}')
async def update_welcome_content(welcome_id: str, welcome: WelcomeContentUpdate):
    """更新欢迎内容（管理员接口）"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Admin database not configured")

    update_data = {k: v for k, v in welcome.dict().items() if v is not None}
    update_data['updated_at'] = datetime.now().isoformat()

    result = db_client.table('welcome_content').update(update_data).eq('id', welcome_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Welcome content not found")

    return {"success": True, "welcome": result.data[0]}


@app.delete('/api/v1/admin/welcome/{welcome_id}')
async def delete_welcome_content(welcome_id: str):
    """删除欢迎内容（管理员接口）"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Admin database not configured")

    db_client.table('welcome_content').delete().eq('id', welcome_id).execute()

    return {"success": True, "message": "Welcome content deleted"}


# ========== 公告管理API ==========

@app.get('/api/v1/announcements')
async def get_active_announcements(user_id: Optional[str] = None):
    """获取用户可用的活跃公告"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Admin database not configured")

    now = datetime.now()

    # 获取所有活跃的公告
    result = db_client.table('announcements').select('*')\
        .eq('is_active', True)\
        .order('priority', desc=True)\
        .execute()

    if not result.data:
        return {"success": True, "announcements": []}

    # 在 Python 代码中过滤时间条件
    announcements = []
    for announcement in result.data:
        # 检查开始时间（如果设置，必须已经到达）
        start_time = announcement.get('start_time')
        if start_time and isinstance(start_time, str):
            start_datetime = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            if start_datetime > now:
                continue  # 还没到开始时间

        # 检查结束时间（如果设置，必须还未到达）
        end_time = announcement.get('end_time')
        if end_time and isinstance(end_time, str):
            end_datetime = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
            if end_datetime < now:
                continue  # 已经过期

        announcements.append(announcement)

    # 如果提供了用户 ID，过滤用户已查看的公告
    if user_id:
        viewed_result = db_client.table('user_announcement_status').select('announcement_id')\
            .eq('user_id', user_id)\
            .execute()

        viewed_ids = set(item['announcement_id'] for item in viewed_result.data) if viewed_result.data else set()

        # 过滤已查看的
        announcements = [a for a in announcements if a['id'] not in viewed_ids]

    return {"success": True, "announcements": announcements}


@app.post('/api/v1/user/announcements/{announcement_id}/viewed')
async def mark_announcement_viewed(announcement_id: str, token: str = Depends(security)):
    """标记用户已查看公告"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Admin database not configured")

    # 从 token 获取用户 ID
    user_id = await get_user_id_from_token(token)

    # 检查是否已标记
    existing = db_client.table('user_announcement_status').select('*')\
        .eq('user_id', user_id)\
        .eq('announcement_id', announcement_id)\
        .execute()

    if existing.data:
        return {"success": True, "message": "Already viewed"}

    # 标记为已查看
    db_client.table('user_announcement_status').insert({
        'id': str(uuid.uuid4()),
        'user_id': user_id,
        'announcement_id': announcement_id
    }).execute()

    return {"success": True, "message": "Marked as viewed"}


@app.get('/api/v1/admin/announcements')
async def get_all_announcements():
    """获取所有公告（管理员接口）"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Admin database not configured")

    result = db_client.table('announcements').select('*').order('priority', desc=True).execute()

    return {"success": True, "announcements": result.data}


@app.post('/api/v1/admin/announcements')
async def create_announcement(announcement: AnnouncementCreate):
    """创建公告（管理员接口）"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Admin database not configured")

    new_announcement = {
        'id': str(uuid.uuid4()),
        'title': announcement.title,
        'content': announcement.content,
        'image_url': announcement.image_url,
        'button_text': announcement.button_text,
        'priority': announcement.priority,
        'start_time': announcement.start_time,
        'end_time': announcement.end_time,
        'is_active': announcement.is_active,
        'target_user_type': announcement.target_user_type,
        'is_update_announcement': announcement.is_update_announcement
    }

    result = db_client.table('announcements').insert(new_announcement).execute()

    return {"success": True, "announcement": result.data[0]}


@app.put('/api/v1/admin/announcements/{announcement_id}')
async def update_announcement(announcement_id: str, announcement: AnnouncementUpdate):
    """更新公告（管理员接口）"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Admin database not configured")

    update_data = {k: v for k, v in announcement.dict().items() if v is not None}
    update_data['updated_at'] = datetime.now().isoformat()

    result = db_client.table('announcements').update(update_data).eq('id', announcement_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Announcement not found")

    return {"success": True, "announcement": result.data[0]}


@app.delete('/api/v1/admin/announcements/{announcement_id}')
async def delete_announcement(announcement_id: str):
    """删除公告（管理员接口）"""
    if not db_client:
        raise HTTPException(status_code=500, detail="Admin database not configured")

    db_client.table('announcements').delete().eq('id', announcement_id).execute()

    return {"success": True, "message": "Announcement deleted"}


# ========== 文件上传和管理接口 ==========

@app.post('/api/v1/files/upload')
async def upload_file(
    file: bytes = File(...),
    filename: str = Form(...),
    folder: Optional[str] = Form('uploads'),
    token: str = Depends(security)
):
    """上传文件到OSS"""
    if not check_oss_config():
        raise HTTPException(status_code=500, detail="OSS未配置")

    # 上传文件（移除文件大小限制）
    success, result = oss_storage.upload_file(file, filename, folder)

    if not success:
        raise HTTPException(status_code=500, detail=f"上传失败: {result.get('error')}")

    # 直接返回文件信息，兼容管理后台前端
    return {
        "success": True,
        "url": result.get('url'),
        "key": result.get('key'),
        "size": result.get('size', len(file)),
        "filename": filename
    }


# ========== 文件下载代理（解决OSS防盗链限制）==========

@app.get('/api/v1/download/{file_key:path}')
async def download_file_proxy(file_key: str):
    """
    文件下载代理接口
    通过后端代理下载OSS文件，绕过防盗链限制

    Args:
        file_key: OSS文件key，如 "versions/app-v1.0.1.apk"

    Returns:
        StreamingResponse: 文件流
    """
    try:
        # 从OSS下载文件
        result = oss_storage.download_file(file_key)

        if not result.get('success'):
            raise HTTPException(status_code=404, detail=f"文件不存在: {file_key}")

        # 获取文件信息
        file_content = result['content']
        filename = result.get('filename', os.path.basename(file_key))

        # 设置正确的Content-Type
        import mimetypes
        content_type, _ = mimetypes.guess_type(filename)
        if not content_type:
            # APK文件的MIME类型
            content_type = 'application/vnd.android.package-archive'
            if filename.endswith('.ipa'):
                content_type = 'application/octet-stream'

        # 返回文件流
        return StreamingResponse(
            io.BytesIO(file_content),
            media_type=content_type,
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"; filename*=UTF-8\'\'{filename}',
                'Content-Length': str(len(file_content)),
                'Cache-Control': 'public, max-age=31536000',  # 缓存1年
                'Accept-Ranges': 'bytes',
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Download Proxy] 下载失败: {e}")
        raise HTTPException(status_code=500, detail=f"下载失败: {str(e)}")


@app.delete('/api/v1/files/{file_key:path}')
async def delete_file(file_key: str, token: str = Depends(security)):
    """删除OSS中的文件"""
    if not check_oss_config():
        raise HTTPException(status_code=500, detail="OSS未配置")

    success, result = oss_storage.delete_file(file_key)

    if not success:
        raise HTTPException(status_code=500, detail=f"删除失败: {result.get('error')}")

    return {
        "success": True,
        "message": "删除成功"
    }


@app.get('/api/v1/files/{file_key:path}/url')
async def get_file_url(file_key: str, expires: int = 3600, token: str = Depends(security)):
    """获取文件的访问URL"""
    if not check_oss_config():
        raise HTTPException(status_code=500, detail="OSS未配置")

    url = oss_storage.get_file_url(file_key, expires)

    if not url:
        raise HTTPException(status_code=404, detail="文件不存在或获取失败")

    return {
        "success": True,
        "url": url,
        "expires": expires
    }


@app.get('/api/v1/files/{file_key:path}/info')
async def get_file_info(file_key: str, token: str = Depends(security)):
    """获取文件信息"""
    if not check_oss_config():
        raise HTTPException(status_code=500, detail="OSS未配置")

    info = oss_storage.get_file_info(file_key)

    if not info:
        raise HTTPException(status_code=404, detail="文件不存在")

    return {
        "success": True,
        "file": info
    }


@app.post('/api/v1/user/avatar')
async def upload_avatar(
    file: bytes = File(...),
    filename: str = Form(...),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """上传头像并自动更新用户资料"""
    if not check_oss_config():
        raise HTTPException(status_code=500, detail="OSS未配置")

    # 检查文件大小（最大5MB）
    if len(file) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="头像文件大小不能超过5MB")

    # 检查文件类型（只允许图片）
    import imghdr
    file_type = imghdr.what(None, h=file)
    if file_type not in ['jpeg', 'jpg', 'png', 'gif', 'webp']:
        raise HTTPException(status_code=400, detail="只支持图片格式（jpeg, png, gif, webp）")

    # 获取用户ID
    try:
        token = credentials.credentials
        import jwt
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get('userId')
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

    # 获取当前用户信息
    current_user = db_client.table('users').select('avatar').eq('id', user_id).single().execute()
    old_avatar = current_user.data.get('avatar') if current_user.data else None

    # 如果有旧头像，先删除
    if old_avatar:
        try:
            if old_avatar.startswith('https://') or old_avatar.startswith('http://'):
                url_parts = old_avatar.split('/', 3)
                if len(url_parts) >= 4:
                    old_key = url_parts[3]
                    oss_storage.delete_file(old_key)
                    print(f"[Avatar] 已删除旧头像: {old_key}")
        except Exception as e:
            print(f"[Avatar] 删除旧头像失败: {e}")

    # 上传新头像（使用avatars文件夹）
    success, result = oss_storage.upload_file(file, filename, folder='avatars')

    if not success:
        raise HTTPException(status_code=500, detail=f"上传失败: {result.get('error')}")

    # 更新用户资料
    db_client.table('users').update({'avatar': result['url']}).eq('id', user_id).execute()

    return {
        "success": True,
        "message": "头像上传成功",
        "avatar": result
    }


# ========== APP下载页面 ==========

@app.get("/download", response_class=HTMLResponse)
async def app_download_page():
    """APP下载页面"""
    html_file = Path(__file__).parent / "download.html"
    with open(html_file, "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())


# ========== 主程序 ==========

if __name__ == '__main__':
    print("🚀 Starting Python backend server...")
    # 优先读取 SERVER_PORT（启动脚本设置），其次读取 PORT，默认使用 9091
    port = int(os.getenv('SERVER_PORT') or os.getenv('PORT') or '9091')
    print(f"📦 Port: {port}")
    print(f"🔗 ARK API Key: {'✅ Configured' if ARK_API_KEY else '❌ Not configured'}")
    print(f"🎤 Volcengine APP ID: {'✅ Configured' if VOLCENGINE_SPEECH_APP_ID else '❌ Not configured'}")
    print(f"🎤 Volcengine Access Token: {'✅ Configured' if VOLCENGINE_ACCESS_TOKEN else '❌ Not configured'}")
    print(f"🗄️  MySQL: {'✅ Configured' if db_client else '❌ Not configured'}")

    uvicorn.run(app, host="0.0.0.0", port=port)
