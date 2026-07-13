// Окно поиска блюда по базе. Нажал на название → ищешь → выбираешь из базы,
// либо «не найдено» → добавить новое блюдо (сохранится в базу).
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { colors, spacing, radius } from './theme';
import { Button, Muted } from './ui';
import { searchFoods } from './foodDB';

export default function FoodSearchModal({ visible, initialQuery = '', onPick, onAddNew, onRename, onClose }) {
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [cKcal, setCKcal] = useState('');
  const [cP, setCP] = useState('');
  const [cF, setCF] = useState('');
  const [cC, setCC] = useState('');

  useEffect(() => {
    if (visible) { setQ(initialQuery || ''); setAdding(false); setCKcal(''); setCP(''); setCF(''); setCC(''); }
  }, [visible, initialQuery]);

  const results = q.trim().length > 0 ? searchFoods(q, 15) : [];

  const saveNew = () => {
    const name = q.trim();
    if (!name || !cKcal) return;
    onAddNew({ name, per100: { kcal: Number(cKcal) || 0, protein: Number(cP) || 0, fat: Number(cF) || 0, carbs: Number(cC) || 0 } });
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Найти блюдо</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.close}>✕</Text></TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            value={q}
            onChangeText={(t) => { setQ(t); setAdding(false); }}
            placeholder="напр. тост ржаной"
            placeholderTextColor={colors.textDim}
            autoFocus
          />

          {!adding && results.length > 0 && (
            <ScrollView style={styles.results} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              {results.map((f, i) => (
                <TouchableOpacity key={`${f.name}-${i}`} style={styles.row} onPress={() => onPick(f)}>
                  <Text style={styles.rowName}>{f.name}</Text>
                  <Muted>{f.per100.kcal} / 100 г</Muted>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {!adding && q.trim().length > 0 && (
            <View style={styles.empty}>
              {onRename && (
                <Button title={`✓ Оставить название «${q.trim()}»`} kind="soft" onPress={() => onRename(q.trim())} style={{ marginBottom: spacing(1) }} />
              )}
              {results.length === 0 && (
                <Muted style={{ textAlign: 'center', marginBottom: spacing(1) }}>В базе не найдено</Muted>
              )}
              <Button title="➕ Добавить в базу (с калориями)" kind="ghost" onPress={() => setAdding(true)} />
            </View>
          )}

          {adding && (
            <View style={{ marginTop: spacing(1) }}>
              <Text style={styles.selName}>Новое блюдо: {q.trim()}</Text>
              <Muted>Значения на 100 грамм (с упаковки).</Muted>
              <Text style={styles.label}>Калории на 100 г *</Text>
              <TextInput style={[styles.input, { fontSize: 18 }]} value={cKcal} onChangeText={(t) => setCKcal(t.replace(/[^0-9]/g, ''))} placeholder="напр. 250" placeholderTextColor={colors.textDim} keyboardType="numeric" autoFocus />
              <View style={{ flexDirection: 'row', gap: spacing(1), marginTop: spacing(1) }}>
                <View style={{ flex: 1 }}><Text style={styles.label}>Белки</Text><TextInput style={styles.macro} value={cP} onChangeText={(t) => setCP(t.replace(/[^0-9.]/g, ''))} placeholder="0" placeholderTextColor={colors.textDim} keyboardType="numeric" /></View>
                <View style={{ flex: 1 }}><Text style={styles.label}>Жиры</Text><TextInput style={styles.macro} value={cF} onChangeText={(t) => setCF(t.replace(/[^0-9.]/g, ''))} placeholder="0" placeholderTextColor={colors.textDim} keyboardType="numeric" /></View>
                <View style={{ flex: 1 }}><Text style={styles.label}>Углев.</Text><TextInput style={styles.macro} value={cC} onChangeText={(t) => setCC(t.replace(/[^0-9.]/g, ''))} placeholder="0" placeholderTextColor={colors.textDim} keyboardType="numeric" /></View>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing(1), marginTop: spacing(1.5) }}>
                <Button title="Назад" kind="ghost" onPress={() => setAdding(false)} style={{ flex: 1 }} />
                <Button title="Сохранить" onPress={saveNew} disabled={!cKcal} style={{ flex: 1 }} />
              </View>
            </View>
          )}

          {!adding && (
            <Button title="Закрыть" kind="ghost" onPress={onClose} style={{ marginTop: spacing(1.5) }} />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-start', paddingTop: spacing(7) },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, marginHorizontal: spacing(1.5), padding: spacing(2.5), borderWidth: 1, borderColor: colors.primaryDim },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(1) },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  close: { color: colors.textDim, fontSize: 20, fontWeight: '700', padding: 4 },
  input: { backgroundColor: colors.cardAlt, borderRadius: radius.sm, paddingHorizontal: spacing(1.5), paddingVertical: spacing(1.25), color: colors.text, fontSize: 16, borderWidth: 1, borderColor: colors.line },
  results: { maxHeight: 240, marginTop: spacing(1), borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing(1), paddingHorizontal: spacing(1.25), borderBottomWidth: 1, borderBottomColor: colors.line },
  rowName: { color: colors.text, fontSize: 15, flex: 1 },
  empty: { marginTop: spacing(2), alignItems: 'stretch' },
  selName: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: spacing(1) },
  label: { color: colors.textDim, fontSize: 12, marginTop: spacing(1), marginBottom: 4 },
  macro: { backgroundColor: colors.cardAlt, borderRadius: radius.sm, paddingVertical: spacing(1), color: colors.text, fontSize: 15, textAlign: 'center', borderWidth: 1, borderColor: colors.line },
});
