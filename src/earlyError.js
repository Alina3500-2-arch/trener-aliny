// Устанавливает глобальный перехватчик ошибок КАК МОЖНО РАНЬШЕ,
// чтобы поймать сбои, случившиеся до отрисовки (белый экран).
let earlyError = null;

const prev =
  global.ErrorUtils && global.ErrorUtils.getGlobalHandler
    ? global.ErrorUtils.getGlobalHandler()
    : null;

if (global.ErrorUtils && global.ErrorUtils.setGlobalHandler) {
  global.ErrorUtils.setGlobalHandler((e, isFatal) => {
    if (!earlyError) earlyError = e;
    if (prev) {
      try {
        prev(e, isFatal);
      } catch (_) {}
    }
  });
}

export const getEarlyError = () => earlyError;
