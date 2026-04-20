/**
 * URL validation utilities
 */

/**
 * Check if a string is a valid HTTP/HTTPS URL.
 */
export function isValidUrl(text: string): boolean {
  try {
    const url = new URL(text.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Extract the first URL found in a text string.
 * Telegram sometimes wraps URLs in other text.
 */
export function extractUrl(text: string): string | null {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/i;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
}
