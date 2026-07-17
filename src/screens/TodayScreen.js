import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Modal, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius } from '../theme';
import { Card, Button, Field, H1, H2, Muted } from '../ui';
import { useStore } from '../store';
import { todayStr, calcDailyKcal } from '../storage';
import { coachAdvice, dailyTarget, eatenToday, todayMeals, latestWeight, macroTargets, macroHint, dayAdvanced } from '../coach';
import SmartAdd from '../SmartAdd';
import ManualAdd from '../ManualAdd';
import EditMeal from '../EditMeal';
import CalorieRingSvg from '../CalorieRingSvg';
import { coachTip } from '../ai';
import { burnedToday } from '../activity';

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Завтрак', icon: '🍳', time: '08:00', frac: 0.30 },
  { key: 'brunch', label: 'Ланч', icon: '🥪', optional: true, time: '11:00', frac: 0.10 },
  { key: 'lunch', label: 'Обед', icon: '🍲', time: '13:00', frac: 0.35 },
  { key: 'snack', label: 'Полдник', icon: '🍎', optional: true, time: '16:00', frac: 0.10 },
  { key: 'dinner', label: 'Ужин', icon: '🍽️', time: '18:00', frac: 0.25 },
];

const GRAD = ['#8E74E0', '#6B50C6'];
// Яркие цвета-сигналы поверх фиолетовой шапки (заметнее мягких из палитры).
const GOOD_GREEN = '#57E39B'; // в норме
const ALERT_RED = '#FF6B6B';  // перебор / стоп
const LOW_AMBER = '#FFCE5A';  // недобор (например, белка)

export default function TodayScreen() {
  const { state, viewDate, setViewDate, addMeal, removeMeal, updateMeal, addCustomFood, removeCustomFood, addFavorite, removeFavorite } = useStore();
  const [editMeal, setEditMeal] = useState(null);
  const [mealSheet, setMealSheet] = useState(null); // открытый приём (ключ) в нижнем окне
  const today = todayStr();
  const date = viewDate;          // просматриваемый день (сегодня или прошлый)
  const isToday = date === today;
  const shiftDate = (delta) => setViewDate(addDays(date, delta));
  const baseTarget = dailyTarget(state);
  const weightKg = latestWeight(state);
  const burned = burnedToday(state, date, weightKg); // нагрузка за день (прогулка/огород/зал/тренировки)
  const budget = baseTarget + burned; // дневной бюджет калорий с учётом нагрузки «в запас»
  const eaten = eatenToday(state, date);
  const advice = coachAdvice(state, date);
  const meals = todayMeals(state, date);
  const mt = macroTargets(state); // ориентир БЖУ
  const advanced = dayAdvanced(eaten.kcal, budget); // день по калориям уже наполовину
  const hint = macroHint(eaten, mt, advanced); // рекомендация по БЖУ

  // Прогноз по весам: баланс относительно нормы поддержания (7700 ккал ≈ 1 кг)
  const maintenance = calcDailyKcal(state.profile, weightKg, null);
  const over = eaten.kcal > budget; // превысила дневной бюджет
  const overTarget = Math.round(eaten.kcal - budget); // перебор над бюджетом
  // Если не превысила — считаем, что доешь ровно до бюджета (плановый дефицит).
  const plannedIntake = Math.max(eaten.kcal, budget);
  const balance = plannedIntake - (maintenance + burned); // <0 дефицит (худеешь), >0 профицит
  const predGrams = Math.round((balance / 7700) * 1000); // граммы на завтра

  const [modal, setModal] = useState(null); // тип приёма пищи
  const [smartOpen, setSmartOpen] = useState(false);
  const [smartType, setSmartType] = useState('breakfast');
  const [smartAuto, setSmartAuto] = useState(false);
  const [smartDay, setSmartDay] = useState(false); // режим «весь день голосом»
  const [smartMode, setSmartMode] = useState(null); // 'photo' — сразу открыть камеру
  const [aiTip, setAiTip] = useState(null);
  const [tipLoading, setTipLoading] = useState(false);
  const [extraMeals, setExtraMeals] = useState([]); // добавленные необязательные приёмы (ланч/полдник)

  // Показываем приём, если он основной, уже есть записи, или его добавили через «+».
  const visibleMeals = MEAL_TYPES.filter(
    (mt) => !mt.optional || extraMeals.includes(mt.key) || meals.some((m) => m.type === mt.key)
  );
  const hiddenOptional = MEAL_TYPES.filter(
    (mt) => mt.optional && !extraMeals.includes(mt.key) && !meals.some((m) => m.type === mt.key)
  );

  const askAlina = async () => {
    setTipLoading(true);
    try {
      const goalText = state.goal
        ? `${state.goal.targetDeltaKg < 0 ? 'сбросить' : 'набрать'} ${Math.abs(state.goal.targetDeltaKg)} кг за ${state.goal.periodDays} дн.`
        : null;
      const tip = await coachTip({
        name: state.profile?.name || 'Алина',
        goalText,
        target: budget,
        eaten: Math.round(eaten.kcal),
        left: Math.round(budget - eaten.kcal),
        burned,
        protein: Math.round(eaten.protein), pTarget: mt.protein,
        fat: Math.round(eaten.fat), fTarget: mt.fat,
        carbs: Math.round(eaten.carbs), cTarget: mt.carbs,
        hour: new Date().getHours(),
        meals: meals.map((m) => m.name),
        avoid: aiTip,
        nonce: Math.floor(Math.random() * 1000),
      });
      setAiTip(tip);
    } catch (e) {
      // ИИ недоступен (часто 403 — геоблок Groq): молча оставляем локальный совет, без всплывающей ошибки.
    } finally {
      setTipLoading(false);
    }
  };

  // Совет тренера подгружаем сам и ОБНОВЛЯЕМ, когда меняется нагрузка (запас калорий) или число приёмов.
  // Пока грузится — показываем локальный совет (он тоже учитывает нагрузку и остаток).
  useEffect(() => { if (!over) askAlina(); }, [burned, meals.length, date]);

  const openAdd = (type) => setModal(type);

  const openSheetMeal = mealSheet ? MEAL_TYPES.find((m) => m.key === mealSheet) : null;
  const sheetItems = mealSheet ? meals.filter((m) => m.type === mealSheet) : [];

  return (
    <View style={styles.screen}>
      {/* Фиолетовая шапка-дневник */}
      <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={styles.heroTitle}>Дневник питания</Text>

        {/* Навигация по дням: ‹ дата › — можно листать и править прошлое */}
        <View style={styles.dateNav}>
          <TouchableOpacity style={styles.dateArrow} activeOpacity={0.7} onPress={() => shiftDate(-1)}>
            <Text style={styles.dateArrowText}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateCenter}
            activeOpacity={0.7}
            onPress={() => !isToday && setViewDate(today)}
          >
            <Text style={styles.heroDate}>{isToday ? 'Сегодня' : niceDate(date)}</Text>
            {!isToday && <Text style={styles.dateToday}>вернуться к сегодня</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dateArrow, isToday && styles.dateArrowOff]}
            activeOpacity={0.7}
            disabled={isToday}
            onPress={() => shiftDate(1)}
          >
            <Text style={styles.dateArrowText}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroRingRow}>
          <View style={styles.heroSide}>
            <Text style={styles.heroSideVal}>{budget}</Text>
            <Text style={styles.heroSideLabel}>норма</Text>
            {burned > 0 && <Text style={styles.heroBurn}>🔥 +{burned}</Text>}
          </View>
          <CalorieRingSvg
            eaten={eaten.kcal} target={budget} size={124} stroke={11}
            color={over ? ALERT_RED : GOOD_GREEN}
            centerColor={over ? ALERT_RED : '#FFFFFF'}
          />
          <View style={styles.heroSide}>
            <Text style={[styles.heroSideVal, over && { color: ALERT_RED }]}>{over ? '+' : ''}{Math.round(over ? eaten.kcal - budget : budget - eaten.kcal)}</Text>
            <Text style={styles.heroSideLabel}>{over ? 'перебор' : 'осталось'}</Text>
            <Text style={[styles.heroPred, { color: predGrams > 0 ? ALERT_RED : GOOD_GREEN }]}>
              на весах ≈ {predGrams > 0 ? '+' : predGrams < 0 ? '−' : ''}{Math.abs(predGrams)} г
            </Text>
            <Text style={[styles.heroPredHint, { color: predGrams > 0 ? ALERT_RED : GOOD_GREEN }]}>
              {predGrams > 0 ? '⚠️ жир копится!' : predGrams < 0 ? 'жир уходит 💪' : 'вес держится'}
            </Text>
          </View>
        </View>

        <View style={styles.heroMacros}>
          <HeroMacro label="Белки" v={eaten.protein} t={mt.protein} kind="protein" />
          <HeroMacro label="Жиры" v={eaten.fat} t={mt.fat} kind="limit" />
          <HeroMacro label="Углеводы" v={eaten.carbs} t={mt.carbs} kind="limit" />
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.mealsHead}>
          <Text style={styles.sectionTitle}>Приёмы пищи</Text>
          <TouchableOpacity
            onPress={() => { setSmartDay(true); setSmartType('breakfast'); setSmartMode(null); setSmartAuto(true); setSmartOpen(true); }}
            activeOpacity={0.85} style={styles.dayVoiceBtn}>
            <Text style={styles.dayVoiceText}>🎤 Весь день</Text>
          </TouchableOpacity>
        </View>

        {/* Сетка приёмов 2 в ряд */}
        <View style={styles.grid}>
          {visibleMeals.map((mt) => {
            const items = meals.filter((m) => m.type === mt.key);
            const sum = items.reduce((a, m) => a + (m.kcal || 0), 0);
            const goal = Math.round(baseTarget * mt.frac);
            return (
              <TouchableOpacity key={mt.key} style={styles.gridCard} activeOpacity={0.85} onPress={() => setMealSheet(mt.key)}>
                <View style={styles.gridTop}>
                  <Text style={styles.gridName}>{mt.label}</Text>
                  {items.length > 0
                    ? <Text style={styles.gridTime}>{mt.time}</Text>
                    : <Text style={styles.gridPlus}>＋</Text>}
                </View>
                <Text style={styles.gridKcal}>{Math.round(sum)} <Text style={styles.gridKcalUnit}>ккал</Text></Text>
                <Text style={styles.gridSub}>из {goal} ккал</Text>
                <Text style={styles.gridEmoji}>{mt.icon}</Text>
              </TouchableOpacity>
            );
          })}
          {hiddenOptional.map((mt) => (
            <TouchableOpacity key={mt.key} style={[styles.gridCard, styles.gridCardAdd]} activeOpacity={0.85}
              onPress={() => setExtraMeals((p) => [...p, mt.key])}>
              <Text style={styles.gridAddPlus}>＋</Text>
              <Text style={styles.gridAddText}>{mt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Совет тренера. При переборе калорий — строгое красное напоминание «стоп». */}
        <View style={[styles.coachCard, over && styles.coachCardAlert]}>
          <View style={styles.coachCardHead}>
            <Text style={[styles.coachCardTitle, over && { color: ALERT_RED }]}>
              {over ? '❗ Стоп, перебор' : '💜 Совет тренера'}
            </Text>
            {!over && (
              <TouchableOpacity onPress={askAlina} disabled={tipLoading} style={styles.coachRefreshBtn}>
                {tipLoading
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Text style={styles.coachRefreshIcon}>↻</Text>}
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.coachCardText, over && { color: ALERT_RED, fontWeight: '700' }]}>
            {over
              ? `Алина, стоп! Ты перебрала дневную норму на ${overTarget} ккал. На сегодня хватит — попей воды или травяной чай без сахара. Завтра начнём с чистого листа! 💪`
              : (aiTip || advice)}
          </Text>
        </View>
      </View>

      {/* Окно приёма: список еды + способы добавить */}
      <Modal visible={!!mealSheet} animationType="fade" transparent onRequestClose={() => setMealSheet(null)}>
        <View style={styles.sheetWrap}>
          <View style={styles.sheetCard}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{openSheetMeal?.icon} {openSheetMeal?.label}</Text>
              <TouchableOpacity onPress={() => setMealSheet(null)}><Text style={styles.sheetClose}>✕</Text></TouchableOpacity>
            </View>
            {sheetItems.length > 0 ? (
              <View style={{ marginBottom: spacing(1) }}>
                {sheetItems.map((m) => (
                  <TouchableOpacity key={m.id} style={styles.mealItem}
                    onPress={() => { setMealSheet(null); setEditMeal(m); }}
                    onLongPress={() => confirmRemove(m, removeMeal)}>
                    <Text style={styles.mealName}>{m.name}</Text>
                    <Text style={styles.mealGrams}>{m.grams ? `${m.grams} г` : ''}</Text>
                    <Text style={styles.mealKcal}>{Math.round(m.kcal)} ккал</Text>
                  </TouchableOpacity>
                ))}
                <Muted style={{ marginTop: 4 }}>Нажми на запись, чтобы поправить. Удержи — удалить.</Muted>
              </View>
            ) : (
              <Muted style={{ marginBottom: spacing(1) }}>Пока пусто. Добавь, что съела:</Muted>
            )}
            <View style={{ flexDirection: 'row', gap: spacing(1) }}>
              <TouchableOpacity style={styles.sheetAct} onPress={() => { const k = mealSheet; setMealSheet(null); setSmartType(k); setSmartMode(null); setSmartAuto(true); setSmartOpen(true); }}>
                <Text style={styles.sheetActIcon}>🎤</Text><Text style={styles.sheetActText}>Голос</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetAct} onPress={() => { const k = mealSheet; setMealSheet(null); openAdd(k); }}>
                <Text style={styles.sheetActIcon}>＋</Text><Text style={styles.sheetActText}>Вручную</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetAct} onPress={() => { const k = mealSheet; setMealSheet(null); setSmartType(k); setSmartAuto(false); setSmartMode('photo'); setSmartOpen(true); }}>
                <Text style={styles.sheetActIcon}>📸</Text><Text style={styles.sheetActText}>Фото</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Умное добавление через ИИ */}
      <SmartAdd
        visible={smartOpen}
        defaultType={smartType}
        autoStart={smartAuto}
        startMode={smartMode}
        dayMode={smartDay}
        onClose={() => { setSmartOpen(false); setSmartAuto(false); setSmartMode(null); setSmartDay(false); }}
        onSave={(type, item) => addMeal({ type, ...item })}
        onAddFood={addCustomFood}
      />

      {/* Ручной ввод: продукт + граммы (авто-подсчёт) */}
      <ManualAdd
        visible={!!modal}
        mealType={modal}
        mealLabel={MEAL_TYPES.find((m) => m.key === modal)?.label}
        onClose={() => setModal(null)}
        onSave={(type, item) => addMeal({ type, ...item })}
        onAddFood={addCustomFood}
        customFoods={state.customFoods || []}
        onRemoveCustomFood={removeCustomFood}
        favorites={state.favorites || []}
        onAddFavorite={addFavorite}
        onRemoveFavorite={removeFavorite}
      />

      {/* Правка записанного приёма */}
      <EditMeal
        meal={editMeal}
        onClose={() => setEditMeal(null)}
        onSave={updateMeal}
        onDelete={removeMeal}
      />
    </View>
  );
}

function HeroMacro({ label, v, t, kind }) {
  const pct = t > 0 ? Math.min(v / t, 1) : 0;
  // limit (жиры/углеводы): перебор > нормы → красный.
  // protein: недобор (сильно ниже нормы) → янтарный; добор → зелёный.
  const over = kind === 'limit' && t > 0 && v > t * 1.03;
  const low = kind === 'protein' && t > 0 && v < t * 0.9;
  const met = kind === 'protein' && !low && v > 0;
  const signal = over ? ALERT_RED : low ? LOW_AMBER : met ? GOOD_GREEN : '#FFFFFF';
  return (
    <View style={styles.hMacro}>
      <Text style={styles.hMacroLabel}>{label}{over ? ' ⚠️' : low ? ' ↓' : ''}</Text>
      <View style={styles.hMacroBar}>
        <View style={[styles.hMacroFill, { width: `${pct * 100}%`, backgroundColor: signal }]} />
      </View>
      <Text style={[styles.hMacroVal, { color: signal }]}>{Math.round(v)} / {Math.round(t)} г</Text>
    </View>
  );
}

function MacroMini({ label, value, target, problem }) {
  return (
    <View style={styles.macroMini}>
      <Text style={[styles.macroMiniVal, problem && { color: colors.danger }]}>
        {Math.round(value)}<Text style={styles.macroMiniTarget}>/{Math.round(target)}</Text>
      </Text>
      <Text style={styles.macroMiniLabel}>{label}</Text>
    </View>
  );
}

function Macro({ label, value, target, color, kind, active }) {
  // protein: красный, если сильно не хватает (и день уже наполовину); limit (жиры/угли): красный при переборе
  const problem = kind === 'protein' ? active && (target - value) > 25 : value > target * 1.1;
  const shownColor = problem ? colors.danger : color;
  return (
    <View style={styles.macro}>
      <Text style={[styles.macroValue, { color: shownColor }]}>{Math.round(value)} г</Text>
      {target ? <Text style={[styles.macroTarget, problem && { color: colors.danger }]}>из {Math.round(target)} г</Text> : null}
      <Muted>{label}</Muted>
    </View>
  );
}

function confirmRemove(meal, removeMeal) {
  Alert.alert('Удалить?', meal.name, [
    { text: 'Отмена', style: 'cancel' },
    { text: 'Удалить', style: 'destructive', onPress: () => removeMeal(meal.id) },
  ]);
}

function niceDate(s) {
  const [y, m, d] = s.split('-');
  const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  return `${Number(d)} ${months[Number(m) - 1]} ${y}`;
}

// Сдвиг даты 'YYYY-MM-DD' на delta дней (через полдень — без сюрпризов с часовыми поясами).
function addDays(s, delta) {
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d + delta, 12, 0, 0);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  // Шапка-дневник
  hero: { paddingTop: spacing(6.5), paddingBottom: spacing(2), paddingHorizontal: spacing(2.5), borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  heroTitle: { color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  heroDate: { color: 'rgba(255,255,255,0.95)', fontSize: 13, fontWeight: '700', textAlign: 'center', textTransform: 'capitalize' },
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  dateArrow: { width: 34, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  dateArrowOff: { opacity: 0.3 },
  dateArrowText: { color: '#fff', fontSize: 24, fontWeight: '800', lineHeight: 26 },
  dateCenter: { minWidth: 150, alignItems: 'center', paddingHorizontal: spacing(1) },
  dateToday: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '600', marginTop: 1 },
  heroRingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing(1.5) },
  heroSide: { flex: 1, alignItems: 'center' },
  heroSideVal: { color: '#fff', fontSize: 20, fontWeight: '800' },
  heroSideLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  heroPred: { fontSize: 11, fontWeight: '800', marginTop: 4, textAlign: 'center' },
  heroPredHint: { fontSize: 10, fontWeight: '800', marginTop: 1, textAlign: 'center' },
  heroBurn: { color: GOOD_GREEN, fontSize: 12, fontWeight: '800', marginTop: 2 },
  heroMacros: { flexDirection: 'row', gap: spacing(1.5), marginTop: spacing(1.5) },
  hMacro: { flex: 1 },
  hMacroLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  hMacroBar: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  hMacroFill: { height: '100%', borderRadius: 3, backgroundColor: '#fff' },
  hMacroVal: { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 4 },
  body: { padding: spacing(1.5) },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(1) },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  mealsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(1) },
  dayVoiceBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryDim, borderRadius: 999, paddingVertical: 6, paddingHorizontal: spacing(1.5), borderWidth: 1, borderColor: colors.primary },
  dayVoiceText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  // Совет тренера — компактная карточка внизу экрана
  coachCard: {
    marginTop: spacing(0.5), backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.primaryDim, paddingVertical: spacing(1.25), paddingHorizontal: spacing(1.5),
  },
  coachCardAlert: { borderColor: ALERT_RED, borderWidth: 1.5, backgroundColor: colors.dangerBg },
  coachCardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  coachCardTitle: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  coachRefreshBtn: { paddingHorizontal: 6, paddingVertical: 2, minWidth: 22, alignItems: 'center' },
  coachRefreshIcon: { color: colors.primary, fontSize: 18, fontWeight: '800' },
  coachCardText: { color: colors.text, fontSize: 13, lineHeight: 18 },
  // Сетка приёмов
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridCard: {
    width: '48.5%', backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line,
    paddingVertical: spacing(1), paddingHorizontal: spacing(1.25), marginBottom: spacing(1), minHeight: 60, overflow: 'hidden',
  },
  gridTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gridName: { color: colors.text, fontSize: 14, fontWeight: '800' },
  gridTime: { color: colors.primary, fontSize: 10, fontWeight: '700', backgroundColor: colors.cardAlt, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  gridPlus: { color: colors.primary, fontSize: 18, fontWeight: '800' },
  gridKcal: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 2 },
  gridKcalUnit: { color: colors.textDim, fontSize: 11, fontWeight: '600' },
  gridSub: { color: colors.textDim, fontSize: 11, marginTop: 0 },
  gridEmoji: { position: 'absolute', right: 6, bottom: 4, fontSize: 20, opacity: 0.9 },
  gridCardAdd: { alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', flexDirection: 'row', gap: 6, minHeight: 60 },
  gridAddPlus: { color: colors.primary, fontSize: 18, fontWeight: '800' },
  gridAddText: { color: colors.textDim, fontSize: 12, fontWeight: '700', marginTop: 0 },
  // Окно приёма
  sheetWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing(2.5) },
  sheetCard: { width: '100%', maxWidth: 360, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing(2.5), borderWidth: 1, borderColor: colors.primaryDim },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(1) },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  sheetClose: { color: colors.textDim, fontSize: 20, fontWeight: '700', padding: 4 },
  sheetAct: { flex: 1, alignItems: 'center', paddingVertical: spacing(1.5), borderRadius: radius.md, backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.line },
  sheetActIcon: { fontSize: 22 },
  sheetActText: { color: colors.text, fontSize: 13, fontWeight: '700', marginTop: 3 },
  coachAvatar: { fontSize: 20, marginRight: 8 },
  coachName: { color: colors.textDim, fontWeight: '700', fontSize: 13 },
  coachText: { color: colors.text, fontSize: 16, lineHeight: 22 },
  askBtn: {
    marginTop: spacing(1.5), alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing(1), paddingHorizontal: spacing(2),
    borderRadius: 999, backgroundColor: colors.primary,
    shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  askHeart: { fontSize: 16, marginRight: 7 },
  askText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing(1) },
  summary: { paddingVertical: spacing(1.5), paddingHorizontal: spacing(2), marginBottom: spacing(1) },
  sumTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  sumBig: { color: colors.text, fontSize: 34, fontWeight: '800', lineHeight: 36 },
  sumLabel: { color: colors.textDim, fontSize: 13 },
  sumEaten: { color: colors.text, fontSize: 15, fontWeight: '700' },
  forecastText: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.cardAlt, overflow: 'hidden', marginTop: spacing(1) },
  barFill: { height: '100%', borderRadius: 4 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing(1.25) },
  macroMini: { flex: 1, alignItems: 'center' },
  macroMiniVal: { color: colors.text, fontSize: 15, fontWeight: '800' },
  macroMiniTarget: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
  macroMiniLabel: { color: colors.textDim, fontSize: 11, marginTop: 1 },
  coachLine: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.primaryDim, paddingVertical: spacing(1), paddingHorizontal: spacing(1.5),
    marginBottom: spacing(1.25), gap: spacing(1),
  },
  coachEmoji: { fontSize: 16 },
  coachLineText: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 18 },
  coachRefresh: { color: colors.primary, fontSize: 18, fontWeight: '800' },
  ringRow: { flexDirection: 'row', alignItems: 'center' },
  forecast: { flex: 1, marginLeft: spacing(1) },
  predBox: { padding: spacing(1.5), borderRadius: radius.md, borderWidth: 1, alignItems: 'center' },
  predTitle: { color: colors.textDim, fontSize: 13, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  predBig: { fontSize: 30, fontWeight: '800' },
  predSub: { color: colors.textDim, fontSize: 12, lineHeight: 16, textAlign: 'center', marginTop: 2 },
  macro: { alignItems: 'center' },
  macroValue: { fontSize: 18, fontWeight: '800' },
  macroTarget: { color: colors.textDim, fontSize: 11, marginTop: 1 },
  hintBox: { marginTop: spacing(1.5), padding: spacing(1.25), borderRadius: radius.sm, borderWidth: 1 },
  hintWarn: { borderColor: colors.danger, backgroundColor: colors.dangerBg },
  hintOk: { borderColor: colors.accent, backgroundColor: colors.successBg },
  hintText: { fontSize: 14, fontWeight: '600', lineHeight: 19, textAlign: 'center' },
  mealCard: {
    backgroundColor: colors.card, borderRadius: radius.md, marginBottom: spacing(1.25),
    borderWidth: 1, borderColor: colors.line, overflow: 'hidden',
  },
  mealHeader: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.tint,
    paddingVertical: spacing(1.25), paddingHorizontal: spacing(1.75), gap: spacing(1),
  },
  mealTime: { color: colors.primary, fontSize: 13, fontWeight: '700', width: 44, fontVariant: ['tabular-nums'] },
  mealTitle: { color: colors.text, fontSize: 17, fontWeight: '800', flex: 1 },
  mealSum: { color: colors.text, fontSize: 16, fontWeight: '800' },
  mealSumUnit: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
  mealItems: { paddingHorizontal: spacing(1.75), paddingTop: spacing(0.5) },
  addMealRow: { flexDirection: 'row', gap: spacing(1), marginTop: spacing(0.5), marginBottom: spacing(1) },
  addMealBtn: {
    flex: 1, alignItems: 'center', paddingVertical: spacing(1.25), borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line, borderStyle: 'dashed', backgroundColor: colors.card,
  },
  addMealText: { color: colors.textDim, fontSize: 14, fontWeight: '700' },
  mealItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing(1), borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  mealName: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
  mealGrams: { color: colors.textDim, fontSize: 14, width: 60, textAlign: 'right', marginRight: spacing(1.5) },
  mealKcal: { color: colors.text, fontSize: 14, fontWeight: '700', width: 66, textAlign: 'right' },
  mealActions: { flexDirection: 'row', paddingHorizontal: spacing(1), paddingVertical: spacing(1), gap: spacing(0.5) },
  mealAct: { flex: 1, alignItems: 'center', paddingVertical: spacing(1), borderRadius: radius.sm },
  mealActText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    padding: spacing(2.5), paddingBottom: spacing(4),
  },
});
