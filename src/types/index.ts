export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  dueDate: Date | null;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyHabit {
  id: string;
  userId: string;
  title: string;
  completedDates: string[]; // ISO format: 'YYYY-MM-DD'
  scheduledDays: number[]; // 0-6 (Sun-Sat), defaults to [0,1,2,3,4,5,6] if not set
  order?: number; // For drag-drop reordering
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: Date;
}
