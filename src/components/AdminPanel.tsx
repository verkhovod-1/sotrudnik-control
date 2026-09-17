import { useState, useEffect } from 'react';
import { User, Role } from '../types';
import {
  getState,
  inviteUser,
  updateUserRole,
  removeUser,
  getDirectorCount,
  getAdminCount,
} from '../store';
import SearchBar from './SearchBar';

interface AdminPanelProps {
  user: User;
}

export default function AdminPanel({ user }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setUsers(getState().users);
  }, []);

  const directorCount = getDirectorCount();
  const adminCount = getAdminCount();

  const filteredUsers = searchQuery.trim()
    ? users.filter((u) => {
        const query = searchQuery.toLowerCase();
        return (
          u.name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query)
        );
      })
    : users;

  const handlePromoteToAdmin = (userId: string) => {
    if (adminCount >= 3) {
      alert('Максимум 3 администратора');
      return;
    }
    updateUserRole(userId, 'admin');
    setUsers(getState().users);
  };

  const handlePromoteToDirector = (userId: string) => {
    if (directorCount >= 1) {
      alert('Может быть только 1 управляющий');
      return;
    }
    updateUserRole(userId, 'director');
    setUsers(getState().users);
  };

  const handleDemoteToEmployee = (userId: string) => {
    updateUserRole(userId, 'employee');
    setUsers(getState().users);
  };

  const handleRemove = (userId: string) => {
    if (confirm('Удалить сотрудника? Это действие нельзя отменить.')) {
      removeUser(userId);
      setUsers(getState().users);
    }
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

  const canManageRoles = user.role === 'director';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">Панель управления</h3>
          <p className="text-gray-400 text-sm">
            Управление сотрудниками и ролями
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-medium"
        >
          + Пригласить сотрудника
        </button>
      </div>

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
          <p className="text-blue-300 text-sm">Всего сотрудников</p>
          <p className="text-white text-2xl font-bold">{users.length}</p>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
        <div className="p-4 border-b border-gray-700/50">
          <h4 className="text-white font-semibold mb-3">Список сотрудников</h4>
          <div className="max-w-md">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Поиск по имени или email..."
            />
          </div>
        </div>
        <div className="divide-y divide-gray-700/50">
          {filteredUsers.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              {searchQuery.trim() ? 'Сотрудники не найдены' : 'Нет сотрудников'}
            </div>
          ) : null}
          {filteredUsers.map((u) => (
            <div key={u.id} className="p-4 flex items-center gap-4 hover:bg-gray-700/20 transition">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {u.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium truncate">{u.name}</p>
                  {!u.isActive && (
                    <span className="px-1.5 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                      Ожидает активации
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-xs">{u.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {getRoleBadge(u.role)}
                {canManageRoles && u.id !== user.id && (
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
                    <button
                      onClick={() => handleRemove(u.id)}
                      className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition"
                      title="Удалить сотрудника"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onInvited={() => {
            setShowInvite(false);
            setUsers(getState().users);
          }}
          invitedBy={user.id}
        />
      )}
    </div>
  );
}

function InviteModal({
  onClose,
  onInvited,
  invitedBy,
}: {
  onClose: () => void;
  onInvited: () => void;
  invitedBy: string;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('employee');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tempPassword, setTempPassword] = useState('');

  const directorCount = getDirectorCount();
  const adminCount = getAdminCount();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const state = getState();
    if (state.users.find((u) => u.email === email)) {
      setError('Пользователь с таким email уже существует');
      return;
    }

    if (role === 'director' && directorCount >= 1) {
      setError('Может быть только 1 управляющий');
      return;
    }
    if (role === 'admin' && adminCount >= 3) {
      setError('Максимум 3 администратора');
      return;
    }

    const result = inviteUser(email, name, role, invitedBy);
    setTempPassword(result.tempPassword);
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-md p-6">
          <div className="text-center mb-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Приглашение отправлено!</h3>
            <p className="text-gray-400 text-sm">
              На почту <span className="text-white">{email}</span> отправлено приглашение с временным паролем.
            </p>
          </div>

          <div className="bg-gray-700/50 rounded-lg p-4 mb-4 border border-gray-600/50">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-blue-300 text-xs font-medium">📧 Демо: содержимое письма</span>
            </div>
            <div className="text-gray-300 text-xs space-y-1">
              <p>Здравствуйте, <span className="text-white">{name}</span>!</p>
              <p>Вы приглашены в систему «Синхрон».</p>
              <p>Ваша роль: <span className="text-white">
                {role === 'director' ? 'Управляющий' : role === 'admin' ? 'Администратор' : 'Сотрудник'}
              </span></p>
              <p>Временный пароль: <span className="text-amber-300 font-mono font-bold tracking-widest">{tempPassword}</span></p>
              <p className="text-gray-400 mt-2">
                Перейдите по ссылке для активации: <span className="text-blue-400 underline">synchron.app/activate?email={email}</span>
              </p>
              <p className="text-gray-500 mt-1">После входа вам будет предложено установить постоянный 6-значный пароль.</p>
            </div>
          </div>

          <button
            onClick={onInvited}
            className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium"
          >
            Готово
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-md p-6">
        <h3 className="text-xl font-bold text-white mb-2">Пригласить сотрудника</h3>
        <p className="text-gray-400 text-sm mb-4">
          Укажите email сотрудника и выберите роль. На почту будет отправлено приглашение с временным паролем.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">ФИО сотрудника</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Роль в системе</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="employee">Сотрудник (без ограничений по количеству)</option>
              <option value="admin" disabled={adminCount >= 3}>
                Администратор ({adminCount}/3)
              </option>
              <option value="director" disabled={directorCount >= 1}>
                Управляющий ({directorCount}/1)
              </option>
            </select>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3 text-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-blue-300 text-xs">
              ℹ️ Сотруднику на почту придёт приглашение со ссылкой и временным паролем. При первом входе он установит свой постоянный 6-значный пароль.
            </p>
          </div>

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
