/**
 * Groq-прокси на Cloudflare Workers.
 *
 * Зачем: телефон в некоторых регионах не может обращаться к api.groq.com напрямую
 * (ошибка 403), и даже VPN не всегда помогает. Этот worker крутится в сети Cloudflare
 * (США), поэтому запросы к Groq идут из «разрешённой» сети. Приложение обращается
 * к worker'у, а тот подставляет секретный ключ и пересылает запрос в Groq.
 *
 * Секрет (задать один раз):
 *   npx wrangler secret put GROQ_KEY        // сам ключ Groq (gsk_...)
 * Необязательно (защита от чужих запросов):
 *   npx wrangler secret put PROXY_TOKEN     // любая строка; та же должна быть в приложении
 *
 * Разрешённые пути — только те, что нужны приложению:
 *   POST /openai/v1/chat/completions
 *   POST /openai/v1/audio/transcriptions
 */

const GROQ_BASE = 'https://api.groq.com';
const ALLOWED = ['/openai/v1/chat/completions', '/openai/v1/audio/transcriptions'];
const WIDGET_DEVICE_ID = 'aline'; // Уникальный ID Алины для виджета

function withCors(resp) {
  const r = new Response(resp.body, resp);
  r.headers.set('Access-Control-Allow-Origin', '*');
  r.headers.set('Access-Control-Allow-Headers', '*');
  r.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  return r;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return withCors(new Response(null, { status: 204 }));

    const url = new URL(request.url);

    // Widget endpoints (can be GET or POST)
    if (url.pathname === `/widget/${WIDGET_DEVICE_ID}` && request.method === 'GET') {
      return handleWidgetGet(env);
    }
    if (url.pathname === '/widget/sync' && request.method === 'POST') {
      return handleWidgetSync(request, env);
    }

    if (request.method !== 'POST' || !ALLOWED.includes(url.pathname)) {
      return withCors(new Response('Not found', { status: 404 }));
    }
    if (!env.GROQ_KEY) {
      return withCors(new Response('Proxy is not configured (no GROQ_KEY secret)', { status: 500 }));
    }
    // Необязательная защита: если задан PROXY_TOKEN, требуем его в заголовке.
    if (env.PROXY_TOKEN && request.headers.get('x-proxy-token') !== env.PROXY_TOKEN) {
      return withCors(new Response('Forbidden', { status: 401 }));
    }

    // Пересобираем заголовки: подставляем ключ Groq, убираем лишнее.
    const headers = new Headers(request.headers);
    headers.set('Authorization', `Bearer ${env.GROQ_KEY}`);
    headers.delete('host');
    headers.delete('x-proxy-token');

    const upstream = await fetch(GROQ_BASE + url.pathname, {
      method: 'POST',
      headers,
      body: request.body,
    });

    return withCors(upstream);
  },
};

async function handleWidgetGet(env) {
  try {
    const data = await env.WIDGET_KV.get(WIDGET_DEVICE_ID);
    if (!data) {
      return withCors(new Response(JSON.stringify({ error: 'No data' }), { status: 404, headers: { 'Content-Type': 'application/json' } }));
    }
    return withCors(new Response(data, { status: 200, headers: { 'Content-Type': 'application/json' } }));
  } catch (e) {
    return withCors(new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
  }
}

async function handleWidgetSync(request, env) {
  try {
    const payload = await request.json();
    // Сохраняем payload в KV с ttl 7 дней
    await env.WIDGET_KV.put(WIDGET_DEVICE_ID, JSON.stringify(payload), { expirationTtl: 604800 });
    return withCors(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  } catch (e) {
    return withCors(new Response(JSON.stringify({ error: String(e) }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
  }
}
