#!/usr/bin/env python3
"""
测试supabase客户端查询
"""

import os
import sys
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

print(f"SUPABASE_URL: {SUPABASE_URL}")
print(f"SUPABASE_KEY: {SUPABASE_KEY[:20]}...")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("\n查询 app_versions 表:")
result = supabase.table('app_versions').select('*').eq('platform', 'android').eq('is_active', True).execute()
print(f"结果: {result.data}")

print("\n查询所有 app_versions:")
result2 = supabase.table('app_versions').select('*').execute()
print(f"结果数量: {len(result2.data)}")
for v in result2.data:
    print(f"  - 版本 {v['version']}, 平台 {v['platform']}, 激活: {v['is_active']}")
