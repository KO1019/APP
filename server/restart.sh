#!/bin/bash

# AI情绪日记 - 重启服务脚本

set -e

PROJECT_ROOT="/workspace/projects/server"
cd "$PROJECT_ROOT" || exit 1

echo "=== 重启AI情绪日记服务 ==="

# 停止服务
./stop.sh

echo ""
echo "等待服务完全停止..."
sleep 3

# 启动服务
./deploy.sh

echo ""
echo "=== 重启完成 ==="
