import { useState } from 'react';
import { User } from '../types';
import { activateUser, findUserByEmail } from '../store';

type Screen = 'login' | 'activate' | 'forgot' | 'forgot-sent';

interface LoginProps {
  onLogin: (email: string, password: string) => { success: boolean; error?: string; needsActivation?: boolean };
  onForgotPassword: (email: string) => { success: boolean; tempPassword?: string; error?: string };
  onActivated: (user: User) => void;
}

export default function Login({ onLogin, onForgotPassword, onActivated }: LoginProps) {
  const [screen, setScreen] = useState<Screen>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [activatedEmail, setActivatedEmail] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = onLogin(email, password);
    if (result.success) {
      // handled by parent
    } else if (result.needsActivation) {
      setScreen('activate');
      setActivatedEmail(email);
    } else {
      setError(result.error || 'Ошибка входа');
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = onForgotPassword(email);
    if (result.success) {
      setTempPassword(result.tempPassword || '');
      setActivatedEmail(email);
      setScreen('forgot-sent');
    } else {
      setError(result.error || 'Ошибка');
    }
  };

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    if (!/^\d{6}$/.test(newPassword)) {
      setError('Пароль должен состоять из 6 цифр');
      return;
    }
    const result = activateUser(activatedEmail, newPassword);
    if (result.success) {
      const user = findUserByEmail(activatedEmail);
      if (user) {
        onActivated(user);
      }
    } else {
      setError(result.error || 'Ошибка активации');
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setTempPassword('');
    setActivatedEmail('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 mb-4">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Синхрон</h1>
            <p className="text-blue-200 text-sm">Система управления задачами</p>
          </div>

          {screen === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-1">Электронная почта</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                  placeholder="email@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-1">Пароль</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setPassword(val);
                  }}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition tracking-widest text-center text-xl"
                  placeholder="••••••"
                  maxLength={6}
                  required
                />
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3 text-red-200 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
              >
                Войти
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setScreen('forgot');
                    setError('');
                  }}
                  className="text-blue-300 hover:text-white text-sm transition underline underline-offset-2"
                >
                  Забыли пароль?
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-blue-300/60 text-xs text-center">
                  Вход только по приглашению. Обратитесь к администратору для получения доступа.
                </p>
              </div>
            </form>
          )}

          {screen === 'activate' && (
            <div className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
                <svg className="w-8 h-8 text-green-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-green-300 text-sm font-medium">Временный пароль принят!</p>
                <p className="text-green-200/70 text-xs mt-1">Придумайте свой постоянный 6-значный пароль</p>
              </div>

              <form onSubmit={handleActivate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-blue-200 mb-1">Новый пароль (6 цифр)</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setNewPassword(val);
                    }}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition tracking-widest text-center text-xl"
                    placeholder="••••••"
                    maxLength={6}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-200 mb-1">Подтвердите пароль</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setConfirmPassword(val);
                    }}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition tracking-widest text-center text-xl"
                    placeholder="••••••"
                    maxLength={6}
                    required
                  />
                </div>

                {error && (
                  <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3 text-red-200 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200"
                >
                  Установить пароль
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setScreen('login');
                    resetForm();
                  }}
                  className="w-full py-2 text-blue-300 hover:text-white text-sm transition"
                >
                  ← Вернуться ко входу
                </button>
              </form>
            </div>
          )}

          {screen === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="text-center mb-2">
                <svg className="w-12 h-12 text-blue-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <p className="text-blue-200 text-sm">
                  Введите email, на который было оформлено приглашение. Вам будет отправлен временный пароль.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-200 mb-1">Электронная почта</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                  placeholder="email@example.com"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3 text-red-200 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200"
              >
                Получить временный пароль
              </button>

              <button
                type="button"
                onClick={() => {
                  setScreen('login');
                  resetForm();
                }}
                className="w-full py-2 text-blue-300 hover:text-white text-sm transition"
              >
                ← Вернуться ко входу
              </button>
            </form>
          )}

          {screen === 'forgot-sent' && (
            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center">
                <svg className="w-12 h-12 text-blue-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-blue-200 text-sm font-medium mb-1">Временный пароль отправлен!</p>
                <p className="text-blue-300/70 text-xs">
                  На почту <span className="text-white">{activatedEmail}</span> отправлено приглашение с временным паролем.
                </p>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <p className="text-amber-300 text-xs font-medium mb-1">📧 Демо: содержимое письма</p>
                <p className="text-amber-200/80 text-xs">
                  Ваш временный пароль: <span className="text-white font-mono font-bold text-sm tracking-widest">{tempPassword}</span>
                </p>
                <p className="text-amber-200/60 text-xs mt-1">
                  Введите его на экране входа для активации аккаунта и установки постоянного пароля.
                </p>
              </div>

              <button
                onClick={() => {
                  setScreen('login');
                  setPassword('');
                  setError('');
                }}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200"
              >
                Ввести временный пароль
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
