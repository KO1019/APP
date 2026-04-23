#!/bin/bash

# AI情绪日记 - 完整部署脚本（前端+后端）

set -e

echo "=========================================="
echo "  AI情绪日记 - 完整部署脚本"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="/workspace/projects"
cd "$PROJECT_ROOT" || exit 1

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 部署后端
deploy_backend() {
    log_info "开始部署后端..."

    cd "$PROJECT_ROOT/server" || exit 1

    # 检查.env文件
    if [ ! -f ".env" ]; then
        log_warn ".env 文件不存在，从.env.example复制..."
        cp .env.example .env
        log_error "请编辑 .env 文件配置数据库连接等信息"
        exit 1
    fi

    # 执行后端部署
    ./deploy.sh

    log_success "后端部署完成"
}

# 部署前端
deploy_frontend() {
    log_info "开始部署前端..."

    cd "$PROJECT_ROOT/client" || exit 1

    # 执行前端检查
    ./check.sh

    # 安装依赖
    log_info "安装前端依赖..."
    npm install

    # 配置环境变量
    log_info "配置环境变量..."
    cp .env.production .env.local

    log_success "前端准备完成"
}

# 生成ARK配置
generate_ark_config() {
    log_info "生成ARK配置..."

    cd "$PROJECT_ROOT/server" || exit 1

    read -p "是否配置ARK API? (y/n): " CONFIG_ARK

    if [ "$CONFIG_ARK" = "y" ]; then
        ./generate_ark_config.sh
    else
        log_info "跳过ARK配置"
    fi
}

# 显示部署信息
show_info() {
    echo ""
    echo "=========================================="
    echo "  部署信息"
    echo "=========================================="
    echo ""
    echo "生产环境地址:"
    echo "  后端API: http://59.110.39.235:9091"
    echo "  健康检查: http://59.110.39.235:9091/api/v1/health"
    echo "  下载页面: http://59.110.39.235/download.html"
    echo "  版本管理: http://59.110.39.235/version-manager"
    echo ""
    echo "版本管理后台登录:"
    echo "  用户名: admin"
    echo "  密码: admin123"
    echo ""
    echo "前端应用:"
    echo "  Web访问: 配置Nginx后访问前端地址"
    echo "  Android: 使用EAS Build构建APK"
    echo "  iOS: 使用EAS Build构建IPA"
    echo ""
    echo "=========================================="
    echo ""
}

# 主函数
main() {
    echo ""
    log_info "开始完整部署流程..."
    echo ""

    # 1. 部署后端
    deploy_backend

    echo ""

    # 2. 部署前端
    deploy_frontend

    echo ""

    # 3. 生成ARK配置（可选）
    generate_ark_config

    echo ""

    # 4. 显示部署信息
    show_info

    log_success "完整部署完成！"
    echo ""
    echo "下一步："
    echo "1. 测试后端API: curl http://59.110.39.235:9091/api/v1/health"
    echo "2. 启动前端开发服务器: cd client && npm start"
    echo "3. 构建前端应用: cd client && npm run web"
}

# 运行主函数
main
