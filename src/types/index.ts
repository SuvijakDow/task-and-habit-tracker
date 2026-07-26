export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  dueDate: Date | null;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  color: string; // Hex color code, e.g. '#A78BFA'
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyHabit {
  id: string;
  userId: string;
  title: string;
  completedDates: string[]; // ISO format: 'YYYY-MM-DD'
  scheduledDays: number[]; // 0-6 (Sun-Sat), defaults to [0,1,2,3,4,5,6] if not set
  startTime: string; // HH:MM format, e.g. '09:00'
  endTime: string; // HH:MM format, e.g. '10:00'
  color?: string; // Hex color string, e.g. '#F87171'
  order?: number; // For drag-drop reordering
  trackingStartDate?: Date; // Date when tracking started or was last reset
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: Date;
  updatedAt: Date;
}
