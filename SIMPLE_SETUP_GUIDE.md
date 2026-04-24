# AI情绪日记 - 超简化设置指南

## ⚡ 最简单的三步走

### 第一步：配置服务器（需要SSH登录到 59.110.39.235）

```bash
# 1. 登录服务器
ssh root@59.110.39.235
# 输入服务器密码

# 2. 安装必要软件
apt update
apt install python3 python3-pip mysql-server -y

# 3. 启动MySQL
systemctl start mysql
systemctl enable mysql

# 4. 创建数据库
mysql -u root -p
# 输入密码（可能为空，直接回车）
```

在MySQL中输入（复制粘贴）：

```sql
CREATE DATABASE ai_diary;
CREATE USER 'diary_user'@'localhost' IDENTIFIED BY 'MyPassword123!';
GRANT ALL PRIVILEGES ON ai_diary.* TO 'diary_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**注意**：把 `MyPassword123!` 改成你自己的密码

```bash
# 5. 上传代码（在本地电脑执行）
cd /workspace/projects
tar -czf app.tar.gz server
scp app.tar.gz root@59.110.39.235:/opt/

# 6. 在服务器上解压
ssh root@59.110.39.235
cd /opt
tar -xzf app.tar.gz
mv server emotion-diary

# 7. 配置环境变量
cd /opt/emotion-diary
cp .env.example .env
nano .env
```

编辑.env文件，修改这几行（其他的可以不改）：

```bash
DB_PASSWORD=MyPassword123!              # 改成你刚才设置的数据库密码
JWT_SECRET=随便填一个长字符串abc123    # 填一个随机的长字符串
ADMIN_PASSWORD=MyAdminPassword456       # 设置管理员登录密码
```

保存：按 `Ctrl+X`，然后 `Y`，再 `Enter`

```bash
# 8. 安装依赖
pip3 install -r requirements.txt

# 9. 创建数据库表
mysql -u diary_user -p ai_diary < create_mysql_tables.sql
# 输入你设置的数据库密码

# 10. 启动服务
./deploy.sh

# 11. 开放端口
ufw allow 9091
ufw reload

# 12. 测试
curl http://localhost:9091/api/v1/health
# 应该返回 {"status":"ok"}
```

### 第二步：注册并登录Expo（在本地电脑）

```bash
# 1. 访问 https://expo.dev
# 2. 点击 "Sign Up" 注册
# 3. 填写：
#    - Email: 你的邮箱
#    - Password: 设置密码

# 4. 在本地电脑登录
cd /workspace/projects/client
npx expo login
# 填写：
#    - Email: 你的邮箱
#    - Password: 你的密码
```

### 第三步：构建APK（在本地电脑）

```bash
cd /workspace/projects/client
./quick-build-apk.sh
# 看到"开始构建APK? (y/n)"时，输入 y 并回车
# 等待10-30分钟

# 构建完成后：
# 1. 访问 https://expo.dev
# 2. 点击 "Projects"
# 3. 找到你的项目
# 4. 点击 "Builds"
# 5. 下载APK
# 6. 传输到手机并安装
```

---

## ✅ 需要填写的内容汇总

### 服务器端需要填的：

1. **数据库密码**：在创建MySQL用户时设置
   - 示例：`MyPassword123!`
   - 要求：包含大小写字母、数字、特殊字符

2. **JWT密钥**：在.env文件中
   - 示例：`随便填一个长字符串abc123`
   - 要求：任意长字符串

3. **管理员密码**：在.env文件中
   - 示例：`MyAdminPassword456`
   - 要求：设置管理后台登录密码

### Expo端需要填的：

1. **注册邮箱**：在 https://expo.dev 注册
   - 示例：`your_email@example.com`
   - 要求：有效的邮箱地址

2. **注册密码**：在注册时设置
   - 示例：`YourPassword123`
   - 要求：至少8个字符

---

## 🔍 测试是否成功

### 测试服务器后端

在本地电脑浏览器访问：
```
http://59.110.39.235:9091/api/v1/health
```
应该显示：
```json
{"status":"ok"}
```

### 测试管理后台

在浏览器访问：
```
http://59.110.39.235/version-manager
```
登录：
- 用户名：`admin`
- 密码：你设置的ADMIN_PASSWORD（如 `MyAdminPassword456`）

### 测试APK

1. 下载APK
2. 安装到手机
3. 打开应用
4. 注册一个新账号
5. 登录
6. 尝试写一篇日记

---

## 🎯 如果遇到问题

### 问题1：无法连接服务器

```bash
# 检查服务器是否在线
ping 59.110.39.235

# 检查SSH端口是否开放
telnet 59.110.39.235 22
```

### 问题2：MySQL登录失败

```bash
# 重置MySQL root密码
systemctl stop mysql
mysqld_safe --skip-grant-tables &
mysql -u root
```

```sql
USE mysql;
UPDATE user SET authentication_string=PASSWORD('新密码') WHERE User='root';
FLUSH PRIVILEGES;
EXIT;
```

```bash
# 重启MySQL
systemctl restart mysql
```

### 问题3：后端服务无法启动

```bash
# 查看日志
tail -50 logs/backend.log

# 检查端口占用
lsof -i :9091

# 检查.env配置
cat .env
```

### 问题4：Expo登录失败

```bash
# 退出登录
npx expo logout

# 重新登录
npx expo login
```

---

## 📞 不用宝塔？没问题！

上面的方法完全不需要宝塔，使用的是：

- **SSH命令** - 远程管理服务器
- **Nginx** - 反向代理（可选）
- **systemd** - 服务管理（可选）
- **pm2** - 进程管理（可选）

这些都是Linux原生工具，比宝塔更轻量、更灵活。

---

## 🎉 完成！

如果所有步骤都成功了，你现在应该有：

1. ✅ 服务器上运行的后端API（http://59.110.39.235:9091）
2. ✅ 可访问的管理后台（http://59.110.39.235/version-manager）
3. ✅ 可以安装的APK文件

**开始使用你的AI情绪日记吧！**
