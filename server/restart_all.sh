#!/bin/bash
# 同时重启后端服务和管理后台

set -e

# 颜色定义
GREEN='\033[0;32m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

# 主函数
main() {
    echo ""
    echo "======================================"
    echo "  AI 情绪日记系统 - 重启所有服务"
    echo "======================================"
    echo ""

    # 切换到脚本所在目录
    cd "$(dirname "$0")"

    # 停止所有服务
    print_info "正在停止所有服务..."
    ./stop_all.sh

    # 等待一秒
    sleep 1

    # 启动所有服务
    print_info "正在启动所有服务..."
    ./start_all.sh
}

# 运行主函数
main
