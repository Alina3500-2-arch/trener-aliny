// Ручной ввод: поиск продукта + граммы → калории считаются сами из базы.
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { colors, spacing, radius } from './theme';
import { Button, H2, Muted } from './ui';
import { searchFoods, scale, makeItem } from './foodDB';
import { parseMeal } from './ai';

// Округление для отображения: ккал — целое, БЖУ — 1 знак (чтобы не было длинных дробей).
const r0 = (n) => Math.round(Number(n) || 0);
const r1 = (n) => +(Number(n) || 0).toFixed(1);

export default function ManualAdd({ visible, mealType, mealLabel, onClose, onSave, onAddFood, customFoods = [], onRemoveCustomFood, favorites = [], onAddFavorite, onRemoveFavorite }) {
  const isFav = (name) => favorites.some((f) => f.name.trim().toLowerCase() === String(name).trim().toLowerCase());
  const toggleFav = (food) => {
    if (isFav(food.name)) onRemoveFavorite && onRemoveFavorite(food.name);
    else onAddFavorite && onAddFavorite({ name: food.name, per100: food.per100 });
  };
  const [query, setQuery] = useState('');
  const [showFav, setShowFav] = useState(false); // раздел «Избранное» (по кнопке-сердечку)
  const [selected, setSelected] = useState(null);
  const [grams, setGrams] = useState('');
  const [pending, setPending] = useState([]);
  const [aiGrams, setAiGrams] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [customMode, setCustomMode] = useState(false); // форма своего продукта
  const [cKcal, setCKcal] = useState('');
  const [cP, setCP] = useState('');
  const [cF, setCF] = useState('');
  const [cC, setCC] = useState('');

  const results = searchFoods(query);
  const computed = selected && grams ? scale(selected.per100, grams) : null;

  const reset = () => {
    setQuery(''); setSelected(null); setGrams(''); setPending([]);
    setCustomMode(false); setCKcal(''); setCP(''); setCF(''); setCC('');
  };

  // Сохранить свой продукт в базу и сразу выбрать его (тем же именем — заменит существующий).
  const saveCustom = () => {
    const name = query.trim();
    if (!name || !cKcal) return;
    const per100 = {
      kcal: r0(cKcal),
      protein: r1(cP),
      fat: r1(cF),
      carbs: r1(cC),
    };
    onAddFood && onAddFood({ name, per100 });
    setSelected({ name, per100 });
    setCustomMode(false); setCKcal(''); setCP(''); setCF(''); setCC(''); setGrams('');
  };

  // Открыть форму правки своего продукта (значения предзаполнены; сохранение заменит запись).
  const editCustom = (food) => {
    setQuery(food.name);
    setCKcal(String(r0(food.per100.kcal)));
    setCP(String(r1(food.per100.protein)));
    setCF(String(r1(food.per100.fat)));
    setCC(String(r1(food.per100.carbs)));
    setCustomMode(true);
  };
  const deleteCustom = (name) => onRemoveCustomFood && onRemoveCustomFood(name);

  const close = () => { reset(); onClose(); };

  const scrollRef = useRef(null);
  const pick = (food) => { setSelected(food); setGrams(''); setShowFav(false); scrollRef.current?.scrollTo({ y: 0, animated: false }); };

  const addItem = () => {
    if (!selected || !grams) return;
    setPending((p) => [...p, makeItem(selected.name, grams, selected.per100)]);
    setSelected(null); setGrams(''); setQuery('');
  };

  const removePending = (idx) => setPending((p) => p.filter((_, i) => i !== idx));

  const saveAll = () => {
    pending.forEach((it) => onSave(mealType, it));
    close();
  };

  const total = pending.reduce((a, i) => a + i.kcal, 0);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={close} />
        <ScrollView ref={scrollRef} style={styles.card} contentContainerStyle={{ paddingBottom: spacing(4) }} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <H2>{mealLabel || 'Добавить'} — вручную</H2>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {!selected && (
                <TouchableOpacity onPress={() => setShowFav((v) => !v)} style={styles.favToggle}>
                  <Text style={styles.favToggleText}>{showFav ? '‹ Назад' : '❤️ Избранное'}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={close} style={styles.closeX}><Text style={styles.closeXText}>✕</Text></TouchableOpacity>
            </View>
          </View>

          {!selected ? showFav ? (
            /* === Раздел «Избранное + Мои продукты» (по кнопке-сердечку) === */
            <>
              <Text style={styles.favTitle}>❤️ Избранное</Text>
              {favorites.length === 0 ? (
                <Muted style={{ marginTop: spacing(0.5) }}>Пусто. Добавляй сердечком после выбора продукта.</Muted>
              ) : (
                favorites.map((f) => (
                  <TouchableOpacity key={f.name} onPress={() => pick(f)} style={styles.resRow} activeOpacity={0.7}>
                    <Text style={styles.resName}>{f.name}</Text>
                    <Text style={styles.resKcal}>{r0(f.per100.kcal)} ккал</Text>
                    <TouchableOpacity onPress={() => toggleFav(f)} style={styles.heartBtn}><Text style={styles.heartOn}>❤️</Text></TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}
              {customFoods.length > 0 && (
                <>
                  <Text style={[styles.favTitle, { marginTop: spacing(1.5) }]}>🧾 Мои продукты</Text>
                  {customFoods.map((f) => (
                    <View key={f.name} style={styles.resRow}>
                      <TouchableOpacity onPress={() => pick(f)} style={{ flex: 1 }} activeOpacity={0.7}>
                        <Text style={styles.resName}>{f.name}</Text>
                      </TouchableOpacity>
                      <Text style={styles.resKcal}>{r0(f.per100.kcal)} ккал</Text>
                      <TouchableOpacity onPress={() => editCustom(f)} style={styles.iconBtn}><Text style={styles.iconEdit}>✏️</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteCustom(f.name)} style={styles.iconBtn}><Text style={styles.iconDel}>🗑</Text></TouchableOpacity>
                    </View>
                  ))}
                </>
              )}
            </>
          ) : (
            <>
              <TextInput
                style={styles.search}
                value={query}
                onChangeText={setQuery}
                placeholder="Найди продукт: гречка, курица…"
                placeholderTextColor={colors.textDim}
                autoFocus
              />

              {!query.trim() && !customMode && (
                <Muted style={{ marginTop: spacing(0.5) }}>Печатай продукт, а «❤️ Избранное» сверху — твои сохранённые и свои продукты.</Muted>
              )}

              {/* Результаты поиска — вся строка кликабельна, без сердечек. */}
              {!!query.trim() && results.map((f, i) => (
                <TouchableOpacity key={`${f.name}-${i}`} onPress={() => pick(f)} style={styles.resRow} activeOpacity={0.7}>
                  <Text style={styles.resName}>{f.name}</Text>
                  <Text style={styles.resKcal}>{r0(f.per100.kcal)} ккал</Text>
                  {f.custom && (
                    <>
                      <TouchableOpacity onPress={() => editCustom(f)} style={styles.iconBtn}><Text style={styles.iconEdit}>✏️</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteCustom(f.name)} style={styles.iconBtn}><Text style={styles.iconDel}>🗑</Text></TouchableOpacity>
                    </>
                  )}
                </TouchableOpacity>
              ))}
              {results.length === 0 && query.trim().length > 1 && !customMode && (
                <View style={styles.selBox}>
                  <Text style={styles.selName}>«{query}» нет в базе</Text>
                  <Muted>Посчитай через ИИ или добавь свой продукт (сохранится навсегда).</Muted>
                  <View style={{ flexDirection: 'row', gap: spacing(1), marginTop: spacing(1), alignItems: 'center' }}>
                    <TextInput
                      style={[styles.gramsInput, { flex: 1, fontSize: 16, paddingVertical: spacing(1) }]}
                      value={aiGrams}
                      onChangeText={(t) => setAiGrams(t.replace(/[^0-9]/g, ''))}
                      placeholder="граммы"
                      placeholderTextColor={colors.textDim}
                      keyboardType="numeric"
                    />
                    <Button
                      title={aiLoading ? '…' : 'Посчитать ИИ'}
                      disabled={aiLoading || !aiGrams}
                      onPress={async () => {
                        setAiLoading(true);
                        try {
                          const res = await parseMeal([`${query}, ${aiGrams} грамм`]);
                          const its = res.items || [];
                          if (its.length) { setPending((p) => [...p, ...its]); setQuery(''); setAiGrams(''); }
                        } catch (e) {}
                        setAiLoading(false);
                      }}
                    />
                  </View>
                  <Button title="➕ Добавить свой продукт" kind="soft" onPress={() => setCustomMode(true)} style={{ marginTop: spacing(1) }} />
                </View>
              )}

              {/* Форма своего продукта: КБЖУ на 100 г */}
              {customMode && (
                <View style={styles.selBox}>
                  <Text style={styles.selName}>Свой продукт: {query}</Text>
                  <Muted>Значения на 100 грамм (с упаковки).</Muted>
                  <Text style={styles.label}>Калории на 100 г *</Text>
                  <TextInput
                    style={[styles.gramsInput, { fontSize: 18 }]}
                    value={cKcal} onChangeText={(t) => setCKcal(t.replace(/[^0-9]/g, ''))}
                    placeholder="напр. 250" placeholderTextColor={colors.textDim} keyboardType="numeric" autoFocus
                  />
                  <View style={{ flexDirection: 'row', gap: spacing(1), marginTop: spacing(1) }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Белки</Text>
                      <TextInput style={styles.macroInput} value={cP} onChangeText={(t) => setCP(t.replace(/[^0-9.]/g, ''))} placeholder="0" placeholderTextColor={colors.textDim} keyboardType="numeric" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Жиры</Text>
                      <TextInput style={styles.macroInput} value={cF} onChangeText={(t) => setCF(t.replace(/[^0-9.]/g, ''))} placeholder="0" placeholderTextColor={colors.textDim} keyboardType="numeric" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Углеводы</Text>
                      <TextInput style={styles.macroInput} value={cC} onChangeText={(t) => setCC(t.replace(/[^0-9.]/g, ''))} placeholder="0" placeholderTextColor={colors.textDim} keyboardType="numeric" />
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: spacing(1), marginTop: spacing(1.5) }}>
                    <Button title="Отмена" kind="ghost" onPress={() => setCustomMode(false)} style={{ flex: 1 }} />
                    <Button title="Сохранить" onPress={saveCustom} disabled={!cKcal} style={{ flex: 1 }} />
                  </View>
                </View>
              )}
            </>
          ) : (
            <>
              <View style={styles.selBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.selName}>{selected.name}</Text>
                  <TouchableOpacity onPress={() => toggleFav(selected)}>
                    <Text style={isFav(selected.name) ? styles.heartOn : styles.heartOff}>{isFav(selected.name) ? '❤️' : '🤍'}</Text>
                  </TouchableOpacity>
                </View>
                <Muted>{r0(selected.per100.kcal)} ккал / 100 г · Б {r1(selected.per100.protein)} Ж {r1(selected.per100.fat)} У {r1(selected.per100.carbs)}</Muted>
              </View>
              <Text style={styles.label}>Сколько грамм?</Text>
              <View style={styles.gramsRow}>
                <TouchableOpacity onPress={() => setGrams(String(Math.max(0, (Number(grams) || 0) - 10)))} style={styles.gStep}><Text style={styles.gStepText}>−</Text></TouchableOpacity>
                <TextInput
                  style={styles.gramsInput}
                  value={grams}
                  onChangeText={(t) => setGrams(t.replace(/[^0-9]/g, ''))}
                  placeholder="100"
                  placeholderTextColor={colors.textDim}
                  keyboardType="numeric"
                  autoFocus
                />
                <TouchableOpacity onPress={() => setGrams(String((Number(grams) || 0) + 10))} style={styles.gStep}><Text style={styles.gStepText}>+</Text></TouchableOpacity>
              </View>
              {computed && (
                <Text style={styles.computed}>= {computed.kcal} ккал  ·  Б {computed.protein} Ж {computed.fat} У {computed.carbs}</Text>
              )}
              <View style={{ flexDirection: 'row', gap: spacing(1), marginTop: spacing(1.5) }}>
                <Button title="Назад" kind="ghost" onPress={() => setSelected(null)} style={{ flex: 1 }} />
                <Button title="Добавить" onPress={addItem} disabled={!grams} style={{ flex: 1 }} />
              </View>
            </>
          )}

          {pending.length > 0 && (
            <View style={{ marginTop: spacing(2) }}>
              <Muted>Добавлено:</Muted>
              {pending.map((it, idx) => (
                <View key={idx} style={styles.pendRow}>
                  <Text style={styles.pendName}>{it.name}</Text>
                  {it.grams ? <Text style={styles.pendGrams}>{it.grams} г</Text> : null}
                  <Text style={styles.pendKcal}>{it.kcal} ккал</Text>
                  <TouchableOpacity onPress={() => removePending(idx)} style={styles.delBtn}><Text style={styles.delText}>✕</Text></TouchableOpacity>
                </View>
              ))}
              <Text style={styles.total}>Итого: {total} ккал</Text>
              <Button title="Записать" onPress={saveAll} style={{ marginTop: spacing(1) }} />
            </View>
          )}

          <Button title="Закрыть" kind="ghost" onPress={close} style={{ marginTop: spacing(1.5) }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  card: { backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing(2.5), maxHeight: '88%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(1) },
  closeX: { padding: 8 },
  closeXText: { color: colors.textDim, fontSize: 22, fontWeight: '700' },
  search: {
    backgroundColor: colors.cardAlt, borderRadius: radius.sm, paddingHorizontal: spacing(1.5), paddingVertical: spacing(1.5),
    color: colors.text, fontSize: 17, borderWidth: 1, borderColor: colors.line, marginVertical: spacing(1),
  },
  resRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing(1.5), borderBottomWidth: 1, borderBottomColor: colors.line },
  resName: { color: colors.text, fontSize: 17, flex: 1, fontWeight: '600' },
  resKcal: { color: colors.accent, fontSize: 15, fontWeight: '800', marginLeft: spacing(1) },
  favBlock: { marginBottom: spacing(1) },
  favTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 2 },
  heartBtn: { paddingLeft: spacing(1), paddingVertical: 2 },
  heartOn: { fontSize: 18 },
  heartOff: { fontSize: 18, opacity: 0.5 },
  favToggle: { paddingHorizontal: spacing(1), paddingVertical: 4, marginRight: 4, borderRadius: 999, backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.primaryDim },
  favToggleText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  iconBtn: { paddingLeft: spacing(1), paddingVertical: 2 },
  iconEdit: { fontSize: 16 },
  iconDel: { fontSize: 16 },
  selBox: { backgroundColor: colors.cardAlt, borderRadius: radius.md, padding: spacing(1.75), marginVertical: spacing(1), borderWidth: 1, borderColor: colors.primaryDim },
  selName: { color: colors.text, fontSize: 19, fontWeight: '800' },
  label: { color: colors.textDim, marginTop: spacing(1), marginBottom: 6, fontSize: 14, fontWeight: '600' },
  gramsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  gStep: { width: 52, height: 52, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.primary },
  gStepText: { color: colors.primary, fontSize: 28, fontWeight: '800' },
  gramsInput: {
    flex: 1, backgroundColor: colors.cardAlt, borderRadius: radius.sm, paddingHorizontal: spacing(1.5), paddingVertical: spacing(1.5),
    color: colors.text, fontSize: 26, fontWeight: '800', textAlign: 'center', borderWidth: 1, borderColor: colors.line,
  },
  computed: { color: colors.accent, fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: spacing(1) },
  macroInput: {
    backgroundColor: colors.cardAlt, borderRadius: radius.sm, paddingHorizontal: spacing(1), paddingVertical: spacing(1),
    color: colors.text, fontSize: 15, textAlign: 'center', borderWidth: 1, borderColor: colors.line,
  },
  pendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing(1), borderBottomWidth: 1, borderBottomColor: colors.line },
  pendName: { color: colors.text, fontSize: 15, flex: 1 },
  pendGrams: { color: colors.textDim, fontSize: 14, marginRight: spacing(1) },
  pendKcal: { color: colors.accent, fontSize: 15, fontWeight: '800', marginRight: spacing(1) },
  delBtn: { padding: 4 },
  delText: { color: colors.danger, fontSize: 16, fontWeight: '700' },
  total: { color: colors.text, fontSize: 17, fontWeight: '800', marginTop: spacing(1), textAlign: 'right' },
});
