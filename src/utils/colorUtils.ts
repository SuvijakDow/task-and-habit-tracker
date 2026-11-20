import { DailyHabit } from '@/types';
import { COLOR_HEX_REGEX, PASTEL_HABIT_COLORS } from '@/constants/colors';

export const isValidHexColor = (value: string): boolean => COLOR_HEX_REGEX.test(value);

export const hexToRgba = (hex: string, alpha: number): string => {
  if (!isValidHexColor(hex)) {
    return `rgba(196, 181, 253, ${alpha})`;
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const getReadableCategoryTextColor = (hex: string): string => {
  if (!isValidHexColor(hex)) {
    return '#374151';
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const darken = (channel: number) => Math.max(28, Math.round(channel * 0.45));
  return `rgb(${darken(r)}, ${darken(g)}, ${darken(b)})`;
};

export const getHabitColorHex = (habit: DailyHabit, habits: DailyHabit[]): string => {
  if (habit.color && habit.color.startsWith('#')) {
    return habit.color;
  }
  const index = habits.findIndex((h) => h.id === habit.id);
  return PASTEL_HABIT_COLORS[(index >= 0 ? index : 0) % PASTEL_HABIT_COLORS.length];
};
