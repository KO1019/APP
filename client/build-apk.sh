#!/bin/bash

# AI情绪日记 - Android APK构建脚本

set -e

echo "=========================================="
echo "  AI情绪日记 - Android APK构建"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="/workspace/projects/client"
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

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."

    # 检查Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        exit 1
    fi
    log_success "Node.js: $(node --version)"

    # 检查npm
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装"
        exit 1
    fi
    log_success "npm: $(npm --version)"

    # 检查EAS CLI
    if command -v eas &> /dev/null; then
        log_success "EAS CLI: $(eas --version)"
    else
        log_warn "EAS CLI 未安装，将自动安装"
        npm install -g eas-cli
    fi

    log_success "依赖检查完成"
}

# 配置EAS
configure_eas() {
    log_info "配置EAS Build..."

    if [ ! -f "eas.json" ]; then
        log_error "eas.json 文件不存在"
        exit 1
    fi

    log_success "EAS配置文件已存在"
}

# 检查Expo登录状态
check_login() {
    log_info "检查Expo登录状态..."

    # 尝试获取用户信息
    if npx expo whoami &> /dev/null; then
        log_success "已登录Expo账户"
        npx expo whoami
        return 0
    else
        log_warn "未登录Expo账户"
        return 1
    fi
}

# 登录Expo
login_expo() {
    log_info "登录Expo账户..."
    log_info "请访问 https://expo.dev 获取账户和令牌"
    log_info "运行: npx expo login"
    read -p "是否已登录? (y/n): " LOGGED_IN

    if [ "$LOGGED_IN" != "y" ]; then
        log_error "请先登录Expo账户"
        exit 1
    fi
}

# 使用EAS Build构建APK
build_with_eas() {
    log_info "使用EAS Build构建APK..."
    echo ""

    # 检查登录状态
    if ! check_login; then
        login_expo
    fi

    echo ""
    log_info "开始构建..."

    # 构建预览版本APK
    npx eas build --platform android --profile preview

    log_success "APK构建完成"
    log_info "APK文件将上传到Expo账户，可在EAS Dashboard下载"
}

# 使用本地构建构建APK
build_local() {
    log_info "使用本地构建构建APK..."
    echo ""

    # 检查Java
    if ! command -v java &> /dev/null; then
        log_error "Java 未安装，本地构建需要Java"
        log_info "请安装Java JDK 17或更高版本"
        exit 1
    fi
    log_success "Java: $(java -version 2>&1 | head -1)"

    # 检查Android SDK
    if [ -z "$ANDROID_HOME" ]; then
        log_warn "ANDROID_HOME 未设置"
        log_info "请设置ANDROID_HOME环境变量"
    else
        log_success "Android SDK: $ANDROID_HOME"
    fi

    echo ""
    log_info "开始构建..."

    # 使用旧版构建方式
    npx expo build:android --type apk

    log_success "APK构建完成"
    log_info "APK文件位置: build/目录"
}

# 显示菜单
show_menu() {
    echo ""
    echo "请选择构建方式:"
    echo "1. 使用EAS Build（推荐）"
    echo "2. 使用本地构建"
    echo "3. 检查构建状态"
    echo "0. 退出"
    echo ""
}

# 检查构建状态
check_build_status() {
    log_info "检查构建状态..."

    # 获取最近的构建
    npx eas build:list --platform android --limit=5 --non-interactive

    log_success "构建状态检查完成"
}

# 主函数
main() {
    check_dependencies
    configure_eas

    show_menu
    read -p "请输入选项: " choice

    case $choice in
        1)
            build_with_eas
            ;;
        2)
            build_local
            ;;
        3)
            check_build_status
            ;;
        0)
            echo "退出"
            exit 0
            ;;
        *)
            log_error "无效的选项"
            exit 1
            ;;
    esac
}

# 运行主函数
main
