#!/bin/bash

# AI情绪日记前端 - 清理脚本

set -e

echo "=========================================="
echo "    AI情绪日记前端清理"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="/workspace/projects/client"
cd "$PROJECT_ROOT" || exit 1

# 删除重复的配置文档
echo "删除重复的配置文档..."

if [ -f "CONFIG_SUMMARY.md" ]; then
    rm CONFIG_SUMMARY.md
    echo -e "${GREEN}✓ 已删除 CONFIG_SUMMARY.md${NC}"
fi

if [ -f "DEPLOYMENT.md" ]; then
    rm DEPLOYMENT.md
    echo -e "${GREEN}✓ 已删除 DEPLOYMENT.md${NC}"
fi

if [ -f "DEPLOYMENT_CHECKLIST.md" ]; then
    rm DEPLOYMENT_CHECKLIST.md
    echo -e "${GREEN}✓ 已删除 DEPLOYMENT_CHECKLIST.md${NC}"
fi

if [ -f "APP_UPDATE_GUIDE.md" ]; then
    rm APP_UPDATE_GUIDE.md
    echo -e "${GREEN}✓ 已删除 APP_UPDATE_GUIDE.md${NC}"
fi

echo ""

# 保留的文档
echo "保留的文档："
echo "  - README.md (统一文档)"
echo "  - CONFIG.md (配置说明)"
echo ""

# 清理缓存
echo "清理缓存..."

if [ -d ".expo" ]; then
    rm -rf .expo
    echo -e "${GREEN}✓ 已清理 .expo 缓存${NC}"
fi

if [ -d "node_modules/.cache" ]; then
    rm -rf node_modules/.cache
    echo -e "${GREEN}✓ 已清理 node_modules/.cache${NC}"
fi

echo ""

# 清理构建产物
echo "清理构建产物..."

if [ -d "dist" ]; then
    rm -rf dist
    echo -e "${GREEN}✓ 已清理 dist 目录${NC}"
fi

if [ -d ".expo-shared" ]; then
    rm -rf .expo-shared
    echo -e "${GREEN}✓ 已清理 .expo-shared 目录${NC}"
fi

echo ""

# 统计文件
echo "文件统计："
echo "  TypeScript 文件: $(find . -name "*.ts" -o -name "*.tsx" | wc -l)"
echo "  JavaScript 文件: $(find . -name "*.js" -o -name "*.jsx" | wc -l)"
echo "  样式文件: $(find . -name "*.css" | wc -l)"
echo "  配置文件: $(find . -name "*.json" -o -name "*.config.*" | wc -l)"
echo ""

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✓ 清理完成${NC}"
echo -e "${GREEN}=========================================${NC}"
