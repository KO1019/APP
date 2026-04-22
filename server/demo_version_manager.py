#!/usr/bin/env python3
"""
版本管理器示例脚本
自动演示版本管理器的功能
"""

import os
import sys
import requests

# 导入环境变量
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "http://localhost:9091"

print("🚀 版本管理器示例脚本")
print("="*60)

# 1. 创建一个新版本
print("\n📝 步骤1: 创建新版本")
print("-"*60)

data = {
    "version": "1.0.2",  # 改为1.0.2
    "build_number": 102,  # 改为102
    "platform": "android",
    "force_update": True,  # 改为强制更新，演示不同场景
    "release_notes": """1. 新增版本管理器功能
2. 支持强制更新和可选更新
3. 美观的更新对话框UI
4. 详细的更新说明展示
5. 支持下次继续功能""",
    "update_url": "https://u.expo.dev/example-update-url-v2"
}

try:
    response = requests.post(
        f"{BASE_URL}/api/v1/admin/versions",
        json=data
    )

    if response.status_code == 200:
        print("✅ 版本创建成功!")
        version = response.json().get('version')
        print(f"   版本ID: {version['id']}")
        print(f"   版本号: {version['version']}")
        print(f"   平台: {version['platform']}")
        print(f"   强制更新: {'是' if version['force_update'] else '否'}")
        version_id = version['id']
    else:
        print(f"❌ 创建失败: {response.json().get('detail', '未知错误')}")
        sys.exit(1)
except Exception as e:
    print(f"❌ 请求失败: {e}")
    sys.exit(1)

# 2. 查看所有版本
print("\n📋 步骤2: 查看所有版本")
print("-"*60)

try:
    response = requests.get(
        f"{BASE_URL}/api/v1/admin/versions",
        params={'platform': 'android'}
    )

    if response.status_code == 200:
        versions = response.json().get('versions', [])
        print(f"找到 {len(versions)} 个Android版本:")
        for i, v in enumerate(versions, 1):
            print(f"\n{i}. 版本 {v['version']} (构建号: {v['build_number']})")
            print(f"   ID: {v['id']}")
            print(f"   状态: {'🟢 已激活' if v['is_active'] else '⚪ 未激活'}")
            print(f"   类型: {'🔴 强制更新' if v['force_update'] else '🟢 可选更新'}")
    else:
        print(f"❌ 获取失败: {response.json().get('detail', '未知错误')}")
except Exception as e:
    print(f"❌ 请求失败: {e}")

# 3. 激活版本（推送给用户）
print("\n🚀 步骤3: 激活版本（推送给用户）")
print("-"*60)

try:
    response = requests.post(
        f"{BASE_URL}/api/v1/admin/versions/{version_id}/activate"
    )

    if response.status_code == 200:
        print("✅ 版本激活成功!")
        print(f"   用户将收到版本 1.0.2 的更新通知")
    else:
        print(f"❌ 激活失败: {response.json().get('detail', '未知错误')}")
except Exception as e:
    print(f"❌ 请求失败: {e}")

# 4. 查看当前激活的版本
print("\n✅ 步骤4: 查看当前激活的版本")
print("-"*60)

try:
    response = requests.get(
        f"{BASE_URL}/api/v1/admin/versions/active"
    )

    if response.status_code == 200:
        versions = response.json().get('versions', [])

        for v in versions:
            print(f"\n平台: {v['platform'].upper()}")
            print(f"版本: {v['version']} (构建号: {v['build_number']})")
            print(f"ID: {v['id']}")
            print(f"类型: {'🔴 强制更新' if v['force_update'] else '🟢 可选更新'}")
            print(f"激活时间: {v['updated_at']}")
            print(f"\n更新说明:")
            for line in v['release_notes'].split('\n')[:5]:
                print(f"   {line}")
            if len(v['release_notes'].split('\n')) > 5:
                print("   ...")
    else:
        print(f"❌ 获取失败: {response.json().get('detail', '未知错误')}")
except Exception as e:
    print(f"❌ 请求失败: {e}")

# 5. 测试检查更新API
print("\n📱 步骤5: 测试检查更新API")
print("-"*60)

try:
    response = requests.post(
        f"{BASE_URL}/api/v1/app/check-update",
        json={
            "platform": "android",
            "current_version": "1.0.0",
            "build_number": 100
        }
    )

    if response.status_code == 200:
        data = response.json()
        print(f"检查结果:")
        print(f"   有更新: {'是' if data['has_update'] else '否'}")
        print(f"   当前版本: {data['current_version']}")
        print(f"   最新版本: {data['latest_version']}")
        print(f"   强制更新: {'是' if data['force_update'] else '否'}")
        if data['has_update']:
            print(f"\n更新说明:")
            for line in data['release_notes'].split('\n')[:5]:
                print(f"   {line}")
    else:
        print(f"❌ 检查失败: {response.json().get('detail', '未知错误')}")
except Exception as e:
    print(f"❌ 请求失败: {e}")

print("\n" + "="*60)
print("✅ 演示完成！")
print("\n💡 使用说明:")
print("   - 运行 'python3 version_manager.py' 进入交互式版本管理器")
print("   - 可以创建、查看、更新、删除、激活版本")
print("   - 激活版本后，用户APP会收到更新通知")
print("="*60)
