// Календарь тренировок за текущий месяц.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, radius } from './theme';
import { todayStr } from './storage';
import { workoutDatesSet } from './workoutCoach';
import { dow, dowOf } from './dow';

const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WD_FULL = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];
const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

export default function WorkoutCalendar({ workouts, workoutDays = [], since = null, activityDates = null, burnedTodayKcal = 0, onDayPress = null, selectedDate = null }) {
  const actSet = activityDates || new Set();
  const done = workoutDatesSet(workouts);
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const todayS = todayStr();
  const offset = (dow(y, m + 1, 1) + 6) % 7; // 0=Пн (формулой, без getDay)
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayMid = new Date(y, m, now.getDate());

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null); // добить последнюю неделю
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <View style={styles.wrap}>
      <Text style={styles.month}>{MONTHS[m]} {y}</Text>
      <Text style={styles.todayCap}>Сегодня: {WD_FULL[dowOf(now)]}, {now.getDate()}</Text>
      <View style={styles.row}>
        {WD.map((w) => <Text key={w} style={styles.wd}>{w}</Text>)}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((d, di) => {
            if (d === null) return <View key={di} style={styles.cell} />;
            const date = new Date(y, m, d);
            const ds = todayStr(date);
            const isDone = done.has(ds);
            const isScheduled = workoutDays.includes(dow(y, m + 1, d));
            const isPast = date < todayMid;
            const isToday = ds === todayS;
            const missed = isScheduled && isPast && !isDone && (!since || ds >= since);
            const hasAct = actSet.has(ds);
            const isSel = selectedDate === ds;
            return (
              <TouchableOpacity key={di} style={styles.cell} activeOpacity={onDayPress ? 0.6 : 1} onPress={() => onDayPress && onDayPress(ds)}>
                <View style={[
                  styles.day,
                  hasAct && !isDone && styles.dayAct,
                  isDone && styles.dayDone,
                  missed && styles.dayMissed,
                  isScheduled && !isPast && !isDone && !hasAct && styles.dayPlanned,
                  isToday && styles.dayToday,
                  isSel && styles.daySel,
                ]}>
                  <Text style={[styles.dayText, (isDone || missed || hasAct) && { color: '#fff' }]}>{d}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
      <View style={styles.legend}>
        <Legend color={colors.accent} label="тренировка" />
        <Legend color={colors.warn} label="нагрузка" />
        <Legend color={colors.danger} label="пропуск" />
      </View>
      {burnedTodayKcal > 0 && (
        <Text style={styles.burnCap}>🔥 Сегодня сожжено: {burnedTodayKcal} ккал</Text>
      )}
    </View>
  );
}

function Legend({ color, label }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  month: { color: colors.text, fontSize: 16, fontWeight: '800', textAlign: 'center', marginBottom: 2 },
  todayCap: { color: colors.primary, fontSize: 12, fontWeight: '700', textAlign: 'center', marginBottom: spacing(1) },
  row: { flexDirection: 'row' },
  wd: { flex: 1, textAlign: 'center', color: colors.textDim, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  weekRow: { flexDirection: 'row' },
  cell: { flex: 1, height: 46, alignItems: 'center', justifyContent: 'center', padding: 2 },
  day: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardAlt },
  dayDone: { backgroundColor: colors.accent },
  dayAct: { backgroundColor: colors.warn },
  dayMissed: { backgroundColor: colors.danger },
  dayPlanned: { backgroundColor: colors.primaryDim },
  dayToday: { borderWidth: 2, borderColor: colors.primary },
  daySel: { borderWidth: 2, borderColor: '#fff' },
  dayText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: spacing(2), marginTop: spacing(1) },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: colors.textDim, fontSize: 12 },
  burnCap: { color: colors.warn, fontSize: 13, fontWeight: '800', textAlign: 'center', marginTop: spacing(1) },
});
