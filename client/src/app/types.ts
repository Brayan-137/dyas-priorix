export type Priority = 'high' | 'medium' | 'low';

export type TaskStatus = 'pending' | 'completed';

export type ItemType = 'task' | 'event' | 'class';

export interface Task {
  id: string;
  type: ItemType;
  title: string;
  description?: string;
  date: Date;
  priority?: Priority;
  status: TaskStatus;
  duration?: number;
  room?: string; // Para clases
  recurring?: boolean; // Para clases recurrentes
}

export interface UserStats {
  level: number;
  xp: number;
  streak: number;
  tasksCompleted: number;
  mood: 'happy' | 'neutral' | 'worried' | 'sleepy';
}

export interface PetState {
  name: string;
  stage: 'baby' | 'teen' | 'adult';
}

export interface ClassSession {
  id: string;
  day: number; // 1 = Monday, 5 = Friday
  startTime: string; // "08:00"
  endTime: string; // "09:30"
  subject: string;
  room: string;
  color: string;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  accentColor: 'indigo' | 'purple' | 'blue' | 'teal' | 'green';
  petEnabled: boolean;
  reminders: {
    enabled: boolean;
    times: ('15min' | '1hour' | '1day')[];
  };
  scheduleConflictAlerts: boolean;
  streakNotifications: boolean;
  silentMode: {
    enabled: boolean;
    startTime: string; // "22:00"
    endTime: string; // "08:00"
  };
}