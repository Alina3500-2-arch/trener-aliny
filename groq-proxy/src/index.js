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
