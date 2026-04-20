/**
 * AI Summarization wrapper với khả năng Fallback
 */

import { generateText } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { createXai } from '@ai-sdk/xai';
import { createWorkersAI } from 'workers-ai-provider';
import { APP_CONFIG, AppEnv, SupportedProviders } from '../config.js';
import { logger } from '../utils/logger.js';

const SYSTEM_PROMPT = `Bạn là một trợ lý tóm tắt tin tức chuyên nghiệp. Nhiệm vụ của bạn là đọc nội dung bài viết và tóm tắt thành bản tin ngắn gọn, dễ hiểu bằng tiếng Việt.

Quy tắc định dạng (rất quan trọng — output sẽ được gửi qua Telegram với HTML parse_mode):
- Khởi đầu bằng dòng chứa tiêu đề cực ngắn phản ánh chủ đề chính của bản tóm tắt, in đậm: <b>[Tiêu đề ngắn]</b>
- Dòng trống
- Tóm tắt 3-5 ý chính, mỗi ý bắt đầu bằng ký tự "• "
- Mỗi ý chính nên ngắn gọn, tối đa 2-3 câu
- Tuyệt đối KHÔNG ĐƯA THÊM tiêu đề báo vào đầu (trừ cái "tiêu đề ngắn" bên trên mình nói) nữa. Cuối cùng KHÔNG cần dòng Đọc bài gốc.
- KHÔNG dùng Markdown (**, __, ##, etc.) — chỉ dùng HTML tags. Chỉ dùng các thẻ được phép: <b>, <i>, <code>, <pre>, <a>`;

export async function summarizeWithFallback(
  env: AppEnv,
  preferredProvider: SupportedProviders,
  content: string,
  sourceUrl: string
): Promise<{ text: string; providerUsed: SupportedProviders }> {
  // Sắp xếp thứ tự gọi (Preferred luôn đứng đầu)
  const allProviders: SupportedProviders[] = ['groq', 'xai', 'cloudflare'];
  const queue = [
    preferredProvider,
    ...allProviders.filter((p) => p !== preferredProvider)
  ];

  logger.info(`Fallback queue: ${queue.join(' -> ')}`);
  const prompt = `Nội dung bài viết từ ${sourceUrl}:\n\n${content}`;
  let lastError: Error | null = null;

  for (const provider of queue) {
    logger.info(`[AI] Attempting summarization with ${provider}...`);
    try {
      let resultText = '';

      if (provider === 'groq') {
        const groq = createGroq({ apiKey: env.GROQ_API_KEY });
        const { text } = await generateText({
          model: groq(APP_CONFIG.groqModel),
          system: SYSTEM_PROMPT,
          prompt,
        });
        resultText = text;

      } else if (provider === 'xai') {
        const grok = createXai({ apiKey: env.XAI_API_KEY });
        const { text } = await generateText({
          model: grok(APP_CONFIG.xaiModel),
          system: SYSTEM_PROMPT,
          prompt,
        });
        resultText = text;

      } else if (provider === 'cloudflare') {
        // Cloudflare Workers AI sử dụng binding
        if (!env.AI) {
          throw new Error('Cloudflare AI Binding is missing');
        }
        const workersai = createWorkersAI({ binding: env.AI });
        const { text } = await generateText({
          model: workersai(APP_CONFIG.cfModel),
          system: SYSTEM_PROMPT,
          prompt,
        });
        resultText = text;
      }

      logger.info(`[AI] Successfully summarized with ${provider}`);
      return { text: resultText, providerUsed: provider };

    } catch (err: any) {
      logger.warn(`[AI] Provider ${provider} failed: ${err.message}`);
      lastError = err;
      // Dù lỗi rate limit hay expired token, nó cũng sẽ catch và tiếp tục loop vòng sang provider tiếp theo
    }
  }

  // Nếu rơi xuống đây nghĩa là TẤT CẢ các provider đều lỗi
  logger.error('[AI] All providers failed.');
  throw new Error(`Tổng hợp thất bại (Đã thử mọi AI dự phòng). Lỗi cuối cùng: ${lastError?.message}`);
}
