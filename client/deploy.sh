#!/bin/bash

# AI情绪日记前端 - 部署脚本

set -e

echo "=========================================="
echo "    AI情绪日记前端部署脚本"
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

    # 检查Expo CLI
    if ! command -v npx &> /dev/null; then
        log_error "npx 未安装"
        exit 1
    fi
    log_success "Expo CLI: 已安装"
}

# 安装依赖
install_dependencies() {
    log_info "安装依赖..."

    if [ ! -d "node_modules" ]; then
        npm install
        log_success "依赖安装完成"
    else
        log_info "依赖已安装，跳过"
    fi
}

# 配置环境变量
configure_env() {
    log_info "检查环境变量..."

    if [ ! -f ".env" ]; then
        log_error ".env 文件不存在"
        exit 1
    fi

    log_success "环境变量配置完成"
}

# 清理缓存
clean_cache() {
    log_info "清理缓存..."

    # 清理Expo缓存
    npx expo start --clear 2>/dev/null || true

    # 清理Metro缓存
    rm -rf .expo 2>/dev/null || true
    rm -rf node_modules/.cache 2>/dev/null || true

    log_success "缓存清理完成"
}

# 构建Web版本
build_web() {
    log_info "构建Web版本..."

    # 构建Web
    npx expo export:web

    log_success "Web版本构建完成"
    log_info "输出目录: dist/"
}

# 构建Android APK
build_android() {
    log_info "构建Android APK..."

    # 检查Java
    if ! command -v java &> /dev/null; then
        log_error "Java 未安装，无法构建Android"
        exit 1
    fi

    # 检查Android SDK
    if [ -z "$ANDROID_HOME" ]; then
        log_warn "ANDROID_HOME 未设置，可能影响构建"
    fi

    # 构建APK
    npx expo build:android --type apk

    log_success "Android APK构建完成"
}

# 构建iOS
build_ios() {
    log_info "构建iOS..."

    # 检查是否在macOS上
    if [[ "$OSTYPE" != "darwin"* ]]; then
        log_error "iOS构建只能在macOS上进行"
        exit 1
    fi

    # 检查Xcode
    if ! command -v xcodebuild &> /dev/null; then
        log_error "Xcode 未安装，无法构建iOS"
        exit 1
    fi

    # 构建iOS
    npx expo build:ios

    log_success "iOS构建完成"
}

# 使用EAS Build
build_eas() {
    log_info "使用EAS Build构建..."

    # 检查是否已配置EAS
    if [ ! -f "eas.json" ]; then
        log_warn "未找到eas.json，配置EAS..."
        npx eas build:configure
    fi

    # 构建平台
    read -p "选择构建平台 (android/ios): " PLATFORM
    case $PLATFORM in
        android)
            npx eas build --platform android
            ;;
        ios)
            npx eas build --platform ios
            ;;
        *)
            log_error "无效的平台"
            exit 1
            ;;
    esac

    log_success "EAS构建完成"
}

# 启动开发服务器
start_dev() {
    log_info "启动开发服务器..."

    # 清理缓存
    npx expo start --clear

    log_success "开发服务器已启动"
    log_info "访问: http://localhost:8081"
}

# 显示菜单
show_menu() {
    echo ""
    echo "请选择操作:"
    echo "1. 安装依赖"
    echo "2. 配置环境变量"
    echo "3. 清理缓存"
    echo "4. 构建Web版本"
    echo "5. 构建Android APK"
    echo "6. 构建iOS"
    echo "7. 使用EAS Build"
    echo "8. 启动开发服务器"
    echo "9. 完整部署（依赖+配置+构建）"
    echo "0. 退出"
    echo ""
}

# 主函数
main() {
    check_dependencies

    show_menu
    read -p "请输入选项: " choice

    case $choice in
        1)
            install_dependencies
            ;;
        2)
            configure_env
            ;;
        3)
            clean_cache
            ;;
        4)
            build_web
            ;;
        5)
            build_android
            ;;
        6)
            build_ios
            ;;
        7)
            build_eas
            ;;
        8)
            start_dev
            ;;
        9)
            install_dependencies
            configure_env
            clean_cache
            build_web
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
