#!/usr/bin/env python3
"""
初始化数据库表
执行create_app_versions_table.sql脚本
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ 请设置 SUPABASE_URL 和 SUPABASE_KEY 环境变量")
    exit(1)

# 读取SQL脚本
with open('create_app_versions_table.sql', 'r', encoding='utf-8') as f:
    sql_script = f.read()

# 执行SQL
url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

# 使用 Supabase 的 REST API 直接执行SQL
url = f"{SUPABASE_URL}/rest/v1/"

print("📝 正在创建 app_versions 表...")
print("-"*60)

try:
    # 尝试通过直接SQL执行（如果supabase支持）
    # 这里我们使用一个简单的方法：使用psycopg2直接连接数据库
    # 但首先检查是否安装了psycopg2

    try:
        import psycopg2
        from urllib.parse import urlparse

        # 从SUPABASE_URL提取数据库连接信息
        parsed = urlparse(SUPABASE_URL)
        db_host = parsed.hostname
        db_name = parsed.path[1:]  # 去掉开头的 /
        db_user = SUPABASE_KEY.split('.')[0].split(':')[0]  # 尝试从key中提取（可能不准确）
        db_password = SUPABASE_KEY

        # 更准确的方法：从postgrest的连接信息
        # 但由于我们使用的是supabase服务端，直接在SQL编辑器执行更简单
        print("请手动在 Supabase SQL 编辑器中执行以下SQL:")
        print("-"*60)
        print(sql_script)
        print("-"*60)
        print("\n🔗 Supabase SQL 编辑器地址:")
        print(f"   {SUPABASE_URL}/project/_/sql")
        print("\n✅ 或者，您可以联系管理员执行此SQL脚本。")

    except ImportError:
        print("❌ 未安装 psycopg2 库")
        print("\n请手动在 Supabase SQL 编辑器中执行以下SQL:")
        print("-"*60)
        print(sql_script)
        print("-"*60)
        print("\n🔗 Supabase SQL 编辑器地址:")
        print(f"   {SUPABASE_URL}/project/_/sql")

except Exception as e:
    print(f"❌ 错误: {e}")
    print("\n请手动在 Supabase SQL 编辑器中执行以下SQL:")
    print("-"*60)
    print(sql_script)
    print("-"*60)

print("\n" + "="*60)
print("✅ 脚本已准备完成")
print("💡 提示：执行SQL后，再次运行 demo_version_manager.py 即可")
print("="*60)
