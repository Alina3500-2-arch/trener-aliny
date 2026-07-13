// Аккуратный женский силуэт с мягкой подсветкой задействованных групп мышц.
import React from 'react';
import Svg, { Path, Circle, Ellipse, G } from 'react-native-svg';
import { colors } from './theme';

// active — массив ключей: плечи, руки, грудь, пресс, спина, ягодицы, ноги
export default function BodyMuscles({ active = [], size = 130 }) {
  const on = (k) => active.includes(k);
  const base = colors.cardAlt;          // тело
  const line = colors.line;             // контур
  const hi = colors.primary;            // подсветка мышцы
  const fill = (k) => (on(k) ? hi : base);
  const h = size * 1.75;

  return (
    <Svg width={size} height={h} viewBox="0 0 120 210">
      <G stroke={line} strokeWidth="1">
        {/* Голова и шея */}
        <Circle cx="60" cy="16" r="11" fill={base} />
        <Path d="M54 25 h12 v6 q-6 3 -12 0 Z" fill={base} />

        {/* Руки (плечо-предплечье, плавные) */}
        <Path d="M40 40 Q30 44 28 64 Q26 82 30 98 Q34 100 37 98 Q35 80 38 62 Q40 48 46 44 Z" fill={fill('руки')} />
        <Path d="M80 40 Q90 44 92 64 Q94 82 90 98 Q86 100 83 98 Q85 80 82 62 Q80 48 74 44 Z" fill={fill('руки')} />

        {/* Торс: плечи → тонкая талия → бёдра (женственный контур) */}
        <Path d="M45 38 Q60 33 75 38 Q80 52 76 66 Q73 78 68 88 Q73 100 74 116 Q72 132 60 136 Q48 132 46 116 Q47 100 52 88 Q47 78 44 66 Q40 52 45 38 Z" fill={base} />

        {/* Плечи */}
        <Ellipse cx="46" cy="42" rx="9" ry="6" fill={fill('плечи')} />
        <Ellipse cx="74" cy="42" rx="9" ry="6" fill={fill('плечи')} />

        {/* Грудь */}
        <Ellipse cx="53" cy="56" rx="8" ry="7" fill={fill('грудь')} />
        <Ellipse cx="67" cy="56" rx="8" ry="7" fill={fill('грудь')} />

        {/* Спина (боковые широчайшие) */}
        <Path d="M45 52 Q41 64 46 76 L50 72 Q47 62 49 52 Z" fill={fill('спина')} />
        <Path d="M75 52 Q79 64 74 76 L70 72 Q73 62 71 52 Z" fill={fill('спина')} />

        {/* Пресс */}
        <Path d="M53 66 Q60 64 67 66 Q68 78 64 88 Q60 91 56 88 Q52 78 53 66 Z" fill={fill('пресс')} />

        {/* Ягодицы / бёдра */}
        <Ellipse cx="60" cy="112" rx="19" ry="12" fill={fill('ягодицы')} />

        {/* Ноги (бедро → голень, плавные) */}
        <Path d="M50 120 Q44 140 46 160 Q47 178 50 196 Q54 198 57 196 Q58 176 58 158 Q59 138 57 122 Z" fill={fill('ноги')} />
        <Path d="M70 120 Q76 140 74 160 Q73 178 70 196 Q66 198 63 196 Q62 176 62 158 Q61 138 63 122 Z" fill={fill('ноги')} />
      </G>
    </Svg>
  );
}
