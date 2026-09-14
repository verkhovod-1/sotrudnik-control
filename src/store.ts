import { AppState, User, Task, Document, ChatMessage, CalendarNote } from './types';
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

// User operations
export function addUser(user: Omit<User, 'id' | 'createdAt'>): User {
  const state = getState();
  const newUser: User = {
    ...user,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };
  state.users.push(newUser);
  saveState(state);
  return newUser;
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

export function authenticate(email: string, password: string): User | null {
  const user = findUserByEmail(email);
  if (user && user.password === password) return user;
  return null;
}

export function updateUserRole(userId: string, role: User['role']): void {
  const state = getState();
  const user = state.users.find((u) => u.id === userId);
  if (user) {
    user.role = role;
    saveState(state);
  }
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
