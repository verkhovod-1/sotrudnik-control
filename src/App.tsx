import { useState, useEffect } from 'react';
import { User } from './types';
import {
  authenticate,
  findUserByEmail,
  resetPassword,
} from './store';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('synchron_current_user');
    if (saved) {
      try {
        const user = JSON.parse(saved);
        // Проверяем что пользователь всё ещё активен
        if (user.isActive) {
          setCurrentUser(user);
        } else {
          localStorage.removeItem('synchron_current_user');
        }
      } catch {
        localStorage.removeItem('synchron_current_user');
      }
    }
    setIsLoading(false);
  }, []);

  // Вход — проверяет email и пароль (временный или постоянный)
  const handleLogin = (email: string, password: string): { success: boolean; error?: string; needsActivation?: boolean } => {
    const user = findUserByEmail(email);
    if (!user) return { success: false, error: 'Пользователь с таким email не найден' };

    const authenticated = authenticate(email, password);
    if (!authenticated) return { success: false, error: 'Неверный пароль' };

    // Если пользователь не активирован — нужно сменить пароль
    if (!user.isActive) {
      return { success: false, needsActivation: true };
    }

    setCurrentUser(user);
    localStorage.setItem('synchron_current_user', JSON.stringify(user));
    return { success: true };
  };

  // Забыл пароль — генерирует временный
  const handleForgotPassword = (email: string): { success: boolean; tempPassword?: string; error?: string } => {
    return resetPassword(email);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('synchron_current_user');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Login
        onLogin={handleLogin}
        onForgotPassword={handleForgotPassword}
        onActivated={(user) => {
          setCurrentUser(user);
          localStorage.setItem('synchron_current_user', JSON.stringify(user));
        }}
      />
    );
  }

  return <Dashboard user={currentUser} onLogout={handleLogout} />;
}

export default App;
