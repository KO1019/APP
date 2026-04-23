#!/bin/bash

# AI情绪日记 - 部署检查脚本
# 用于验证所有服务是否正常启动

set -e

echo "=== AI情绪日记部署检查 ==="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查计数
PASS=0
FAIL=0
WARN=0

# 检查函数
check_service() {
    local name="$1"
    local url="$2"
    local keyword="$3"

    echo -n "检查 $name ... "

    if curl -sf "$url" | grep -q "$keyword"; then
        echo -e "${GREEN}✓${NC}"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗${NC}"
        ((FAIL++))
        return 1
    fi
}

check_port() {
    local name="$1"
    local port="$2"

    echo -n "检查端口 $name ($port) ... "

    if lsof -Pi ":$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗${NC}"
        ((FAIL++))
        return 1
    fi
}

check_file() {
    local name="$1"
    local file="$2"

    echo -n "检查文件 $name ... "

    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC}"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗${NC}"
        ((FAIL++))
        return 1
    fi
}

check_dir() {
    local name="$1"
    local dir="$2"

    echo -n "检查目录 $name ... "

    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓${NC}"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗${NC}"
        ((FAIL++))
        return 1
    fi
}

# 1. 检查系统依赖
echo "=== 1. 系统依赖检查 ==="

check_service "Python 3" "http://localhost:9091/api/v1/health" "status"

if command -v python3 &> /dev/null; then
    echo -e "检查 Python 3 ... ${GREEN}✓${NC}"
    ((PASS++))
else
    echo -e "检查 Python 3 ... ${RED}✗${NC}"
    ((FAIL++))
fi

if command -v mysql &> /dev/null; then
    echo -e "检查 MySQL ... ${GREEN}✓${NC}"
    ((PASS++))
else
    echo -e "检查 MySQL ... ${RED}✗${NC}"
    ((FAIL++))
fi

if command -v nginx &> /dev/null; then
    echo -e "检查 Nginx ... ${GREEN}✓${NC}"
    ((PASS++))
else
    echo -e "检查 Nginx ... ${RED}✗${NC}"
    ((FAIL++))
fi

echo ""

# 2. 检查文件和目录
echo "=== 2. 文件和目录检查 ==="

check_file "主程序" "main.py"
check_file "数据库适配器" "db_adapter.py"
check_file "模型管理器" "model_manager.py"
check_file "Nginx配置" "nginx.conf"
check_file "管理后台" "admin.html"
check_file "下载页面" "download.html"
check_file "环境配置" ".env"

check_dir "日志目录" "logs"
check_dir "SSL目录" "ssl"
check_dir "Python包" "__pycache__"

echo ""

# 3. 检查端口占用
echo "=== 3. 端口占用检查 ==="

check_port "后端API" "9091"
check_port "HTTP" "80"
check_port "HTTPS" "443"

echo ""

# 4. 检查服务健康度
echo "=== 4. 服务健康度检查 ==="

check_service "后端健康检查" "http://localhost:9091/api/v1/health" "ok"
check_service "下载页面" "http://localhost/download.html" "AI情绪日记"
check_service "管理后台" "http://localhost/admin.html" "管理后台"

echo ""

# 5. 检查SSL证书
echo "=== 5. SSL证书检查 ==="

if [ -f "ssl/cert.pem" ] && [ -f "ssl/key.pem" ]; then
    echo -n "检查SSL证书 ... "
    if openssl x509 -in ssl/cert.pem -noout -checkend 86400 2>/dev/null; then
        echo -e "${GREEN}✓ (有效)${NC}"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠ (即将过期)${NC}"
        ((WARN++))
    fi
else
    echo -e "检查SSL证书 ... ${RED}✗ (不存在)${NC}"
    ((FAIL++))
fi

echo ""

# 6. 检查Python依赖
echo "=== 6. Python依赖检查 ==="

if [ -f "requirements.txt" ]; then
    echo -n "检查依赖安装 ... "
    if python3 -c "import fastapi, uvicorn, pymysql, oss2" 2>/dev/null; then
        echo -e "${GREEN}✓${NC}"
        ((PASS++))
    else
        echo -e "${RED}✗${NC}"
        ((FAIL++))
    fi
else
    echo -e "检查 requirements.txt ... ${RED}✗${NC}"
    ((FAIL++))
fi

echo ""

# 7. 检查数据库连接
echo "=== 7. 数据库连接检查 ==="

if [ -f ".env" ]; then
    echo -n "检查数据库连接 ... "
    DB_HOST=$(grep "DB_HOST" .env | cut -d '=' -f2)
    DB_USER=$(grep "DB_USER" .env | cut -d '=' -f2)
    DB_PASS=$(grep "DB_PASSWORD" .env | cut -d '=' -f2)
    DB_NAME=$(grep "DB_NAME" .env | cut -d '=' -f2)

    if mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SELECT 1" &>/dev/null; then
        echo -e "${GREEN}✓${NC}"
        ((PASS++))
    else
        echo -e "${RED}✗${NC}"
        ((FAIL++))
    fi
else
    echo -e "检查 .env 文件 ... ${RED}✗${NC}"
    ((FAIL++))
fi

echo ""

# 8. 检查日志文件
echo "=== 8. 日志文件检查 ==="

if [ -f "logs/app.log" ]; then
    echo -n "检查应用日志 ... "
    if [ -s "logs/app.log" ]; then
        echo -e "${GREEN}✓${NC}"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠ (空文件)${NC}"
        ((WARN++))
    fi
else
    echo -e "检查应用日志 ... ${RED}✗${NC}"
    ((FAIL++))
fi

echo ""

# 总结
echo "=== 检查结果总结 ==="
echo ""
echo -e "通过: ${GREEN}$PASS${NC}"
echo -e "失败: ${RED}$FAIL${NC}"
echo -e "警告: ${YELLOW}$WARN${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ 所有检查通过！系统运行正常。${NC}"
    echo ""
    echo "访问地址："
    echo "  - 后端API: http://localhost:9091"
    echo "  - 下载页面: http://localhost/download.html"
    echo "  - 管理后台: http://localhost/admin.html"
    exit 0
else
    echo -e "${RED}✗ 发现 $FAIL 个问题，请检查以上错误。${NC}"
    exit 1
fi
