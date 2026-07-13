// Определение задействованных групп мышц по названию упражнения (по ключевым словам).
// Ключи групп: плечи, руки, грудь, пресс, спина, ягодицы, ноги.

const RULES = [
  { keys: ['ягодицы', 'ноги'], words: ['присед', 'выпад', 'мостик', 'ягодич', 'мах ног', 'румынск', 'становая', 'зашагив', 'жим ног', 'плие', 'сумо', 'ягодичн', 'отведение', 'болгарск'] },
  { keys: ['ноги'], words: ['икр', 'носки', 'квадрицепс', 'разгибание ног', 'сгибание ног', 'бедр'] },
  { keys: ['грудь', 'руки'], words: ['жим лёж', 'жим лежа', 'отжим', 'грудь', 'разводк', 'бабочк', 'пуловер', 'брусья'] },
  { keys: ['пресс'], words: ['планк', 'пресс', 'скручив', 'велосипед', 'вакуум', 'ножниц', 'книжк', 'уголок', 'подъём ног', 'подъем ног', 'кор '] },
  { keys: ['спина'], words: ['тяга', 'подтягив', 'спина', 'лодочк', 'гиперэкстенз', 'широчайш', 'шраги'] },
  { keys: ['руки'], words: ['бицепс', 'трицепс', 'сгибание рук', 'разгибание рук', 'молот', 'французск'] },
  { keys: ['плечи'], words: ['плеч', 'махи ганте', 'махи в сторон', 'армейск', 'жим ганте', 'жим над голов', 'дельт'] },
  { keys: ['ноги', 'пресс'], words: ['берпи', 'кардио', 'прыж', 'бег', 'скалолаз', 'джампинг', 'бёрпи', 'скакалк'] },
];

// Вернуть Set групп мышц для одного упражнения.
export function musclesForExercise(text) {
  const t = String(text || '').toLowerCase().replace(/ё/g, 'е');
  const found = new Set();
  for (const rule of RULES) {
    if (rule.words.some((w) => t.includes(w.replace(/ё/g, 'е')))) {
      rule.keys.forEach((k) => found.add(k));
    }
  }
  return found;
}

// Разобрать «Приседания 3×15» → { name, sets, reps }. Если формата нет — только name.
export function parseExercise(text) {
  const t = String(text || '').trim();
  const m = t.match(/(\d+)\s*[×xх*]\s*(\d+)/);
  if (m) {
    const name = t.replace(m[0], '').replace(/[-–—:]+\s*$/, '').trim();
    return { name: name || t, sets: m[1], reps: m[2] };
  }
  // «3 подхода по 15» и т.п. — пробуем вытащить два числа
  const nums = t.match(/\d+/g);
  const cleanName = t.replace(/\d+\s*(подход\w*|повтор\w*|раз|по|сет\w*)?/gi, '').replace(/\s+/g, ' ').trim();
  if (nums && nums.length >= 2) return { name: cleanName || t, sets: nums[0], reps: nums[1] };
  return { name: t, sets: '', reps: '' };
}

// Объединение групп мышц для дня (массив упражнений).
export function musclesForDay(exList) {
  const all = new Set();
  (exList || []).forEach((e) => musclesForExercise(e).forEach((k) => all.add(k)));
  return [...all];
}
