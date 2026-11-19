import { Task, Category, Subtask } from '@/types';

/** Helper to get valid timestamp from Date or string */
export const getTimestamp = (date: Date | string | null | undefined): number | null => {
  if (!date) return null;
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    const [year, month, day] = date.trim().split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return isNaN(d.getTime()) ? null : d.getTime();
  }
  const d = new Date(date);
  const time = d.getTime();
  return isNaN(time) ? null : time;
};

/** Get start-of-day timestamp for comparing calendar due dates */
export const getStartOfDayTimestamp = (date: Date | string | null | undefined): number | null => {
  if (!date) return null;
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    const [year, month, day] = date.trim().split('-').map(Number);
    const d = new Date(year, month - 1, day);
    d.setHours(0, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d.getTime();
  }
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Get number of days relative to today (0 = today, >0 = future/left, <0 = overdue) */
export const getDaysFromToday = (dueDate: Date | string | null | undefined): number | null => {
  const dueTime = getStartOfDayTimestamp(dueDate);
  if (dueTime === null) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = dueTime - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Find the incomplete subtask with the earliest valid dueDate.
 */
export const getEarliestIncompleteSubtask = (task: Task): Subtask | null => {
  if (!task.subtasks || task.subtasks.length === 0) return null;

  let earliest: Subtask | null = null;
  let earliestTime: number | null = null;

  for (const st of task.subtasks) {
    if (st.isCompleted || !st.dueDate) continue;
    const t = getStartOfDayTimestamp(st.dueDate);
    if (t === null) continue;
    if (earliestTime === null || t < earliestTime) {
      earliestTime = t;
      earliest = st;
    }
  }

  return earliest;
};

/**
 * Get the effective due date of a task for prioritization:
 * For incomplete tasks, uses whichever deadline comes earliest between the main task
 * and its incomplete subtasks.
 */
export const getEffectiveTaskDueDate = (task: Task): Date | string | null => {
  if (task.isCompleted) return task.dueDate;

  const mainTime = getStartOfDayTimestamp(task.dueDate);
  const earliestSubtask = getEarliestIncompleteSubtask(task);
  const subTime = earliestSubtask ? getStartOfDayTimestamp(earliestSubtask.dueDate) : null;

  if (mainTime !== null && subTime !== null) {
    return subTime < mainTime ? (earliestSubtask!.dueDate ?? task.dueDate) : task.dueDate;
  }
  if (subTime !== null && earliestSubtask?.dueDate) {
    return earliestSubtask.dueDate;
  }
  return task.dueDate;
};

/**
 * Sort subtasks chronologically by dueDate ascending while keeping original relative order
 * for subtasks with identical dueDates or without a dueDate.
 */
export const sortSubtasksByDueDate = (subtasks: Subtask[]): Subtask[] => {
  if (!subtasks || subtasks.length <= 1) return subtasks || [];
  const hasAnyDueDate = subtasks.some((st) => getStartOfDayTimestamp(st.dueDate) !== null);
  if (!hasAnyDueDate) return subtasks;

  return subtasks
    .map((st, index) => ({ st, index, due: getStartOfDayTimestamp(st.dueDate) }))
    .sort((a, b) => {
      if (a.due !== null && b.due !== null) {
        if (a.due !== b.due) return a.due - b.due;
        return a.index - b.index;
      }
      if (a.due !== null) return -1;
      if (b.due !== null) return 1;
      return a.index - b.index;
    })
    .map((item) => item.st);
};

/**
 * Sort incomplete / pending tasks:
 * - Starred tasks on top.
 * - Tasks with closest effective due date on top (earliest due date among main task & incomplete subtasks).
 * - Tasks without any due date at the bottom.
 * - Tie-breaker by main task dueDate, then title alphabetically, then createdAt descending.
 */
export const sortIncompleteTasks = (a: Task, b: Task): number => {
  const aStarred = Boolean(a.isStarred);
  const bStarred = Boolean(b.isStarred);
  if (aStarred && !bStarred) return -1;
  if (!aStarred && bStarred) return 1;

  const aDue = getStartOfDayTimestamp(getEffectiveTaskDueDate(a));
  const bDue = getStartOfDayTimestamp(getEffectiveTaskDueDate(b));

  if (aDue !== null && bDue !== null) {
    const diff = aDue - bDue;
    if (diff !== 0) return diff;

    // Tie-breaker: compare main task due date if effective due dates match
    const aMainDue = getStartOfDayTimestamp(a.dueDate);
    const bMainDue = getStartOfDayTimestamp(b.dueDate);
    if (aMainDue !== null && bMainDue !== null && aMainDue !== bMainDue) {
      return aMainDue - bMainDue;
    }
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
 * - Starred tasks on top.
 * - Tasks due today / future (non-overdue, diffDays >= 0) sorted by due date ascending.
 * - Tasks that are overdue (diffDays < 0) sorted by FEWER overdue days first (smaller Math.abs(diffDays) first, e.g. 2 days overdue before 4 days overdue).
 * - Non-overdue completed tasks come before overdue completed tasks.
 * - Tasks without due date placed at the bottom.
 * - Secondary sort by title alphabetically when due dates are on the same day.
 * - Tertiary sort by createdAt descending.
 */
export const sortCompletedTasks = (a: Task, b: Task): number => {
  const aStarred = Boolean(a.isStarred);
  const bStarred = Boolean(b.isStarred);
  if (aStarred && !bStarred) return -1;
  if (!aStarred && bStarred) return 1;

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

export type QuickFilter = 'all' | 'today' | 'overdue' | 'week';

const dateMatchesQuickFilter = (
  dateVal: Date | string | null | undefined,
  quickFilter: QuickFilter
): boolean => {
  if (quickFilter === 'all') return true;
  const dueTime = getStartOfDayTimestamp(dateVal);
  if (dueTime === null) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();

  if (quickFilter === 'today') {
    return dueTime === todayTime;
  }

  if (quickFilter === 'overdue') {
    return dueTime < todayTime;
  }

  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);
  return dueTime >= todayTime && dueTime <= weekEnd.getTime();
};

export const matchesQuickFilter = (task: Task, quickFilter: QuickFilter): boolean => {
  if (quickFilter === 'all') return true;

  if (dateMatchesQuickFilter(task.dueDate, quickFilter)) {
    return true;
  }

  if (!task.isCompleted && Array.isArray(task.subtasks)) {
    return task.subtasks.some(
      (st) => !st.isCompleted && st.dueDate && dateMatchesQuickFilter(st.dueDate, quickFilter)
    );
  }

  return false;
};

export const filterTask = (
  task: Task,
  searchQuery: string,
  categoryFilter: string,
  quickFilter: QuickFilter,
  categories: Category[]
): boolean => {
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const matchedCategory = categories.find((c) => c.id === task.category || c.name === task.category);
  const categoryName = (matchedCategory?.name || task.category || '').toLowerCase();
  const title = task.title.toLowerCase();
  const description = (task.description || '').toLowerCase();
  const matchesSubtaskTitle =
    normalizedSearch.length > 0 &&
    Array.isArray(task.subtasks) &&
    task.subtasks.some((st) => (st.title || '').toLowerCase().includes(normalizedSearch));

  const matchesSearch =
    normalizedSearch.length === 0 ||
    title.includes(normalizedSearch) ||
    description.includes(normalizedSearch) ||
    categoryName.includes(normalizedSearch) ||
    matchesSubtaskTitle;

  const categoryId = matchedCategory?.id || task.category;
  const categoryNameRaw = matchedCategory?.name || task.category;
  const matchesCategory =
    categoryFilter === 'all' ||
    categoryFilter === categoryId ||
    categoryFilter === categoryNameRaw;

  return matchesSearch && matchesCategory && matchesQuickFilter(task, quickFilter);
};

