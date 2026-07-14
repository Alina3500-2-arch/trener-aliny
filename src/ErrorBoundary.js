// Ловушка ошибок: вместо белого экрана показывает текст ошибки на телефоне.
// Нужна для отладки standalone-сборки (SideStore), где нет консоли.
import React from 'react';
import { ScrollView, Text } from 'react-native';
import { getEarlyError } from './earlyError';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ error, info });
  }

  componentDidMount() {
    // Ловим ранние/асинхронные ошибки (загрузка данных и т.п.), которые
    // не проходят через React-рендер. Проверяем несколько секунд после старта.
    this._checks = 0;
    this._timer = setInterval(() => {
      this._checks += 1;
      const e = getEarlyError();
      if (e && !this.state.error) {
        this.setState({ error: e });
        clearInterval(this._timer);
      } else if (this._checks > 20) {
        clearInterval(this._timer);
      }
    }, 500);
  }

  componentWillUnmount() {
    if (this._timer) clearInterval(this._timer);
  }

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    const msg = String(error && (error.stack || error.message || error));
    const comp = info && info.componentStack ? String(info.componentStack) : '';

    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#0F1115' }} contentContainerStyle={{ padding: 20, paddingTop: 70 }}>
        <Text style={{ color: '#F08A94', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
          ⚠️ Ошибка запуска
        </Text>
        <Text selectable style={{ color: '#F2F3F5', fontSize: 13, fontFamily: 'Courier' }}>
          {msg}
        </Text>
        {comp ? (
          <>
            <Text style={{ color: '#9AA0AD', fontSize: 12, marginTop: 16, marginBottom: 6 }}>Где:</Text>
            <Text selectable style={{ color: '#9AA0AD', fontSize: 12, fontFamily: 'Courier' }}>
              {comp}
            </Text>
          </>
        ) : null}
      </ScrollView>
    );
  }
}
