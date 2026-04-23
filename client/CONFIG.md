# 配置说明文档

## 配置文件概述

本项目采用集中式配置管理，所有配置项都在 `client/config/index.ts` 中统一管理，通过环境变量 `.env.production` 进行配置。

## 配置文件结构

```
client/
├── .env.example          # 环境变量模板
├── .env.production       # 生产环境配置（部署时修改此文件）
├── config/
│   └── index.ts         # 配置管理主文件
└── app.config.ts        # Expo应用配置
```

## 配置分类

### 1. 应用基础配置 (APP_CONFIG)

```typescript
export const APP_CONFIG = {
  name: string,        // 应用名称
  version: string,     // 应用版本
  bundleId: string,    // 应用ID（Android包名）
  scheme: string,      // 应用Scheme（深链接）
}
```

**环境变量**：
- `EXPO_PUBLIC_APP_NAME` - 应用显示名称
- `EXPO_PUBLIC_APP_VERSION` - 应用版本号
- `EXPO_PUBLIC_APP_BUNDLE_ID` - Android包名格式，如 `com.emotiondiary.app`
- `EXPO_PUBLIC_APP_SCHEME` - 深链接scheme，如 `emotiondiary`

### 2. API配置 (API_CONFIG)

```typescript
export const API_CONFIG = {
  baseUrl: string,     // 后端API基础URL
  timeout: number,     // API请求超时时间（毫秒）
}
```

**环境变量**：
- `EXPO_PUBLIC_BACKEND_BASE_URL` - 后端API地址，**必须配置**
- `EXPO_PUBLIC_API_TIMEOUT` - API超时时间，默认30000毫秒

**使用示例**：

```typescript
import { API_CONFIG } from '@/config';

// 获取API基础URL
const apiUrl = API_CONFIG.baseUrl; // 'https://api.yourdomain.com'

// 获取超时时间
const timeout = API_CONFIG.timeout; // 30000
```

### 3. 存储配置 (STORAGE_CONFIG)

```typescript
export const STORAGE_CONFIG = {
  enableEncryption: boolean,  // 是否启用加密存储
  passwordMinLength: number,  // 密码最小长度
  tokenExpireDays: number,    // Token过期天数
  storagePrefix: string,      // 本地存储键名前缀
}
```

**环境变量**：
- `EXPO_PUBLIC_ENABLE_ENCRYPTION` - 是否启用加密，默认true
- `EXPO_PUBLIC_PASSWORD_MIN_LENGTH` - 密码最小长度，默认4

### 4. 功能开关配置 (FEATURE_CONFIG)

```typescript
export const FEATURE_CONFIG = {
  enableOfflineMode: boolean,   // 是否启用离线模式
  enableAIChat: boolean,        // 是否启用AI聊天
  enableMoodAnalysis: boolean,  // 是否启用情绪分析
  enableLocation: boolean,      // 是否启用位置记录
  enableImageUpload: boolean,   // 是否启用图片上传
  maxImageCount: number,        // 最大图片数量
  maxImageSize: number,         // 最大图片大小（字节）
  imageQuality: number,         // 图片压缩质量（0-1）
}
```

**环境变量**：
- `EXPO_PUBLIC_ENABLE_OFFLINE_MODE` - 离线模式开关
- `EXPO_PUBLIC_ENABLE_AI_CHAT` - AI聊天功能开关
- `EXPO_PUBLIC_ENABLE_MOOD_ANALYSIS` - 情绪分析功能开关
- `EXPO_PUBLIC_ENABLE_LOCATION` - 位置记录功能开关

**使用示例**：

```typescript
import { FEATURE_CONFIG } from '@/config';

// 检查功能是否启用
if (FEATURE_CONFIG.enableAIChat) {
  // 显示AI聊天按钮
}

// 获取最大图片数量
const maxImages = FEATURE_CONFIG.maxImageCount; // 9
```

### 5. UI配置 (UI_CONFIG)

```typescript
export const UI_CONFIG = {
  themeMode: 'light' | 'dark' | 'auto',  // 主题模式
  animationDuration: number,             // 动画时长
  defaultFontSize: number,               // 默认字体大小
}
```

**环境变量**：
- `EXPO_PUBLIC_THEME_MODE` - 主题模式：light、dark、auto

### 6. 更新配置 (UPDATES_CONFIG)

```typescript
export const UPDATES_CONFIG = {
  url: string,              // 更新URL
  checkInterval: number,    // 检查更新间隔（小时）
}
```

**环境变量**：
- `EXPO_PUBLIC_UPDATES_URL` - Expo Updates更新URL

### 7. 日志配置 (LOG_CONFIG)

```typescript
export const LOG_CONFIG = {
  enableLogs: boolean,      // 是否启用日志
  level: 'debug' | 'info' | 'warn' | 'error',  // 日志级别
  reportErrors: boolean,    // 是否上报错误
}
```

**说明**：
- 开发环境：日志级别为debug，不上报错误
- 生产环境：日志级别为error，上报错误

## 环境变量使用规则

### 1. 前缀规则

所有在运行时需要使用的环境变量必须以 `EXPO_PUBLIC_` 开头：

```env
# ✅ 正确：运行时可用
EXPO_PUBLIC_BACKEND_BASE_URL=https://api.example.com

# ❌ 错误：运行时不可用
BACKEND_BASE_URL=https://api.example.com
```

### 2. 环境文件优先级

1. `.env.production` - 生产环境
2. `.env` - 开发环境
3. `.env.example` - 配置模板

### 3. 配置验证

应用启动时会自动验证配置，检查以下内容：

- API基础URL是否配置
- 最大图片数量是否大于0
- 最大图片大小是否合理
- 密码最小长度是否符合要求

如果验证失败，会在控制台输出错误信息。

## 配置使用示例

### 示例1：构建API请求URL

```typescript
import { API_CONFIG } from '@/config';
import { buildApiUrl } from '@/utils';

// 方式1：直接使用配置
const url = `${API_CONFIG.baseUrl}/api/v1/users`;

// 方式2：使用工具函数
const url = buildApiUrl('/api/v1/users');
```

### 示例2：检查功能是否启用

```typescript
import { FEATURE_CONFIG } from '@/config';

function renderAIButton() {
  if (!FEATURE_CONFIG.enableAIChat) {
    return null;
  }
  return <AIChatButton />;
}
```

### 示例3：获取环境信息

```typescript
import { getEnvironmentInfo } from '@/config';

const env = getEnvironmentInfo();

console.log(env.isDevelopment); // 是否开发环境
console.log(env.isWeb);         // 是否Web平台
console.log(env.platform);      // 平台类型
```

## 常见配置场景

### 场景1：切换到生产环境后端

```env
# .env.production
EXPO_PUBLIC_BACKEND_BASE_URL=https://api.yourdomain.com
```

### 场景2：禁用某些功能

```env
# .env.production
EXPO_PUBLIC_ENABLE_AI_CHAT=false
EXPO_PUBLIC_ENABLE_LOCATION=false
```

### 场景3：自定义应用信息

```env
# .env.production
EXPO_PUBLIC_APP_NAME=我的情绪日记
EXPO_PUBLIC_APP_VERSION=2.0.0
EXPO_PUBLIC_APP_BUNDLE_ID=com.mycompany.mydiary
```

### 场景4：强制使用浅色主题

```env
# .env.production
EXPO_PUBLIC_THEME_MODE=light
```

## 配置最佳实践

1. **不要硬编码配置**：始终使用 `config/index.ts` 中的配置
2. **使用类型安全**：配置都有TypeScript类型定义
3. **环境隔离**：开发和生产使用不同的环境文件
4. **配置验证**：启动时自动验证配置正确性
5. **文档维护**：修改配置后及时更新文档

## 故障排查

### 问题1：配置不生效

**症状**：修改 `.env.production` 后，应用没有使用新配置

**原因**：
- 环境变量没有 `EXPO_PUBLIC_` 前缀
- 缓存问题
- 构建时没有使用正确的环境文件

**解决方案**：
1. 确保环境变量以 `EXPO_PUBLIC_` 开头
2. 清除缓存：`npx expo start --clear`
3. 重新构建应用

### 问题2：API连接失败

**症状**：应用无法连接到后端

**解决方案**：
1. 检查 `EXPO_PUBLIC_BACKEND_BASE_URL` 是否正确
2. 确保后端API可访问
3. 查看应用日志获取详细错误

### 问题3：功能异常

**症状**：某个功能不工作

**解决方案**：
1. 检查对应的环境变量是否正确配置
2. 确认功能开关是否启用
3. 查看浏览器控制台或应用日志

## 总结

通过集中式配置管理，你可以：

1. **轻松切换环境**：只需修改环境变量
2. **类型安全**：TypeScript提供类型检查
3. **配置验证**：启动时自动验证
4. **易于维护**：所有配置集中管理

如有疑问，请参考 `DEPLOYMENT.md` 部署指南。
