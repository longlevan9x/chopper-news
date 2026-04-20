import { Context } from 'hono';
import { getAppSecret, setAppSecret } from '../services/secrets.js';
import { AppEnv } from '../config.js';
import { verifyMagicToken } from '../services/auth.js';

/**
 * Render CSS & HTML cho Dashboard Quản trị
 */
export function renderAdminDashboard(chatId: number, token?: string, error?: string, success?: string, values?: any) {
  const isSystemAdmin = chatId === 0;
  
  const providers = [
    { id: 'GROQ_API_KEY', label: 'Groq API Key', icon: '🚀' },
    { id: 'XAI_API_KEY', label: 'xAI (Grok) Key', icon: '🐦' },
    { id: 'GOOGLE_GENERATIVE_AI_API_KEY', label: 'Gemini Key', icon: '♊' },
    { id: 'CLOUDFLARE_API_TOKEN', label: 'CF API Token', icon: '☁️' },
    { id: 'CLOUDFLARE_ACCOUNT_ID', label: 'CF Account ID', icon: '🆔' },
  ];

  const html = `
  <!DOCTYPE html>
  <html lang="vi">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chopper Admin | Control Center</title>
    <style>
      :root {
        --primary: #6366f1;
        --bg: #0f172a;
        --card-bg: rgba(30, 41, 59, 0.7);
        --text: #f8fafc;
        --text-muted: #94a3b8;
        --border: #334155;
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { 
        font-family: 'Inter', system-ui, sans-serif; 
        background: radial-gradient(circle at top right, #1e1b4b, var(--bg));
        color: var(--text);
        min-height: 100vh;
        display: flex; justify-content: center; align-items: center; padding: 20px;
      }
      .container {
        width: 100%; max-width: 500px;
        background: var(--card-bg); backdrop-filter: blur(12px);
        border: 1px solid var(--border); border-radius: 24px;
        padding: 32px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      }
      h1 { font-size: 24px; margin-bottom: 4px; background: linear-gradient(to right, #818cf8, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
      .user-badge { display: inline-block; padding: 4px 12px; background: rgba(99, 102, 241, 0.2); border-radius: 100px; font-size: 11px; color: #818cf8; margin-bottom: 24px; border: 1px solid rgba(99, 102, 241, 0.3); }
      .alert { padding: 12px 16px; border-radius: 12px; margin-bottom: 20px; font-size: 13px; }
      .alert.error { background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #f87171; }
      .alert.success { background: rgba(34, 197, 94, 0.1); border: 1px solid #22c55e; color: #4ade80; }
      .form-group { margin-bottom: 16px; }
      label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px; }
      .input-wrapper { position: relative; }
      .input-wrapper span { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 14px; }
      input {
        width: 100%; background: rgba(15, 23, 42, 0.5); border: 1px solid var(--border);
        border-radius: 10px; padding: 10px 10px 10px 38px; color: var(--text); font-size: 14px;
      }
      input:focus { outline: none; border-color: var(--primary); }
      button {
        width: 100%; background: linear-gradient(135deg, var(--primary), #818cf8);
        color: white; border: none; border-radius: 10px; padding: 12px;
        font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 8px;
      }
      footer { margin-top: 32px; text-align: center; color: var(--text-muted); font-size: 11px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Chopper News Center</h1>
      <div class="user-badge">🔑 ${isSystemAdmin ? 'System Administrator' : `Personal Config (ID: ${chatId})`}</div>

      ${error ? `<div class="alert error">${error}</div>` : ''}
      ${success ? `<div class="alert success">${success}</div>` : ''}

      <form method="POST" action="/admin/save">
        <input type="hidden" name="token" value="${token || ''}">
        
        ${isSystemAdmin ? `
          <div class="form-group">
            <label>Admin Password</label>
            <div class="input-wrapper">
              <span>🔐</span>
              <input type="password" name="ADMIN_PASSWORD" placeholder="Nhập mật khẩu hệ thống..." required>
            </div>
          </div>
          <hr style="border: 0; border-top: 1px solid var(--border); margin: 24px 0;">
        ` : ''}

        ${providers.map(p => `
          <div class="form-group">
            <label>${p.label}</label>
            <div class="input-wrapper">
              <span>${p.icon}</span>
              <input type="text" name="${p.id}" value="${values?.[p.id] || ''}" placeholder="Dán key của bạn vào đây...">
            </div>
          </div>
        `).join('')}

        <button type="submit">Lưu Cấu Hình</button>
      </form>
      <footer>Chopper News Bot | Secure Magic Link</footer>
    </div>
  </body>
  </html>
  `;
  return html;
}

/**
 * Xử lý GET /admin
 */
export async function handleAdminPage(c: Context) {
  const env = c.env as AppEnv;
  const token = c.req.query('t');
  
  if (token) {
    const chatId = await verifyMagicToken(token, env);
    if (!chatId) return c.html(renderAdminDashboard(-1, undefined, 'Magic Link đã hết hạn hoặc không hợp lệ! Hãy gõ lệnh /admin trên Telegram để lấy link mới.'));
    
    // Lấy values hiện tại từ DB để pre-fill
    const values: any = {};
    const keys = ['GROQ_API_KEY', 'XAI_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY', 'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'];
    for (const k of keys) {
      values[k] = await getAppSecret(k, env, chatId);
    }
    
    return c.html(renderAdminDashboard(chatId, token, undefined, undefined, values));
  }

  // Nếu không có token, đây là trang Admin tổng (chatId = 0)
  return c.html(renderAdminDashboard(0));
}

/**
 * Xử lý POST /admin/save
 */
export async function handleAdminSave(c: Context) {
  const env = c.env as AppEnv;
  const body = await c.req.parseBody();
  const token = body['token'] as string;
  
  let chatId = 0;
  
  // 1. Xác thực nguồn truy cập
  if (token) {
    const verifiedId = await verifyMagicToken(token, env);
    if (!verifiedId) return c.html(renderAdminDashboard(-1, undefined, 'Xác thực thất bại!'));
    chatId = verifiedId;
  } else {
    // Admin tổng - check password
    const inputPass = body['ADMIN_PASSWORD'] as string;
    const rootPass = (env as any).ADMIN_PASSWORD || 'chopper123';
    if (inputPass !== rootPass) return c.html(renderAdminDashboard(0, undefined, 'Sai mật khẩu quản trị!'));
  }

  // 2. Lưu Keys
  const keysToSave = ['GROQ_API_KEY', 'XAI_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY', 'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'];
  try {
    for (const key of keysToSave) {
      const val = body[key] as string;
      if (val !== undefined) {
        await setAppSecret(key, val.trim(), env.DB, chatId);
      }
    }
    return c.html(renderAdminDashboard(chatId, token, undefined, '🎉 Đã cập nhật thành công! Bot sẽ ưu tiên sử dụng Key này của bạn.'));
  } catch (err: any) {
    return c.html(renderAdminDashboard(chatId, token, `Lỗi: ${err.message}`));
  }
}
