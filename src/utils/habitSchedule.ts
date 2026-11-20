import { DailyHabit, TimeSlot } from '@/types';
import { WEEKDAY_SHORT_LABELS } from '@/constants/calendar';

export const timeToMinutes = (timeString: string): number => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

export const getHabitTimeSlotsForDay = (
  habit: DailyHabit,
  dayOfWeek: number
): TimeSlot[] => {
  if (habit.customSchedule?.[dayOfWeek] && habit.customSchedule[dayOfWeek].length > 0) {
    return habit.customSchedule[dayOfWeek];
  }
  if (habit.scheduledDays.includes(dayOfWeek)) {
    return [{ startTime: habit.startTime || '09:00', endTime: habit.endTime || '10:00' }];
  }
  return [];
};

export const sortHabitsByTodaySchedule = (
  habits: DailyHabit[],
  dayOfWeek: number = new Date().getDay()
): DailyHabit[] => {
  return [...habits].sort((a, b) => {
    const aSlots = getHabitTimeSlotsForDay(a, dayOfWeek);
    const bSlots = getHabitTimeSlotsForDay(b, dayOfWeek);

    const aStart =
      aSlots.length > 0
        ? Math.min(...aSlots.map((s) => timeToMinutes(s.startTime)))
        : timeToMinutes(a.startTime || '09:00');
    const bStart =
      bSlots.length > 0
        ? Math.min(...bSlots.map((s) => timeToMinutes(s.startTime)))
        : timeToMinutes(b.startTime || '09:00');

    if (aStart !== bStart) {
      return aStart - bStart;
    }

    const aEnd =
      aSlots.length > 0
        ? Math.min(...aSlots.map((s) => timeToMinutes(s.endTime)))
        : timeToMinutes(a.endTime || '10:00');
    const bEnd =
      bSlots.length > 0
        ? Math.min(...bSlots.map((s) => timeToMinutes(s.endTime)))
        : timeToMinutes(b.endTime || '10:00');

    if (aEnd !== bEnd) {
      return aEnd - bEnd;
    }

    return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
  });
};

export const formatScheduledDays = (days?: number[]): string => {
  if (!days || days.length === 0 || days.length === 7) return 'Every day';
  return [...days]
    .sort((a, b) => a - b)
    .map((d) => WEEKDAY_SHORT_LABELS[d])
    .join(', ');
};
