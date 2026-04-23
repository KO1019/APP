# 阿里云后端部署指南

本文档指导如何在阿里云服务器上部署 AI 情绪日记后端服务。

## 1. 服务器准备

### 1.1 系统要求
- 操作系统：CentOS 7+ / Ubuntu 18.04+
- Python 版本：3.10+
- 内存：至少 2GB
- 磁盘：至少 20GB

### 1.2 安装必要软件

**Ubuntu/Debian：**
```bash
sudo apt update
sudo apt install -y python3.10 python3-pip python3-venv mysql-server redis-server nginx
```

**CentOS：**
```bash
sudo yum update
sudo yum install -y python3 python3-pip mysql-server redis nginx
```

## 2. 数据库配置

### 2.1 配置 MySQL 远程访问

编辑 MySQL 配置文件：
```bash
sudo vim /etc/mysql/mysql.conf.d/mysqld.cnf  # Ubuntu
# 或
sudo vim /etc/my.cnf  # CentOS
```

修改 bind-address：
```ini
bind-address = 0.0.0.0
```

重启 MySQL：
```bash
sudo systemctl restart mysql
```

创建数据库和用户：
```sql
CREATE DATABASE ai_emotion_diary CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ai_diary'@'%' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON ai_emotion_diary.* TO 'ai_diary'@'%';
FLUSH PRIVILEGES;
```

导入表结构：
```bash
mysql -u ai_diary -p ai_emotion_diary < create_mysql_tables.sql
```

### 2.2 配置 Redis

编辑 Redis 配置文件：
```bash
sudo vim /etc/redis/redis.conf
```

修改以下配置：
```ini
bind 0.0.0.0
requirepass your_redis_password
```

重启 Redis：
```bash
sudo systemctl restart redis
```

## 3. 部署后端应用

### 3.1 创建部署目录
```bash
sudo mkdir -p /var/www/ai-diary-backend
sudo chown -R $USER:$USER /var/www/ai-diary-backend
cd /var/www/ai-diary-backend
```

### 3.2 上传代码文件

将以下文件上传到服务器：
- `main.py`
- `database.py`
- `db_adapter.py`
- `oss_storage.py`
- `model_manager.py`
- `redis_cache.py`
- `realtime_dialog_client.py`
- `protocol.py`
- `config.py`
- `version_manager_web.py`  # 管理后台
- `.env`
- `requirements.txt`

### 3.3 创建虚拟环境
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3.4 安装依赖
```bash
pip install -r requirements.txt
```

### 3.5 配置环境变量

编辑 `.env` 文件：
```env
# 服务器端口
PORT=9091

# JWT密钥（生产环境请修改为更复杂的值）
JWT_SECRET=your-very-strong-secret-key-here

# 豆包（火山引擎）ARK API配置（语言模型）
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_API_KEY=your-ark-api-key
ARK_CHAT_MODEL=your-chat-model-id

# 豆包语音API配置
VOLCENGINE_SPEECH_APP_ID=your-speech-app-id
VOLCENGINE_SPEECH_SECRET_KEY=your-speech-secret-key
VOLCENGINE_ACCESS_TOKEN=your-access-token
VOLCENGINE_API_KEY=your-volcengine-api-key

# MySQL数据库配置
MYSQL_HOST=your-mysql-host
MYSQL_PORT=3306
MYSQL_USER=ai_diary
MYSQL_PASSWORD=your-mysql-password
MYSQL_DATABASE=ai_emotion_diary
MYSQL_CHARSET=utf8mb4

# Redis配置
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=your-redis-password

# 阿里云OSS对象存储配置
OSS_ENDPOINT=oss-cn-beijing.aliyuncs.com
OSS_ACCESS_KEY_ID=your-oss-access-key-id
OSS_ACCESS_KEY_SECRET=your-oss-access-key-secret
OSS_BUCKET_NAME=your-bucket-name
OSS_PUBLIC_READ=true
```

### 3.6 测试运行

启动所有服务：
```bash
./start.sh
```

这将同时启动：
- 后端 API 服务（端口 9091）
- 管理后台（端口 9092）

停止所有服务：
```bash
./stop.sh
```

重启所有服务：
```bash
./restart.sh
```

## 4. 使用 Systemd 管理服务

### 4.1 创建服务文件

```bash
sudo vim /etc/systemd/system/ai-diary-backend.service
```

添加以下内容：
```ini
[Unit]
Description=AI Diary Backend Service
After=network.target mysql.service redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/ai-diary-backend
ExecStart=/usr/bin/python3 main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 4.2 启动服务
```bash
sudo systemctl daemon-reload
sudo systemctl start ai-diary-backend
sudo systemctl enable ai-diary-backend
sudo systemctl status ai-diary-backend
```

### 4.3 创建管理后台服务文件

```bash
sudo vim /etc/systemd/system/ai-diary-admin.service
```

添加以下内容：
```ini
[Unit]
Description=AI Diary Admin Panel
After=network.target ai-diary-backend.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/ai-diary-backend
ExecStart=/usr/bin/python3 version_manager_web.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 4.4 启动管理后台服务
```bash
sudo systemctl daemon-reload
sudo systemctl start ai-diary-admin
sudo systemctl enable ai-diary-admin
sudo systemctl status ai-diary-admin
```

## 5. 配置 Nginx 反向代理

### 5.1 创建 Nginx 配置文件

```bash
sudo vim /etc/nginx/sites-available/ai-diary-backend
```

添加以下内容：
```nginx
upstream backend {
    server 127.0.0.1:9091;
}

upstream admin {
    server 127.0.0.1:9092;
}

server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 100M;

    # 后端 API
    location /api/ {
        proxy_pass http://backend/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 支持
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # 超时设置
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # 管理后台
    location /admin/ {
        proxy_pass http://admin/version-manager/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 支持
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # 超时设置
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # 健康检查
    location / {
        proxy_pass http://backend/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 5.2 启用配置
```bash
sudo ln -s /etc/nginx/sites-available/ai-diary-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 6. 配置 SSL 证书（HTTPS）

使用 Let's Encrypt 免费证书：

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

证书会自动续期。

## 7. 防火墙配置

开放必要端口：
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

注意：管理后台通过 Nginx 反向代理访问，不需要单独开放 9092 端口。

## 8. 日志管理

查看服务日志：
```bash
sudo journalctl -u ai-diary-backend -f
```

查看 Nginx 日志：
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 9. 安全建议

### 9.1 修改 CORS 配置

编辑 `main.py`，将 `allow_origins` 改为具体的域名：

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-domain.com"],  # 改为前端域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 9.2 修改 JWT 密钥

确保 `.env` 中的 `JWT_SECRET` 是强随机字符串：

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 9.3 数据库安全

- 使用强密码
- 只允许本地或应用服务器访问数据库
- 定期备份数据

### 9.4 限制 Redis 访问

Redis 应该只允许本地访问，如果需要远程访问，请配置防火墙规则。

## 10. 监控和维护

### 10.1 定期备份数据库

创建备份脚本 `/var/www/ai-diary-backend/backup.sh`：

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/ai-diary"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
mysqldump -u ai_diary -p'your_password' ai_emotion_diary | gzip > $BACKUP_DIR/backup_$DATE.sql.gz
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
```

添加到 crontab：
```bash
crontab -e
```

每天凌晨 2 点备份：
```
0 2 * * * /var/www/ai-diary-backend/backup.sh
```

### 10.2 监控服务状态

创建监控脚本，定期检查服务状态并在异常时发送告警。

## 11. 常见问题

### 11.1 服务无法启动

检查日志：
```bash
sudo journalctl -u ai-diary-backend -n 50
```

常见原因：
- 端口被占用
- 数据库连接失败
- Redis 连接失败
- 依赖包未安装

### 11.2 WebSocket 连接失败

检查 Nginx 配置中的 WebSocket 支持是否正确。

### 11.3 文件上传失败

检查：
- Nginx 的 `client_max_body_size` 配置
- OSS 配置是否正确
- 磁盘空间是否充足

## 12. 更新部署

```bash
cd /var/www/ai-diary-backend
# 上传新文件
sudo systemctl restart ai-diary-backend
sudo systemctl restart ai-diary-admin
```

## 13. 文件清单

部署所需的文件：
```
/var/www/ai-diary-backend/
├── main.py                          # 主应用文件
├── database.py                      # 数据库连接模块
├── db_adapter.py                    # 数据库适配器
├── oss_storage.py                   # OSS 对象存储模块
├── model_manager.py                 # 模型管理器
├── redis_cache.py                   # Redis 缓存模块
├── realtime_dialog_client.py        # 实时对话客户端
├── protocol.py                      # 协议定义
├── config.py                        # 配置文件
├── version_manager_web.py           # 管理后台
├── .env                             # 环境变量
├── .env.example                     # 环境变量模板
├── requirements.txt                 # Python 依赖
├── create_mysql_tables.sql          # 数据库表结构
├── start.sh                         # 启动脚本
├── stop.sh                          # 停止脚本
├── restart.sh                       # 重启脚本
└── logs/                            # 日志目录
```

## 14. 性能优化建议

1. **数据库连接池**：已实现，无需额外配置
2. **Redis 缓存**：已实现，确保 Redis 正常运行
3. **Nginx 缓存**：可配置静态资源缓存
4. **CDN 加速**：将 OSS 配置为 CDN 加速
5. **负载均衡**：如需更高性能，可部署多实例并使用负载均衡

## 15. 联系支持

如遇到问题，请检查：
1. 服务日志
2. 数据库连接状态
3. Redis 连接状态
4. 网络防火墙规则
