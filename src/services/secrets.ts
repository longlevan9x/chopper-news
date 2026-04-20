/**
 * Dynamic Secrets Service
 * Ưu tiên lấy Key từ Database (D1), nếu không có mới dùng Env của Cloudflare
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { appSecrets } from '../db/schema.js';
import { AppEnv } from '../config.js';

/**
 * Lấy một giá trị bí mật theo tên.
 * Luồng ưu tiên: 
 * 1. Database app_secrets table
 * 2. Environment (env) bindings
 */
export async function getAppSecret(
  keyName: keyof AppEnv | string,
  env: AppEnv
): Promise<string | undefined> {
  try {
    const db = drizzle(env.DB);
    
    // 1. Check Database
    const result = await db.select()
      .from(appSecrets)
      .where(eq(appSecrets.keyName, keyName))
      .limit(1);

    if (result.length > 0) {
      return result[0].keyValue;
    }
  } catch (err) {
    console.warn(`[Secrets] Lỗi khi truy vấn DB cho key ${keyName}:`, err);
  }

  // 2. Fallback to Env
  if (keyName in env) {
    return env[keyName as keyof AppEnv] as any;
  }

  return undefined;
}

/**
 * Lưu/Cập nhật Key vào Database
 */
export async function setAppSecret(
  keyName: string,
  keyValue: string,
  dbBinding: D1Database
): Promise<void> {
  const db = drizzle(dbBinding);
  
  await db.insert(appSecrets)
    .values({
      keyName,
      keyValue
    })
    .onConflictDoUpdate({
      target: appSecrets.keyName,
      set: {
        keyValue,
        updatedAt: new Date().toISOString()
      }
    });
}
