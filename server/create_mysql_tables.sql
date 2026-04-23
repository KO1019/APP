-- MySQL 数据库表结构

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS ai_emotion_diary CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE ai_emotion_diary;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    nickname VARCHAR(100),
    avatar_url TEXT,
    is_admin TINYINT(1) DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 日记表
CREATE TABLE IF NOT EXISTS diaries (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(200),
    content TEXT NOT NULL,
    mood VARCHAR(50),
    tags JSON,
    image_urls JSON,
    ai_analysis JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_mood (mood)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 对话历史表
CREATE TABLE IF NOT EXISTS conversations (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(200),
    messages JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 欢迎内容表
CREATE TABLE IF NOT EXISTS welcome_content (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    button_text VARCHAR(50) DEFAULT '开始使用',
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户欢迎状态表
CREATE TABLE IF NOT EXISTS user_welcome_status (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    welcome_id VARCHAR(36) NOT NULL,
    viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_welcome (user_id, welcome_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (welcome_id) REFERENCES welcome_content(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 公告表
CREATE TABLE IF NOT EXISTS announcements (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    button_text VARCHAR(50) DEFAULT '我知道了',
    priority INT DEFAULT 0,
    start_time DATETIME,
    end_time DATETIME,
    is_active TINYINT(1) DEFAULT 1,
    target_user_type VARCHAR(20) DEFAULT 'all',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_is_active_priority (is_active, priority),
    INDEX idx_target_user_type (target_user_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户公告查看状态表
CREATE TABLE IF NOT EXISTS user_announcement_status (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    announcement_id VARCHAR(36) NOT NULL,
    viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_announcement (user_id, announcement_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 版本表
CREATE TABLE IF NOT EXISTS versions (
    id VARCHAR(36) PRIMARY KEY,
    version_code INT NOT NULL UNIQUE,
    version_name VARCHAR(50) NOT NULL,
    build_number INT NOT NULL,
    release_notes TEXT,
    file_url TEXT,
    file_size BIGINT,
    checksum VARCHAR(64),
    platform VARCHAR(20) DEFAULT 'android',
    min_sdk_version INT,
    is_active TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_version_code (version_code),
    INDEX idx_is_active (is_active),
    INDEX idx_platform (platform)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认欢迎内容
INSERT INTO welcome_content (id, title, content, button_text, is_active)
VALUES (
    'default',
    '欢迎使用AI情绪日记',
    '在这里记录你的心情，让AI陪伴你了解自己，发现内心深处的声音。',
    '开始使用',
    1
) ON DUPLICATE KEY UPDATE id=id;

-- 插入测试公告
INSERT INTO announcements (id, title, content, button_text, priority, is_active, target_user_type)
VALUES (
    'test-announcement',
    '🎉 新功能上线',
    '欢迎使用新版AI情绪日记！我们新增了实时语音对话功能，快来试试吧！',
    '我知道了',
    10,
    1,
    'all'
) ON DUPLICATE KEY UPDATE id=id;

-- 插入默认版本
INSERT INTO versions (id, version_code, version_name, build_number, release_notes, platform, is_active)
VALUES (
    'v1.0.0',
    1,
    '1.0.0',
    1,
    '首次发布',
    'android',
    1
) ON DUPLICATE KEY UPDATE id=id;
