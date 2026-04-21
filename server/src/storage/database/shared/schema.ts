import { pgTable, serial, timestamp, text, varchar, integer, jsonb, index, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";



export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 用户表
export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    username: varchar("username", { length: 50 }).notNull().unique(),
    password_hash: varchar("password_hash", { length: 255 }).notNull(),
    email: varchar("email", { length: 100 }),
    nickname: varchar("nickname", { length: 50 }),
    avatar: text("avatar"), // 头像URL
    cloud_sync_enabled: boolean("cloud_sync_enabled").default(false).notNull(), // 是否启用云端同步
    created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index("users_username_idx").on(table.username),
    index("users_email_idx").on(table.email),
  ]
);

// 日记表
export const diaries = pgTable(
  "diaries",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }), // 关联用户
    content: text("content").notNull(), // 日记内容
    mood: varchar("mood", { length: 50 }), // 情绪类型（愉悦、悲伤、焦虑等）
    mood_intensity: integer("mood_intensity"), // 情绪强度 0-100
    mood_analysis: jsonb("mood_analysis"), // 情绪分析结果 JSON
    created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index("diaries_user_id_idx").on(table.user_id), // 用户查询
    index("diaries_created_at_idx").on(table.created_at), // 排序字段
    index("diaries_mood_idx").on(table.mood), // 常用过滤字段
  ]
);

// 对话记录表
export const conversations = pgTable(
  "conversations",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }), // 关联用户
    user_message: text("user_message").notNull(), // 用户消息
    ai_message: text("ai_message").notNull(), // AI 回复
    related_diary_id: varchar("related_diary_id", { length: 36 }).references(() => diaries.id, { onDelete: "cascade" }), // 关联的日记 ID（可选）
    created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    index("conversations_user_id_idx").on(table.user_id), // 用户查询
    index("conversations_diary_id_idx").on(table.related_diary_id), // 外键索引
    index("conversations_created_at_idx").on(table.created_at), // 排序字段
  ]
);
