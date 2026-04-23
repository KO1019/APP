#!/bin/bash

# AI情绪日记 - 代码清理脚本
# 用于清理临时文件、日志和缓存

set -e

PROJECT_ROOT="/workspace/projects/server"
cd "$PROJECT_ROOT" || exit 1

echo "=== 清理AI情绪日记项目 ==="

# 1. 清理Python缓存
echo "清理Python缓存..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true
find . -type f -name "*.pyo" -delete 2>/dev/null || true
echo "✓ Python缓存已清理"

# 2. 清理日志文件
echo "清理日志文件..."
if [ -d "logs" ]; then
    # 保留最近7天的日志
    find logs/ -name "*.log" -mtime +7 -delete 2>/dev/null || true
    echo "✓ 日志文件已清理（保留最近7天）"
fi

# 3. 清理临时文件
echo "清理临时文件..."
find . -name "*.tmp" -delete 2>/dev/null || true
find . -name "*.bak" -delete 2>/dev/null || true
find . -name "*~" -delete 2>/dev/null || true
echo "✓ 临时文件已清理"

# 4. 清理SSL临时文件（可选）
if [ "$1" == "--clean-ssl" ]; then
    echo "清理SSL临时文件..."
    rm -f ssl/*.csr ssl/*.srl 2>/dev/null || true
    echo "✓ SSL临时文件已清理"
fi

# 5. 清理Nginx临时文件
if [ "$1" == "--clean-nginx" ]; then
    echo "清理Nginx临时文件..."
    rm -f /tmp/nginx_* 2>/dev/null || true
    echo "✓ Nginx临时文件已清理"
fi

# 6. 清理数据库备份（可选）
if [ "$1" == "--clean-backup" ]; then
    echo "清理数据库备份..."
    find . -name "backup_*.sql" -mtime +30 -delete 2>/dev/null || true
    echo "✓ 数据库备份已清理（保留最近30天）"
fi

# 显示清理结果
echo ""
echo "=== 清理完成 ==="
echo "磁盘使用情况:"
df -h "$PROJECT_ROOT"

echo ""
echo "日志目录大小:"
du -sh logs/ 2>/dev/null || echo "日志目录不存在"

exit 0
