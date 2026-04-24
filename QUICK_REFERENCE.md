# AI情绪日记 - 快速参考卡

## 🔑 关键信息速查

### 服务器信息

| 项目 | 值 |
|------|-----|
| 服务器IP | 59.110.39.235 |
| SSH端口 | 22 |
| 后端端口 | 9091 |
| 后端地址 | http://59.110.39.235:9091 |
| 健康检查 | http://59.110.39.235:9091/api/v1/health |
| 管理后台 | http://59.110.39.235/version-manager |

### 数据库信息

| 项目 | 值 |
|------|-----|
| 数据库名 | ai_diary |
| 数据库用户 | diary_user |
| 数据库密码 | 你自己设置的 |

### 管理后台登录

| 项目 | 值 |
|------|-----|
| 地址 | http://59.110.39.235/version-manager |
| 用户名 | admin |
| 密码 | 你在.env中设置的ADMIN_PASSWORD |

### Expo信息

| 项目 | 值 |
|------|-----|
| Expo网站 | https://expo.dev |
| EAS Build | https://expo.dev/account/projects |

---

## 📝 需要记住的密码

### 1. 服务器密码
- 用于SSH登录到 59.110.39.235

### 2. MySQL数据库密码
- 数据库用户：diary_user
- 密码：你自己设置的（如 `MyPassword123!`）

### 3. JWT密钥
- 在.env文件中：`JWT_SECRET`
- 值：随便填一个长字符串

### 4. 管理员密码
- 在.env文件中：`ADMIN_PASSWORD`
- 用于登录管理后台
- 值：你自己设置的（如 `MyAdminPassword456`）

### 5. Expo账户密码
- 邮箱：你注册时用的邮箱
- 密码：你注册时设置的密码

---

## ⚡ 常用命令

### 服务器端命令

```bash
# 登录服务器
ssh root@59.110.39.235

# 启动后端服务
cd /opt/emotion-diary
./deploy.sh

# 停止服务
./stop.sh

# 重启服务
./restart.sh

# 查看日志
tail -f logs/backend.log

# 测试健康检查
curl http://localhost:9091/api/v1/health

# 查看服务状态
ps aux | grep uvicorn

# 查看端口占用
lsof -i :9091

# 重启MySQL
systemctl restart mysql

# 查看MySQL状态
systemctl status mysql
```

### 前端命令

```bash
# 登录Expo
npx expo login

# 退出登录
npx expo logout

# 查看登录状态
npx expo whoami

# 构建APK
cd /workspace/projects/client
./quick-build-apk.sh

# 查看构建状态
npx eas build:list --platform android

# 启动开发服务器
npm start

# 安装依赖
npm install
```

---

## 📱 APK构建流程

```bash
# 1. 登录Expo
npx expo login

# 2. 开始构建
cd /workspace/projects/client
./quick-build-apk.sh

# 3. 等待构建完成（10-30分钟）

# 4. 下载APK
# 访问 https://expo.dev → Projects → 你的项目 → Builds → 下载

# 5. 安装到手机
# 传输APK → 安装 → 允许未知来源 → 打开应用
```

---

## 🔍 故障排查速查

### 后端无法启动

```bash
# 检查日志
tail -50 logs/backend.log

# 检查.env配置
cat .env

# 检查端口占用
lsof -i :9091

# 测试数据库连接
mysql -u diary_user -p ai_diary
```

### 无法访问外部IP

```bash
# 检查防火墙
ufw status

# 开放端口
ufw allow 9091
ufw reload

# 检查服务状态
curl http://localhost:9091/api/v1/health
```

### Expo登录失败

```bash
# 清除缓存
npx expo logout
npx expo login

# 使用令牌登录
npx expo login --non-interactive
```

### APK构建失败

```bash
# 查看构建状态
npx eas build:list --platform android

# 查看构建日志
npx eas build:view <BUILD_ID>

# 重新构建
npx eas build --platform android --profile preview
```

---

## 🎯 快速检查清单

### 每日检查

- [ ] 后端服务是否正常运行
  ```bash
  curl http://59.110.39.235:9091/api/v1/health
  ```

- [ ] 日志是否有错误
  ```bash
  tail -50 /opt/emotion-diary/logs/backend.log
  ```

- [ ] 数据库是否正常
  ```bash
  mysql -u diary_user -p ai_diary
  ```

### 每周检查

- [ ] 磁盘空间是否充足
  ```bash
  df -h
  ```

- [ ] 内存使用情况
  ```bash
  free -h
  ```

- [ ] 备份数据库
  ```bash
  mysqldump -u diary_user -p ai_diary > backup_$(date +%Y%m%d).sql
  ```

### 每月检查

- [ ] 更新系统和依赖
  ```bash
  apt update && apt upgrade
  pip3 install --upgrade -r requirements.txt
  ```

- [ ] 检查安全日志
  ```bash
  lastlog
  ```

- [ ] 清理日志文件
  ```bash
  ./clean.sh
  ```

---

## 📞 获取帮助

### 文档

- 超简化指南：[SIMPLE_SETUP_GUIDE.md](SIMPLE_SETUP_GUIDE.md)
- 详细设置：[DETAILED_SETUP_GUIDE.md](DETAILED_SETUP_GUIDE.md)
- APK构建：[client/APK_BUILD_README.md](client/APK_BUILD_README.md)
- 前端文档：[client/README.md](client/README.md)

### 官方文档

- Expo: https://docs.expo.dev/
- EAS Build: https://docs.expo.dev/build/introduction/
- MySQL: https://dev.mysql.com/doc/

---

## 🎉 快速开始

### 第一次部署？

1. 查看 [SIMPLE_SETUP_GUIDE.md](SIMPLE_SETUP_GUIDE.md)
2. 按照步骤操作
3. 使用本参考卡查找关键信息

### 遇到问题？

1. 查看故障排查部分
2. 查看详细文档
3. 检查日志文件

### 更新应用？

1. 更新代码
2. 重启服务
3. 重新构建APK

---

**最后更新**：2024-01-01
**版本**：v1.0.0
