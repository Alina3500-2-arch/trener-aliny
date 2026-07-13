// Редактор программы тренировок: дни, упражнения (добавить/править/удалить). Своя или правка ИИ-плана.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { colors, spacing, radius } from './theme';
import { Button, Muted } from './ui';

export default function WorkoutPlanEditor({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || 'Моя программа');
  const [days, setDays] = useState(
    initial?.days?.length ? initial.days.map((d) => ({ title: d.title, ex: [...d.ex] })) : [{ title: 'День A', ex: [''] }]
  );

  const setDayTitle = (di, t) => setDays((p) => p.map((d, i) => (i === di ? { ...d, title: t } : d)));
  const setEx = (di, ei, t) => setDays((p) => p.map((d, i) => (i === di ? { ...d, ex: d.ex.map((e, j) => (j === ei ? t : e)) } : d)));
  const addEx = (di) => setDays((p) => p.map((d, i) => (i === di ? { ...d, ex: [...d.ex, ''] } : d)));
  const delEx = (di, ei) => setDays((p) => p.map((d, i) => (i === di ? { ...d, ex: d.ex.filter((_, j) => j !== ei) } : d)));
  const addDay = () => setDays((p) => [...p, { title: `День ${String.fromCharCode(65 + p.length)}`, ex: [''] }]);
  const delDay = (di) => setDays((p) => p.filter((_, i) => i !== di));

  const save = () => {
    const cleanDays = days
      .map((d) => ({ title: d.title.trim() || 'День', ex: d.ex.map((e) => e.trim()).filter(Boolean) }))
      .filter((d) => d.ex.length);
    if (!cleanDays.length) { onCancel(); return; }
    onSave({ name: name.trim() || 'Моя программа', note: initial?.note || '', days: cleanDays });
  };

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ paddingBottom: spacing(4) }}>
      <Text style={styles.label}>Название программы</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Моя программа" placeholderTextColor={colors.textDim} />

      {days.map((d, di) => (
        <View key={di} style={styles.dayCard}>
          <View style={styles.dayHead}>
            <TextInput style={[styles.input, styles.dayTitle]} value={d.title} onChangeText={(t) => setDayTitle(di, t)} placeholder="Название дня" placeholderTextColor={colors.textDim} />
            <TouchableOpacity onPress={() => delDay(di)} style={styles.delDay}><Text style={styles.delDayText}>🗑</Text></TouchableOpacity>
          </View>
          {d.ex.map((e, ei) => (
            <View key={ei} style={styles.exRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={e}
                onChangeText={(t) => setEx(di, ei, t)}
                placeholder="напр. Приседания 3×15"
                placeholderTextColor={colors.textDim}
              />
              <TouchableOpacity onPress={() => delEx(di, ei)} style={styles.delEx}><Text style={styles.delExText}>✕</Text></TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={() => addEx(di)} style={styles.addEx}><Text style={styles.addExText}>＋ упражнение</Text></TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity onPress={addDay} style={styles.addDay}><Text style={styles.addDayText}>＋ добавить день</Text></TouchableOpacity>

      <View style={{ flexDirection: 'row', gap: spacing(1), marginTop: spacing(2) }}>
        <Button title="Отмена" kind="ghost" onPress={onCancel} style={{ flex: 1 }} />
        <Button title="Сохранить" onPress={save} style={{ flex: 1 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { },
  label: { color: colors.textDim, fontSize: 13, marginBottom: 5, marginTop: spacing(1) },
  input: {
    backgroundColor: colors.cardAlt, borderRadius: radius.sm, paddingHorizontal: spacing(1.25), paddingVertical: spacing(1),
    color: colors.text, fontSize: 15, borderWidth: 1, borderColor: colors.line,
  },
  dayCard: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: spacing(1.5), marginTop: spacing(1.5) },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: spacing(1), marginBottom: spacing(1) },
  dayTitle: { flex: 1, fontWeight: '700' },
  delDay: { padding: 6 },
  delDayText: { fontSize: 18 },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(0.75), marginBottom: spacing(0.75) },
  delEx: { padding: 6 },
  delExText: { color: colors.danger, fontSize: 16, fontWeight: '700' },
  addEx: { paddingVertical: 6 },
  addExText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  addDay: { alignItems: 'center', paddingVertical: spacing(1.25), marginTop: spacing(1.5), borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.line },
  addDayText: { color: colors.textDim, fontSize: 14, fontWeight: '700' },
});
