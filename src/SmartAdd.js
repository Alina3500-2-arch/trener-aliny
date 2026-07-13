// Голосовой диалог записи еды: запись сразу → распознавание → уточнения → правка → запись.
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, ActivityIndicator, TouchableOpacity, Animated, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useAudioRecorder, useAudioRecorderState, AudioModule, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { colors, spacing, radius } from './theme';
import { Button, Field, H2, Muted } from './ui';
import { parseMeal, parseFood, parseDayMeals, parseMealPhoto, transcribeAudio, hasApiKey } from './ai';
import { scale, per100From } from './foodDB';
import FoodSearchModal from './FoodSearchModal';

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Завтрак' },
  { key: 'brunch', label: 'Ланч' },
  { key: 'lunch', label: 'Обед' },
  { key: 'snack', label: 'Полдник' },
  { key: 'dinner', label: 'Ужин' },
];

// Штучные/порционные продукты: слова → сколько грамм в одной порции и как её назвать.
const UNIT_HINTS = [
  { m: ['яйцо', 'яйца', 'яиц', 'яйке'], label: 'шт', grams: 60 },
  { m: ['хлеб', 'тост', 'батон', 'булк'], label: 'кусок', grams: 25 },
  { m: ['сыр', 'сулугуни', 'моцарел'], label: 'кусок', grams: 20 },
  { m: ['колбас', 'ветчин', 'бекон', 'салями'], label: 'кусок', grams: 20 },
  { m: ['сахар'], label: 'ложка', grams: 5 },
  { m: ['мёд', 'мед', 'варень', 'джем', 'сгущ', 'сметан', 'масло', 'паста'], label: 'ложка', grams: 15 },
  { m: ['банан'], label: 'шт', grams: 120 },
  { m: ['яблоко', 'апельсин', 'груша', 'персик'], label: 'шт', grams: 150 },
  { m: ['мандарин', 'киви', 'слива', 'абрикос'], label: 'шт', grams: 60 },
  { m: ['печенье', 'конфет', 'пряник', 'вафл'], label: 'шт', grams: 15 },
  { m: ['сосиск', 'сардел'], label: 'шт', grams: 50 },
  { m: ['котлет', 'сырник', 'блин', 'оладь', 'пельмен', 'вареник'], label: 'шт', grams: 50 },
  { m: ['орех', 'миндал', 'фундук', 'кешью'], label: 'горсть', grams: 30 },
  { m: ['чай', 'кофе', 'сок', 'молоко', 'кефир', 'вода', 'компот', 'какао'], label: 'стакан', grams: 200 },
];
function unitFor(name) {
  const n = String(name || '').toLowerCase();
  return UNIT_HINTS.find((u) => u.m.some((w) => n.includes(w))) || null;
}

function fmt(ms) {
  const s = Math.floor((ms || 0) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Анимированная «шкала голоса» — 5 полосок
function EqBars({ active }) {
  const vals = useRef([...Array(5)].map(() => new Animated.Value(0.3))).current;
  useEffect(() => {
    if (!active) return;
    const loops = vals.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: 300 + i * 90, useNativeDriver: false }),
          Animated.timing(v, { toValue: 0.3, duration: 300 + i * 90, useNativeDriver: false }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [active]);
  return (
    <View style={styles.eqRow}>
      {vals.map((v, i) => (
        <Animated.View key={i} style={[styles.eqBar, { transform: [{ scaleY: v }] }]} />
      ))}
    </View>
  );
}

export default function SmartAdd({ visible, onClose, onSave, onAddFood, defaultType = 'breakfast', autoStart = false, startMode = null, dayMode = false }) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recState = useAudioRecorderState(recorder, 200);

  const [phase, setPhase] = useState('idle'); // idle | recording | processing | draft | question | result
  const [status, setStatus] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [history, setHistory] = useState([]);
  const [draftText, setDraftText] = useState(''); // редактируемый черновик того, что услышал
  const [question, setQuestion] = useState('');
  const [items, setItems] = useState(null);
  const [mealType, setMealType] = useState(defaultType);
  const [textInput, setTextInput] = useState('');
  const [photoB64, setPhotoB64] = useState(null); // если задан — диалог идёт по фото
  const [photoUri, setPhotoUri] = useState(null);  // превью снимка
  const [savedIdx, setSavedIdx] = useState({});    // какие позиции добавлены в базу
  const [dayMeals, setDayMeals] = useState(null);  // режим «весь день»: [{ type, items }]
  const started = useRef(false);

  useEffect(() => { setMealType(defaultType); }, [defaultType, visible]);

  // Сброс флага автостарта при закрытии.
  useEffect(() => { if (!visible) started.current = false; }, [visible]);

  // Голос стартуем сразу при открытии (надёжно). Камеру — через Modal onShow ниже,
  // иначе на iOS она открывается поверх ещё анимирующейся модалки и не появляется.
  useEffect(() => {
    if (visible && autoStart && startMode !== 'photo' && !started.current) {
      started.current = true;
      startRec();
    }
  }, [visible, autoStart, startMode]);
  const handleShown = () => {
    if (startMode === 'photo' && !started.current) {
      started.current = true;
      takePhoto();
    }
  };

  const reset = () => {
    setPhase('idle'); setStatus(''); setErrorMsg(''); setHistory([]);
    setQuestion(''); setItems(null); setTextInput(''); setDraftText('');
    setPhotoB64(null); setPhotoUri(null); setSavedIdx({}); setDayMeals(null);
  };

  // Сохранить позицию в свою базу (per100 уже посчитан).
  const saveToBase = (idx) => {
    const it = items[idx];
    if (!it || !it.per100 || !onAddFood) return;
    onAddFood({ name: String(it.name || 'Блюдо'), per100: it.per100 });
    setSavedIdx((prev) => ({ ...prev, [idx]: true }));
  };
  const close = async () => {
    try { if (phase === 'recording') await recorder.stop(); } catch (e) {}
    reset(); onClose();
  };

  const startRec = async () => {
    setErrorMsg('');
    if (!hasApiKey()) { setErrorMsg('ИИ не подключён (нет ключа Groq).'); setPhase('idle'); return; }
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) { setErrorMsg('Нет доступа к микрофону. Разреши в настройках телефона.'); setPhase('idle'); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setPhase('recording');
    } catch (e) {
      setErrorMsg('Не удалось начать запись: ' + String(e.message || e));
      setPhase('idle');
    }
  };

  // Сфотографировать блюдо камерой и распознать через ИИ-зрение.
  const takePhoto = async () => {
    setErrorMsg('');
    if (!hasApiKey()) { setErrorMsg('ИИ не подключён (нет ключа Groq).'); setPhase('idle'); return; }
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { setErrorMsg('Нет доступа к камере. Разреши в настройках телефона.'); setPhase('idle'); return; }
      const shot = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.5,
        base64: true,
        allowsEditing: false,
      });
      if (shot.canceled || !shot.assets?.[0]) { setPhase('idle'); return; }
      const asset = shot.assets[0];
      if (!asset.base64) { setErrorMsg('Не удалось получить снимок.'); setPhase('idle'); return; }
      setPhotoB64(asset.base64);
      setPhotoUri(asset.uri);
      // Стартуем диалог по фото (history пустой — фото уже в контексте запроса).
      await runPhotoDialog(asset.base64, []);
    } catch (e) {
      setErrorMsg('Не удалось сделать фото: ' + String(e.message || e));
      setPhase('idle');
    }
  };

  // Запрос к vision-модели по снимку с текущей историей ответов.
  const runPhotoDialog = async (b64, hist) => {
    setPhase('processing');
    setStatus('Смотрю на фото…');
    try {
      const res = await parseMealPhoto(b64, hist);
      if (res.nofood) { setErrorMsg('На фото не вижу еды 🤔 Сфотографируй блюдо поближе.'); setPhase('idle'); setPhotoB64(null); setPhotoUri(null); }
      else if (res.question) { setQuestion(res.question); setPhase('question'); }
      else if (res.items && res.items.length) { setItems(res.items); setPhase('result'); }
      else { setErrorMsg('На фото не видно еды — попробуй ещё раз.'); setPhase('idle'); setPhotoB64(null); setPhotoUri(null); }
    } catch (e) {
      setErrorMsg('Ошибка: ' + String(e.message || e));
      setPhase(hist.length ? 'question' : 'idle');
    }
  };

  // Остановить запись, распознать и СРАЗУ разложить в таблицу (граммы/ккал), без промежуточного текста.
  const stopAndProcess = async () => {
    setPhase('processing');
    setStatus('Распознаю речь…');
    setErrorMsg('');
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error('Файл записи не создан.');
      const heard = await transcribeAudio(uri);
      if (!heard) {
        setErrorMsg('Речь не распознана — запись пустая или тихая. Скажи чуть громче и подольше.');
        setPhase('idle');
        return;
      }
      setDraftText(heard); // сохраняем на случай правки/ошибки разбора
      await processText(heard);
    } catch (e) {
      setErrorMsg('Ошибка: ' + String(e.message || e));
      setPhase('idle');
    }
  };

  // Разобрать текст в позиции: dayMode → по приёмам; иначе → таблица. Ошибка/пусто → черновик для правки.
  const processText = async (text) => {
    const t = String(text || '').trim();
    if (!t) return;
    setPhase('processing');
    setStatus(dayMode ? 'Раскладываю по приёмам…' : 'Считаю по базе…');
    setErrorMsg('');
    try {
      if (dayMode) {
        const res = await parseDayMeals(t);
        if (res.meals && res.meals.length) {
          setDayMeals(res.meals.map((m) => ({ ...m, label: MEAL_TYPES.find((x) => x.key === m.type)?.label || m.type })));
          setPhase('dayResult');
        } else { setErrorMsg('Не разобрала приёмы. Поправь текст и нажми «Посчитать».'); setDraftText(t); setPhase('draft'); }
        return;
      }
      const res = await parseFood(t);
      if (res.items && res.items.length) { setItems(res.items); setPhase('result'); }
      else { setErrorMsg('Не нашла тут еды. Поправь текст и нажми «Посчитать».'); setDraftText(t); setPhase('draft'); }
    } catch (e) {
      setErrorMsg('Ошибка: ' + String(e.message || e)); setDraftText(t); setPhase('draft');
    }
  };

  // Открыть черновик из набранного текста
  const goDraft = (text) => {
    const t = String(text || '').trim();
    if (!t) return;
    setErrorMsg('');
    setDraftText(t);
    setTextInput('');
    setPhase('draft');
  };

  // Подтвердить черновик → разобрать в таблицу (name/граммы/ккал).
  // В режиме «весь день» — разложить по приёмам пищи.
  const confirmDraft = async () => { await processText(draftText); };

  // Удалить позицию в режиме «весь день»; пустой приём убираем.
  const removeDayItem = (gi, ii) => {
    setDayMeals((prev) => prev
      .map((g, i) => (i === gi ? { ...g, items: g.items.filter((_, j) => j !== ii) } : g))
      .filter((g) => g.items.length));
  };
  // Новое блюдо (оценка ИИ, нет в базе) — сохраняем в базу автоматически, чтобы потом бралось из неё.
  const autoSaveToBase = (it) => {
    if (it.fromDB || !onAddFood) return;
    const per100 = it.per100 || per100From(it, it.grams || 100);
    if (per100 && (Number(per100.kcal) > 0)) onAddFood({ name: String(it.name || 'Блюдо'), per100 });
  };
  // Записать сразу все приёмы дня по их типам.
  const saveAllDay = () => {
    (dayMeals || []).forEach((g) => g.items.forEach((it) => {
      autoSaveToBase(it);
      onSave(g.type, {
        name: String(it.name || 'Блюдо'),
        grams: Math.round(Number(it.grams) || 0),
        per100: it.per100 || per100From(it, it.grams || 100),
        kcal: Math.round(Number(it.kcal) || 0),
        protein: Math.round(Number(it.protein) || 0),
        fat: Math.round(Number(it.fat) || 0),
        carbs: Math.round(Number(it.carbs) || 0),
      });
    }));
    close();
  };
  const dayTotal = dayMeals ? dayMeals.reduce((a, g) => a + g.items.reduce((s, it) => s + (Number(it.kcal) || 0), 0), 0) : 0;

  // Добавить реплику в диалог и спросить ИИ (голос/текст или фото)
  const continueDialog = async (utterance) => {
    const newHistory = [...history, utterance];
    setHistory(newHistory);
    // Если диалог идёт по фото — используем vision-разбор.
    if (photoB64) { await runPhotoDialog(photoB64, newHistory); return; }
    setPhase('processing');
    setStatus('Считаю…');
    try {
      const res = await parseMeal(newHistory);
      if (res.question) {
        setQuestion(res.question);
        setPhase('question');
      } else if (res.items && res.items.length) {
        setItems(res.items);
        setPhase('result');
      } else {
        setErrorMsg('Про еду не поняла — скажи, что именно съела.');
        setPhase('idle');
      }
    } catch (e) {
      setErrorMsg('Ошибка: ' + String(e.message || e));
      setPhase('question');
    }
  };

  const sendText = async () => {
    if (!textInput.trim()) return;
    const t = textInput.trim();
    setTextInput('');
    await continueDialog(t);
  };

  const editName = (idx, value) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, name: value } : it)));
  };

  // Поиск по базе для названия позиции.
  const [searchIdx, setSearchIdx] = useState(null);
  const applyFood = (it, food) => {
    const g = it.grams || 100;
    const s = scale(food.per100, g);
    return { ...it, name: food.name, per100: food.per100, grams: g, kcal: s.kcal, protein: s.protein, fat: s.fat, carbs: s.carbs, fromDB: true };
  };
  const pickForItem = (food) => {
    setItems((prev) => prev.map((it, i) => (i === searchIdx ? applyFood(it, food) : it)));
    setSearchIdx(null);
  };
  const addNewForItem = (food) => {
    if (onAddFood) onAddFood(food); // сохранить в базу
    setItems((prev) => prev.map((it, i) => (i === searchIdx ? applyFood(it, food) : it)));
    setSearchIdx(null);
  };
  // Просто оставить своё название (переименовать), калории не трогаем.
  const renameForItem = (name) => {
    setItems((prev) => prev.map((it, i) => (i === searchIdx ? { ...it, name } : it)));
    setSearchIdx(null);
  };
  // Добавить ещё одно блюдо в список (без повторной записи).
  const addEmptyItem = () => {
    setItems((prev) => [...(prev || []), { name: 'Новое блюдо', grams: 100, kcal: 0, protein: 0, fat: 0, carbs: 0, per100: { kcal: 0, protein: 0, fat: 0, carbs: 0 }, fromAI: true }]);
  };

  // Меняем граммы → ккал и БЖУ пересчитываются из per100 (из базы).
  const setGramsN = (idx, g) => {
    const grams = Math.max(0, Math.round(Number(g) || 0));
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const per100 = it.per100 || per100From(it, it.grams || 100);
      const s = scale(per100, grams);
      return { ...it, per100, grams, kcal: s.kcal, protein: s.protein, fat: s.fat, carbs: s.carbs };
    }));
  };
  const editGrams = (idx, value) => setGramsN(idx, Number(String(value).replace(/[^0-9]/g, '')) || 0);
  const r1 = (n) => +(Number(n) || 0).toFixed(1);

  // Ручная правка калорий (ИИ мог ошибиться). Обновляем и per100, чтобы граммы дальше считались от нового значения.
  const editKcal = (idx, value) => {
    const k = Number(value.replace(/[^0-9]/g, '')) || 0;
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const g = it.grams || 100;
      const per100 = { ...(it.per100 || { protein: 0, fat: 0, carbs: 0 }), kcal: g ? (k / g) * 100 : k };
      return { ...it, kcal: k, per100 };
    }));
  };

  const removeItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveAll = () => {
    items.forEach((it) => {
      autoSaveToBase(it);
      onSave(mealType, {
        name: String(it.name || 'Блюдо'),
        grams: Math.round(Number(it.grams) || 0),
        per100: it.per100 || per100From(it, it.grams || 100),
        kcal: Math.round(Number(it.kcal) || 0),
        protein: Math.round(Number(it.protein) || 0),
        fat: Math.round(Number(it.fat) || 0),
        carbs: Math.round(Number(it.carbs) || 0),
      });
    });
    close();
  };

  const total = items ? items.reduce((a, i) => a + (Number(i.kcal) || 0), 0) : 0;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={close} onShow={handleShown}>
      <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
        <ScrollView style={styles.cardScroll} contentContainerStyle={{ paddingBottom: spacing(1) }} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <H2>{dayMode ? '🎤 Весь день голосом' : (MEAL_TYPES.find((m) => m.key === mealType)?.label || 'Приём пищи')}</H2>
            <TouchableOpacity onPress={close} style={styles.closeX}><Text style={styles.closeXText}>✕</Text></TouchableOpacity>
          </View>

          {/* Автостарт: показываем спиннер, а не «ручной» выбор — чтобы не мелькал лишний экран. */}
          {phase === 'idle' && (autoStart || startMode) && !errorMsg && (
            <View style={{ alignItems: 'center', paddingVertical: spacing(3) }}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Muted style={{ marginTop: spacing(1) }}>{startMode === 'photo' ? 'Открываю камеру…' : 'Включаю запись…'}</Muted>
            </View>
          )}

          {/* Готов к записи (ручной выбор — если не автостарт) */}
          {phase === 'idle' && !((autoStart || startMode) && !errorMsg) && (
            <>
              <Muted>{dayMode
                ? 'Проговори весь день сразу: «на завтрак…, на обед…, на ужин…».'
                : 'Нажми и скажи свободно, что съела.'}</Muted>
              <TouchableOpacity onPress={startRec} style={styles.micBtn} activeOpacity={0.85}>
                <Text style={styles.micIcon}>🎤</Text>
                <Text style={styles.micText}>{errorMsg ? 'Перезаписать' : 'Нажми и говори'}</Text>
              </TouchableOpacity>
              {!dayMode && (
                <TouchableOpacity onPress={takePhoto} style={styles.photoBtn} activeOpacity={0.85}>
                  <Text style={styles.photoIcon}>📸</Text>
                  <Text style={styles.photoText}>Сфотографировать блюдо</Text>
                </TouchableOpacity>
              )}
              <Muted style={{ textAlign: 'center', marginVertical: spacing(1) }}>или напиши</Muted>
              <Field value={textInput} onChangeText={setTextInput} placeholder={dayMode ? 'напр. завтрак — овсянка, обед — курица с рисом, ужин — салат' : 'напр. омлет из 2 яиц и кофе'} />
              <Button title="Дальше" kind="ghost" onPress={() => goDraft(textInput)} />
            </>
          )}

          {/* Черновик — редактируемый текст того, что услышал тренер */}
          {phase === 'draft' && (
            <>
              <View style={styles.qBox}>
                <Text style={styles.qText}>💜 Вот что я поняла. Проверь и поправь — что и сколько грамм. Можешь дописать своё:</Text>
              </View>
              <TextInput
                style={styles.draftInput}
                value={draftText}
                onChangeText={setDraftText}
                multiline
                placeholder="напр. овсянка на молоке 200 г, банан, кофе с молоком 150 г"
                placeholderTextColor={colors.textDim}
                autoFocus
              />
              <Muted style={{ marginTop: spacing(0.5) }}>Не переживай за точность — граммы можно поправить и на следующем шаге.</Muted>
              <View style={{ flexDirection: 'row', gap: spacing(1), marginTop: spacing(1.5) }}>
                <Button title="🎤 Заново" kind="ghost" onPress={startRec} style={{ flex: 1 }} />
                <Button title="Посчитать →" onPress={confirmDraft} disabled={!draftText.trim()} style={{ flex: 1 }} />
              </View>
            </>
          )}

          {/* Идёт запись */}
          {phase === 'recording' && (
            <View style={styles.recBox}>
              <EqBars active />
              <Text style={styles.recTimer}>{fmt(recState?.durationMillis)}</Text>
              <Text style={styles.recLabel}>Слушаю… говори</Text>
              <TouchableOpacity onPress={stopAndProcess} style={styles.stopBtn}>
                <Text style={styles.stopText}>⏹  Остановить</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Обработка */}
          {phase === 'processing' && (
            <View style={{ alignItems: 'center', padding: spacing(3) }}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Muted style={{ marginTop: spacing(1) }}>{status || 'Обрабатываю…'}</Muted>
            </View>
          )}

          {/* Превью снимка (в фото-режиме) */}
          {!!photoUri && (phase === 'question' || phase === 'result') && (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
          )}

          {/* Уточняющий вопрос от тренера */}
          {phase === 'question' && (
            <View>
              <View style={styles.qBox}>
                <Text style={styles.qText}>💜 {question}</Text>
              </View>
              <Field value={textInput} onChangeText={setTextInput} placeholder="твой ответ (напр. 200 г)" />
              <Button title="Ответить" onPress={sendText} />
            </View>
          )}

          {/* Ошибка */}
          {!!errorMsg && (
            <View style={styles.errBox}><Text style={styles.errText}>{errorMsg}</Text></View>
          )}

          {/* Результат — можно подправить */}
          {phase === 'result' && items && (
            <>
              <View style={styles.qBox}>
                <Text style={styles.qText}>💜 Вот что услышала. Название/граммы/ккал можно поправить. Всё, чего нет в базе, сохранится в неё само при записи.</Text>
              </View>
              {items.map((it, idx) => {
                const unit = unitFor(it.name);
                const step = unit ? unit.grams : 10;
                return (
                  <View key={idx} style={styles.itemCard}>
                    <View style={styles.itemTop}>
                      <TouchableOpacity style={{ flex: 1 }} onPress={() => setSearchIdx(idx)} activeOpacity={0.7}>
                        <Text style={styles.itemNameText}>{String(it.name)} <Text style={styles.editNameHint}>🔍</Text></Text>
                      </TouchableOpacity>
                      <Text style={[styles.srcTag, it.fromDB ? styles.srcBase : styles.srcAi]}>{it.fromDB ? 'из базы' : 'оценка ИИ'}</Text>
                      <TouchableOpacity onPress={() => removeItem(idx)} style={styles.delBtn}><Text style={styles.delText}>✕</Text></TouchableOpacity>
                    </View>
                    <Text style={styles.macroLine}>Б {r1(it.protein)} · Ж {r1(it.fat)} · У {r1(it.carbs)} г</Text>
                    <View style={styles.itemBottom}>
                      <TouchableOpacity onPress={() => setGramsN(idx, (Number(it.grams) || 0) - step)} style={styles.stepBtn}><Text style={styles.stepText}>−</Text></TouchableOpacity>
                      <TextInput style={styles.miniInput} value={String(it.grams ?? '')} onChangeText={(t) => editGrams(idx, t)} keyboardType="numeric" />
                      <TouchableOpacity onPress={() => setGramsN(idx, (Number(it.grams) || 0) + step)} style={styles.stepBtn}><Text style={styles.stepText}>+</Text></TouchableOpacity>
                      <Text style={styles.fieldLbl}>г</Text>
                      <TextInput style={[styles.miniInput, { marginLeft: 'auto' }]} value={String(it.kcal ?? '')} onChangeText={(t) => editKcal(idx, t)} keyboardType="numeric" />
                      <Text style={styles.fieldLbl}>ккал</Text>
                    </View>
                    {unit && (
                      <View style={styles.portionRow}>
                        <Text style={styles.fieldLbl}>Порции:</Text>
                        {[1, 2, 3, 4].map((n) => (
                          <TouchableOpacity key={n} onPress={() => setGramsN(idx, n * unit.grams)} style={styles.portionChip}>
                            <Text style={styles.portionChipText}>{n} {unit.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
              {items.length === 0 && <Muted style={{ marginVertical: spacing(1) }}>Все позиции удалены.</Muted>}
              <Button title="＋ Добавить блюдо" kind="soft" onPress={addEmptyItem} style={{ marginTop: spacing(1) }} />
              <Text style={styles.total}>Итого: {Math.round(total)} ккал</Text>

              <View style={{ flexDirection: 'row', gap: spacing(1), marginTop: spacing(2) }}>
                <Button title="Переписать" kind="ghost" onPress={reset} style={{ flex: 1 }} />
                <Button title="Записать" onPress={saveAll} disabled={items.length === 0} style={{ flex: 1 }} />
              </View>
            </>
          )}

          {/* Результат режима «весь день» — по приёмам пищи */}
          {phase === 'dayResult' && dayMeals && (
            <>
              <View style={styles.qBox}>
                <Text style={styles.qText}>💜 Вот что услышала — по приёмам, с граммами и калориями. Всё верно? Лишнее убери и нажми «Записать всё».</Text>
              </View>
              {dayMeals.map((g, gi) => {
                const sub = g.items.reduce((s, it) => s + (Number(it.kcal) || 0), 0);
                return (
                  <View key={gi} style={styles.dayGroup}>
                    <View style={styles.dayGroupHead}>
                      <Text style={styles.dayGroupTitle}>{g.label}</Text>
                      <Text style={styles.dayGroupSub}>{Math.round(sub)} ккал</Text>
                    </View>
                    {g.items.map((it, ii) => (
                      <View key={ii} style={styles.dayItemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dayItemName} numberOfLines={1}>{String(it.name)}</Text>
                          <Text style={styles.macroLine}>Б {r1(it.protein)} · Ж {r1(it.fat)} · У {r1(it.carbs)} · {it.fromDB ? 'из базы' : 'оценка ИИ'}</Text>
                        </View>
                        <Text style={styles.dayItemGrams}>{it.grams ? `${it.grams} г` : ''}</Text>
                        <Text style={styles.dayItemKcal}>{Math.round(it.kcal)} ккал</Text>
                        <TouchableOpacity onPress={() => removeDayItem(gi, ii)} style={styles.delBtn}><Text style={styles.delText}>✕</Text></TouchableOpacity>
                      </View>
                    ))}
                  </View>
                );
              })}
              <Text style={styles.total}>Итого за день: {Math.round(dayTotal)} ккал</Text>
              <View style={{ flexDirection: 'row', gap: spacing(1), marginTop: spacing(2) }}>
                <Button title="Переписать" kind="ghost" onPress={reset} style={{ flex: 1 }} />
                <Button title="Записать всё" onPress={saveAllDay} disabled={!dayMeals.length} style={{ flex: 1 }} />
              </View>
            </>
          )}

          {phase !== 'recording' && phase !== 'processing' && (
            <Button title="Закрыть" kind="ghost" onPress={close} style={{ marginTop: spacing(1.5) }} />
          )}
        </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <FoodSearchModal
        visible={searchIdx !== null}
        initialQuery={searchIdx !== null && items ? String(items[searchIdx]?.name || '') : ''}
        onPick={pickForItem}
        onAddNew={addNewForItem}
        onRename={renameForItem}
        onClose={() => setSearchIdx(null)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing(2) },
  card: {
    width: '84%', maxWidth: 340, backgroundColor: colors.card, borderRadius: radius.lg,
    padding: spacing(1.75), borderWidth: 1, borderColor: colors.primaryDim,
  },
  cardScroll: { maxHeight: 480 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(0.5) },
  closeX: { padding: 6 },
  closeXText: { color: colors.textDim, fontSize: 20, fontWeight: '700' },
  micBtn: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: spacing(2.5),
    marginVertical: spacing(1.5), borderRadius: radius.lg,
    backgroundColor: colors.cardAlt, borderWidth: 2, borderColor: colors.primaryDim,
  },
  micIcon: { fontSize: 40, marginBottom: spacing(0.5) },
  micText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  photoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing(1.5), borderRadius: radius.md,
    backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.line,
  },
  photoIcon: { fontSize: 22, marginRight: 8 },
  photoText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  photoPreview: {
    width: '100%', height: 180, borderRadius: radius.md, marginVertical: spacing(1),
    backgroundColor: colors.cardAlt,
  },
  recBox: { alignItems: 'center', paddingVertical: spacing(1.5) },
  eqRow: { flexDirection: 'row', alignItems: 'center', height: 34, gap: 5, marginBottom: spacing(1) },
  eqBar: { width: 6, height: 30, borderRadius: 3, backgroundColor: colors.primary },
  recTimer: { color: colors.text, fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] },
  recLabel: { color: colors.textDim, fontSize: 13, marginTop: 2, marginBottom: spacing(1.25) },
  stopBtn: { backgroundColor: colors.danger, paddingVertical: spacing(1.25), paddingHorizontal: spacing(3), borderRadius: 999 },
  stopText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  qBox: {
    backgroundColor: colors.cardAlt, borderRadius: radius.md, padding: spacing(2),
    marginVertical: spacing(1), borderWidth: 1, borderColor: colors.primaryDim,
  },
  qText: { color: colors.text, fontSize: 16, lineHeight: 22 },
  draftInput: {
    minHeight: 90, backgroundColor: colors.cardAlt, borderRadius: radius.md,
    paddingHorizontal: spacing(1.5), paddingVertical: spacing(1.25), color: colors.text,
    fontSize: 16, lineHeight: 22, borderWidth: 1, borderColor: colors.primaryDim,
    textAlignVertical: 'top', marginTop: spacing(1),
  },
  errBox: {
    backgroundColor: colors.dangerBg, borderRadius: radius.sm, padding: spacing(1.5),
    marginTop: spacing(1), borderWidth: 1, borderColor: colors.danger,
  },
  errText: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  editRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing(1),
    paddingVertical: spacing(0.75), borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  colHead: { flexDirection: 'row', alignItems: 'center', gap: spacing(1), paddingHorizontal: spacing(0.5), marginTop: spacing(0.5) },
  colHeadName: { flex: 1, color: colors.textDim, fontSize: 12, fontWeight: '700' },
  colHeadGrams: { width: 64, textAlign: 'center', color: colors.textDim, fontSize: 12, fontWeight: '700' },
  colHeadKcal: { width: 60, textAlign: 'right', color: colors.textDim, fontSize: 12, fontWeight: '700' },
  editName: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardAlt,
    borderRadius: 8, paddingHorizontal: spacing(1), paddingVertical: spacing(1),
    borderWidth: 1, borderColor: colors.line,
  },
  editNameText: { flex: 1, color: colors.text, fontSize: 15 },
  editNameHint: { fontSize: 12, opacity: 0.6 },
  itemCard: { backgroundColor: colors.cardAlt, borderRadius: radius.md, padding: spacing(1.25), marginTop: spacing(1), borderWidth: 1, borderColor: colors.line },
  itemTop: { flexDirection: 'row', alignItems: 'center' },
  itemNameText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  itemBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing(0.5), marginTop: spacing(1) },
  fieldLbl: { color: colors.textDim, fontSize: 12, fontWeight: '700' },
  srcTag: { fontSize: 10, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, overflow: 'hidden', marginHorizontal: 6 },
  srcBase: { color: colors.accent, backgroundColor: colors.successBg },
  srcAi: { color: colors.warn, backgroundColor: colors.warnBg },
  macroLine: { color: colors.textDim, fontSize: 12, fontWeight: '600', marginTop: 3 },
  stepBtn: { width: 30, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primaryDim },
  stepText: { color: colors.primary, fontSize: 20, fontWeight: '800' },
  portionRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginTop: spacing(0.75) },
  portionChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  portionChipText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  miniInput: {
    width: 72, backgroundColor: colors.card, borderRadius: 8, paddingVertical: spacing(0.75), textAlign: 'center',
    color: colors.text, fontSize: 15, fontWeight: '700', borderWidth: 1, borderColor: colors.line,
  },
  editGrams: {
    width: 64, textAlign: 'center', color: colors.text, fontSize: 15, fontWeight: '700',
    backgroundColor: colors.cardAlt, borderRadius: 8, paddingVertical: spacing(1),
    borderWidth: 1, borderColor: colors.line,
  },
  kcalRO: { width: 52, textAlign: 'right', color: colors.accent, fontSize: 15, fontWeight: '800' },
  kcalEdit: {
    width: 56, textAlign: 'center', color: colors.accent, fontSize: 15, fontWeight: '800',
    backgroundColor: colors.cardAlt, borderRadius: 8, paddingVertical: spacing(1),
    borderWidth: 1, borderColor: colors.line,
  },
  baseBtn: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: colors.primaryDim, marginLeft: 4 },
  baseBtnText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  savedMark: { color: colors.accent, fontSize: 16, fontWeight: '800', marginLeft: 6, width: 40, textAlign: 'center' },
  delBtn: { padding: 6, marginLeft: 2 },
  delText: { color: colors.danger, fontSize: 18, fontWeight: '700' },
  total: { color: colors.text, fontSize: 17, fontWeight: '800', marginTop: spacing(1), textAlign: 'right' },
  dayGroup: { marginTop: spacing(1.25), backgroundColor: colors.cardAlt, borderRadius: radius.md, padding: spacing(1.25), borderWidth: 1, borderColor: colors.line },
  dayGroupHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(0.5) },
  dayGroupTitle: { color: colors.primary, fontSize: 15, fontWeight: '800' },
  dayGroupSub: { color: colors.accent, fontSize: 14, fontWeight: '800' },
  dayItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing(0.75), borderTopWidth: 1, borderTopColor: colors.line },
  dayItemName: { flex: 1, color: colors.text, fontSize: 14 },
  dayItemGrams: { color: colors.textDim, fontSize: 13, marginRight: spacing(1), minWidth: 44, textAlign: 'right' },
  dayItemKcal: { color: colors.accent, fontSize: 14, fontWeight: '700', minWidth: 56, textAlign: 'right' },
});
