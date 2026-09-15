import { AppState, User, Task, Document, ChatMessage, CalendarNote, Role } from './types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'synchron_app_data';

const defaultState: AppState = {
  users: [
    {
      id: 'director-001',
      email: 'director@synchron.ru',
      name: 'Иванов Иван Иванович',
      password: '111111',
      role: 'director',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ],
  tasks: [],
  documents: [],
  messages: [],
  calendarNotes: [],
};

export function getState(): AppState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
    return defaultState;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return defaultState;
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Генерация 6-значного временного пароля
export function generateTempPassword(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// User operations
export function inviteUser(
  email: string,
  name: string,
  role: Role,
  invitedBy: string
): { user: User; tempPassword: string } {
  const state = getState();
  const tempPassword = generateTempPassword();
  const newUser: User = {
    id: uuidv4(),
    email,
    name,
    password: '', // will be set after activation
    tempPassword,
    role,
    isActive: false,
    createdAt: new Date().toISOString(),
    invitedBy,
    inviteSentAt: new Date().toISOString(),
  };
  state.users.push(newUser);
  saveState(state);
  return { user: newUser, tempPassword };
}

export function findUserByEmail(email: string): User | undefined {
  return getState().users.find((u) => u.email === email);
}

export function findUserById(id: string): User | undefined {
  return getState().users.find((u) => u.id === id);
}

export function getDirectorCount(): number {
  return getState().users.filter((u) => u.role === 'director').length;
}

export function getAdminCount(): number {
  return getState().users.filter((u) => u.role === 'admin').length;
}

// Аутентификация — проверяет временный или постоянный пароль
export function authenticate(email: string, password: string): User | null {
  const user = findUserByEmail(email);
  if (!user) return null;

  // Если пользователь не активирован — проверяем временный пароль
  if (!user.isActive) {
    if (user.tempPassword === password) return user;
    return null;
  }

  // Если активирован — проверяем постоянный пароль
  if (user.password === password) return user;
  return null;
}

// Активация пользователя — установка постоянного пароля
export function activateUser(email: string, newPassword: string): { success: boolean; error?: string } {
  const state = getState();
  const user = state.users.find((u) => u.email === email);
  if (!user) return { success: false, error: 'Пользователь не найден' };
  if (user.isActive) return { success: false, error: 'Пользователь уже активирован' };
  if (!/^\d{6}$/.test(newPassword)) return { success: false, error: 'Пароль должен состоять из 6 цифр' };

  user.password = newPassword;
  user.isActive = true;
  user.tempPassword = undefined;
  saveState(state);
  return { success: true };
}

// Сброс пароля — генерация нового временного
export function resetPassword(email: string): { success: boolean; tempPassword?: string; error?: string } {
  const state = getState();
  const user = state.users.find((u) => u.email === email);
  if (!user) return { success: false, error: 'Пользователь с таким email не найден' };

  const tempPassword = generateTempPassword();
  user.tempPassword = tempPassword;
  user.isActive = false; // требуется повторная активация
  saveState(state);
  return { success: true, tempPassword };
}

export function updateUserRole(userId: string, role: Role): void {
  const state = getState();
  const user = state.users.find((u) => u.id === userId);
  if (user) {
    user.role = role;
    saveState(state);
  }
}

export function removeUser(userId: string): void {
  const state = getState();
  state.users = state.users.filter((u) => u.id !== userId);
  saveState(state);
}

// Task operations
export function addTask(task: Omit<Task, 'id' | 'createdAt' | 'completed'>): Task {
  const state = getState();
  const newTask: Task = {
    ...task,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    completed: false,
  };
  state.tasks.push(newTask);
  saveState(state);
  return newTask;
}

export function completeTask(taskId: string): void {
  const state = getState();
  const task = state.tasks.find((t) => t.id === taskId);
  if (task) {
    task.completed = true;
    task.completedAt = new Date().toISOString();
    saveState(state);
  }
}

export function addTaskAttachment(
  taskId: string,
  attachment: { name: string; size: number; type: string; dataUrl: string }
): void {
  const state = getState();
  const task = state.tasks.find((t) => t.id === taskId);
  if (task) {
    if (!task.attachments) task.attachments = [];
    task.attachments.push(attachment);
    saveState(state);
  }
}

export function removeTaskAttachment(taskId: string, attachmentIndex: number): void {
  const state = getState();
  const task = state.tasks.find((t) => t.id === taskId);
  if (task && task.attachments) {
    task.attachments.splice(attachmentIndex, 1);
    saveState(state);
  }
}

export function uncompleteTask(taskId: string): void {
  const state = getState();
  const task = state.tasks.find((t) => t.id === taskId);
  if (task) {
    task.completed = false;
    task.completedAt = undefined;
    saveState(state);
  }
}

export function deleteTask(taskId: string): void {
  const state = getState();
  state.tasks = state.tasks.filter((t) => t.id !== taskId);
  saveState(state);
}

export function getTasksForUser(userId: string): Task[] {
  return getState().tasks.filter((t) => t.assigneeId === userId);
}

export function getAllTasks(): Task[] {
  return getState().tasks;
}

// Document operations
export function addDocument(doc: Omit<Document, 'id' | 'uploadedAt'>): Document {
  const state = getState();
  const newDoc: Document = {
    ...doc,
    id: uuidv4(),
    uploadedAt: new Date().toISOString(),
  };
  state.documents.push(newDoc);
  saveState(state);
  return newDoc;
}

export function getDocumentsByCategory(category: Document['category']): Document[] {
  return getState().documents.filter((d) => d.category === category);
}

export function getAllDocuments(): Document[] {
  return getState().documents;
}

export function deleteDocument(docId: string): void {
  const state = getState();
  state.documents = state.documents.filter((d) => d.id !== docId);
  saveState(state);
}

// Chat operations
export function sendMessage(msg: Omit<ChatMessage, 'id' | 'timestamp' | 'read'>): ChatMessage {
  const state = getState();
  const newMsg: ChatMessage = {
    ...msg,
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    read: false,
  };
  state.messages.push(newMsg);
  saveState(state);
  return newMsg;
}

export function getConversation(userId1: string, userId2: string): ChatMessage[] {
  return getState().messages.filter(
    (m) =>
      (m.senderId === userId1 && m.receiverId === userId2) ||
      (m.senderId === userId2 && m.receiverId === userId1)
  );
}

export function markMessagesAsRead(userId1: string, userId2: string): void {
  const state = getState();
  state.messages.forEach((m) => {
    if (m.senderId === userId2 && m.receiverId === userId1 && !m.read) {
      m.read = true;
    }
  });
  saveState(state);
}

export function getUnreadCount(userId: string): number {
  return getState().messages.filter((m) => m.receiverId === userId && !m.read).length;
}

// Calendar operations
export function addCalendarNote(note: Omit<CalendarNote, 'id'>): CalendarNote {
  const state = getState();
  const newNote: CalendarNote = {
    ...note,
    id: uuidv4(),
  };
  state.calendarNotes.push(newNote);
  saveState(state);
  return newNote;
}

export function getCalendarNotesForUser(userId: string): CalendarNote[] {
  return getState().calendarNotes.filter((n) => n.userId === userId);
}

export function deleteCalendarNote(noteId: string): void {
  const state = getState();
  state.calendarNotes = state.calendarNotes.filter((n) => n.id !== noteId);
  saveState(state);
}

export function addCalendarNoteAttachment(
  noteId: string,
  attachment: { name: string; size: number; type: string; dataUrl: string }
): void {
  const state = getState();
  const note = state.calendarNotes.find((n) => n.id === noteId);
  if (note) {
    if (!note.attachments) note.attachments = [];
    note.attachments.push(attachment);
    saveState(state);
  }
}

export function removeCalendarNoteAttachment(noteId: string, attachmentIndex: number): void {
  const state = getState();
  const note = state.calendarNotes.find((n) => n.id === noteId);
  if (note && note.attachments) {
    note.attachments.splice(attachmentIndex, 1);
    saveState(state);
  }
}

// MSK Time utilities
export function getMSKDate(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 3 * 3600000); // UTC+3 for Moscow
}

export function formatMSKTime(): string {
  const msk = getMSKDate();
  return msk.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatMSKDate(): string {
  const msk = getMSKDate();
  return msk.toLocaleDateString('ru-RU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatMSKDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getMSKDateString(): string {
  const msk = getMSKDate();
  return msk.toISOString().split('T')[0];
}
