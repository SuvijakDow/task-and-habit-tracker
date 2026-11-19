import { format } from 'date-fns';

export const formatToDateString = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

export const parseToDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const getTodayDateString = (): string => {
  return formatToDateString(new Date());
};

export const getYesterdayDateString = (): string => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatToDateString(yesterday);
};

export const toLocalDate = (date: Date | string | null | undefined | any): Date | null => {
  if (!date) return null;
  if (date instanceof Date) {
    return isNaN(date.getTime()) ? null : date;
  }
  if (typeof date === 'object' && typeof date.toDate === 'function') {
    const d = date.toDate();
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof date === 'string') {
    const trimmed = date.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return parseToDate(trimmed);
    }
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof date === 'number') {
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

export const formatDueDateDisplay = (date: Date | string | null | undefined): string => {
  const d = toLocalDate(date);
  if (!d) return '';
  return format(d, 'd MMM yyyy');
};

export const formatShortDueDateDisplay = (date: Date | string | null | undefined): string => {
  const d = toLocalDate(date);
  if (!d) return '';
  const currentYear = new Date().getFullYear();
  return d.getFullYear() === currentYear ? format(d, 'd MMM') : format(d, 'd MMM yyyy');
};

export const getDeadlineStatus = (dueDateValue?: any) => {
  const dueDate = toLocalDate(dueDateValue);
  if (!dueDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(dueDate);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      text: `Overdue by ${overdueDays} day${overdueDays > 1 ? 's' : ''}`,
      shortText: `${overdueDays}d overdue`,
      className: 'text-red-600 bg-red-50 border-red-200',
      type: 'overdue' as const,
      diffDays,
    };
  }

  if (diffDays === 0) {
    return {
      text: 'Due today',
      shortText: 'Due today',
      className: 'text-amber-600 bg-amber-50 border-amber-200',
      type: 'today' as const,
      diffDays,
    };
  }

  return {
    text: `${diffDays} day${diffDays > 1 ? 's' : ''} left`,
    shortText: `${diffDays}d left`,
    className: 'text-green-600 bg-green-50 border-green-200',
    type: 'future' as const,
    diffDays,
  };
};
