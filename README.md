# AI情绪日记 & 心理状态智能陪伴系统

一个基于 Expo 54 + React Native + FastAPI 的智能情绪日记应用，支持情绪追踪、AI聊天、心理状态分析等功能。

## 项目结构

```
AI情绪日记/
├── client/                 # 前端（Expo + React Native）
│   ├── app/               # 路由和页面
│   ├── components/        # 通用组件
│   ├── screens/           # 页面组件
│   ├── contexts/          # Context（状态管理）
│   ├── config/            # 配置管理
│   ├── utils/             # 工具函数
│   ├── .env.production    # 生产环境配置 ⭐
│   ├── CONFIG.md          # 配置说明文档
│   ├── DEPLOYMENT.md      # 部署指南
│   └── package.json
│
├── server/                # 后端（FastAPI + Python）
│   ├── main.py           # 主应用
│   ├── model_manager.py  # 🆕 大语言模型管理系统
│   ├── requirements.txt  # Python依赖
│   ├── version_manager.py # CLI版本管理工具
│   ├── version_manager_web.py # Web可视化版本管理工具
│   ├── start_web_tool.sh # Web工具启动脚本
│   ├── VERSION_MANAGEMENT.md # 版本管理系统使用手册
│   ├── MODEL_MANAGER_GUIDE.md # 🆕 模型管理系统使用指南
│   └── .env             # 环境变量
│
└── 技术方案_AI情绪日记系统.md  # 技术方案文档
```

## 快速开始

### 前端开发

```bash
cd client
npm install
npx expo start
```

### 后端开发

```bash
cd server
pip install -r requirements.txt
python main.py
```

## 配置说明

### 前端配置

前端所有配置集中在 `client/config/index.ts`，通过环境变量 `client/.env.production` 进行配置。

**重要配置项**：

```env
# 后端API地址（必须配置）
EXPO_PUBLIC_BACKEND_BASE_URL=https://api.yourdomain.com

# 应用信息
EXPO_PUBLIC_APP_NAME=AI情绪日记
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_APP_BUNDLE_ID=com.emotiondiary.app

# 功能开关
EXPO_PUBLIC_ENABLE_OFFLINE_MODE=true
EXPO_PUBLIC_ENABLE_AI_CHAT=true
EXPO_PUBLIC_ENABLE_MOOD_ANALYSIS=true
EXPO_PUBLIC_ENABLE_LOCATION=true
```

详细配置说明请查看：[client/CONFIG.md](client/CONFIG.md)

### 后端配置

后端配置在 `server/.env` 文件中：

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

## 部署

### 移动端部署

详细的部署步骤请查看：[client/DEPLOYMENT.md](client/DEPLOYMENT.md)

**快速部署步骤**：

1. 修改 `client/.env.production` 中的配置
2. 构建 Android APK：
   ```bash
   cd client
   eas build --platform android --profile production
   ```
3. 下载并安装APK

### 后端部署

后端可以使用以下方式部署：

- Docker容器
- 云服务器（AWS、阿里云、腾讯云等）
- Serverless函数（Vercel、Railway等）

### 版本管理系统

版本管理系统用于管理和推送APP版本更新，包含以下工具：

**1. Web可视化工具（推荐）**

```bash
cd server
./start_web_tool.sh
# 或
python3 version_manager_web.py
```

访问：`http://localhost:9092/version-manager`

**2. CLI工具**

```bash
cd server
python3 version_manager.py
```

**功能说明**：
- ✅ 创建新版本
- ✅ 查看版本列表
- ✅ 激活版本（推送更新）
- ✅ 删除版本
- ✅ 编辑版本信息

**详细文档**：[server/VERSION_MANAGEMENT.md](server/VERSION_MANAGEMENT.md)

## 主要功能

### 1. 日记管理
- ✅ 创建、编辑、删除日记
- ✅ 本地存储和云端同步
- ✅ 支持离线模式
- ✅ 添加图片、位置、天气
- ✅ 情绪追踪和分析

### 2. AI聊天陪伴
- ✅ 实时对话
- ✅ 情绪识别
- ✅ 情绪分析和建议
- ✅ 语音对话（实时语音API）

### 3. 情绪分析
- ✅ 自动情绪识别
- ✅ 情绪趋势分析
- ✅ 情绪统计图表
- ✅ 情绪标签系统

### 4. 数据管理
- ✅ 本地加密存储
- ✅ 云端数据备份
- ✅ 数据导入导出
- ✅ 隐私保护

## 技术栈

### 前端
- **框架**: Expo 54 + React Native 0.81.5
- **导航**: Expo Router
- **状态管理**: React Context
- **UI组件**: 自定义组件 + uniwind
- **图标**: @expo/vector-icons (FontAwesome6)
- **其他**:
  - AsyncStorage (本地存储)
  - ImagePicker (图片选择)
  - Location (位置)
  - Reanimated (动画)

### 后端
- **框架**: FastAPI
- **数据库**: Supabase PostgreSQL
- **认证**: JWT
- **实时通信**: WebSocket
- **AI模型**: 豆包ARK API
- **语音**: 火山引擎实时语音API

## 开发指南

### 添加新功能

1. **添加页面**：
   - 在 `client/screens/` 创建页面组件
   - 在 `client/app/` 添加路由配置
   - 更新导航

2. **添加API**：
   - 在 `server/main.py` 添加路由
   - 实现业务逻辑
   - 添加权限验证

3. **修改配置**：
   - 在 `client/config/index.ts` 添加配置项
   - 在 `client/.env.production` 添加环境变量
   - 更新文档

### 代码规范

- 遵循 React Hooks 规则
- 使用 TypeScript 类型检查
- 遵循项目文件结构
- 编写清晰的注释
- 使用有意义的变量名

## 常见问题

### 1. 前端无法连接后端

**解决方案**：
- 检查 `EXPO_PUBLIC_BACKEND_BASE_URL` 是否正确
- 确保后端服务正常运行
- 检查网络连接

### 2. 构建失败

**解决方案**：
- 确保 Node.js 版本 >= 18
- 清除缓存：`npx expo start --clear`
- 检查依赖是否完整安装

### 3. 配置不生效

**解决方案**：
- 确保环境变量以 `EXPO_PUBLIC_` 开头
- 重新启动开发服务器
- 检查配置是否正确

## 文档

- [技术方案](技术方案_AI情绪日记系统.md) - 详细的技术方案文档
- [前端配置说明](client/CONFIG.md) - 前端配置详细说明
- [前端配置快速参考](client/CONFIG_SUMMARY.md) - 配置快速参考指南
- [部署指南](client/DEPLOYMENT.md) - 移动端部署指南
- [部署检查清单](client/DEPLOYMENT_CHECKLIST.md) - 部署前检查清单
- [.env.example](client/.env.example) - 环境变量模板
- [版本管理系统手册](server/VERSION_MANAGEMENT.md) - 版本管理系统完整使用手册

## 贡献

欢迎贡献代码、报告问题或提出建议。

## 许可证

MIT License

## 联系方式

如有问题，请联系开发团队。
