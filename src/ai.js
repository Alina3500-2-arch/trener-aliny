// Подключение к бесплатному ИИ Groq (модели Llama, OpenAI-совместимый API).
// Разбирает фразу о еде («омлет из 2 яиц и тост») в список продуктов с КБЖУ.

import { findFood, makeItem, per100From } from './foodDB';

const API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const MODEL = 'llama-3.3-70b-versatile';
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'; // умеет «видеть» фото

// Прокси (Cloudflare Worker). Если задан EXPO_PUBLIC_GROQ_PROXY — все запросы идут через него
// (обходит региональную блокировку 403; ключ живёт на сервере). Иначе — напрямую к Groq.
const PROXY = (process.env.EXPO_PUBLIC_GROQ_PROXY || '').replace(/\/+$/, '');
const PROXY_TOKEN = process.env.EXPO_PUBLIC_GROQ_PROXY_TOKEN || '';
const BASE = PROXY || 'https://api.groq.com';
const URL = BASE + '/openai/v1/chat/completions';
const TRANSCRIBE_URL = BASE + '/openai/v1/audio/transcriptions';

// Заголовки к Groq/прокси. Через прокси ключ подставляет сервер — тут он не обязателен.
function groqHeaders(extra) {
  const h = { ...(extra || {}), Authorization: `Bearer ${API_KEY || 'proxy'}` };
  if (PROXY_TOKEN) h['x-proxy-token'] = PROXY_TOKEN;
  return h;
}

export function hasApiKey() {
  return !!PROXY || (!!API_KEY && API_KEY.length > 10);
}

// Понятное сообщение об ошибке ИИ. 403 — почти всегда геоблокировка Groq (регион/сеть).
function aiError(status, text) {
  if (status === 403) {
    return new Error('ИИ недоступен из твоей сети (403 — Groq блокирует регион). Бывает даже с VPN, если трафик приложения идёт мимо него. Пока можно добавить еду вручную — поиск по базе работает без интернета.');
  }
  if (status === 429) return new Error('Слишком много запросов, подожди минуту и попробуй снова.');
  return new Error(`Ошибка ИИ ${status}: ${String(text || '').slice(0, 120)}`);
}

// fetch с тайм-аутом — чтобы не висело бесконечно.
async function fetchТ(url, options, ms = 15000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Долго нет ответа — попробуй ещё раз.');
    throw e;
  } finally {
    clearTimeout(id);
  }
}

// Распознавание речи через Groq Whisper. uri — файл записи с телефона.
// Возвращает распознанный текст (на русском).
export async function transcribeAudio(uri) {
  if (!hasApiKey()) throw new Error('Нет ключа Groq');

  const form = new FormData();
  form.append('file', { uri, name: 'audio.m4a', type: 'audio/m4a' });
  form.append('model', 'whisper-large-v3-turbo');
  form.append('language', 'ru');
  form.append('response_format', 'json');

  const res = await fetchТ(TRANSCRIBE_URL, {
    method: 'POST',
    headers: groqHeaders(),
    body: form,
  }, 20000);
  if (!res.ok) {
    throw aiError(res.status, await res.text());
  }
  const data = await res.json();
  return (data.text || '').trim();
}

// Разбор еды как диалог с уточнениями.
// history — массив реплик пользователя (что сказала + ответы на уточнения).
// Возвращает { question: "..." } если нужно уточнить, либо { items: [...] }.
export async function parseMeal(history) {
  if (!hasApiKey()) throw new Error('Нет ключа Groq');

  const system = `Ты — диетолог, ведёшь короткий диалог. Пользователь говорит свободной речью, что съел — вытаскивай только про еду.
ВАЖНО: если для блюда не названо количество/вес/размер порции и это заметно влияет на калории (каши, гарниры, мясо, рыба, выпечка, паста, салаты с заправкой, сыр) — задай ОДИН короткий уточняющий вопрос про количество, например: «Сколько грамм каши?» или «Сколько кусочков хлеба?».
Оценивай сам БЕЗ вопроса только для очевидных единичных вещей: 1 банан, чашка кофе, стакан кефира, 1 яблоко, 1 конфета.
Спрашивай не больше одного раза за реплику. Когда данных достаточно — посчитай.
Если пользователь САМ назвал калорийность блюда — поставь "userKcal":true и используй именно его kcal.
Отвечай СТРОГО валидным JSON, одно из двух:
{"question":"короткий вопрос"}
или
{"items":[{"name":"...","grams":число,"kcal":число,"protein":число,"fat":число,"carbs":число,"userKcal":true/false}]}
grams — сколько грамм съедено (оцени, если не сказано). БЖУ в граммах на всю съеденную порцию.`;

  const messages = [{ role: 'system', content: system }];
  history.forEach((h, i) => {
    messages.push({ role: 'user', content: h });
    if (i < history.length - 1) messages.push({ role: 'assistant', content: '(уточняю)' });
  });

  const res = await fetchТ(URL, {
    method: 'POST',
    headers: groqHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.2, response_format: { type: 'json_object' } }),
  }, 15000);
  if (!res.ok) throw aiError(res.status, await res.text());
  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error('Пустой ответ');

  let parsed;
  try { parsed = JSON.parse(raw); }
  catch (e) { parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()); }

  return interpret(parsed);
}

// Общая обработка ответа ИИ: вопрос → как есть; позиции → сверка с базой по граммам.
function interpret(parsed) {
  if (parsed.nofood && (!parsed.items || !parsed.items.length)) {
    return { nofood: true };
  }
  if (parsed.question && (!parsed.items || !parsed.items.length)) {
    return { question: String(parsed.question) };
  }
  const items = (parsed.items || []).map((it) => {
    const grams = Math.round(Number(it.grams) || 0);
    const g = grams > 0 ? grams : 100;
    // 1) Пользователь ЯВНО назвал калории — уважаем их, базу не подменяем.
    if (it.userKcal && Number(it.kcal) > 0) {
      const item = makeItem(String(it.name || 'Блюдо'), g, per100From(it, g));
      return { ...item, fromUser: true };
    }
    // 2) Продукт есть в базе — берём per100 из базы (точные калории),
    // но НАЗВАНИЕ оставляем как сказал пользователь (капучино не станет «кофе с молоком»).
    const db = findFood(it.name);
    if (db && grams > 0) {
      const label = String(it.name || db.name).trim() || db.name;
      return { ...makeItem(label, grams, db.per100), fromDB: true };
    }
    // 3) Нет в базе — оценка ИИ (per100 восстанавливаем, чтобы менять граммы). Можно добавить в базу.
    return { ...makeItem(String(it.name || 'Блюдо'), g, per100From(it, g)), fromAI: !db };
  });
  return { items };
}

// Разбор ЦЕЛОГО ДНЯ одной фразой: человек надиктовал завтрак/обед/ужин сразу.
// Возвращает { meals: [{ type, items: [...] }] } — items уже сверены с базой (как в interpret).
export async function parseDayMeals(text) {
  if (!hasApiKey()) throw new Error('Нет ключа Groq');
  const system = `Ты — диетолог. Человек надиктовал СРАЗУ ВЕСЬ ДЕНЬ питания одной фразой и называет приёмы пищи (завтрак, обед, ужин, перекус/полдник, ланч). Раздели еду по приёмам и оцени калории и БЖУ.
Типы приёмов (используй ТОЛЬКО эти ключи): "breakfast" (завтрак), "brunch" (ланч/второй завтрак), "lunch" (обед), "snack" (перекус/полдник), "dinner" (ужин). Если приём не назван — отнеси к самому подходящему по смыслу.
НЕ задавай вопросов — оцени граммы и калории сам, разумно. Игнорируй всё, что не про еду.
Отвечай СТРОГО валидным JSON:
{"meals":[{"type":"breakfast","items":[{"name":"...","grams":число,"kcal":число,"protein":число,"fat":число,"carbs":число,"userKcal":true/false}]}]}
grams — сколько грамм съедено. БЖУ в граммах на всю съеденную порцию.`;
  const res = await fetchТ(URL, {
    method: 'POST',
    headers: groqHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'system', content: system }, { role: 'user', content: String(text || '') }], temperature: 0.2, response_format: { type: 'json_object' } }),
  }, 20000);
  if (!res.ok) throw aiError(res.status, await res.text());
  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error('Пустой ответ');
  let parsed;
  try { parsed = JSON.parse(raw); } catch (e) { parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()); }
  const VALID = ['breakfast', 'brunch', 'lunch', 'snack', 'dinner'];
  const meals = (parsed.meals || [])
    .map((m) => ({ type: VALID.includes(m.type) ? m.type : 'snack', items: interpret({ items: m.items || [] }).items || [] }))
    .filter((m) => m.items.length);
  return { meals };
}

// Разбор еды по ФОТО через vision-модель Groq. Диалог с уточнениями, как в parseMeal.
// base64 — снимок (jpeg, без префикса). history — ответы пользователя на уточнения.
// Возвращает { question } либо { items }.
export async function parseMealPhoto(base64, history = []) {
  if (!hasApiKey()) throw new Error('Нет ключа Groq');

  const system = `Ты — диетолог. Смотришь на ФОТО и определяешь, есть ли там ЕДА или напиток.
СНАЧАЛА проверь: реально ли на фото видна еда/напиток. Если на фото НЕТ еды (стена, мебель, человек, предмет, пустая тарелка, размытое или тёмное фото) — НЕ выдумывай блюда. Верни строго {"nofood":true}.
Только если еда действительно видна — определи блюда и оцени калорийность и БЖУ.
Если по фото трудно понять вес/размер порции и это заметно влияет на калории (каши, гарниры, мясо, рыба, выпечка, паста, салаты с заправкой, сыр) — задай ОДИН короткий уточняющий вопрос про количество, например: «Сколько примерно грамм каши?» или «Это два тоста?».
Не спрашивай про очевидное (1 банан, чашка кофе). Спрашивай не больше одного раза за реплику. Когда данных достаточно — посчитай.
Отвечай СТРОГО валидным JSON, одно из трёх:
{"nofood":true}
или
{"question":"короткий вопрос"}
или
{"items":[{"name":"...","grams":число,"kcal":число,"protein":число,"fat":число,"carbs":число}]}
grams — сколько грамм съедено (оцени по фото). БЖУ в граммах на всю съеденную порцию.`;

  const messages = [
    { role: 'system', content: system },
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Что за еда на фото? Оцени калории и БЖУ.' },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
      ],
    },
  ];
  // Ответы на уточнения добавляем обычным текстом (фото уже в контексте).
  // Перед каждым ответом — реплика ассистента (он задавал вопрос по фото).
  history.forEach((h) => {
    messages.push({ role: 'assistant', content: '(уточняю)' });
    messages.push({ role: 'user', content: h });
  });

  const res = await fetchТ(URL, {
    method: 'POST',
    headers: groqHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ model: VISION_MODEL, messages, temperature: 0.2, response_format: { type: 'json_object' } }),
  }, 25000);
  if (!res.ok) throw aiError(res.status, await res.text());
  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error('Пустой ответ');

  let parsed;
  try { parsed = JSON.parse(raw); }
  catch (e) { parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()); }
  return interpret(parsed);
}

// Разбор еды из свободной фразы. Возвращает { items: [{name, kcal, protein, fat, carbs}] }
export async function parseFood(text) {
  if (!hasApiKey()) {
    throw new Error('Нет ключа Groq. Добавь его в файл .env');
  }

  const system = `Ты — диетолог. Человек пишет свободным текстом, что съел (с граммами или без). Вытаскивай ТОЛЬКО про еду и напитки и оценивай калорийность и БЖУ.
Отвечай СТРОГО валидным JSON без пояснений в формате:
{"items":[{"name":"краткое название","grams":число,"kcal":число,"protein":число,"fat":число,"carbs":число,"userKcal":true/false}]}
Правила:
- Игнорируй всё, что не про еду (эмоции, дела, планы).
- Если про еду не сказано ничего — верни {"items":[]}.
- grams — сколько грамм съедено (оцени, если не указано явно).
- kcal/protein/fat/carbs — числа для всей съеденной порции (БЖУ в граммах).
- ВАЖНО: если пользователь САМ назвал калорийность блюда (напр. «борщ 300 ккал») — поставь "userKcal":true и используй ИМЕННО его число kcal. Иначе "userKcal":false.
- Каждый продукт/блюдо отдельным элементом.`;

  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `Описание: "${text}"` },
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' },
  };

  const res = await fetch(URL, {
    method: 'POST',
    headers: groqHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw aiError(res.status, await res.text());
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error('Пустой ответ от Groq');

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    parsed = JSON.parse(cleaned);
  }

  return interpret(parsed); // единый формат: name + grams + per100 (сверка с базой)
}

// Привести название дня к «День N · описание» по-русски, без букв A/B/C и англо-жаргона.
export function tidyDayTitle(title, index) {
  let t = String(title || '').trim();
  t = t.replace(/\bcore\b/gi, 'пресс')
       .replace(/\bfull body\b/gi, 'всё тело')
       .replace(/\blower\b/gi, 'низ')
       .replace(/\bupper\b/gi, 'верх');
  // Отделяем описание после «День X — / · / : / -»
  const m = t.match(/день\s*\S*\s*[—·:\-]\s*(.+)$/i);
  let desc = m && m[1] ? m[1].trim() : t.replace(/^день\s*\S*\s*/i, '').trim();
  if (typeof index === 'number') return `День ${index + 1}${desc ? ' · ' + desc : ''}`;
  return desc ? `День · ${desc}` : t;
}

// Составить НЕСКОЛЬКО программ тренировок на выбор. Возвращает [{ name, days:[{title,ex:[]}], note }].
export async function generateWorkoutPlans(ctx) {
  if (!hasApiKey()) throw new Error('Нет ключа Groq');
  const focus = (ctx.focus && ctx.focus.length) ? ctx.focus.join(', ') : 'всё тело';
  const system = `Ты — фитнес-тренер. Пользователь — женщина. Составь ДВЕ РАЗНЫЕ недельные программы на выбор под её цель и акцент на группы мышц. Программы должны заметно отличаться подходом (напр. одна — классическая силовая, другая — круговая/функциональная).
Делай упор на указанные группы мышц (для «ягодицы» — приседания, выпады, мостик, ягодичный мах, румынская тяга; и т.п.). Учитывай место (дом/зал) — дома без тренажёров.
Отвечай СТРОГО валидным JSON:
{"variants":[{"name":"Короткое имя программы","days":[{"title":"День 1 · Ноги и ягодицы","ex":["Приседания 3×15","Выпады 3×12 на ногу","..."]}],"note":"1-2 предложения"}]}
ВАЖНО про названия дней: нумеруй дни ТОЛЬКО «День 1», «День 2», «День 3» (не буквами A/B/C). После номера — короткое понятное название группы мышц ПО-РУССКИ, без английских слов и жаргона (никаких «core», «full body», «lower/upper» — пиши «пресс», «всё тело», «низ», «верх»).
В каждой программе ${ctx.days || 3} дня(ей), 5–7 упражнений в дне, с подходами/повторами прямо в тексте упражнения.`;
  const user = `Цель: ${ctx.goalText || 'тонус'}. Акцент на: ${focus}. Место: ${ctx.place || 'дом'}. Дней в неделю: ${ctx.days || 3}. Уровень: ${ctx.level || 'начальный'}.`;
  const res = await fetchТ(URL, {
    method: 'POST',
    headers: groqHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0.8, response_format: { type: 'json_object' } }),
  }, 25000);
  if (!res.ok) throw aiError(res.status, "");
  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error('Пустой ответ');
  let parsed;
  try { parsed = JSON.parse(raw); } catch (e) { parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()); }
  const clean = (arr) => (arr || []).map((v) => ({
    name: String(v.name || 'Программа'),
    note: String(v.note || ''),
    days: (v.days || []).map((d, di) => ({
      title: tidyDayTitle(d.title, di),
      ex: (d.ex || []).map((x) => String(x)).filter(Boolean),
    })).filter((d) => d.ex.length),
  })).filter((v) => v.days.length);
  const variants = clean(parsed.variants);
  if (!variants.length) throw new Error('Пустой ответ');
  return variants;
}

// Живой персональный совет тренера Алины.
// ctx: { name, goalText, target, eaten, left, hour, meals: ['гречка', ...] }
export async function coachTip(ctx) {
  if (!hasApiKey()) throw new Error('Нет ключа Groq');

  const system = `Ты — персональный ИИ-тренер и диетолог. Пользователя зовут Алина, обращайся к ней по имени и на «ты», тепло. Дай ОДИН короткий практичный совет на сейчас — МАКСИМУМ 1–2 предложения (до ~30 слов), без списков и без воды.
ГЛАВНОЕ ПРАВИЛО: порция должна ЗАПОЛНЯТЬ бо́льшую часть остатка калорий (примерно 60–100% от остатка), и указывай примерное кол-во ккал в скобках. Порция не должна превышать остаток, но и не быть смешно маленькой.
- Остаток БОЛЬШОЙ (400+ ккал) — предлагай ПОЛНОЦЕННЫЙ приём пищи на ~остаток (например курица/рыба/индейка + гарнир + овощи, ~350–450 ккал). НЕ предлагай кефир или яблоко на 100 ккал, когда осталось 400+.
- Остаток средний (150–400) — нормальный перекус/приём под остаток (творог с ягодами, омлет, салат с яйцом).
- Остаток МАЛЕНЬКИЙ (<150) — только лёгкое: яблоко, кефир, огурец, чай.
Учитывай БЖУ (не хватает белка — белковое; жиров/углеводов много — постное), время суток и цель. Блюда предлагай КАЖДЫЙ раз РАЗНЫЕ.
ПЛАН НА ДЕНЬ ВПЕРЁД: отталкивайся от того, что она уже съела, и веди к следующему приёму. Например: «Хорошо позавтракала — теперь продержись до обеда, на обед курица с гречкой (~450). Если сильно проголодаешься — на ланч яблоко или йогурт (~120)». Коротко: похвали за записанное и подскажи, что и когда съесть дальше, чтобы уложиться в норму.`;

  const user = `Данные на сейчас:
- Цель: ${ctx.goalText || 'не задана'}
- Норма на день: ${ctx.target} ккал
- Уже съедено: ${ctx.eaten} ккал
- Осталось: ${ctx.left} ккал
- Белок: ${ctx.protein ?? '?'} из ${ctx.pTarget ?? '?'} г; жиры ${ctx.fat ?? '?'}/${ctx.fTarget ?? '?'} г; углеводы ${ctx.carbs ?? '?'}/${ctx.cTarget ?? '?'} г
- Время: ${ctx.hour}:00
- Сегодня ела: ${ctx.meals && ctx.meals.length ? ctx.meals.join(', ') : 'пока ничего'}
${ctx.burned > 0 ? `- Сегодня была нагрузка/активность и сожгла ~${ctx.burned} ккал — эти калории добавились в запас, поэтому можно поесть плотнее. Упомяни это.` : ''}
${ctx.avoid ? `- НЕ повторяй прошлый совет: «${ctx.avoid}»` : ''}
Дай свежий совет${ctx.nonce ? ` (вариант ${ctx.nonce})` : ''}.`;

  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.9,
    max_tokens: 90,
  };

  const res = await fetch(URL, {
    method: 'POST',
    headers: groqHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw aiError(res.status, "");
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Пустой ответ');
  return text;
}
