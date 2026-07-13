// Глобальное состояние приложения через React Context.
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { loadState, saveState, emptyState, uid, todayStr } from './storage';
import { syncReminders } from './reminders';
import { setCustomFoods } from './foodDB';

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [state, setState] = useState(emptyState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadState().then((s) => {
      setCustomFoods(s.customFoods || []);
      setState(s);
      setReady(true);
    });
  }, []);

  // Держим реестр своих продуктов в актуальном состоянии для поиска/голоса
  useEffect(() => {
    setCustomFoods(state.customFoods || []);
  }, [state.customFoods]);

  // Сохраняем при каждом изменении (после загрузки)
  useEffect(() => {
    if (ready) saveState(state);
  }, [state, ready]);

  // Перепланируем напоминания при изменении (в т.ч. тренировочные за час)
  useEffect(() => {
    if (ready) syncReminders(state.reminders || [], {
      days: state.workoutDays || [],
      time: state.workoutTime || '18:00',
    });
  }, [state.reminders, state.workoutDays, state.workoutTime, ready]);

  const update = useCallback((patch) => {
    setState((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }));
  }, []);

  // --- Действия ---
  const addMeal = useCallback((meal) => {
    setState((prev) => ({
      ...prev,
      meals: [...prev.meals, { id: uid(), date: todayStr(), ...meal }],
    }));
  }, []);

  const removeMeal = useCallback((id) => {
    setState((prev) => ({ ...prev, meals: prev.meals.filter((m) => m.id !== id) }));
  }, []);

  // Изменить записанный приём (название/граммы/ккал/БЖУ).
  const updateMeal = useCallback((id, patch) => {
    setState((prev) => ({
      ...prev,
      meals: prev.meals.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  }, []);

  const setWorkoutPlan = useCallback((plan) => {
    setState((prev) => ({ ...prev, workoutPlan: plan }));
  }, []);

  const setWorkoutDays = useCallback((daysArr) => {
    setState((prev) => ({
      ...prev,
      workoutDays: daysArr,
      // Отсчёт пропусков начинаем с момента, когда впервые выбраны дни.
      workoutDaysSince: prev.workoutDaysSince || (daysArr.length ? todayStr() : null),
    }));
  }, []);

  const setWorkoutTime = useCallback((time) => {
    setState((prev) => ({ ...prev, workoutTime: time }));
  }, []);

  // Избранные продукты (быстрый доступ). Дубли по имени не плодим.
  const addFavorite = useCallback((food) => {
    setState((prev) => {
      const others = (prev.favorites || []).filter((f) => f.name.trim().toLowerCase() !== food.name.trim().toLowerCase());
      return { ...prev, favorites: [{ name: food.name, per100: food.per100 }, ...others] };
    });
  }, []);
  const removeFavorite = useCallback((name) => {
    setState((prev) => ({ ...prev, favorites: (prev.favorites || []).filter((f) => f.name.trim().toLowerCase() !== String(name).trim().toLowerCase()) }));
  }, []);

  // Добавить/обновить свой продукт (per100 — на 100 г). Дубли по имени заменяем.
  // Значения округляем, чтобы в базе не оседали длинные дроби (ккал — целое, БЖУ — 1 знак).
  const addCustomFood = useCallback((food) => {
    const p = food.per100 || {};
    const per100 = {
      kcal: Math.round(Number(p.kcal) || 0),
      protein: +(Number(p.protein) || 0).toFixed(1),
      fat: +(Number(p.fat) || 0).toFixed(1),
      carbs: +(Number(p.carbs) || 0).toFixed(1),
    };
    setState((prev) => {
      const others = (prev.customFoods || []).filter(
        (f) => f.name.trim().toLowerCase() !== food.name.trim().toLowerCase()
      );
      return { ...prev, customFoods: [{ ...food, per100, custom: true }, ...others] };
    });
  }, []);

  // Удалить свой продукт из базы по имени.
  const removeCustomFood = useCallback((name) => {
    setState((prev) => ({
      ...prev,
      customFoods: (prev.customFoods || []).filter(
        (f) => f.name.trim().toLowerCase() !== String(name).trim().toLowerCase()
      ),
    }));
  }, []);

  // Нагрузка за день (прогулка/огород/зал…) — расход калорий, идёт «в запас» в Питание.
  const addActivity = useCallback((activity) => {
    setState((prev) => ({
      ...prev,
      activities: [{ id: uid(), date: todayStr(), ...activity }, ...(prev.activities || [])],
    }));
  }, []);
  const removeActivity = useCallback((id) => {
    setState((prev) => ({ ...prev, activities: (prev.activities || []).filter((a) => a.id !== id) }));
  }, []);

  const addWeight = useCallback((kg, date = todayStr()) => {
    setState((prev) => {
      const others = prev.weights.filter((w) => w.date !== date);
      return { ...prev, weights: [...others, { date, kg }].sort((a, b) => a.date.localeCompare(b.date)) };
    });
  }, []);

  const setGoal = useCallback((goal) => {
    setState((prev) => ({ ...prev, goal }));
  }, []);

  const addWorkout = useCallback((workout) => {
    setState((prev) => ({
      ...prev,
      workouts: [...prev.workouts, { id: uid(), date: todayStr(), ...workout }],
    }));
  }, []);

  const removeWorkout = useCallback((id) => {
    setState((prev) => ({ ...prev, workouts: prev.workouts.filter((w) => w.id !== id) }));
  }, []);

  const updateWorkout = useCallback((id, patch) => {
    setState((prev) => ({ ...prev, workouts: prev.workouts.map((w) => (w.id === id ? { ...w, ...patch } : w)) }));
  }, []);

  const setProfile = useCallback((profile) => {
    setState((prev) => ({ ...prev, profile: { ...prev.profile, ...profile } }));
  }, []);

  const setReminders = useCallback((reminders) => {
    setState((prev) => ({ ...prev, reminders }));
  }, []);

  const setOnboarded = useCallback((v) => {
    setState((prev) => ({ ...prev, onboarded: v }));
  }, []);

  const value = {
    state,
    ready,
    update,
    addMeal,
    removeMeal,
    updateMeal,
    addCustomFood,
    removeCustomFood,
    addActivity,
    removeActivity,
    setWorkoutPlan,
    setWorkoutDays,
    setWorkoutTime,
    addFavorite,
    removeFavorite,
    addWeight,
    setGoal,
    addWorkout,
    removeWorkout,
    updateWorkout,
    setProfile,
    setReminders,
    setOnboarded,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
