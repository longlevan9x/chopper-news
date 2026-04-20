/**
 * Jina Reader API service
 * Extracts clean article content from URLs as Markdown
 */

import { APP_CONFIG } from '../config.js';
import { truncateForAI } from '../utils/text.js';
import { logger } from '../utils/logger.js';

const JINA_READER_BASE = 'https://r.jina.ai';

/**
 * Fetch and extract clean article content from a URL using Jina Reader.
 * Returns the content as Markdown text.
 */
export async function fetchContent(url: string, apiKey?: string): Promise<string> {
  logger.info(`Fetching content from: ${url}`);

  const headers: Record<string, string> = {
    Accept: 'text/markdown',
  };

  // Add API key if available (increases rate limit)
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(`${JINA_READER_BASE}/${url}`, {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(15_000), // 15s timeout
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    logger.error(`Jina Reader failed with status ${response.status}`, errorText);
    throw new Error(`Không thể đọc nội dung trang web (HTTP ${response.status})`);
  }

  const content = await response.text();

  if (!content || content.trim().length < 50) {
    throw new Error('Trang web không có đủ nội dung để tóm tắt');
  }

  logger.info(`Content fetched successfully: ${content.length} chars`);

  // Truncate if too long for AI model
  return truncateForAI(content, APP_CONFIG.maxContentLength);
}
