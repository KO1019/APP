# 管理员账号说明

## 默认管理员账号

系统已创建默认管理员账号：

- **用户名**: `admin`
- **密码**: `admin123`
- **邮箱**: `admin@example.com`

⚠️ **重要提示**: 首次登录后请立即修改密码！

## 管理后台访问

1. **访问地址**: https://anjia.work/version-manager
2. 使用上述管理员账号登录
3. 登录成功后可以访问以下功能：
   - 仪表盘
   - 用户管理
   - 模型管理
   - 欢迎内容管理
   - 公告管理
   - 数据统计
   - 版本管理

## 创建新的管理员账号

如需创建新的管理员账号，可以使用 `create_admin_user.py` 脚本：

```bash
cd /workspace/projects/server
python3 create_admin_user.py
```

或者手动在数据库中创建：

```sql
INSERT INTO users (id, username, password_hash, email, nickname, is_admin, is_active, created_at, updated_at)
VALUES (
    UUID(),
    'new_admin',
    '$2b$12$your_password_hash_here',
    'new_admin@example.com',
    '新管理员',
    1,  -- is_admin
    1   -- is_active
);
```

## 修改管理员密码

密码使用 bcrypt 加密存储，修改密码需要先生成 bcrypt 哈希值。建议在管理后台的用户管理中修改密码。

## 权限说明

- `is_admin = 1`: 管理员，可以访问管理后台
- `is_admin = 0`: 普通用户，只能使用应用功能
- `is_active = 1`: 账户已激活
- `is_active = 0`: 账户已禁用

## 安全建议

1. 生产环境请立即修改默认密码
2. 定期更换管理员密码
3. 限制管理后台的访问 IP 地址
4. 使用 HTTPS 访问管理后台
5. 不要在公开场合暴露管理员账号信息
