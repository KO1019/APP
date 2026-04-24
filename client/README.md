# AI情绪日记 - 前端应用

## 项目简介

AI情绪日记是一个基于Expo 54 + React Native的移动应用，提供日记记录、AI陪伴、情绪分析等功能。

## 技术栈

- **框架**: Expo 54 + React Native
- **路由**: Expo Router
- **状态管理**: Context API
- **样式**: 原生StyleSheet + HeroUI组件库
- **图标**: @expo/vector-icons
- **存储**: @react-native-async-storage/async-storage
- **类型**: TypeScript

## 快速开始

### 1. 安装依赖

```bash
cd client
npm install
```

### 2. 配置环境变量

复制环境变量模板：

```bash
cp .env.example .env.local
```

编辑 `.env.local`，配置后端API地址：

```bash
EXPO_PUBLIC_BACKEND_BASE_URL=http://9.129.7.228:9091
```

### 3. 启动开发服务器

```bash
npm start
```

## 项目结构

```
client/
├── app/                    # Expo Router路由
│   ├── (tabs)/            # 底部Tab导航
│   │   ├── index.tsx      # 首页（日记列表）
│   │   ├── chat.tsx       # AI聊天
│   │   ├── stats.tsx      # 统计
│   │   └── profile.tsx    # 个人中心
│   ├── login.tsx          # 登录
│   ├── register.tsx       # 注册
│   ├── write-diary.tsx    # 写日记
│   └── ...
├── components/            # 公共组件
├── screens/              # 页面组件
├── contexts/             # Context提供者
├── config/               # 配置文件
├── assets/               # 静态资源
└── utils/                # 工具函数
```

## 配置说明

### 环境变量

主要的环境变量在 `.env.production` 中配置：

```bash
# 应用基础配置
EXPO_PUBLIC_APP_NAME=AI情绪日记
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_APP_BUNDLE_ID=com.emotiondiary.app
EXPO_PUBLIC_APP_SCHEME=emotiondiary

# 后端API配置
EXPO_PUBLIC_BACKEND_BASE_URL=http://9.129.7.228:9091
EXPO_PUBLIC_API_TIMEOUT=30000

# 功能开关
EXPO_PUBLIC_ENABLE_OFFLINE_MODE=true
EXPO_PUBLIC_ENABLE_AI_CHAT=true
EXPO_PUBLIC_ENABLE_MOOD_ANALYSIS=true
EXPO_PUBLIC_ENABLE_LOCATION=true

# UI配置
EXPO_PUBLIC_THEME_MODE=auto
```

### 应用配置

`app.config.ts` 包含应用的元数据和配置：

- **名称**: 从环境变量读取
- **版本**: 从环境变量读取
- **Bundle ID**: 从环境变量读取
- **Scheme**: 从环境变量读取
- **图标**: `./assets/images/icon.png`
- **启动屏**: `./assets/images/splash-icon.png`

## 核心功能

### 1. 用户认证

- ✅ 用户注册
- ✅ 用户登录
- ✅ JWT认证
- ✅ 自动登录
- ✅ 修改密码

### 2. 日记管理

- ✅ 创建日记
- ✅ 查看日记列表
- ✅ 查看日记详情
- ✅ 编辑日记
- ✅ 删除日记
- ✅ 云同步
- ✅ 图片上传
- ✅ 标签管理
- ✅ 心情记录
- ✅ 天气记录
- ✅ 位置记录

### 3. AI陪伴

- ✅ AI对话
- ✅ 流式响应
- ✅ 历史记录
- ✅ 保存为日记
- ✅ 情绪分析

### 4. 统计分析

- ✅ 日记统计
- ✅ 心情趋势
- ✅ 词云分析
- ✅ 月度报告

### 5. 个人中心

- ✅ 个人资料
- ✅ 头像管理
- ✅ 设置管理
- ✅ 隐私设置
- ✅ 应用锁
- ✅ 关于应用

## 页面路由

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | 首页 | 日记列表 |
| `/login` | 登录 | 用户登录 |
| `/register` | 注册 | 用户注册 |
| `/write-diary` | 写日记 | 创建/编辑日记 |
| `/diary-detail` | 日记详情 | 查看日记详情 |
| `/chat` | AI聊天 | AI对话 |
| `/conversation-history` | 对话历史 | 查看历史对话 |
| `/stats` | 统计 | 数据统计 |
| `/profile` | 个人中心 | 个人资料和设置 |

## 构建与部署

### 开发环境

```bash
npm start
```

访问 http://localhost:8081

### 生产环境构建

```bash
# 配置生产环境
cp .env.production .env.local

# 构建Web版本
npm run web

# 构建Android APK
npm run build:android

# 构建iOS
npm run build:ios
```

### EAS Build（推荐）

```bash
# 配置EAS
eas build:configure

# 构建Android
eas build --platform android

# 构建iOS
eas build --platform ios
```

## 依赖管理

### 安装依赖

```bash
npm install
```

### 安装Expo SDK依赖

```bash
npx expo install <package-name>
```

### 常用依赖

- expo-router - 路由
- expo-secure-store - 安全存储
- @react-native-async-storage/async-storage - 本地存储
- expo-image-picker - 图片选择
- expo-camera - 相机
- expo-location - 位置
- expo-av - 音频
- react-native-sse - SSE连接
- axios - HTTP客户端

## 常见问题

### 1. 无法连接后端API

检查 `.env.local` 中的 `EXPO_PUBLIC_BACKEND_BASE_URL` 是否正确。

### 2. 图片上传失败

检查后端服务是否运行，网络是否正常。

### 3. AI对话不回复

检查ARK API配置是否正确，查看后端日志。

### 4. 云同步失败

检查登录状态，检查网络连接，查看后端日志。

## 开发规范

### 1. 组件命名

- 页面组件：PascalCase（如 `WriteDiaryScreen`）
- 公共组件：PascalCase（如 `SmartDateInput`）
- 工具函数：camelCase（如 `formatDate`）

### 2. 文件命名

- 页面：kebab-case（如 `write-diary.tsx`）
- 组件：PascalCase（如 `SmartDateInput.tsx`）
- 工具：kebab-case（如 `date-utils.ts`）

### 3. 样式规范

- 使用StyleSheet定义样式
- 统一使用配置的颜色和间距
- 保持响应式设计

### 4. API调用规范

- 使用 `fetch` 发起请求
- 添加接口注释说明
- 处理错误和加载状态
- 使用环境变量配置API地址

## 性能优化

1. **图片优化**
   - 使用expo-image代替Image
   - 压缩图片大小
   - 使用CDN加速

2. **列表优化**
   - 使用FlatList代替ScrollView
   - 使用memo优化渲染
   - 分页加载

3. **网络优化**
   - 请求缓存
   - 预加载关键数据
   - 使用离线模式

## 安全建议

1. **数据加密**
   - 敏感数据使用expo-secure-store
   - 启用HTTPS
   - JWT验证

2. **输入验证**
   - 前端验证用户输入
   - 防止XSS攻击
   - 防止SQL注入

3. **权限管理**
   - 最小权限原则
   - 用户授权
   - 权限说明

## 更新日志

### v1.0.0 (2024-01-01)

- ✅ 初始版本发布
- ✅ 用户认证系统
- ✅ 日记管理功能
- ✅ AI对话功能
- ✅ 云同步功能
- ✅ 统计分析功能

## 支持

如有问题，请联系开发团队。

## 许可证

MIT License
