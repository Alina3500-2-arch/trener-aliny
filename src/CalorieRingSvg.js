// Круговое кольцо калорий (в стиле дневника). Белое кольцо на фиолетовой шапке.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export default function CalorieRingSvg({ eaten, target, size = 150, stroke = 12, color = '#FFFFFF', centerColor = '#FFFFFF', track = 'rgba(255,255,255,0.22)' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(Math.max(eaten / target, 0), 1) : 0;
  const cx = size / 2;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cx} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={cx} cy={cx} r={r}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${cx} ${cx})`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.big, { color: centerColor }]}>{Math.round(eaten)}</Text>
        <Text style={styles.unit}>ккал</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  big: { color: '#FFFFFF', fontSize: 30, fontWeight: '800' },
  unit: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: -2 },
});
