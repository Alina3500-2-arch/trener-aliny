// Карточка настройки напоминаний: включение и время каждого.
import React from 'react';
import { View, Text, StyleSheet, Switch, TextInput } from 'react-native';
import { colors, spacing } from './theme';
import { Card, H2, Muted } from './ui';
import { useStore } from './store';

export default function RemindersCard() {
  const { state, setReminders } = useStore();
  const list = state.reminders || [];

  const toggle = (id, enabled) => {
    setReminders(list.map((r) => (r.id === id ? { ...r, enabled } : r)));
  };

  const setTime = (id, time) => {
    setReminders(list.map((r) => (r.id === id ? { ...r, time } : r)));
  };

  return (
    <Card>
      <H2>Напоминания</H2>
      <Muted>Тренер напомнит вовремя. Время — в формате ЧЧ:ММ.</Muted>

      {list.map((r) => (
        <View key={r.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{r.label}</Text>
            <Muted>{r.body}</Muted>
          </View>
          <TextInput
            value={r.time}
            onChangeText={(t) => setTime(r.id, t)}
            placeholder="08:00"
            placeholderTextColor={colors.textDim}
            keyboardType="numbers-and-punctuation"
            style={styles.time}
            maxLength={5}
          />
          <Switch
            value={r.enabled}
            onValueChange={(v) => toggle(r.id, v)}
            trackColor={{ true: colors.primaryDim, false: colors.line }}
            thumbColor={r.enabled ? colors.primary : '#888'}
          />
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing(1),
    paddingVertical: spacing(1), borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  label: { color: colors.text, fontSize: 15, fontWeight: '600' },
  time: {
    width: 62, textAlign: 'center', color: colors.text, fontSize: 15,
    backgroundColor: colors.cardAlt, borderRadius: 8, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.line,
  },
});
