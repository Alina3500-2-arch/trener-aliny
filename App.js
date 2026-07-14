import React from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ErrorBoundary from './src/ErrorBoundary';
import { StoreProvider, useStore } from './src/store';
import { colors } from './src/theme';
import Onboarding from './src/Onboarding';
import TodayScreen from './src/screens/TodayScreen';
import WeightScreen from './src/screens/WeightScreen';
import GoalScreen from './src/screens/GoalScreen';
import WorkoutScreen from './src/screens/WorkoutScreen';
import HistoryScreen from './src/screens/HistoryScreen';

const Tab = createBottomTabNavigator();

const ICONS = {
  Питание: '🍽️',
  Тренировки: '💪',
  Цель: '🎯',
  Вес: '⚖️',
  История: '📅',
};

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.card, border: colors.line, primary: colors.primary },
};

function Root() {
  const { state, ready } = useStore();

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!state.onboarded) {
    return <Onboarding />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textDim,
          tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line, height: 62, paddingBottom: 8, paddingTop: 6 },
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.6 }}>{ICONS[route.name]}</Text>
          ),
        })}
      >
        <Tab.Screen name="Питание" component={TodayScreen} />
        <Tab.Screen name="Тренировки" component={WorkoutScreen} />
        <Tab.Screen name="Цель" component={GoalScreen} />
        <Tab.Screen name="Вес" component={WeightScreen} />
        <Tab.Screen name="История" component={HistoryScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StoreProvider>
          <StatusBar style="light" />
          <Root />
        </StoreProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
