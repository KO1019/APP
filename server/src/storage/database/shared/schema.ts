import { pgTable, serial, timestamp, text, varchar, integer, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";



export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 日记表
export const diaries = pgTable(
  "diaries",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    content: text("content").notNull(), // 日记内容
    mood: varchar("mood", { length: 50 }), // 情绪类型（愉悦、悲伤、焦虑等）
    mood_intensity: integer("mood_intensity"), // 情绪强度 0-100
    mood_analysis: jsonb("mood_analysis"), // 情绪分析结果 JSON
    created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index("diaries_created_at_idx").on(table.created_at), // 排序字段
    index("diaries_mood_idx").on(table.mood), // 常用过滤字段
  ]
);

// 对话记录表
export const conversations = pgTable(
  "conversations",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    user_message: text("user_message").notNull(), // 用户消息
    ai_message: text("ai_message").notNull(), // AI 回复
    related_diary_id: varchar("related_diary_id", { length: 36 }).references(() => diaries.id, { onDelete: "cascade" }), // 关联的日记 ID（可选）
    created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    index("conversations_diary_id_idx").on(table.related_diary_id), // 外键索引
    index("conversations_created_at_idx").on(table.created_at), // 排序字段
  ]
);
