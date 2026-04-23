#!/bin/bash
# 停止后端服务和管理后台

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印函数
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 主函数
main() {
    echo ""
    echo "======================================"
    echo "  停止所有服务"
    echo "======================================"
    echo ""

    # 切换到脚本所在目录
    cd "$(dirname "$0")"

    # 停止后端服务
    if [ -f "logs/backend.pid" ]; then
        BACKEND_PID=$(cat logs/backend.pid)
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            print_info "停止后端服务 (PID: $BACKEND_PID)..."
            kill $BACKEND_PID
            for i in {1..10}; do
                if ! ps -p $BACKEND_PID > /dev/null 2>&1; then
                    print_info "后端服务已停止 ✓"
                    break
                fi
                echo -n "."
                sleep 1
            done
            if ps -p $BACKEND_PID > /dev/null 2>&1; then
                kill -9 $BACKEND_PID
            fi
        fi
        rm -f logs/backend.pid
    fi

    # 停止管理后台
    if [ -f "logs/admin.pid" ]; then
        ADMIN_PID=$(cat logs/admin.pid)
        if ps -p $ADMIN_PID > /dev/null 2>&1; then
            print_info "停止管理后台 (PID: $ADMIN_PID)..."
            kill $ADMIN_PID
            for i in {1..10}; do
                if ! ps -p $ADMIN_PID > /dev/null 2>&1; then
                    print_info "管理后台已停止 ✓"
                    break
                fi
                echo -n "."
                sleep 1
            done
            if ps -p $ADMIN_PID > /dev/null 2>&1; then
                kill -9 $ADMIN_PID
            fi
        fi
        rm -f logs/admin.pid
    fi

    # 清理残留进程
    pkill -9 -f "python main.py" 2>/dev/null || true
    pkill -9 -f "version_manager_web.py" 2>/dev/null || true

    echo ""
    print_info "所有服务已停止！"
    echo ""
}

# 运行主函数
main
