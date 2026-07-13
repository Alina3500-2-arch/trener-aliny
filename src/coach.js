// «Голос тренера Алины». Сейчас — локальные правила (без интернета).
// Позже сюда подключим Claude API для живых, персональных советов.
import { calcDailyKcal } from './storage';
import { burnedToday } from './activity';

export function latestWeight(state) {
  if (!state.weights.length) return null;
  return state.weights[state.weights.length - 1].kg;
}

export function todayMeals(state, dateStr) {
  return state.meals.filter((m) => m.date === dateStr);
}

export function eatenToday(state, dateStr) {
  return todayMeals(state, dateStr).reduce(
    (acc, m) => {
      acc.kcal += m.kcal || 0;
      acc.protein += m.protein || 0;
      acc.fat += m.fat || 0;
      acc.carbs += m.carbs || 0;
      return acc;
    },
    { kcal: 0, protein: 0, fat: 0, carbs: 0 }
  );
}

export function dailyTarget(state) {
  return calcDailyKcal(state.profile, latestWeight(state), state.goal);
}

// Ориентир по БЖУ на день. Если есть в цели — берём оттуда, иначе считаем от веса и нормы.
export function macroTargets(state) {
  if (state.goal?.macros) return state.goal.macros;
  const w = latestWeight(state) || state.goal?.startWeight || 65;
  const kcal = dailyTarget(state);
  const protein = Math.round(w * 1.8);
  const fat = Math.round(w * 0.9);
  const carbs = Math.max(Math.round((kcal - protein * 4 - fat * 9) / 4), 0);
  return { protein, fat, carbs };
}

// Прошла ли уже большая часть дня по калориям (для оценки нехватки белка).
export function dayAdvanced(eatenKcal, targetKcal) {
  return targetKcal > 0 && eatenKcal >= targetKcal * 0.6;
}

// Короткая рекомендация по остатку БЖУ (что докинуть / чего уже много).
// advanced — день по калориям уже наполовину (иначе про нехватку белка рано говорить).
export function macroHint(eaten, target, advanced) {
  if (!target) return null;
  const pLeft = target.protein - eaten.protein;
  if (eaten.carbs > target.carbs * 1.1) return { type: 'warn', text: 'Углеводов уже много — дальше лучше белок и овощи.' };
  if (eaten.fat > target.fat * 1.15) return { type: 'warn', text: 'Жиров многовато — выбирай постное.' };
  if (advanced && pLeft > 25) return { type: 'warn', text: `Не хватает белка (~${Math.round(pLeft)} г). Добавь курицу, творог, яйца или рыбу.` };
  if (pLeft <= 5 && eaten.carbs <= target.carbs * 1.1) return { type: 'ok', text: 'БЖУ в норме — так держать 👍' };
  return null;
}

// Совет тренера по остатку калорий и времени дня
export function coachAdvice(state, dateStr) {
  const weightKg = latestWeight(state);
  const burned = burnedToday(state, dateStr, weightKg);
  const target = dailyTarget(state) + burned; // бюджет с учётом нагрузки за день
  const eaten = eatenToday(state, dateStr).kcal;
  const left = Math.round(target - eaten);
  const hour = new Date().getHours();
  const meals = todayMeals(state, dateStr);
  const name = state.profile?.name || 'Алина';

  if (meals.length === 0) {
    if (hour < 11) return `Доброе утро, ${name}! Сначала взвесься и запиши вес, потом расскажи, что ела на завтрак.`;
    return `${name}, ты сегодня ещё ничего не записала. Расскажи, что уже ела — я посчитаю.`;
  }

  if (left <= 0) {
    return `На сегодня норма уже выбрана (перебор ${Math.abs(left)} ккал). Лучше остановиться: если очень хочется — стакан кефира или вода с лимоном.`;
  }

  // Совет строго под остаток калорий — чтобы порция реально влезала.
  if (left < 100) {
    return `Осталось совсем немного — ${left} ккал. Что-то лёгкое: чай без сахара, огурец или полстакана кефира (~40 ккал).`;
  }
  if (left < 250) {
    return `Осталось ${left} ккал — на лёгкий перекус: яблоко (~80), кефир (~80) или 100 г творога (~100 ккал).`;
  }
  if (hour >= 20 && left < 350) {
    return `До нормы осталось ${left} ккал, и уже вечер. На ужин что-то лёгкое: творог, кефир или овощи с яйцом.`;
  }
  const meal = hour < 12 ? 'обед' : hour < 17 ? 'полдник' : 'ужин';
  const burnPart = burned > 0 ? `Ты сегодня активна (сожгла ~${burned} ккал) — можно поесть плотнее. ` : '';
  return `${burnPart}Отлично, ${name}! Осталось ${left} ккал. На ${meal} можно нормально поесть — белок (курица/рыба/творог) + овощи, ориентируйся на ~${Math.round(left * 0.8)} ккал.`;
}

// Построение стратегии под цель (локально; позже — через Claude)
export function buildStrategy(state, targetDeltaKg, periodDays) {
  const w = latestWeight(state) || 65;
  const goal = { targetDeltaKg, periodDays, startWeight: w };
  const dailyKcal = calcDailyKcal(state.profile, w, goal);
  const maintenance = calcDailyKcal(state.profile, w, null);
  const deficitPerDay = Math.round(maintenance - dailyKcal);
  const losing = targetDeltaKg < 0;
  const weeklyKg = (targetDeltaKg / periodDays) * 7;

  const protein = Math.round(w * 1.8); // г белка в день
  const fat = Math.round(w * 0.9);
  const carbs = Math.round((dailyKcal - protein * 4 - fat * 9) / 4);

  const lines = [
    `Цель: ${losing ? 'сбросить' : 'набрать'} ${Math.abs(targetDeltaKg)} кг за ${periodDays} дн.`,
    `Это ${Math.abs(weeklyKg).toFixed(2)} кг в неделю — ${Math.abs(weeklyKg) <= 1 ? 'безопасный темп 👍' : 'темп агрессивный, но реально'}.`,
    `Твоя норма поддержания ≈ ${maintenance} ккал.`,
    `${losing ? 'Дефицит' : 'Профицит'} ≈ ${Math.abs(deficitPerDay)} ккал/день.`,
    `Ешь примерно ${dailyKcal} ккал в день.`,
    `БЖУ ориентир: белки ${protein} г, жиры ${fat} г, углеводы ${Math.max(carbs, 0)} г.`,
    `Тренировки: 3 раза в неделю — так и мышцы сохраним, и результат быстрее.`,
  ];

  return {
    goal: { targetDeltaKg, periodDays, startDate: dateOnly(), startWeight: w, dailyKcal, macros: { protein, fat, carbs } },
    text: lines.join('\n'),
  };
}

function dateOnly() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
