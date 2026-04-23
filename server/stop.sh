#!/bin/bash

# AI情绪日记 - 停止服务脚本

set -e

PROJECT_ROOT="/workspace/projects/server"
cd "$PROJECT_ROOT" || exit 1

echo "=== 停止AI情绪日记服务 ==="

# 停止后端服务
if [ -f "logs/app.pid" ]; then
    PID=$(cat logs/app.pid)
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "停止后端服务 (PID: $PID)..."
        kill "$PID"
        sleep 2

        # 强制停止（如果还在运行）
        if ps -p "$PID" > /dev/null 2>&1; then
            echo "强制停止..."
            kill -9 "$PID"
        fi

        echo "✓ 后端服务已停止"
    else
        echo "✓ 后端服务未运行"
    fi
    rm -f logs/app.pid
else
    echo "✓ 后端服务未运行"
fi

# 停止Nginx（可选）
if [ "$1" == "--with-nginx" ]; then
    echo "停止Nginx..."
    if command -v nginx &> /dev/null; then
        service nginx stop 2>/dev/null || nginx -s stop 2>/dev/null || true
        echo "✓ Nginx已停止"
    else
        echo "✓ Nginx未安装"
    fi
fi

echo "=== 停止完成 ==="
