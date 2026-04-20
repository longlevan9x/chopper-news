import { truncateForAI } from '../utils/text.js';
import { logger } from '../utils/logger.js';
import { fetchContent as fetchJina } from './jina.js';

export interface ExtractResult {
  title: string | null;
  text: string;
  original_length: number;
}

/**
 * Lớp 1: Trích xuất siêu nhẹ qua Cloudflare HTMLRewriter (0 cost, native edge)
 */
async function extractWithHTMLRewriter(url: string): Promise<ExtractResult> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP Error Status: ${response.status}`);
  }

  let title = '';
  let articleContent = '';
  
  const rewriter = new HTMLRewriter()
    .on('title', {
      text(text) {
        title += text.text;
      }
    })
    .on('article p, main p, div.content p, div.post p', {
      text(text) {
        articleContent += text.text + ' ';
      }
    });

  // Hứng và xử lý theo luồng Stream ngay lập tức
  await rewriter.transform(response).arrayBuffer();
  
  title = title.replace(/\s+/g, ' ').trim();
  articleContent = articleContent.replace(/\s+/g, ' ').trim();

  // Validate chất lượng
  if (articleContent.length < 150) {
    throw new Error('Nội dung thu được quá thô hoặc lấy nhầm layout trang.');
  }

  return {
    title: title || null,
    text: articleContent,
    original_length: articleContent.length
  };
}

/**
 * Lớp 2: Trích xuất dứt điểm bằng 3rd Party (Jina Reader API)
 */
async function extractWithJinaFallback(url: string): Promise<ExtractResult> {
  const rawMarkdown = await fetchJina(url);
  
  // Tự động phân tách tiêu đề từ phần tử h1 của thẻ Markdown
  const lines = rawMarkdown.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const title = lines.length > 0 ? lines[0].replace(/^#+\s*/, '') : null;

  return {
    title,
    text: rawMarkdown,
    original_length: rawMarkdown.length
  };
}

/**
 * Đầu não điều phối: Thống nhất Lớp 1 & Lớp 2.
 */
export async function fetchContent(url: string): Promise<ExtractResult> {
  logger.info(`Đang trích xuất nội dung từ: ${url}`);

  try {
    // Ưu tiên sài hàng nhà làm (0 Đồng, Tốc độ C++)
    const result = await extractWithHTMLRewriter(url);
    logger.info(`[Lớp 1] HTMLRewriter: Trích xuất thành thạo ${result.original_length} kí tự`);
    
    // Luôn Trim bớt trước khi ăn mòn tiền xài LLM API
    result.text = truncateForAI(result.text, 15_000);
    return result;
  } catch (err1) {
    const errorMsg = err1 instanceof Error ? err1.message : String(err1);
    logger.warn(`[Lớp 1] Bị tịt (${errorMsg}). Tự động Fallback sang Lớp 2 Jina...`);
    
    try {
      // Khi lớp 1 sập (Thường do Single Page App hoặc web block Bot), ta móc Jina vào nhổ
      const result = await extractWithJinaFallback(url);
      logger.info(`[Lớp 2] Jina Reader: Thu về ${result.original_length} kí tự (Title: ${result.title})`);
      
      result.text = truncateForAI(result.text, 15_000);
      return result;
    } catch (err2) {
      const errorMsg2 = err2 instanceof Error ? err2.message : String(err2);
      logger.error(`[Lớp 2] Jina Reader cũng đổ gục: ${errorMsg2}`);
      throw new Error('Rất tiếc. Cả Hệ thống và AI đều không tiếp cận được nội dung web này!');
    }
  }
}
