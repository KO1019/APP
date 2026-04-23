#!/usr/bin/env python3
"""创建默认管理员账号"""

import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from passlib.context import CryptContext
import mysql.connector
from mysql.connector import Error
import uuid

# 密码加密配置
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """密码加密"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return pwd_context.verify(plain_password, hashed_password)

def get_db_connection():
    """获取数据库连接"""
    try:
        connection = mysql.connector.connect(
            host=os.getenv('MYSQL_HOST', 'localhost'),
            port=int(os.getenv('MYSQL_PORT', 3306)),
            user=os.getenv('MYSQL_USER', 'root'),
            password=os.getenv('MYSQL_PASSWORD', ''),
            database=os.getenv('MYSQL_DATABASE', 'ai_emotion_diary')
        )
        if connection.is_connected():
            return connection
    except Error as e:
        print(f"数据库连接错误: {e}")
        sys.exit(1)
    return None

def create_admin_user():
    """创建默认管理员账号"""
    connection = get_db_connection()
    if not connection:
        print("无法连接到数据库")
        sys.exit(1)

    cursor = connection.cursor(dictionary=True)

    try:
        # 检查是否已存在管理员账号
        cursor.execute("SELECT * FROM users WHERE username = 'admin'")
        existing_user = cursor.fetchone()

        if existing_user:
            print(f"管理员账号已存在: {existing_user['username']}")
            print(f"ID: {existing_user['id']}")
            print(f"邮箱: {existing_user.get('email', 'N/A')}")
            return

        # 生成密码哈希
        admin_password = "admin123"
        hashed_password = hash_password(admin_password)

        # 创建管理员账号
        admin_id = str(uuid.uuid4())
        insert_query = """
        INSERT INTO users (id, username, password_hash, email, nickname, is_admin, is_active, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
        """
        cursor.execute(insert_query, (
            admin_id,
            'admin',
            hashed_password,
            'admin@example.com',
            '系统管理员',
            1,  # is_admin
            1   # is_active
        ))

        connection.commit()
        print("✅ 默认管理员账号创建成功！")
        print(f"   用户名: admin")
        print(f"   密码: {admin_password}")
        print(f"   邮箱: admin@example.com")
        print(f"   请立即登录后修改密码！")

    except Error as e:
        print(f"创建管理员账号时出错: {e}")
        connection.rollback()
        sys.exit(1)
    finally:
        cursor.close()
        connection.close()

if __name__ == "__main__":
    create_admin_user()
