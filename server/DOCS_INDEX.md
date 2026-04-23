# AI情绪日记后端 - 文档索引

## 📚 文档导航

### 快速开始
- 🚀 [快速部署指南](README_DEPLOY.md) - 5分钟快速部署
- 📋 [部署检查清单](DEPLOYMENT_CHECKLIST.md) - 部署前检查清单

### 部署文档
- 🔧 [详细部署指南](DEPLOY.md) - 完整的部署步骤
- ✅ [部署完成总结 v2](DEPLOYMENT_COMPLETE_V2.md) - 部署后的验证和说明（使用version_manager_web.py）
- 📝 [变更日志 v2](CHANGELOG_V2.md) - 本次更新的所有变更（v2版本）
- ✅ [部署完成总结](DEPLOYMENT_COMPLETE.md) - 部署后的验证和说明（v1版本，已弃用）
- 🧹 [清理总结](CLEANUP_SUMMARY.md) - 代码清理详情

### 项目文档
- 📁 [项目结构](PROJECT_STRUCTURE.md) - 完整的项目结构说明
- 📖 [README](README.md) - 项目说明文档
- ⚡ [快速开始](QUICK_START.md) - 快速开始指南

### 功能文档
- 🎯 [模型管理指南](MODEL_MANAGER_GUIDE.md) - AI模型使用说明
- 👤 [管理后台文档](ADMIN_README.md) - 管理后台使用说明
- 🔑 [认证系统](AVATAR_MANAGEMENT.md) - 用户认证和头像管理
- 🎙️ [实时语音模型](REALTIME_VOICE_MODEL.md) - 语音模型配置
- 📦 [版本管理](VERSION_MANAGEMENT.md) - 版本管理说明

### 部署平台
- ☁️ [阿里云部署](ALIYUN_DEPLOYMENT.md) - 阿里云服务器部署
- 🗄️ [MySQL+Redis配置](MYSQL_REDIS_SETUP.md) - 数据库和缓存配置

## 🎯 新手入门

### 1. 快速部署（推荐）

如果你是第一次部署，请阅读以下文档：

1. [快速部署指南](README_DEPLOY.md) - 了解如何快速部署
2. [部署检查清单](DEPLOYMENT_CHECKLIST.md) - 检查部署前准备
3. [部署完成总结](DEPLOYMENT_COMPLETE.md) - 部署后的验证步骤

### 2. 了解项目

如果你想了解项目结构，请阅读：

1. [项目结构](PROJECT_STRUCTURE.md) - 了解项目目录结构
2. [README](README.md) - 了解项目基本信息
3. [快速开始](QUICK_START.md) - 了解项目快速开始方法

### 3. 使用功能

如果你想使用特定功能，请阅读：

1. [模型管理指南](MODEL_MANAGER_GUIDE.md) - 使用AI对话功能
2. [管理后台文档](ADMIN_README.md) - 使用管理后台
3. [认证系统](AVATAR_MANAGEMENT.md) - 用户认证和头像管理

## 🔧 部署流程

### 一键部署

```bash
cd /workspace/projects/server
./deploy.sh
```

### 验证部署

```bash
./check.sh
```

### 访问服务

| 服务 | 地址 | 说明 |
|------|------|------|
| 后端API | http://localhost:9091 | 后端API服务 |
| 健康检查 | http://localhost:9091/api/v1/health | 服务健康检查 |
| 下载页面 | http://localhost/download.html | App下载页面 |
| 版本管理后台 | http://localhost/version-manager | 版本管理后台（admin/admin123） |

## 📊 文档统计

| 分类 | 文档数 | 说明 |
|------|--------|------|
| 快速开始 | 2 | 部署快速入门 |
| 部署文档 | 5 | 部署相关文档 |
| 项目文档 | 3 | 项目说明文档 |
| 功能文档 | 4 | 功能使用文档 |
| 部署平台 | 2 | 特定平台部署 |
| **总计** | **16** | 完整文档体系 |

## 🛠️ 管理命令

```bash
# 部署命令
./deploy.sh        # 一键部署
./stop.sh          # 停止服务
./restart.sh       # 重启服务
./check.sh         # 检查部署
./clean.sh         # 清理项目
```

## 🔍 常见问题

### 部署问题

- **服务无法启动**: 查看 [部署完成总结](DEPLOYMENT_COMPLETE.md) 中的故障排查
- **Nginx配置错误**: 查看 [详细部署指南](DEPLOY.md) 中的Nginx配置
- **数据库连接失败**: 查看 [MySQL+Redis配置](MYSQL_REDIS_SETUP.md)

### 功能问题

- **AI不回复**: 查看 [模型管理指南](MODEL_MANAGER_GUIDE.md)
- **认证失败**: 查看 [认证系统](AVATAR_MANAGEMENT.md)
- **管理后台无法访问**: 查看 [管理后台文档](ADMIN_README.md)

## 📖 推荐阅读路径

### 路径1: 快速部署用户
1. [快速部署指南](README_DEPLOY.md)
2. [部署检查清单](DEPLOYMENT_CHECKLIST.md)
3. [部署完成总结](DEPLOYMENT_COMPLETE.md)

### 路径2: 项目维护者
1. [项目结构](PROJECT_STRUCTURE.md)
2. [详细部署指南](DEPLOY.md)
3. [变更日志](CHANGELOG.md)

### 路径3: 功能开发者
1. [模型管理指南](MODEL_MANAGER_GUIDE.md)
2. [管理后台文档](ADMIN_README.md)
3. [认证系统](AVATAR_MANAGEMENT.md)

### 路径4: 运维工程师
1. [阿里云部署](ALIYUN_DEPLOYMENT.md)
2. [MySQL+Redis配置](MYSQL_REDIS_SETUP.md)
3. [详细部署指南](DEPLOY.md)

## 🎉 更新记录

### 2024-01-01 - v1.0.0

- ✅ 完成后端代码清理和优化
- ✅ 创建管理后台页面
- ✅ 完善部署脚本
- ✅ 优化Nginx配置
- ✅ 完善文档体系

详细变更记录请查看 [变更日志](CHANGELOG.md)。

## 📞 获取帮助

如果你有任何问题：

1. 查看对应的文档
2. 检查日志文件：`logs/backend.log`
3. 运行检查脚本：`./check.sh`

## 📝 文档维护

文档由开发团队维护，如有问题请及时反馈。

---

**最后更新**: 2024-01-01
**文档版本**: v1.0.0
**维护团队**: AI情绪日记开发组
