import { extract } from '@extractus/article-extractor';
import { truncateForAI } from '../utils/text.js';
import { logger } from '../utils/logger.js';

export interface ExtractResult {
  title: string | null;
  text: string;
  original_length: number;
}

/**
 * Thử trích xuất bằng @extractus/article-extractor (Lớp 1)
 */
async function extractWithLibrary(url: string): Promise<ExtractResult> {
  const article = await extract(url);
  
  if (!article || !article.content || article.content.trim().length < 50) {
    throw new Error('Thư viện không tìm thấy đủ nội dung hợp lệ.');
  }

  // Strip HTML tags
  const textContent = article.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  
  return {
    title: article.title || null,
    text: textContent,
    original_length: textContent.length
  };
}

/**
 * Trích xuất dự phòng qua Cloudflare HTMLRewriter (Lớp 2)
 */
async function extractWithHTMLRewriter(url: string): Promise<ExtractResult> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP Error ${response.status}`);
  }

  let title = '';
  // Thu gom text từ thẻ p và article
  let articleContent = '';
  
  const rewriter = new HTMLRewriter()
    .on('title', {
      text(text) {
        title += text.text;
      }
    })
    // Nhắm mục tiêu rộng để cố gom text, nhưng ưu tiên các thẻ mang thông tin 
    .on('article p, main p, div.content p, div.post p', {
      text(text) {
        articleContent += text.text + ' ';
      }
    });

  // Chạy transform và consume body
  await rewriter.transform(response).arrayBuffer();
  
  title = title.replace(/\s+/g, ' ').trim();
  articleContent = articleContent.replace(/\s+/g, ' ').trim();

  if (articleContent.length < 100) {
    throw new Error('HTMLRewriter không tìm thấy text content hợp lệ.');
  }

  return {
    title: title || null,
    text: articleContent,
    original_length: articleContent.length
  };
}

/**
 * Fetch and extract article content from URL.
 * Ưu tiên dùng library, dự phòng bằng HTMLRewriter.
 */
export async function fetchContent(url: string): Promise<ExtractResult> {
  logger.info(`Extracting content from: ${url}`);

  try {
    const result = await extractWithLibrary(url);
    logger.info(`[Lớp 1] Library: Extracted ${result.original_length} chars`);
    
    // Truncate nội dung để gửi cho AI
    result.text = truncateForAI(result.text, 15_000);
    return result;
  } catch (err1) {
    const errorMsg = err1 instanceof Error ? err1.message : String(err1);
    logger.warn(`[Lớp 1] Thư viện extract lỗi: ${errorMsg}. Đang fallback sang HTMLRewriter...`);
    
    try {
      const result = await extractWithHTMLRewriter(url);
      logger.info(`[Lớp 2] HTMLRewriter: Extracted ${result.original_length} chars`);
      
      result.text = truncateForAI(result.text, 15_000);
      return result;
    } catch (err2) {
      const errorMsg2 = err2 instanceof Error ? err2.message : String(err2);
      logger.error(`[Lớp 2] HTMLRewriter lỗi: ${errorMsg2}`);
      throw new Error('Không thể đọc nội dung trang web bằng bất kỳ phương pháp nào.');
    }
  }
}
