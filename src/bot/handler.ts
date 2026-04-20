import { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';

import { 
  handleStartCommand, 
  handleHelpCommand, 
  handleHistoryCommand,
  handleProviderCommand,
  handleModelsCommand,
  handleAdminCommand,
  handleStatusCommand,
  handleReccheckCommand
} from './commands.js';
import { isValidUrl, extractUrl } from '../utils/url.js';
import { replyWithChunks } from '../services/telegram.js';
import { AppEnv } from '../config.js';
import { 
  getSummaryById,
  setPreferredProvider
} from '../db/repository.js';
import { Markup } from 'telegraf';
import { processUrl } from '../services/processor.js';
import { logger } from '../utils/logger.js';

/**
 * Configure Telegraf middleware/commands logic
 */
function setupBot(bot: Telegraf, env: AppEnv, baseUrl?: string) {
  bot.start(async (ctx) => await handleStartCommand(ctx));
  bot.help(async (ctx) => await handleHelpCommand(ctx));
  bot.command('history', async (ctx) => await handleHistoryCommand(ctx, env));
  bot.command('provider', async (ctx) => await handleProviderCommand(ctx, env));
  bot.command('models', async (ctx) => await handleModelsCommand(ctx, env));
  bot.command('admin', async (ctx) => await handleAdminCommand(ctx, env, baseUrl));
  bot.command('status', async (ctx) => await handleStatusCommand(ctx, env));
  bot.command('reccheck', async (ctx) => await handleReccheckCommand(ctx, env));

  // Handler khi nhấn nút Refresh/Re-check
  bot.action(/recheck_(\d+)/, async (ctx) => {
    const summaryId = parseInt(ctx.match[1]);
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    // Trình trạng xử lý
    await ctx.answerCbQuery('🔄 Đang tóm tắt lại...');
    
    // Tìm URL tương ứng với ID
    const summary = await getSummaryById(env.DB, summaryId);
    if (!summary || !summary.url) {
      await ctx.reply('❌ Không tìm thấy bài viết gốc để tóm tắt lại.');
      return;
    }

    // Gọi lại processUrl với cờ force = true
    await processUrl(ctx, env, summary.url, true);
  });

  // Handler khi click chọn AI Provider trên menu
  bot.action(/set_provider_(groq|xai|cloudflare)/, async (ctx) => {
    const provider = ctx.match[1] as 'groq' | 'xai' | 'cloudflare';
    const chatId = ctx.chat?.id;
    
    if (chatId) {
      await setPreferredProvider(env.DB, chatId, provider);
      
      const label = provider === 'groq' ? '🚀 Groq' : provider === 'xai' ? '🐦 xAI' : '☁️ Cloudflare AI';
      await ctx.answerCbQuery(`Đã thiết lập ${label} làm mặc định!`);
      await ctx.editMessageText(`✅ Bạn đã chọn <b>${label}</b> làm trợ lý chính.\n<i>Hãy gửi link để trải nghiệm.</i>`, {
        parse_mode: 'HTML'
      });
    }
  });

  bot.on(message('text'), async (ctx) => {
    const text = ctx.message.text;
    const entities = ctx.message.entities || [];
    
    let targetUrl: string | null = null;
    
    for(const e of entities) {
      if (e.type === 'url') {
        targetUrl = text.substring(e.offset, e.offset + e.length);
        break;
      }
      if (e.type === 'text_link' && e.url) {
        targetUrl = e.url;
        break;
      }
    }

    if (!targetUrl) {
      targetUrl = extractUrl(text);
    }

    if (targetUrl) {
      await processUrl(ctx, env, targetUrl);
    } else {
      await replyWithChunks(
        ctx, 
        '🔗 Hãy gửi link bài viết.\nVí dụ: https://vnexpress.net/abc.html\nGửi /help để hướng dẫn.'
      );
    }
  });

  bot.catch((err, ctx) => {
    logger.error(`Error for ${ctx.updateType}`, err);
  });
}

/**
 * Webhook Entrypoint được gọi ở Hono Route
 */
export async function handleWebhook(body: any, env: AppEnv, baseUrl?: string): Promise<void> {
  const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);
  setupBot(bot, env, baseUrl);
  await bot.handleUpdate(body);
}
