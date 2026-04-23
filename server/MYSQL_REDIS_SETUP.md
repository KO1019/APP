# MySQL 和 Redis 配置说明

## ✅ Redis 配置成功

Redis 连接已成功配置：
- Host: 59.110.39.235
- Port: 6379
- 状态: ✅ 连接成功

## ❌ MySQL 连接失败

**错误信息**：
```
Host 'xxx.xxx.xxx.xxx' is not allowed to connect to this MySQL server
```

**原因**：
MySQL 服务器默认只允许本地连接（localhost），不允许远程连接。

## 🔧 解决方案

### 方案1：允许 MySQL 远程连接（推荐）

在你的 MySQL 服务器（59.110.39.235）上执行以下命令：

```bash
# 登录 MySQL
mysql -u root -p

# 输入密码：a1b76fc7511669d5
```

然后在 MySQL 中执行：

```sql
-- 1. 创建允许远程连接的用户（如果还没有）
CREATE USER 'root'@'%' IDENTIFIED BY 'a1b76fc7511669d5';

-- 2. 授予所有权限
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;

-- 3. 刷新权限
FLUSH PRIVILEGES;

-- 4. 退出
EXIT;
```

### 方案2：修改 MySQL 配置文件

编辑 `/etc/mysql/mysql.conf.d/mysqld.cnf` 或 `/etc/my.cnf`：

```bash
# 找到 bind-address 行，修改为：
bind-address = 0.0.0.0
```

然后重启 MySQL：

```bash
# Ubuntu/Debian
sudo systemctl restart mysql

# CentOS/RHEL
sudo systemctl restart mysqld
```

### 方案3：使用本地的 MySQL

如果你不想配置远程访问，可以使用本地的 MySQL：

修改 `.env` 文件：

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=ai_emotion_diary
```

## 📋 配置完成后

配置完成后，执行以下命令创建数据库表：

```bash
cd /workspace/projects/server

# 执行 SQL 脚本
mysql -h 59.110.39.235 -u root -p ai_emotion_diary < create_mysql_tables.sql

# 输入密码：a1b76fc7511669d5
```

或者使用 Python 脚本：

```bash
# 先初始化数据库
python3 database.py

# 然后执行 SQL
mysql -h 59.110.39.235 -u root -p ai_emotion_diary < create_mysql_tables.sql
```

## 🧪 测试连接

```bash
# 测试 MySQL 连接
python3 -c "
import pymysql
conn = pymysql.connect(
    host='59.110.39.235',
    port=3306,
    user='root',
    password='a1b76fc7511669d5',
    database='ai_emotion_diary'
)
print('✅ MySQL 连接成功')
conn.close()
"

# 测试 Redis 连接
python3 redis_cache.py
```

## 📝 注意事项

1. **安全性**：允许远程访问会降低安全性，请确保：
   - 使用强密码
   - 限制允许连接的 IP 地址
   - 使用防火墙规则

2. **防火墙**：确保服务器防火墙允许 3306 端口：

```bash
# Ubuntu/Debian
sudo ufw allow 3306/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3306/tcp
sudo firewall-cmd --reload
```

3. **网络**：确保你的服务器网络允许从应用服务器访问 MySQL 服务器。

## 🚀 下一步

配置好 MySQL 远程访问后，我们可以：
1. 创建数据库表
2. 迁移现有数据（如果有）
3. 修改后端代码使用 MySQL
4. 测试所有功能

---

**状态**：✅ Redis 已配置成功，⏳ 等待 MySQL 远程访问配置完成
