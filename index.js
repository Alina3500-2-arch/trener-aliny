// ВРЕМЕННЫЙ ДИАГНОСТИЧЕСКИЙ ЭКРАН.
// Цель: проверить, запускается ли JS на устройстве вообще.
// Красный экран => JS работает. Белый => JS не запускается (нативная проблема).
import React from 'react';
import { View, Text } from 'react-native';
import { registerRootComponent } from 'expo';

function Probe() {
  return (
    <View style={{ flex: 1, backgroundColor: '#C0392B', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '800', textAlign: 'center' }}>
        JS РАБОТАЕТ ✅
      </Text>
      <Text style={{ color: '#FFEEEE', fontSize: 16, marginTop: 14, textAlign: 'center' }}>
        версия 4 — диагностика
      </Text>
    </View>
  );
}

registerRootComponent(Probe);
