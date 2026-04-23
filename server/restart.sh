#!/bin/bash
# 阿里云后端服务重启脚本

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
    echo "  AI 情绪日记后端服务重启脚本"
    echo "======================================"
    echo ""

    # 切换到脚本所在目录
    cd "$(dirname "$0")"

    # 停止服务
    print_info "正在停止服务..."
    ./stop.sh

    # 等待一秒
    sleep 1

    # 启动服务
    print_info "正在启动服务..."
    ./start.sh
}

# 运行主函数
main
