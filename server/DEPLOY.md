# AI情绪日记 - 部署指南

## 快速开始

### 一键部署

```bash
cd /workspace/projects/server
./deploy.sh
```

这将自动完成：
1. ✅ 检查系统依赖（Python、MySQL、Nginx）
2. ✅ 安装Python依赖包
3. ✅ 配置数据库表
4. ✅ 配置SSL证书（自签名）
5. ✅ 启动后端服务
6. ✅ 配置Nginx反向代理
7. ✅ 启动Nginx

### 管理脚本

```bash
# 停止服务
./stop.sh

# 重启服务
./restart.sh

# 停止服务（包括Nginx）
./stop.sh --with-nginx
```

## 访问地址

部署完成后，可以通过以下地址访问：

| 服务 | 地址 |
|------|------|
| 后端API | http://localhost:9091 |
| 健康检查 | http://localhost:9091/api/v1/health |
| 下载页面 | http://localhost/download.html |
| 管理后台 | http://localhost/admin.html |

## 环境变量配置

创建 `.env` 文件并配置以下变量：

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ai_diary
DB_USER=root
DB_PASSWORD=your_password

# JWT密钥
JWT_SECRET=your_jwt_secret_key_here

# 管理后台配置
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_TOKEN=your_admin_token_here

# 服务端口
SERVER_PORT=9091

# 日志级别
LOG_LEVEL=info
```

## SSL证书配置

### 开发环境（自签名证书）

部署脚本会自动生成自签名SSL证书，位于：
- 证书文件：`ssl/cert.pem`
- 密钥文件：`ssl/key.pem`

### 生产环境（正式证书）

替换自签名证书为正式的SSL证书：

```bash
# 替换证书文件
cp your-cert.pem ssl/cert.pem
cp your-key.pem ssl/key.pem

# 重启服务
./restart.sh
```

## Nginx配置

Nginx配置文件：`nginx.conf`

主要功能：
- ✅ HTTP自动重定向到HTTPS
- ✅ SSL/TLS加密
- ✅ 后端API反向代理
- ✅ 下载页面托管
- ✅ 管理后台托管
- ✅ Gzip压缩
- ✅ SSE流式响应支持

自定义Nginx配置后，运行：

```bash
# 测试配置
nginx -t

# 重载配置
nginx -s reload

# 重启Nginx
./restart.sh
```

## 查看日志

```bash
# 查看后端日志
tail -f logs/app.log

# 查看Nginx访问日志
tail -f /var/log/nginx/ai-diary-access.log

# 查看Nginx错误日志
tail -f /var/log/nginx/ai-diary-error.log
```

## 常见问题

### 1. 端口被占用

```bash
# 查看端口占用
lsof -i :9091

# 停止占用端口的进程
kill -9 <PID>
```

### 2. 数据库连接失败

检查 `.env` 文件中的数据库配置是否正确。

### 3. Nginx启动失败

```bash
# 测试Nginx配置
nginx -t

# 查看Nginx错误日志
tail -f /var/log/nginx/error.log
```

### 4. SSL证书问题

```bash
# 检查证书文件
ls -la ssl/

# 检查证书有效期
openssl x509 -in ssl/cert.pem -noout -dates
```

## 生产环境部署建议

### 1. 使用正式SSL证书

推荐使用 Let's Encrypt 免费证书：

```bash
# 安装certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com
```

### 2. 配置防火墙

```bash
# 只开放80和443端口
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 3. 使用Supervisor管理进程

创建 `/etc/supervisor/conf.d/ai-diary.conf`：

```ini
[program:ai-diary]
directory=/workspace/projects/server
command=python3 main.py
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/workspace/projects/server/logs/app.log
```

### 4. 配置系统服务

创建 `/etc/systemd/system/ai-diary.service`：

```ini
[Unit]
Description=AI情绪日记后端服务
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/workspace/projects/server
ExecStart=/usr/bin/python3 /workspace/projects/server/main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable ai-diary
sudo systemctl start ai-diary
sudo systemctl status ai-diary
```

## 性能优化

### 1. 数据库优化

```sql
-- 添加索引
CREATE INDEX idx_user_id ON diaries(user_id);
CREATE INDEX idx_created_at ON diaries(created_at);
CREATE INDEX idx_user_message ON conversations(user_id);
```

### 2. Nginx优化

- 启用Gzip压缩（已配置）
- 配置静态资源缓存（已配置）
- 使用HTTP/2（已配置）

### 3. Python优化

- 使用Gunicorn + Uvicorn workers
- 启用连接池
- 使用Redis缓存

## 备份与恢复

### 数据库备份

```bash
# 备份数据库
mysqldump -u root -p ai_diary > backup_$(date +%Y%m%d).sql

# 恢复数据库
mysql -u root -p ai_diary < backup_20240101.sql
```

### 日志备份

```bash
# 备份日志
tar -czf logs_backup_$(date +%Y%m%d).tar.gz logs/
```

## 监控与告警

### 健康检查

```bash
curl http://localhost:9091/api/v1/health
```

### 日志监控

```bash
# 实时查看日志
tail -f logs/app.log

# 搜索错误日志
grep ERROR logs/app.log
```

## 更新部署

```bash
# 拉取最新代码
git pull

# 重启服务
./restart.sh
```

## 联系支持

如有问题，请查看：
- 后端日志：`logs/app.log`
- Nginx日志：`/var/log/nginx/`
- 健康检查：`http://localhost:9091/api/v1/health`
