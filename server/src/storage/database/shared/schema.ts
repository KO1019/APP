import { pgTable, serial, timestamp, index, foreignKey, varchar, text, integer, jsonb, unique, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const diaries = pgTable("diaries", {
	id: varchar({ length: 36 }).default(gen_random_uuid()).primaryKey().notNull(),
	content: text().notNull(),
	mood: varchar({ length: 50 }),
	moodIntensity: integer("mood_intensity"),
	moodAnalysis: jsonb("mood_analysis"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	userId: varchar("user_id", { length: 36 }).notNull(),
	tags: text().array(),
	title: text(),
}, (table) => [
	index("diaries_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("diaries_mood_idx").using("btree", table.mood.asc().nullsLast().op("text_ops")),
	index("diaries_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "diaries_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const conversations = pgTable("conversations", {
	id: varchar({ length: 36 }).default(gen_random_uuid()).primaryKey().notNull(),
	userMessage: text("user_message").notNull(),
	aiMessage: text("ai_message").notNull(),
	relatedDiaryId: varchar("related_diary_id", { length: 36 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	userId: varchar("user_id", { length: 36 }).notNull(),
}, (table) => [
	index("conversations_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("conversations_diary_id_idx").using("btree", table.relatedDiaryId.asc().nullsLast().op("text_ops")),
	index("conversations_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.relatedDiaryId],
			foreignColumns: [diaries.id],
			name: "conversations_related_diary_id_diaries_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "conversations_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const users = pgTable("users", {
	id: varchar({ length: 36 }).default(gen_random_uuid()).primaryKey().notNull(),
	username: varchar({ length: 50 }).notNull(),
	passwordHash: varchar("password_hash", { length: 255 }).notNull(),
	email: varchar({ length: 100 }),
	nickname: varchar({ length: 50 }),
	avatar: text(),
	cloudSyncEnabled: boolean("cloud_sync_enabled").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("users_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("users_username_idx").using("btree", table.username.asc().nullsLast().op("text_ops")),
	unique("users_username_unique").on(table.username),
]);
