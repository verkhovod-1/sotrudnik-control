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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
              <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Синхрон</h1>
            <p className="text-gray-600 text-sm">Система управления задачами</p>
          </div>

          {/* LOGIN SCREEN */}
          {screen === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Электронная почта</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                  placeholder="email@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setPassword(val);
                  }}
                  className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition tracking-widest text-center text-xl"
                  placeholder="••••••"
                  maxLength={6}
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
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
                  className="text-indigo-600 hover:text-indigo-800 text-sm transition underline underline-offset-2"
                >
                  Забыли пароль?
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-gray-500 text-xs text-center">
                  Вход только по приглашению. Обратитесь к администратору для получения доступа.
                </p>
              </div>
            </form>
          )}

          {/* ACTIVATE SCREEN */}
          {screen === 'activate' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <svg className="w-8 h-8 text-green-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-green-700 text-sm font-medium">Временный пароль принят!</p>
                <p className="text-green-600 text-xs mt-1">Придумайте свой постоянный 6-значный пароль</p>
              </div>

              <form onSubmit={handleActivate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Новый пароль (6 цифр)</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setNewPassword(val);
                    }}
                    className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition tracking-widest text-center text-xl"
                    placeholder="••••••"
                    maxLength={6}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Подтвердите пароль</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setConfirmPassword(val);
                    }}
                    className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition tracking-widest text-center text-xl"
                    placeholder="••••••"
                    maxLength={6}
                    required
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">
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
                  className="w-full py-2 text-indigo-600 hover:text-indigo-800 text-sm transition"
                >
                  ← Вернуться ко входу
                </button>
              </form>
            </div>
          )}

          {/* FORGOT PASSWORD SCREEN */}
          {screen === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="text-center mb-2">
                <svg className="w-12 h-12 text-indigo-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <p className="text-gray-600 text-sm">
                  Введите email, на который было оформлено приглашение. Вам будет отправлен временный пароль.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Электронная почта</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                  placeholder="email@example.com"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200"
              >
                Получить временный пароль
              </button>

              <button
                type="button"
                onClick={() => {
                  setScreen('login');
                  resetForm();
                }}
                className="w-full py-2 text-indigo-600 hover:text-indigo-800 text-sm transition"
              >
                ← Вернуться ко входу
              </button>
            </form>
          )}

          {/* FORGOT — SENT SCREEN */}
          {screen === 'forgot-sent' && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-center">
                <svg className="w-12 h-12 text-indigo-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-indigo-700 text-sm font-medium mb-1">Временный пароль отправлен!</p>
                <p className="text-indigo-600 text-xs">
                  На почту <span className="text-gray-800 font-medium">{activatedEmail}</span> отправлено приглашение с временным паролем.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-amber-700 text-xs font-medium mb-1">📧 Демо: содержимое письма</p>
                <p className="text-amber-600 text-xs">
                  Ваш временный пароль: <span className="text-gray-800 font-mono font-bold text-sm tracking-widest">{tempPassword}</span>
                </p>
                <p className="text-amber-500 text-xs mt-1">
                  Введите его на экране входа для активации аккаунта и установки постоянного пароля.
                </p>
              </div>

              <button
                onClick={() => {
                  setScreen('login');
                  setPassword('');
                  setError('');
                }}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200"
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
