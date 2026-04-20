/**
 * Auth Service - Magic Link Token Generator & Verifier
 * Sử dụng HMAC-SHA256 để ký và xác thực chatId trong URL.
 */

import { AppEnv } from '../config.js';

/**
 * Tạo một Token bảo mật chứa chatId và thời gian hết hạn.
 * @param chatId Telegram ID của người dùng
 * @param env Cloudflare Env (chứa MAGIC_LINK_SECRET)
 * @param ttlSeconds Thời gian sống của link (mặc định 10 phút)
 */
export async function generateMagicToken(chatId: number, env: AppEnv, ttlSeconds = 600): Promise<string> {
  const secret = (env as any).MAGIC_LINK_SECRET || 'fallback-secret-chopper';
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  
  // Data: chatId:expires
  const data = `${chatId}:${expires}`;
  
  const signature = await computeSignature(data, secret);
  
  // Trả về base64-ish token: data.signature
  const token = btoa(`${data}.${signature}`).replace(/=/g, '');
  return token;
}

/**
 * Xác thực Token từ URL và trả về chatId nếu hợp lệ.
 */
export async function verifyMagicToken(token: string, env: AppEnv): Promise<number | null> {
  try {
    const secret = (env as any).MAGIC_LINK_SECRET || 'fallback-secret-chopper';
    const decoded = atob(token);
    const lastDotIndex = decoded.lastIndexOf('.');
    if (lastDotIndex === -1) return null;

    const data = decoded.substring(0, lastDotIndex);
    const signature = decoded.substring(lastDotIndex + 1);

    // 1. Kiểm tra chữ ký
    const expectedSignature = await computeSignature(data, secret);
    if (signature !== expectedSignature) return null;

    // 2. Kiểm tra thời gian hết hạn
    const [chatIdStr, expiresStr] = data.split(':');
    const expires = parseInt(expiresStr);
    if (expires < Math.floor(Date.now() / 1000)) return null;

    return parseInt(chatIdStr);
  } catch {
    return null;
  }
}

/**
 * Phụ trợ: Tính toán chữ ký HMAC-SHA256 (Native Web Crypto)
 */
async function computeSignature(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(data);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sigBuffer = await crypto.subtle.sign('HMAC', key, msgData);
  const sigArray = Array.from(new Uint8Array(sigBuffer));
  return sigArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
