// День недели без зависимости от Date.getDay() (алгоритм Сакамото).
// Возвращает 0=Вс, 1=Пн, ... 6=Сб — как JS getDay(), но детерминированно на любом устройстве.
const T = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];

// month: 1-12
export function dow(year, month, day) {
  let y = year;
  if (month < 3) y -= 1;
  return (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + T[month - 1] + day) % 7;
}

// Удобная обёртка для JS-даты (month 0-11 в getMonth)
export function dowOf(d) {
  return dow(d.getFullYear(), d.getMonth() + 1, d.getDate());
}
