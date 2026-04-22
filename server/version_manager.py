#!/usr/bin/env python3
"""
版本管理器工具
用于管理APP版本和推送版本更新
"""

import os
import sys
from datetime import datetime

# 导入环境变量
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ 请设置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 环境变量")
    sys.exit(1)

import requests

BASE_URL = "http://localhost:9091"


def print_menu():
    """打印菜单"""
    print("\n" + "="*50)
    print("📦 版本管理器")
    print("="*50)
    print("1. 创建新版本")
    print("2. 查看所有版本")
    print("3. 查看指定版本详情")
    print("4. 更新版本信息")
    print("5. 删除版本")
    print("6. 激活版本（推送给用户）")
    print("7. 查看当前激活的版本")
    print("0. 退出")
    print("="*50)


def create_version():
    """创建新版本"""
    print("\n📝 创建新版本")

    version = input("版本号 (如 1.0.1): ").strip()
    if not version:
        print("❌ 版本号不能为空")
        return

    build_number = input("构建号 (如 101): ").strip()
    if not build_number:
        print("❌ 构建号不能为空")
        return

    print("\n选择平台:")
    print("1. Android")
    print("2. iOS")
    platform_choice = input("请选择 (1/2): ").strip()
    if platform_choice == '1':
        platform = 'android'
    elif platform_choice == '2':
        platform = 'ios'
    else:
        print("❌ 无效的选择")
        return

    print("\n更新类型:")
    print("1. 可选更新（用户可以选择稍后更新）")
    print("2. 强制更新（用户必须更新才能使用）")
    force_choice = input("请选择 (1/2): ").strip()
    force_update = force_choice == '2'

    print("\n请输入更新说明（多行输入，输入空行结束）:")
    release_notes_lines = []
    while True:
        line = input().strip()
        if not line:
            break
        release_notes_lines.append(line)
    release_notes = "\n".join(release_notes_lines)

    if not release_notes:
        print("❌ 更新说明不能为空")
        return

    update_url = input("更新包URL (可选，按Enter跳过): ").strip()

    # 发送请求
    data = {
        "version": version,
        "build_number": int(build_number),
        "platform": platform,
        "force_update": force_update,
        "release_notes": release_notes,
        "update_url": update_url if update_url else None
    }

    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/admin/versions",
            json=data
        )

        if response.status_code == 200:
            print("✅ 版本创建成功!")
            print(f"   版本: {version}")
            print(f"   平台: {platform}")
            print(f"   强制更新: {'是' if force_update else '否'}")
        else:
            print(f"❌ 创建失败: {response.json().get('detail', '未知错误')}")
    except Exception as e:
        print(f"❌ 请求失败: {e}")


def list_versions():
    """列出所有版本"""
    print("\n📋 所有版本")

    # 选择平台
    print("\n选择平台:")
    print("1. Android")
    print("2. iOS")
    print("3. 所有平台")
    platform_choice = input("请选择 (1/2/3): ").strip()

    params = {}
    if platform_choice == '1':
        params['platform'] = 'android'
    elif platform_choice == '2':
        params['platform'] = 'ios'

    try:
        response = requests.get(
            f"{BASE_URL}/api/v1/admin/versions",
            params=params
        )

        if response.status_code == 200:
            versions = response.json().get('versions', [])

            if not versions:
                print("没有找到版本")
                return

            for i, v in enumerate(versions, 1):
                print(f"\n{i}. 版本 {v['version']} (构建号: {v['build_number']})")
                print(f"   平台: {v['platform']}")
                print(f"   状态: {'🟢 已激活' if v['is_active'] else '⚪ 未激活'}")
                print(f"   类型: {'🔴 强制更新' if v['force_update'] else '🟢 可选更新'}")
                print(f"   发布日期: {v['release_date']}")
                print(f"   更新说明:")
                for line in v['release_notes'].split('\n'):
                    print(f"      {line}")
        else:
            print(f"❌ 获取失败: {response.json().get('detail', '未知错误')}")
    except Exception as e:
        print(f"❌ 请求失败: {e}")


def show_version_detail():
    """显示版本详情"""
    print("\n📄 版本详情")

    version_id = input("请输入版本ID: ").strip()
    if not version_id:
        print("❌ 版本ID不能为空")
        return

    try:
        response = requests.get(
            f"{BASE_URL}/api/v1/admin/versions/{version_id}"
        )

        if response.status_code == 200:
            v = response.json().get('version')

            print(f"\n版本 {v['version']} (构建号: {v['build_number']})")
            print(f"ID: {v['id']}")
            print(f"平台: {v['platform']}")
            print(f"状态: {'🟢 已激活' if v['is_active'] else '⚪ 未激活'}")
            print(f"类型: {'🔴 强制更新' if v['force_update'] else '🟢 可选更新'}")
            print(f"发布日期: {v['release_date']}")
            print(f"更新包URL: {v.get('update_url', '未设置')}")
            print(f"\n更新说明:")
            for line in v['release_notes'].split('\n'):
                print(f"   {line}")
        elif response.status_code == 404:
            print("❌ 版本不存在")
        else:
            print(f"❌ 获取失败: {response.json().get('detail', '未知错误')}")
    except Exception as e:
        print(f"❌ 请求失败: {e}")


def update_version():
    """更新版本"""
    print("\n✏️  更新版本")

    version_id = input("请输入版本ID: ").strip()
    if not version_id:
        print("❌ 版本ID不能为空")
        return

    # 先获取当前版本信息
    try:
        response = requests.get(
            f"{BASE_URL}/api/v1/admin/versions/{version_id}"
        )

        if response.status_code != 200:
            print("❌ 版本不存在")
            return

        current_version = response.json().get('version')
        print(f"\n当前版本信息:")
        print(f"   版本号: {current_version['version']}")
        print(f"   构建号: {current_version['build_number']}")
        print(f"   强制更新: {'是' if current_version['force_update'] else '否'}")
        print(f"   更新说明: {current_version['release_notes'][:50]}...")

    except Exception as e:
        print(f"❌ 请求失败: {e}")
        return

    # 获取更新数据
    data = {}

    new_version = input(f"\n新版本号 (留空保持不变 [{current_version['version']}]): ").strip()
    if new_version:
        data['version'] = new_version

    new_build_number = input(f"新构建号 (留空保持不变 [{current_version['build_number']}]): ").strip()
    if new_build_number:
        data['build_number'] = int(new_build_number)

    force_choice = input(f"强制更新 (留空保持不变, y/n): ").strip().lower()
    if force_choice == 'y':
        data['force_update'] = True
    elif force_choice == 'n':
        data['force_update'] = False

    print("\n新更新说明 (留空保持不变，多行输入，输入空行结束):")
    release_notes_lines = []
    while True:
        line = input().strip()
        if not line:
            break
        release_notes_lines.append(line)

    if release_notes_lines:
        data['release_notes'] = "\n".join(release_notes_lines)

    new_update_url = input(f"新更新包URL (留空保持不变): ").strip()
    if new_update_url:
        data['update_url'] = new_update_url

    if not data:
        print("没有更新任何信息")
        return

    # 发送请求
    try:
        response = requests.put(
            f"{BASE_URL}/api/v1/admin/versions/{version_id}",
            json=data
        )

        if response.status_code == 200:
            print("✅ 版本更新成功!")
        else:
            print(f"❌ 更新失败: {response.json().get('detail', '未知错误')}")
    except Exception as e:
        print(f"❌ 请求失败: {e}")


def delete_version():
    """删除版本"""
    print("\n🗑️  删除版本")

    version_id = input("请输入版本ID: ").strip()
    if not version_id:
        print("❌ 版本ID不能为空")
        return

    # 确认删除
    confirm = input("确定要删除此版本吗? (y/n): ").strip().lower()
    if confirm != 'y':
        print("已取消删除")
        return

    try:
        response = requests.delete(
            f"{BASE_URL}/api/v1/admin/versions/{version_id}"
        )

        if response.status_code == 200:
            print("✅ 版本删除成功!")
        elif response.status_code == 404:
            print("❌ 版本不存在")
        else:
            print(f"❌ 删除失败: {response.json().get('detail', '未知错误')}")
    except Exception as e:
        print(f"❌ 请求失败: {e}")


def activate_version():
    """激活版本（推送给用户）"""
    print("\n🚀 激活版本（推送给用户）")

    version_id = input("请输入版本ID: ").strip()
    if not version_id:
        print("❌ 版本ID不能为空")
        return

    # 获取版本信息
    try:
        response = requests.get(
            f"{BASE_URL}/api/v1/admin/versions/{version_id}"
        )

        if response.status_code != 200:
            print("❌ 版本不存在")
            return

        version = response.json().get('version')
        print(f"\n版本信息:")
        print(f"   版本号: {version['version']}")
        print(f"   平台: {version['platform']}")
        print(f"   强制更新: {'是' if version['force_update'] else '否'}")
        print(f"\n更新说明:")
        for line in version['release_notes'].split('\n')[:3]:
            print(f"   {line}")

    except Exception as e:
        print(f"❌ 请求失败: {e}")
        return

    # 确认激活
    print("\n⚠️  警告: 激活此版本后，所有用户都会收到更新通知！")
    confirm = input("确定要激活此版本吗? (y/n): ").strip().lower()
    if confirm != 'y':
        print("已取消激活")
        return

    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/admin/versions/{version_id}/activate"
        )

        if response.status_code == 200:
            print("✅ 版本激活成功!")
            print(f"   用户将收到版本 {version['version']} 的更新通知")
        else:
            print(f"❌ 激活失败: {response.json().get('detail', '未知错误')}")
    except Exception as e:
        print(f"❌ 请求失败: {e}")


def show_active_versions():
    """显示当前激活的版本"""
    print("\n✅ 当前激活的版本")

    try:
        response = requests.get(
            f"{BASE_URL}/api/v1/admin/versions/active"
        )

        if response.status_code == 200:
            versions = response.json().get('versions', [])

            if not versions:
                print("没有激活的版本")
                return

            for v in versions:
                print(f"\n平台: {v['platform'].upper()}")
                print(f"版本: {v['version']} (构建号: {v['build_number']})")
                print(f"类型: {'🔴 强制更新' if v['force_update'] else '🟢 可选更新'}")
                print(f"激活时间: {v['updated_at']}")
                print(f"\n更新说明:")
                for line in v['release_notes'].split('\n')[:3]:
                    print(f"   {line}")
        else:
            print(f"❌ 获取失败: {response.json().get('detail', '未知错误')}")
    except Exception as e:
        print(f"❌ 请求失败: {e}")


def main():
    """主函数"""
    print("🚀 版本管理器工具")
    print(f"连接到: {BASE_URL}")

    while True:
        print_menu()
        choice = input("请选择操作 (0-7): ").strip()

        if choice == '1':
            create_version()
        elif choice == '2':
            list_versions()
        elif choice == '3':
            show_version_detail()
        elif choice == '4':
            update_version()
        elif choice == '5':
            delete_version()
        elif choice == '6':
            activate_version()
        elif choice == '7':
            show_active_versions()
        elif choice == '0':
            print("👋 再见!")
            break
        else:
            print("❌ 无效的选择，请重新输入")


if __name__ == '__main__':
    main()
