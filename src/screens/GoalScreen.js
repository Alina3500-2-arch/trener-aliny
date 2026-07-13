import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Modal, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { colors, spacing, radius } from '../theme';
import { Card, Button, Field, H2, Muted } from '../ui';
import { useStore } from '../store';
import { buildStrategy, dailyTarget } from '../coach';
import Profile from '../Profile';
import RemindersCard from '../RemindersCard';
import Hero from '../Hero';

export default function GoalScreen() {
  const { state, setGoal } = useStore();
  const goal = state.goal;

  const [edit, setEdit] = useState(false); // окно «Изменить цель» (мои данные + новая цель)
  const [delta, setDelta] = useState(goal ? String(Math.abs(goal.targetDeltaKg)) : '2');
  const [dir, setDir] = useState(goal && goal.targetDeltaKg > 0 ? 'gain' : 'lose');
  const [days, setDays] = useState(goal ? String(goal.periodDays) : '30');
  const [preview, setPreview] = useState(null);

  const make = () => {
    const d = parseFloat(String(delta).replace(',', '.'));
    const p = parseInt(days, 10);
    if (!d || !p) { Alert.alert('Заполни', 'Укажи, сколько кг и за сколько дней.'); return; }
    const signed = dir === 'lose' ? -Math.abs(d) : Math.abs(d);
    setPreview(buildStrategy(state, signed, p));
  };

  const accept = () => {
    setGoal(preview.goal);
    setPreview(null);
    setEdit(false);
    Alert.alert('Готово!', 'Цель сохранена. На вкладке «Питание» я веду тебя по ней.');
  };

  return (
    <View style={styles.screen}>
      <Hero
        title="Цель"
        subtitle={goal ? `${goal.targetDeltaKg < 0 ? 'Сбросить' : 'Набрать'} ${Math.abs(goal.targetDeltaKg)} кг · ${dailyTarget(state)} ккал/день` : 'Поставь цель — составлю стратегию'}
      />

      <View style={styles.body}>
        {goal ? (
          <Card style={{ borderColor: colors.accent }}>
            <H2>Текущая цель</H2>
            <Text style={styles.goalMain}>
              {goal.targetDeltaKg < 0 ? 'Сбросить' : 'Набрать'} {Math.abs(goal.targetDeltaKg)} кг за {goal.periodDays} дн.
            </Text>
            <Muted>Норма: {dailyTarget(state)} ккал/день</Muted>
            {goal.macros && <Muted>Б {goal.macros.protein} · Ж {goal.macros.fat} · У {goal.macros.carbs} г</Muted>}
          </Card>
        ) : (
          <Card><Muted>Цель пока не задана. Нажми «Поставить цель» — тренер составит стратегию.</Muted></Card>
        )}

        <Button title={goal ? '✏️ Изменить цель' : '🎯 Поставить цель'} onPress={() => { setPreview(null); setEdit(true); }} style={{ marginTop: spacing(1) }} />

        <RemindersCard />
      </View>

      {/* Окно правки: мои данные + новая цель + стратегия */}
      <Modal visible={edit} animationType="slide" transparent onRequestClose={() => setEdit(false)}>
        <KeyboardAvoidingView style={styles.modalWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.modalCard} contentContainerStyle={{ paddingBottom: spacing(3) }} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHead}>
              <H2>Изменить цель</H2>
              <TouchableOpacity onPress={() => setEdit(false)} style={styles.closeX}><Text style={styles.closeXText}>✕</Text></TouchableOpacity>
            </View>

            <Profile />

            <Card>
              <H2>Новая цель</H2>
              <View style={{ flexDirection: 'row', gap: spacing(1), marginBottom: spacing(1.5) }}>
                <Button title="− Сбросить" kind={dir === 'lose' ? 'primary' : 'ghost'} onPress={() => setDir('lose')} style={{ flex: 1 }} />
                <Button title="+ Набрать" kind={dir === 'gain' ? 'primary' : 'ghost'} onPress={() => setDir('gain')} style={{ flex: 1 }} />
              </View>
              <View style={{ flexDirection: 'row', gap: spacing(1) }}>
                <View style={{ flex: 1 }}><Field label="Килограммов" value={delta} onChangeText={setDelta} keyboardType="decimal-pad" /></View>
                <View style={{ flex: 1 }}><Field label="За сколько дней" value={days} onChangeText={setDays} keyboardType="numeric" /></View>
              </View>
              <Button title="Составить стратегию" onPress={make} />
            </Card>

            {preview && (
              <Card style={{ borderColor: colors.primary }}>
                <H2>💜 Стратегия от тренера</H2>
                <Text style={styles.strategy}>{preview.text}</Text>
                <View style={{ flexDirection: 'row', gap: spacing(1), marginTop: spacing(1.5) }}>
                  <Button title="Переделать" kind="ghost" onPress={() => setPreview(null)} style={{ flex: 1 }} />
                  <Button title="Принять цель" onPress={accept} style={{ flex: 1 }} />
                </View>
              </Card>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing(1.5), gap: spacing(1) },
  goalMain: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: 4 },
  strategy: { color: colors.text, fontSize: 15, lineHeight: 24 },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.bg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing(2), maxHeight: '92%' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(1) },
  closeX: { padding: 6 },
  closeXText: { color: colors.textDim, fontSize: 20, fontWeight: '700' },
});
