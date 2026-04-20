/**
 * Processor Service - Central logic for handling URLs
 */

import { Context, Markup } from 'telegraf';
import { AppEnv } from '../config.js';
import { 
  saveSummaryLog, 
  getPreferredProvider, 
  getExistingSummary 
} from '../db/repository.js';
import { replyWithChunks, sendTypingAction } from './telegram.js';
import { fetchContent } from './extractor.js';
import { summarizeWithFallback } from './ai.js';
import { logger } from '../utils/logger.js';
import { isValidUrl } from '../utils/url.js';

function getDomain(urlStr: string): string | null {
  try {
    const u = new URL(urlStr);
    return u.hostname;
  } catch {
    return null;
  }
}

/**
 * Quy trình xử lý bài viết: Check cache -> Extract -> AI -> Save
 * @param force Nếu true, bỏ qua cache và tóm tắt lại từ đầu
 */
export async function processUrl(ctx: Context, env: AppEnv, url: string, force: boolean = false): Promise<void> {
  const chatId = ctx.chat?.id;
  const userName = ctx.from?.first_name || 'User';
  
  if (!chatId) return;

  if (!isValidUrl(url)) {
    await replyWithChunks(ctx, '❌ URL không hợp lệ. Vui lòng gửi link bắt đầu bằng <code>http://</code> hoặc <code>https://</code>');
    return;
  }

  // 1. Kiểm tra Cache (Nếu không ép buộc refresh)
  if (!force) {
    const existing = await getExistingSummary(env.DB, chatId, url);
    if (existing && existing.summary) {
      logger.info(`[Cache] Found existing summary for ${url}`);
      
      const cacheMessage = `${existing.summary}\n\n⚡ <b>Kết quả từ bộ nhớ đệm</b> | 🔗 <a href="${url}">[Gốc]</a>`;
      
      const kb = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Tóm tắt lại (Refresh)', `recheck_${existing.id}`)]
      ]);

      await replyWithChunks(ctx, cacheMessage, 'HTML', { ...kb });
      return;
    }
  }

  // 2. Tiến hành tóm tắt mới
  await sendTypingAction(ctx);
  const statusMsg = force ? '🔄 Đang tóm tắt lại bài viết...' : '⏳ Đang phân tích bài viết...';
  await ctx.reply(statusMsg, { link_preview_options: { is_disabled: true } });

  const logData = {
    chat_id: chatId,
    user_name: userName,
    url: url,
    domain: getDomain(url),
    title: null as string | null,
    status: 'success' as 'success' | 'error',
    error_message: null as string | null,
    original_length: null as number | null,
    content_snippet: null as string | null,
    summary: null as string | null,
  };

  try {
    logger.info(`Step 1: Extractor for ${url}`);
    const article = await fetchContent(url);
    
    logData.title = article.title;
    logData.original_length = article.original_length;
    logData.content_snippet = article.text.substring(0, 300);

    await sendTypingAction(ctx);

    const preferredProvider = await getPreferredProvider(env.DB, chatId);

    logger.info(`Step 2: Summarizing (Preferred: ${preferredProvider})`);
    const { text: aiSummary, providerUsed } = await summarizeWithFallback(env, preferredProvider, article.text, url, chatId);
    logData.summary = aiSummary;

    logger.info(`Step 3: Sending final summary (by ${providerUsed})`);
    let providerBadge = '🚀';
    if (providerUsed === 'xai') providerBadge = '🐦';
    if (providerUsed === 'cloudflare') providerBadge = '☁️';

    const finalMessage = `${aiSummary}\n\n${providerBadge} <i>Tóm tắt bởi ${providerUsed}</i> | 🔗 <a href="${url}">[Gốc]</a>`;
    await replyWithChunks(ctx, finalMessage);

    await saveSummaryLog(env.DB, logData);
    logger.info('✅ Processing done & logged.');

  } catch (error: any) {
    logger.error('Failed to process URL', error.message);
    logData.status = 'error';
    logData.error_message = error.message;
    await saveSummaryLog(env.DB, logData);
    await replyWithChunks(ctx, `❌ ${error.message}`);
  }
}
