# 前端配置总结

## 📋 配置文件清单

| 文件 | 说明 | 用途 |
|------|------|------|
| `.env.production` | ⭐ **生产环境配置** | 部署到移动端前必须修改此文件 |
| `.env.example` | 配置模板 | 所有可配置项的说明和示例 |
| `config/index.ts` | 配置管理代码 | 集中管理所有配置的TypeScript代码 |
| `app.config.ts` | Expo应用配置 | Expo框架的配置文件 |

## 🚀 快速配置指南

### 第一步：复制配置模板

```bash
cd client
cp .env.example .env.production
```

### 第二步：修改必需配置（3项）

打开 `.env.production` 文件，修改以下3个必需配置：

```env
# 1. 后端API地址（⭐ 必填）
EXPO_PUBLIC_BACKEND_BASE_URL=https://api.yourdomain.com

# 2. 应用名称（可选，建议修改）
EXPO_PUBLIC_APP_NAME=AI情绪日记

# 3. 应用ID（可选，建议修改）
EXPO_PUBLIC_APP_BUNDLE_ID=com.emotiondiary.app
```

### 第三步：保存并构建

```bash
eas build --platform android --profile production
```

## 📝 所有配置项说明

### 必填项（必须配置）

| 配置项 | 环境变量 | 默认值 | 说明 |
|--------|----------|--------|------|
| 后端API地址 | `EXPO_PUBLIC_BACKEND_BASE_URL` | 无 | 后端API的完整URL，**必须配置** |

### 可选项（可选配置）

#### 应用基础配置

| 配置项 | 环境变量 | 默认值 | 说明 |
|--------|----------|--------|------|
| 应用名称 | `EXPO_PUBLIC_APP_NAME` | AI情绪日记 | 应用显示名称 |
| 应用版本 | `EXPO_PUBLIC_APP_VERSION` | 1.0.0 | 应用版本号 |
| 应用ID | `EXPO_PUBLIC_APP_BUNDLE_ID` | com.emotiondiary.app | Android包名 |
| 应用Scheme | `EXPO_PUBLIC_APP_SCHEME` | emotiondiary | 深链接scheme |

#### 功能开关配置

| 配置项 | 环境变量 | 默认值 | 说明 |
|--------|----------|--------|------|
| 离线模式 | `EXPO_PUBLIC_ENABLE_OFFLINE_MODE` | true | 是否启用离线功能 |
| AI聊天 | `EXPO_PUBLIC_ENABLE_AI_CHAT` | true | 是否启用AI聊天 |
| 情绪分析 | `EXPO_PUBLIC_ENABLE_MOOD_ANALYSIS` | true | 是否启用情绪分析 |
| 位置记录 | `EXPO_PUBLIC_ENABLE_LOCATION` | true | 是否启用位置记录 |

#### 安全配置

| 配置项 | 环境变量 | 默认值 | 说明 |
|--------|----------|--------|------|
| 加密存储 | `EXPO_PUBLIC_ENABLE_ENCRYPTION` | true | 是否启用加密存储 |
| 密码长度 | `EXPO_PUBLIC_PASSWORD_MIN_LENGTH` | 4 | 密码最小长度 |

#### UI配置

| 配置项 | 环境变量 | 默认值 | 说明 |
|--------|----------|--------|------|
| 主题模式 | `EXPO_PUBLIC_THEME_MODE` | auto | light/dark/auto |

#### API配置

| 配置项 | 环境变量 | 默认值 | 说明 |
|--------|----------|--------|------|
| API超时 | `EXPO_PUBLIC_API_TIMEOUT` | 30000 | API请求超时时间（毫秒） |

#### 更新配置

| 配置项 | 环境变量 | 默认值 | 说明 |
|--------|----------|--------|------|
| 更新URL | `EXPO_PUBLIC_UPDATES_URL` | 无 | Expo Updates更新URL |

## 🔍 配置验证

应用启动时会自动验证以下内容：

- ✅ 后端API地址是否配置
- ✅ 最大图片数量是否大于0
- ✅ 最大图片大小是否合理
- ✅ 密码最小长度是否符合要求

如果验证失败，会在控制台输出错误信息。

## 📚 配置文件说明

### 1. `.env.production` （⭐ 重点）

这是**最重要**的配置文件，部署前必须修改。

**位置**：`client/.env.production`

**内容示例**：

```env
# 应用基础配置
EXPO_PUBLIC_APP_NAME=AI情绪日记
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_APP_BUNDLE_ID=com.emotiondiary.app
EXPO_PUBLIC_APP_SCHEME=emotiondiary

# 后端API配置（⭐ 必填）
EXPO_PUBLIC_BACKEND_BASE_URL=https://api.yourdomain.com
EXPO_PUBLIC_API_TIMEOUT=30000

# 功能开关
EXPO_PUBLIC_ENABLE_OFFLINE_MODE=true
EXPO_PUBLIC_ENABLE_AI_CHAT=true
EXPO_PUBLIC_ENABLE_MOOD_ANALYSIS=true
EXPO_PUBLIC_ENABLE_LOCATION=true

# 安全配置
EXPO_PUBLIC_ENABLE_ENCRYPTION=true
EXPO_PUBLIC_PASSWORD_MIN_LENGTH=4

# UI配置
EXPO_PUBLIC_THEME_MODE=auto

# 更新配置
EXPO_PUBLIC_UPDATES_URL=https://u.expo.dev/your-update-url
```

### 2. `.env.example`

配置模板，包含所有可配置项的说明。

**用途**：复制此文件创建 `.env.production`

### 3. `config/index.ts`

配置管理代码，提供以下功能：

- 配置项类型定义
- 配置验证函数
- 环境信息获取
- 统一的配置接口

**使用示例**：

```typescript
import { CONFIG, validateConfig } from '@/config';

// 验证配置
validateConfig();

// 使用配置
console.log(CONFIG.api.baseUrl);
console.log(CONFIG.feature.enableAIChat);
```

### 4. `app.config.ts`

Expo框架配置文件，使用配置文件中的配置：

- 应用名称
- 应用版本
- 应用ID
- 权限配置
- 插件配置

## 🎯 部署前检查清单

使用以下清单确保配置正确：

- [ ] 复制 `.env.example` 为 `.env.production`
- [ ] 修改 `EXPO_PUBLIC_BACKEND_BASE_URL` 为实际后端地址
- [ ] 修改应用名称和ID（可选）
- [ ] 检查功能开关配置（可选）
- [ ] 运行应用测试配置是否生效
- [ ] 构建生产版本

## 🔧 常见问题

### Q1: 配置修改后不生效？

**A**: 执行以下步骤：

1. 清除缓存：`npx expo start --clear`
2. 重新构建应用
3. 确保环境变量以 `EXPO_PUBLIC_` 开头

### Q2: 如何测试配置？

**A**: 在代码中使用配置：

```typescript
import { getEnvironmentInfo } from '@/config';

// 在控制台输出当前配置
console.log(getEnvironmentInfo());
```

### Q3: 不同环境如何配置？

**A**: 使用不同的环境文件：

- 开发环境：`.env`
- 生产环境：`.env.production`
- 测试环境：`.env.staging`

## 📖 相关文档

- [详细配置说明](CONFIG.md) - 配置项的详细说明
- [部署指南](DEPLOYMENT.md) - 完整的部署步骤
- [部署检查清单](DEPLOYMENT_CHECKLIST.md) - 部署前检查清单
- [项目README](../README.md) - 项目总览

## 💡 最佳实践

1. **使用版本控制**：不要提交 `.env.production` 到代码仓库
2. **配置分离**：开发、测试、生产使用不同的配置文件
3. **文档同步**：修改配置后及时更新文档
4. **配置验证**：应用启动时验证配置正确性
5. **安全第一**：不要在配置中硬编码密钥或敏感信息

---

**总结**：只需修改 `.env.production` 中的 `EXPO_PUBLIC_BACKEND_BASE_URL` 即可完成基本配置！
