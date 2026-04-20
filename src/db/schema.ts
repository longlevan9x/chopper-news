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
/**
 * Bảng lưu trữ cấu hình bí mật (API Keys)
 * Hỗ trợ cả Key hệ thống (chat_id = 0) và Key cá nhân của từng User
 */
export const appSecrets = sqliteTable('app_secrets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chatId: integer('chat_id').default(0).notNull(), // 0 đại diện cho System/Default Keys
  keyName: text('key_name').notNull(),            // Ví dụ: 'GROQ_API_KEY'
  keyValue: text('key_value').notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now', 'localtime'))`),
}, (table) => {
  return {
    // Đảm bảo mỗi User chỉ có 1 khoá cho mỗi Provider
    unq: unique().on(table.chatId, table.keyName)
  };
});
