#!/bin/bash
# 阿里云后端服务停止脚本

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
    echo "  AI 情绪日记后端服务停止脚本"
    echo "======================================"
    echo ""

    # 切换到脚本所在目录
    cd "$(dirname "$0")"

    # 检查 PID 文件
    if [ ! -f "server.pid" ]; then
        print_warn "未找到 PID 文件，尝试查找进程..."
        PID=$(pgrep -f "python main.py" || true)
    else
        PID=$(cat server.pid)
    fi

    # 如果没有找到进程
    if [ -z "$PID" ]; then
        print_info "服务未运行"
        exit 0
    fi

    # 停止服务
    print_info "正在停止服务 (PID: $PID)..."
    kill $PID

    # 等待进程结束
    for i in {1..10}; do
        if ! ps -p $PID > /dev/null 2>&1; then
            print_info "服务已停止 ✓"
            rm -f server.pid
            exit 0
        fi
        echo -n "."
        sleep 1
    done

    # 如果进程仍未结束，强制终止
    print_warn "服务未响应，强制终止..."
    kill -9 $PID
    rm -f server.pid
    print_info "服务已强制停止 ✓"
    echo ""
}

# 运行主函数
main
