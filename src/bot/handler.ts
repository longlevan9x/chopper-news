/**
 * Main webhook handler using Telegraf
 */

import { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';

import { 
  handleStartCommand, 
  handleHelpCommand, 
  handleHistoryCommand,
  handleProviderCommand,
  handleModelsCommand
} from './commands.js';
import { isValidUrl, extractUrl } from '../utils/url.js';
import { replyWithChunks, sendTypingAction } from '../services/telegram.js';
import { fetchContent } from '../services/extractor.js';
import { summarizeWithFallback } from '../services/ai.js';
import { logger } from '../utils/logger.js';
import { AppEnv } from '../config.js';
import { saveSummaryLog, getPreferredProvider, setPreferredProvider } from '../db/repository.js';

function getDomain(urlStr: string): string | null {
  try {
    const u = new URL(urlStr);
    return u.hostname;
  } catch {
    return null;
  }
}

async function processUrl(ctx: Context, env: AppEnv, url: string): Promise<void> {
  const chatId = ctx.chat?.id;
  const userName = ctx.from?.first_name || 'User';
  
  if (!chatId) return;

  if (!isValidUrl(url)) {
    await replyWithChunks(ctx, '❌ URL không hợp lệ. Vui lòng gửi link bắt đầu bằng <code>http://</code> hoặc <code>https://</code>');
    return;
  }

  await sendTypingAction(ctx);
  await ctx.reply('⏳ Đang phân tích bài viết...', { link_preview_options: { is_disabled: true } });

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

    // Truy xuất AI preference của User
    const preferredProvider = await getPreferredProvider(env.DB, chatId);

    logger.info(`Step 2: Summarizing with Fallback system (Preferred: ${preferredProvider})`);
    
    // Đẩy qua hàm fallback vòng chờ thay vì gọi hardcode 1 hàm
    const { text: aiSummary, providerUsed } = await summarizeWithFallback(env, preferredProvider, article.text, url);
    logData.summary = aiSummary;

    logger.info(`Step 3: Sending final summary (Provided by ${providerUsed})`);
    // Gắn nhãn ai đã hỗ trợ tóm tắt
    let providerBadge = '🚀';
    if (providerUsed === 'xai') providerBadge = '🐦';
    if (providerUsed === 'cloudflare') providerBadge = '☁️';

    const finalMessage = `${aiSummary}\n\n${providerBadge} <i>Tóm tắt bởi ${providerUsed}</i> | 🔗 <a href="${url}">[Bài viết gốc]</a>`;
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

/**
 * Configure Telegraf middleware/commands logic
 */
function setupBot(bot: Telegraf, env: AppEnv) {
  bot.start(async (ctx) => await handleStartCommand(ctx));
  bot.help(async (ctx) => await handleHelpCommand(ctx));
  bot.command('history', async (ctx) => await handleHistoryCommand(ctx, env));
  bot.command('provider', async (ctx) => await handleProviderCommand(ctx, env));
  bot.command('models', async (ctx) => await handleModelsCommand(ctx, env));

  // Handler khi click chọn AI Provider trên menu
  bot.action(/set_provider_(groq|xai|cloudflare)/, async (ctx) => {
    const provider = ctx.match[1] as 'groq' | 'xai' | 'cloudflare';
    const chatId = ctx.chat?.id;
    
    if (chatId) {
      // Lưu tùy chọn vào D1 DB
      await setPreferredProvider(env.DB, chatId, provider);
      
      const label = provider === 'groq' ? '🚀 Groq' : provider === 'xai' ? '🐦 xAI' : '☁️ Cloudflare AI';
      
      // Update thông điệp / Popup
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
export async function handleWebhook(body: any, env: AppEnv): Promise<void> {
  const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);
  setupBot(bot, env);
  await bot.handleUpdate(body);
}
