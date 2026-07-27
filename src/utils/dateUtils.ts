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

export const formatDueDateDisplay = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return format(d, 'd MMM yyyy');
};

export const getDeadlineStatus = (dueDateValue?: any) => {
  if (!dueDateValue) return null;

  let dueDate: Date;
  if (dueDateValue instanceof Date) {
    dueDate = dueDateValue;
  } else if (dueDateValue && typeof dueDateValue === 'object' && typeof dueDateValue.toDate === 'function') {
    dueDate = dueDateValue.toDate();
  } else if (typeof dueDateValue === 'string' || typeof dueDateValue === 'number') {
    dueDate = new Date(dueDateValue);
  } else {
    return null;
  }

  if (isNaN(dueDate.getTime())) return null;

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
      className: 'text-red-600 bg-red-50 border-red-200',
    };
  }

  if (diffDays === 0) {
    return {
      text: 'Due today',
      className: 'text-amber-600 bg-amber-50 border-amber-200',
    };
  }

  return {
    text: `${diffDays} day${diffDays > 1 ? 's' : ''} left`,
    className: 'text-green-600 bg-green-50 border-green-200',
  };
};
