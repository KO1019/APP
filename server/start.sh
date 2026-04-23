#!/bin/bash
# 启动后端服务

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

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 检查依赖
check_dependencies() {
    print_step "检查依赖..."

    # 检查Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python3未安装"
        exit 1
    fi
    print_info "Python3: $(python3 --version)"

    # 检查pip
    if ! command -v pip3 &> /dev/null; then
        print_error "pip3未安装"
        exit 1
    fi

    # 检查依赖包
    print_step "检查Python依赖..."
    pip3 install -q -r requirements.txt 2>/dev/null || {
        print_warn "部分依赖安装失败，正在重试..."
        pip3 install -r requirements.txt
    }
}

# 初始化数据库
init_database() {
    print_step "初始化数据库..."

    # 检查数据库表是否存在
    if command -v mysql &> /dev/null; then
        # 尝试连接数据库检查表
        DB_HOST="${DB_HOST:-localhost}"
        DB_USER="${DB_USER:-root}"
        DB_PASS="${DB_PASS:-}"
        DB_NAME="${DB_NAME:-diary_app}"

        if mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" -e "USE $DB_NAME; SHOW TABLES;" 2>/dev/null | grep -q "diaries"; then
            print_info "数据库表已存在，跳过初始化"
        else
            print_warn "数据库表不存在，请手动执行: mysql -u$DB_USER -p $DB_NAME < create_mysql_tables.sql"
        fi
    else
        print_warn "MySQL客户端未安装，跳过数据库检查"
    fi
}

# 启动后端服务
start_backend() {
    print_step "启动后端服务..."

    # 切换到脚本所在目录
    cd "$(dirname "$0")"

    # 创建日志目录
    mkdir -p logs

    # 停止旧进程
    if [ -f "logs/backend.pid" ]; then
        OLD_PID=$(cat logs/backend.pid)
        if ps -p $OLD_PID > /dev/null 2>&1; then
            print_info "停止旧进程 (PID: $OLD_PID)..."
            kill $OLD_PID 2>/dev/null || true
            sleep 2
        fi
        rm -f logs/backend.pid
    fi

    # 清理残留进程
    pkill -f "python main.py" 2>/dev/null || true

    # 启动服务
    print_info "启动后端服务..."
    nohup python3 main.py > logs/backend.log 2>&1 &
    BACKEND_PID=$!

    # 保存PID
    echo $BACKEND_PID > logs/backend.pid

    # 等待服务启动
    print_info "等待服务启动..."
    for i in {1..30}; do
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            if grep -q "Uvicorn running" logs/backend.log 2>/dev/null; then
                print_info "后端服务启动成功! (PID: $BACKEND_PID)"
                print_info "日志文件: logs/backend.log"
                print_info "API地址: http://localhost:9091"
                print_info "健康检查: http://localhost:9091/api/v1/health"
                break
            fi
        fi
        if [ $i -eq 30 ]; then
            print_error "服务启动失败，请查看日志: logs/backend.log"
            cat logs/backend.log | tail -20
            exit 1
        fi
        sleep 1
    done
}

# 主函数
main() {
    echo ""
    echo "======================================"
    echo "  后端服务启动脚本"
    echo "======================================"
    echo ""

    check_dependencies
    init_database
    start_backend

    echo ""
    print_info "所有服务启动完成！"
    echo ""
    echo "查看日志: tail -f logs/backend.log"
    echo "停止服务: ./stop.sh"
    echo ""
}

# 运行主函数
main
