import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * Bảng lưu trữ lịch sử xử lý bài báo của User
 */
export const summaries = sqliteTable('summaries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chatId: integer('chat_id').notNull(),
  userName: text('user_name'),
  
  url: text('url').notNull(),
  domain: text('domain'),
  title: text('title'),
  
  status: text('status', { enum: ['success', 'error'] }).default('success'),
  errorMessage: text('error_message'),
  
  originalLength: integer('original_length'),
  contentSnippet: text('content_snippet'),
  summary: text('summary'),
  
  // Dùng SQL functions ngay trong Schema
  createdAt: text('created_at').default(sql`(datetime('now', 'localtime'))`),
}, (table) => {
  return {
    // Unique Constraint để tracking kết quả xử lý của cùng 1 URL
    unq: unique().on(table.chatId, table.url)
  };
});

/**
 * Bảng User Settings (AI Provider)
 */
export const userPreferences = sqliteTable('user_preferences', {
  chatId: integer('chat_id').primaryKey(),
  preferredProvider: text('preferred_provider').default('groq'),
  updatedAt: text('updated_at').default(sql`(datetime('now', 'localtime'))`),
});
