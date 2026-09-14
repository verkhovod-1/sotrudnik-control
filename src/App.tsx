import { useState, useEffect } from 'react';
import { User } from './types';
import { authenticate, findUserByEmail, addUser, getDirectorCount, getAdminCount } from './store';
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
        setCurrentUser(user);
      } catch {
        localStorage.removeItem('synchron_current_user');
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (email: string, password: string): string | null => {
    const user = authenticate(email, password);
    if (!user) return 'Неверный email или пароль';
    setCurrentUser(user);
    localStorage.setItem('synchron_current_user', JSON.stringify(user));
    return null;
  };

  const handleRegister = (email: string, name: string, password: string): string | null => {
    if (findUserByEmail(email)) return 'Пользователь с таким email уже существует';
    if (password.length !== 6) return 'Пароль должен состоять из 6 цифр';
    if (!/^\d{6}$/.test(password)) return 'Пароль должен содержать только цифры';
    
    const directorCount = getDirectorCount();
    const adminCount = getAdminCount();
    
    let role: 'director' | 'admin' | 'employee' = 'employee';
    if (directorCount === 0) {
      role = 'director';
    } else if (adminCount < 3) {
      role = 'admin';
    }
    
    const user = addUser({ email, name, password, role });
    setCurrentUser(user);
    localStorage.setItem('synchron_current_user', JSON.stringify(user));
    return null;
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
    return <Login onLogin={handleLogin} onRegister={handleRegister} />;
  }

  return <Dashboard user={currentUser} onLogout={handleLogout} />;
}

export default App;
