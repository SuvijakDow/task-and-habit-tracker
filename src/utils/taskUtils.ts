import { Task } from '@/types';

/** Helper to get valid timestamp from Date or string */
export const getTimestamp = (date: Date | string | null | undefined): number | null => {
  if (!date) return null;
  const d = new Date(date);
  const time = d.getTime();
  return isNaN(time) ? null : time;
};

/** Get start-of-day timestamp for comparing calendar due dates */
export const getStartOfDayTimestamp = (date: Date | string | null | undefined): number | null => {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Get number of days relative to today (0 = today, >0 = future/left, <0 = overdue) */
export const getDaysFromToday = (dueDate: Date | string | null | undefined): number | null => {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  if (isNaN(due.getTime())) return null;

  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Sort incomplete / pending tasks:
 * - Tasks with closest due date on top (earliest due date first: overdue -> due today -> upcoming).
 * - Tasks without due date at the bottom.
 * - Secondary sort by title alphabetically when due dates are on the same day.
 * - Tertiary sort by createdAt descending.
 */
export const sortIncompleteTasks = (a: Task, b: Task): number => {
  const aDue = getStartOfDayTimestamp(a.dueDate);
  const bDue = getStartOfDayTimestamp(b.dueDate);

  if (aDue !== null && bDue !== null) {
    const diff = aDue - bDue;
    if (diff !== 0) return diff;
  } else if (aDue !== null) {
    return -1;
  } else if (bDue !== null) {
    return 1;
  }

  // Secondary sort by title alphabetically (case-insensitive, numeric-aware)
  const titleDiff = a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
  if (titleDiff !== 0) return titleDiff;

  const aCreated = getTimestamp(a.createdAt) || 0;
  const bCreated = getTimestamp(b.createdAt) || 0;
  return bCreated - aCreated;
};

/**
 * Sort completed tasks:
 * - Tasks due today / future (non-overdue, diffDays >= 0) sorted by due date ascending.
 * - Tasks that are overdue (diffDays < 0) sorted by FEWER overdue days first (smaller Math.abs(diffDays) first, e.g. 2 days overdue before 4 days overdue).
 * - Non-overdue completed tasks come before overdue completed tasks.
 * - Tasks without due date placed at the bottom.
 * - Secondary sort by title alphabetically when due dates are on the same day.
 * - Tertiary sort by createdAt descending.
 */
export const sortCompletedTasks = (a: Task, b: Task): number => {
  const aDiffDays = getDaysFromToday(a.dueDate);
  const bDiffDays = getDaysFromToday(b.dueDate);

  if (aDiffDays !== null && bDiffDays !== null) {
    const aIsOverdue = aDiffDays < 0;
    const bIsOverdue = bDiffDays < 0;

    if (!aIsOverdue && !bIsOverdue) {
      const aDue = getStartOfDayTimestamp(a.dueDate)!;
      const bDue = getStartOfDayTimestamp(b.dueDate)!;
      const dueDiff = aDue - bDue;
      if (dueDiff !== 0) return dueDiff;
    } else if (!aIsOverdue && bIsOverdue) {
      return -1;
    } else if (aIsOverdue && !bIsOverdue) {
      return 1;
    } else {
      // Both overdue: sort by fewer overdue days on top (e.g., 2 days overdue before 4 days overdue)
      const aOverdueDays = Math.abs(aDiffDays);
      const bOverdueDays = Math.abs(bDiffDays);
      const overdueDiff = aOverdueDays - bOverdueDays;
      if (overdueDiff !== 0) return overdueDiff;
    }
  } else if (aDiffDays !== null) {
    return -1;
  } else if (bDiffDays !== null) {
    return 1;
  }

  // Secondary sort by title alphabetically (case-insensitive, numeric-aware)
  const titleDiff = a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
  if (titleDiff !== 0) return titleDiff;

  const aCreated = getTimestamp(a.createdAt) || 0;
  const bCreated = getTimestamp(b.createdAt) || 0;
  return bCreated - aCreated;
};
