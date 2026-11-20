export const WEEKDAY_SHORT_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const WEEKDAY_FULL_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/**
 * Harmonious Thai day-of-week palette:
 * Sun=Red, Mon=Yellow, Tue=Pink, Wed=Green, Thu=Orange, Fri=Blue, Sat=Purple
 */
export const WEEKDAY_STYLES = [
  {
    pill: 'bg-rose-200/85 text-rose-800 border-rose-300 shadow-[0_1px_2px_rgba(244,63,94,0.12)]',
    strip: 'bg-rose-100/90 text-rose-900 border-rose-300/90',
    softHeader: 'bg-rose-100/85 border-rose-300/80',
    label: 'text-rose-700',
  },
  {
    pill: 'bg-amber-200/85 text-amber-900 border-amber-300 shadow-[0_1px_2px_rgba(245,158,11,0.12)]',
    strip: 'bg-amber-100/90 text-amber-950 border-amber-300/90',
    softHeader: 'bg-amber-100/85 border-amber-300/80',
    label: 'text-amber-800',
  },
  {
    pill: 'bg-pink-200/85 text-pink-800 border-pink-300 shadow-[0_1px_2px_rgba(236,72,153,0.12)]',
    strip: 'bg-pink-100/90 text-pink-900 border-pink-300/90',
    softHeader: 'bg-pink-100/85 border-pink-300/80',
    label: 'text-pink-700',
  },
  {
    pill: 'bg-emerald-200/85 text-emerald-800 border-emerald-300 shadow-[0_1px_2px_rgba(16,185,129,0.12)]',
    strip: 'bg-emerald-100/90 text-emerald-900 border-emerald-300/90',
    softHeader: 'bg-emerald-100/85 border-emerald-300/80',
    label: 'text-emerald-700',
  },
  {
    pill: 'bg-orange-200/85 text-orange-800 border-orange-300 shadow-[0_1px_2px_rgba(249,115,22,0.12)]',
    strip: 'bg-orange-100/90 text-orange-900 border-orange-300/90',
    softHeader: 'bg-orange-100/85 border-orange-300/80',
    label: 'text-orange-700',
  },
  {
    pill: 'bg-sky-200/85 text-sky-800 border-sky-300 shadow-[0_1px_2px_rgba(14,165,233,0.12)]',
    strip: 'bg-sky-100/90 text-sky-900 border-sky-300/90',
    softHeader: 'bg-sky-100/85 border-sky-300/80',
    label: 'text-sky-700',
  },
  {
    pill: 'bg-violet-200/90 text-violet-900 border-violet-400/85 shadow-[0_1px_2px_rgba(124,58,237,0.14)]',
    strip: 'bg-violet-100/95 text-violet-900 border-violet-300/90',
    softHeader: 'bg-violet-100/90 border-violet-300/85',
    label: 'text-violet-700',
  },
] as const;
