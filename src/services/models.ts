/**
 * AI Model Discovery Service
 * Lấy danh sách model từ APIs, nếu lỗi dùng danh sách local ổn định đã định nghĩa trước.
 */

import { getAppSecret } from './secrets.js';
import { AppEnv } from '../config.js';
import { logger } from '../utils/logger.js';

// Import dữ liệu fallback từ local files
import groqFallback from '../aiModels/groq.models.json' assert { type: 'json' };
import xaiFallback from '../aiModels/xai.models.json' assert { type: 'json' };
import cloudflareFallback from '../aiModels/cloudflare.models.json' assert { type: 'json' };

// Danh sách Model dự phòng (Stable Models) trích xuất từ file của bạn
const LOCAL_FALLBACK_MODELS = {
  groq: groqFallback.data.map((m: any) => ({ id: m.id, name: m.id })),
  xai: xaiFallback.data
    .filter((m: any) => m.id.includes('grok'))
    .map((m: any) => ({ id: m.id, name: m.id })),
  cloudflare: cloudflareFallback.data
    .filter((m: any) => m.task?.name === 'Text Generation')
    .map((m: any) => ({ id: m.name, name: m.name })),
  google: [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Fastest)' }
  ]
};

/**
 * Lấy danh sách Model của Groq
 */
async function fetchGroqModels(apiKey: string) {
  const res = await fetch('https://api.groq.com/openai/v1/models', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  if (!res.ok) throw new Error(`Groq API Error: ${res.status}`);
  const data: any = await res.json();
  return data.data.map((m: any) => ({ id: m.id, name: m.id }));
}

/**
 * Lấy danh sách từ xAI
 */
async function fetchXaiModels(apiKey: string) {
  const res = await fetch('https://api.x.ai/v1/models', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  if (!res.ok) throw new Error(`xAI Error: ${res.status}`);
  const data: any = await res.json();
  return data.models.map((m: any) => ({ id: m.id, name: m.id }));
}

/**
 * Lấy danh sách từ Cloudflare AI (Thông qua Client API)
 */
async function fetchCloudflareModels(accountId: string, apiToken: string) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/models/search?task=Text%20Generation`, {
    headers: { 'Authorization': `Bearer ${apiToken}` }
  });
  if (!res.ok) throw new Error(`Cloudflare AI Error: ${res.status}`);
  const data: any = await res.json();
  return data.result.map((m: any) => ({ id: m.model_id, name: m.name || m.model_id }));
}

/**
 * Aggregate all models with error handling & fallback
 */
export async function getDiscoveryModels(env: AppEnv) {
  const groqKey = await getAppSecret('GROQ_API_KEY', env);
  const xaiKey = await getAppSecret('XAI_API_KEY', env);
  const cfToken = await getAppSecret('CLOUDFLARE_API_TOKEN', env);
  const cfAccountId = await getAppSecret('CLOUDFLARE_ACCOUNT_ID', env);

  const results = {
    groq: LOCAL_FALLBACK_MODELS.groq,
    xai: LOCAL_FALLBACK_MODELS.xai,
    cloudflare: LOCAL_FALLBACK_MODELS.cloudflare,
    google: LOCAL_FALLBACK_MODELS.google
  };

  // Run all fetches in parallel
  const [groqRows, xaiRows, cfRows] = await Promise.allSettled([
    groqKey ? fetchGroqModels(groqKey) : Promise.reject('No Key'),
    xaiKey ? fetchXaiModels(xaiKey) : Promise.reject('No Key'),
    (cfToken && cfAccountId) ? fetchCloudflareModels(cfAccountId, cfToken) : Promise.reject('No Key')
  ]);

  if (groqRows.status === 'fulfilled') results.groq = groqRows.value;
  if (xaiRows.status === 'fulfilled') results.xai = xaiRows.value;
  if (cfRows.status === 'fulfilled') results.cloudflare = cfRows.value;

  return results;
}
