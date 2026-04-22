import { relations } from "drizzle-orm/relations";
import { users, diaries, conversations } from "./schema";

export const diariesRelations = relations(diaries, ({one, many}) => ({
	user: one(users, {
		fields: [diaries.userId],
		references: [users.id]
	}),
	conversations: many(conversations),
}));

export const usersRelations = relations(users, ({many}) => ({
	diaries: many(diaries),
	conversations: many(conversations),
}));

export const conversationsRelations = relations(conversations, ({one}) => ({
	diary: one(diaries, {
		fields: [conversations.relatedDiaryId],
		references: [diaries.id]
	}),
	user: one(users, {
		fields: [conversations.userId],
		references: [users.id]
	}),
}));