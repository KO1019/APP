#!/bin/bash

echo "========================================="
echo "AI情绪日记系统功能测试"
echo "========================================="
echo ""

BACKEND_URL="http://localhost:9091"
TEST_TOKEN="test-token-123"

# 1. 测试健康检查
echo "1. 测试健康检查..."
response=$(curl -s -w "\n%{http_code}" "${BACKEND_URL}/api/v1/health")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
  echo "✅ 健康检查通过: $body"
else
  echo "❌ 健康检查失败: HTTP $http_code"
fi
echo ""

# 2. 测试用户注册
echo "2. 测试用户注册..."
response=$(curl -s -w "\n%{http_code}" -X POST "${BACKEND_URL}/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@ai-diary.com","password":"Test123!","nickname":"测试用户"}')

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "201" ]; then
  echo "✅ 用户注册成功"
  # 提取token（简化处理）
  TEST_TOKEN=$(echo "$body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  echo "Token: ${TEST_TOKEN:0:20}..."
else
  echo "⚠️ 用户注册: HTTP $http_code (可能已存在)"
  # 尝试登录获取token
  response=$(curl -s -w "\n%{http_code}" -X POST "${BACKEND_URL}/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@ai-diary.com","password":"Test123!"}')
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  if [ "$http_code" = "200" ]; then
    TEST_TOKEN=$(echo "$body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "✅ 登录成功，获取到token"
  else
    echo "❌ 登录失败: HTTP $http_code"
  fi
fi
echo ""

# 3. 测试创建日记
echo "3. 测试创建日记..."
response=$(curl -s -w "\n%{http_code}" -X POST "${BACKEND_URL}/api/v1/diaries" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -d '{"title":"测试日记","content":"今天天气真好，心情很愉快！","mood":"happy","tags":["天气","心情"]}')

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "201" ]; then
  echo "✅ 日记创建成功"
  DIARY_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
  echo "日记ID: $DIARY_ID"
else
  echo "❌ 日记创建失败: HTTP $http_code"
  echo "Response: $body"
fi
echo ""

# 4. 测试获取日记列表
echo "4. 测试获取日记列表..."
response=$(curl -s -w "\n%{http_code}" "${BACKEND_URL}/api/v1/diaries" \
  -H "Authorization: Bearer $TEST_TOKEN")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
  echo "✅ 获取日记列表成功"
  diary_count=$(echo "$body" | grep -o '"id"' | wc -l)
  echo "日记数量: $diary_count"
else
  echo "❌ 获取日记列表失败: HTTP $http_code"
fi
echo ""

# 5. 测试AI聊天（不带日记上下文）
echo "5. 测试AI聊天..."
response=$(curl -s -w "\n%{http_code}" -X POST "${BACKEND_URL}/api/v1/ai-companion/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -d '{"message":"你好，我今天心情不太好"}')

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
  echo "✅ AI聊天成功"
  ai_message=$(echo "$body" | grep -o '"message":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "AI回复: ${ai_message:0:50}..."
else
  echo "❌ AI聊天失败: HTTP $http_code"
  echo "Response: $body"
fi
echo ""

# 6. 测试获取对话历史
echo "6. 测试获取对话历史..."
response=$(curl -s -w "\n%{http_code}" "${BACKEND_URL}/api/v1/conversations" \
  -H "Authorization: Bearer $TEST_TOKEN")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
  echo "✅ 获取对话历史成功"
  conv_count=$(echo "$body" | grep -o '"user_message"' | wc -l)
  echo "对话记录数量: $conv_count"
else
  echo "❌ 获取对话历史失败: HTTP $http_code"
fi
echo ""

# 7. 测试AI聊天（带日记上下文）
if [ ! -z "$DIARY_ID" ]; then
  echo "7. 测试AI聊天（带日记上下文）..."
  response=$(curl -s -w "\n%{http_code}" -X POST "${BACKEND_URL}/api/v1/ai-companion/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TEST_TOKEN" \
    -d "{\"message\":\"请分析我刚才写的日记\",\"relatedDiaryId\":\"$DIARY_ID\"}")

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "200" ]; then
    echo "✅ AI聊天（带日记）成功"
    ai_message=$(echo "$body" | grep -o '"message":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "AI回复: ${ai_message:0:50}..."
  else
    echo "❌ AI聊天（带日记）失败: HTTP $http_code"
    echo "Response: $body"
  fi
  echo ""
fi

# 8. 测试新建对话
echo "8. 测试新建对话..."
response=$(curl -s -w "\n%{http_code}" -X POST "${BACKEND_URL}/api/v1/conversations/new" \
  -H "Authorization: Bearer $TEST_TOKEN")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
  echo "✅ 新建对话成功"
else
  echo "❌ 新建对话失败: HTTP $http_code"
fi
echo ""

echo "========================================="
echo "测试完成"
echo "========================================="
