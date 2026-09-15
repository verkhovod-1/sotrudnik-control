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
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
      case 'director': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'admin': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      default: return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        user={user}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        unreadMessages={unreadMessages}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700/50 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h2 className="text-white font-semibold text-lg capitalize">
                {activeSection === 'tasks' && 'Мои задачи'}
                {activeSection === 'all-tasks' && 'Все задачи'}
                {activeSection === 'documents' && 'Документы и файлы'}
                {activeSection === 'chat' && 'Чат'}
                {activeSection === 'calendar' && 'Календарь'}
                {activeSection === 'admin' && 'Панель управления'}
              </h2>
              <p className="text-gray-400 text-sm">{currentDate} • МСК {currentTime}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <div className="text-right">
                <p className="text-white text-sm font-medium">{user.name.split(' ').slice(0, 2).join(' ')}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${getRoleColor(user.role)}`}>
                  {getRoleLabel(user.role)}
                </span>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-2 text-gray-400 hover:text-red-400 transition"
              title="Выйти"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
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
