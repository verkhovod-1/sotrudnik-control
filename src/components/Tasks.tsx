
import { useState, useEffect, useMemo } from 'react';
import { User, Task } from '../types';
import { supabase } from '../lib/supabase';
import SearchBar from './SearchBar';

interface TasksProps {
  user: User;
}

interface ProfileRow {
  id: string;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
}

interface TaskRow {
  id: string;
  title: string;
  description?: string | null;
  assignee_id: string;
  creator_id: string;
  created_at: string;
  deadline: string;
  completed: boolean;
  completed_at?: string | null;
  attachments?: Task['attachments'];
}

interface EmployeeOption {
  id: string;
  name: string;
}

const isManager = (user: User) =>
  user.role === 'director' || user.role === 'admin';

function formatDateTime(value: string) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    assigneeId: row.assignee_id,
    creatorId: row.creator_id,
    createdAt: row.created_at,
    deadline: row.deadline,
    completed: row.completed,
    completedAt: row.completed_at || undefined,
    attachments: row.attachments || [],
  };
}

export default function Tasks({ user }: TasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const manager = isManager(user);

  const employeeNames = useMemo(() => {
    const result: Record<string, string> = {};

    employees.forEach((employee) => {
      result[employee.id] = employee.name;
    });

    result[user.id] = user.name;

    return result;
  }, [employees, user.id, user.name]);

  async function loadTasks() {
    setLoading(true);
    setError('');

    let query = supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (!manager) {
      query = query.or(
        `assignee_id.eq.${user.id},creator_id.eq.${user.id}`
      );
    }

    const { data, error: loadError } = await query;

    if (loadError) {
      console.error('Ошибка загрузки задач:', loadError);
      setError('Не удалось загрузить задачи. Попробуйте обновить страницу.');
      setLoading(false);
      return;
    }

    setTasks((data || []).map((row) => mapTask(row as TaskRow)));
    setLoading(false);
  }

  async function loadEmployees() {
    let rows: ProfileRow[] = [];

    if (manager) {
      const { data, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, is_active')
        .eq('is_active', true)
        .order('full_name');

      if (profilesError) {
        console.error('Ошибка загрузки сотрудников:', profilesError);
      } else {
        rows = (data || []) as ProfileRow[];
      }
    } else {
      // Сотрудникам список доступных участников возвращает RPC.
      const { data, error: contactsError } = await supabase.rpc(
        'get_chat_contacts'
      );

      if (contactsError) {
        console.error('Ошибка получения списка сотрудников:', contactsError);
      } else {
        rows = (data || []) as ProfileRow[];
      }
    }

    const options: EmployeeOption[] = rows
      .filter((row) => row.id)
      .map((row) => ({
        id: row.id,
        name: row.full_name || row.name || row.email || 'Сотрудник',
      }));

    // Текущий пользователь всегда доступен для выбора.
    if (!options.some((item) => item.id === user.id)) {
      options.unshift({
        id: user.id,
        name: user.name || user.email,
      });
    }

    setEmployees(options);
  }

  useEffect(() => {
    loadTasks();
    loadEmployees();
  }, [user.id, user.role]);

  async function handleComplete(task: Task) {
    if (!manager && task.assigneeId !== user.id) {
      return;
    }

    setError('');

    const completed = !task.completed;

    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq('id', task.id)
      .eq(manager ? 'id' : 'assignee_id', manager ? task.id : user.id);

    if (updateError) {
      console.error('Ошибка изменения задачи:', updateError);
      setError('Не удалось изменить статус задачи.');
      return;
    }

    await loadTasks();
  }

  async function handleDelete(task: Task) {
    if (!manager && task.creatorId !== user.id) {
      return;
    }

    if (!window.confirm('Удалить эту задачу?')) {
      return;
    }

    setError('');

    let query = supabase
      .from('tasks')
      .delete()
      .eq('id', task.id);

    if (!manager) {
      query = query.eq('creator_id', user.id);
    }

    const { error: deleteError } = await query;

    if (deleteError) {
      console.error('Ошибка удаления задачи:', deleteError);
      setError('Не удалось удалить задачу.');
      return;
    }

    setTasks((previous) =>
      previous.filter((item) => item.id !== task.id)
    );
  }

  async function handleCreate(
    title: string,
    description: string,
    deadline: string,
    assigneeId: string
  ) {
    if (!title.trim() || !deadline || !assigneeId) {
      setError('Заполните название, срок и выберите исполнителя.');
      return;
    }

    setSaving(true);
    setError('');

    const { error: insertError } = await supabase
      .from('tasks')
      .insert({
        title: title.trim(),
        description: description.trim(),
        assignee_id: assigneeId,
        creator_id: user.id,
        deadline: new Date(deadline).toISOString(),
        completed: false,
      });

    setSaving(false);

    if (insertError) {
      console.error('Ошибка создания задачи:', insertError);
      setError('Не удалось создать задачу. Проверьте права доступа.');
      return;
    }

    setShowCreateModal(false);
    await loadTasks();
  }

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'active' && task.completed) return false;
    if (filter === 'completed' && !task.completed) return false;

    const query = searchQuery.trim().toLowerCase();

    if (query) {
      const creatorName = (
        employeeNames[task.creatorId] || 'Неизвестно'
      ).toLowerCase();

      const assigneeName = (
        employeeNames[task.assigneeId] || 'Неизвестно'
      ).toLowerCase();

      return (
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        creatorName.includes(query) ||
        assigneeName.includes(query)
      );
    }

    return true;
  });

  const isOverdue = (task: Task) => {
    return !task.completed && new Date(task.deadline) < new Date();
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-800">
            Мои задачи
          </h3>

          <p className="text-gray-600 text-sm">
            Всего: {tasks.length} | Активных:{' '}
            {tasks.filter((task) => !task.completed).length} | Выполнено:{' '}
            {tasks.filter((task) => task.completed).length}
          </p>
        </div>

        <button
          onClick={() => {
            setError('');
            setShowCreateModal(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition text-sm font-medium shadow-md"
        >
          + Новая задача
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="mb-4 max-w-md">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Поиск задач..."
        />
      </div>

      <div className="flex gap-2 mb-4">
        {(['all', 'active', 'completed'] as const).map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${
              filter === item
                ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-200'
                : 'text-gray-600 hover:bg-white/50 hover:text-gray-800'
            }`}
          >
            {item === 'all'
              ? 'Все'
              : item === 'active'
              ? 'Активные'
              : 'Выполненные'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">
          Загрузка задач...
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-12 card-light rounded-xl">
          <svg
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>

          <p className="text-gray-500">Задач пока нет</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const creatorName =
              employeeNames[task.creatorId] || 'Неизвестно';

            const assigneeName =
              employeeNames[task.assigneeId] || 'Неизвестно';

            const canComplete =
              manager || task.assigneeId === user.id;

            const canDelete =
              manager || task.creatorId === user.id;

            return (
              <div
                key={task.id}
                className={`card-light rounded-xl p-4 transition hover-lift ${
                  task.completed
                    ? 'border-green-200'
                    : isOverdue(task)
                    ? 'border-red-200'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {canComplete ? (
                    <button
                      onClick={() => handleComplete(task)}
                      title={
                        task.completed
                          ? 'Вернуть в активные'
                          : 'Отметить выполненной'
                      }
                      className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                        task.completed
                          ? 'bg-green-500 border-green-500'
                          : 'border-gray-500 hover:border-blue-400'
                      }`}
                    >
                      {task.completed && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                  ) : (
                    <div className="mt-1 w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <h4
                      className={`font-medium ${
                        task.completed
                          ? 'text-gray-400 line-through'
                          : 'text-gray-800'
                      }`}
                    >
                      {task.title}
                    </h4>

                    {task.description && (
                      <p className="text-gray-600 text-sm mt-1">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                      <span className="text-gray-500">
                        Создана: {formatDateTime(task.createdAt)}
                      </span>

                      <span
                        className={
                          isOverdue(task)
                            ? 'text-red-600 font-semibold'
                            : 'text-gray-500'
                        }
                      >
                        Срок: {formatDateTime(task.deadline)}

                        {isOverdue(task) && (
                          <span className="inline-flex items-center ml-1">
                            <span className="text-red-500 text-lg animate-pulse">
                              ❗
                            </span>
                            <span className="text-red-600 text-xs ml-1">
                              Просрочено
                            </span>
                          </span>
                        )}
                      </span>

                      <span className="text-gray-500">
                        От: {creatorName}
                      </span>

                      <span className="text-gray-500">
                        Исполнитель: {assigneeName}
                      </span>

                      {task.completed && task.completedAt && (
                        <span className="text-green-600">
                          ✓ Выполнено:{' '}
                          {formatDateTime(task.completedAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => handleDelete(task)}
                      className="text-gray-400 hover:text-red-500 transition p-1"
                      title="Удалить"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <CreateTaskModal
          employees={employees}
          currentUserId={user.id}
          saving={saving}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}

interface CreateTaskModalProps {
  employees: EmployeeOption[];
  currentUserId: string;
  saving: boolean;
  onClose: () => void;
  onCreate: (
    title: string,
    description: string,
    deadline: string,
    assigneeId: string
  ) => void;
}

function CreateTaskModal({
  employees,
  currentUserId,
  saving,
  onClose,
  onCreate,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [assigneeId, setAssigneeId] = useState(currentUserId);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!title.trim() || !deadline || !assigneeId) return;

    onCreate(title, description, deadline, assigneeId);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card-light rounded-2xl w-full max-w-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          Новая задача
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Название задачи
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
              Описание
            </label>

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Исполнитель
            </label>

            <select
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required
            >
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                  {employee.id === currentUserId ? ' (я)' : ''}
                </option>
              ))}
            </select>

            {employees.length === 1 && (
              <p className="text-xs text-amber-600 mt-1">
                Пока доступен только ваш профиль. Если других сотрудников
                нет в списке, нужно проверить RPC get_chat_contacts.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Срок исполнения
            </label>

            <input
              type="datetime-local"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required
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
              {saving ? 'Сохранение...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
