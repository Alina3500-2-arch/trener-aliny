// Планирование ежедневных напоминаний через expo-notifications.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Как показывать уведомления, когда приложение открыто
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensurePermission() {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.status === 'granted';
  } catch (e) {
    return false;
  }
}

// Пересобрать все напоминания: отменить старые и запланировать включённые.
// workout = { days: [getDay 0-6], time: 'HH:MM' } — напоминание за час до тренировки.
export async function syncReminders(reminders, workout = null) {
  try {
    if (Platform.OS === 'web') return; // в вебе уведомлений нет
    const ok = await ensurePermission();
    if (!ok) return;

    await Notifications.cancelAllScheduledNotificationsAsync();

    for (const r of reminders) {
      if (!r.enabled) continue;
      const [h, m] = String(r.time).split(':').map((x) => parseInt(x, 10));
      if (Number.isNaN(h) || Number.isNaN(m)) continue;
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Тренер Алины', body: r.body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: h, minute: m },
      });
    }

    // Тренировочные напоминания за час до тренировки в выбранные дни недели.
    if (workout && workout.days && workout.days.length) {
      const [th, tm] = String(workout.time || '18:00').split(':').map((x) => parseInt(x, 10));
      if (!Number.isNaN(th) && !Number.isNaN(tm)) {
        let rh = th - 1; // за час
        if (rh < 0) rh = 23;
        for (const gd of workout.days) {
          // expo weekday: 1=Вс..7=Сб; getDay 0=Вс..6=Сб → gd+1
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '💪 Скоро тренировка',
              body: `Через час тренировка! Собирайся: вода, полотенце, форма и протеин 💜`,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday: (gd % 7) + 1,
              hour: rh,
              minute: tm,
            },
          });
        }
      }
    }
  } catch (e) {
    // молча — не роняем приложение, если уведомления недоступны (напр. Expo Go)
  }
}
