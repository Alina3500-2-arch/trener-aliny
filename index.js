// ВАЖНО: перехватчик ошибок ставим ПЕРВЫМ, до App и его модулей.
import './src/earlyError';
import React from 'react';
import { ScrollView, Text } from 'react-native';
import { registerRootComponent } from 'expo';
import { getEarlyError } from './src/earlyError';

// Запасной экран: показывает текст ошибки вместо белого экрана,
// если импорт App или любого его модуля упал ещё до отрисовки.
function FatalScreen({ error }) {
  const msg = String(error && (error.stack || error.message || error) || 'неизвестная ошибка');
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0F1115' }} contentContainerStyle={{ padding: 20, paddingTop: 70 }}>
      <Text style={{ color: '#F08A94', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
        ⚠️ Ошибка при загрузке
      </Text>
      <Text selectable style={{ color: '#F2F3F5', fontSize: 13 }}>{msg}</Text>
    </ScrollView>
  );
}

let RootComponent;
try {
  // require (а не import) — чтобы поймать ошибку импорта в try/catch.
  RootComponent = require('./App').default;
} catch (e) {
  const err = e || getEarlyError();
  RootComponent = () => <FatalScreen error={err} />;
}

registerRootComponent(RootComponent);
