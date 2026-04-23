#!/bin/bash
# 重启所有服务

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
    echo "  重启所有服务"
    echo "======================================"
    echo ""

    # 切换到脚本所在目录
    cd "$(dirname "$0")"

    # 停止服务
    ./stop.sh

    # 等待
    sleep 1

    # 启动服务
    ./start.sh
}

# 运行主函数
main
