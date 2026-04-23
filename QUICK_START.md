# AI情绪日记 - 快速开始

## 🚀 5分钟快速部署

### 前置要求

确保服务器已安装：
- Python 3.10+
- Node.js 16+
- MySQL 5.7+
- Nginx

### 一键部署

```bash
# 1. 克隆项目
cd /workspace/projects

# 2. 执行完整部署
./deploy-all.sh
```

## 📱 前端开发

### 安装依赖

```bash
cd client
npm install
```

### 启动开发服务器

```bash
npm start
```

访问 http://localhost:8081

### 构建Web版本

```bash
npm run web
```

### 构建Android/iOS

```bash
# 使用EAS Build
npx eas build --platform android  # Android
npx eas build --platform ios      # iOS
```

## 🔧 后端开发

### 配置环境变量

```bash
cd server
cp .env.example .env
# 编辑 .env 文件，配置数据库连接等信息
```

### 配置ARK API（可选）

```bash
./generate_ark_config.sh
```

### 启动服务

```bash
./deploy.sh
```

### 健康检查

```bash
curl http://59.110.39.235:9091/api/v1/health
```

## 🌐 访问地址

### 生产环境

| 服务 | 地址 |
|------|------|
| 后端API | http://59.110.39.235:9091 |
| 健康检查 | http://59.110.39.235:9091/api/v1/health |
| 下载页面 | http://59.110.39.235/download.html |
| 版本管理 | http://59.110.39.235/version-manager |

### 版本管理后台

- **地址**: http://59.110.39.235/version-manager
- **用户名**: admin
- **密码**: admin123

## 📚 文档

- [完整部署总结](DEPLOYMENT_COMPLETE.md) - 详细的部署说明
- [前端文档](client/README.md) - 前端应用文档
- [后端文档](server/README.md) - 后端应用文档
- [文档索引](server/DOCS_INDEX.md) - 所有文档索引

## 🔑 常用命令

### 后端

```bash
cd server
./deploy.sh      # 部署后端
./stop.sh        # 停止服务
./restart.sh     # 重启服务
./check.sh       # 检查状态
./clean.sh       # 清理项目
```

### 前端

```bash
cd client
npm start        # 启动开发服务器
npm run web      # 构建Web版本
./check.sh       # 检查状态
./clean.sh       # 清理项目
```

## ⚠️ 安全建议

1. 修改默认密码（管理员、数据库）
2. 修改JWT密钥
3. 使用正式SSL证书
4. 配置防火墙规则
5. 定期备份数据库

## 🆘 常见问题

### Q: 后端服务无法启动
**A**: 检查端口占用、数据库连接、环境变量配置

### Q: 前端无法连接后端
**A**: 检查.env.production中的API地址配置

### Q: ARK API连接失败
**A**: 运行generate_ark_config.sh重新配置

### Q: 无法访问外部IP
**A**: 检查防火墙规则、Nginx配置

## 📞 支持

如有问题，请查看相关文档或联系开发团队。
