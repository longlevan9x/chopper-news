/**
 * AI Summarization wrapper với khả năng Fallback
 */

import { generateText } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { createXai } from '@ai-sdk/xai';
import { createWorkersAI } from 'workers-ai-provider';
import { APP_CONFIG, AppEnv, SupportedProviders } from '../config.js';
import { logger } from '../utils/logger.js';
import { getAppSecret } from './secrets.js';

const SYSTEM_PROMPT = `Bạn là một trợ lý tóm tắt tin tức chuyên nghiệp và chuyên sâu. Nhiệm vụ của bạn là đọc nội dung bài viết và tóm tắt thành một bản tin chi tiết, đầy đủ thông tin nhưng vẫn dễ hiểu.

LUÔN TRẢ VỀ KẾT QUẢ BẰNG TIẾNG VIỆT, bất kể ngôn ngữ của bài viết gốc là gì.

Quy tắc định dạng (rất quan trọng — output sẽ được gửi qua Telegram với HTML parse_mode):
- Khởi đầu bằng dòng chứa tiêu đề bao quát nội dung bài viết, in đậm: <b>[TIÊU ĐỀ TÓM TẮT CHI TIẾT]</b>
- Dòng trống
- Tóm tắt từ 5-8 ý chính quan trọng nhất. Mỗi ý bắt đầu bằng ký tự "• ".
- Với mỗi ý chính, hãy cung cấp thông tin chi tiết, số liệu (nếu có) và phân tích các khía cạnh liên quan thay vì chỉ viết 1 câu ngắn gọn. Mỗi đoạn nên có độ dài vừa đủ để người đọc nắm bắt được bản chất vấn đề.
- Tuyệt đối KHÔNG ĐƯA THÊM tiêu đề báo vào đầu. Cuối cùng KHÔNG cần dòng "Đọc bài gốc".
- KHÔNG dùng Markdown (**, __, ##, etc.) — chỉ dùng HTML tags. Chỉ dùng các thẻ được phép: <b>, <i>, <code>, <pre>, <a>`;

export async function summarizeWithFallback(
  env: AppEnv,
  preferredProvider: SupportedProviders,
  content: string,
  sourceUrl: string,
  chatId: number = 0
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
    logger.info(`[AI] Attempting summarization with ${provider} (User: ${chatId})...`);
    try {
      let resultText = '';

      if (provider === 'groq') {
        const apiKey = await getAppSecret('GROQ_API_KEY', env, chatId);
        if (!apiKey) throw new Error('Groq API Key is missing');
        
        const groq = createGroq({ apiKey });
        const { text } = await generateText({
          model: groq(APP_CONFIG.groqModel),
          system: SYSTEM_PROMPT,
          prompt,
          maxOutputTokens: 10000,
        });
        resultText = text;

      } else if (provider === 'xai') {
        const apiKey = await getAppSecret('XAI_API_KEY', env, chatId);
        if (!apiKey) throw new Error('xAI API Key is missing');

        const grok = createXai({ apiKey });
        const { text } = await generateText({
          model: grok(APP_CONFIG.xaiModel),
          system: SYSTEM_PROMPT,
          prompt,
          maxOutputTokens: 10000,
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
          maxOutputTokens: 10000,
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
