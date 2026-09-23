import { useState, useEffect } from 'react';
import { User, Task } from '../types';
import {
  getAllTasks,
  addTask,
  completeTask,
  uncompleteTask,
  deleteTask,
  findUserById,
  formatMSKDateTime,
  getState,
} from '../store';
import SearchBar from './SearchBar';

interface AllTasksProps {
  user: User;
}

export default function AllTasks({ user }: AllTasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setTasks(getAllTasks());
  }, []);

  const handleComplete = (taskId: string) => {
    completeTask(taskId);
    setTasks(getAllTasks());
  };

  const handleUncomplete = (taskId: string) => {
    uncompleteTask(taskId);
    setTasks(getAllTasks());
  };

  const handleDelete = (taskId: string) => {
    deleteTask(taskId);
    setTasks(getAllTasks());
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'active' && t.completed) return false;
    if (filter === 'completed' && !t.completed) return false;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const creator = findUserById(t.creatorId);
      const assignee = findUserById(t.assigneeId);
      const matchesTitle = t.title.toLowerCase().includes(query);
      const matchesDescription = t.description?.toLowerCase().includes(query);
      const matchesCreator = creator?.name.toLowerCase().includes(query);
      const matchesAssignee = assignee?.name.toLowerCase().includes(query);
      return matchesTitle || matchesDescription || matchesCreator || matchesAssignee;
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

      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 card-light rounded-xl">
            <p className="text-gray-500">Задач не найдено</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const creator = findUserById(task.creatorId);
            const assignee = findUserById(task.assigneeId);
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
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                      <span className="text-purple-600">
                        Исполнитель: {assignee?.name || 'Неизвестно'}
                      </span>
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
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(task.id)}
                    className="text-gray-400 hover:text-red-500 transition p-1"
                    title="Удалить"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
