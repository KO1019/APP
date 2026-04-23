# AI情绪日记后端 - 快速部署指南

## 项目简介

AI情绪日记是一个基于FastAPI + MySQL + Nginx的全栈日记应用，提供以下核心功能：

- ✅ 用户认证（JWT）
- ✅ 日记管理（CRUD）
- ✅ AI对话（流式响应）
- ✅ 云同步
- ✅ 文件上传（对象存储）
- ✅ 管理后台
- ✅ SSL/TLS加密

## 快速开始

### 1. 环境准备

确保系统已安装以下依赖：

- Python 3.10+
- MySQL 5.7+
- Nginx

### 2. 配置环境变量

创建 `.env` 文件：

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ai_diary

# JWT密钥
JWT_SECRET=your_jwt_secret_here_change_in_production

# Redis配置（可选）
REDIS_HOST=localhost
REDIS_PORT=6379

# OSS配置（可选）
OSS_ACCESS_KEY_ID=your_oss_access_key
OSS_ACCESS_KEY_SECRET=your_oss_access_key_secret
OSS_BUCKET=your_bucket_name
OSS_ENDPOINT=your_oss_endpoint

# 管理员配置
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_TOKEN=admin_token_2024_change_me

# AI配置
API_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
API_KEY=your_api_key
```

### 3. 一键部署

```bash
# 进入项目目录
cd /workspace/projects/server

# 执行部署脚本
./deploy.sh
```

部署脚本将自动完成以下操作：
1. 检查系统依赖
2. 安装Python依赖
3. 配置数据库
4. 配置SSL证书
5. 启动后端服务
6. 配置Nginx反向代理

### 4. 验证部署

```bash
# 运行检查脚本
./check.sh
```

检查内容包括：
- ✅ 系统依赖
- ✅ 文件和目录
- ✅ 端口占用
- ✅ 服务健康度
- ✅ SSL证书
- ✅ 数据库连接

## 访问地址

| 服务 | 地址 |
|------|------|
| 后端API | http://localhost:9091 |
| 健康检查 | http://localhost:9091/api/v1/health |
| 下载页面 | http://localhost/download.html |
| 管理后台 | http://localhost/admin.html |

## 管理命令

```bash
# 停止服务
./stop.sh

# 重启服务
./restart.sh

# 清理项目
./clean.sh

# 检查部署状态
./check.sh
```

## 目录结构

```
server/
├── main.py              # 主程序入口
├── db_adapter.py        # 数据库适配器
├── model_manager.py     # AI模型管理器
├── deploy.sh            # 一键部署脚本
├── stop.sh              # 停止服务脚本
├── restart.sh           # 重启服务脚本
├── check.sh             # 部署检查脚本
├── clean.sh             # 代码清理脚本
├── admin.html           # 管理后台页面
├── download.html        # 下载页面
├── nginx.conf           # Nginx配置
├── requirements.txt     # Python依赖
└── logs/                # 日志目录
```

## API文档

### 认证相关

- `POST /api/v1/auth/register` - 用户注册
- `POST /api/v1/auth/login` - 用户登录
- `GET /api/v1/auth/me` - 获取当前用户信息

### 日记相关

- `GET /api/v1/diaries` - 获取日记列表
- `POST /api/v1/diaries` - 创建日记
- `GET /api/v1/diaries/{id}` - 获取日记详情
- `PUT /api/v1/diaries/{id}` - 更新日记
- `DELETE /api/v1/diaries/{id}` - 删除日记

### 对话相关

- `GET /api/v1/conversations` - 获取对话列表
- `POST /api/v1/conversations` - 创建对话
- `DELETE /api/v1/conversations/{id}` - 删除对话
- `GET /api/v1/conversations/{id}/messages` - 获取消息列表
- `POST /api/v1/conversations/{id}/messages/stream` - 流式对话

### 文件上传

- `POST /api/v1/upload` - 上传文件

### 管理后台

- `GET /api/v1/admin/stats` - 数据统计
- `GET /api/v1/admin/users` - 用户列表
- `DELETE /api/v1/admin/users/{id}` - 删除用户
- `GET /api/v1/admin/diaries` - 日记列表
- `DELETE /api/v1/admin/diaries/{id}` - 删除日记
- `GET /api/v1/admin/conversations` - 对话列表
- `DELETE /api/v1/admin/conversations/{id}` - 删除对话

## 日志查看

```bash
# 实时查看后端日志
tail -f logs/backend.log

# 查看最近100行日志
tail -100 logs/backend.log

# 搜索错误日志
grep ERROR logs/backend.log
```

## 常见问题

### 1. 服务无法启动

```bash
# 检查端口占用
lsof -i :9091

# 查看日志
tail -50 logs/backend.log
```

### 2. 数据库连接失败

```bash
# 测试MySQL连接
mysql -h localhost -u root -p

# 检查环境变量
cat .env
```

### 3. Nginx启动失败

```bash
# 测试配置
nginx -t

# 查看错误日志
tail -50 /var/log/nginx/error.log
```

## 性能优化建议

1. 使用Gunicorn + Uvicorn workers
2. 配置Redis缓存
3. 数据库索引优化
4. 使用CDN加速静态资源
5. 配置日志轮转（logrotate）

## 安全建议

1. 使用正式SSL证书（Let's Encrypt）
2. 配置防火墙规则
3. 启用日志审计
4. 配置速率限制
5. 使用HTTPS Only cookies

## 文档

- [部署指南](DEPLOY.md)
- [项目结构](PROJECT_STRUCTURE.md)
- [清理总结](CLEANUP_SUMMARY.md)
- [部署检查清单](DEPLOYMENT_CHECKLIST.md)
- [快速开始](QUICK_START.md)
- [管理后台文档](ADMIN_README.md)
- [模型管理指南](MODEL_MANAGER_GUIDE.md)
- [阿里云部署](ALIYUN_DEPLOYMENT.md)
- [MySQL+Redis配置](MYSQL_REDIS_SETUP.md)

## 技术栈

- **后端框架**: FastAPI
- **ASGI服务器**: Uvicorn
- **数据库**: MySQL
- **缓存**: Redis
- **对象存储**: 阿里云OSS
- **反向代理**: Nginx
- **加密**: SSL/TLS
- **认证**: JWT
- **AI模型**: 通义千问、豆包

## 许可证

MIT License

## 联系方式

如有问题，请联系开发团队。
