import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';
import { Card, Button, Field, H2, Muted } from '../ui';
import { useStore } from '../store';
import { latestWeight } from '../coach';
import Hero from '../Hero';

export default function WeightScreen() {
  const { state, addWeight } = useStore();
  const [val, setVal] = useState('');
  const current = latestWeight(state);
  const weights = state.weights;
  const start = state.goal?.startWeight ?? weights[0]?.kg ?? null;
  const changed = current != null && start != null ? current - start : null;

  const save = () => {
    const kg = parseFloat(String(val).replace(',', '.'));
    if (!kg || kg < 20 || kg > 400) return;
    addWeight(Number(kg.toFixed(1)));
    setVal('');
  };

  const max = Math.max(...weights.map((w) => w.kg), current || 0);
  const min = Math.min(...weights.map((w) => w.kg), current || max);
  const range = Math.max(max - min, 1);

  return (
    <ScrollView bounces={false} overScrollMode="never" showsVerticalScrollIndicator={false} style={styles.screen} contentContainerStyle={{ paddingBottom: spacing(3) }}>
      <Hero title="Вес">
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.heroLabel}>Текущий вес</Text>
            <Text style={styles.heroBig}>{current != null ? `${current} кг` : '—'}</Text>
          </View>
          {changed != null && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.heroLabel}>С начала цели</Text>
              <Text style={[styles.heroDelta, { color: changed <= 0 ? '#CFF5E7' : '#FFE7C2' }]}>
                {changed > 0 ? '+' : ''}{changed.toFixed(1)} кг
              </Text>
            </View>
          )}
        </View>
      </Hero>

      <View style={styles.body}>
      <Card>
        <H2>Записать взвешивание</H2>
        <Muted>Взвесься утром натощак и введи вес.</Muted>
        <View style={{ flexDirection: 'row', gap: spacing(1), marginTop: spacing(1), alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Field value={val} onChangeText={setVal} placeholder="напр. 64.3" keyboardType="decimal-pad" />
          </View>
          <Button title="Сохранить" onPress={save} style={{ marginBottom: spacing(1.5) }} />
        </View>
      </Card>

      {/* Простой график */}
      {weights.length > 1 && (
        <Card>
          <H2>Динамика</H2>
          <View style={styles.chart}>
            {weights.map((w) => {
              const h = 20 + ((w.kg - min) / range) * 90;
              return (
                <View key={w.date} style={styles.bar}>
                  <View style={[styles.barFill, { height: h }]} />
                  <Muted style={styles.barLabel}>{w.date.slice(5)}</Muted>
                </View>
              );
            })}
          </View>
          <Muted style={{ textAlign: 'center' }}>{min} … {max} кг</Muted>
        </Card>
      )}

      {weights.length === 0 && (
        <Muted style={{ textAlign: 'center', marginTop: spacing(2) }}>
          Пока нет записей. Запиши первое взвешивание — от него построим цель.
        </Muted>
      )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing(1.5) },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: spacing(1.5) },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  heroBig: { color: '#fff', fontSize: 40, fontWeight: '800' },
  heroDelta: { fontSize: 22, fontWeight: '800' },
  big: { color: colors.text, fontSize: 40, fontWeight: '800' },
  delta: { fontSize: 22, fontWeight: '800' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 140, gap: 6, marginVertical: spacing(1) },
  bar: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barFill: { width: '70%', backgroundColor: colors.primary, borderRadius: 4 },
  barLabel: { fontSize: 10, marginTop: 4 },
});
