# Expo账户登录指南

## 📧 账户信息

- **邮箱**: 18107948491@163.com
- **密码**: AAjj201611

## 🔐 如何登录

### 方法1: 使用命令行登录（推荐）

由于当前环境不支持交互式输入，你需要在支持交互的终端中执行：

```bash
cd /workspace/projects/client
npx expo login
```

按提示输入：
1. 用户名或邮箱: `18107948491@163.com`
2. 密码: `AAjj201611`

### 方法2: 使用浏览器登录

1. 访问 https://expo.dev
2. 点击右上角"Sign In"
3. 输入邮箱: `18107948491@163.com`
4. 输入密码: `AAjj201611`
5. 登录后，在账户设置中生成Access Token
6. 复制Token

使用Token登录：

```bash
export EXPO_TOKEN="你的Token"
npx expo whoami
```

### 方法3: 如果在本地终端

在支持交互的本地终端（如你的电脑）执行：

```bash
cd /workspace/projects/client
npx expo login 18107948491@163.com
# 输入密码: AAjj201611
```

## ✅ 验证登录

登录成功后，验证：

```bash
npx expo whoami
```

应该显示你的账户信息。

## 🚀 登录后构建APK

登录成功后，执行：

```bash
cd /workspace/projects/client
./quick-build-apk.sh
```

或直接运行：

```bash
npx eas build --platform android --profile preview
```

## 📱 下载APK

构建完成后：
1. 访问 https://expo.dev
2. 进入你的项目页面
3. 点击"Builds"标签
4. 找到最新的构建记录
5. 下载APK文件

## 🔒 安全提示

为了安全起见，建议：
1. 登录后修改密码
2. 定期更换密码
3. 不要在公开场合分享密码

## 💡 提示

如果账户是第一次登录，可能需要：
1. 验证邮箱（检查邮箱收件箱）
2. 同意服务条款
3. 完善个人资料

## 📞 需要帮助？

如果遇到问题：
- [Expo登录文档](https://docs.expo.dev/accounts/)
- [EAS Build文档](https://docs.expo.dev/build/introduction/)
- [Expo论坛](https://forums.expo.dev/)
