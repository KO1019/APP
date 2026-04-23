#!/bin/bash
# 同时停止后端服务和管理后台

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
    echo "  AI 情绪日记系统 - 停止所有服务"
    echo "======================================"
    echo ""

    # 切换到脚本所在目录
    cd "$(dirname "$0")"

    # 停止后端服务
    if [ -f "logs/backend.pid" ]; then
        BACKEND_PID=$(cat logs/backend.pid)
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            print_info "正在停止后端服务 (PID: $BACKEND_PID)..."
            kill $BACKEND_PID

            # 等待进程结束
            for i in {1..10}; do
                if ! ps -p $BACKEND_PID > /dev/null 2>&1; then
                    print_info "后端服务已停止 ✓"
                    break
                fi
                echo -n "."
                sleep 1
            done

            # 如果进程仍未结束，强制终止
            if ps -p $BACKEND_PID > /dev/null 2>&1; then
                print_warn "后端服务未响应，强制终止..."
                kill -9 $BACKEND_PID
                print_info "后端服务已强制停止 ✓"
            fi
        else
            print_warn "后端服务未运行"
        fi
        rm -f logs/backend.pid
    else
        # 尝试通过进程名查找
        PID=$(pgrep -f "python main.py" || true)
        if [ -n "$PID" ]; then
            print_info "正在停止后端服务 (PID: $PID)..."
            kill $PID
            sleep 2
            if ps -p $PID > /dev/null 2>&1; then
                kill -9 $PID
            fi
            print_info "后端服务已停止 ✓"
        else
            print_warn "未找到运行中的后端服务"
        fi
    fi

    echo ""

    # 停止管理后台
    if [ -f "logs/admin.pid" ]; then
        ADMIN_PID=$(cat logs/admin.pid)
        if ps -p $ADMIN_PID > /dev/null 2>&1; then
            print_info "正在停止管理后台 (PID: $ADMIN_PID)..."
            kill $ADMIN_PID

            # 等待进程结束
            for i in {1..10}; do
                if ! ps -p $ADMIN_PID > /dev/null 2>&1; then
                    print_info "管理后台已停止 ✓"
                    break
                fi
                echo -n "."
                sleep 1
            done

            # 如果进程仍未结束，强制终止
            if ps -p $ADMIN_PID > /dev/null 2>&1; then
                print_warn "管理后台未响应，强制终止..."
                kill -9 $ADMIN_PID
                print_info "管理后台已强制停止 ✓"
            fi
        else
            print_warn "管理后台未运行"
        fi
        rm -f logs/admin.pid
    else
        # 尝试通过进程名查找
        PID=$(pgrep -f "version_manager_web.py" || true)
        if [ -n "$PID" ]; then
            print_info "正在停止管理后台 (PID: $PID)..."
            kill $PID
            sleep 2
            if ps -p $PID > /dev/null 2>&1; then
                kill -9 $PID
            fi
            print_info "管理后台已停止 ✓"
        else
            print_warn "未找到运行中的管理后台"
        fi
    fi

    echo ""
    echo "======================================"
    print_info "所有服务已停止！"
    echo "======================================"
    echo ""
}

# 运行主函数
main
