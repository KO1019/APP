# AI情绪日记后端 - 项目结构文档

## 目录结构

```
server/
├── 📁 logs/                    # 日志文件目录
│   ├── admin.log              # 管理后台日志
│   ├── admin.pid              # 管理后台进程ID
│   ├── backend.log            # 后端应用日志
│   └── backend.pid            # 后端进程ID
│
├── 📁 ssl/                     # SSL证书目录
│   ├── anjia.work.key         # 私钥
│   └── anjia.work.pem         # 证书
│
├── 📁 src/                     # 源代码目录
│   └── storage/               # 存储相关
│
├── 📄 核心代码文件
│   ├── main.py                # 主程序入口（FastAPI应用）
│   ├── db_adapter.py          # 数据库适配器（Mock Supabase API）
│   ├── model_manager.py       # AI模型管理器（模型切换、流式响应）
│   ├── database.py            # 数据库连接管理
│   ├── config.py              # 配置管理
│   ├── oss_storage.py         # 对象存储（阿里云OSS）
│   ├── redis_cache.py         # Redis缓存管理
│   └── protocol.py            # 协议定义
│
├── 📄 Web前端文件
│   ├── admin.html             # 管理后台页面
│   └── download.html          # 下载页面
│
├── 📄 部署脚本
│   ├── deploy.sh              # 一键部署脚本
│   ├── stop.sh                # 停止服务脚本
│   ├── restart.sh             # 重启服务脚本
│   ├── check.sh               # 部署检查脚本
│   ├── clean.sh               # 代码清理脚本
│   └── start.sh               # 启动服务脚本
│
├── 📄 Nginx配置
│   ├── nginx.conf             # Nginx主配置（HTTP + HTTPS）
│   └── nginx-ssl.conf         # SSL配置（备用）
│
├── 📄 数据库
│   └── create_mysql_tables.sql # 数据库表创建脚本
│
├── 📄 依赖配置
│   ├── requirements.txt       # Python依赖
│   └── package.json           # Node.js依赖
│
├── 📄 文档
│   ├── README.md              # 项目说明
│   ├── DEPLOY.md              # 部署指南
│   ├── CLEANUP_SUMMARY.md     # 清理总结
│   ├── DEPLOYMENT_CHECKLIST.md # 部署检查清单
│   ├── QUICK_START.md         # 快速开始
│   ├── ADMIN_README.md        # 管理后台文档
│   ├── MODEL_MANAGER_GUIDE.md # 模型管理指南
│   ├── ALIYUN_DEPLOYMENT.md   # 阿里云部署指南
│   ├── MYSQL_REDIS_SETUP.md   # MySQL+Redis配置
│   ├── VERSION_MANAGEMENT.md  # 版本管理
│   └── REALTIME_VOICE_MODEL.md # 实时语音模型
│
└── 📄 其他文件
    ├── .env                   # 环境变量配置（不提交到Git）
    └── realtime_dialog_client.py # 实时对话客户端
```

## 核心文件说明

### 1. 主程序（main.py）

**功能**：FastAPI应用主入口

**主要模块**：
- ✅ JWT认证（登录、token验证）
- ✅ 用户管理（注册、登录、更新资料）
- ✅ 日记管理（CRUD、云同步）
- ✅ 对话管理（创建、删除、查询）
- ✅ 消息管理（流式响应、历史记录）
- ✅ 文件上传（图片、音频）
- ✅ 管理后台API（用户、日记、对话统计）

**关键接口**：
- `POST /api/v1/auth/register` - 用户注册
- `POST /api/v1/auth/login` - 用户登录
- `GET /api/v1/diaries` - 获取日记列表
- `POST /api/v1/diaries` - 创建日记
- `POST /api/v1/conversations` - 创建对话
- `POST /api/v1/conversations/{id}/messages/stream` - 流式对话

### 2. 数据库适配器（db_adapter.py）

**功能**：Mock Supabase API，适配MySQL数据库

**主要类**：
- `MockSupabaseClient` - 模拟Supabase客户端
- `MockSupabaseTable` - 模拟数据表操作

**核心方法**：
- `select()` - 查询数据（支持filter、range、limit）
- `insert()` - 插入数据（自动生成UUID）
- `update()` - 更新数据（过滤id字段）
- `delete()` - 删除数据
- `eq()`、`neq()`、`gt()`、`lt()` - 查询条件
- `order()` - 排序

### 3. 模型管理器（model_manager.py）

**功能**：AI模型调用管理

**主要类**：
- `ModelManager` - 模型管理器

**核心方法**：
- `call_llm_stream()` - 流式调用大语言模型
- `generate_stream()` - 生成流式响应
- `should_use_fallback()` - 判断是否使用fallback模型
- `parse_llm_response()` - 解析LLM响应

**支持的模型**：
- ✅ qwen-plus（通义千问）
- ✅ doubao-pro（豆包）
- ✅ 自定义模型（通过环境变量配置）

### 4. 配置管理（config.py）

**功能**：统一管理配置项

**配置项**：
- 数据库配置（MySQL）
- Redis配置
- OSS配置（阿里云）
- JWT密钥
- CORS配置
- 管理员凭据

### 5. 对象存储（oss_storage.py）

**功能**：阿里云OSS文件存储

**主要方法**：
- `upload_file()` - 上传文件
- `get_file_url()` - 获取文件URL
- `delete_file()` - 删除文件

### 6. Redis缓存（redis_cache.py）

**功能**：Redis缓存管理

**主要方法**：
- `get()` - 获取缓存
- `set()` - 设置缓存
- `delete()` - 删除缓存
- `exists()` - 检查缓存是否存在

## 部署脚本说明

### 1. deploy.sh - 一键部署脚本

**功能**：完整部署流程

**步骤**：
1. 检查系统依赖（Python、MySQL、Nginx）
2. 安装Python依赖
3. 配置数据库（创建数据库、创建表）
4. 配置SSL证书（自签名）
5. 停止旧服务
6. 启动后端服务
7. 配置Nginx反向代理
8. 启动Nginx

**使用方法**：
```bash
./deploy.sh
```

### 2. stop.sh - 停止服务脚本

**功能**：停止后端和Nginx服务

**使用方法**：
```bash
./stop.sh [all]  # all表示也停止Nginx
```

### 3. restart.sh - 重启服务脚本

**功能**：完全重启服务

**使用方法**：
```bash
./restart.sh
```

### 4. check.sh - 部署检查脚本

**功能**：检查所有服务是否正常

**检查项**：
- ✅ 系统依赖（Python、MySQL、Nginx）
- ✅ 文件和目录
- ✅ 端口占用（9091、80、443）
- ✅ 服务健康度
- ✅ SSL证书
- ✅ Python依赖
- ✅ 数据库连接
- ✅ 日志文件

**使用方法**：
```bash
./check.sh
```

### 5. clean.sh - 代码清理脚本

**功能**：清理临时文件和缓存

**清理项**：
- ✅ Python缓存（__pycache__、*.pyc）
- ✅ 日志文件（保留最近7天）
- ✅ 临时文件（*.tmp、*.bak）
- ✅ SSL临时文件（可选）
- ✅ Nginx临时文件（可选）
- ✅ 数据库备份（可选）

**使用方法**：
```bash
./clean.sh                    # 基本清理
./clean.sh --clean-ssl        # 清理SSL临时文件
./clean.sh --clean-nginx      # 清理Nginx临时文件
./clean.sh --clean-backup     # 清理数据库备份
```

## Web页面说明

### 1. admin.html - 管理后台页面

**功能**：完整的管理后台

**模块**：
- 数据概览（用户数、日记数、对话数、活跃用户）
- 用户管理（查看用户、删除用户）
- 日记管理（查看日记、删除日记）
- 对话记录（查看对话、删除对话）
- 系统设置（管理员密码修改）

**访问方式**：
```
http://localhost/admin.html
```

**认证方式**：
- 用户名：admin（或环境变量ADMIN_USERNAME）
- 密码：admin123（或环境变量ADMIN_PASSWORD）

### 2. download.html - 下载页面

**功能**：App下载页面

**内容**：
- 应用介绍
- 下载按钮（iOS/Android）
- 版本说明
- 功能特性

**访问方式**：
```
http://localhost/download.html
```

## Nginx配置说明

### nginx.conf - 主配置文件

**功能**：Nginx反向代理配置

**特性**：
- ✅ HTTP自动重定向到HTTPS
- ✅ SSL/TLS加密（TLSv1.2、TLSv1.3）
- ✅ 后端API反向代理
- ✅ SSE流式响应支持
- ✅ Gzip压缩
- ✅ 静态文件托管（下载页面、管理后台）
- ✅ 客户端最大请求体50M

**监听端口**：
- HTTP: 80（自动重定向到443）
- HTTPS: 443

**反向代理规则**：
```
/api/v1/* -> http://localhost:9091/api/v1/*
/download.html -> /server/download.html
/admin.html -> /server/admin.html
```

## 数据库说明

### 表结构

#### users 表
```sql
- id: VARCHAR(36) PRIMARY KEY (UUID)
- username: VARCHAR(50) UNIQUE
- password: VARCHAR(255) (bcrypt加密)
- email: VARCHAR(100) UNIQUE
- avatar_url: TEXT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### diaries 表
```sql
- id: VARCHAR(36) PRIMARY KEY (UUID)
- user_id: VARCHAR(36) FOREIGN KEY
- title: VARCHAR(200)
- content: TEXT
- mood: VARCHAR(50)
- tags: JSON
- images: JSON
- location: VARCHAR(200)
- weather: VARCHAR(50)
- date: DATE
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- cloud_sync_enabled: BOOLEAN
```

#### conversations 表
```sql
- id: VARCHAR(36) PRIMARY KEY (UUID)
- user_id: VARCHAR(36) FOREIGN KEY
- title: VARCHAR(200)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### messages 表
```sql
- id: VARCHAR(36) PRIMARY KEY (UUID)
- conversation_id: VARCHAR(36) FOREIGN KEY
- role: VARCHAR(20) (user/assistant/system)
- content: TEXT
- created_at: TIMESTAMP
```

#### cloud_sync 表
```sql
- id: VARCHAR(36) PRIMARY KEY (UUID)
- user_id: VARCHAR(36) FOREIGN KEY
- diary_id: VARCHAR(36)
- action: VARCHAR(20) (create/update/delete)
- status: VARCHAR(20) (pending/completed/failed)
- created_at: TIMESTAMP
```

### 初始化脚本

**文件**：create_mysql_tables.sql

**使用方法**：
```bash
mysql -u root -p ai_diary < create_mysql_tables.sql
```

## 依赖说明

### Python依赖（requirements.txt）

| 包名 | 版本 | 用途 |
|------|------|------|
| fastapi | 0.115.0 | Web框架 |
| uvicorn | 0.32.0 | ASGI服务器 |
| websockets | 13.1 | WebSocket支持 |
| httpx | 0.27.0 | HTTP客户端（AI调用） |
| pydantic | 2.9.0 | 数据验证 |
| python-dotenv | 1.0.0 | 环境变量 |
| pymysql | 1.1.0 | MySQL驱动 |
| redis | 5.0.0 | Redis客户端 |
| oss2 | 2.18.0 | 阿里云OSS |
| requests | 2.31.0 | HTTP请求 |
| python-multipart | 0.0.12 | 文件上传 |
| passlib[bcrypt] | 1.7.4 | 密码加密 |

### Node.js依赖（package.json）

- pymysql - 通过pnpm链接
- redis - 通过pnpm链接

## 环境变量说明

### 必需配置

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ai_diary

# JWT密钥
JWT_SECRET=your_jwt_secret_here_change_in_production
JWT_ALGORITHM=HS256

# Redis配置（可选）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=

# OSS配置（可选）
OSS_ACCESS_KEY_ID=your_oss_access_key
OSS_ACCESS_KEY_SECRET=your_oss_access_key_secret
OSS_BUCKET=your_bucket_name
OSS_ENDPOINT=your_oss_endpoint

# 管理员配置
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_TOKEN=admin_token_2024_change_me

# API配置
API_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
API_KEY=your_api_key
```

## 端口说明

| 服务 | 端口 | 用途 |
|------|------|------|
| 后端API | 9091 | FastAPI应用 |
| HTTP | 80 | Nginx HTTP（重定向） |
| HTTPS | 443 | Nginx HTTPS |
| MySQL | 3306 | 数据库 |
| Redis | 6379 | 缓存 |

## 日志说明

### 日志文件位置

```
logs/
├── admin.log              # 管理后台日志
├── admin.pid              # 管理后台进程ID
├── backend.log            # 后端应用日志
└── backend.pid            # 后端进程ID
```

### 日志级别

- INFO: 正常运行信息
- WARNING: 警告信息
- ERROR: 错误信息
- DEBUG: 调试信息（开发环境）

### 查看日志

```bash
# 实时查看后端日志
tail -f logs/backend.log

# 实时查看管理后台日志
tail -f logs/admin.log

# 查看最近100行日志
tail -100 logs/backend.log

# 搜索错误日志
grep ERROR logs/backend.log
```

## API端点清单

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

- `GET /api/v1/admin/health` - 健康检查
- `GET /api/v1/admin/stats` - 数据统计
- `GET /api/v1/admin/users` - 用户列表
- `DELETE /api/v1/admin/users/{id}` - 删除用户
- `GET /api/v1/admin/diaries` - 日记列表
- `DELETE /api/v1/admin/diaries/{id}` - 删除日记
- `GET /api/v1/admin/conversations` - 对话列表
- `DELETE /api/v1/admin/conversations/{id}` - 删除对话

## 常见问题

### 1. 服务无法启动

**检查**：
```bash
# 检查端口占用
lsof -i :9091

# 查看日志
tail -50 logs/backend.log

# 检查Python依赖
python3 -c "import fastapi, uvicorn, pymysql"
```

### 2. 数据库连接失败

**检查**：
```bash
# 测试MySQL连接
mysql -h localhost -u root -p

# 检查环境变量
cat .env

# 检查数据库是否存在
mysql -u root -p -e "SHOW DATABASES LIKE 'ai_diary'"
```

### 3. SSL证书问题

**检查**：
```bash
# 查看证书有效期
openssl x509 -in ssl/cert.pem -noout -dates

# 重新生成证书
openssl req -x509 -newkey rsa:2048 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes
```

### 4. Nginx启动失败

**检查**：
```bash
# 测试配置
nginx -t

# 查看错误日志
tail -50 /var/log/nginx/error.log

# 检查SSL证书
ls -l ssl/
```

## 更新日志

### v1.0.0 (2024-01-01)

- ✅ 初始版本发布
- ✅ 完整的用户认证系统
- ✅ 日记管理功能
- ✅ AI对话功能
- ✅ 云同步功能
- ✅ 文件上传功能
- ✅ 管理后台
- ✅ SSL/TLS支持
- ✅ 一键部署脚本

## 总结

本后端系统提供完整的日记应用支持，包括：
- ✅ 用户认证与授权
- ✅ 日记CRUD操作
- ✅ AI对话功能（流式响应）
- ✅ 云同步功能
- ✅ 文件上传（对象存储）
- ✅ 管理后台
- ✅ SSL/TLS加密
- ✅ 一键部署

所有代码已完成清理和优化，可以通过 `./deploy.sh` 一键部署。
