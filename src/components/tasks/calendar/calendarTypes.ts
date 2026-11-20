import { Subtask, Task } from '@/types';

export interface CalendarDeadlineItem {
  id: string;
  type: 'task' | 'subtask';
  dateKey: string;
  title: string;
  parentTask: Task;
  subtask?: Subtask;
  isCompleted: boolean;
  isStarred: boolean;
  categoryName: string;
  categoryColor: string;
  categoryTextColor: string;
}

export interface NearbyDeadlineDay {
  date: Date;
  dateKey: string;
  pendingCount: number;
  totalCount: number;
}
