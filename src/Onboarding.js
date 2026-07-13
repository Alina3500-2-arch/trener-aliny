// Онбординг при первом входе: тренер узнаёт цель и предлагает 3 варианта.
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { colors, spacing, radius } from './theme';
import { Card, Button, Field, H1, H2, Muted } from './ui';
import { useStore } from './store';
import { calcDailyKcal, todayStr } from './storage';

const ACTIVITY = [
  { v: 1.2, label: 'Сидячий' },
  { v: 1.375, label: 'Лёгкая' },
  { v: 1.55, label: 'Средняя' },
  { v: 1.725, label: 'Высокая' },
];

function planFor(maintenance, deltaKg, dailyChange, sex) {
  const total = Math.abs(deltaKg) * 7700;
  const days = Math.max(Math.round(total / dailyChange), 1);
  const floor = sex === 'm' ? 1500 : 1200;
  const daily = deltaKg < 0
    ? Math.max(Math.round(maintenance - dailyChange), floor)
    : Math.round(maintenance + dailyChange);
  return { days, daily };
}

export default function Onboarding() {
  const { setProfile, addWeight, setGoal, setOnboarded } = useStore();
  const [step, setStep] = useState(0);

  const [sex, setSex] = useState('f');
  const [age, setAge] = useState('30');
  const [height, setHeight] = useState('165');
  const [activity, setActivity] = useState(1.375);
  const [current, setCurrent] = useState('');
  const [target, setTarget] = useState('');

  const cur = parseFloat(String(current).replace(',', '.'));
  const tgt = parseFloat(String(target).replace(',', '.'));
  const profile = { sex, age: Number(age) || 30, height: Number(height) || 165, activity };
  const maintenance = cur ? calcDailyKcal(profile, cur, null) : 0;
  const deltaKg = cur && tgt ? tgt - cur : 0;

  const options = deltaKg
    ? [
        { key: 'calm', label: 'Спокойно', ...planFor(maintenance, deltaKg, 300, sex), hint: 'мягко, без стресса' },
        { key: 'mid', label: 'Средне', ...planFor(maintenance, deltaKg, 500, sex), hint: 'оптимальный баланс' },
        { key: 'fast', label: 'Быстро', ...planFor(maintenance, deltaKg, 750, sex), hint: 'интенсивно' },
      ]
    : [];

  const goNext = () => {
    if (!cur || cur < 30 || cur > 400) { Alert.alert('Вес', 'Укажи текущий вес.'); return; }
    if (!tgt || tgt < 30 || tgt > 400) { Alert.alert('Цель', 'Укажи желаемый вес.'); return; }
    if (Math.abs(deltaKg) < 0.5) { Alert.alert('Цель', 'Цель слишком близка к текущему весу.'); return; }
    setStep(2);
  };

  const choose = (opt) => {
    setProfile(profile);
    addWeight(Number(cur.toFixed(1)), todayStr());
    setGoal({
      targetDeltaKg: Number(deltaKg.toFixed(1)),
      periodDays: opt.days,
      startDate: todayStr(),
      startWeight: cur,
      dailyKcal: opt.daily,
    });
    setOnboarded(true);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing(2.5), paddingTop: spacing(6), paddingBottom: spacing(6) }}>
      {step === 0 && (
        <View>
          <Text style={styles.emoji}>💪</Text>
          <H1>Привет, Алина!</H1>
          <Text style={styles.lead}>Я твой персональный ИИ-тренер. Помогу считать калории голосом, вести дневник и дойти до цели. Давай настроим план за минуту.</Text>
          <Button title="Начать" onPress={() => setStep(1)} style={{ marginTop: spacing(2) }} />
        </View>
      )}

      {step === 1 && (
        <View>
          <H1>Пара вопросов</H1>
          <Muted>Это нужно, чтобы точно посчитать твою норму.</Muted>

          <Card style={{ marginTop: spacing(2) }}>
            <Muted>Пол</Muted>
            <View style={{ flexDirection: 'row', gap: spacing(1), marginTop: 6, marginBottom: spacing(1) }}>
              <Chip active={sex === 'f'} onPress={() => setSex('f')} label="Женский" />
              <Chip active={sex === 'm'} onPress={() => setSex('m')} label="Мужской" />
            </View>
            <View style={{ flexDirection: 'row', gap: spacing(1) }}>
              <View style={{ flex: 1 }}><Field label="Возраст" value={age} onChangeText={setAge} keyboardType="numeric" /></View>
              <View style={{ flex: 1 }}><Field label="Рост, см" value={height} onChangeText={setHeight} keyboardType="numeric" /></View>
            </View>
            <Muted>Активность</Muted>
            <View style={styles.actRow}>
              {ACTIVITY.map((a) => (
                <Chip key={a.v} active={activity === a.v} onPress={() => setActivity(a.v)} label={a.label} />
              ))}
            </View>
          </Card>

          <Card>
            <H2>Твоя цель</H2>
            <View style={{ flexDirection: 'row', gap: spacing(1) }}>
              <View style={{ flex: 1 }}><Field label="Сейчас, кг" value={current} onChangeText={setCurrent} placeholder="60" keyboardType="decimal-pad" /></View>
              <View style={{ flex: 1 }}><Field label="Хочу, кг" value={target} onChangeText={setTarget} placeholder="58" keyboardType="decimal-pad" /></View>
            </View>
          </Card>

          <Button title="Показать план" onPress={goNext} />
        </View>
      )}

      {step === 2 && (
        <View>
          <H1>{deltaKg < 0 ? 'Сбросить' : 'Набрать'} {Math.abs(deltaKg).toFixed(1)} кг</H1>
          <Text style={styles.lead}>
            Твоя норма поддержания ≈ {maintenance} ккал. Чтобы {deltaKg < 0 ? 'худеть' : 'набирать'}, нужен {deltaKg < 0 ? 'дефицит' : 'профицит'}. Выбери темп:
          </Text>

          {options.map((opt) => (
            <TouchableOpacity key={opt.key} onPress={() => choose(opt)} activeOpacity={0.85}>
              <Card style={{ borderColor: colors.primaryDim }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <H2>{opt.label}</H2>
                    <Muted>{opt.hint}</Muted>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.kcal}>{opt.daily} ккал/день</Text>
                    <Muted>≈ {opt.days} дн. ({Math.round(opt.days / 7)} нед.)</Muted>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))}

          <Button title="Назад" kind="ghost" onPress={() => setStep(1)} style={{ marginTop: spacing(1) }} />
        </View>
      )}
    </ScrollView>
  );
}

function Chip({ active, onPress, label }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  emoji: { fontSize: 52, marginBottom: spacing(1) },
  lead: { color: colors.text, fontSize: 16, lineHeight: 24, marginTop: spacing(1) },
  actRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1), marginTop: 6 },
  kcal: { color: colors.accent, fontSize: 16, fontWeight: '800' },
  chip: {
    paddingVertical: spacing(0.75), paddingHorizontal: spacing(1.5),
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.cardAlt,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textDim, fontWeight: '600' },
});
