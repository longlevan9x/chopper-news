/**
 * D1 Database Repository - Powered by Drizzle ORM
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, sql, and } from 'drizzle-orm';
import { summaries, userPreferences, appSecrets } from './schema.js';

export interface SummaryRecord {
  id?: number;
  chat_id: number;
  user_name: string | null;
  url: string;
  domain: string | null;
  title: string | null;
  status: 'success' | 'error';
  error_message: string | null;
  original_length: number | null;
  content_snippet: string | null;
  summary: string | null;
  created_at?: string | null;
}

/**
 * Lưu kết quả tóm tắt.
 * Nếu đã trùng chat_id và url thì update nọi dung mới.
 */
export async function saveSummaryLog(
  db: D1Database,
  data: SummaryRecord
): Promise<void> {
  const ddb = drizzle(db);
  await ddb.insert(summaries).values({
    chatId: data.chat_id,
    userName: data.user_name,
    url: data.url,
    domain: data.domain,
    title: data.title,
    status: data.status,
    errorMessage: data.error_message,
    originalLength: data.original_length,
    contentSnippet: data.content_snippet,
    summary: data.summary,
  }).onConflictDoUpdate({
    target: [summaries.chatId, summaries.url],
    set: {
      status: data.status,
      errorMessage: data.error_message,
      originalLength: data.original_length,
      contentSnippet: data.content_snippet,
      summary: data.summary,
      createdAt: new Date().toISOString()
    }
  });
}

/**
 * Lấy lịch sử tóm tắt gần nhất
 */
export async function getRecentSummaries(
  db: D1Database,
  chatId: number,
  limitNum: number = 10
): Promise<SummaryRecord[]> {
  const ddb = drizzle(db);
  const rows = await ddb.select()
    .from(summaries)
    .where(eq(summaries.chatId, chatId))
    .orderBy(desc(summaries.createdAt))
    .limit(limitNum);

  return rows.map(r => ({
    id: r.id,
    chat_id: r.chatId,
    user_name: r.userName,
    url: r.url,
    domain: r.domain,
    title: r.title,
    status: r.status as 'success' | 'error',
    error_message: r.errorMessage,
    original_length: r.originalLength,
    content_snippet: r.contentSnippet,
    summary: r.summary,
    created_at: r.createdAt
  }));
}

/**
 * Tìm bản tóm tắt đã tồn tại dựa trên URL và User
 */
export async function getExistingSummary(
  db: D1Database,
  chatId: number,
  url: string
): Promise<SummaryRecord | null> {
  const ddb = drizzle(db);
  const rows = await ddb.select()
    .from(summaries)
    .where(
      and(
        eq(summaries.chatId, chatId),
        eq(summaries.url, url),
        eq(summaries.status, 'success')
      )
    )
    .limit(1);

  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    chat_id: r.chatId,
    user_name: r.userName,
    url: r.url,
    domain: r.domain,
    title: r.title,
    status: r.status as 'success' | 'error',
    error_message: r.errorMessage,
    original_length: r.originalLength,
    content_snippet: r.contentSnippet,
    summary: r.summary,
    created_at: r.createdAt
  };
}

/**
 * Lấy Summary theo ID
 */
export async function getSummaryById(
  db: D1Database,
  id: number
): Promise<SummaryRecord | null> {
  const ddb = drizzle(db);
  const rows = await ddb.select()
    .from(summaries)
    .where(eq(summaries.id, id))
    .limit(1);

  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    chat_id: r.chatId,
    user_name: r.userName,
    url: r.url,
    domain: r.domain,
    title: r.title,
    status: r.status as 'success' | 'error',
    error_message: r.errorMessage,
    original_length: r.originalLength,
    content_snippet: r.contentSnippet,
    summary: r.summary,
    created_at: r.createdAt
  };
}

/**
 * Lấy AI Provider mà người dùng lựa chọn
 */
export async function getPreferredProvider(
  db: D1Database,
  chatId: number
): Promise<'groq' | 'xai' | 'cloudflare'> {
  const ddb = drizzle(db);
  const result = await ddb.select({ provider: userPreferences.preferredProvider })
    .from(userPreferences)
    .where(eq(userPreferences.chatId, chatId))
    .limit(1);

  if (result.length > 0 && result[0].provider) {
    return result[0].provider as 'groq' | 'xai' | 'cloudflare';
  }
  return 'groq';
}

/**
 * Cập nhật AI Provider ưu tiên của người dùng
 */
export async function setPreferredProvider(
  db: D1Database,
  chatId: number,
  provider: 'groq' | 'xai' | 'cloudflare'
): Promise<void> {
  const ddb = drizzle(db);
  await ddb.insert(userPreferences)
    .values({
      chatId: chatId,
      preferredProvider: provider
    })
    .onConflictDoUpdate({
      target: userPreferences.chatId,
      set: {
        preferredProvider: provider,
        updatedAt: new Date().toISOString()
      }
    });
}

/**
 * Thống kê dữ liệu sử dụng của người dùng
 */
export async function getUserStats(db: D1Database, chatId: number) {
  const ddb = drizzle(db);
  
  // Tổng số lần tóm tắt thành công (Của user này)
  const userTotalRes = await ddb.select({ count: sql<number>`count(*)` })
    .from(summaries)
    .where(and(eq(summaries.chatId, chatId), eq(summaries.status, 'success')));
  
  // Tổng số lần tóm tắt của toàn bộ hệ thống
  const globalTotalRes = await ddb.select({ count: sql<number>`count(*)` })
    .from(summaries)
    .where(eq(summaries.status, 'success'));

  // Số lần tóm tắt trong ngày hôm nay của user
  const todayRes = await ddb.select({ count: sql<number>`count(*)` })
    .from(summaries)
    .where(
      and(
        eq(summaries.chatId, chatId), 
        eq(summaries.status, 'success'),
        sql`date(${summaries.createdAt}) = date('now', 'localtime')`
      )
    );

  // Kiểm tra xem user có cài Key cá nhân chưa
  const personalKeys = await ddb.select({ count: sql<number>`count(*)` })
    .from(appSecrets)
    .where(eq(appSecrets.chatId, chatId));

  return {
    userTotal: userTotalRes[0]?.count || 0,
    globalTotal: globalTotalRes[0]?.count || 0,
    today: todayRes[0]?.count || 0,
    hasPersonalKeys: (personalKeys[0]?.count || 0) > 0
  };
}
