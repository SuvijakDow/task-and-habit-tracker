export const COLOR_HEX_REGEX = /^#[0-9A-F]{6}$/i;

export const DEFAULT_TASK_CATEGORY_COLOR = '#C4B5FD';

export const PASTEL_CATEGORY_COLORS = [
  '#93C5FD', // blue
  '#A5B4FC', // indigo
  '#C4B5FD', // purple
  '#F9A8D4', // pink
  '#FDBA74', // orange
  '#86EFAC', // green
  '#67E8F9', // cyan
  '#FDE68A', // yellow
] as const;

export const DEFAULT_CATEGORIES: ReadonlyArray<{ name: string; color: string }> = [
  { name: 'Personal', color: '#C4B5FD' },
  { name: 'Education', color: '#F9A8D4' },
  { name: 'Health', color: '#86EFAC' },
];

export const PASTEL_HABIT_COLORS = [
  '#F87171', // Red
  '#FB923C', // Orange
  '#FACC15', // Yellow
  '#34D399', // Emerald
  '#2DD4BF', // Teal
  '#38BDF8', // Sky
  '#60A5FA', // Blue
  '#C084FC', // Purple
  '#F472B6', // Pink
] as const;
