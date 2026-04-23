# 阿里云部署检查清单

## 部署前检查

### 1. 服务器环境
- [ ] 操作系统：CentOS 7+ / Ubuntu 18.04+
- [ ] Python 版本：3.10+ （运行 `python3 --version`）
- [ ] 内存：至少 2GB
- [ ] 磁盘空间：至少 20GB
- [ ] 已安装 MySQL 5.7+ 或 8.0+
- [ ] 已安装 Redis 5.0+
- [ ] 已安装 Nginx

### 2. 数据库配置
- [ ] MySQL 已配置远程访问（bind-address = 0.0.0.0）
- [ ] 已创建数据库 `ai_emotion_diary`
- [ ] 已创建数据库用户并授权
- [ ] 已导入表结构（create_mysql_tables.sql）
- [ ] MySQL 防火墙端口 3306 已开放（如需远程访问）

### 3. Redis 配置
- [ ] Redis 已配置密码（requirepass）
- [ ] Redis 防火墙端口 6379 已开放（如需远程访问）
- [ ] Redis 服务正常运行

### 4. 代码文件准备
- [ ] main.py
- [ ] database.py
- [ ] db_adapter.py
- [ ] oss_storage.py
- [ ] model_manager.py
- [ ] redis_cache.py
- [ ] realtime_dialog_client.py
- [ ] protocol.py
- [ ] config.py
- [ ] requirements.txt

### 5. 环境变量配置
- [ ] 已复制 .env.example 为 .env
- [ ] 已修改 JWT_SECRET 为强随机字符串
- [ ] 已配置 ARK_BASE_URL、ARK_API_KEY、ARK_CHAT_MODEL
- [ ] 已配置 VOLCENGINE_SPEECH_APP_ID、VOLCENGINE_SPEECH_SECRET_KEY 等
- [ ] 已配置 MYSQL_HOST、MYSQL_PORT、MYSQL_USER、MYSQL_PASSWORD
- [ ] 已配置 REDIS_HOST、REDIS_PORT、REDIS_PASSWORD
- [ ] 已配置 OSS_ENDPOINT、OSS_ACCESS_KEY_ID、OSS_ACCESS_KEY_SECRET

### 6. 依赖安装
- [ ] 已创建 Python 虚拟环境
- [ ] 已激活虚拟环境
- [ ] 已安装 requirements.txt 中的所有依赖
- [ ] 测试导入所有依赖包成功

## 部署后检查

### 1. 服务状态
- [ ] 后端服务正在运行（`sudo systemctl status ai-diary-backend`）
- [ ] 服务已设置为开机自启（`sudo systemctl is-enabled ai-diary-backend`）
- [ ] 端口 9091 正在监听（`sudo netstat -tulpn | grep 9091`）

### 2. 功能测试

#### 2.1 基础接口测试
```bash
# 健康检查
curl http://localhost:9091/  # 应返回 "API Server is running"

# 测试注册接口
curl -X POST http://localhost:9091/api/v1/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'
```

- [ ] 健康检查接口正常
- [ ] 用户注册接口正常

#### 2.2 数据库连接测试
- [ ] 可以正常注册新用户
- [ ] 可以正常登录
- [ ] 数据写入数据库成功

#### 2.3 Redis 连接测试
- [ ] 缓存功能正常
- [ ] 登录状态正常保存

#### 2.4 OSS 连接测试
- [ ] 可以正常上传头像
- [ ] 可以正常访问上传的文件

#### 2.3 大模型接口测试
- [ ] 聊天功能正常
- [ ] 日记生成功能正常
- [ ] 情绪分析功能正常

### 3. Nginx 配置检查
- [ ] Nginx 配置文件已创建
- [ ] Nginx 配置语法正确（`sudo nginx -t`）
- [ ] Nginx 已重新加载（`sudo systemctl reload nginx`）
- [ ] 通过域名可以访问后端 API
- [ ] WebSocket 连接正常

### 4. SSL 证书检查（如使用 HTTPS）
- [ ] SSL 证书已安装
- [ ] HTTPS 访问正常
- [ ] 证书自动续期已配置

### 5. 安全检查
- [ ] CORS 配置已修改为特定域名（而非 *）
- [ ] JWT_SECRET 已使用强随机字符串
- [ ] 数据库密码足够复杂
- [ ] Redis 已配置密码
- [ ] 防火墙规则正确配置
- [ ] 只开放必要的端口（22, 80, 443）

### 6. 日志检查
- [ ] 可以查看服务日志（`sudo journalctl -u ai-diary-backend -f`）
- [ ] 可以查看 Nginx 访问日志
- [ ] 可以查看 Nginx 错误日志
- [ ] 日志中没有严重错误

### 7. 备份检查
- [ ] 数据库备份脚本已创建
- [ ] 备份脚本已添加到 crontab
- [ ] 备份目录存在
- [ ] 手动测试备份脚本成功

### 8. 监控检查
- [ ] 已配置服务监控
- [ ] 已配置告警通知
- [ ] 磁盘空间监控正常
- [ ] 内存使用监控正常
- [ ] CPU 使用监控正常

## 性能优化检查

- [ ] 数据库连接池正常工作
- [ ] Redis 缓存正常工作
- [ ] Nginx 缓存已配置（可选）
- [ ] CDN 加速已配置（可选）

## 文档检查

- [ ] 部署文档已更新
- [ ] API 文档已更新
- [ ] 管理员操作手册已更新
- [ ] 故障排查手册已更新

## 应急预案

- [ ] 服务重启命令已记录
- [ ] 数据库回滚方案已准备
- [ ] 应急联系方式已确认
- [ ] 备份恢复测试已通过

## 最终验证

### 测试账号
- [ ] 管理员账号可以正常登录
- [ ] 普通用户账号可以正常登录
- [ ] 权限控制正常工作

### 功能完整性测试
- [ ] 用户注册/登录正常
- [ ] 日记增删改查正常
- [ ] AI 聊天功能正常
- [ ] 实时语音功能正常
- [ ] 头像上传功能正常
- [ ] 版本管理功能正常
- [ ] 管理后台功能正常

### 并发测试
- [ ] 单用户操作流畅
- [ ] 多用户并发操作正常
- [ ] 高并发下无崩溃

### 压力测试（可选）
- [ ] 已进行压力测试
- [ ] 已记录性能指标
- [ ] 已制定优化方案

## 上线前最终确认

- [ ] 所有检查项已完成
- [ ] 团队成员已培训
- [ ] 运维文档已交接
- [ ] 监控告警已配置
- [ ] 应急预案已准备
- [ ] 备份恢复已测试
- [ ] 已设置上线时间窗口
- [ ] 已通知相关方

---

**注意**：所有检查项都完成后，才能正式上线。如有任何一项未完成，请先完成再上线。
