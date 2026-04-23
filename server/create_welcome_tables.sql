-- 欢迎内容表（管理员可编辑，只显示一次）
CREATE TABLE IF NOT EXISTS welcome_content (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    button_text TEXT DEFAULT '开始使用',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认欢迎内容
INSERT INTO welcome_content (id, title, content, button_text, is_active)
VALUES (
    'default',
    '欢迎使用AI情绪日记',
    '在这里记录你的心情，让AI陪伴你了解自己，发现内心深处的声音。',
    '开始使用',
    true
) ON CONFLICT (id) DO NOTHING;

-- 用户欢迎状态表（记录用户是否已查看欢迎内容）
CREATE TABLE IF NOT EXISTS user_welcome_status (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    welcome_id TEXT NOT NULL REFERENCES welcome_content(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, welcome_id)
);

-- 公告表（管理员可创建弹窗公告）
CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    button_text TEXT DEFAULT '我知道了',
    priority INTEGER DEFAULT 0,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    target_user_type TEXT DEFAULT 'all', -- all, new, active, inactive
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户公告查看状态表（记录用户是否已查看公告）
CREATE TABLE IF NOT EXISTS user_announcement_status (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, announcement_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_user_welcome_status_user_id ON user_welcome_status(user_id);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active, priority);
CREATE INDEX IF NOT EXISTS idx_user_announcement_status_user_id ON user_announcement_status(user_id);
