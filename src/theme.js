// Единая палитра приложения «Тренер Алины» — тёмная тема, мягкие акценты.
export const colors = {
  bg: '#0F1115',
  card: '#1A1D24',
  cardAlt: '#22262F',
  primary: '#9B7DFF',   // сирень 💜
  primaryDim: '#4B3E7A',
  accent: '#4FD6AC',    // мягкий зелёный
  danger: '#F08A94',    // мягкий, не режущий красный
  warn: '#F0C36B',
  text: '#F2F3F5',
  textDim: '#9AA0AD',
  line: '#2A2F3A',

  // Подложки для плашек (приглушённые)
  tint: '#20222C',      // шапки приёмов
  successBg: '#15241F',
  dangerBg: '#2A1B1D',
  warnBg: '#2A2416',
};

// Фирменный фиолетовый градиент шапок
export const gradient = ['#8E74E0', '#6B50C6'];

export const radius = { sm: 10, md: 16, lg: 22 };

export const spacing = (n) => n * 8;
