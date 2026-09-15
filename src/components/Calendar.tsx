import { useState, useEffect } from 'react';
import { User, CalendarNote } from '../types';
import {
  getCalendarNotesForUser,
  addCalendarNote,
  deleteCalendarNote,
  addTask,
  getMSKDateString,
} from '../store';
import SearchBar from './SearchBar';

interface CalendarProps {
  user: User;
}

export default function Calendar({ user }: CalendarProps) {
  const [notes, setNotes] = useState<CalendarNote[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddNote, setShowAddNote] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setNotes(getCalendarNotesForUser(user.id));
  }, [user.id, refresh]);

  // Фильтрация заметок по поиску
  const filteredNotes = searchQuery.trim()
    ? notes.filter((n) => n.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : notes;

  // Check reminders and auto-create tasks
  useEffect(() => {
    const today = new Date();
    notes.forEach((note) => {
      const noteDate = new Date(note.date);
      const daysUntil = Math.ceil((noteDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntil === note.remindDaysBefore && !note.taskId) {
        // Create task automatically
        const task = addTask({
          title: `📅 Напоминание: ${note.title}`,
          description: `Автоматически созданная задача из календаря. Заметка на ${note.date}`,
          assigneeId: user.id,
          creatorId: user.id,
          deadline: noteDate.toISOString(),
        });
        
        // Update note with task reference
        const allNotes = getCalendarNotesForUser(user.id);
        const updatedNotes = allNotes.map((n) =>
          n.id === note.id ? { ...n, taskId: task.id } : n
        );
        // Save updated notes
        localStorage.setItem(
          'synchron_app_data',
          JSON.stringify({
            ...JSON.parse(localStorage.getItem('synchron_app_data') || '{}'),
            calendarNotes: updatedNotes,
          })
        );
        setRefresh((r) => r + 1);
      }
    });
  }, [notes, user.id]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const todayStr = getMSKDateString();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday start

  const daysInMonth = lastDay.getDate();
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const getDateString = (day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getNotesForDay = (day: number) => {
    const dateStr = getDateString(day);
    return filteredNotes.filter((n) => n.date === dateStr);
  };

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
  ];

  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const selectedNotes = selectedDate
    ? filteredNotes.filter((n) => n.date === selectedDate)
    : [];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Search */}
      <div className="mb-4 max-w-md">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Поиск заметок по названию..."
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar */}
        <div className="flex-1">
          <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4">
            {/* Calendar header */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={prevMonth}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-white font-semibold text-lg">
                {monthNames[month]} {year}
              </h3>
              <button
                onClick={nextMonth}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Day names */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map((d) => (
                <div key={d} className="text-center text-gray-500 text-xs font-medium py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                if (day === null) {
                  return <div key={idx} className="aspect-square" />;
                }
                const dateStr = getDateString(day);
                const dayNotes = getNotesForDay(day);
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition relative ${
                      isToday
                        ? 'bg-blue-500/20 border border-blue-500/50 text-blue-300'
                        : isSelected
                        ? 'bg-purple-500/20 border border-purple-500/50 text-purple-300'
                        : 'hover:bg-gray-700/50 text-gray-300'
                    }`}
                  >
                    <span>{day}</span>
                    {dayNotes.length > 0 && (
                      <div className="absolute bottom-1 flex gap-0.5">
                        {dayNotes.slice(0, 3).map((n, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${
                              n.recurring ? 'bg-amber-400' : 'bg-blue-400'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-4 mt-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-400"></div> Разовое
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-400"></div> Ежемесячное
              </span>
            </div>
          </div>
        </div>

        {/* Notes panel */}
        <div className="lg:w-80">
          <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">
                {selectedDate
                  ? `Заметки на ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`
                  : 'Выберите дату'}
              </h3>
              {selectedDate && (
                <button
                  onClick={() => setShowAddNote(true)}
                  className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                  title="Добавить заметку"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
            </div>

            {!selectedDate ? (
              <p className="text-gray-500 text-sm text-center py-8">
                Нажмите на дату в календаре
              </p>
            ) : selectedNotes.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">
                Нет заметок на эту дату
              </p>
            ) : (
              <div className="space-y-2">
                {selectedNotes.map((note) => (
                  <div
                    key={note.id}
                    className={`p-3 rounded-lg border ${
                      note.recurring
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-blue-500/10 border-blue-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">{note.title}</p>
                        <p className="text-gray-400 text-xs mt-1">
                          {note.time && `🕐 ${note.time}`}
                          {note.recurring && ' • 🔄 Ежемесячно'}
                          {note.remindDaysBefore > 0 && ` • ⏰ За ${note.remindDaysBefore} дн.`}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          deleteCalendarNote(note.id);
                          setRefresh((r) => r + 1);
                        }}
                        className="text-gray-500 hover:text-red-400 transition"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Note Modal */}
      {showAddNote && selectedDate && (
        <AddNoteModal
          user={user}
          date={selectedDate}
          onClose={() => setShowAddNote(false)}
          onAdded={() => {
            setShowAddNote(false);
            setRefresh((r) => r + 1);
          }}
        />
      )}
    </div>
  );
}

function AddNoteModal({
  user,
  date,
  onClose,
  onAdded,
}: {
  user: User;
  date: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [remindDaysBefore, setRemindDaysBefore] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    addCalendarNote({
      userId: user.id,
      title,
      date,
      time,
      recurring,
      remindDaysBefore,
    });
    onAdded();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-md p-6">
        <h3 className="text-xl font-bold text-white mb-4">
          Новая заметка на {new Date(date + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Название заметки</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Встреча с клиентом"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Время (необязательно)</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={recurring}
                onChange={(e) => setRecurring(e.target.checked)}
                className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-gray-300 text-sm">Ежемесячно</span>
            </label>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Напомнить за сколько дней до события?
            </label>
            <input
              type="number"
              value={remindDaysBefore}
              onChange={(e) => setRemindDaysBefore(parseInt(e.target.value) || 0)}
              min={0}
              max={30}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-gray-500 text-xs mt-1">
              Программа автоматически создаст вам задачу-напоминание за указанное количество дней
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
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
