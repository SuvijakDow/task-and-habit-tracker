import { ALL_WEEKDAYS } from '@/constants/defaults';
import { WEEKDAY_SHORT_LABELS } from '@/constants/calendar';
import { formatToDateString } from '@/utils/dateUtils';

/**
 * Calculate total completion score incorporating partial progress ratios
 * e.g., 100% = 1, 50% = 0.5, 20% = 0.2
 */
export const calculateTotalCompletions = (
  completedDates: string[],
  targetValue?: number,
  dailyProgress?: Record<string, number>,
  notScheduledDates?: string[]
): number => {
  if (!targetValue || targetValue <= 0) {
    const validCompleted = notScheduledDates
      ? completedDates.filter((d) => !notScheduledDates.includes(d))
      : completedDates;
    return Number(validCompleted.length.toFixed(2));
  }

  const notScheduledSet = new Set(notScheduledDates || []);
  const allDates = new Set([...completedDates, ...Object.keys(dailyProgress || {})]);
  let totalScore = 0;

  allDates.forEach((dateStr) => {
    if (notScheduledSet.has(dateStr)) return;
    const isCompleted = completedDates.includes(dateStr);
    const logged = dailyProgress?.[dateStr] ?? (isCompleted ? targetValue : 0);
    const ratio = Math.min(1.0, Math.max(0, logged / targetValue));
    totalScore += ratio;
  });

  return Number(totalScore.toFixed(2));
};

/**
 * Calculate current streak for a habit (consecutive completed scheduled days or >= 50% progress)
 */
export const calculateStreak = (
  completedDates: string[],
  scheduledDays?: number[],
  targetValue?: number,
  dailyProgress?: Record<string, number>,
  notScheduledDates?: string[]
): number => {
  const schedule = scheduledDays || [...ALL_WEEKDAYS];
  const notScheduledSet = new Set(notScheduledDates || []);
  const completedSet = new Set(completedDates);

  let streak = 0;
  const currentDate = new Date();

  for (let i = 0; i < 365; i++) {
    const dayOfWeek = currentDate.getDay();
    const dateStr = formatToDateString(currentDate);
    const isNotScheduled = notScheduledSet.has(dateStr) || !schedule.includes(dayOfWeek);

    if (!isNotScheduled) {
      let isStreakValid = completedSet.has(dateStr);

      if (!isStreakValid && targetValue && targetValue > 0) {
        const logged = dailyProgress?.[dateStr] ?? 0;
        if (logged / targetValue >= 0.5) {
          isStreakValid = true;
        }
      }

      if (isStreakValid) {
        streak++;
      } else {
        break;
      }
    }

    currentDate.setDate(currentDate.getDate() - 1);
  }

  return streak;
};

/**
 * Calculate overall consistency percentage:
 * (sum of progress ratios on scheduled days / total scheduled days that have passed) * 100
 */
export const calculateConsistency = (
  completedDates: string[],
  scheduledDays?: number[],
  startDateInput?: Date,
  targetValue?: number,
  dailyProgress?: Record<string, number>,
  notScheduledDates?: string[]
): number => {
  const schedule = scheduledDays || [...ALL_WEEKDAYS];
  const notScheduledSet = new Set(notScheduledDates || []);
  const completedSet = new Set(completedDates);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = startDateInput ? new Date(startDateInput) : new Date(today);
  startDate.setHours(0, 0, 0, 0);

  let scheduledDayCount = 0;
  let totalProgressScore = 0;

  const currentDate = new Date(startDate);
  while (currentDate <= today) {
    const dayOfWeek = currentDate.getDay();
    const dateStr = formatToDateString(currentDate);
    const isNotScheduled = notScheduledSet.has(dateStr) || !schedule.includes(dayOfWeek);

    if (!isNotScheduled) {
      scheduledDayCount++;
      const isCompleted = completedSet.has(dateStr);

      if (targetValue && targetValue > 0) {
        const logged = dailyProgress?.[dateStr] ?? (isCompleted ? targetValue : 0);
        totalProgressScore += Math.min(1.0, Math.max(0, logged / targetValue));
      } else if (isCompleted) {
        totalProgressScore += 1.0;
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (scheduledDayCount === 0) return 0;
  return Math.min(100, Math.round((totalProgressScore / scheduledDayCount) * 100));
};

/**
 * Get the past 7 days completion status
 */
export const getPast7DaysStatus = (
  completedDates: string[]
): { date: string; completed: boolean }[] => {
  const completedSet = new Set(completedDates);
  const past7Days: { date: string; completed: boolean }[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = formatToDateString(date);
    past7Days.push({
      date: dateStr,
      completed: completedSet.has(dateStr),
    });
  }

  return past7Days;
};

/**
 * Get the day abbreviation from date string (YYYY-MM-DD format)
 */
export const getDayAbbreviation = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-');
  const date = new Date(`${year}-${month}-${day}T00:00:00`);
  return WEEKDAY_SHORT_LABELS[date.getDay()];
};
