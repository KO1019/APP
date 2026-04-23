#!/bin/bash

# AI情绪日记前端 - 检查脚本

set -e

echo "=========================================="
echo "    AI情绪日记前端检查"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查计数
PASS=0
FAIL=0
WARN=0

# 项目根目录
PROJECT_ROOT="/workspace/projects/client"
cd "$PROJECT_ROOT" || exit 1

# 检查函数
check_file() {
    local name="$1"
    local file="$2"

    echo -n "检查 $name ... "

    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC}"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗${NC}"
        ((FAIL++))
        return 1
    fi
}

check_dir() {
    local name="$1"
    local dir="$2"

    echo -n "检查目录 $name ... "

    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓${NC}"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗${NC}"
        ((FAIL++))
        return 1
    fi
}

# 1. 检查项目文件
echo "=== 1. 项目文件检查 ==="

check_file "package.json" "package.json"
check_file "app.config.ts" "app.config.ts"
check_file "tsconfig.json" "tsconfig.json"
check_file ".env.production" ".env.production"
check_file ".gitignore" ".gitignore"

echo ""

# 2. 检查目录结构
echo "=== 2. 目录结构检查 ==="

check_dir "app目录" "app"
check_dir "components目录" "components"
check_dir "contexts目录" "contexts"
check_dir "config目录" "config"
check_dir "assets目录" "assets"
check_dir "screens目录" "screens"

echo ""

# 3. 检查核心文件
echo "=== 3. 核心文件检查 ==="

check_file "主布局" "app/_layout.tsx"
check_file "首页" "app/(tabs)/index.tsx"
check_file "Chat页面" "app/(tabs)/chat.tsx"
check_file "Profile页面" "app/(tabs)/profile.tsx"
check_file "Stats页面" "app/(tabs)/stats.tsx"
check_file "登录页" "app/login.tsx"
check_file "注册页" "app/register.tsx"
check_file "写日记页" "app/write-diary.tsx"
check_file "日记详情页" "app/diary-detail.tsx"

echo ""

# 4. 检查环境配置
echo "=== 4. 环境配置检查 ==="

echo -n "检查 .env.production 配置 ... "
if grep -q "EXPO_PUBLIC_BACKEND_BASE_URL" .env.production; then
    BACKEND_URL=$(grep "EXPO_PUBLIC_BACKEND_BASE_URL" .env.production | cut -d '=' -f2)
    if [ -n "$BACKEND_URL" ]; then
        echo -e "${GREEN}✓${NC} ($BACKEND_URL)"
        ((PASS++))
    else
        echo -e "${RED}✗ (未配置)${NC}"
        ((FAIL++))
    fi
else
    echo -e "${RED}✗ (未找到配置项)${NC}"
    ((FAIL++))
fi

echo ""

# 5. 检查图标资源
echo "=== 5. 图标资源检查 ==="

check_file "应用图标" "assets/images/icon.png"
check_file "启动图标" "assets/images/splash-icon.png"
check_file "Favicon" "assets/images/favicon.png"
check_file "自适应图标" "assets/images/adaptive-icon.png"

echo ""

# 6. 检查依赖
echo "=== 6. 依赖检查 ==="

if command -v node &> /dev/null; then
    echo -e "检查 Node.js ... ${GREEN}✓${NC} ($(node --version))"
    ((PASS++))
else
    echo -e "检查 Node.js ... ${RED}✗${NC}"
    ((FAIL++))
fi

if command -v npm &> /dev/null; then
    echo -e "检查 npm ... ${GREEN}✓${NC} ($(npm --version))"
    ((PASS++))
else
    echo -e "检查 npm ... ${RED}✗${NC}"
    ((FAIL++))
fi

if [ -d "node_modules" ]; then
    echo -e "检查 node_modules ... ${GREEN}✓${NC}"
    ((PASS++))
else
    echo -e "检查 node_modules ... ${RED}✗ (未安装)${NC}"
    ((WARN++))
fi

echo ""

# 7. 检查路由配置
echo "=== 7. 路由配置检查 ==="

echo -n "检查 Tab 导航 ... "
if [ -f "app/(tabs)/_layout.tsx" ]; then
    echo -e "${GREEN}✓${NC}"
    ((PASS++))
else
    echo -e "${RED}✗${NC}"
    ((FAIL++))
fi

echo -n "检查页面路由 ... "
if [ -f "app/_layout.tsx" ]; then
    echo -e "${GREEN}✓${NC}"
    ((PASS++))
else
    echo -e "${RED}✗${NC}"
    ((FAIL++))
fi

echo ""

# 8. 检查类型定义
echo "=== 8. 类型定义检查 ==="

if [ -f "declarations.d.ts" ]; then
    echo -e "检查 declarations.d.ts ... ${GREEN}✓${NC}"
    ((PASS++))
else
    echo -e "检查 declarations.d.ts ... ${YELLOW}⚠ (不存在)${NC}"
    ((WARN++))
fi

if [ -f "expo-env.d.ts" ]; then
    echo -e "检查 expo-env.d.ts ... ${GREEN}✓${NC}"
    ((PASS++))
else
    echo -e "检查 expo-env.d.ts ... ${YELLOW}⚠ (不存在)${NC}"
    ((WARN++))
fi

echo ""

# 总结
echo "=== 检查结果总结 ==="
echo ""
echo -e "通过: ${GREEN}$PASS${NC}"
echo -e "失败: ${RED}$FAIL${NC}"
echo -e "警告: ${YELLOW}$WARN${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ 所有检查通过！前端项目状态良好。${NC}"
    echo ""
    echo "下一步："
    echo "1. 安装依赖: npm install"
    echo "2. 启动开发服务器: npm start"
    echo "3. 或构建Web版本: npm run web"
    exit 0
else
    echo -e "${RED}✗ 发现 $FAIL 个问题，请检查以上错误。${NC}"
    exit 1
fi
