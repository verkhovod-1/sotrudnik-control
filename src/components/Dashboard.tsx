import { useState, useEffect } from 'react';
import { User } from '../types';
import { formatMSKTime, formatMSKDate, getUnreadCount } from '../store';
import Sidebar from './Sidebar';
import Tasks from './Tasks';
import AllTasks from './AllTasks';
import Documents from './Documents';
import Chat from './Chat';
import Calendar from './Calendar';
import AdminPanel from './AdminPanel';

type Section = 'tasks' | 'all-tasks' | 'documents' | 'chat' | 'calendar' | 'admin';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [activeSection, setActiveSection] = useState<Section>('tasks');
  const [currentTime, setCurrentTime] = useState(formatMSKTime());
  const [currentDate, setCurrentDate] = useState(formatMSKDate());
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(formatMSKTime());
      setCurrentDate(formatMSKDate());
      setUnreadMessages(getUnreadCount(user.id));
    }, 1000);
    return () => clearInterval(timer);
  }, [user.id]);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'director': return 'Управляющий';
      case 'admin': return 'Администратор';
      default: return 'Сотрудник';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'director': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'admin': return 'bg-purple-100 text-purple-700 border-purple-300';
      default: return 'bg-indigo-100 text-indigo-700 border-indigo-300';
    }
  };

  return (
    <div className="min-h-screen flex decorative-bg relative">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        user={user}
        unreadMessages={unreadMessages}
      />

      <div className="flex-1 flex flex-col min-h-screen relative z-10">
        <header className="card-light border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-gray-800 font-semibold text-lg capitalize">
              {activeSection === 'tasks' && 'Мои задачи'}
              {activeSection === 'all-tasks' && 'Все задачи'}
              {activeSection === 'documents' && 'Документы и файлы'}
              {activeSection === 'chat' && 'Чат'}
              {activeSection === 'calendar' && 'Календарь'}
              {activeSection === 'admin' && 'Панель управления'}
            </h2>
            <p className="text-gray-600 text-sm">{currentDate} • МСК {currentTime}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <div className="text-right">
                <p className="text-gray-800 text-sm font-medium">{user.name.split(' ').slice(0, 2).join(' ')}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${getRoleColor(user.role)}`}>
                  {getRoleLabel(user.role)}
                </span>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-2 text-gray-600 hover:text-red-500 transition"
              title="Выйти"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          {activeSection === 'tasks' && <Tasks user={user} />}
          {activeSection === 'all-tasks' && <AllTasks user={user} />}
          {activeSection === 'documents' && <Documents user={user} />}
          {activeSection === 'chat' && <Chat user={user} />}
          {activeSection === 'calendar' && <Calendar user={user} />}
          {activeSection === 'admin' && <AdminPanel user={user} />}
        </main>
      </div>
    </div>
  );
}
