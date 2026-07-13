// Правка записанного приёма: поиск в базе, название, граммы, калории.
// Окно вверху экрана + уход от клавиатуры, чтобы iOS-клавиатура не перекрывала поля.
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { colors, spacing, radius } from './theme';
import { Button, H2, Muted } from './ui';
import { scale, per100From, searchFoods } from './foodDB';

export default function EditMeal({ meal, onClose, onSave, onDelete }) {
  const [name, setName] = useState('');
  const [grams, setGrams] = useState('');
  const [kcal, setKcal] = useState('');
  const [per100, setPer100] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (meal) {
      setName(String(meal.name || ''));
      setGrams(meal.grams ? String(meal.grams) : '');
      setKcal(String(Math.round(meal.kcal || 0)));
      setPer100(meal.per100 || (meal.grams ? per100From(meal, meal.grams) : null));
      setQuery('');
    }
  }, [meal]);

  if (!meal) return null;
  const results = query.trim().length > 0 ? searchFoods(query, 12) : [];

  // Выбрать продукт из базы → подставить название и per100, пересчитать ккал по граммам.
  const pickFromBase = (food) => {
    setName(food.name);
    setPer100(food.per100);
    setQuery('');
    const g = Number(grams) || 100;
    const s = scale(food.per100, g);
    setKcal(String(s.kcal));
  };

  const onGrams = (t) => {
    const g = t.replace(/[^0-9]/g, '');
    setGrams(g);
    if (per100 && g) setKcal(String(scale(per100, Number(g)).kcal));
  };

  const save = () => {
    const g = Number(grams) || 0;
    const k = Number(kcal) || 0;
    const patch = { name: name.trim() || 'Блюдо', grams: g, kcal: k };
    // per100 обновляем от финальных калорий, чтобы дальше пересчёт был корректным
    const base = per100 ? { ...per100, kcal: g ? (k / g) * 100 : k } : per100From({ kcal: k }, g || 100);
    patch.per100 = base;
    if (g) { const s = scale(base, g); patch.protein = s.protein; patch.fat = s.fat; patch.carbs = s.carbs; }
    onSave(meal.id, patch);
    onClose();
  };

  return (
    <Modal visible={!!meal} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <View style={styles.card}>
          <View style={styles.header}>
            <H2>Править запись</H2>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeX}>✕</Text></TouchableOpacity>
          </View>

          {/* Поиск в базе — не тот продукт? Найди и выбери */}
          <Text style={styles.label}>Найти в базе (если блюдо не то)</Text>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="напр. хлеб тост"
            placeholderTextColor={colors.textDim}
          />
          {results.length > 0 && (
            <ScrollView style={styles.results} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              {results.map((f) => (
                <TouchableOpacity key={f.name} style={styles.resRow} onPress={() => pickFromBase(f)}>
                  <Text style={styles.resName}>{f.name}</Text>
                  <Muted>{f.per100.kcal} / 100 г</Muted>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <Text style={styles.label}>Название</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="блюдо" placeholderTextColor={colors.textDim} />

          <View style={{ flexDirection: 'row', gap: spacing(1.5) }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Граммы</Text>
              <TextInput style={styles.input} value={grams} onChangeText={onGrams} placeholder="0" placeholderTextColor={colors.textDim} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Калории</Text>
              <TextInput style={styles.input} value={kcal} onChangeText={(t) => setKcal(t.replace(/[^0-9]/g, ''))} placeholder="0" placeholderTextColor={colors.textDim} keyboardType="numeric" />
            </View>
          </View>
          <Muted style={{ marginTop: 4 }}>Меняешь граммы — калории пересчитаются. Калории можно вписать и вручную.</Muted>

          <View style={{ flexDirection: 'row', gap: spacing(1), marginTop: spacing(2) }}>
            <Button title="Удалить" kind="danger" onPress={() => { onDelete(meal.id); onClose(); }} style={{ flex: 1 }} />
            <Button title="Сохранить" onPress={save} style={{ flex: 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-start', paddingTop: spacing(7) },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, marginHorizontal: spacing(1.5), padding: spacing(2.5), borderWidth: 1, borderColor: colors.line },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(0.5) },
  closeX: { color: colors.textDim, fontSize: 20, fontWeight: '700', padding: 6 },
  label: { color: colors.textDim, fontSize: 13, marginTop: spacing(1), marginBottom: 5 },
  input: {
    backgroundColor: colors.cardAlt, borderRadius: radius.sm, paddingHorizontal: spacing(1.5), paddingVertical: spacing(1.25),
    color: colors.text, fontSize: 16, borderWidth: 1, borderColor: colors.line,
  },
  results: { maxHeight: 190, marginTop: spacing(0.5), borderWidth: 1, borderColor: colors.primaryDim, borderRadius: radius.sm },
  resRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing(1), paddingHorizontal: spacing(1.25), borderBottomWidth: 1, borderBottomColor: colors.line },
  resName: { color: colors.text, fontSize: 15, flex: 1 },
});
