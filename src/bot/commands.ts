/**
 * Bot command handlers for Telegraf
 */

import { Context, Markup } from 'telegraf';
import { replyWithChunks } from '../services/telegram.js';
import { APP_CONFIG, AppEnv } from '../config.js';
import { getRecentSummaries, getPreferredProvider, getUserStats } from '../db/repository.js';
import { escapeHtml } from '../utils/text.js';
import { getDiscoveryModels } from '../services/models.js';
import { generateMagicToken } from '../services/auth.js';

const WELCOME_MESSAGE = `🤖 <b>CHÀO MỪNG BẠN ĐẾN VỚI CHOPPER NEWS BOT!</b>

Tôi là Trợ lý AI Đọc Báo Tốc Độ Cao. Tôi sẽ giúp bạn "thổi bay" mọi bài báo dài lê thê và nắm bắt thông tin chỉ trong nháy mắt.

✨ <b>CÁCH SỬ DỤNG CỰC KỲ ĐƠN GIẢN:</b>
Bạn chỉ cần <b>Copy 1 đường Link (URL)</b> bài viết dán thẳng vào ô chat này. Tôi sẽ tự động đi vào trang web, đọc và tóm gọn lại thành 3-5 ý chính cho bạn!

💡 <b>DANH SÁCH LỆNH HỖ TRỢ:</b>
🔹 /models - 🔍 Xem danh sách AI đang online
🔹 /status - 📊 Kiểm tra tình trạng Bot & Thống kê cá nhân
🔹 /admin - 🔑 Cài đặt AI cá nhân (Magic Link)
🔹 /provider - Mở bảng chọn "Trí tuệ nhân tạo" (Đổi AI)
🔹 /history - Xem lại 10 lịch sử bài tóm tắt gần nhất
🔹 /help - Trợ giúp hệ thống
🔹 /start - Mở lại bảng chào mừng này

<i>Hãy gửi ngay một đường link bài báo bất kỳ (như: vnexpress, tuoitre, medium...) xuống ô chat bên dưới để trải nghiệm nhé! 👇</i>`;

const HELP_MESSAGE = `📖 <b>Hướng dẫn sử dụng Chopper News Bot</b>

<b>1. Tóm tắt bài viết:</b>
Gửi link bài viết bất kỳ, bot tự động tóm tắt.

<b>2. Các lệnh hỗ trợ:</b>
/history - Xem 10 lịch sử gần nhất.
/provider - Đổi AI xử lý (Có hỗ trợ Fallback: Nếu AI chính lỗi, bot tự dùng AI dự phòng).

💡 <i>Mẹo: Gửi link trực tiếp không cần thêm chữ!</i>`;

// ... existing code logic for start/help/history ...
export async function handleStartCommand(ctx: Context): Promise<void> {
  await replyWithChunks(ctx, WELCOME_MESSAGE);
}

export async function handleHelpCommand(ctx: Context): Promise<void> {
  await replyWithChunks(ctx, HELP_MESSAGE);
}

export async function handleHistoryCommand(ctx: Context, env: AppEnv): Promise<void> {
  try {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const historicals = await getRecentSummaries(env.DB, chatId, 10);
    if (historicals.length === 0) {
      await replyWithChunks(ctx, 'Hệ thống chưa ghi nhận lịch sử tóm tắt nào của bạn.');
      return;
    }

    let msg = `🕒 <b>Lịch sử tóm tắt (10 bài gần nhất)</b>\n\n`;
    historicals.forEach((log, index) => {
      const statusIcon = log.status === 'success' ? '✅' : '❌';
      const safeTitle = escapeHtml(log.title || 'Không rõ tiêu đề');
      msg += `${index + 1}. ${statusIcon} <a href="${log.url}">${safeTitle}</a>\n`;
    });

    await replyWithChunks(ctx, msg);
  } catch (error: any) {
    await replyWithChunks(ctx, `Lỗi truy xuất lịch sử: ${error.message}`);
  }
}

/**
 * Hiển thị Menu chọn AI Provider
 */
export async function handleProviderCommand(ctx: Context, env: AppEnv): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  // Xem User đang dùng provider nào
  const currentProvider = await getPreferredProvider(env.DB, chatId);

  const kb = Markup.inlineKeyboard([
    [Markup.button.callback(`${currentProvider === 'groq' ? '✅ ' : ''}🚀 Groq (Llama 3 70B)`, 'set_provider_groq')],
    [Markup.button.callback(`${currentProvider === 'xai' ? '✅ ' : ''}🐦 xAI (Grok-Beta)`, 'set_provider_xai')],
    [Markup.button.callback(`${currentProvider === 'cloudflare' ? '✅ ' : ''}☁️ CF AI (Llama 3 8B)`, 'set_provider_cloudflare')]
  ]);

  await ctx.reply('🤖 <b>Chọn AI làm Trợ lý tóm tắt chính thức của bạn:</b>\n<i>(Bot tích hợp tính năng Fallback: Nếu AI này hết lượt/lỗi, 2 AI còn lại sẽ tự động gánh team)</i>', {
    parse_mode: 'HTML',
    ...kb
  });
}

/**
 * Hiển thị danh sách Models lấy từ API (Dynamic)
 */
export async function handleModelsCommand(ctx: Context, env: AppEnv): Promise<void> {
  await ctx.reply('🔍 Đang kiểm tra danh sách AI đang online...');
  
  try {
    const models = await getDiscoveryModels(env);
    
    let msg = `📟 <b>DANH SÁCH AI ĐỘNG (REAL-TIME)</b>\n\n`;
    
    msg += `🚀 <b>Groq Cloud:</b>\n`;
    models.groq.slice(0, 5).forEach(m => msg += `• <code>${m.id}</code>\n`);
    
    msg += `\n🐦 <b>xAI (Grok):</b>\n`;
    models.xai.forEach(m => msg += `• <code>${m.id}</code>\n`);
    
    msg += `\n☁️ <b>Cloudflare AI:</b>\n`;
    models.cloudflare.slice(0, 5).forEach(m => msg += `• <code>${m.id}</code>\n`);

    msg += `\n♊ <b>Gemini (Fallback):</b>\n`;
    models.google.forEach(m => msg += `• <code>${m.id}</code>\n`);

    msg += `\n<i>Gợi ý: Nếu danh sách trên hiển thị ít model, hệ thống đang chạy ở chế độ Fallback Local để đảm bảo ổn định.</i>`;
    
    await replyWithChunks(ctx, msg);
  } catch (error: any) {
    await replyWithChunks(ctx, `❌ Lỗi lấy danh sách model: ${error.message}`);
  }
}

/**
 * Tạo link Quản trị cá nhân (Magic Link)
 */
export async function handleAdminCommand(ctx: Context, env: AppEnv, baseUrl?: string): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  await ctx.reply('🔑 Đăng khởi tạo đường dẫn quản trị an toàn cho bạn...');

  try {
    const token = await generateMagicToken(chatId, env);
    
    // Sử dụng baseUrl truyền từ worker hoặc mặc định (nếu có)
    const host = baseUrl || 'https://chopper-news.workers.dev';
    const adminUrl = `${host}/admin?t=${token}`;

    const message = `
🌟 <b>TRANG QUẢN TRỊ CÁ NHÂN</b>

Đây là đường dẫn bí mật để bạn cấu hình API Keys riêng. Khi dùng Key cá nhân, bạn sẽ không bao giờ lo bị giới hạn bởi hệ thống chung!

🔗 <b>Link cài đặt:</b>
<a href="${adminUrl}">Mở Trang Cấu Hình AI</a>

⚠️ <b>Lưu ý bảo mật:</b>
- Đường dẫn này chỉ có hiệu lực trong <b>10 phút</b>.
- Không gửi link này cho bất kỳ ai khác.
- Sau khi cài Key, hãy thử lệnh /models để kiểm tra.
    `;

    await ctx.reply(message, { 
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true }
    });
  } catch (error: any) {
    await ctx.reply(`❌ Lỗi khởi tạo link: ${error.message}`);
  }
}

/**
 * Hiển thị tình trạng hệ thống và thống kê cá nhân
 */
export async function handleStatusCommand(ctx: Context, env: AppEnv): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  try {
    const stats = await getUserStats(env.DB, chatId);
    const provider = await getPreferredProvider(env.DB, chatId);
    
    // Tình trạng API (Gọi discovery nhẹ để check)
    const models = await getDiscoveryModels(env, chatId);
    const onlineProviders = [];
    if (models.groq.length > 0) onlineProviders.push('🚀 Groq');
    if (models.xai.length > 0) onlineProviders.push('🐦 xAI');
    if (models.cloudflare.length > 0) onlineProviders.push('☁️ CF');
    if (models.google.length > 0) onlineProviders.push('♊ Gemini');

    // Xác định ID model đang dùng
    let currentModelId = '';
    if (provider === 'groq') currentModelId = APP_CONFIG.groqModel;
    else if (provider === 'xai') currentModelId = APP_CONFIG.xaiModel;
    else if (provider === 'cloudflare') currentModelId = APP_CONFIG.cfModel;

    const message = `
📊 <b>BÁO CÁO TÌNH TRẠNG BOT</b>

👤 <b>Người dùng:</b> <code>${ctx.from?.first_name || 'Khách'}</code>
🆔 <b>Chat ID:</b> <code>${chatId}</code>

📈 <b>THỐNG KÊ TRA CỨU:</b>
• Hôm nay: <b>${stats.today}</b> bài tóm tắt
• Bạn đã tóm tắt: <b>${stats.userTotal}</b> bài bài viết
• Toàn hệ thống: <b>${stats.globalTotal}</b> bài bài viết

⚙️ <b>CẤU HÌNH AI:</b>
• Trợ lý: <b>${provider.toUpperCase()}</b>
• Model ID: <code>${currentModelId}</code>
• API Key cá nhân: ${stats.hasPersonalKeys ? '✅ <b>Đã cấu hình</b> (Ẩn vì bảo mật)' : '❌ <b>Chưa cấu hình</b>'}

🛰️ <b>HỆ THỐNG ĐANG ONLINE:</b>
${onlineProviders.length > 0 ? onlineProviders.join(', ') : '⚠️ <i>Đang sử dụng Gemini Fallback</i>'}

🟢 <b>Trạng thái:</b> Hoạt động ổn định trên Cloudflare Edge.

<i>Gợi ý: Dùng lệnh /admin để cài Key riêng nếu muốn tốc độ nhanh hơn.</i>
    `;

    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error: any) {
    await ctx.reply(`❌ Lỗi truy vấn trạng thái: ${error.message}`);
  }
}
