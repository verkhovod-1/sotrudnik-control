import { useState, useEffect } from 'react';
import { User, Task } from '../types';
import {
  getTasksForUser,
  addTask,
  completeTask,
  uncompleteTask,
  deleteTask,
  findUserById,
  formatMSKDateTime,
} from '../store';
import SearchBar from './SearchBar';

interface TasksProps {
  user: User;
}

export default function Tasks({ user }: TasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setTasks(getTasksForUser(user.id));
  }, [user.id]);

  const handleComplete = (taskId: string) => {
    completeTask(taskId);
    setTasks(getTasksForUser(user.id));
  };

  const handleUncomplete = (taskId: string) => {
    uncompleteTask(taskId);
    setTasks(getTasksForUser(user.id));
  };

  const handleDelete = (taskId: string) => {
    deleteTask(taskId);
    setTasks(getTasksForUser(user.id));
  };

  const handleCreate = (title: string, description: string, deadline: string) => {
    addTask({
      title,
      description,
      assigneeId: user.id,
      creatorId: user.id,
      deadline: new Date(deadline).toISOString(),
    });
    setTasks(getTasksForUser(user.id));
    setShowCreateModal(false);
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'active' && t.completed) return false;
    if (filter === 'completed' && !t.completed) return false;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const creator = findUserById(t.creatorId);
      const matchesTitle = t.title.toLowerCase().includes(query);
      const matchesDescription = t.description?.toLowerCase().includes(query);
      const matchesCreator = creator?.name.toLowerCase().includes(query);
      return matchesTitle || matchesDescription || matchesCreator;
    }

    return true;
  });

  const isOverdue = (task: Task) => {
    if (task.completed) return false;
    return new Date(task.deadline) < new Date();
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Мои задачи</h3>
          <p className="text-gray-600 text-sm">
            Всего: {tasks.length} | Активных: {tasks.filter((t) => !t.completed).length} | Выполнено: {tasks.filter((t) => t.completed).length}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition text-sm font-medium shadow-md"
        >
          + Новая задача
        </button>
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

      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 card-light rounded-xl">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-gray-500">Задач пока нет</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const creator = findUserById(task.creatorId);
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
                  <button
                    onClick={() => (task.completed ? handleUncomplete(task.id) : handleComplete(task.id))}
                    className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                      task.completed
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-500 hover:border-blue-400'
                    }`}
                  >
                    {task.completed && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium ${task.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className="text-gray-600 text-sm mt-1">{task.description}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                      <span className="text-gray-500">
                        Создана: {formatMSKDateTime(task.createdAt)}
                      </span>
                      <span className={isOverdue(task) ? 'text-red-600' : 'text-gray-500'}>
                        Срок: {formatMSKDateTime(task.deadline)}
                        {isOverdue(task) && ' ⚠️ Просрочено'}
                      </span>
                      <span className="text-gray-500">
                        От: {creator?.name || 'Неизвестно'}
                      </span>
                      {task.completed && task.completedAt && (
                        <span className="text-green-600">
                          ✓ Выполнено: {formatMSKDateTime(task.completedAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  {(task.creatorId === user.id || user.role === 'director' || user.role === 'admin') && (
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

      {showCreateModal && (
        <CreateTaskModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}

function CreateTaskModal({ onClose, onCreate }: { onClose: () => void; onCreate: (title: string, description: string, deadline: string) => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !deadline) return;
    onCreate(title, description, deadline);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card-light rounded-2xl w-full max-w-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Новая задача</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Название задачи</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Срок исполнения</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition font-medium shadow-md"
            >
              Создать
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
