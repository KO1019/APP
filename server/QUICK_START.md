# 版本管理系统 - 快速开始指南

## 🚀 5分钟快速上手

### 第一步：初始化数据库（1分钟）

在Supabase SQL编辑器中运行以下SQL：

```sql
CREATE TABLE IF NOT EXISTS app_versions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL,
    build_number INTEGER NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('android', 'ios')),
    force_update BOOLEAN DEFAULT FALSE,
    release_notes TEXT NOT NULL,
    update_url TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    release_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(version, build_number, platform)
);

CREATE INDEX IF NOT EXISTS idx_app_versions_platform ON app_versions(platform);
CREATE INDEX IF NOT EXISTS idx_app_versions_is_active ON app_versions(is_active);

ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to app_versions"
    ON app_versions FOR ALL
    USING (true)
    WITH CHECK (true);
```

### 第二步：启动Web工具（2分钟）

```bash
cd /workspace/projects/server
python3 version_manager_web.py
```

启动成功后会看到：

```
🚀 版本管理系统 Web可视化工具启动中...
📊 访问地址: http://localhost:9092/version-manager
🔗 后端API: http://localhost:9091/api/v1
```

### 第三步：创建第一个版本（2分钟）

1. 打开浏览器访问：`http://localhost:9092/version-manager`
2. 点击"➕ 创建版本"
3. 填写表单：

   ```
   版本号: 1.0.1
   构建号: 101
   平台: Android
   更新类型: 可选更新
   更新说明:
   1. 修复了登录失败的问题
   2. 优化了启动速度
   3. 改进了UI界面
   更新包URL: https://your-cdn.com/app-v1.0.1.apk
   ```

4. 点击"创建版本"

### 第四步：激活版本（1分钟）

1. 点击"📋 版本列表"
2. 找到刚创建的版本
3. 点击"激活"按钮
4. 确认激活

✅ 完成！用户现在会收到更新通知。

---

## 📖 完整文档

详细的使用手册请查看：[VERSION_MANAGEMENT.md](VERSION_MANAGEMENT.md)

包含以下内容：

- [功能详解](VERSION_MANAGEMENT.md#功能详解)
- [API接口](VERSION_MANAGEMENT.md#api接口)
- [CLI工具使用](VERSION_MANAGEMENT.md#cli工具使用)
- [Web可视化工具](VERSION_MANAGEMENT.md#web可视化工具)
- [最佳实践](VERSION_MANAGEMENT.md#最佳实践)
- [常见问题](VERSION_MANAGEMENT.md#常见问题)

---

## 🎯 常用操作

### 创建新版本

```
1. 访问 http://localhost:9092/version-manager
2. 点击"创建版本"
3. 填写版本信息
4. 保存
```

### 查看版本列表

```
1. 点击"版本列表"
2. 选择平台筛选（可选）
3. 查看所有版本
```

### 激活版本（推送更新）

```
1. 在版本列表中找到目标版本
2. 点击"激活"按钮
3. 确认激活
```

### 删除版本

```
1. 在版本列表中找到目标版本
2. 点击"删除"按钮
3. 确认删除
```

---

## 🔗 前端集成

前端需要实现检查更新逻辑：

```typescript
// 检查更新
const checkUpdate = async () => {
  const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/app/check-update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      platform: Platform.OS,  // 'android' 或 'ios'
      current_version: '1.0.0',
      build_number: 100
    })
  });

  const data = await response.json();

  if (data.has_update) {
    // 显示更新对话框
    Alert.alert(
      '发现新版本',
      data.version.release_notes,
      [
        { text: '稍后', style: 'cancel' },
        {
          text: '立即更新',
          onPress: () => {
            // 跳转到更新链接
            if (data.version.update_url) {
              Linking.openURL(data.version.update_url);
            }
          }
        }
      ]
    );
  }
};
```

---

## 💡 最佳实践

### 版本号规范

推荐使用语义化版本号：

```
1.0.0 → 1.0.1 → 1.1.0 → 2.0.0
修订     次版      主版
```

### 更新类型选择

- **可选更新**：一般功能更新、优化
- **强制更新**：重大bug修复、安全更新

### 发布流程

```
开发 → 测试 → 创建版本 → 小范围测试 → 激活版本
```

---

## ❓ 常见问题

### Q: Web工具启动失败？

A: 确保已安装依赖：

```bash
pip install -r requirements.txt
```

### Q: 用户看不到更新？

A: 检查以下几点：
1. 版本是否已激活
2. 当前版本号是否小于新版本
3. 前端是否实现了检查更新逻辑

### Q: 如何回滚版本？

A: 激活旧版本即可

---

## 📞 需要帮助？

查看完整文档：[VERSION_MANAGEMENT.md](VERSION_MANAGEMENT.md)
