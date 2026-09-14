export type Role = 'director' | 'admin' | 'employee';

export interface User {
  id: string;
  email: string;
  name: string;
  password: string; // 6-digit
  role: Role;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assigneeId: string;
  creatorId: string;
  createdAt: string;
  deadline: string;
  completed: boolean;
  completedAt?: string;
}

export interface Document {
  id: string;
  name: string;
  category: DocumentCategory;
  uploadedBy: string;
  uploadedAt: string;
  fileName: string;
}

export type DocumentCategory =
  | 'contracts'
  | 'reference'
  | 'local_acts'
  | 'org_orders'
  | 'payments'
  | 'other';

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
  read: boolean;
}

export interface CalendarNote {
  id: string;
  userId: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  recurring: boolean; // monthly
  remindDaysBefore: number;
  taskId?: string; // linked auto-created task
}

export interface AppState {
  users: User[];
  tasks: Task[];
  documents: Document[];
  messages: ChatMessage[];
  calendarNotes: CalendarNote[];
}
