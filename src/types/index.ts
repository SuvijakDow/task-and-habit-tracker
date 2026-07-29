export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  setId?: string; // Id of the TaskPreset it belongs to
  dueDate: Date | null;
  isCompleted: boolean;
  subtasks?: Subtask[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskPreset {
  id: string;
  userId: string;
  name: string;
  color?: string;
  isActive: boolean;
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

export interface HabitSet {
  id: string;
  userId: string;
  name: string;
  color?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeSlot {
  startTime: string; // HH:MM format, e.g. '09:00'
  endTime: string;   // HH:MM format, e.g. '10:00'
}

export type CustomSchedule = Record<number, TimeSlot[]>; // Map dayOfWeek (0-6) -> TimeSlot[]

export interface DailyHabit {
  id: string;
  userId: string;
  title: string;
  completedDates: string[]; // ISO format: 'YYYY-MM-DD'
  scheduledDays: number[]; // 0-6 (Sun-Sat), defaults to [0,1,2,3,4,5,6] if not set
  startTime: string; // HH:MM format, e.g. '09:00'
  endTime: string; // HH:MM format, e.g. '10:00'
  customSchedule?: CustomSchedule; // Optional per-day multi-time-slot schedule
  color?: string; // Hex color string, e.g. '#F87171'
  setId?: string; // Legacy Id of the HabitSet it belongs to
  setIds?: string[]; // Array of HabitSet IDs it belongs to (multi-routine support)
  order?: number; // For drag-drop reordering
  trackingStartDate?: Date; // Date when tracking started or was last reset
  targetValue?: number; // Quantitative target goal value e.g. 5
  targetUnit?: string; // Target unit e.g. 'videos', 'pages', 'mins'
  dailyProgress?: Record<string, number>; // Date string YYYY-MM-DD -> logged progress value
  createdAt: Date;
  updatedAt: Date;
}

export const getHabitSetIds = (habit: Partial<DailyHabit>): string[] => {
  if (Array.isArray(habit.setIds) && habit.setIds.length > 0) {
    return habit.setIds;
  }
  if (typeof habit.setId === 'string' && habit.setId.trim()) {
    return [habit.setId];
  }
  return [];
};

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: Date;
  updatedAt: Date;
}
