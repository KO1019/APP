#!/bin/bash

# 一键构建Android APK脚本

echo "=========================================="
echo "  AI情绪日记 - 一键构建APK"
echo "=========================================="
echo ""

cd /workspace/projects/client || exit 1

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}[INFO]${NC} 检查构建环境..."

# 检查EAS CLI
if command -v eas &> /dev/null; then
    echo -e "${GREEN}✓${NC} EAS CLI已安装: $(eas --version)"
else
    echo -e "${YELLOW}⚠${NC} 正在安装EAS CLI..."
    npm install -g eas-cli
fi

# 检查eas.json
if [ -f "eas.json" ]; then
    echo -e "${GREEN}✓${NC} EAS配置文件存在"
else
    echo -e "${YELLOW}⚠${NC} EAS配置文件不存在"
    exit 1
fi

# 检查环境变量
if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} 环境变量配置存在"
else
    echo -e "${YELLOW}⚠${NC} 环境变量配置不存在"
    exit 1
fi

echo ""
echo -e "${BLUE}[INFO]${NC} 检查Expo登录状态..."

# 检查登录状态
if npx expo whoami &> /dev/null; then
    echo -e "${GREEN}✓${NC} 已登录Expo账户"
    npx expo whoami
    echo ""
    read -p "开始构建APK? (y/n): " START_BUILD
    if [ "$START_BUILD" != "y" ]; then
        echo "已取消"
        exit 0
    fi
else
    echo -e "${YELLOW}⚠${NC} 未登录Expo账户"
    echo ""
    echo "请先登录Expo账户:"
    echo "1. 访问 https://expo.dev 注册免费账户"
    echo "2. 运行命令: npx expo login"
    echo "3. 输入邮箱和密码登录"
    echo ""
    read -p "登录后按回车继续..."

    # 再次检查
    if ! npx expo whoami &> /dev/null; then
        echo -e "\033[0;31m[ERROR]${NC} 仍未登录，请先完成登录"
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}[INFO]${NC} 开始构建APK..."
echo ""

# 构建APK
npx eas build --platform android --profile preview

echo ""
echo -e "${GREEN}✓${NC} 构建完成！"
echo ""
echo "下一步："
echo "1. 访问 https://expo.dev"
echo "2. 进入你的项目页面"
echo "3. 点击Builds标签"
echo "4. 下载生成的APK文件"
