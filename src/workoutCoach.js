// Логика календаря тренировок и подсказок тренера (локально, без ИИ).
import { todayStr } from './storage';
import { dowOf } from './dow';

export function workoutDatesSet(workouts) {
  return new Set((workouts || []).map((w) => w.date));
}

export function trainedOn(workouts, dateStr) {
  return (workouts || []).some((w) => w.date === dateStr);
}

// Понедельник текущей недели
function weekStart(d = new Date()) {
  const x = new Date(d);
  const day = (dowOf(x) + 6) % 7; // 0=Пн
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Пропущенные запланированные дни с начала недели до вчера включительно.
// since — дата (YYYY-MM-DD), с которой начали считать (когда выбрали дни). Раньше — не считаем.
export function missedThisWeek(workoutDays, workouts, since) {
  if (!workoutDays || !workoutDays.length) return [];
  const done = workoutDatesSet(workouts);
  const start = weekStart();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const missed = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    if (d >= today) break; // только прошедшие дни
    const ds = todayStr(d);
    if (since && ds < since) continue; // до выбора дней не считаем
    if (workoutDays.includes(dowOf(d)) && !done.has(ds)) missed.push(ds);
  }
  return missed;
}

// Сообщение-подсказка тренера по тренировкам.
export function workoutCoachMsg(state) {
  const workouts = state.workouts || [];
  const days = state.workoutDays || [];
  const today = new Date();
  const todayDow = dowOf(today);
  const didToday = trainedOn(workouts, todayStr());
  const missed = missedThisWeek(days, workouts, state.workoutDaysSince);
  const scheduledToday = days.includes(todayDow);

  if (didToday) {
    return { type: 'ok', text: 'Красавица, тренировка сделана! 💪 Теперь отдых и белок — творог, яйца или протеиновый коктейль восстановят мышцы.' };
  }
  if (scheduledToday) {
    return { type: 'go', text: 'Сегодня день тренировки — вперёд! 💜 Даже 20 минут лучше, чем ничего.' };
  }
  if (missed.length) {
    return { type: 'warn', text: `Пропущено тренировок на этой неделе: ${missed.length}. Не страшно — наверстаем сегодня-завтра!` };
  }
  if (days.length) {
    return { type: 'rest', text: 'Сегодня по плану отдых. Наберись сил и поешь как следует 🍗' };
  }
  return { type: 'rest', text: 'Выбери дни тренировок ниже — я буду напоминать и следить за прогрессом.' };
}
