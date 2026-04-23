# 管理后台使用指南

## 简介

管理后台是一个基于 Web 的可视化工具，用于管理 AI 情绪日记系统的各项功能，包括：
- 版本管理
- 用户管理
- 模型管理
- 欢迎内容管理
- 公告管理

## 启动管理后台

### 方式 1：与后端服务一起启动（推荐）

```bash
# 启动所有服务（后端 + 管理后台）
./start_all.sh
```

这将同时启动：
- 后端 API 服务（端口 9091）
- 管理后台（端口 9092）

### 方式 2：单独启动管理后台

```bash
# 激活虚拟环境
source venv/bin/activate

# 启动管理后台
python version_manager_web.py
```

### 方式 3：使用原始脚本

```bash
./start_web_tool.sh
```

## 访问管理后台

### 本地访问
```
http://localhost:9092/version-manager
```

### 远程访问（通过 Nginx）
```
https://your-domain.com/admin/
```

## 管理后台功能

### 1. 版本管理
- 查看 APP 版本列表
- 上传新版本 APK
- 更新版本信息
- 激活/停用版本
- 删除版本

### 2. 用户管理
- 查看用户列表
- 查看用户详细信息
- 查看用户的日记数量
- 设置/取消管理员权限
- 删除用户

### 3. 模型管理
- 查看所有模型配置
- 切换模型状态
- 查看模型使用统计
- 重置模型黑名单

### 4. 欢迎内容管理
- 查看欢迎内容列表
- 添加新的欢迎内容
- 编辑欢迎内容
- 删除欢迎内容

### 5. 公告管理
- 查看公告列表
- 添加新公告
- 编辑公告
- 删除公告

## API 配置

管理后台通过调用后端 API 来获取和操作数据。默认配置：

```python
# version_manager_web.py
BASE_URL = os.getenv('VERSION_MANAGER_API_URL', 'http://localhost:9091')
```

### 修改 API 地址

**方式 1：通过环境变量**
```bash
export VERSION_MANAGER_API_URL=http://your-api-server:9091
python version_manager_web.py
```

**方式 2：通过 .env 文件**
```env
VERSION_MANAGER_API_URL=http://your-api-server:9091
```

**方式 3：修改代码**
```python
BASE_URL = 'http://your-api-server:9091'
```

## 阿里云部署

### Systemd 服务配置

创建 `/etc/systemd/system/ai-diary-admin.service`：

```ini
[Unit]
Description=AI Diary Admin Panel
After=network.target ai-diary-backend.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/ai-diary-backend
Environment="PATH=/var/www/ai-diary-backend/venv/bin"
ExecStart=/var/www/ai-diary-backend/venv/bin/python version_manager_web.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启动服务：
```bash
sudo systemctl daemon-reload
sudo systemctl start ai-diary-admin
sudo systemctl enable ai-diary-admin
```

### Nginx 反向代理配置

在 Nginx 配置中添加管理后台代理：

```nginx
upstream admin {
    server 127.0.0.1:9092;
}

server {
    # ... 其他配置 ...

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
}
```

## 安全建议

### 1. 访问控制
- 在 Nginx 中配置 IP 白名单
- 使用基本认证（Basic Auth）
- 使用 OAuth2 或其他认证方式

### 2. HTTPS
- 配置 SSL 证书
- 强制使用 HTTPS

### 3. 防火墙
- 只允许特定 IP 访问管理后台
- 不要直接暴露管理后台端口（9092）

## 常见问题

### 1. 无法连接到后端 API

**原因**：管理后台无法访问后端服务

**解决方法**：
- 检查后端服务是否运行：`sudo systemctl status ai-diary-backend`
- 检查 API 地址配置是否正确
- 检查防火墙规则

### 2. 管理后台无法启动

**原因**：端口被占用或权限问题

**解决方法**：
```bash
# 检查端口占用
sudo lsof -i :9092

# 杀掉占用进程
sudo kill -9 <PID>

# 检查日志
tail -f logs/admin.log
```

### 3. 数据无法保存

**原因**：后端 API 返回错误

**解决方法**：
- 检查后端日志：`tail -f logs/backend.log`
- 检查数据库连接
- 检查 API 认证

## 日志查看

### 查看管理后台日志
```bash
# 使用脚本
tail -f logs/admin.log

# 或使用 journalctl
sudo journalctl -u ai-diary-admin -f
```

### 查看后端日志
```bash
# 使用脚本
tail -f logs/backend.log

# 或使用 journalctl
sudo journalctl -u ai-diary-backend -f
```

## 快速命令

```bash
# 启动所有服务
./start_all.sh

# 停止所有服务
./stop_all.sh

# 重启所有服务
./restart_all.sh

# 查看服务状态
ps aux | grep -E "(main.py|version_manager_web.py)"

# 查看端口占用
lsof -i :9091 -i :9092
```

## 更新管理后台

```bash
# 停止服务
./stop_all.sh

# 更新代码
# 上传新的 version_manager_web.py

# 重启服务
./start_all.sh
```

## 技术栈

- 后端框架：FastAPI
- 前端：纯 HTML/CSS/JavaScript（无依赖）
- 端口：9092
- API：调用后端 REST API

## 界面预览

管理后台界面包含以下部分：
- 顶部导航栏（切换不同功能模块）
- 主内容区域（显示数据和操作界面）
- 模态框（用于添加/编辑数据）
- 操作按钮（保存、删除等）

详细界面效果请访问：http://localhost:9092/version-manager

## 相关文档

- [阿里云部署指南](ALIYUN_DEPLOYMENT.md)
- [部署文件清单](DEPLOYMENT_FILES.md)
- [快速启动指南](QUICK_START_SERVER.md)
