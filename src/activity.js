// Нагрузка за день: расход калорий от активности (прогулка, огород, зал…) и от тренировок.
// Оценка по формуле MET: ккал ≈ MET × вес(кг) × часы. Это добавляется «в запас» во вкладке Питание.

// Типы бытовой/спортивной нагрузки с коэффициентом MET и эмодзи.
export const ACTIVITY_TYPES = [
  { key: 'walk', label: 'Прогулка', emoji: '🚶‍♀️', met: 3.3 },
  { key: 'walk_fast', label: 'Быстрая ходьба', emoji: '💨', met: 4.5 },
  { key: 'run', label: 'Бег', emoji: '🏃‍♀️', met: 8.5 },
  { key: 'garden', label: 'Огород / дача', emoji: '🌱', met: 4.5 },
  { key: 'cleaning', label: 'Уборка дома', emoji: '🧹', met: 3.3 },
  { key: 'gym', label: 'Зал (силовая)', emoji: '🏋️‍♀️', met: 5.0 },
  { key: 'cardio', label: 'Кардио', emoji: '🔥', met: 6.5 },
  { key: 'bike', label: 'Велосипед', emoji: '🚲', met: 6.0 },
  { key: 'swim', label: 'Плавание', emoji: '🏊‍♀️', met: 6.0 },
  { key: 'dance', label: 'Танцы', emoji: '💃', met: 5.0 },
  { key: 'yoga', label: 'Йога / растяжка', emoji: '🧘‍♀️', met: 2.8 },
  { key: 'other', label: 'Другое', emoji: '⚡', met: 4.0 },
];

const DEFAULT_WEIGHT = 65;

// Оценка сожжённых калорий: MET × вес × (минуты / 60).
export function estimateKcal(met, minutes, weightKg) {
  const w = Number(weightKg) || DEFAULT_WEIGHT;
  const m = Number(minutes) || 0;
  return Math.round((Number(met) || 0) * w * (m / 60));
}

// Примерный расход за силовую тренировку по числу подходов (подход + отдых ≈ 3 мин, MET 5).
export function workoutKcal(workout, weightKg) {
  const sets = (workout && workout.sets && workout.sets.length) || 0;
  if (!sets) return 0;
  const minutes = Math.max(15, sets * 3);
  return estimateKcal(5.0, minutes, weightKg);
}

// Сумма «нагрузки» за день: ручные активности + записанные сегодня тренировки.
export function burnedToday(state, dateStr, weightKg) {
  const acts = (state.activities || []).filter((a) => a.date === dateStr);
  const fromActs = acts.reduce((s, a) => s + (Number(a.kcal) || 0), 0);
  const workouts = (state.workouts || []).filter((w) => w.date === dateStr);
  const fromWorkouts = workouts.reduce((s, w) => s + workoutKcal(w, weightKg), 0);
  return Math.round(fromActs + fromWorkouts);
}
