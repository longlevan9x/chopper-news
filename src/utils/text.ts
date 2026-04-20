/**
 * Text processing utilities for Telegram messages
 */

/**
 * Split a long message into chunks that fit within Telegram's 4096 char limit.
 * Splits on paragraph boundaries (double newline) first, then single newlines,
 * then at the last space before the limit.
 */
export function splitMessage(text: string, maxLength: number = 4000): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Try to find a good break point
    let splitIndex = -1;

    // 1. Try to split at paragraph boundary (double newline)
    const paragraphBreak = remaining.lastIndexOf('\n\n', maxLength);
    if (paragraphBreak > maxLength * 0.3) {
      splitIndex = paragraphBreak + 2; // Include the double newline in current chunk
    }

    // 2. Try single newline
    if (splitIndex === -1) {
      const lineBreak = remaining.lastIndexOf('\n', maxLength);
      if (lineBreak > maxLength * 0.3) {
        splitIndex = lineBreak + 1;
      }
    }

    // 3. Try space
    if (splitIndex === -1) {
      const spaceBreak = remaining.lastIndexOf(' ', maxLength);
      if (spaceBreak > maxLength * 0.3) {
        splitIndex = spaceBreak + 1;
      }
    }

    // 4. Hard cut as last resort
    if (splitIndex === -1) {
      splitIndex = maxLength;
    }

    chunks.push(remaining.substring(0, splitIndex).trimEnd());
    remaining = remaining.substring(splitIndex).trimStart();
  }

  return chunks;
}

/**
 * Truncate content before sending to AI model to avoid exceeding token limits.
 * Tries to cut at a paragraph boundary.
 */
export function truncateForAI(content: string, maxChars: number = 15_000): string {
  if (content.length <= maxChars) {
    return content;
  }

  // Try to find a paragraph break near the limit
  const breakPoint = content.lastIndexOf('\n\n', maxChars);
  const cutAt = breakPoint > maxChars * 0.7 ? breakPoint : maxChars;

  return content.substring(0, cutAt) + '\n\n[... Nội dung đã được cắt bớt ...]';
}

/**
 * Escape special HTML characters for Telegram HTML parse_mode.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Convert basic Markdown to Telegram-compatible HTML.
 * Handles: bold, italic, links, code blocks, inline code.
 */
export function markdownToTelegramHtml(md: string): string {
  let html = md;

  // Code blocks (``` ... ```) → <pre>...</pre>
  html = html.replace(/```[\w]*\n?([\s\S]*?)```/g, (_match, code) => {
    return `<pre>${escapeHtml(code.trim())}</pre>`;
  });

  // Inline code (` ... `) → <code>...</code>
  html = html.replace(/`([^`]+)`/g, (_match, code) => {
    return `<code>${escapeHtml(code)}</code>`;
  });

  // Bold (**text** or __text__) → <b>text</b>
  html = html.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  html = html.replace(/__(.+?)__/g, '<b>$1</b>');

  // Italic (*text* or _text_) → <i>text</i>
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<i>$1</i>');
  html = html.replace(/(?<!_)_([^_]+)_(?!_)/g, '<i>$1</i>');

  // Links [text](url) → <a href="url">text</a>
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Headings (# text) → <b>text</b> (Telegram doesn't support headings)
  html = html.replace(/^#{1,6}\s+(.+)$/gm, '<b>$1</b>');

  return html;
}
