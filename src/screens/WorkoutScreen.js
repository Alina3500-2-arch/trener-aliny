import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Modal, Alert, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { colors, spacing, radius } from '../theme';
import { Card, Button, Field, H1, H2, Muted } from '../ui';
import { useStore } from '../store';
import { todayStr } from '../storage';
import { dow, dowOf } from '../dow';
import { generateWorkoutPlans, tidyDayTitle } from '../ai';
import WorkoutPlanEditor from '../WorkoutPlanEditor';
import WorkoutCalendar from '../WorkoutCalendar';
import Hero from '../Hero';
import { workoutCoachMsg } from '../workoutCoach';
import { musclesForDay, musclesForExercise, parseExercise } from '../exerciseMuscles';
import { latestWeight } from '../coach';
import { ACTIVITY_TYPES, estimateKcal, burnedToday, workoutKcal } from '../activity';

const WEEKDAYS = [
  { d: 1, label: 'Пн' }, { d: 2, label: 'Вт' }, { d: 3, label: 'Ср' }, { d: 4, label: 'Чт' },
  { d: 5, label: 'Пт' }, { d: 6, label: 'Сб' }, { d: 0, label: 'Вс' },
];

const GOALS = [
  { key: 'похудение', label: 'Похудение', emoji: '🔥' },
  { key: 'набор мышечной массы', label: 'Набор мышц', emoji: '💪' },
  { key: 'тонус и поддержание', label: 'Тонус', emoji: '✨' },
];
const FOCUS = [
  { key: 'ягодицы', label: 'Ягодицы' },
  { key: 'ноги', label: 'Ноги' },
  { key: 'пресс', label: 'Пресс' },
  { key: 'руки', label: 'Руки' },
  { key: 'спина', label: 'Спина' },
  { key: 'грудь', label: 'Грудь' },
  { key: 'плечи', label: 'Плечи' },
  { key: 'всё тело', label: 'Всё тело' },
];
const DAYS_OPTS = [2, 3, 4, 5];
const PLACES = [{ key: 'дом', label: 'Дома' }, { key: 'зал', label: 'В зале' }];

const RU_WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const RU_MON = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
// Дружеские подколы для пропущенных дней (детерминированно по числу — без random).
const SEAL_JABS = [
  'решила почувствовать себя тюленем и не тренироваться 🦭',
  'дала телу поблажку, и диван победил 🛋️',
  'пропустила тренировку — бывает 🙈',
  'выбрала отдых вместо тренировки 😴',
];

// Сводка за ВЫБРАННЫЙ день: что делала + сожжённые ккал, похвала/подкол/напоминание.
function daySummary(ds, done, activities, wDays, weightKg, todayS) {
  const [yy, mm, dd] = ds.split('-').map(Number);
  const date = new Date(yy, mm - 1, dd);
  const dw = dow(yy, mm, dd);
  const label = `${dd} ${RU_MON[mm - 1]}, ${RU_WD[dw]}`;
  const wks = done.filter((w) => w.date === ds);
  const acts = activities.filter((a) => a.date === ds);
  const isToday = ds === todayS;
  const isPast = ds < todayS;
  const isFuture = ds > todayS;

  if (wks.length || acts.length) {
    const kcal = Math.round(acts.reduce((s, a) => s + (a.kcal || 0), 0) + wks.reduce((s, w) => s + workoutKcal(w, weightKg), 0));
    const parts = [...wks.map((w) => `💪 ${w.title}`), ...acts.map((a) => `${a.emoji || '⚡'} ${a.name} (${a.minutes} мин)`)];
    const praise = isToday ? 'Молодец, сегодня уже потратила энергию!' : 'Молодец, потратила энергию 💪';
    return { label, kcal, workout: wks[0] || null, text: `${parts.join(' · ')}\n${praise} Сожжено ≈ ${kcal} ккал 🔥` };
  }
  if (isToday) return { label, text: 'Сегодня ты ещё не тренировалась и без нагрузки. Добавь нагрузку или сходи на тренировку 💪' };
  if (isFuture) return { label, text: wDays.includes(dw) ? 'По плану тут тренировка — не забудь 🗓️' : 'Свободный день по плану 🗓️' };
  if (isPast && wDays.includes(dw)) return { label, missed: true, text: `В этот день ты ${SEAL_JABS[dd % SEAL_JABS.length]}` };
  return { label, text: 'В этот день ничего не записано.' };
}

export default function WorkoutScreen() {
  const { state, addWorkout, removeWorkout, updateWorkout, setWorkoutPlan, setWorkoutDays, setWorkoutTime, addActivity, removeActivity } = useStore();
  const plan = state.workoutPlan;
  const wDays = state.workoutDays || [];

  // Нагрузка за день (прогулка/огород/зал…) → калории в запас для вкладки Питание.
  const weightKg = latestWeight(state);
  const todayActs = (state.activities || []).filter((a) => a.date === todayStr());
  const burnedTotal = burnedToday(state, todayStr(), weightKg);
  const activityDates = new Set((state.activities || []).map((a) => a.date));
  const [actModal, setActModal] = useState(false);
  const [actType, setActType] = useState(ACTIVITY_TYPES[0].key);
  const [actMin, setActMin] = useState('');
  const actMet = (ACTIVITY_TYPES.find((t) => t.key === actType) || ACTIVITY_TYPES[0]).met;
  const actEstimate = estimateKcal(actMet, actMin, weightKg);
  const saveActivity = () => {
    const t = ACTIVITY_TYPES.find((x) => x.key === actType);
    const kcal = estimateKcal(t.met, actMin, weightKg);
    if (!actMin || kcal <= 0) { Alert.alert('Укажи время', 'Введи, сколько минут длилась нагрузка.'); return; }
    addActivity({ key: t.key, name: t.label, emoji: t.emoji, minutes: Number(actMin), kcal });
    setActModal(false); setActMin('');
  };
  // ВАЖНО: это JSX-переменная, а НЕ отдельный компонент (<ActivityCard/> пересоздавался бы каждый
  // рендер и модалка мигала/теряла фокус). Рендерим как {activitySection}.
  const workoutsBurn = burnedTotal - todayActs.reduce((s, a) => s + a.kcal, 0);
  const activitySection = (
    <>
      <Card>
        <View style={styles.actHead}>
          <Text style={styles.q}>🔥 Нагрузка за день</Text>
          {burnedTotal > 0 && <Text style={styles.actTotal}>+{burnedTotal} ккал</Text>}
        </View>
        {todayActs.map((a) => (
          <View key={a.id} style={styles.actRow}>
            <Text style={styles.actName}>{a.emoji || '⚡'} {a.name}</Text>
            <Text style={styles.actMin}>{a.minutes} мин</Text>
            <Text style={styles.actKcal}>+{a.kcal} ккал</Text>
            <TouchableOpacity onPress={() => removeActivity(a.id)} style={styles.actDel}><Text style={styles.actDelText}>✕</Text></TouchableOpacity>
          </View>
        ))}
        {workoutsBurn > 0 && <Muted style={{ marginTop: 4 }}>+ тренировки сегодня ≈ {workoutsBurn} ккал</Muted>}
        <View style={styles.actIcons}>
          {ACTIVITY_TYPES.map((t) => (
            <TouchableOpacity key={t.key} style={styles.actIcon} activeOpacity={0.8}
              onPress={() => { setActType(t.key); setActMin(''); setActModal(true); }}>
              <Text style={styles.actIconEmoji}>{t.emoji}</Text>
              <Text style={styles.actIconLabel} numberOfLines={1}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <Modal visible={actModal} animationType="fade" transparent onRequestClose={() => setActModal(false)}>
        <KeyboardAvoidingView style={styles.actModalWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.actModalCard}>
            <View style={styles.actHead}>
              <Text style={styles.actModalTitle}>🔥 Нагрузка</Text>
              <TouchableOpacity onPress={() => setActModal(false)} style={styles.actClose}><Text style={styles.actCloseText}>✕</Text></TouchableOpacity>
            </View>
            <View style={styles.chipsSmWrap}>
              {ACTIVITY_TYPES.map((t) => (
                <TouchableOpacity key={t.key} onPress={() => setActType(t.key)} style={[styles.chipSm, actType === t.key && styles.chipOn]}>
                  <Text style={[styles.chipSmText, actType === t.key && styles.chipTextOn]}>{t.emoji} {t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.actInputRow}>
              <TextInput
                style={styles.actInputSm}
                value={actMin}
                onChangeText={(t) => setActMin(t.replace(/[^0-9]/g, '').slice(0, 3))}
                placeholder="0"
                placeholderTextColor={colors.textDim}
                keyboardType="numeric"
              />
              <Text style={styles.actMinLabel}>мин</Text>
              <Text style={styles.actEstSm}>≈ {actEstimate} ккал</Text>
            </View>
            <Button title="Добавить в запас" onPress={saveActivity} disabled={!actMin} style={{ marginTop: spacing(1.25) }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
  const coachMsg = workoutCoachMsg(state);
  const toggleWday = (d) => setWorkoutDays(wDays.includes(d) ? wDays.filter((x) => x !== d) : [...wDays, d]);

  // Всплывающее напоминание: сегодня день тренировки и ещё не занималась.
  const nagged = React.useRef(false);
  React.useEffect(() => {
    if (nagged.current) return;
    const todayDow = dowOf(new Date());
    const didToday = (state.workouts || []).some((w) => w.date === todayStr());
    if (plan && wDays.includes(todayDow) && !didToday) {
      nagged.current = true;
      Alert.alert('💪 Сегодня тренировка!', 'По плану у тебя сегодня тренировка. Подготовься и не пропускай — я в тебя верю 💜');
    }
  }, [plan, wDays]);

  // phase: setup | choose | edit | view
  const [phase, setPhase] = useState(plan ? 'view' : 'setup');
  const [goal, setGoal] = useState('похудение');
  const [focus, setFocus] = useState(['ягодицы']);
  const [days, setDays] = useState(3);
  const [place, setPlace] = useState('дом');
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState([]);
  const [editInitial, setEditInitial] = useState(null);

  const [modal, setModal] = useState(null); // логирование { title, ex }
  const [log, setLog] = useState({}); // { exercise: [{reps, weight}, ...] }
  const [editingId, setEditingId] = useState(null); // правим уже записанную тренировку
  const [wtab, setWtab] = useState('calendar'); // под-вкладка: calendar | program | load
  const [dayDetail, setDayDetail] = useState(null); // открытый день программы (проваливание)
  const done = state.workouts;
  const [calSel, setCalSel] = useState(todayStr());
  const calDay = daySummary(calSel, done, state.activities || [], wDays, weightKg, todayStr());

  const toggleFocus = (k) => setFocus((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  const generate = async () => {
    setLoading(true);
    try {
      const vs = await generateWorkoutPlans({ goalText: goal, focus, days, place, level: 'начальный' });
      setVariants(vs);
      setPhase('choose');
    } catch (e) {
      Alert.alert('Не вышло', 'Тренер не смог составить программу: ' + String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  const choose = (v) => { setWorkoutPlan(v); setPhase('view'); };
  const startOwn = () => { setEditInitial({ name: 'Моя программа', days: [{ title: 'День A', ex: [''] }] }); setPhase('edit'); };
  const startEdit = () => { setEditInitial(plan); setPhase('edit'); };
  const saveEdited = (p) => { setWorkoutPlan(p); setPhase('view'); };

  const openLog = (day, dayIndex) => {
    const init = {};
    day.ex.forEach((e) => { init[e] = [{ reps: '', weight: '' }]; });
    setLog(init);
    setEditingId(null);
    setModal({ ...day, title: tidyDayTitle(day.title, dayIndex) });
  };

  // Открыть уже записанную тренировку для правки.
  const openEditWorkout = (w) => {
    const grouped = {}; const order = [];
    (w.sets || []).forEach((s) => {
      if (!grouped[s.exercise]) { grouped[s.exercise] = []; order.push(s.exercise); }
      grouped[s.exercise].push({ reps: s.reps ? String(s.reps) : '', weight: s.weight ? String(s.weight) : '' });
    });
    if (!order.length) { order.push(w.title); grouped[w.title] = [{ reps: '', weight: '' }]; }
    setLog(grouped);
    setEditingId(w.id);
    setModal({ title: w.title, ex: order });
  };

  const confirmDelWorkout = (w) => {
    Alert.alert('Удалить тренировку?', `${w.title} · ${w.date}`, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => removeWorkout(w.id) },
    ]);
  };
  const addSet = (ex) => setLog((p) => ({ ...p, [ex]: [...(p[ex] || []), { reps: '', weight: '' }] }));
  const delSet = (ex, i) => setLog((p) => ({ ...p, [ex]: (p[ex] || []).filter((_, j) => j !== i) }));
  const setSetField = (ex, i, field, val) =>
    setLog((p) => ({ ...p, [ex]: (p[ex] || []).map((s, j) => (j === i ? { ...s, [field]: val } : s)) }));

  // Упражнение считается сделанным, если есть хотя бы один заполненный подход.
  const exDone = (ex) => (log[ex] || []).some((s) => s.reps || s.weight);
  const doneCount = modal ? modal.ex.filter(exDone).length : 0;
  const progress = modal && modal.ex.length ? doneCount / modal.ex.length : 0;
  // Примерный расход за эту тренировку (по числу заполненных подходов).
  const filledSets = modal ? modal.ex.reduce((s, ex) => s + (log[ex] || []).filter((x) => x.reps || x.weight).length, 0) : 0;
  const sessionKcal = estimateKcal(5.0, Math.max(15, filledSets * 3), weightKg);

  const finish = () => {
    const list = [];
    modal.ex.forEach((ex) => {
      (log[ex] || []).forEach((s) => {
        if (s.reps || s.weight) list.push({ exercise: ex, reps: Number(s.reps) || 0, weight: Number(s.weight) || 0 });
      });
    });
    if (!list.length) { Alert.alert('Пусто', 'Отметь хотя бы один подход.'); return; }
    if (editingId) {
      updateWorkout(editingId, { title: modal.title, sets: list });
      setModal(null); setEditingId(null);
      Alert.alert('Готово', 'Тренировка обновлена 💜');
      return;
    }
    const all = doneCount === modal.ex.length;
    const est = workoutKcal({ sets: list }, weightKg);
    addWorkout({ title: modal.title, sets: list });
    setModal(null);
    Alert.alert(all ? '🔥 Всё выполнено!' : 'Молодец! 💪',
      `${all ? 'Ты сделала ВСЕ упражнения! Умница 💜' : 'Тренировка записана. Горжусь тобой!'}\n\nСожжено ≈ ${est} ккал — они добавлены в запас во вкладке Питание.`);
  };

  const Header = () => <Hero title="Тренировки" style={styles.heroBleed} />;

  // === SETUP ===
  if (phase === 'setup') {
    return (
      <ScrollView bounces={false} overScrollMode="never" showsVerticalScrollIndicator={false} style={styles.screen} contentContainerStyle={styles.pad}>
        <Header />
        {activitySection}
        <Muted style={{ marginTop: spacing(1.5) }}>Ответь на пару вопросов — тренер предложит программы на выбор.</Muted>

        <Card style={{ marginTop: spacing(2) }}>
          <Text style={styles.q}>Какая цель?</Text>
          <View style={styles.optWrap}>
            {GOALS.map((g) => (
              <TouchableOpacity key={g.key} onPress={() => setGoal(g.key)} style={[styles.chip, goal === g.key && styles.chipOn]}>
                <Text style={[styles.chipText, goal === g.key && styles.chipTextOn]}>{g.emoji} {g.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.q}>На что упор? (можно несколько)</Text>
          <View style={styles.optWrap}>
            {FOCUS.map((f) => (
              <TouchableOpacity key={f.key} onPress={() => toggleFocus(f.key)} style={[styles.chip, focus.includes(f.key) && styles.chipOn]}>
                <Text style={[styles.chipText, focus.includes(f.key) && styles.chipTextOn]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.q}>Дней в неделю</Text>
          <View style={styles.optWrap}>
            {DAYS_OPTS.map((d) => (
              <TouchableOpacity key={d} onPress={() => setDays(d)} style={[styles.chip, days === d && styles.chipOn]}>
                <Text style={[styles.chipText, days === d && styles.chipTextOn]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.q}>Где занимаешься</Text>
          <View style={styles.optWrap}>
            {PLACES.map((p) => (
              <TouchableOpacity key={p.key} onPress={() => setPlace(p.key)} style={[styles.chip, place === p.key && styles.chipOn]}>
                <Text style={[styles.chipText, place === p.key && styles.chipTextOn]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading ? (
            <View style={{ alignItems: 'center', marginTop: spacing(2) }}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Muted style={{ marginTop: spacing(1) }}>Тренер придумывает программы…</Muted>
            </View>
          ) : (
            <Button title="💜 Подобрать программы" onPress={generate} disabled={!focus.length} style={{ marginTop: spacing(2) }} />
          )}
          <Button title="✍️ Составить свою" kind="ghost" onPress={startOwn} style={{ marginTop: spacing(1) }} />
        </Card>
      </ScrollView>
    );
  }

  // === CHOOSE VARIANT ===
  if (phase === 'choose') {
    return (
      <ScrollView bounces={false} overScrollMode="never" showsVerticalScrollIndicator={false} style={styles.screen} contentContainerStyle={styles.pad}>
        <Header />
        <Muted>Выбери программу — потом сможешь поправить под себя.</Muted>
        {variants.map((v, i) => (
          <Card key={i} style={{ marginTop: spacing(1.5), borderColor: colors.primaryDim }}>
            <H2>{v.name}</H2>
            {!!v.note && <Muted style={{ marginBottom: spacing(1) }}>{v.note}</Muted>}
            {v.days.map((d, di) => (
              <View key={di} style={{ marginBottom: spacing(1) }}>
                <Text style={styles.dayTitle}>{tidyDayTitle(d.title, di)}</Text>
                {d.ex.map((e, ei) => <Text key={ei} style={styles.ex}>• {e}</Text>)}
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: spacing(1), marginTop: spacing(0.5) }}>
              <Button title="Править" kind="ghost" onPress={() => { setEditInitial(v); setPhase('edit'); }} style={{ flex: 1 }} />
              <Button title="Выбрать" onPress={() => choose(v)} style={{ flex: 1 }} />
            </View>
          </Card>
        ))}
        <Button title="↻ Другие варианты" kind="ghost" onPress={() => setPhase('setup')} style={{ marginTop: spacing(1.5) }} />
      </ScrollView>
    );
  }

  // === EDIT ===
  if (phase === 'edit') {
    return (
      <ScrollView bounces={false} overScrollMode="never" showsVerticalScrollIndicator={false} style={styles.screen} contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <Header />
        <WorkoutPlanEditor
          initial={editInitial}
          onSave={saveEdited}
          onCancel={() => setPhase(plan ? 'view' : 'setup')}
        />
      </ScrollView>
    );
  }

  // === VIEW (готовая программа) ===
  const dayD = dayDetail !== null ? plan?.days?.[dayDetail] : null;
  return (
    <ScrollView bounces={false} overScrollMode="never" showsVerticalScrollIndicator={false} style={styles.screen} contentContainerStyle={styles.pad}>
      <Header />

      {dayD ? (
        /* === Проваливание внутрь дня === */
        <>
          <TouchableOpacity onPress={() => setDayDetail(null)} style={styles.backRow} activeOpacity={0.7}>
            <Text style={styles.backText}>‹ Назад к программе</Text>
          </TouchableOpacity>
          <Text style={styles.detailTitle}>{tidyDayTitle(dayD.title, dayDetail)}</Text>
          {musclesForDay(dayD.ex).length > 0 && (
            <View style={styles.muscleChips}>
              {musclesForDay(dayD.ex).map((mus) => (
                <View key={mus} style={styles.muscleChip}><Text style={styles.muscleChipText}>{mus}</Text></View>
              ))}
            </View>
          )}
          {dayD.ex.map((e, i) => {
            const p = parseExercise(e);
            const mm = [...musclesForExercise(e)];
            return (
              <View key={i} style={styles.exRowCard}>
                <View style={styles.exThumb}><Text style={styles.exThumbNum}>{i + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exRowName} numberOfLines={2}>{p.name}</Text>
                  <Text style={styles.exRowSub}>{p.sets || '—'}×{p.reps || '—'}{mm.length ? ` · ${mm.join(', ')}` : ''}</Text>
                </View>
              </View>
            );
          })}
          <View style={{ flexDirection: 'row', gap: spacing(1), marginTop: spacing(1.5) }}>
            <Button title="✏️ Изменить" kind="ghost" onPress={startEdit} style={{ flex: 1 }} />
            <Button title="Записать 💪" onPress={() => openLog(dayD, dayDetail)} style={{ flex: 1.4 }} />
          </View>
        </>
      ) : (
        <>
          {/* Под-вкладки — чтобы всё влезало без прокрутки */}
          <View style={styles.segRow}>
            {[['calendar', 'Календарь'], ['program', 'Программа'], ['load', 'Нагрузка']].map(([k, label]) => (
              <TouchableOpacity key={k} onPress={() => setWtab(k)} style={[styles.segBtn, wtab === k && styles.segBtnOn]} activeOpacity={0.8}>
                <Text style={[styles.segText, wtab === k && styles.segTextOn]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {wtab === 'program' && (
            <>
              {(!!plan?.name || !!plan?.note) && (
                <View style={{ marginBottom: spacing(1) }}>
                  {!!plan?.name && <H2>{plan.name}</H2>}
                  {!!plan?.note && <Muted>{plan.note}</Muted>}
                </View>
              )}
              {plan?.days.map((day, di) => (
                <TouchableOpacity key={di} style={styles.dayCard} activeOpacity={0.8} onPress={() => setDayDetail(di)}>
                  <View style={styles.dayHeader}>
                    <View style={styles.dayNumBadge}><Text style={styles.dayNumText}>{di + 1}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dayHeaderTitle}>{tidyDayTitle(day.title, di)}</Text>
                      <Text style={styles.dayHeaderSub}>{day.ex.length} упр. · {musclesForDay(day.ex).join(', ') || 'всё тело'}</Text>
                    </View>
                    <Text style={styles.dayChevron}>›</Text>
                  </View>
                </TouchableOpacity>
              ))}
              <Card>
                <Text style={styles.q}>Мои дни тренировок</Text>
                <View style={[styles.optWrap, { justifyContent: 'space-between' }]}>
                  {WEEKDAYS.map((w) => (
                    <TouchableOpacity key={w.d} onPress={() => toggleWday(w.d)} style={[styles.wdayChip, wDays.includes(w.d) && styles.chipOn]}>
                      <Text style={[styles.chipText, wDays.includes(w.d) && styles.chipTextOn]}>{w.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.timeRow}>
                  <Text style={styles.q}>Время тренировки</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={state.workoutTime || '18:00'}
                    onChangeText={(t) => setWorkoutTime(t.replace(/[^0-9:]/g, '').slice(0, 5))}
                    placeholder="18:00"
                    placeholderTextColor={colors.textDim}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </Card>
              <View style={{ flexDirection: 'row', gap: spacing(1), marginTop: spacing(1) }}>
                <Button title="✏️ Править" kind="soft" onPress={startEdit} style={{ flex: 1 }} />
                <Button title="↻ Новая" kind="ghost" onPress={() => Alert.alert('Новая программа?', 'Составить заново с тренером?', [
                  { text: 'Отмена', style: 'cancel' },
                  { text: 'Составить', onPress: () => setPhase('setup') },
                ])} style={{ flex: 1 }} />
              </View>
            </>
          )}

          {wtab === 'calendar' && (
            <>
              <View style={[styles.coachBox, coachMsg.type === 'warn' ? styles.coachWarn : coachMsg.type === 'go' ? styles.coachGo : styles.coachOk]}>
                <Text style={styles.coachText}>{coachMsg.text}</Text>
              </View>
              <Card>
                <WorkoutCalendar workouts={done} workoutDays={wDays} since={state.workoutDaysSince} activityDates={activityDates} burnedTodayKcal={burnedTotal} onDayPress={setCalSel} selectedDate={calSel} />
              </Card>
              <Card style={calDay.missed ? { borderColor: colors.warn } : undefined}>
                <View style={styles.detHeadRow}>
                  <Text style={styles.detDayTitle}>{calDay.label}</Text>
                  {calDay.workout && (
                    <View style={{ flexDirection: 'row' }}>
                      <TouchableOpacity onPress={() => openEditWorkout(calDay.workout)} style={styles.doneBtn}><Text style={styles.doneEdit}>✏️</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => confirmDelWorkout(calDay.workout)} style={styles.doneBtn}><Text style={styles.doneDel}>✕</Text></TouchableOpacity>
                    </View>
                  )}
                </View>
                <Text style={[styles.logText, calDay.missed && styles.logMissed]}>{calDay.text}</Text>
              </Card>
            </>
          )}

          {wtab === 'load' && activitySection}
        </>
      )}

      <Modal visible={!!modal} animationType="slide" transparent>
        <View style={styles.modalWrap}>
          <ScrollView style={styles.modalCard} contentContainerStyle={{ paddingBottom: spacing(4) }} keyboardShouldPersistTaps="handled">
            <H2>{modal?.title}</H2>

            {/* Прогресс тренировки */}
            <View style={styles.progHead}>
              <Text style={styles.progText}>{doneCount} из {modal?.ex.length} · {Math.round(progress * 100)}%</Text>
              <Text style={styles.progKcal}>🔥 ~{sessionKcal} ккал</Text>
            </View>
            <View style={styles.progBar}>
              <View style={[styles.progFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: progress >= 1 ? colors.accent : colors.primary }]} />
            </View>

            {modal?.ex.map((e, i) => (
              <View key={i} style={[styles.exBlock, exDone(e) && styles.exBlockDone]}>
                <Text style={styles.exName}>{exDone(e) ? '✅ ' : ''}{e}</Text>
                {(log[e] || []).map((s, si) => (
                  <View key={si} style={styles.setRow}>
                    <Text style={styles.setNo}>{si + 1}.</Text>
                    <TextInput style={styles.setInput} placeholder="повт." placeholderTextColor={colors.textDim} keyboardType="numeric"
                      value={s.reps} onChangeText={(t) => setSetField(e, si, 'reps', t.replace(/[^0-9]/g, ''))} />
                    <Text style={styles.setX}>×</Text>
                    <TextInput style={styles.setInput} placeholder="кг" placeholderTextColor={colors.textDim} keyboardType="numeric"
                      value={s.weight} onChangeText={(t) => setSetField(e, si, 'weight', t.replace(/[^0-9.]/g, ''))} />
                    <Text style={styles.setUnit}>кг</Text>
                    {(log[e] || []).length > 1 && (
                      <TouchableOpacity onPress={() => delSet(e, si)} style={styles.setDel}><Text style={styles.setDelText}>✕</Text></TouchableOpacity>
                    )}
                  </View>
                ))}
                <TouchableOpacity onPress={() => addSet(e)} style={styles.addSet}><Text style={styles.addSetText}>＋ подход</Text></TouchableOpacity>
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: spacing(1), marginTop: spacing(1) }}>
              <Button title="Отмена" kind="ghost" onPress={() => setModal(null)} style={{ flex: 1 }} />
              <Button title="Готово" onPress={finish} style={{ flex: 1 }} />
            </View>
          </ScrollView>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing(2), paddingBottom: spacing(6) },
  heroBleed: { marginTop: -spacing(2), marginHorizontal: -spacing(2), marginBottom: spacing(1.5) },
  q: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: spacing(1.5), marginBottom: spacing(1) },
  optWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) },
  chip: { paddingVertical: spacing(1), paddingHorizontal: spacing(1.75), borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.cardAlt },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primaryDim },
  chipText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  chipTextOn: { color: colors.primary, fontWeight: '800' },
  ex: { color: colors.text, fontSize: 15, paddingVertical: 2 },
  dayBody: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing(1) },
  muscleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing(1) },
  muscleChip: { backgroundColor: colors.primaryDim, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10 },
  muscleChipText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  dayTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 3 },
  editLink: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  redo: { color: colors.primary, fontSize: 14, fontWeight: '700', textAlign: 'center', marginVertical: spacing(1.5) },
  coachBox: { padding: spacing(1.5), borderRadius: radius.md, borderWidth: 1, marginTop: spacing(1.5), marginBottom: spacing(0.5) },
  coachOk: { borderColor: colors.accent, backgroundColor: colors.successBg },
  coachGo: { borderColor: colors.primary, backgroundColor: colors.primaryDim },
  coachWarn: { borderColor: colors.danger, backgroundColor: colors.dangerBg },
  coachText: { color: colors.text, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  planHead: { flexDirection: 'row', alignItems: 'center', marginTop: spacing(1) },
  wdayChip: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.cardAlt },
  doneItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing(1), borderBottomWidth: 1, borderBottomColor: colors.line },
  doneTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  logText: { color: colors.text, fontSize: 14, lineHeight: 20, marginTop: 2 },
  logMissed: { color: colors.warn },
  detHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detDayTitle: { color: colors.primary, fontSize: 15, fontWeight: '800' },
  doneBtn: { padding: 8, marginLeft: 4 },
  doneEdit: { fontSize: 16 },
  doneDel: { color: colors.danger, fontSize: 16, fontWeight: '800' },
  // Сворачиваемые дни (девчачий стиль)
  dayCard: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, marginBottom: spacing(1.25), overflow: 'hidden' },
  dayCardOpen: { borderColor: colors.primary },
  dayHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing(1.5), gap: spacing(1.25) },
  dayNumBadge: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primaryDim, alignItems: 'center', justifyContent: 'center' },
  dayNumText: { color: colors.primary, fontSize: 18, fontWeight: '800' },
  dayHeaderTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  dayHeaderSub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  dayChevron: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  dayContent: { paddingHorizontal: spacing(1.5), paddingBottom: spacing(1.5) },
  tblHead: { flexDirection: 'row', alignItems: 'center', marginTop: spacing(1), paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.line },
  tblHcell: { width: 56, textAlign: 'center', color: colors.textDim, fontSize: 12, fontWeight: '700' },
  exRowCard: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.25), paddingVertical: spacing(1), borderBottomWidth: 1, borderBottomColor: colors.line },
  exThumb: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primaryDim, alignItems: 'center', justifyContent: 'center' },
  exThumbNum: { color: colors.primary, fontSize: 15, fontWeight: '800' },
  exRowName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  exRowSub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  exRowArrow: { color: colors.primary, fontSize: 22, fontWeight: '800' },
  tblRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing(0.9), borderBottomWidth: 1, borderBottomColor: colors.line },
  tblName: { color: colors.text, fontSize: 14 },
  tblCell: { width: 56, textAlign: 'center', color: colors.accent, fontSize: 15, fontWeight: '800' },
  tblHint: { color: colors.primary, fontSize: 12 },
  exInfoWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: spacing(2) },
  exInfoCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing(2.5), alignItems: 'center', width: '86%', borderWidth: 1, borderColor: colors.primaryDim },
  exInfoName: { color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  exInfoSets: { color: colors.accent, fontSize: 14, fontWeight: '700', marginTop: 2, marginBottom: spacing(0.5) },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing(2.5), maxHeight: '85%' },
  exRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing(0.5) },
  exName: { color: colors.text, fontSize: 15, fontWeight: '700', paddingRight: spacing(1) },
  timeRow: { marginTop: spacing(1) },
  timeInput: {
    backgroundColor: colors.cardAlt, borderRadius: radius.sm, paddingHorizontal: spacing(1.5), paddingVertical: spacing(1),
    color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center', width: 100, borderWidth: 1, borderColor: colors.line,
  },
  progHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing(1), marginBottom: 6 },
  progText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  progFire: { color: colors.accent, fontSize: 14, fontWeight: '800' },
  progKcal: { color: colors.accent, fontSize: 14, fontWeight: '800' },
  // Под-вкладки
  segRow: { flexDirection: 'row', backgroundColor: colors.cardAlt, borderRadius: 999, padding: 3, marginBottom: spacing(1.25) },
  segBtn: { flex: 1, paddingVertical: spacing(0.9), borderRadius: 999, alignItems: 'center' },
  segBtnOn: { backgroundColor: colors.primary },
  segText: { color: colors.textDim, fontSize: 13, fontWeight: '700' },
  segTextOn: { color: '#fff', fontWeight: '800' },
  // Проваливание в день
  backRow: { paddingVertical: spacing(0.5), marginBottom: spacing(0.5) },
  backText: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  detailTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: spacing(1) },
  // Иконки нагрузки прямо в карточке
  actIcons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing(1) },
  actIcon: { width: '31%', alignItems: 'center', paddingVertical: spacing(1), borderRadius: radius.sm, backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.line },
  actIconEmoji: { fontSize: 20 },
  actIconLabel: { color: colors.text, fontSize: 11, fontWeight: '600', marginTop: 2 },
  // Нагрузка за день
  actHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actTotal: { color: colors.accent, fontSize: 15, fontWeight: '800' },
  actRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing(1), borderBottomWidth: 1, borderBottomColor: colors.line },
  actName: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
  actMin: { color: colors.textDim, fontSize: 13, marginRight: spacing(1.5) },
  actKcal: { color: colors.accent, fontSize: 14, fontWeight: '800', marginRight: spacing(1) },
  actDel: { padding: 4 },
  actDelText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
  // Компактная модалка нагрузки (по центру, мельче)
  actModalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: spacing(2) },
  actModalCard: { width: '100%', backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing(2), borderWidth: 1, borderColor: colors.primaryDim },
  actModalTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  actClose: { padding: 4 },
  actCloseText: { color: colors.textDim, fontSize: 18, fontWeight: '700' },
  chipsSmWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing(1) },
  chipSm: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.cardAlt },
  chipSmText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  actInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(1), marginTop: spacing(1.5) },
  actInputSm: {
    width: 74, backgroundColor: colors.cardAlt, borderRadius: radius.sm, paddingVertical: spacing(1),
    color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center', borderWidth: 1, borderColor: colors.primary,
  },
  actMinLabel: { color: colors.textDim, fontSize: 14, fontWeight: '600' },
  actEstSm: { color: colors.accent, fontSize: 16, fontWeight: '800', marginLeft: 'auto' },
  progBar: { height: 10, borderRadius: 5, backgroundColor: colors.cardAlt, overflow: 'hidden', marginBottom: spacing(1.5) },
  progFill: { height: '100%', borderRadius: 5 },
  exBlock: { backgroundColor: colors.cardAlt, borderRadius: radius.md, padding: spacing(1.25), marginBottom: spacing(1), borderWidth: 1, borderColor: colors.line },
  exBlockDone: { borderColor: colors.accent },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing(0.75) },
  setNo: { color: colors.textDim, fontSize: 13, width: 18 },
  setInput: { width: 64, backgroundColor: colors.card, borderRadius: 8, paddingVertical: spacing(0.75), textAlign: 'center', color: colors.text, fontSize: 15, fontWeight: '700', borderWidth: 1, borderColor: colors.line },
  setX: { color: colors.textDim, fontSize: 14 },
  setUnit: { color: colors.textDim, fontSize: 13 },
  setDel: { padding: 4, marginLeft: 'auto' },
  setDelText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
  addSet: { paddingVertical: 6, margintop: 2 },
  addSetText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
});
