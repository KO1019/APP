#!/bin/bash
# 阿里云后端服务启动脚本

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

# 检查 Python 版本
check_python_version() {
    print_info "检查 Python 版本..."
    PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
    PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
    PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)

    if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 10 ]); then
        print_error "Python 版本过低: $PYTHON_VERSION (需要 3.10+)"
        exit 1
    fi
    print_info "Python 版本: $PYTHON_VERSION ✓"
}

# 检查 .env 文件
check_env_file() {
    print_info "检查 .env 文件..."
    if [ ! -f .env ]; then
        print_error ".env 文件不存在"
        print_info "请复制 .env.example 为 .env 并配置相关参数"
        exit 1
    fi
    print_info ".env 文件存在 ✓"
}

# 检查虚拟环境
check_venv() {
    print_info "检查虚拟环境..."
    if [ ! -d "venv" ]; then
        print_warn "虚拟环境不存在，正在创建..."
        python3 -m venv venv
        print_info "虚拟环境创建完成 ✓"
    else
        print_info "虚拟环境存在 ✓"
    fi
}

# 激活虚拟环境
activate_venv() {
    print_info "激活虚拟环境..."
    source venv/bin/activate
    print_info "虚拟环境已激活 ✓"
}

# 安装依赖
install_dependencies() {
    print_info "检查依赖..."
    pip install -r requirements.txt
    print_info "依赖安装完成 ✓"
}

# 检查数据库连接
check_database() {
    print_info "检查数据库连接..."
    python3 -c "
from database import execute_query
try:
    result = execute_query('SELECT VERSION()')
    print(f'✓ MySQL 连接成功: {result[0]}')
except Exception as e:
    print(f'✗ MySQL 连接失败: {e}')
    exit(1)
"
}

# 检查 Redis 连接
check_redis() {
    print_info "检查 Redis 连接..."
    python3 -c "
from redis_cache import redis_client
try:
    redis_client.set('_health_check', 'ok')
    result = redis_client.get('_health_check')
    if result == b'ok':
        print('✓ Redis 连接成功')
except Exception as e:
    print(f'✗ Redis 连接失败: {e}')
    exit(1)
"
}

# 检查 OSS 配置
check_oss() {
    print_info "检查 OSS 配置..."
    python3 -c "
from oss_storage import oss_storage
try:
    print(f'✓ OSS 配置成功: {oss_storage.bucket.bucket_name}')
except Exception as e:
    print(f'✗ OSS 配置失败: {e}')
    exit(1)
"
}

# 检查端口占用
check_port() {
    print_info "检查端口 9091..."
    if lsof -Pi :9091 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        print_warn "端口 9091 已被占用"
        print_info "正在尝试关闭旧进程..."
        pkill -f "python main.py" || true
        sleep 2
    fi
    print_info "端口 9091 可用 ✓"
}

# 启动服务
start_service() {
    print_info "启动后端服务..."
    export SERVER_PORT=9091
    nohup python main.py > server.log 2>&1 &
    echo $! > server.pid
    print_info "服务已启动，PID: $(cat server.pid)"
}

# 等待服务就绪
wait_for_service() {
    print_info "等待服务启动..."
    for i in {1..30}; do
        if curl -s http://localhost:9091/ > /dev/null 2>&1; then
            print_info "服务已就绪 ✓"
            return 0
        fi
        echo -n "."
        sleep 1
    done
    print_error "服务启动超时"
    return 1
}

# 主函数
main() {
    echo ""
    echo "======================================"
    echo "  AI 情绪日记后端服务启动脚本"
    echo "======================================"
    echo ""

    # 切换到脚本所在目录
    cd "$(dirname "$0")"

    # 执行检查
    check_python_version
    check_env_file
    check_venv
    activate_venv
    install_dependencies
    check_database
    check_redis
    check_oss
    check_port

    # 启动服务
    start_service
    wait_for_service

    echo ""
    echo "======================================"
    print_info "服务启动成功！"
    echo "======================================"
    echo ""
    echo "服务信息:"
    echo "  - PID: $(cat server.pid)"
    echo "  - 端口: 9091"
    echo "  - 日志: $(pwd)/server.log"
    echo ""
    echo "常用命令:"
    echo "  - 查看日志: tail -f server.log"
    echo "  - 停止服务: ./stop.sh"
    echo "  - 重启服务: ./restart.sh"
    echo ""
    print_info "访问 http://localhost:9091/ 测试服务"
    echo ""
}

# 运行主函数
main
