# AI情绪日记 - 详细设置指南

## 📋 目录

1. [服务器配置（后端）](#1-服务器配置后端)
2. [Expo账户配置（前端）](#2-expo账户配置前端)
3. [构建APK](#3-构建apk)

---

## 1. 服务器配置（后端）

### 1.1 安装必要软件

#### 登录服务器（59.110.39.235）

```bash
ssh root@59.110.39.235
# 输入服务器密码
```

#### 安装Python和MySQL

```bash
# 更新软件包
apt update

# 安装Python 3.10+
apt install python3 python3-pip -y

# 安装MySQL
apt install mysql-server -y

# 启动MySQL
systemctl start mysql
systemctl enable mysql
```

### 1.2 配置MySQL

#### 创建数据库和用户

```bash
# 登录MySQL
mysql -u root -p
# 输入MySQL密码（可能为空，直接回车）
```

在MySQL命令行中执行：

```sql
-- 创建数据库
CREATE DATABASE ai_diary DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户（替换your_password为你的密码）
CREATE USER 'diary_user'@'localhost' IDENTIFIED BY 'your_strong_password_here';

-- 授权
GRANT ALL PRIVILEGES ON ai_diary.* TO 'diary_user'@'localhost';
FLUSH PRIVILEGES;

-- 退出
EXIT;
```

**需要填写的内容**：
- `your_strong_password_here` - 替换为你自己设置的数据库密码（建议包含大小写字母、数字、特殊字符）

### 1.3 上传代码到服务器

#### 方法1: 使用git clone（推荐）

```bash
# 安装git
apt install git -y

# 克隆项目（如果有git仓库）
cd /opt
git clone <你的仓库地址> emotion-diary

# 或者上传本地代码
cd /opt
mkdir emotion-diary
# 使用scp上传：scp -r /workspace/projects/* root@59.110.39.235:/opt/emotion-diary/
```

#### 方法2: 使用scp上传

在本地电脑执行：

```bash
# 打包项目
cd /workspace/projects
tar -czf emotion-diary.tar.gz server client deploy-all.sh

# 上传到服务器
scp emotion-diary.tar.gz root@59.110.39.235:/opt/

# 在服务器上解压
ssh root@59.110.39.235
cd /opt
tar -xzf emotion-diary.tar.gz
mv projects emotion-diary
```

### 1.4 配置环境变量

```bash
cd /opt/emotion-diary/server
cp .env.example .env
nano .env
```

**需要填写的内容**（替换以下内容）：

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=diary_user
DB_PASSWORD=your_strong_password_here  # 填你刚才设置的数据库密码
DB_NAME=ai_diary

# JWT密钥（生成随机字符串）
JWT_SECRET=your_random_jwt_secret_here_123456789  # 填一个随机的长字符串
JWT_ALGORITHM=HS256

# 管理员配置
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_admin_password_here  # 设置管理员登录密码
ADMIN_TOKEN=admin_token_2024_change_me

# 服务器配置
SERVER_HOST=0.0.0.0
SERVER_PORT=9091
PRODUCTION_URL=http://59.110.39.235:9091

# API配置（通义千问）
API_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
API_KEY=your_qwen_api_key_here  # 你的通义千问API密钥

# ARK配置（可选）
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_API_KEY=your_ark_api_key_here  # 你的豆包ARK API密钥（可选）
ARK_CHAT_MODEL=  # 留空或填你的模型ID

# Redis配置（可选）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=

# OSS配置（可选，用于图片存储）
OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
OSS_BUCKET=
OSS_ENDPOINT=
```

**保存文件**：按 `Ctrl+X`，然后按 `Y`，再按 `Enter`

### 1.5 安装Python依赖

```bash
cd /opt/emotion-diary/server
pip3 install -r requirements.txt
```

### 1.6 创建数据库表

```bash
# 创建数据库表
mysql -u diary_user -p ai_diary < create_mysql_tables.sql
# 输入你设置的数据库密码
```

### 1.7 启动后端服务

```bash
cd /opt/emotion-diary/server
./deploy.sh
```

### 1.8 测试后端

```bash
# 测试健康检查
curl http://localhost:9091/api/v1/health

# 应该返回：{"status":"ok"}
```

### 1.9 配置防火墙

```bash
# 开放9091端口
ufw allow 9091
ufw allow 80
ufw allow 443
ufw reload
```

### 1.10 测试外部访问

在本地电脑浏览器访问：

```
http://59.110.39.235:9091/api/v1/health
```

应该返回：`{"status":"ok"}`

---

## 2. Expo账户配置（前端）

### 2.1 注册Expo账户

1. 访问 https://expo.dev
2. 点击右上角 "Sign Up"
3. 填写注册信息：
   - **Email**: 填你的邮箱
   - **Password**: 设置密码
   - **Confirm Password**: 确认密码
4. 点击 "Create Account"
5. 检查邮箱，点击验证链接

**需要填写的内容**：
- Email - 你的邮箱地址
- Password - 设置密码（建议包含大小写字母、数字）

### 2.2 登录Expo

在本地电脑执行：

```bash
cd /workspace/projects/client
npx expo login
```

系统会提示：

```
? Email: your_email@example.com  # 填你的邮箱
? Password: ********************  # 填你的密码
```

**需要填写的内容**：
- Email - 你注册时用的邮箱
- Password - 你的密码

### 2.3 配置EAS Build

```bash
# 安装EAS CLI（如果还没安装）
npm install -g eas-cli

# 配置EAS
npx eas build:configure
```

这会自动创建或更新 `eas.json` 文件。

### 2.4 检查eas.json配置

```bash
cat eas.json
```

确保内容如下：

```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "buildConfiguration": "Release"
      }
    }
  }
}
```

### 2.5 验证登录状态

```bash
npx expo whoami
```

应该显示你的Expo账户信息，例如：

```
Logged in as your_email@example.com
```

---

## 3. 构建APK

### 3.1 一键构建APK

在本地电脑执行：

```bash
cd /workspace/projects/client
./quick-build-apk.sh
```

脚本会执行以下步骤：

1. 检查EAS CLI是否安装
2. 检查eas.json配置
3. 检查Expo登录状态
4. 提示你开始构建

系统会提示：

```
开始构建APK? (y/n):
```

输入：`y` 并按回车

### 3.2 构建过程

构建过程中会显示：

```
✔ Build started
✔ Build queued
✔ Build started
...
```

**等待时间**：
- 首次构建：10-30分钟
- 后续构建：5-15分钟

### 3.3 下载APK

1. 访问 https://expo.dev
2. 登录你的账户
3. 点击顶部的 "Projects"
4. 找到你的项目（可能是 "AI情绪日记" 或 "ai-emotion-diary"）
5. 点击进入项目
6. 点击 "Builds" 标签
7. 找到最新的构建记录（状态应该是 "completed"）
8. 点击 "Download APK" 或下载按钮

### 3.4 安装APK到手机

#### 方法1: 通过USB传输

```bash
# 如果已连接手机并开启USB调试
adb install ai-emotion-diary-1.0.0.apk
```

#### 方法2: 通过云盘传输

1. 将APK上传到云盘（百度云、阿里云盘等）
2. 在手机上下载
3. 点击安装

#### 方法3: 通过网页下载

```bash
# 上传APK到服务器
scp ai-emotion-diary-1.0.0.apk root@59.110.39.235:/var/www/html/

# 在手机浏览器访问
http://59.110.39.235/ai-emotion-diary-1.0.0.apk
```

### 3.5 配置手机允许安装未知来源

**Android 8.0+**：
1. 打开 "设置"
2. 进入 "安全"
3. 启用 "允许安装未知来源应用"
4. 选择浏览器或文件管理器

**Android 10+**：
1. 打开 "设置"
2. 进入 "应用和通知"
3. 选择 "特殊应用权限"
4. 选择 "安装未知应用"
5. 选择浏览器或文件管理器
6. 启用 "允许来自此来源的应用"

---

## 🎯 快速检查清单

### 服务器配置完成检查

- [ ] MySQL已安装并运行
- [ ] 数据库 `ai_diary` 已创建
- [ ] 数据库用户 `diary_user` 已创建
- [ ] `.env` 文件已配置（数据库密码、JWT密钥等）
- [ ] Python依赖已安装
- [ ] 数据库表已创建
- [ ] 后端服务已启动（9091端口）
- [ ] 防火墙已开放9091端口
- [ ] 外部访问测试通过（http://59.110.39.235:9091/api/v1/health）

### Expo配置完成检查

- [ ] Expo账户已注册
- [ ] Expo CLI已登录
- [ ] EAS CLI已安装
- [ ] eas.json配置文件存在
- [ ] `npx expo whoami` 显示正确的账户信息

### APK构建完成检查

- [ ] 构建已启动
- [ ] 构建状态显示 "completed"
- [ ] APK已下载到本地
- [ ] APK已安装到手机
- [ ] 应用可以正常打开

---

## 🔧 不用宝塔的替代方案

### 方案1: 使用Nginx部署（推荐）

```bash
# 在服务器上安装Nginx
apt install nginx -y

# 配置Nginx反向代理
nano /etc/nginx/sites-available/emotion-diary
```

输入以下内容：

```nginx
server {
    listen 80;
    server_name 59.110.39.235;

    # 后端API反向代理
    location /api/v1/ {
        proxy_pass http://localhost:9091/api/v1/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 下载页面
    location /download.html {
        alias /opt/emotion-diary/server/download.html;
    }

    # 版本管理后台
    location /version-manager {
        proxy_pass http://localhost:9091/version-manager;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # APK下载
    location /apk/ {
        alias /var/www/html/apk/;
        autoindex on;
    }
}
```

启用配置：

```bash
# 创建符号链接
ln -s /etc/nginx/sites-available/emotion-diary /etc/nginx/sites-enabled/

# 测试配置
nginx -t

# 重启Nginx
systemctl restart nginx
```

### 方案2: 使用pm2管理后端服务（推荐）

```bash
# 安装pm2
npm install -g pm2

# 使用pm2启动后端
cd /opt/emotion-diary/server
pm2 start "uvicorn main:app --host 0.0.0.0 --port 9091" --name emotion-diary

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status

# 查看日志
pm2 logs emotion-diary
```

### 方案3: 使用systemd管理服务

```bash
# 创建服务文件
nano /etc/systemd/system/emotion-diary.service
```

输入以下内容：

```ini
[Unit]
Description=AI Emotion Diary Backend
After=network.target mysql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/emotion-diary/server
ExecStart=/usr/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 9091
Restart=always

[Install]
WantedBy=multi-user.target
```

启用服务：

```bash
# 重载systemd
systemctl daemon-reload

# 启动服务
systemctl start emotion-diary

# 设置开机自启
systemctl enable emotion-diary

# 查看状态
systemctl status emotion-diary

# 查看日志
journalctl -u emotion-diary -f
```

---

## 📞 常见问题

### Q1: 如何获取API密钥？

**通义千问API密钥**：
1. 访问 https://dashscope.aliyun.com/
2. 登录阿里云账户
3. 开通DashScope服务
4. 获取API-KEY

**豆包ARK API密钥**（可选）：
1. 访问 https://ark.cn-beijing.volces.com/
2. 登录字节跳动账户
3. 创建应用获取API密钥

### Q2: 数据库密码忘了怎么办？

```bash
# 登录MySQL
mysql -u root -p

# 重置密码
ALTER USER 'diary_user'@'localhost' IDENTIFIED BY 'new_password_here';
FLUSH PRIVILEGES;

# 更新.env文件中的密码
```

### Q3: Expo登录失败？

```bash
# 清除缓存
npx expo logout
npx expo login

# 或使用令牌登录
npx expo login --non-interactive
```

### Q4: APK构建失败？

```bash
# 查看构建状态
npx eas build:list --platform android

# 查看构建日志
npx eas build:view <BUILD_ID>

# 重新构建
npx eas build --platform android --profile preview
```

---

## 🎉 总结

### 服务器端配置（必须）

1. 安装Python和MySQL
2. 创建数据库和用户
3. 配置.env文件（填数据库密码、JWT密钥、管理员密码）
4. 安装Python依赖
5. 创建数据库表
6. 启动后端服务
7. 配置防火墙

### 前端配置（必须）

1. 注册Expo账户（填邮箱、密码）
2. 登录Expo CLI（填邮箱、密码）
3. 构建APK

### 可选配置

1. 使用Nginx反向代理
2. 使用pm2管理服务
3. 配置SSL证书
4. 配置API密钥（通义千问、豆包）

**不需要宝塔！** 使用上面的方法完全可以手动配置服务器。
