# AI情绪日记 - 移动端部署指南

## 目录

1. [环境准备](#环境准备)
2. [配置说明](#配置说明)
3. [构建配置](#构建配置)
4. [Android部署](#android部署)
5. [iOS部署](#ios部署)
6. [常见问题](#常见问题)

---

## 环境准备

### 必需工具

- **Node.js**: 版本 18 或更高
- **npm**: 版本 9 或更高
- **Expo CLI**: `npm install -g expo-cli`
- **EAS CLI** (用于构建): `npm install -g eas-cli`

### 安装依赖

```bash
cd client
npm install
```

---

## 配置说明

### 1. 复制环境变量模板

```bash
cp .env.example .env.production
```

### 2. 修改生产环境配置

编辑 `.env.production` 文件，修改以下关键配置：

#### 后端API配置（必须修改）

```env
# 后端API基础URL（生产环境）
EXPO_PUBLIC_BACKEND_BASE_URL=https://api.yourdomain.com
```

**重要**：将 `https://api.yourdomain.com` 替换为你的实际后端API地址。

#### 应用基础配置（可选修改）

```env
# 应用名称
EXPO_PUBLIC_APP_NAME=AI情绪日记

# 应用版本
EXPO_PUBLIC_APP_VERSION=1.0.0

# 应用ID（Android包名格式）
EXPO_PUBLIC_APP_BUNDLE_ID=com.yourcompany.emotiondiary

# 应用Scheme（用于深链接）
EXPO_PUBLIC_APP_SCHEME=emotiondiary
```

**说明**：
- `APP_BUNDLE_ID`: Android包名，格式为 `com.公司名.应用名`
- `APP_SCHEME`: 深链接scheme，用于分享等功能

#### 功能开关配置（可选修改）

```env
# 是否启用离线模式
EXPO_PUBLIC_ENABLE_OFFLINE_MODE=true

# 是否启用AI聊天功能
EXPO_PUBLIC_ENABLE_AI_CHAT=true

# 是否启用情绪分析功能
EXPO_PUBLIC_ENABLE_MOOD_ANALYSIS=true

# 是否启用位置记录
EXPO_PUBLIC_ENABLE_LOCATION=true
```

**说明**：
- 如果不需要某个功能，设置为 `false`

### 3. 配置文件结构

所有配置集中在以下位置：

```
client/
├── .env.production          # 生产环境变量
├── .env.example             # 配置模板
├── config/                  # 配置管理目录
│   └── index.ts            # 配置主文件
├── app.config.ts           # Expo应用配置
└── package.json            # 项目依赖
```

---

## 构建配置

### 1. 配置EAS（Expo Application Services）

首次使用EAS需要登录：

```bash
eas login
```

### 2. 创建EAS项目配置

如果还没有 `eas.json` 文件：

```bash
eas build:configure
```

### 3. 配置 `eas.json`

编辑或创建 `client/eas.json`：

```json
{
  "cli": {
    "version": ">= 5.2.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "buildConfiguration": "Release"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## Android部署

### 方法一：使用EAS构建APK（推荐）

1. **构建生产版本**：

```bash
cd client
eas build --platform android --profile production
```

2. **下载APK**：

构建完成后，EAS会提供一个下载链接，下载APK文件。

3. **安装APK**：

将APK传输到Android设备，直接安装即可。

### 方法二：本地构建（需要Android Studio）

1. **安装Android Studio**：
   - 下载并安装 [Android Studio](https://developer.android.com/studio)
   - 配置Android SDK

2. **构建APK**：

```bash
cd client
npx expo run:android
```

这会：
- 生成Android原生项目
- 使用Android Studio构建
- 输出APK到 `android/app/build/outputs/apk/` 目录

### 方法三：使用Expo Go（测试用）

1. **启动开发服务器**：

```bash
cd client
npx expo start
```

2. **安装Expo Go**：
   - 在Google Play商店下载Expo Go应用

3. **扫描二维码**：
   - 使用Expo Go扫描终端显示的二维码
   - 即可在手机上预览应用

---

## iOS部署

### 方法一：使用EAS构建（推荐）

**注意**：iOS构建需要Apple开发者账号（付费）。

1. **配置Apple账号**：

```bash
eas credentials
```

按照提示配置你的Apple开发者账号。

2. **构建生产版本**：

```bash
cd client
eas build --platform ios --profile production
```

3. **下载IPA**：

构建完成后，下载IPA文件。

4. **安装IPA**：

使用TestFlight或其他工具安装到iOS设备。

### 方法二：使用Expo Go（测试用）

1. **启动开发服务器**：

```bash
cd client
npx expo start
```

2. **安装Expo Go**：
   - 在App Store下载Expo Go应用

3. **扫描二维码**：
   - 使用Expo Go扫描终端显示的二维码
   - 即可在iPhone上预览应用

### 方法三：本地构建（需要Mac和Xcode）

1. **安装Xcode**：
   - 从Mac App Store安装Xcode
   - 需要Mac电脑

2. **配置证书**：
   - 在Xcode中配置开发者证书

3. **构建应用**：

```bash
cd client
npx expo run:ios
```

---

## 常见问题

### 1. 后端API连接失败

**症状**：应用无法连接到后端，提示网络错误。

**解决方案**：

- 检查 `.env.production` 中的 `EXPO_PUBLIC_BACKEND_BASE_URL` 是否正确
- 确保后端API已部署并可访问
- 检查网络连接是否正常
- 查看应用日志获取详细错误信息

### 2. 构建失败

**症状**：EAS构建时出现错误。

**解决方案**：

- 检查 `eas.json` 配置是否正确
- 确保所有依赖都已正确安装
- 查看EAS构建日志获取详细错误
- 确保Expo账号状态正常

### 3. APK无法安装

**症状**：下载的APK文件无法在Android设备上安装。

**解决方案**：

- 确保Android设备允许安装未知来源应用
- 检查APK文件是否完整
- 确保Android版本兼容
- 尝试清除应用数据后重新安装

### 4. iOS构建需要Apple ID

**症状**：EAS构建iOS应用时提示需要Apple ID。

**解决方案**：

- 注册Apple开发者账号（需要付费）
- 在EAS中配置Apple开发者账号
- 配置正确的证书和Provisioning Profile

### 5. 配置不生效

**症状**：修改 `.env.production` 后，构建的应用没有使用新配置。

**解决方案**：

- 确保环境变量以 `EXPO_PUBLIC_` 开头（只有这样的变量会在运行时可用）
- 清除缓存：`npx expo start --clear`
- 重新构建应用

---

## 配置速查表

| 配置项 | 环境变量 | 说明 | 必填 |
|--------|----------|------|------|
| 后端API地址 | `EXPO_PUBLIC_BACKEND_BASE_URL` | 后端API的完整URL | ✅ |
| 应用名称 | `EXPO_PUBLIC_APP_NAME` | 应用显示名称 | ❌ |
| 应用版本 | `EXPO_PUBLIC_APP_VERSION` | 应用版本号 | ❌ |
| 应用ID | `EXPO_PUBLIC_APP_BUNDLE_ID` | Android包名 | ❌ |
| 离线模式 | `EXPO_PUBLIC_ENABLE_OFFLINE_MODE` | 是否启用离线功能 | ❌ |
| AI聊天 | `EXPO_PUBLIC_ENABLE_AI_CHAT` | 是否启用AI聊天 | ❌ |
| 情绪分析 | `EXPO_PUBLIC_ENABLE_MOOD_ANALYSIS` | 是否启用情绪分析 | ❌ |
| 位置记录 | `EXPO_PUBLIC_ENABLE_LOCATION` | 是否启用位置记录 | ❌ |

---

## 技术支持

如有问题，请联系技术支持团队。
