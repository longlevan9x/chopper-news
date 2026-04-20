/**
 * Telegram utilities using Telegraf Context
 */

import { Context } from 'telegraf';
import { APP_CONFIG } from '../config.js';
import { splitMessage } from '../utils/text.js';
import { logger } from '../utils/logger.js';

/**
 * Gửi tin nhắn dài có tự động chia nhỏ (chunk) an toàn.
 * Sử dụng Context của Telegraf thay vì gọi fetch request thủ công.
 */
export async function replyWithChunks(
  ctx: Context,
  text: string,
  parseMode: 'HTML' | 'MarkdownV2' = 'HTML'
): Promise<void> {
  const chunks = splitMessage(text, APP_CONFIG.maxTelegramMessageLength);

  for (let i = 0; i < chunks.length; i++) {
    try {
      await ctx.reply(chunks[i], {
        parse_mode: parseMode,
        link_preview_options: { is_disabled: true } // format mới của link preview trong lib telegram
      });
    } catch (err: any) {
      logger.error(`Telegram sendMessage failed (chunk ${i + 1}/${chunks.length})`, err.message);

      // Nếu lỗi do HTML parse sai, thử lại dưới dạng Text thuần (bỏ parseMode)
      if (parseMode === 'HTML' && err.message?.includes('parse')) {
        logger.warn('Retrying chunk without parse_mode...');
        await ctx.reply(chunks[i], {
          link_preview_options: { is_disabled: true }
        });
      }
    }

    // Delay nhỏ giữa các tin text quá dài để tránh rate limit
    if (i < chunks.length - 1) {
      await new Promise(res => setTimeout(res, 100));
    }
  }
}

/**
 * Báo trạng thái gõ phím
 */
export async function sendTypingAction(ctx: Context): Promise<void> {
  try {
    await ctx.sendChatAction('typing');
  } catch (err) {
    logger.warn('Không thể gửi trạng thái action typing', err);
  }
}
