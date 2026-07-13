// Переиспользуемые UI-компоненты.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { colors, radius, spacing } from './theme';

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({ title, onPress, kind = 'primary', style, disabled }) {
  const bg =
    kind === 'primary' ? colors.primary :
    kind === 'ghost' ? 'transparent' :
    kind === 'danger' ? colors.danger : colors.cardAlt;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.5 : 1,
          borderWidth: kind === 'ghost' ? 1 : 0, borderColor: colors.line },
        style,
      ]}
    >
      <Text style={[styles.btnText, (kind === 'ghost' || kind === 'soft') && { color: colors.primary }]}>{title}</Text>
    </TouchableOpacity>
  );
}

export function Field({ label, value, onChangeText, placeholder, keyboardType }) {
  return (
    <View style={{ marginBottom: spacing(1.5) }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        keyboardType={keyboardType}
      />
    </View>
  );
}

export function H1({ children }) {
  return <Text style={styles.h1}>{children}</Text>;
}
export function H2({ children }) {
  return <Text style={styles.h2}>{children}</Text>;
}
export function Muted({ children, style }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

// Кольцо прогресса по калориям (простое, на View)
export function CalorieRing({ eaten, target, size = 180 }) {
  const pct = target > 0 ? Math.min(eaten / target, 1) : 0;
  const left = Math.max(target - eaten, 0);
  const over = eaten > target;
  return (
    <View style={styles.ringWrap}>
      <View style={[styles.ringOuter, { width: size, height: size, borderRadius: size / 2 }]}>
        <View style={[styles.ringFill, { height: `${pct * 100}%`, backgroundColor: over ? colors.danger : colors.accent }]} />
        <View style={styles.ringCenter}>
          {over ? (
            <>
              <Text style={[styles.ringStop, size < 170 && { fontSize: 26 }]}>Стоп 🛑</Text>
              <Text style={[styles.ringOver, size < 170 && { fontSize: 20 }]}>−{Math.round(eaten - target)}</Text>
              <Muted>перебор, ккал</Muted>
            </>
          ) : (
            <>
              <Text style={[styles.ringBig, size < 170 && { fontSize: 34 }]}>{Math.round(left)}</Text>
              <Muted>ккал осталось</Muted>
            </>
          )}
        </View>
      </View>
      <Muted style={{ marginTop: spacing(1) }}>
        {Math.round(eaten)} / {target} ккал
      </Muted>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing(2),
    marginBottom: spacing(1.5),
    borderWidth: 1,
    borderColor: colors.line,
  },
  btn: {
    borderRadius: radius.sm,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  label: { color: colors.textDim, marginBottom: 6, fontSize: 13 },
  input: {
    backgroundColor: colors.cardAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1.25),
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  h1: { color: colors.text, fontSize: 26, fontWeight: '800', marginBottom: spacing(0.5) },
  h2: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing(1) },
  muted: { color: colors.textDim, fontSize: 13 },
  ringWrap: { alignItems: 'center', paddingVertical: spacing(1) },
  ringOuter: {
    width: 180, height: 180, borderRadius: 90, backgroundColor: colors.cardAlt,
    overflow: 'hidden', justifyContent: 'flex-end', borderWidth: 2, borderColor: colors.line,
  },
  ringFill: { position: 'absolute', left: 0, right: 0, bottom: 0, opacity: 0.35 },
  ringCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  ringBig: { color: colors.text, fontSize: 42, fontWeight: '800' },
  ringStop: { color: colors.danger, fontSize: 30, fontWeight: '800' },
  ringOver: { color: colors.danger, fontSize: 26, fontWeight: '800', marginTop: 2 },
});
