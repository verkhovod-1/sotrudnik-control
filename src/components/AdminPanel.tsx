import { useState, useEffect } from 'react';
import { User } from '../types';
import {
  getState,
  addUser,
  updateUserRole,
  getDirectorCount,
  getAdminCount,
} from '../store';

interface AdminPanelProps {
  user: User;
}

export default function AdminPanel({ user }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    setUsers(getState().users);
  }, [refresh]);

  const directorCount = getDirectorCount();
  const adminCount = getAdminCount();

  const handlePromoteToAdmin = (userId: string) => {
    if (adminCount >= 3) {
      alert('Максимум 3 администратора');
      return;
    }
    updateUserRole(userId, 'admin');
    setRefresh((r) => r + 1);
  };

  const handlePromoteToDirector = (userId: string) => {
    if (directorCount >= 1) {
      alert('Может быть только 1 управляющий');
      return;
    }
    updateUserRole(userId, 'director');
    setRefresh((r) => r + 1);
  };

  const handleDemoteToEmployee = (userId: string) => {
    updateUserRole(userId, 'employee');
    setRefresh((r) => r + 1);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'director':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Управляющий
          </span>
        );
      case 'admin':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30">
            Администратор
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30">
            Сотрудник
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">Панель управления</h3>
          <p className="text-gray-400 text-sm">
            Управление сотрудниками и ролями
          </p>
        </div>
        {user.role === 'admin' || user.role === 'director' ? (
          <button
            onClick={() => setShowInvite(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-medium"
          >
            + Пригласить сотрудника
          </button>
        ) : null}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <p className="text-amber-300 text-sm">Управляющий</p>
          <p className="text-white text-2xl font-bold">{directorCount}/1</p>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
          <p className="text-purple-300 text-sm">Администраторы</p>
          <p className="text-white text-2xl font-bold">{adminCount}/3</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <p className="text-blue-300 text-sm">Сотрудники</p>
          <p className="text-white text-2xl font-bold">{users.length - directorCount - adminCount}</p>
        </div>
      </div>

      {/* Users list */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
        <div className="p-4 border-b border-gray-700/50">
          <h4 className="text-white font-semibold">Список сотрудников</h4>
        </div>
        <div className="divide-y divide-gray-700/50">
          {users.map((u) => (
            <div key={u.id} className="p-4 flex items-center gap-4 hover:bg-gray-700/20 transition">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {u.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{u.name}</p>
                <p className="text-gray-500 text-xs">{u.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {getRoleBadge(u.role)}
                {/* Role management - only for director */}
                {user.role === 'director' && u.id !== user.id && (
                  <div className="flex gap-1">
                    {u.role !== 'director' && directorCount < 1 && (
                      <button
                        onClick={() => handlePromoteToDirector(u.id)}
                        className="p-1.5 text-amber-400 hover:bg-amber-500/20 rounded transition"
                        title="Назначить управляющим"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
                        </svg>
                      </button>
                    )}
                    {u.role !== 'admin' && adminCount < 3 && (
                      <button
                        onClick={() => handlePromoteToAdmin(u.id)}
                        className="p-1.5 text-purple-400 hover:bg-purple-500/20 rounded transition"
                        title="Назначить администратором"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                        </svg>
                      </button>
                    )}
                    {u.role !== 'employee' && (
                      <button
                        onClick={() => handleDemoteToEmployee(u.id)}
                        className="p-1.5 text-gray-400 hover:bg-gray-500/20 rounded transition"
                        title="Снять роль"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13H5v-2h14v2z" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onInvited={() => {
            setShowInvite(false);
            setRefresh((r) => r + 1);
          }}
        />
      )}
    </div>
  );
}

function InviteModal({ onClose, onInvited }: { onClose: () => void; onInvited: () => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const adminCount = getAdminCount();
  const directorCount = getDirectorCount();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!/^\d{6}$/.test(password)) {
      setError('Пароль должен состоять из 6 цифр');
      return;
    }

    const state = getState();
    if (state.users.find((u) => u.email === email)) {
      setError('Пользователь с таким email уже существует');
      return;
    }

    // Determine role
    let role: 'director' | 'admin' | 'employee' = 'employee';
    if (directorCount === 0) {
      role = 'director';
    } else if (adminCount < 3) {
      role = 'admin';
    }

    addUser({ email, name, password, role });
    setSuccess(true);
    setTimeout(() => {
      onInvited();
    }, 1500);
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-md p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Сотрудник приглашён!</h3>
          <p className="text-gray-400 text-sm">Приглашение отправлено на {email}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-md p-6">
        <h3 className="text-xl font-bold text-white mb-4">Пригласить сотрудника</h3>
        <p className="text-gray-400 text-sm mb-4">
          Новый сотрудник получит доступ к системе. Роль определяется автоматически.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">ФИО сотрудника</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Петров Пётр Петрович"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Электронная почта</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="employee@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Временный пароль (6 цифр)</label>
            <input
              type="text"
              value={password}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setPassword(val);
              }}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-widest text-center"
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

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium"
            >
              Пригласить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
