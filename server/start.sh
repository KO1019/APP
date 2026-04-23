#!/bin/bash
# 阿里云后端服务启动脚本（启动后端 + 管理后台）

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
    echo "  AI 情绪日记系统启动"
    echo "======================================"
    echo ""

    # 切换到脚本所在目录
    cd "$(dirname "$0")"

    # 清理旧进程
    print_info "清理旧进程..."
    pkill -9 -f "python main.py" 2>/dev/null || true
    pkill -9 -f "version_manager_web.py" 2>/dev/null || true
    sleep 2

    # 检查 .env 文件
    if [ ! -f .env ]; then
        print_error ".env 文件不存在，请复制 .env.example 为 .env 并配置"
        exit 1
    fi
    print_info ".env 文件存在 ✓"

    # 启动后端服务
    print_info "启动后端服务 (端口 9091)..."
    nohup python main.py > logs/backend.log 2>&1 &
    echo $! > logs/backend.pid
    print_info "后端服务已启动，PID: $(cat logs/backend.pid)"

    # 等待后端服务启动
    sleep 3

    # 检查后端服务是否启动成功
    if ! ps -p $(cat logs/backend.pid) > /dev/null 2>&1; then
        print_error "后端服务启动失败，请查看日志: logs/backend.log"
        exit 1
    fi

    # 启动管理后台
    print_info "启动管理后台 (端口 9092)..."
    nohup python version_manager_web.py > logs/admin.log 2>&1 &
    echo $! > logs/admin.pid
    print_info "管理后台已启动，PID: $(cat logs/admin.pid)"

    # 等待管理后台启动
    sleep 3

    # 检查管理后台是否启动成功
    if ! ps -p $(cat logs/admin.pid) > /dev/null 2>&1; then
        print_error "管理后台启动失败，请查看日志: logs/admin.log"
        kill $(cat logs/backend.pid) 2>/dev/null || true
        rm -f logs/backend.pid logs/admin.pid
        exit 1
    fi

    # 等待服务就绪
    print_info "等待服务就绪..."
    for i in {1..30}; do
        if curl -s http://localhost:9091/ >/dev/null 2>&1; then
            print_info "后端服务已就绪 ✓"
            break
        fi
        echo -n "."
        sleep 1
    done

    echo ""
    print_info "管理后台已就绪 ✓"

    echo ""
    echo "======================================"
    print_info "所有服务启动成功！"
    echo "======================================"
    echo ""
    echo "服务信息:"
    print_info "  后端 API:"
    echo "    - 地址: http://localhost:9091"
    echo "    - 日志: $(pwd)/logs/backend.log"
    echo "    - PID: $(cat logs/backend.pid)"
    echo ""
    print_info "  管理后台:"
    echo "    - 地址: http://localhost:9092/version-manager"
    echo "    - 日志: $(pwd)/logs/admin.log"
    echo "    - PID: $(cat logs/admin.pid)"
    echo ""
    echo "常用命令:"
    echo "  - 查看日志: tail -f logs/backend.log"
    echo "  - 停止服务: ./stop.sh"
    echo "  - 重启服务: ./restart.sh"
    echo ""
}

# 运行主函数
main
