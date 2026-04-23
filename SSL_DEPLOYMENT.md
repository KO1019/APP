# AI情绪日记 - SSL证书部署指南

## 证书部署

证书文件已放置在：
- `/workspace/projects/server/ssl/anjia.work.key`（私钥）
- `/workspace/projects/server/ssl/anjia.work.pem`（证书）

## 部署方式

### 方式一：Docker Compose（推荐）

1. **构建前端Web版本**
```bash
cd /workspace/projects/client
npx expo export --platform web
```

2. **配置环境变量**
```bash
cd /workspace/projects
cp .env.example .env
# 编辑.env文件，填写所有必需的环境变量
```

3. **启动所有服务**
```bash
docker-compose up -d
```

4. **验证部署**
```bash
# 检查服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 测试HTTPS访问
curl -I https://anjia.work
```

### 方式二：手动部署（生产环境）

#### 1. 安装Nginx
```bash
sudo apt update
sudo apt install nginx -y
```

#### 2. 配置SSL证书
```bash
# 复制证书文件
sudo mkdir -p /etc/nginx/ssl
sudo cp /workspace/projects/server/ssl/anjia.work.key /etc/nginx/ssl/
sudo cp /workspace/projects/server/ssl/anjia.work.pem /etc/nginx/ssl/
sudo chmod 600 /etc/nginx/ssl/anjia.work.key
```

#### 3. 配置Nginx
```bash
# 复制配置文件
sudo cp /workspace/projects/server/nginx.conf /etc/nginx/nginx.conf

# 创建前端目录
sudo mkdir -p /var/www/html/client
sudo cp -r /workspace/projects/client/web-build/* /var/www/html/client/
```

#### 4. 启动服务
```bash
# 启动Python后端
cd /workspace/projects/server
python3 main.py &

# 启动Nginx
sudo nginx -t
sudo systemctl start nginx
sudo systemctl enable nginx
```

## APP下载页面

访问地址：`https://anjia.work/download`

### 下载链接配置

后端API（`/api/v1/app/download`）返回的下载信息：
```json
{
  "android": {
    "name": "Android",
    "url": "https://anjia.work/download/emotion-diary.apk",
    "version": "1.0.0",
    "size": "50MB",
    "min_version": "Android 8.0"
  },
  "ios": {
    "name": "iOS",
    "url": "https://apps.apple.com/cn/app/emotion-diary/id123456789",
    "version": "1.0.0",
    "size": "45MB",
    "min_version": "iOS 14.0"
  },
  "download_page": "https://anjia.work/download"
}
```

### 放置APK文件

将Android APK文件放置到：
```bash
# Docker环境
./client/web-build/download/emotion-diary.apk

# 手动部署环境
/var/www/html/client/download/emotion-diary.apk
```

## SSL证书续期

证书有效期：2026年4月23日 - 2026年7月21日

续期步骤：
1. 在证书颁发机构下载新证书
2. 替换 `/workspace/projects/server/ssl/` 目录下的证书文件
3. 重启Nginx服务
```bash
sudo systemctl reload nginx
# 或Docker环境
docker-compose restart nginx
```

## 验证配置

### 1. 检查SSL证书
```bash
openssl s_client -connect anjia.work:443 -servername anjia.work
```

### 2. 检查HTTPS重定向
```bash
curl -I http://anjia.work
# 应该返回 301 重定向到 https://anjia.work
```

### 3. 检查APP下载页面
```bash
curl https://anjia.work/download
# 应该返回HTML内容
```

### 4. 检查API
```bash
curl https://anjia.work/api/v1/health
# 应该返回 {"status":"ok"}
```

## 安全配置

已配置的安全特性：
- ✅ TLS 1.2 / TLS 1.3
- ✅ HSTS（强制HTTPS）
- ✅ X-Frame-Options（防止点击劫持）
- ✅ X-Content-Type-Options（防止MIME嗅探）
- ✅ XSS保护
- ✅ 证书自动续期提醒

## 域名配置

域名：`anjia.work` 和 `www.anjia.work`

DNS记录：
- A记录：指向服务器IP
- CNAME记录（可选）：`www.anjia.work` → `anjia.work`

## 故障排查

### 证书问题
```bash
# 检查证书文件
openssl x509 -in /workspace/projects/server/ssl/anjia.work.pem -text -noout

# 检查证书有效期
openssl x509 -in /workspace/projects/server/ssl/anjia.work.pem -noout -dates
```

### Nginx问题
```bash
# 检查配置
sudo nginx -t

# 查看错误日志
sudo tail -f /var/log/nginx/error.log

# 重启服务
sudo systemctl restart nginx
```

### 后端问题
```bash
# 检查后端日志
tail -f /tmp/server_output.log

# 测试后端API
curl http://localhost:9091/api/v1/health
```

## 联系支持

如有问题，请联系技术支持团队。
