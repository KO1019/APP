"""
数据库表初始化脚本
运行此脚本在Supabase中创建所需的表
"""

# SQL语句，请在Supabase SQL编辑器中运行

# 1. 用户表
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

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

# 2. 日记表
CREATE TABLE IF NOT EXISTS diaries (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT NOT NULL,
    mood TEXT,
    tags TEXT[],
    emotion_analysis JSONB, -- 情绪分析结果
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_diaries_user_id ON diaries(user_id);
CREATE INDEX IF NOT EXISTS idx_diaries_created_at ON diaries(created_at DESC);

# 3. 对话表
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_message TEXT NOT NULL,
    ai_message TEXT NOT NULL,
    related_diary_id TEXT REFERENCES diaries(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

# 4. 版本管理表
CREATE TABLE IF NOT EXISTS app_versions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL,  -- 版本号，如 1.0.0
    build_number INTEGER NOT NULL,  -- 构建号，如 100
    platform TEXT NOT NULL,  -- 平台：android/ios
    force_update BOOLEAN DEFAULT FALSE,  -- 是否强制更新
    release_notes TEXT NOT NULL,  -- 更新说明
    release_date TIMESTAMPTZ DEFAULT NOW(),  -- 发布日期
    update_url TEXT,  -- 更新包URL（可选，用于expo-updates）
    is_active BOOLEAN DEFAULT FALSE,  -- 是否为当前推送的版本
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_platform_version UNIQUE(platform, version)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_app_versions_platform ON app_versions(platform);
CREATE INDEX IF NOT EXISTS idx_app_versions_is_active ON app_versions(is_active);

-- 添加触发器自动更新updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_app_versions_updated_at
    BEFORE UPDATE ON app_versions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_related_diary_id ON conversations(related_diary_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);

# 4. 更新时间戳的触发器（可选）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为users表创建触发器
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 为diaries表创建触发器
DROP TRIGGER IF EXISTS update_diaries_updated_at ON diaries;
CREATE TRIGGER update_diaries_updated_at
    BEFORE UPDATE ON diaries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

# 完成提示
print("数据库表初始化SQL已生成，请在Supabase SQL编辑器中运行以上SQL语句")
