#!/bin/bash

echo "=========================================="
echo "🚀 版本管理系统 Web可视化工具"
echo "=========================================="
echo ""

# 检查Python是否安装
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 未安装，请先安装 Python 3.10+"
    exit 1
fi

# 检查.env文件
if [ ! -f ".env" ]; then
    echo "⚠️  .env 文件不存在"
    echo "正在复制 .env.example 到 .env ..."
    cp .env.example .env
    echo "✅ 请编辑 .env 文件并填写配置"
    exit 0
fi

echo "📊 启动Web可视化工具..."
echo "🌐 访问地址: http://localhost:9092/version-manager"
echo "🔗 后端API: http://localhost:9091"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

# 启动服务
python3 version_manager_web.py
