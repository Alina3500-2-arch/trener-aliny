// Карточка «Мои данные» — влияет на расчёт нормы калорий (Миффлин–Сан Жеор).
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { colors, spacing, radius } from './theme';
import { Card, Button, Field, H2, Muted } from './ui';
import { useStore } from './store';

const ACTIVITY = [
  { v: 1.2, label: 'Сидячий' },
  { v: 1.375, label: 'Лёгкая' },
  { v: 1.55, label: 'Средняя' },
  { v: 1.725, label: 'Высокая' },
];

export default function Profile() {
  const { state, setProfile } = useStore();
  const p = state.profile;

  const [sex, setSex] = useState(p.sex);
  const [age, setAge] = useState(String(p.age));
  const [height, setHeight] = useState(String(p.height));
  const [activity, setActivity] = useState(p.activity);

  const save = () => {
    setProfile({
      sex,
      age: Number(age) || p.age,
      height: Number(height) || p.height,
      activity,
    });
    Alert.alert('Сохранено', 'Норма калорий пересчитана по твоим данным.');
  };

  return (
    <Card>
      <H2>Мои данные</H2>
      <Muted>Нужны для точного расчёта нормы калорий.</Muted>

      <View style={{ flexDirection: 'row', gap: spacing(1), marginTop: spacing(1) }}>
        <TouchableOpacity
          onPress={() => setSex('f')}
          style={[styles.chip, sex === 'f' && styles.chipActive]}
        >
          <Text style={[styles.chipText, sex === 'f' && { color: '#fff' }]}>Женский</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setSex('m')}
          style={[styles.chip, sex === 'm' && styles.chipActive]}
        >
          <Text style={[styles.chipText, sex === 'm' && { color: '#fff' }]}>Мужской</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing(1), marginTop: spacing(1) }}>
        <View style={{ flex: 1 }}>
          <Field label="Возраст" value={age} onChangeText={setAge} keyboardType="numeric" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Рост, см" value={height} onChangeText={setHeight} keyboardType="numeric" />
        </View>
      </View>

      <Muted>Уровень активности:</Muted>
      <View style={styles.actRow}>
        {ACTIVITY.map((a) => (
          <TouchableOpacity
            key={a.v}
            onPress={() => setActivity(a.v)}
            style={[styles.chip, activity === a.v && styles.chipActive]}
          >
            <Text style={[styles.chipText, activity === a.v && { color: '#fff' }]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Button title="Сохранить данные" onPress={save} style={{ marginTop: spacing(1.5) }} />
    </Card>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: spacing(0.75), paddingHorizontal: spacing(1.5),
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.cardAlt,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textDim, fontWeight: '600' },
  actRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1), marginTop: spacing(0.75) },
});
