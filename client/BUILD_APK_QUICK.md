# APK构建指南 - 快速开始

## 🚀 最快构建方式（推荐）

### 1. 登录Expo账户

```bash
cd /workspace/projects/client
npx expo login
```

访问 https://expo.dev 注册免费账户（如果没有）。

### 2. 构建APK

```bash
# 使用构建脚本
./build-apk.sh
# 选择选项1: 使用EAS Build

# 或直接运行
npx eas build --platform android --profile preview
```

### 3. 下载APK

构建完成后，访问 https://expo.dev → 你的项目 → Builds → 下载APK

---

## 🔧 本地构建（需要Android SDK）

如果无法使用EAS Build，可以本地构建：

```bash
# 使用构建脚本
./build-apk.sh
# 选择选项2: 使用本地构建

# 或直接运行
npx expo build:android --type apk
```

**注意**: 本地构建需要：
- Java JDK 17+
- Android SDK
- 构建工具

---

## 📱 安装APK

构建完成后：

1. **EAS Build**: 从Expo Dashboard下载APK
2. **本地构建**: 从 `build/` 目录获取APK

**安装到手机**:
- 传输APK到手机
- 允许未知来源安装
- 点击APK安装

---

## 📚 详细文档

查看完整构建指南: [BUILD_APK_GUIDE.md](BUILD_APK_GUIDE.md)
