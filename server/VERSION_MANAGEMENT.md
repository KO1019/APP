# 版本管理系统使用手册

## 📋 目录

- [系统概述](#系统概述)
- [快速开始](#快速开始)
- [功能详解](#功能详解)
- [API接口](#api接口)
- [CLI工具使用](#cli工具使用)
- [Web可视化工具](#web可视化工具)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)

---

## 系统概述

### 什么是版本管理系统？

版本管理系统是一个用于管理和推送APP版本更新的完整解决方案，支持：

- ✅ **版本创建**：创建新版本并设置更新内容
- ✅ **版本管理**：查看、编辑、删除版本信息
- ✅ **更新推送**：一键激活版本，推送给所有用户
- ✅ **更新类型**：支持强制更新和可选更新
- ✅ **平台支持**：独立管理Android和iOS版本
- ✅ **前端集成**：APP自动检查并提示用户更新

### 工作流程

```
1. 创建新版本 → 2. 填写版本信息 → 3. 激活版本 → 4. 用户收到更新提示
```

---

## 快速开始

### 1. 初始化数据库

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

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_app_versions_platform ON app_versions(platform);
CREATE INDEX IF NOT EXISTS idx_app_versions_is_active ON app_versions(is_active);

-- 禁用RLS（简化API访问）
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to app_versions"
    ON app_versions FOR ALL
    USING (true)
    WITH CHECK (true);
```

### 2. 启动后端服务

```bash
cd /workspace/projects/server
python3 main.py
```

服务将在 `http://localhost:9091` 启动

### 3. 使用CLI工具

```bash
python3 version_manager.py
```

### 4. 使用Web可视化工具

启动后访问：`http://localhost:9091/version-manager`

---

## 功能详解

### 1. 版本创建

创建一个新版本需要以下信息：

| 字段 | 说明 | 示例 | 是否必填 |
|------|------|------|----------|
| version | 版本号 | 1.0.1 | ✅ 必填 |
| build_number | 构建号 | 101 | ✅ 必填 |
| platform | 平台 | android/ios | ✅ 必填 |
| force_update | 强制更新 | true/false | ✅ 必填 |
| release_notes | 更新说明 | 修复了一些bug | ✅ 必填 |
| update_url | 更新包URL | https://...apk | ⭕ 可选 |

#### 更新类型说明

**可选更新（force_update=false）**
- 用户可以选择"稍后更新"
- 用户可以选择"跳过此版本"
- 适合一般功能更新、优化

**强制更新（force_update=true）**
- 用户必须更新才能继续使用
- 无法跳过或延迟
- 适合重大bug修复、安全更新

### 2. 版本管理

#### 查看所有版本

可以按平台筛选：
- 只看Android版本
- 只看iOS版本
- 查看所有版本

#### 查看版本详情

显示完整信息：
- 版本号、构建号
- 平台、状态
- 更新类型、发布日期
- 完整更新说明
- 更新包URL

#### 更新版本

可以修改以下字段：
- 版本号
- 构建号
- 强制更新开关
- 更新说明
- 更新包URL

#### 删除版本

⚠️ **注意**：
- 删除后无法恢复
- 如果是激活版本，需要先激活其他版本

### 3. 版本激活（推送更新）

激活版本后：
- 所有用户在检查更新时会收到通知
- 前端会根据版本号判断是否需要更新
- 如果是强制更新，用户无法跳过

⚠️ **重要提醒**：
- 激活前请仔细检查版本信息
- 建议先在小范围测试
- 确保更新包URL可访问

---

## API接口

### 管理员接口

#### 1. 创建版本

```http
POST /api/v1/admin/versions
Content-Type: application/json

{
  "version": "1.0.1",
  "build_number": 101,
  "platform": "android",
  "force_update": false,
  "release_notes": "修复了一些bug",
  "update_url": "https://example.com/app-release-v1.0.1.apk"
}
```

**响应**：

```json
{
  "id": "version-uuid",
  "version": "1.0.1",
  "build_number": 101,
  "platform": "android",
  "force_update": false,
  "release_notes": "修复了一些bug",
  "update_url": "https://example.com/app-release-v1.0.1.apk",
  "is_active": false,
  "release_date": "2026-04-23T10:00:00Z",
  "created_at": "2026-04-23T10:00:00Z",
  "updated_at": "2026-04-23T10:00:00Z"
}
```

#### 2. 获取所有版本

```http
GET /api/v1/admin/versions?platform=android
```

**查询参数**：
- `platform`（可选）：android 或 ios

**响应**：

```json
{
  "versions": [
    {
      "id": "version-uuid",
      "version": "1.0.1",
      "build_number": 101,
      "platform": "android",
      "force_update": false,
      "release_notes": "修复了一些bug",
      "is_active": true,
      "release_date": "2026-04-23T10:00:00Z"
    }
  ]
}
```

#### 3. 获取单个版本

```http
GET /api/v1/admin/versions/{version_id}
```

#### 4. 更新版本

```http
PUT /api/v1/admin/versions/{version_id}
Content-Type: application/json

{
  "version": "1.0.2",
  "release_notes": "更新了新功能"
}
```

#### 5. 删除版本

```http
DELETE /api/v1/admin/versions/{version_id}
```

#### 6. 激活版本（推送）

```http
POST /api/v1/admin/versions/{version_id}/activate
```

**响应**：

```json
{
  "message": "版本已激活",
  "version": {
    "id": "version-uuid",
    "version": "1.0.1",
    "is_active": true
  }
}
```

#### 7. 获取激活的版本

```http
GET /api/v1/admin/versions/active
```

### 用户接口

#### 检查更新

```http
POST /api/v1/app/check-update
Content-Type: application/json

{
  "platform": "android",
  "current_version": "1.0.0",
  "build_number": 100
}
```

**响应（有更新）**：

```json
{
  "has_update": true,
  "version": {
    "id": "version-uuid",
    "version": "1.0.1",
    "build_number": 101,
    "platform": "android",
    "force_update": false,
    "release_notes": "修复了一些bug",
    "update_url": "https://example.com/app-release-v1.0.1.apk"
  }
}
```

**响应（无更新）**：

```json
{
  "has_update": false,
  "message": "已是最新版本"
}
```

---

## CLI工具使用

### 启动工具

```bash
python3 version_manager.py
```

### 菜单功能

```
==================================================
📦 版本管理器
==================================================
1. 创建新版本
2. 查看所有版本
3. 查看指定版本详情
4. 更新版本信息
5. 删除版本
6. 激活版本（推送给用户）
7. 查看当前激活的版本
0. 退出
==================================================
```

### 示例操作

#### 示例1：创建Android版本

```
请选择操作 (0-7): 1

📝 创建新版本
版本号 (如 1.0.1): 1.0.2
构建号 (如 101): 102

选择平台:
1. Android
2. iOS
请选择 (1/2): 1

更新类型:
1. 可选更新（用户可以选择稍后更新）
2. 强制更新（用户必须更新才能使用）
请选择 (1/2): 1

请输入更新说明（多行输入，输入空行结束）:
1. 新增了情绪分析功能
2. 优化了UI界面
3. 修复了一些已知bug

更新包URL (可选，按Enter跳过): https://example.com/app-v1.0.2.apk

✅ 版本创建成功!
   版本: 1.0.2
   平台: android
   强制更新: 否
```

#### 示例2：激活版本

```
请选择操作 (0-7): 6

🚀 激活版本（推送给用户）
请输入版本ID: version-uuid-here

版本信息:
   版本号: 1.0.2
   平台: android
   强制更新: 否

更新说明:
   1. 新增了情绪分析功能
   2. 优化了UI界面

⚠️  警告: 激活此版本后，所有用户都会收到更新通知！
确定要激活此版本吗? (y/n): y

✅ 版本激活成功!
   用户将收到版本 1.0.2 的更新通知
```

---

## Web可视化工具

### 启动工具

Web可视化工具已集成在 `server/version_manager_web.py` 中。

启动后端服务后，访问：

```
http://localhost:9091/version-manager
```

### 功能特性

#### 📊 仪表盘
- 显示Android和iOS的最新版本
- 显示激活的版本信息
- 快速操作入口

#### ➕ 创建版本
- 表单式输入
- 实时验证
- 多行更新说明编辑器

#### 📋 版本列表
- 分页显示
- 按平台筛选
- 状态标识（已激活/未激活）
- 更新类型标识（强制/可选）

#### ✏️ 编辑版本
- 在线编辑版本信息
- 修改更新说明
- 更新下载链接

#### 🚀 激活版本
- 一键激活
- 确认对话框
- 激活历史记录

#### 🗑️ 删除版本
- 二次确认
- 删除保护（激活版本无法删除）

### 使用流程

1. **查看仪表盘**
   - 了解当前版本状态
   - 查看激活的版本

2. **创建新版本**
   - 点击"创建版本"按钮
   - 填写版本信息
   - 点击"保存"

3. **编辑版本**
   - 在版本列表中找到目标版本
   - 点击"编辑"按钮
   - 修改信息后保存

4. **激活版本**
   - 确认版本信息无误
   - 点击"激活"按钮
   - 确认激活

5. **管理版本**
   - 查看所有版本
   - 编辑或删除不需要的版本

---

## 最佳实践

### 1. 版本号规范

推荐使用语义化版本号（Semantic Versioning）：

```
主版本号.次版本号.修订号 (MAJOR.MINOR.PATCH)
```

- **主版本号**：不兼容的API修改
- **次版本号**：向下兼容的功能性新增
- **修订号**：向下兼容的问题修正

**示例**：
- `1.0.0` → `1.0.1` 修复bug
- `1.0.1` → `1.1.0` 新增功能
- `1.1.0` → `2.0.0` 重大变更

### 2. 构建号规范

构建号应该是递增的整数：

```bash
Android: 100, 101, 102, 103, ...
iOS: 100, 101, 102, 103, ...
```

建议每次发布递增1。

### 3. 更新说明编写

#### 好的更新说明

```
✅ 新增功能
- 添加了情绪分析功能
- 支持多语言切换

✅ 优化体验
- 优化了启动速度
- 改进了UI界面

✅ 修复问题
- 修复了登录失败的问题
- 修复了图片上传失败的bug
```

#### 不好的更新说明

```
❌ 更新了一些功能
❌ 修复bug
❌ 优化
```

### 4. 更新类型选择

#### 何时使用强制更新？

- ✅ 重大安全漏洞修复
- ✅ 底层架构变更导致不兼容
- ✅ 法规要求必须更新

#### 何时使用可选更新？

- ✅ 一般功能新增
- ✅ UI优化
- ✅ 性能提升
- ✅ 一般bug修复

### 5. 发布流程

```
1. 开发完成 → 2. 内部测试 → 3. 创建版本记录 → 4. 小范围测试 → 5. 激活版本
```

**详细步骤**：

1. **开发完成**
   - 完成新功能开发
   - 通过所有测试

2. **内部测试**
   - QA测试
   - 产品验收

3. **创建版本记录**
   - 使用CLI或Web工具创建
   - 填写完整的更新说明
   - 设置正确的更新类型

4. **小范围测试**
   - 先不激活版本
   - 让部分用户测试
   - 收集反馈

5. **激活版本**
   - 确认无误后激活
   - 监控用户反馈
   - 准备回滚方案

### 6. 更新包管理

#### Android APK

- 使用稳定的CDN分发
- 确保下载链接长期有效
- APK文件名包含版本号
  - 示例：`app-release-v1.0.1.apk`

#### iOS IPA

- 使用TestFlight分发
- 或使用企业证书分发
- 确保配置描述文件

---

## 常见问题

### Q1: 如何回滚版本？

**A**: 创建新版本或激活旧版本

```bash
# 方法1：创建新版本
python3 version_manager.py
# 选择 1. 创建新版本
# 使用旧的版本号，但新的构建号

# 方法2：激活旧版本
python3 version_manager.py
# 选择 2. 查看所有版本
# 找到旧版本ID
# 选择 6. 激活版本
```

### Q2: 用户看不到更新提示？

**A**: 检查以下几点

1. 确认版本已激活
2. 确认当前版本号小于新版本
3. 检查用户APP是否有检查更新的逻辑
4. 查看前端日志

### Q3: 如何处理紧急更新？

**A**:

1. 创建新版本，设置`force_update=true`
2. 立即激活
3. 考虑使用更快的下载通道

### Q4: 更新包URL在哪里配置？

**A**: 在创建或编辑版本时填写

```json
{
  "update_url": "https://your-cdn.com/app-v1.0.1.apk"
}
```

### Q5: 如何查看更新统计？

**A**: 目前版本管理系统不提供统计功能，建议：

- 使用CDN的下载统计
- 在前端添加埋点
- 使用第三方分析工具

### Q6: Android和iOS可以共用一个版本记录吗？

**A**: 不可以

Android和iOS需要分别创建版本记录，因为：
- 构建号可能不同
- 更新包URL不同
- 发布时间可能不同

### Q7: 如何删除激活的版本？

**A**: 先激活其他版本

```bash
# 步骤1：查看激活的版本
python3 version_manager.py
# 选择 7. 查看当前激活的版本

# 步骤2：创建或激活另一个版本

# 步骤3：删除原来的版本
python3 version_manager.py
# 选择 5. 删除版本
```

### Q8: 更新说明支持HTML格式吗？

**A**: 目前只支持纯文本

多行文本用换行符分隔，前端会格式化显示。

### Q9: 如何批量管理版本？

**A**: 使用API接口

```python
import requests

# 批量激活
version_ids = ['id1', 'id2', 'id3']
for vid in version_ids:
    requests.post(f'http://localhost:9091/api/v1/admin/versions/{vid}/activate')
```

### Q10: 版本管理系统的安全性？

**A**:

- 目前API没有权限验证
- 建议在生产环境添加：
  - 管理员Token验证
  - IP白名单
  - 操作日志记录

---

## 附录

### A. 完整API列表

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/v1/admin/versions | 创建版本 |
| GET | /api/v1/admin/versions | 获取版本列表 |
| GET | /api/v1/admin/versions/{id} | 获取单个版本 |
| PUT | /api/v1/admin/versions/{id} | 更新版本 |
| DELETE | /api/v1/admin/versions/{id} | 删除版本 |
| POST | /api/v1/admin/versions/{id}/activate | 激活版本 |
| GET | /api/v1/admin/versions/active | 获取激活的版本 |
| POST | /api/v1/app/check-update | 检查更新 |

### B. 状态码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 404 | 版本不存在 |
| 500 | 服务器错误 |

### C. 数据库表结构

```sql
CREATE TABLE app_versions (
    id TEXT PRIMARY KEY,
    version TEXT NOT NULL,              -- 版本号
    build_number INTEGER NOT NULL,      -- 构建号
    platform TEXT NOT NULL,             -- 平台：android/ios
    force_update BOOLEAN,               -- 是否强制更新
    release_notes TEXT NOT NULL,        -- 更新说明
    update_url TEXT,                    -- 更新包URL
    is_active BOOLEAN,                  -- 是否激活
    release_date TIMESTAMPTZ,           -- 发布日期
    created_at TIMESTAMPTZ,             -- 创建时间
    updated_at TIMESTAMPTZ              -- 更新时间
);
```

### D. 相关文件

- `server/main.py` - 后端API实现
- `server/version_manager.py` - CLI工具
- `server/version_manager_web.py` - Web可视化工具
- `server/create_app_versions_table.sql` - 数据库表创建脚本

---

**文档版本**: 1.0.0
**最后更新**: 2026-04-23
**维护者**: AI情绪日记团队
