// Фиолетовая градиентная шапка (как на экране «Питание») для остальных вкладок.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing } from './theme';
import { gradient } from './theme';

export default function Hero({ title, subtitle, right, children, style }) {
  return (
    <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, style]}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {right}
      </View>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: spacing(6.5), paddingBottom: spacing(2), paddingHorizontal: spacing(2.5), borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { color: '#fff', fontSize: 22, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600', marginTop: 2 },
});
