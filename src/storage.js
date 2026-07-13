// Локальное хранилище на телефоне (AsyncStorage) + модель данных.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'trener_aliny_state_v1';

// Пустое состояние по умолчанию
export const emptyState = {
  onboarded: false,
  profile: { name: 'Алина', sex: 'f', height: 165, age: 30, activity: 1.375 },
  goal: null, // { targetDeltaKg, periodDays, startDate, startWeight, dailyKcal, strategy }
  customFoods: [], // свои продукты: [{ name, per100: { kcal, protein, fat, carbs } }]
  weights: [], // [{ date: 'YYYY-MM-DD', kg }]
  meals: [], // [{ id, date, type, name, kcal, protein, fat, carbs }]
  workouts: [], // [{ id, date, title, sets: [{ exercise, reps, weight }] }]
  activities: [], // нагрузка за день: [{ id, date, key, name, minutes, kcal }]
  workoutPlan: null, // { days: [{ title, ex: [..] }], note } — программа от ИИ
  workoutDays: [], // дни недели для тренировок (getDay(): 0=Вс..6=Сб)
  workoutTime: '18:00', // время тренировки (для напоминания за час)
  workoutDaysSince: null, // с какой даты считаем пропуски (когда выбрали дни)
  favorites: [], // любимые продукты: [{ name, per100 }]
  reminders: [
    { id: 'weigh', label: 'Взвешивание', body: 'Доброе утро! Взвесься и запиши вес 💜', time: '08:00', enabled: true },
    { id: 'breakfast', label: 'Завтрак', body: 'Что ты позавтракала? Запиши голосом 🍳', time: '10:00', enabled: true },
    { id: 'lunch', label: 'Обед', body: 'Пора записать обед 🍲', time: '14:00', enabled: true },
    { id: 'dinner', label: 'Ужин', body: 'Не забудь записать ужин 🍽️', time: '19:00', enabled: true },
    { id: 'workout', label: 'Тренировка', body: 'Сегодня тренировка! Разомнёмся? 💪', time: '18:00', enabled: false },
  ],
};

export async function loadState() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...emptyState };
    const parsed = JSON.parse(raw);
    return { ...emptyState, ...parsed };
  } catch (e) {
    return { ...emptyState };
  }
}

export async function saveState(state) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    // молча — не роняем UI
  }
}

// --- Утилиты ---
export function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Дневная норма калорий (Миффлин–Сан Жеор) с учётом цели
export function calcDailyKcal(profile, latestWeightKg, goal) {
  const w = latestWeightKg || goal?.startWeight || 65;
  const { sex, height, age, activity } = profile;
  // BMR
  let bmr = 10 * w + 6.25 * height - 5 * age;
  bmr += sex === 'm' ? 5 : -161;
  const tdee = bmr * (activity || 1.375);
  if (!goal) return Math.round(tdee);
  // Дефицит/профицит: ~7700 ккал = 1 кг
  const totalKcalDelta = goal.targetDeltaKg * 7700; // отрицательное для похудения
  const perDay = totalKcalDelta / Math.max(goal.periodDays, 1);
  const target = tdee + perDay;
  // Не опускаем ниже безопасного минимума
  const floor = sex === 'm' ? 1500 : 1200;
  return Math.round(Math.max(target, floor));
}
