#!/bin/bash
# 同时启动后端服务和管理后台

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_blue() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# 主函数
main() {
    echo ""
    echo "======================================"
    echo "  AI 情绪日记系统 - 全套启动"
    echo "======================================"
    echo ""

    # 切换到脚本所在目录
    cd "$(dirname "$0")"

    # 清理旧进程
    print_info "清理旧进程..."
    pkill -9 -f "python main.py" 2>/dev/null || true
    pkill -9 -f "version_manager_web.py" 2>/dev/null || true
    sleep 2

    # 创建日志目录
    mkdir -p logs

    # 启动后端服务
    print_info "启动后端服务 (端口 9091)..."
    export SERVER_PORT=9091
    nohup python main.py > logs/backend.log 2>&1 &
    echo $! > logs/backend.pid
    print_info "后端服务已启动，PID: $(cat logs/backend.pid)"

    # 等待后端服务启动
    sleep 2

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
    sleep 2

    # 检查管理后台是否启动成功
    if ! ps -p $(cat logs/admin.pid) > /dev/null 2>&1; then
        print_error "管理后台启动失败，请查看日志: logs/admin.log"
        # 清理后端服务
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

    for i in {1..30}; do
        if curl -s http://localhost:9092/version-manager >/dev/null 2>&1; then
            print_info "管理后台已就绪 ✓"
            break
        fi
        echo -n "."
        sleep 1
    done

    echo ""
    echo "======================================"
    print_info "所有服务启动成功！"
    echo "======================================"
    echo ""
    echo "服务信息:"
    print_blue "  后端 API:"
    echo "    - 地址: http://localhost:9091"
    echo "    - 日志: $(pwd)/logs/backend.log"
    echo "    - PID: $(cat logs/backend.pid)"
    echo ""
    print_blue "  管理后台:"
    echo "    - 地址: http://localhost:9092/version-manager"
    echo "    - 日志: $(pwd)/logs/admin.log"
    echo "    - PID: $(cat logs/admin.pid)"
    echo ""
    print_info "常用命令:"
    echo "  - 查看后端日志: tail -f logs/backend.log"
    echo "  - 查看管理后台日志: tail -f logs/admin.log"
    echo "  - 停止所有服务: ./stop_all.sh"
    echo "  - 重启所有服务: ./restart_all.sh"
    echo ""
    print_info "访问管理后台: http://localhost:9092/version-manager"
    echo ""
}

# 运行主函数
main
