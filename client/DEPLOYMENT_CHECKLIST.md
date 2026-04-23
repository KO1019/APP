# 部署前配置检查清单

在部署应用前，请按照以下清单检查所有配置项。

## ✅ 必填项（必须配置）

### 1. 后端API配置

- [ ] 修改 `client/.env.production` 中的 `EXPO_PUBLIC_BACKEND_BASE_URL`
- [ ] 确保后端API地址可以访问
- [ ] 测试API连接是否正常

**示例**：
```env
EXPO_PUBLIC_BACKEND_BASE_URL=https://api.yourdomain.com
```

### 2. 应用基础配置

- [ ] 设置应用名称 `EXPO_PUBLIC_APP_NAME`
- [ ] 设置应用版本 `EXPO_PUBLIC_APP_VERSION`
- [ ] 设置应用ID `EXPO_PUBLIC_APP_BUNDLE_ID`

**示例**：
```env
EXPO_PUBLIC_APP_NAME=AI情绪日记
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_APP_BUNDLE_ID=com.emotiondiary.app
```

## 📋 可选项（根据需要配置）

### 3. 功能开关配置

- [ ] 确认是否启用离线模式 `EXPO_PUBLIC_ENABLE_OFFLINE_MODE`
- [ ] 确认是否启用AI聊天 `EXPO_PUBLIC_ENABLE_AI_CHAT`
- [ ] 确认是否启用情绪分析 `EXPO_PUBLIC_ENABLE_MOOD_ANALYSIS`
- [ ] 确认是否启用位置记录 `EXPO_PUBLIC_ENABLE_LOCATION`

**默认值**：所有功能默认启用

### 4. UI配置

- [ ] 设置主题模式 `EXPO_PUBLIC_THEME_MODE`（light/dark/auto）

**默认值**：auto（跟随系统）

### 5. 安全配置

- [ ] 确认是否启用加密存储 `EXPO_PUBLIC_ENABLE_ENCRYPTION`
- [ ] 设置密码最小长度 `EXPO_PUBLIC_PASSWORD_MIN_LENGTH`

**默认值**：
- 加密存储：启用
- 密码最小长度：4

## 🔧 技术配置

### 6. Expo配置

- [ ] 检查 `app.config.ts` 中的配置
- [ ] 确认 `expo.name` 和 `expo.slug` 正确
- [ ] 确认 `ios.bundleIdentifier` 正确（iOS部署）
- [ ] 确认 `android.package` 正确（Android部署）

### 7. EAS配置

- [ ] 登录EAS账号：`eas login`
- [ ] 创建 `eas.json` 配置文件
- [ ] 配置构建profile
- [ ] 配置iOS证书（如需iOS部署）

### 8. 依赖检查

- [ ] 运行 `npm install` 安装依赖
- [ ] 确保无依赖冲突
- [ ] 检查版本是否兼容

## 📱 平台特定配置

### Android部署

- [ ] 设置Android包名格式：`com.company.app`
- [ ] 配置Android权限（相机、位置等）
- [ ] 准备应用图标和启动图
- [ ] 配置应用签名（生产环境）

### iOS部署

- [ ] 设置iOS Bundle Identifier
- [ ] 配置iOS权限
- [ ] 准备应用图标和启动图
- [ ] 配置Apple开发者账号
- [ ] 配置推送通知（如需要）

## 🧪 测试清单

### 9. 功能测试

- [ ] 测试登录功能
- [ ] 测试日记创建和编辑
- [ ] 测试数据上传和下载
- [ ] 测试离线模式
- [ ] 测试AI聊天功能（如启用）
- [ ] 测试情绪分析功能（如启用）

### 10. 兼容性测试

- [ ] 在不同Android版本测试
- [ ] 在不同屏幕尺寸测试
- [ ] 测试网络异常情况
- [ ] 测试权限请求流程

## 📝 部署前最后检查

### 11. 代码检查

- [ ] 清理调试日志
- [ ] 移除注释的代码
- [ ] 确认无敏感信息泄露
- [ ] 检查错误处理

### 12. 版本管理

- [ ] 更新应用版本号
- [ ] 创建版本标签
- [ ] 记录版本变更日志

## 🚀 构建和部署

### 13. Android APK构建

```bash
cd client
eas build --platform android --profile production
```

- [ ] 构建成功
- [ ] 下载APK
- [ ] 在测试设备上安装测试

### 14. iOS构建（如需要）

```bash
cd client
eas build --platform ios --profile production
```

- [ ] 构建成功
- [ ] 下载IPA
- [ ] 通过TestFlight分发

## 📊 部署后验证

### 15. 生产环境验证

- [ ] 应用可以正常启动
- [ ] 可以正常登录
- [ ] 数据可以正常上传下载
- [ ] 所有功能正常工作
- [ ] 性能符合预期

## 📞 应急预案

### 16. 回滚准备

- [ ] 保留上一个版本的APK/IPA
- [ ] 准备回滚方案
- [ ] 准备技术支持联系方式

---

## 配置文件位置

所有配置文件都在 `client/` 目录下：

```
client/
├── .env.production          ⭐ 生产环境配置（部署前修改）
├── .env.example             配置模板
├── config/
│   └── index.ts            配置管理代码
├── app.config.ts           Expo应用配置
└── eas.json                EAS构建配置
```

## 快速配置步骤

1. **复制配置模板**：
   ```bash
   cd client
   cp .env.example .env.production
   ```

2. **修改必需配置**：
   - 打开 `.env.production`
   - 修改 `EXPO_PUBLIC_BACKEND_BASE_URL` 为你的后端地址
   - 修改应用基础配置

3. **验证配置**：
   - 检查所有配置项
   - 测试API连接
   - 运行应用测试

4. **构建应用**：
   ```bash
   eas build --platform android --profile production
   ```

## 常见配置错误

### 错误1：后端API连接失败

**原因**：`EXPO_PUBLIC_BACKEND_BASE_URL` 配置错误

**解决**：
- 检查URL是否正确
- 确保协议（http/https）正确
- 确保后端服务可访问

### 错误2：配置不生效

**原因**：环境变量没有 `EXPO_PUBLIC_` 前缀

**解决**：
- 确保所有环境变量以 `EXPO_PUBLIC_` 开头
- 清除缓存：`npx expo start --clear`
- 重新构建

### 错误3：构建失败

**原因**：配置文件格式错误或缺少必要配置

**解决**：
- 检查 `.env.production` 格式是否正确
- 确认所有必填项都已配置
- 查看构建日志获取详细错误

---

完成以上清单后，你的应用就可以安全部署了！

如有问题，请参考：
- [配置说明文档](CONFIG.md)
- [部署指南](DEPLOYMENT.md)
- [README.md](../README.md)
