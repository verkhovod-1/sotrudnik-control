
import { useState, useEffect, useRef, useCallback } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import SearchBar from './SearchBar';
import {
  readFileAsDataURL,
  formatFileSize,
  getFileIcon,
  isAllowedFile,
} from '../utils/files';

interface CalendarProps {
  user: User;
}

interface NoteAttachment {
  name: string;
  size: number;
  type: string;
  file_path: string;
  signedUrl?: string;
}

interface CalendarNoteRow {
  id: string;
  user_id: string;
  title: string;
  date: string;
  time: string;
  recurring: boolean;
  remind_days_before: number;
  task_id?: string | null;
  attachments?: NoteAttachment[] | null;
}

interface CalendarNote extends CalendarNoteRow {
  attachments: NoteAttachment[];
}

function getMSKDateString() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function getDaysBetween(from: string, to: string) {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);

  const fromDate = Date.UTC(fy, fm - 1, fd);
  const toDate = Date.UTC(ty, tm - 1, td);

  return Math.round((toDate - fromDate) / 86400000);
}

function safeFileName(name: string) {
  return name
    .replace(/[^\p{L}\p{N}._-]/gu, '_')
    .slice(0, 120);
}

function formatNoteDate(date: string, includeYear = false) {
  return new Date(date + 'T00:00:00').toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    ...(includeYear ? { year: 'numeric' } : {}),
  });
}

export default function Calendar({ user }: CalendarProps) {
  const [notes, setNotes] = useState<CalendarNote[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddNote, setShowAddNote] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const processedReminders = useRef(new Set<string>());

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError('');

    const { data, error: loadError } = await supabase
      .from('calendar_notes')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true });

    if (loadError) {
      console.error('Ошибка загрузки календаря:', loadError);
      setError('Не удалось загрузить заметки календаря.');
      setLoading(false);
      return;
    }

    const rows = (data || []) as CalendarNoteRow[];

    const mapped: CalendarNote[] = await Promise.all(
      rows.map(async (row) => {
        const attachments = await Promise.all(
          (row.attachments || []).map(async (attachment) => {
            if (!attachment.file_path) return attachment;

            const { data: signedData, error: signedError } =
              await supabase.storage
                .from('synchron-calendar')
                .createSignedUrl(attachment.file_path, 3600);

            if (signedError) {
              console.error('Ошибка ссылки на файл:', signedError);
            }

            return {
              ...attachment,
              signedUrl: signedData?.signedUrl,
            };
          })
        );

        return {
          ...row,
          attachments,
        };
      })
    );

    setNotes(mapped);
    setLoading(false);

    // Создание задач-напоминаний для наступивших дат.
    const today = getMSKDateString();

    for (const note of rows) {
      if (note.task_id || processedReminders.current.has(note.id)) {
        continue;
      }

      const daysUntil = getDaysBetween(today, note.date);

      if (daysUntil !== note.remind_days_before) {
        continue;
      }

      processedReminders.current.add(note.id);

      const taskDeadline = new Date(
        `${note.date}T${note.time || '09:00'}:00+03:00`
      ).toISOString();

      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          title: `📅 Напоминание: ${note.title}`,
          description: `Автоматически созданная задача из календаря. Заметка на ${note.date}`,
          assignee_id: user.id,
          creator_id: user.id,
          deadline: taskDeadline,
          completed: false,
        })
        .select('id')
        .single();

      if (taskError || !task) {
        console.error('Ошибка создания напоминания:', taskError);
        processedReminders.current.delete(note.id);
        continue;
      }

      const { error: updateError } = await supabase
        .from('calendar_notes')
        .update({ task_id: task.id })
        .eq('id', note.id)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Ошибка привязки напоминания:', updateError);
      } else {
        setNotes((previous) =>
          previous.map((item) =>
            item.id === note.id
              ? { ...item, task_id: task.id }
              : item
          )
        );
      }
    }
  }, [user.id]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const filteredNotes = searchQuery.trim()
    ? notes.filter((note) =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : notes;

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const todayStr = getMSKDateString();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek =
    firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

  const daysInMonth = lastDay.getDate();
  const calendarDays: (number | null)[] = [];

  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push(null);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const getDateString = (day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getNotesForDay = (day: number) => {
    const dateStr = getDateString(day);
    return filteredNotes.filter((note) => note.date === dateStr);
  };

  const prevMonth = () =>
    setCurrentMonth(new Date(year, month - 1, 1));

  const nextMonth = () =>
    setCurrentMonth(new Date(year, month + 1, 1));

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
  ];

  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const selectedNotes = selectedDate
    ? filteredNotes.filter((note) => note.date === selectedDate)
    : [];

  async function handleDeleteNote(note: CalendarNote) {
    if (!window.confirm('Удалить эту заметку?')) return;

    setError('');

    const filePaths = note.attachments
      .map((attachment) => attachment.file_path)
      .filter(Boolean);

    const { error: deleteError } = await supabase
      .from('calendar_notes')
      .delete()
      .eq('id', note.id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Ошибка удаления заметки:', deleteError);
      setError('Не удалось удалить заметку.');
      return;
    }

    if (filePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('synchron-calendar')
        .remove(filePaths);

      if (storageError) {
        console.error('Ошибка удаления файлов:', storageError);
      }
    }

    setNotes((previous) =>
      previous.filter((item) => item.id !== note.id)
    );
  }

  async function handleRemoveAttachment(
    note: CalendarNote,
    index: number
  ) {
    const attachment = note.attachments[index];
    if (!attachment) return;

    const updatedAttachments = note.attachments.filter(
      (_, i) => i !== index
    );

    const { error: updateError } = await supabase
      .from('calendar_notes')
      .update({ attachments: updatedAttachments.map(
        ({ signedUrl, ...item }) => item
      ) })
      .eq('id', note.id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Ошибка обновления вложений:', updateError);
      setError('Не удалось удалить вложение.');
      return;
    }

    if (attachment.file_path) {
      const { error: storageError } = await supabase.storage
        .from('synchron-calendar')
        .remove([attachment.file_path]);

      if (storageError) {
        console.error('Ошибка удаления файла:', storageError);
      }
    }

    setNotes((previous) =>
      previous.map((item) =>
        item.id === note.id
          ? { ...item, attachments: updatedAttachments }
          : item
      )
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-4 max-w-md">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Поиск заметок..."
        />
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <div className="card-light rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={prevMonth}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <h3 className="text-gray-800 font-semibold text-lg">
                {monthNames[month]} {year}
              </h3>

              <button
                onClick={nextMonth}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map((day) => (
                <div
                  key={day}
                  className="text-center text-gray-500 text-xs font-medium py-1"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                if (day === null) {
                  return <div key={index} className="aspect-square" />;
                }

                const dateStr = getDateString(day);
                const dayNotes = getNotesForDay(day);
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition relative ${
                      isToday
                        ? 'bg-indigo-100 border border-indigo-300 text-indigo-700'
                        : isSelected
                        ? 'bg-purple-100 border border-purple-300 text-purple-700'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span>{day}</span>

                    {dayNotes.length > 0 && (
                      <div className="absolute bottom-1 flex gap-0.5">
                        {dayNotes.slice(0, 3).map((note, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${
                              note.recurring
                                ? 'bg-amber-500'
                                : 'bg-indigo-500'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-4 mt-4 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                Разовое
              </span>

              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                Ежемесячное
              </span>
            </div>
          </div>
        </div>

        <div className="lg:w-80">
          <div className="card-light rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-800 font-semibold">
                {selectedDate
                  ? `Заметки на ${formatNoteDate(selectedDate)}`
                  : 'Выберите дату'}
              </h3>

              {selectedDate && (
                <button
                  onClick={() => setShowAddNote(true)}
                  className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition shadow-md"
                  title="Добавить заметку"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
            </div>

            {loading ? (
              <p className="text-gray-500 text-sm text-center py-8">
                Загрузка заметок...
              </p>
            ) : !selectedDate ? (
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
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-indigo-50 border-indigo-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-800 text-sm font-medium">
                          {note.title}
                        </p>

                        <p className="text-gray-600 text-xs mt-1">
                          {note.time && `🕐 ${note.time}`}
                          {note.recurring && ' • 🔄 Ежемесячно'}
                          {note.remind_days_before > 0 &&
                            ` • ⏰ За ${note.remind_days_before} дн.`}
                        </p>

                        {note.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {note.attachments.map((attachment, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 p-1.5 bg-white rounded"
                              >
                                <span className="text-xs flex-shrink-0">
                                  {getFileIcon(attachment.name)}
                                </span>

                                <div className="flex-1 min-w-0">
                                  {attachment.signedUrl ? (
                                    <a
                                      href={attachment.signedUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-indigo-600 truncate block hover:underline"
                                    >
                                      {attachment.name}
                                    </a>
                                  ) : (
                                    <span className="text-xs text-gray-500 truncate block">
                                      {attachment.name}
                                    </span>
                                  )}

                                  <span className="text-xs text-gray-500">
                                    {formatFileSize(attachment.size)}
                                  </span>
                                </div>

                                <button
                                  onClick={() =>
                                    handleRemoveAttachment(note, index)
                                  }
                                  className="text-gray-400 hover:text-red-500 transition"
                                  title="Удалить вложение"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1 ml-2">
                        <NoteAttachButton
                          noteId={note.id}
                          userId={user.id}
                          existingAttachments={note.attachments}
                          onAttached={loadNotes}
                        />

                        <button
                          onClick={() => handleDeleteNote(note)}
                          className="text-gray-400 hover:text-red-500 transition"
                          title="Удалить заметку"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddNote && selectedDate && (
        <AddNoteModal
          user={user}
          date={selectedDate}
          onClose={() => setShowAddNote(false)}
          onAdded={async () => {
            setShowAddNote(false);
            await loadNotes();
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!title.trim()) return;

    setSaving(true);
    setError('');

    const { error: insertError } = await supabase
      .from('calendar_notes')
      .insert({
        user_id: user.id,
        title: title.trim(),
        date,
        time,
        recurring,
        remind_days_before: remindDaysBefore,
        attachments: [],
      });

    setSaving(false);

    if (insertError) {
      console.error('Ошибка создания заметки:', insertError);
      setError('Не удалось сохранить заметку.');
      return;
    }

    onAdded();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card-light rounded-2xl w-full max-w-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          Новая заметка на {formatNoteDate(date, true)}
        </h3>

        {error && (
          <p className="text-red-600 text-sm mb-3">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Название заметки
            </label>

            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Время (необязательно)
            </label>

            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={recurring}
                onChange={(event) => setRecurring(event.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-500 focus:ring-indigo-400"
              />

              <span className="text-gray-700 text-sm">
                Ежемесячно
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Напомнить за сколько дней до события?
            </label>

            <input
              type="number"
              value={remindDaysBefore}
              onChange={(event) =>
                setRemindDaysBefore(
                  Math.min(30, Math.max(0, parseInt(event.target.value) || 0))
                )
              }
              min={0}
              max={30}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Отмена
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition font-medium shadow-md disabled:opacity-50"
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NoteAttachButton({
  noteId,
  userId,
  existingAttachments,
  onAttached,
}: {
  noteId: string;
  userId: string;
  existingAttachments: NoteAttachment[];
  onAttached: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!isAllowedFile(file.name)) {
      alert('Формат файла не поддерживается');
      event.target.value = '';
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      alert('Размер файла не должен превышать 25 МБ');
      event.target.value = '';
      return;
    }

    setUploading(true);

    try {
      // Проверяем чтение файла перед загрузкой.
      await readFileAsDataURL(file);

      const path = `${userId}/${noteId}/${Date.now()}-${safeFileName(file.name)}`;

      const { error: uploadError } = await supabase.storage
        .from('synchron-calendar')
        .upload(path, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const newAttachment: NoteAttachment = {
        name: file.name,
        size: file.size,
        type: file.type,
        file_path: path,
      };

      const updatedAttachments = [
        ...existingAttachments.map(({ signedUrl, ...item }) => item),
        newAttachment,
      ];

      const { error: updateError } = await supabase
        .from('calendar_notes')
        .update({ attachments: updatedAttachments })
        .eq('id', noteId)
        .eq('user_id', userId);

      if (updateError) {
        await supabase.storage
          .from('synchron-calendar')
          .remove([path]);

        throw updateError;
      }

      onAttached();
    } catch (error) {
      console.error('Ошибка загрузки файла:', error);
      alert('Не удалось загрузить файл. Попробуйте ещё раз.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="text-gray-400 hover:text-indigo-600 transition disabled:opacity-50"
        title={uploading ? 'Загрузка...' : 'Прикрепить файл'}
      >
        {uploading ? (
          <span className="text-xs">...</span>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        )}
      </button>
    </>
  );
}
