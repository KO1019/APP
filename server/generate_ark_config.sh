#!/bin/bash

# ARK API配置生成脚本
# 用于生成豆包ARK API的配置和测试连接

set -e

echo "=========================================="
echo "    豆包ARK API配置生成脚本"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 读取.env文件
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}错误: .env 文件不存在${NC}"
    echo "请先创建 .env 文件"
    exit 1
fi

source "$ENV_FILE"

# 检查是否已有ARK配置
if [ -n "$ARK_API_KEY" ]; then
    echo -e "${GREEN}检测到已有ARK配置:${NC}"
    echo "ARK_BASE_URL: $ARK_BASE_URL"
    echo "ARK_API_KEY: ${ARK_API_KEY:0:20}..."
    echo "ARK_CHAT_MODEL: $ARK_CHAT_MODEL"
    echo ""
    read -p "是否重新配置? (y/n): " RECONFIGURE
    if [ "$RECONFIGURE" != "y" ]; then
        echo "保留现有配置"
        exit 0
    fi
fi

echo ""
echo "请输入豆包ARK API配置信息："
echo ""

# 输入ARK_BASE_URL
read -p "ARK基础URL [默认: https://ark.cn-beijing.volces.com/api/v3]: " INPUT_BASE_URL
ARK_BASE_URL=${INPUT_BASE_URL:-"https://ark.cn-beijing.volces.com/api/v3"}

# 输入ARK_API_KEY
echo ""
echo "提示: ARK API_KEY格式为 'ak-xxx.sk-xxx'"
read -p "ARK API密钥: " ARK_API_KEY

if [ -z "$ARK_API_KEY" ]; then
    echo -e "${RED}错误: ARK API密钥不能为空${NC}"
    exit 1
fi

# 验证API_KEY格式
if [[ ! $ARK_API_KEY =~ ^ak-[a-zA-Z0-9]+\.sk-[a-zA-Z0-9]+$ ]]; then
    echo -e "${YELLOW}警告: ARK API密钥格式可能不正确${NC}"
    read -p "继续配置? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        exit 1
    fi
fi

# 输入ARK_CHAT_MODEL
echo ""
echo "提示: 聊天模型ID，例如: ep-20250212215003-7j9f8"
read -p "聊天模型ID: " ARK_CHAT_MODEL

if [ -z "$ARK_CHAT_MODEL" ]; then
    echo -e "${YELLOW}警告: 未指定聊天模型，可能影响功能${NC}"
fi

# 备份现有配置
if [ -f "$ENV_FILE.bak" ]; then
    rm -f "$ENV_FILE.bak"
fi
cp "$ENV_FILE" "$ENV_FILE.bak"
echo -e "${GREEN}✓ 已备份原配置到 $ENV_FILE.bak${NC}"

# 更新.env文件
if grep -q "^ARK_BASE_URL=" "$ENV_FILE"; then
    sed -i "s|^ARK_BASE_URL=.*|ARK_BASE_URL=$ARK_BASE_URL|g" "$ENV_FILE"
else
    echo "ARK_BASE_URL=$ARK_BASE_URL" >> "$ENV_FILE"
fi

if grep -q "^ARK_API_KEY=" "$ENV_FILE"; then
    sed -i "s|^ARK_API_KEY=.*|ARK_API_KEY=$ARK_API_KEY|g" "$ENV_FILE"
else
    echo "ARK_API_KEY=$ARK_API_KEY" >> "$ENV_FILE"
fi

if grep -q "^ARK_CHAT_MODEL=" "$ENV_FILE"; then
    sed -i "s|^ARK_CHAT_MODEL=.*|ARK_CHAT_MODEL=$ARK_CHAT_MODEL|g" "$ENV_FILE"
else
    echo "ARK_CHAT_MODEL=$ARK_CHAT_MODEL" >> "$ENV_FILE"
fi

echo ""
echo "=========================================="
echo "    配置完成"
echo "=========================================="
echo ""
echo -e "${GREEN}配置信息:${NC}"
echo "ARK_BASE_URL: $ARK_BASE_URL"
echo "ARK_API_KEY: ${ARK_API_KEY:0:20}..."
echo "ARK_CHAT_MODEL: $ARK_CHAT_MODEL"
echo ""

# 测试ARK API连接
echo "测试ARK API连接..."
echo ""

# 生成测试Python脚本
cat > /tmp/test_ark.py << 'EOF'
import httpx
import sys
import os

# 从环境变量读取配置
ARK_BASE_URL = os.getenv("ARK_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3")
ARK_API_KEY = os.getenv("ARK_API_KEY", "")
ARK_CHAT_MODEL = os.getenv("ARK_CHAT_MODEL", "")

if not ARK_API_KEY:
    print("❌ ARK_API_KEY 未配置")
    sys.exit(1)

try:
    # 测试简单的聊天请求
    url = f"{ARK_BASE_URL}/chat/completions"
    headers = {
        "Authorization": f"Bearer {ARK_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": ARK_CHAT_MODEL,
        "messages": [
            {"role": "user", "content": "你好"}
        ],
        "max_tokens": 10
    }

    print(f"正在测试: {url}")
    print(f"模型: {ARK_CHAT_MODEL}")
    print("")

    response = httpx.post(url, json=data, headers=headers, timeout=10)

    if response.status_code == 200:
        result = response.json()
        print("✅ ARK API 连接成功")
        if "choices" in result and len(result["choices"]) > 0:
            reply = result["choices"][0]["message"]["content"]
            print(f"回复: {reply}")
    else:
        print(f"❌ ARK API 连接失败")
        print(f"状态码: {response.status_code}")
        print(f"错误: {response.text}")

except Exception as e:
    print(f"❌ 测试失败: {e}")
    sys.exit(1)
EOF

# 执行测试
export ARK_BASE_URL="$ARK_BASE_URL"
export ARK_API_KEY="$ARK_API_KEY"
export ARK_CHAT_MODEL="$ARK_CHAT_MODEL"

python3 /tmp/test_ark.py
TEST_RESULT=$?

rm -f /tmp/test_ark.py

echo ""
if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}✅ ARK API配置成功！${NC}"
    echo -e "${GREEN}=========================================${NC}"
else
    echo -e "${YELLOW}=========================================${NC}"
    echo -e "${YELLOW}⚠️  ARK API测试失败，请检查配置${NC}"
    echo -e "${YELLOW}=========================================${NC}"
    echo ""
    echo "如果配置错误，可以恢复备份："
    echo "cp .env.bak .env"
fi

echo ""
echo "下一步："
echo "1. 重启后端服务: ./restart.sh"
echo "2. 检查日志: tail -f logs/backend.log"
echo "3. 测试AI聊天功能"
