# AI情绪日记 - Android APK构建指南

## 📱 构建方式

本应用提供两种Android APK构建方式：

### 方式1: EAS Build（推荐）

**优点**：
- 无需配置本地Android SDK
- 构建速度快
- 自动上传到云端
- 支持版本管理

**缺点**：
- 需要Expo账户
- 需要联网构建

### 方式2: 本地构建

**优点**：
- 完全离线构建
- 无需Expo账户
- 完全控制构建过程

**缺点**：
- 需要配置Android SDK
- 需要安装Java JDK
- 需要更多磁盘空间

---

## 🚀 方式1: 使用EAS Build构建APK

### 前置要求

1. Node.js 16+
2. Expo账户（免费注册：https://expo.dev）
3. EAS CLI

### 步骤

#### 1. 安装EAS CLI

```bash
cd /workspace/projects/client
npm install -g eas-cli
```

#### 2. 登录Expo账户

```bash
npx expo login
```

按提示输入邮箱和密码，或使用Expo令牌登录。

#### 3. 配置EAS Build

```bash
npx eas build:configure
```

这会自动创建或更新 `eas.json` 文件。

#### 4. 构建APK

```bash
# 使用构建脚本
./build-apk.sh
# 选择选项1

# 或直接运行命令
npx eas build --platform android --profile preview
```

#### 5. 下载APK

构建完成后：
- 访问 https://expo.dev
- 进入项目的Builds页面
- 下载生成的APK文件

---

## 🔧 方式2: 本地构建APK

### 前置要求

1. Node.js 16+
2. Java JDK 17+
3. Android SDK
4. 构建工具

### 步骤

#### 1. 安装Java JDK

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install openjdk-17-jdk

# 验证安装
java -version
```

#### 2. 安装Android SDK

```bash
# Ubuntu/Debian
sudo apt install android-tools-adb android-tools-fastboot

# 或下载Android Studio
# https://developer.android.com/studio
```

设置环境变量：

```bash
# 添加到 ~/.bashrc 或 ~/.zshrc
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools

# 重新加载配置
source ~/.bashrc
```

#### 3. 接受Android许可证

```bash
yes | sdkmanager --licenses
```

#### 4. 构建APK

```bash
# 使用构建脚本
./build-apk.sh
# 选择选项2

# 或直接运行命令
npx expo build:android --type apk
```

#### 5. 下载APK

构建完成后，APK文件位于：
```
build/ai-emotion-diary-1.0.0.apk
```

---

## 🛠️ 使用构建脚本

项目提供了便捷的构建脚本：

```bash
cd /workspace/projects/client

# 运行构建脚本
./build-apk.sh
```

脚本会提示选择构建方式：
- 选项1: 使用EAS Build（推荐）
- 选项2: 使用本地构建
- 选项3: 检查构建状态（仅EAS Build）

---

## 📊 构建配置

### eas.json

```json
{
  "cli": {
    "version": ">= 12.0.0"
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
  }
}
```

### 构建类型说明

| 类型 | 用途 | 输出 |
|------|------|------|
| development | 开发测试 | 开发版APK |
| preview | 内部测试 | 预览版APK |
| production | 正式发布 | 生产版APK |

---

## 📝 APK配置

### 应用信息

修改 `app.config.ts` 或 `.env.production`：

```typescript
{
  "name": "AI情绪日记",
  "slug": "ai-emotion-diary",
  "version": "1.0.0",
  "orientation": "portrait",
  "icon": "./assets/images/icon.png",
  "splash": {
    "image": "./assets/images/splash-icon.png",
    "resizeMode": "contain",
    "backgroundColor": "#FFF7ED"
  },
  "android": {
    "package": "com.emotiondiary.app",
    "versionCode": 1,
    "adaptiveIcon": {
      "foregroundImage": "./assets/images/adaptive-icon.png",
      "backgroundColor": "#FFF7ED"
    },
    "permissions": [
      "INTERNET",
      "CAMERA",
      "WRITE_EXTERNAL_STORAGE",
      "READ_EXTERNAL_STORAGE",
      "ACCESS_FINE_LOCATION",
      "RECORD_AUDIO"
    ]
  }
}
```

### 环境变量

确保 `.env.production` 配置正确：

```bash
EXPO_PUBLIC_BACKEND_BASE_URL=http://59.110.39.235:9091
EXPO_PUBLIC_APP_NAME=AI情绪日记
EXPO_PUBLIC_APP_VERSION=1.0.0
```

---

## 🔍 常见问题

### Q1: EAS Build失败

**原因**：
- Expo账户未登录
- 网络连接问题
- 构建配置错误

**解决**：
```bash
# 检查登录状态
npx expo whoami

# 重新登录
npx expo login

# 检查构建状态
npx eas build:list --platform android
```

### Q2: 本地构建失败

**原因**：
- Java版本不匹配
- Android SDK未配置
- 许可证未接受

**解决**：
```bash
# 检查Java版本
java -version

# 检查Android SDK
echo $ANDROID_HOME

# 接受许可证
yes | sdkmanager --licenses
```

### Q3: APK无法安装

**原因**：
- Android版本不兼容
- 签名问题
- 安装来源未启用

**解决**：
- 允许未知来源安装
- 检查Android版本要求
- 使用生产构建（production profile）

### Q4: 构建时间过长

**原因**：
- 首次构建需要下载依赖
- 网络速度慢
- 构建服务器负载高

**解决**：
- 使用预构建缓存（EAS Build）
- 等待首次构建完成
- 尝试非高峰时段构建

---

## 📦 APK分发

### 内部分发

```bash
# 上传到服务器
scp build/*.apk user@59.110.39.235:/var/www/html/apk/

# 提供下载链接
http://59.110.39.235/apk/ai-emotion-diary-1.0.0.apk
```

### 公开发布

1. Google Play Store
2. 应用宝
3. 钉钉应用市场
4. 企业内部分发

---

## 🎯 最佳实践

1. **使用EAS Build**
   - 推荐使用EAS Build
   - 构建更快更稳定
   - 自动版本管理

2. **版本管理**
   - 每次发布增加版本号
   - 保留历史版本
   - 记录更新日志

3. **测试验证**
   - 先构建preview版本测试
   - 验证所有功能正常
   - 再构建production版本发布

4. **签名管理**
   - 生产版本使用正式签名
   - 妥善保管签名密钥
   - 使用相同的签名更新应用

---

## 📞 支持

如有问题，请查看：
- [EAS Build文档](https://docs.expo.dev/build/introduction/)
- [Android构建文档](https://docs.expo.dev/build-reference/android-apk/)
- [Expo论坛](https://forums.expo.dev/)

---

## 📚 相关文档

- [快速开始](../QUICK_START.md)
- [部署完成总结](../DEPLOYMENT_COMPLETE.md)
- [前端文档](README.md)
