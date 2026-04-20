/**
 * Chopper News Bot — Cloudflare Workers Entry Point
 */

import { Hono } from 'hono';
import { handleWebhook } from './bot/handler.js';
import { renderAdminDashboard, handleAdminSave } from './bot/admin.js';
import { logger } from './utils/logger.js';
import { AppEnv } from './config.js';

const app = new Hono<{ Bindings: AppEnv }>();

/**
 * Health check
 */
app.get('/', (c) => {
  return c.json({
    status: 'Chopper News Bot (Cloudflare Workers) is running 🚀',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Webhook endpoint
 */
app.post('/webhook', async (c) => {
  try {
    const body = await c.req.json();
    logger.info('Received webhook update', { update_id: body.update_id });

    // Respond OK immediately, process in background
    c.executionCtx.waitUntil(handleWebhook(body, c.env));

    return c.json({ ok: true });
  } catch (error) {
    logger.error('Webhook payload error', error);
    return c.json({ ok: false, error: 'Invalid request' }, 400);
  }
});

/**
 * Admin Dashboard Routes
 */
app.get('/admin', (c) => c.html(renderAdminDashboard()));
app.post('/admin/save', (c) => handleAdminSave(c));

/**
 * Set Webhook Helper Endpoint
 * Usage: POST /webhook/set { "url": "https://..." }
 */
app.post('/webhook/set', async (c) => {
  const { url } = await c.req.json<{ url: string }>();
  const botToken = c.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    return c.json({ ok: false, error: 'TELEGRAM_BOT_TOKEN not configured' }, 500);
  }

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/setWebhook`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    }
  );

  const result = await response.json();
  return c.json(result);
});

export default app;
