#!/bin/bash

# AI情绪日记 - 完整部署脚本
# 用于一次性部署后端服务、下载页面、管理页面和SSL配置

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 项目根目录
PROJECT_ROOT="/workspace/projects/server"
cd "$PROJECT_ROOT" || exit 1

log_info "=== AI情绪日记 - 开始部署 ==="

# ============================================
# 1. 检查依赖
# ============================================
log_info "步骤 1/8: 检查系统依赖..."

# 检查Python
if ! command -v python3 &> /dev/null; then
    log_error "Python3 未安装，请先安装 Python 3.10+"
    exit 1
fi
log_info "✓ Python3 已安装: $(python3 --version)"

# 检查pip
if ! command -v pip3 &> /dev/null; then
    log_error "pip3 未安装"
    exit 1
fi
log_info "✓ pip3 已安装"

# 检查MySQL
if ! command -v mysql &> /dev/null; then
    log_warn "MySQL 客户端未安装（可选）"
else
    log_info "✓ MySQL 客户端已安装"
fi

# 检查Nginx
if ! command -v nginx &> /dev/null; then
    log_warn "Nginx 未安装，将跳过Nginx配置"
    NGINX_INSTALLED=false
else
    log_info "✓ Nginx 已安装"
    NGINX_INSTALLED=true
fi

# ============================================
# 2. 安装Python依赖
# ============================================
log_info "步骤 2/8: 安装Python依赖..."

if [ -f "requirements.txt" ]; then
    log_info "正在安装依赖包..."
    pip3 install -r requirements.txt --upgrade -q
    log_info "✓ Python依赖安装完成"
else
    log_error "requirements.txt 文件不存在"
    exit 1
fi

# ============================================
# 3. 配置数据库
# ============================================
log_info "步骤 3/8: 配置数据库..."

# 检查环境变量
if [ -z "$DB_HOST" ]; then
    DB_HOST="${DB_HOST:-localhost}"
    DB_PORT="${DB_PORT:-3306}"
    DB_NAME="${DB_NAME:-ai_diary}"
    DB_USER="${DB_USER:-root}"
    DB_PASSWORD="${DB_PASSWORD:-}"
fi

log_info "数据库配置: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"

# 创建数据库表（如果不存在）
if [ -f "create_mysql_tables.sql" ]; then
    log_info "创建数据库表..."
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < create_mysql_tables.sql 2>/dev/null || log_warn "数据库表可能已存在"
    log_info "✓ 数据库表配置完成"
else
    log_warn "create_mysql_tables.sql 文件不存在，跳过数据库配置"
fi

# ============================================
# 4. 配置SSL证书
# ============================================
log_info "步骤 4/8: 配置SSL证书..."

SSL_DIR="$PROJECT_ROOT/ssl"
mkdir -p "$SSL_DIR"

# 检查是否已有证书
if [ -f "$SSL_DIR/cert.pem" ] && [ -f "$SSL_DIR/key.pem" ]; then
    log_info "✓ SSL证书已存在"
else
    log_warn "未找到SSL证书，生成自签名证书（仅用于开发）"

    # 生成自签名证书
    openssl req -x509 -newkey rsa:4096 \
        -keyout "$SSL_DIR/key.pem" \
        -out "$SSL_DIR/cert.pem" \
        -days 365 \
        -nodes \
        -subj "/C=CN/ST=Beijing/L=Beijing/O=AI Diary/CN=localhost" \
        2>/dev/null

    log_info "✓ 自签名SSL证书已生成: $SSL_DIR/"
    log_warn "⚠️  生产环境请使用正式的SSL证书"
fi

# ============================================
# 5. 停止旧服务
# ============================================
log_info "步骤 5/8: 停止旧服务..."

# 停止后端服务
if [ -f "logs/app.pid" ]; then
    PID=$(cat logs/app.pid)
    if ps -p "$PID" > /dev/null 2>&1; then
        log_info "停止后端服务 (PID: $PID)..."
        kill "$PID"
        sleep 2
        log_info "✓ 后端服务已停止"
    fi
    rm -f logs/app.pid
fi

# 停止Nginx（如果已安装）
if [ "$NGINX_INSTALLED" = true ]; then
    log_info "停止Nginx..."
    service nginx stop 2>/dev/null || nginx -s stop 2>/dev/null || true
    sleep 1
    log_info "✓ Nginx已停止"
fi

# ============================================
# 6. 启动后端服务
# ============================================
log_info "步骤 6/8: 启动后端服务..."

# 创建日志目录
mkdir -p logs

# 启动后端服务（后台运行）
nohup python3 main.py > logs/app.log 2>&1 &
APP_PID=$!
echo $APP_PID > logs/app.pid

sleep 3

# 检查服务是否启动成功
if ps -p "$APP_PID" > /dev/null 2>&1; then
    log_info "✓ 后端服务启动成功 (PID: $APP_PID)"

    # 检查健康检查接口
    sleep 2
    if curl -s http://localhost:9091/api/v1/health > /dev/null 2>&1; then
        log_info "✓ 后端服务健康检查通过"
    else
        log_warn "⚠️  后端服务启动成功但健康检查失败"
    fi
else
    log_error "✗ 后端服务启动失败"
    tail -20 logs/app.log
    exit 1
fi

# ============================================
# 7. 配置Nginx
# ============================================
log_info "步骤 7/8: 配置Nginx..."

if [ "$NGINX_INSTALLED" = true ]; then
    if [ -f "nginx.conf" ]; then
        log_info "配置Nginx..."

        # 备份原有配置
        if [ -f "/etc/nginx/sites-enabled/ai-diary" ]; then
            cp /etc/nginx/sites-enabled/ai-diary /etc/nginx/sites-enabled/ai-diary.bak
        fi

        # 复制新配置
        cp nginx.conf /etc/nginx/sites-available/ai-diary 2>/dev/null || \
            cp nginx.conf /etc/nginx/conf.d/ai-diary.conf 2>/dev/null || \
            cp nginx.conf /usr/local/nginx/conf/ai-diary.conf 2>/dev/null || \
            true

        # 创建符号链接（如果适用）
        if [ -d "/etc/nginx/sites-enabled" ] && [ -f "/etc/nginx/sites-available/ai-diary" ]; then
            ln -sf /etc/nginx/sites-available/ai-diary /etc/nginx/sites-enabled/
        fi

        # 测试Nginx配置
        if nginx -t 2>/dev/null; then
            log_info "✓ Nginx配置测试通过"
        else
            log_warn "⚠️  Nginx配置测试失败，请检查nginx.conf"
        fi

        # 启动Nginx
        service nginx start 2>/dev/null || nginx 2>/dev/null || true
        sleep 1

        if pgrep nginx > /dev/null; then
            log_info "✓ Nginx启动成功"
        else
            log_warn "⚠️  Nginx启动失败"
        fi
    else
        log_warn "nginx.conf 文件不存在，跳过Nginx配置"
    fi
else
    log_info "跳过Nginx配置（未安装）"
fi

# ============================================
# 8. 部署完成
# ============================================
log_info "步骤 8/8: 部署完成"
log_info "=========================================="
log_info "✓ 后端服务: http://localhost:9091"
log_info "✓ 健康检查: http://localhost:9091/api/v1/health"
log_info "✓ 下载页面: http://localhost/download.html"
log_info "✓ 管理页面: http://localhost/version-manager"

if [ "$NGINX_INSTALLED" = true ]; then
    log_info "✓ Nginx: 已配置反向代理"
fi

log_info "=========================================="
log_info "查看日志: tail -f $PROJECT_ROOT/logs/app.log"
log_info "停止服务: kill \$(cat $PROJECT_ROOT/logs/app.pid)"

log_info "=== 部署成功 ==="

# 显示服务状态
echo ""
log_info "当前运行状态:"
ps aux | grep "python3 main.py" | grep -v grep || log_warn "后端服务未运行"
[ "$NGINX_INSTALLED" = true ] && pgrep nginx > /dev/null && log_info "Nginx运行中" || true

exit 0
