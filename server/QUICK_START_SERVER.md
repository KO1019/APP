# 快速启动指南

## 本地启动

### 方式 1：使用启动脚本（推荐）

```bash
# 启动服务
./start.sh

# 查看日志
tail -f server.log

# 停止服务
./stop.sh

# 重启服务
./restart.sh
```

### 方式 2：手动启动

```bash
# 激活虚拟环境
source venv/bin/activate

# 启动服务
python main.py
```

## 阿里云部署

详细部署指南请参考：[ALIYUN_DEPLOYMENT.md](ALIYUN_DEPLOYMENT.md)

### 快速部署步骤

1. **准备服务器环境**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install -y python3.10 python3-pip python3-venv mysql-server redis-server nginx

   # CentOS
   sudo yum update
   sudo yum install -y python3 python3-pip mysql-server redis nginx
   ```

2. **上传代码文件**
   ```bash
   # 将以下文件上传到服务器
   # - main.py
   # - database.py
   # - db_adapter.py
   # - oss_storage.py
   # - model_manager.py
   # - redis_cache.py
   # - realtime_dialog_client.py
   # - protocol.py
   # - config.py
   # - .env
   # - requirements.txt
   ```

3. **配置环境变量**
   ```bash
   # 复制并编辑 .env 文件
   cp .env.example .env
   vim .env
   ```

4. **安装依赖**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

5. **配置 Systemd 服务**
   ```bash
   sudo cp systemd-service.conf /etc/systemd/system/ai-diary-backend.service
   sudo systemctl daemon-reload
   sudo systemctl start ai-diary-backend
   sudo systemctl enable ai-diary-backend
   ```

6. **配置 Nginx 反向代理**
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/ai-diary-backend
   sudo ln -s /etc/nginx/sites-available/ai-diary-backend /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

7. **配置 SSL 证书**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

## 验证部署

### 检查服务状态

```bash
# 检查后端服务
sudo systemctl status ai-diary-backend

# 检查 Nginx
sudo systemctl status nginx
```

### 测试 API

```bash
# 健康检查
curl http://localhost:9091/

# 测试注册
curl -X POST http://localhost:9091/api/v1/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'
```

## 常见问题

### 1. 端口被占用

```bash
# 查看占用端口的进程
sudo lsof -i :9091

# 终止进程
sudo kill -9 <PID>
```

### 2. 数据库连接失败

- 检查 MySQL 服务是否运行：`sudo systemctl status mysql`
- 检查 .env 中的数据库配置是否正确
- 检查防火墙是否允许连接

### 3. Redis 连接失败

- 检查 Redis 服务是否运行：`sudo systemctl status redis`
- 检查 .env 中的 Redis 配置是否正确
- 检查 Redis 密码是否正确

### 4. 服务启动失败

查看日志：
```bash
sudo journalctl -u ai-diary-backend -f
# 或
tail -f server.log
```

## 文档

- [阿里云部署指南](ALIYUN_DEPLOYMENT.md) - 完整的部署文档
- [部署检查清单](DEPLOYMENT_CHECKLIST.md) - 部署前后的检查项
- [快速开始](QUICK_START.md) - 开发环境快速开始
- [README](README.md) - 项目说明

## 支持

如遇到问题，请查看：
1. 服务日志
2. Nginx 日志：`/var/log/nginx/`
3. 部署检查清单
