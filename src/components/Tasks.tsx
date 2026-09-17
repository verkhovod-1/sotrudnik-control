import { useState, useEffect, useRef } from 'react';
import { User, Task } from '../types';
import {
  getTasksForUser,
  addTask,
  completeTask,
  uncompleteTask,
  deleteTask,
  findUserById,
  formatMSKDateTime,
  getState,
  addTaskAttachment,
  removeTaskAttachment,
} from '../store';
import SearchBar from './SearchBar';
import FileActions from './FileActions';
import { readFileAsDataURL, formatFileSize, getFileIcon, isAllowedFile } from '../utils/files';

interface TasksProps {
  user: User;
}

export default function Tasks({ user }: TasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [refresh, setRefresh] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setTasks(getTasksForUser(user.id));
  }, [user.id, refresh]);

  const handleComplete = (taskId: string) => {
    completeTask(taskId);
    setRefresh((r) => r + 1);
  };

  const handleUncomplete = (taskId: string) => {
    uncompleteTask(taskId);
    setRefresh((r) => r + 1);
  };

  const handleDelete = (taskId: string) => {
    deleteTask(taskId);
    setRefresh((r) => r + 1);
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Мои задачи</h3>
          <p className="text-gray-600 text-sm">
            Всего: {tasks.length} | Активных: {tasks.filter((t) => !t.completed).length} | Выполнено: {tasks.filter((t) => t.completed).length}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDelegateModal(true)}
            className="px-4 py-2 bg-purple-100 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-200 transition text-sm"
          >
            Делегировать задачу
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition text-sm font-medium shadow-md"
          >
            + Новая задача
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 max-w-md">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Поиск задач по названию, описанию или автору..."
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {(['all', 'active', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${
              filter === f
                ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-700 border border-indigo-200'
                : 'text-gray-600 hover:bg-white/50 hover:text-gray-800'
            }`}
          >
            {f === 'all' ? 'Все' : f === 'active' ? 'Активные' : 'Выполненные'}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
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
                className={`bg-white rounded-lg shadow-md p-4 transition hover:shadow-lg ${
                  task.completed
                    ? 'border border-green-200'
                    : isOverdue(task)
                    ? 'border border-red-200'
                    : 'border border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => (task.completed ? handleUncomplete(task.id) : handleComplete(task.id))}
                    className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                      task.completed
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-400 hover:border-indigo-500'
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
                    {/* Вложения */}
                    {task.attachments && task.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {task.attachments.map((att, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-1.5 bg-white rounded-lg"
                          >
                            <span className="text-sm flex-shrink-0">{getFileIcon(att.name)}</span>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs text-indigo-600 truncate block">{att.name}</span>
                              <span className="text-xs text-gray-500">{formatFileSize(att.size)}</span>
                            </div>
                            <FileActions
                              dataUrl={att.dataUrl}
                              filename={att.name}
                              compact
                            />
                            {(task.creatorId === user.id || task.assigneeId === user.id || user.role === 'director' || user.role === 'admin') && (
                              <button
                                onClick={() => {
                                  removeTaskAttachment(task.id, idx);
                                  setRefresh((r) => r + 1);
                                }}
                                className="text-gray-400 hover:text-red-500 transition"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
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

                  {/* Кнопка добавления вложения */}
                  <TaskAttachButton
                    taskId={task.id}
                    onAttached={() => setRefresh((r) => r + 1)}
                  />

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

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          user={user}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            setRefresh((r) => r + 1);
          }}
        />
      )}

      {/* Delegate Task Modal */}
      {showDelegateModal && (
        <DelegateTaskModal
          user={user}
          onClose={() => setShowDelegateModal(false)}
          onCreated={() => {
            setShowDelegateModal(false);
            setRefresh((r) => r + 1);
          }}
        />
      )}
    </div>
  );
}

function CreateTaskModal({ user, onClose, onCreated }: { user: User; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !deadline) return;
    addTask({
      title,
      description,
      assigneeId: user.id,
      creatorId: user.id,
      deadline: new Date(deadline).toISOString(),
    });
    onCreated();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md w-full max-w-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Новая задача (себе)</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Название задачи</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Срок исполнения</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
              className="flex-1 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition font-medium"
            >
              Создать
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DelegateTaskModal({ user, onClose, onCreated }: { user: User; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const state = getState();
  const employees = state.users.filter((u) => u.id !== user.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !deadline || !assigneeId) return;
    addTask({
      title,
      description,
      assigneeId,
      creatorId: user.id,
      deadline: new Date(deadline).toISOString(),
    });
    onCreated();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md w-full max-w-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Делегировать задачу</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Назначить сотруднику</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
              required
            >
              <option value="">Выберите сотрудника</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.role === 'director' ? 'Управляющий' : emp.role === 'admin' ? 'Админ' : 'Сотрудник'})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Название задачи</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Срок исполнения</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
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
              className="flex-1 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition font-medium"
            >
              Делегировать
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TaskAttachButton({ taskId, onAttached }: { taskId: string; onAttached: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    
    if (!isAllowedFile(file.name)) {
      alert('Формат файла не поддерживается');
      return;
    }
    
    try {
      const dataUrl = await readFileAsDataURL(file);
      addTaskAttachment(taskId, {
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl,
      });
      onAttached();
    } catch (error) {
      console.error('Ошибка чтения файла:', error);
      alert('Ошибка при чтении файла');
    }
    
    e.target.value = '';
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
        onClick={() => inputRef.current?.click()}
        className="text-gray-400 hover:text-indigo-600 transition p-1"
        title="Прикрепить файл"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
      </button>
    </>
  );
}
