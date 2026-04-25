#!/usr/bin/env python3
"""创建管理员账号"""
from passlib.context import CryptContext
from dotenv import load_dotenv
from db_adapter import db_client

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 管理员账号信息
admin_username = "admin"
admin_password = "admin123"
admin_email = "admin@example.com"
admin_nickname = "系统管理员"

# 生成密码哈希
password_hash = pwd_context.hash(admin_password)

print(f"创建管理员账号...")
print(f"用户名: {admin_username}")
print(f"密码: {admin_password}")
print(f"邮箱: {admin_email}")
print(f"密码哈希: {password_hash}")

# 检查是否已存在管理员账号
if db_client:
    existing = db_client.table('users').select('*').eq('username', admin_username).execute()
    if existing.data:
        print(f"\n管理员账号已存在，更新密码哈希...")
        db_client.table('users').update({
            'password_hash': password_hash,
            'email': admin_email,
            'nickname': admin_nickname,
            'is_admin': True,
            'is_active': True
        }).eq('username', admin_username).execute()
        print(f"管理员账号已更新！")
    else:
        print(f"\n创建新管理员账号...")
        import uuid
        db_client.table('users').insert({
            'id': str(uuid.uuid4()),
            'username': admin_username,
            'password_hash': password_hash,
            'email': admin_email,
            'nickname': admin_nickname,
            'is_admin': True,
            'is_active': True,
            'cloud_sync_enabled': True,
            'data_encryption_enabled': True,
            'anonymous_analytics': False
        }).execute()
        print(f"管理员账号已创建！")
else:
    print("数据库未配置，无法创建管理员账号")
