import { Context } from 'hono';
import { getAppSecret, setAppSecret } from '../services/secrets.js';
import { AppEnv } from '../config.js';

/**
 * Render CSS & HTML cho Dashboard Quản trị
 */
export function renderAdminDashboard(error?: string, success?: string, values?: any) {
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
        --primary-hover: #4f46e5;
        --bg: #0f172a;
        --card-bg: rgba(30, 41, 59, 0.7);
        --text: #f8fafc;
        --text-muted: #94a3b8;
        --border: #334155;
      }

      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { 
        font-family: 'Inter', -apple-system, sans-serif; 
        background: radial-gradient(circle at top right, #1e1b4b, var(--bg));
        color: var(--text);
        min-height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px;
      }

      .container {
        width: 100%;
        max-width: 600px;
        background: var(--card-bg);
        backdrop-filter: blur(12px);
        border: 1px solid var(--border);
        border-radius: 24px;
        padding: 40px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      }

      h1 { font-size: 28px; margin-bottom: 8px; background: linear-gradient(to right, #818cf8, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
      p.subtitle { color: var(--text-muted); font-size: 14px; margin-bottom: 32px; }

      .alert { padding: 16px; border-radius: 12px; margin-bottom: 24px; font-size: 14px; }
      .alert.error { background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #f87171; }
      .alert.success { background: rgba(34, 197, 94, 0.1); border: 1px solid #22c55e; color: #4ade80; }

      .form-group { margin-bottom: 20px; }
      label { display: block; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 8px; }
      
      .input-wrapper { position: relative; }
      .input-wrapper span { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-size: 16px; }
      input {
        width: 100%;
        background: rgba(15, 23, 42, 0.5);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 12px 12px 12px 42px;
        color: var(--text);
        font-size: 14px;
        transition: all 0.2s;
      }
      input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); }

      hr { border: 0; border-top: 1px solid var(--border); margin: 32px 0; }

      button {
        width: 100%;
        background: linear-gradient(135deg, var(--primary), #818cf8);
        color: white;
        border: none;
        border-radius: 12px;
        padding: 14px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.1s, opacity 0.2s;
      }
      button:hover { opacity: 0.9; transform: translateY(-1px); }
      button:active { transform: translateY(0); }

      footer { margin-top: 40px; text-align: center; color: var(--text-muted); font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Chopper Control Center</h1>
      <p class="subtitle">Quản lý API Keys toàn hệ thống và đồng bộ AI Models</p>

      ${error ? `<div class="alert error">${error}</div>` : ''}
      ${success ? `<div class="alert success">${success}</div>` : ''}

      <form method="POST" action="/admin/save">
        <div class="form-group">
          <label>Admin Password (Required)</label>
          <div class="input-wrapper">
            <span>🔐</span>
            <input type="password" name="ADMIN_PASSWORD" placeholder="Nhập mật khẩu để xác thực..." required>
          </div>
        </div>

        <hr>

        ${providers.map(p => `
          <div class="form-group">
            <label>${p.label}</label>
            <div class="input-wrapper">
              <span>${p.icon}</span>
              <input type="text" name="${p.id}" value="${values?.[p.id] || ''}" placeholder="Dán key vào đây...">
            </div>
          </div>
        `).join('')}

        <button type="submit">Lưu Cấu Hình Mới</button>
      </form>

      <footer>
        &copy; 2026 Chopper News Bot | Powered by Hono & D1
      </footer>
    </div>
  </body>
  </html>
  `;
  return html;
}

/**
 * Xử lý POST để lưu Secrets
 */
export async function handleAdminSave(c: Context) {
  const env = c.env as AppEnv;
  const body = await c.req.parseBody();

  // 1. Kiểm tra Password
  const inputPass = body['ADMIN_PASSWORD'] as string;
  const rootPass = (env as any).ADMIN_PASSWORD || 'chopper123'; // Mặc định nếu chưa set

  if (inputPass !== rootPass) {
    return c.html(renderAdminDashboard('Sai mật khẩu quản trị!', undefined, body));
  }

  // 2. Lưu từng Key vào Database (Chỉ lưu nếu có input)
  const keysToSave = [
    'GROQ_API_KEY', 
    'XAI_API_KEY', 
    'GOOGLE_GENERATIVE_AI_API_KEY', 
    'CLOUDFLARE_API_TOKEN', 
    'CLOUDFLARE_ACCOUNT_ID'
  ];

  try {
    for (const key of keysToSave) {
      const val = body[key] as string;
      if (val && val.trim().length > 0) {
        await setAppSecret(key, val.trim(), env.DB);
      }
    }
    return c.html(renderAdminDashboard(undefined, '🎉 Đã cập nhật Keys vào Database thành công! Hệ thống sẽ ưu tiên sử dụng các khoá này từ bây giờ.', body));
  } catch (err: any) {
    return c.html(renderAdminDashboard(`Lỗi lưu dữ liệu: ${err.message}`, undefined, body));
  }
}
