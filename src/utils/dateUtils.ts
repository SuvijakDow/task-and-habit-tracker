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
