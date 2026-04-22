-- 创建app_versions表
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

DROP TRIGGER IF EXISTS update_app_versions_updated_at ON app_versions;
CREATE TRIGGER update_app_versions_updated_at
    BEFORE UPDATE ON app_versions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
