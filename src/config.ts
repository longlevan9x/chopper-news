/**
 * Application configuration
 */

// Định nghĩa Env interface dùng chung cho toàn bộ App (Cloudflare Bindings)
export type AppEnv = {
  DB: D1Database;
  AI: any;
  TELEGRAM_BOT_TOKEN: string;
  GOOGLE_GENERATIVE_AI_API_KEY: string;
  GROQ_API_KEY: string;
  XAI_API_KEY: string;
  ADMIN_PASSWORD?: string;
};

// Config chung
export const APP_CONFIG = {
  maxContentLength: 15_000,
  maxTelegramMessageLength: 4_000,
  geminiModel: 'gemini-2.0-flash' as const,
  groqModel: 'llama-3.3-70b-versatile' as const,
  xaiModel: 'grok-beta' as const,
  cfModel: '@cf/meta/llama-3.1-8b-instruct' as const,
} as const;

export type SupportedProviders = 'groq' | 'xai' | 'cloudflare';
