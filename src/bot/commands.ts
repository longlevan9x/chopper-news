/**
 * Bot command handlers for Telegraf
 */

import { Context, Markup } from 'telegraf';
import { replyWithChunks } from '../services/telegram.js';
import { AppEnv } from '../config.js';
import { getRecentSummaries, getPreferredProvider } from '../db/repository.js';
import { escapeHtml } from '../utils/text.js';

const WELCOME_MESSAGE = `🗞 <b>Chào mừng đến với Chopper News Bot!</b>

Tôi là bot tóm tắt tin tức thông minh. Chỉ cần gửi cho tôi link bài viết, tôi sẽ đọc và tóm tắt thành 3-5 ý chính bằng tiếng Việt.

<b>Lệnh:</b>
/start - Hiển thị lời chào
/history - Xem lịch sử 10 bài tóm tắt gần nhất
/provider - ⚙️ Chọn lựa AI Model sử dụng
/help - Hướng dẫn sử dụng`;

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
