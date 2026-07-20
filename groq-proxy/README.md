# Groq-прокси (обход 403 без VPN)

Маленький серверок на Cloudflare Workers. Приложение обращается к нему, а он подставляет
секретный ключ и пересылает запрос в Groq из «разрешённой» сети (США). Итог: голос и ИИ
работают даже там, где Groq блокирует напрямую (ошибка 403), и без VPN. Бесплатно.

## Деплой (делается один раз, ~5 минут)

Нужен аккаунт Cloudflare (бесплатный): https://dash.cloudflare.com/sign-up

В папке `groq-proxy` выполни по очереди:

```bash
# 1. Войти в Cloudflare (откроется браузер — подтверди)
npx wrangler login

# 2. Положить ключ Groq в секреты (вставишь gsk_... когда спросит)
npx wrangler secret put GROQ_KEY

# (необязательно) простая защита от чужих запросов — придумай любую строку:
npx wrangler secret put PROXY_TOKEN

# 3. Опубликовать
npx wrangler deploy
```

## Автоматический deploy через GitHub

Workflow `.github/workflows/worker-deploy.yml` публикует Worker после изменений
в папке `groq-proxy`. В настройках GitHub Actions нужны два repository secret:

- `CLOUDFLARE_API_TOKEN` — Cloudflare API token с правами Workers Scripts: Edit
  и Workers KV Storage: Edit;
- `CLOUDFLARE_ACCOUNT_ID` — ID аккаунта Cloudflare.

При первом deploy Wrangler автоматически создаст KV-хранилище `WIDGET_KV`, а
workflow сохранит выданный Cloudflare ID в `wrangler.toml`.

После `deploy` в консоли будет адрес вида:
`https://groq-proxy.ТВОЙ-АККАУНТ.workers.dev`

## Подключить приложение

В файле `trener-aliny/.env` впиши этот адрес:

```
EXPO_PUBLIC_GROQ_PROXY=https://groq-proxy.ТВОЙ-АККАУТ.workers.dev
```

Если задавала `PROXY_TOKEN`, добавь и его:

```
EXPO_PUBLIC_GROQ_PROXY_TOKEN=та-же-строка
```

Затем пересобрать/опубликовать приложение (OTA). После этого весь ИИ (голос, «весь день»,
советы, фото) ходит через прокси — 403 больше не будет.

## Проверка

```bash
curl -X POST https://groq-proxy.ТВОЙ-АККАУНТ.workers.dev/openai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"llama-3.3-70b-versatile","messages":[{"role":"user","content":"привет"}]}'
```

Должен прийти JSON-ответ от модели (а не 403).
