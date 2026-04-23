# 阿里云部署文件清单

## 必需文件（必须上传）

### 核心代码（9 个文件）
```
✓ main.py                          # 主应用文件
✓ database.py                      # 数据库连接模块
✓ db_adapter.py                    # 数据库适配器
✓ oss_storage.py                   # OSS 对象存储模块
✓ model_manager.py                 # 模型管理器
✓ redis_cache.py                   # Redis 缓存模块
✓ realtime_dialog_client.py        # 实时对话客户端
✓ protocol.py                      # 协议定义
✓ config.py                        # 配置文件
```

### 配置文件（3 个文件）
```
✓ .env                             # 环境变量（重要！）
✓ .env.example                     # 环境变量模板（可选）
✓ requirements.txt                 # Python 依赖
```

### 数据库（1 个文件）
```
✓ create_mysql_tables.sql          # 数据库表结构
```

### 脚本（3 个文件）
```
✓ start.sh                         # 启动脚本
✓ stop.sh                          # 停止脚本
✓ restart.sh                       # 重启脚本
```

### 文档（可选，但建议上传）
```
✓ README.md                        # 项目说明
✓ ALIYUN_DEPLOYMENT.md             # 阿里云部署指南
✓ DEPLOYMENT_CHECKLIST.md          # 部署检查清单
✓ QUICK_START_SERVER.md            # 快速启动指南
```

## 可选文件（根据需要上传）

### Web 管理工具（1 个文件）
```
○ version_manager_web.py           # Web 版本管理工具
○ start_web_tool.sh                # Web 工具启动脚本
```

### 其他文档（可选）
```
○ QUICK_START.md                   # 开发快速开始
○ MODEL_MANAGER_GUIDE.md           # 模型管理指南
○ VERSION_MANAGEMENT.md            # 版本管理文档
○ AVATAR_MANAGEMENT.md             # 头像管理文档
○ MYSQL_REDIS_SETUP.md             # MySQL/Redis 设置
○ REALTIME_VOICE_MODEL.md          # 实时语音模型文档
```

### 其他文件（可选）
```
○ execute_sql.py                   # SQL 执行工具
○ CLEANUP_SUMMARY.md               # 清理总结
```

## 快速部署文件集（最小化）

如果只部署核心功能，只需要以下文件：

```
核心代码：
- main.py
- database.py
- db_adapter.py
- oss_storage.py
- model_manager.py
- redis_cache.py
- realtime_dialog_client.py
- protocol.py
- config.py

配置文件：
- .env
- requirements.txt

数据库：
- create_mysql_tables.sql

脚本：
- start.sh
- stop.sh
- restart.sh

文档（可选但推荐）：
- ALIYUN_DEPLOYMENT.md
- DEPLOYMENT_CHECKLIST.md
```

## 上传方法

### 方法 1：使用 scp（推荐）
```bash
# 上传核心文件
scp main.py database.py db_adapter.py oss_storage.py \
    model_manager.py redis_cache.py realtime_dialog_client.py \
    protocol.py config.py .env requirements.txt \
    create_mysql_tables.sql start.sh stop.sh restart.sh \
    user@your-server:/var/www/ai-diary-backend/

# 上传文档
scp *.md user@your-server:/var/www/ai-diary-backend/
```

### 方法 2：使用 rsync（推荐）
```bash
# 上传所有文件
rsync -avz --exclude='venv' --exclude='__pycache__' \
    --exclude='node_modules' --exclude='*.pyc' \
    --exclude='.git' \
    . user@your-server:/var/www/ai-diary-backend/
```

### 方法 3：使用 git
```bash
# 在服务器上克隆
git clone your-repo-url /var/www/ai-diary-backend
cd /var/www/ai-diary-backend
```

### 方法 4：打包上传
```bash
# 本地打包
tar -czf ai-diary-backend.tar.gz \
    main.py database.py db_adapter.py oss_storage.py \
    model_manager.py redis_cache.py realtime_dialog_client.py \
    protocol.py config.py .env.example requirements.txt \
    create_mysql_tables.sql start.sh stop.sh restart.sh \
    *.md

# 上传
scp ai-diary-backend.tar.gz user@your-server:/var/www/

# 服务器上解压
ssh user@your-server
cd /var/www
tar -xzf ai-diary-backend.tar.gz
mv ai-diary-backend /var/www/ai-diary-backend
```

## 上传后的权限设置

```bash
# 设置文件所有者
sudo chown -R www-data:www-data /var/www/ai-diary-backend

# 设置脚本可执行权限
chmod +x start.sh stop.sh restart.sh start_web_tool.sh

# 设置目录权限
chmod 755 /var/www/ai-diary-backend
chmod 644 /var/www/ai-diary-backend/*.py
chmod 644 /var/www/ai-diary-backend/*.md
chmod 644 /var/www/ai-diary-backend/*.txt
chmod 644 /var/www/ai-diary-backend/*.sql
chmod 600 /var/www/ai-diary-backend/.env  # 敏感文件
```

## 验证上传

```bash
# 检查文件数量
ls -la | wc -l

# 检查关键文件
ls -la main.py database.py .env requirements.txt

# 检查文件完整性
md5sum main.py database.py db_adapter.py
```

## 常见问题

### 1. 上传速度慢
- 使用 rsync 的压缩选项：`rsync -avz`
- 使用分批上传
- 检查网络连接

### 2. 文件权限问题
- 使用 `chmod` 设置正确权限
- 确保文件所有者是正确的用户

### 3. 文件损坏
- 重新上传文件
- 使用 `md5sum` 验证文件完整性
- 使用压缩包上传（避免传输错误）

### 4. 磁盘空间不足
- 检查磁盘空间：`df -h`
- 清理不必要的文件
- 使用更大的服务器

## 最佳实践

1. **使用版本控制**
   - 使用 git 管理代码
   - 使用标签标记版本
   - 记录每次部署的版本

2. **备份配置**
   - 在修改 .env 前备份
   - 记录所有配置项

3. **分批上传**
   - 先上传核心文件
   - 测试后再上传其他文件

4. **验证完整性**
   - 每次上传后验证文件完整性
   - 检查文件权限
   - 测试服务启动

5. **记录部署日志**
   - 记录每次部署的时间
   - 记录部署的文件
   - 记录遇到的问题
