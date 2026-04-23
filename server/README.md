# AI情绪日记 & 心理状态智能陪伴系统 - Python后端

## 📚 目录

- [版本管理系统](#版本管理系统)
- [环境配置](#环境配置)
- [API文档](#api文档)
- [数据表结构](#数据表结构)
- [故障排查](#故障排查)

---

## 版本管理系统

### 快速开始

#### 1. 初始化数据库

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

#### 2. 使用Web可视化工具（推荐）

```bash
# 启动Web可视化工具
python3 version_manager_web.py
```

然后访问：`http://localhost:9092/version-manager`

#### 3. 使用CLI工具

```bash
# 启动CLI工具
python3 version_manager.py
```

### 功能说明

- ✅ 创建新版本
- ✅ 查看版本列表
- ✅ 激活版本（推送更新）
- ✅ 删除版本
- ✅ 编辑版本信息
- ✅ 查看激活的版本

### 详细文档

完整的使用手册请查看：[VERSION_MANAGEMENT.md](VERSION_MANAGEMENT.md)

---

## 环境配置

### 1. 安装依赖

```bash
pip3 install -r requirements.txt
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并填写配置：

```bash
cp .env.example .env
```

### 3. 必需的配置项

#### Supabase数据库配置（必需）

后端需要连接Supabase数据库来存储用户数据、日记和对话记录。

1. 登录 [Supabase控制台](https://supabase.com)
2. 创建一个新项目或使用现有项目
3. 从项目设置中获取：
   - Project URL (即 SUPABASE_URL)
   - anon public key (即 SUPABASE_KEY)
4. 在 Supabase SQL编辑器中运行 `init_database.py` 中的SQL语句创建表

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-public-key
```

#### 豆包ARK API配置（AI对话功能）

从[火山引擎控制台](https://console.volcengine.com/ark)获取：

```env
ARK_API_KEY=your-ark-api-key
ARK_CHAT_MODEL=ep-xxxxx
```

#### 豆包实时语音API配置（语音对话功能）

从[火山引擎语音控制台](https://console.volcengine.com/speech)获取：

```env
VOLCENGINE_SPEECH_APP_ID=your-app-id
VOLCENGINE_ACCESS_TOKEN=your-access-token
```

### 4. 数据库表初始化

运行 `init_database.py` 生成SQL语句，然后在Supabase SQL编辑器中运行：

```bash
python3 init_database.py
```

或者在Supabase SQL编辑器中手动运行以下SQL：

```sql
-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT,
    nickname TEXT,
    avatar TEXT,
    cloud_sync_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 日记表
CREATE TABLE IF NOT EXISTS diaries (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT NOT NULL,
    mood TEXT,
    tags TEXT[],
    emotion_analysis JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 对话表
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_message TEXT NOT NULL,
    ai_message TEXT NOT NULL,
    related_diary_id TEXT REFERENCES diaries(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5. 启动服务

```bash
# 开发模式
python3 main.py

# 或者使用 npm scripts
cd ..
pnpm run dev
```

服务将在 `http://localhost:9091` 启动

## API文档

### 健康检查

```
GET /api/v1/health
```

### 用户认证

```
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
```

### 日记管理

```
POST   /api/v1/diaries
GET    /api/v1/diaries
PUT    /api/v1/diaries/{diary_id}
DELETE /api/v1/diaries/{diary_id}
```

### AI对话

```
POST /api/v1/chat (SSE流式响应)
```

### 实时语音对话

```
WebSocket: ws://localhost:9091/api/v1/voice/realtime
```

### 版本管理（管理员）

```
POST   /api/v1/admin/versions
GET    /api/v1/admin/versions
GET    /api/v1/admin/versions/{version_id}
PUT    /api/v1/admin/versions/{version_id}
DELETE /api/v1/admin/versions/{version_id}
POST   /api/v1/admin/versions/{version_id}/activate
GET    /api/v1/admin/versions/active
```

### 模型管理（管理员）

```
GET /api/v1/admin/models/status
```

**响应示例**：
```json
{
  "success": true,
  "models": {
    "qwen-max": {
      "enabled": true,
      "priority": 1,
      "is_blacklisted": false,
      "failure_count": 0,
      "last_failure": 0
    },
    "qwen-plus": {
      "enabled": true,
      "priority": 2,
      "is_blacklisted": false,
      "failure_count": 0,
      "last_failure": 0
    }
  }
}
```

**详细文档**：[MODEL_MANAGER_GUIDE.md](MODEL_MANAGER_GUIDE.md)

### 版本检查（用户）

```
POST /api/v1/app/check-update
Content-Type: application/json

{
  "platform": "android",
  "current_version": "1.0.0",
  "build_number": 100
}
```

## 数据表结构

### users 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 用户ID |
| username | TEXT | 用户名（唯一） |
| password_hash | TEXT | 密码哈希 |
| email | TEXT | 邮箱 |
| nickname | TEXT | 昵称 |
| avatar | TEXT | 头像URL |
| cloud_sync_enabled | BOOLEAN | 云同步开关 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

### diaries 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 日记ID |
| user_id | TEXT | 用户ID（外键） |
| title | TEXT | 标题 |
| content | TEXT | 内容 |
| mood | TEXT | 情绪标签 |
| tags | TEXT[] | 标签数组 |
| emotion_analysis | JSONB | 情绪分析结果 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

### conversations 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 对话ID |
| user_id | TEXT | 用户ID（外键） |
| user_message | TEXT | 用户消息 |
| ai_message | TEXT | AI回复 |
| related_diary_id | TEXT | 关联日记ID（外键） |
| created_at | TIMESTAMPTZ | 创建时间 |

## 故障排查

### Supabase连接失败

1. 检查 `.env` 文件中的 SUPABASE_URL 和 SUPABASE_KEY 是否正确
2. 确认Supabase项目已启用数据库
3. 确认已创建所需的数据表

### AI对话功能不可用

1. 检查 ARK_API_KEY 是否配置
2. 确认ARK模型名称是否正确

### 实时语音功能不可用

1. 检查 VOLCENGINE_SPEECH_APP_ID 和 VOLCENGINE_ACCESS_TOKEN 是否配置
2. 确认Access Token未过期（24小时有效期）
