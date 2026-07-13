import React, { useState } from 'react';
import { Text, ScrollView, StyleSheet, View, TouchableOpacity } from 'react-native';
import { colors, spacing, radius } from '../theme';
import { Card, Muted } from '../ui';
import { useStore } from '../store';
import { todayStr } from '../storage';
import { dailyTarget, latestWeight } from '../coach';
import { workoutKcal } from '../activity';
import { dow, dowOf } from '../dow';
import Hero from '../Hero';

const MEAL_LABEL = { breakfast: '🍳 Завтрак', brunch: '🥪 Ланч', lunch: '🍲 Обед', snack: '🍎 Полдник', dinner: '🍽️ Ужин' };
const MEAL_ORDER = ['breakfast', 'brunch', 'lunch', 'snack', 'dinner'];
const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

export default function HistoryScreen() {
  const { state } = useStore();
  const target = dailyTarget(state);
  const weightKg = latestWeight(state);
  const todayS = todayStr();
  const [selected, setSelected] = useState(todayS);

  // Съедено по датам
  const eatenByDate = {};
  state.meals.forEach((m) => { eatenByDate[m.date] = (eatenByDate[m.date] || 0) + (m.kcal || 0); });

  // Сетка месяца
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const offset = (dow(y, m + 1, 1) + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  // Детали выбранного дня
  const dayMeals = state.meals.filter((mm) => mm.date === selected);
  const dayWorkouts = state.workouts.filter((w) => w.date === selected);
  const dayActs = (state.activities || []).filter((a) => a.date === selected);
  const dayKcal = dayMeals.reduce((a, mm) => a + (mm.kcal || 0), 0);
  const dayBurned = Math.round(dayActs.reduce((s, a) => s + (a.kcal || 0), 0) + dayWorkouts.reduce((s, w) => s + workoutKcal(w, weightKg), 0));
  const over = dayKcal > target;

  return (
    <ScrollView bounces={false} overScrollMode="never" showsVerticalScrollIndicator={false} style={styles.screen} contentContainerStyle={{ paddingBottom: spacing(4) }}>
      <Hero title="История" subtitle="Календарь питания — тапни день" />

      <View style={styles.body}>
        <Card>
          <Text style={styles.month}>{MONTHS[m]} {y}</Text>
          <View style={styles.row}>{WD.map((w) => <Text key={w} style={styles.wd}>{w}</Text>)}</View>
          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((d, di) => {
                if (d === null) return <View key={di} style={styles.cell} />;
                const ds = todayStr(new Date(y, m, d));
                const eaten = eatenByDate[ds] || 0;
                const has = eaten > 0;
                const isOver = eaten > target;
                const isSel = ds === selected;
                const isToday = ds === todayS;
                return (
                  <TouchableOpacity key={di} style={styles.cell} activeOpacity={0.7} onPress={() => setSelected(ds)}>
                    <View style={[
                      styles.day,
                      has && (isOver ? styles.dayOver : styles.dayOk),
                      isToday && styles.dayToday,
                      isSel && styles.daySel,
                    ]}>
                      <Text style={[styles.dayText, has && { color: '#fff' }]}>{d}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
          <View style={styles.legend}>
            <Legend color={colors.accent} label="уложилась" />
            <Legend color="#FF6B6B" label="перебор" />
          </View>
        </Card>

        {/* Детали выбранного дня */}
        <Card>
          <View style={styles.detHead}>
            <Text style={styles.detTitle}>{niceDate(selected)}</Text>
            <Text style={[styles.detKcal, over && { color: '#FF6B6B' }]}>{Math.round(dayKcal)} / {target} ккал</Text>
          </View>
          {dayBurned > 0 && <Muted>🔥 нагрузка: −{dayBurned} ккал</Muted>}

          {dayMeals.length === 0 ? (
            <Muted style={{ marginTop: spacing(1) }}>В этот день ничего не записано.</Muted>
          ) : (
            MEAL_ORDER.map((type) => {
              const items = dayMeals.filter((mm) => mm.type === type);
              if (!items.length) return null;
              const sum = items.reduce((a, mm) => a + (mm.kcal || 0), 0);
              return (
                <View key={type} style={styles.mealBlock}>
                  <View style={styles.mealHead}>
                    <Text style={styles.mealLabel}>{MEAL_LABEL[type] || type}</Text>
                    <Muted>{Math.round(sum)} ккал</Muted>
                  </View>
                  {items.map((mm) => (
                    <View key={mm.id} style={styles.itemRow}>
                      <Text style={styles.itemName} numberOfLines={1}>{mm.name}</Text>
                      {mm.grams ? <Text style={styles.itemGrams}>{mm.grams} г</Text> : null}
                      <Text style={styles.itemKcal}>{Math.round(mm.kcal)} ккал</Text>
                    </View>
                  ))}
                </View>
              );
            })
          )}
        </Card>
      </View>
    </ScrollView>
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

function niceDate(s) {
  const [y, m, d] = s.split('-');
  const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  return `${Number(d)} ${months[Number(m) - 1]} ${y}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing(1.5), gap: spacing(1) },
  month: { color: colors.text, fontSize: 16, fontWeight: '800', textAlign: 'center', marginBottom: spacing(1) },
  row: { flexDirection: 'row' },
  wd: { flex: 1, textAlign: 'center', color: colors.textDim, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  weekRow: { flexDirection: 'row' },
  cell: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center', padding: 2 },
  day: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardAlt },
  dayOk: { backgroundColor: colors.accent },
  dayOver: { backgroundColor: '#FF6B6B' },
  dayToday: { borderWidth: 2, borderColor: colors.primary },
  daySel: { borderWidth: 2, borderColor: '#fff' },
  dayText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: spacing(2), marginTop: spacing(1) },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: colors.textDim, fontSize: 12 },
  detHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  detKcal: { color: colors.accent, fontSize: 15, fontWeight: '800' },
  mealBlock: { marginTop: spacing(1) },
  mealHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  mealLabel: { color: colors.text, fontSize: 14, fontWeight: '700' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  itemName: { color: colors.text, fontSize: 14, flex: 1 },
  itemGrams: { color: colors.textDim, fontSize: 13, marginRight: spacing(1.5), minWidth: 44, textAlign: 'right' },
  itemKcal: { color: colors.accent, fontSize: 13, fontWeight: '700', minWidth: 56, textAlign: 'right' },
});
