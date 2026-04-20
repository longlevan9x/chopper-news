/**
 * Dynamic Secrets Service
 * Ưu tiên lấy Key từ Database (D1), nếu không có mới dùng Env của Cloudflare
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { appSecrets } from '../db/schema.js';
import { AppEnv } from '../config.js';

/**
 * Lấy một giá trị bí mật theo tên và User ID.
 * Luồng ưu tiên: 
 * 1. Key cá nhân của User trong Database (D1)
 * 2. Key mặc định của hệ thống (chatId = 0) trong Database
 * 3. Environment (env) bindings (Lưới phòng thủ cuối)
 */
export async function getAppSecret(
  keyName: keyof AppEnv | string,
  env: AppEnv,
  chatId: number = 0
): Promise<string | undefined> {
  try {
    const db = drizzle(env.DB);
    
    // 1. Kiểm tra Key riêng của User (Nếu có chatId)
    if (chatId !== 0) {
      const userResult = await db.select()
        .from(appSecrets)
        .where(
          and(
            eq(appSecrets.keyName, keyName),
            eq(appSecrets.chatId, chatId)
          )
        )
        .limit(1);

      if (userResult.length > 0) return userResult[0].keyValue;
    }

    // 2. Kiểm tra Key hệ thống (chatId = 0)
    const systemResult = await db.select()
      .from(appSecrets)
      .where(
        and(
          eq(appSecrets.keyName, keyName),
          eq(appSecrets.chatId, 0)
        )
      )
      .limit(1);

    if (systemResult.length > 0) return systemResult[0].keyValue;

  } catch (err) {
    console.warn(`[Secrets] Lỗi khi truy vấn DB cho key ${keyName}:`, err);
  }

  // 3. Fallback to Env (Môi trường máy chủ)
  if (keyName in env) {
    return env[keyName as keyof AppEnv] as any;
  }

  return undefined;
}

/**
 * Lưu/Cập nhật Key vào Database cho User cụ thể
 */
export async function setAppSecret(
  keyName: string,
  keyValue: string,
  dbBinding: D1Database,
  chatId: number = 0
): Promise<void> {
  const db = drizzle(dbBinding);
  
  await db.insert(appSecrets)
    .values({
      chatId,
      keyName,
      keyValue
    })
    .onConflictDoUpdate({
      target: [appSecrets.chatId, appSecrets.keyName],
      set: {
        keyValue,
        updatedAt: new Date().toISOString()
      }
    });
}
