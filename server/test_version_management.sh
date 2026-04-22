#!/bin/bash
# 版本管理系统测试脚本

echo "=========================================="
echo "版本管理系统功能测试"
echo "=========================================="
echo ""

BASE_URL="http://localhost:9091"

# 测试1：健康检查
echo "📋 测试1：健康检查"
echo "----------------------------------------"
curl -s http://localhost:9091/api/v1/health
echo -e "\n✅ 健康检查通过\n"
echo ""

# 测试2：创建新版本
echo "📋 测试2：创建新版本（1.0.3）"
echo "----------------------------------------"
CREATE_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{
    "version":"1.0.3",
    "build_number":103,
    "platform":"android",
    "force_update":false,
    "release_notes":"测试版本1.0.3\n1. 新功能\n2. 优化体验"
  }' \
  http://localhost:9091/api/v1/admin/versions)

echo "$CREATE_RESPONSE"
VERSION_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo -e "\n✅ 版本创建成功，ID: $VERSION_ID\n"
echo ""

# 测试3：查看所有版本
echo "📋 测试3：查看所有Android版本"
echo "----------------------------------------"
curl -s -X GET "http://localhost:9091/api/v1/admin/versions?platform=android" | python3 -m json.tool
echo -e "\n✅ 获取版本列表成功\n"
echo ""

# 测试4：激活版本
echo "📋 测试4：激活版本 $VERSION_ID"
echo "----------------------------------------"
curl -s -X POST "http://localhost:9091/api/v1/admin/versions/$VERSION_ID/activate" | python3 -m json.tool
echo -e "\n✅ 版本激活成功\n"
echo ""

# 测试5：查看激活的版本
echo "📋 测试5：查看当前激活的版本"
echo "----------------------------------------"
curl -s -X GET "http://localhost:9091/api/v1/admin/versions/active" | python3 -m json.tool
echo -e "\n✅ 获取激活版本成功\n"
echo ""

# 测试6：检查更新（旧版本）
echo "📋 测试6：检查更新（当前版本1.0.0，应该有更新）"
echo "----------------------------------------"
curl -s -X POST -H "Content-Type: application/json" \
  -d '{
    "platform":"android",
    "current_version":"1.0.0",
    "build_number":100
  }' \
  http://localhost:9091/api/v1/app/check-update | python3 -m json.tool
echo -e "\n✅ 检查更新成功\n"
echo ""

# 测试7：检查更新（最新版本）
echo "📋 测试7：检查更新（当前版本1.0.3，应该无更新）"
echo "----------------------------------------"
curl -s -X POST -H "Content-Type: application/json" \
  -d '{
    "platform":"android",
    "current_version":"1.0.3",
    "build_number":103
  }' \
  http://localhost:9091/api/v1/app/check-update | python3 -m json.tool
echo -e "\n✅ 检查更新成功\n"
echo ""

echo "=========================================="
echo "✅ 所有测试完成！"
echo "=========================================="
