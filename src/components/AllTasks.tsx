
import { useState, useEffect, useCallback } from 'react';
import { User, Task } from '../types';
import { supabase } from '../lib/supabase';
import { formatMSKDateTime } from '../store';
import SearchBar from './SearchBar';

interface AllTasksProps {
  user: User;
}

interface ProfileInfo {
  id: string;
  full_name: string;
}

export default function AllTasks({ user }: AllTasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isManager = user.role === 'director' || user.role === 'admin';

  const loadTasks = useCallback(async () => {
    setError('');

    let query = supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    // Сотрудник видит только задачи, которые создал сам.
    // Директор и администратор видят все задачи.
    if (!isManager) {
      query = query.eq('creator_id', user.id);
    }

    const { data, error: tasksError } = await query;

    if (tasksError) {
      console.error('Ошибка загрузки задач:', tasksError);
      setError('Не удалось загрузить задачи.');
      setLoading(false);
      return;
    }

    const mappedTasks: Task[] = (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description || '',
      assigneeId: row.assignee_id,
      creatorId: row.creator_id,
      createdAt: row.created_at,
      deadline: row.deadline,
      completed: row.completed,
      completedAt: row.completed_at,
      attachments: row.attachments || [],
    }));

    setTasks(mappedTasks);

    // Загружаем имена участников.
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name');

    if (!profileError && profileData) {
      const names: Record<string, string> = {};

      (profileData as ProfileInfo[]).forEach((profile) => {
        names[profile.id] = profile.full_name || 'Без имени';
      });

      setProfiles(names);
    }

    setLoading(false);
  }, [user.id, isManager]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleComplete = async (taskId: string, completed: boolean) => {
    const { error } = await supabase
      .from('tasks')
      .update({
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq('id', taskId);

    if (error) {
      console.error('Ошибка изменения задачи:', error);
      alert('Не удалось изменить статус задачи.');
      return;
    }

    await loadTasks();
  };

  const handleDelete = async (taskId: string) => {
    if (!window.confirm('Удалить эту задачу?')) return;

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      console.error('Ошибка удаления задачи:', error);
      alert('Не удалось удалить задачу.');
      return;
    }

    await loadTasks();
  };

  const isOverdue = (task: Task) => {
    if (task.completed || !task.deadline) return false;
    return new Date(task.deadline) < new Date();
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'active' && task.completed) return false;
    if (filter === 'completed' && !task.completed) return false;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const creator = profiles[task.creatorId] || '';
      const assignee = profiles[task.assigneeId] || '';

      return (
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        creator.toLowerCase().includes(query) ||
        assignee.toLowerCase().includes(query)
      );
    }

    return true;
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Все задачи</h3>
          <p className="text-gray-600 text-sm">
            Всего: {tasks.length} | Активных: {tasks.filter((t) => !t.completed).length} | Выполнено: {tasks.filter((t) => t.completed).length}
          </p>
        </div>
      </div>

      <div className="mb-4 max-w-md">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Поиск задач..."
        />
      </div>

      <div className="flex gap-2 mb-4">
        {(['all', 'active', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${
              filter === f
                ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-200'
                : 'text-gray-600 hover:bg-white/50 hover:text-gray-800'
            }`}
          >
            {f === 'all' ? 'Все' : f === 'active' ? 'Активные' : 'Выполненные'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 card-light rounded-xl">
          <p className="text-gray-500">Загрузка задач...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 card-light rounded-xl">
          <p className="text-red-500">{error}</p>
          <button
            onClick={loadTasks}
            className="mt-3 px-4 py-2 rounded-lg bg-indigo-600 text-white"
          >
            Повторить
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 card-light rounded-xl">
              <p className="text-gray-500">Задач не найдено</p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const creator = profiles[task.creatorId];
              const assignee = profiles[task.assigneeId];

              const canChangeStatus =
                isManager || task.assigneeId === user.id;

              const canDelete =
                isManager || task.creatorId === user.id;

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
                    {canChangeStatus && (
                      <button
                        onClick={() => handleComplete(task.id, !task.completed)}
                        className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                          task.completed
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-400 hover:border-indigo-500'
                        }`}
                        title={task.completed ? 'Вернуть задачу' : 'Выполнить задачу'}
                      >
                        {task.completed && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    )}

                    <div className="flex-1 min-w-0">
                      <h4 className={`font-medium ${task.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                        {task.title}
                      </h4>

                      {task.description && (
                        <p className="text-gray-600 text-sm mt-1">
                          {task.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                        <span className="text-purple-600">
                          Исполнитель: {assignee || 'Неизвестно'}
                        </span>

                        <span className="text-gray-500">
                          Создана: {formatMSKDateTime(task.createdAt)}
                        </span>

                        <span className={isOverdue(task) ? 'text-red-600 font-semibold' : 'text-gray-500'}>
                          Срок: {formatMSKDateTime(task.deadline)}
                          {isOverdue(task) && (
                            <span className="inline-flex items-center ml-1">
                              <span className="text-red-500 text-lg animate-pulse">❗</span>
                              <span className="text-red-600 text-xs ml-1">Просрочено</span>
                            </span>
                          )}
                        </span>

                        <span className="text-gray-500">
                          От: {creator || 'Неизвестно'}
                        </span>
                      </div>

                      {!canChangeStatus && (
                        <p className="text-xs text-gray-400 mt-2">
                          Исполнитель отвечает за выполнение этой задачи.
                        </p>
                      )}
                    </div>

                    {canDelete && (
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="text-gray-400 hover:text-red-500 transition p-1"
                        title="Удалить"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
