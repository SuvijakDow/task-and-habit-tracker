import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CornerDownRight,
  Eye,
  EyeOff,
  Layers,
  LayoutGrid,
  Columns3,
  Pencil,
  Plus,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import { Category, Subtask, Task } from '@/types';
import {
  COLOR_HEX_REGEX,
  DEFAULT_TASK_CATEGORY_COLOR,
  DEFAULT_TASK_CATEGORY_NAME,
} from '@/constants/taskConstants';
import { formatToDateString, getDeadlineStatus, toLocalDate } from '@/utils/dateUtils';
import { TaskSmartChip } from '@/components/tasks/TaskSmartChip';

interface CalendarDeadlineItem {
  id: string;
  type: 'task' | 'subtask';
  dateKey: string;
  title: string;
  parentTask: Task;
  subtask?: Subtask;
  isCompleted: boolean;
  isStarred: boolean;
  categoryName: string;
  categoryColor: string;
  categoryTextColor: string;
}

interface TaskCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  visibleTasks: Task[];
  allTasks: Task[];
  categories: Category[];
  activePresetName?: string;
  hasMultiplePresets?: boolean;
  onToggleTaskCompletion: (taskId: string, currentStatus: boolean) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onEditTask: (task: Task) => void;
  onAddTaskForDate: (dateStr: string) => void;
  togglingTaskId: string | null;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Harmonious Thai day-of-week colors (Sun=Red, Mon=Yellow, Tue=Pink, Wed=Green, Thu=Orange, Fri=Blue, Sat=Purple)
const WEEKDAY_STYLES = [
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

const isValidHexColor = (value: string): boolean => COLOR_HEX_REGEX.test(value);

const hexToRgba = (hex: string, alpha: number): string => {
  if (!isValidHexColor(hex)) return `rgba(196, 181, 253, ${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getReadableCategoryTextColor = (hex: string): string => {
  if (!isValidHexColor(hex)) return '#374151';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const darken = (channel: number) => Math.max(28, Math.round(channel * 0.45));
  return `rgb(${darken(r)}, ${darken(g)}, ${darken(b)})`;
};

export const TaskCalendarModal: React.FC<TaskCalendarModalProps> = ({
  isOpen,
  onClose,
  visibleTasks,
  allTasks,
  categories,
  activePresetName,
  hasMultiplePresets = false,
  onToggleTaskCompletion,
  onToggleSubtask,
  onEditTask,
  onAddTaskForDate,
  togglingTaskId,
}) => {
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [hideCompleted, setHideCompleted] = useState(false);
  const [scopeAllPresets, setScopeAllPresets] = useState(false);

  const mobileDaySectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Lock background scroll while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Reset to today when opening fresh
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setAnchorDate(now);
      setSelectedDate(now);
    }
  }, [isOpen]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, [isOpen]);

  const todayKey = useMemo(() => formatToDateString(today), [today]);

  const scopedTasks = scopeAllPresets ? allTasks : visibleTasks;

  // Build map of YYYY-MM-DD -> CalendarDeadlineItem[]
  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarDeadlineItem[]>();

    const getCategoryMeta = (taskCategory: string) => {
      const matched = categories.find(
        (c) => c.id === taskCategory || c.name === taskCategory
      );
      const categoryName = matched?.name || taskCategory || DEFAULT_TASK_CATEGORY_NAME;
      const categoryColor = isValidHexColor(matched?.color || '')
        ? (matched?.color as string)
        : DEFAULT_TASK_CATEGORY_COLOR;
      const categoryTextColor = getReadableCategoryTextColor(categoryColor);
      return { categoryName, categoryColor, categoryTextColor };
    };

    const pushItem = (item: CalendarDeadlineItem) => {
      if (hideCompleted && item.isCompleted) return;
      const existing = map.get(item.dateKey);
      if (existing) existing.push(item);
      else map.set(item.dateKey, [item]);
    };

    for (const task of scopedTasks) {
      const catMeta = getCategoryMeta(task.category);

      // 1. Main task deadline
      const taskDue = toLocalDate(task.dueDate);
      if (taskDue) {
        pushItem({
          id: task.id,
          type: 'task',
          dateKey: formatToDateString(taskDue),
          title: task.title,
          parentTask: task,
          isCompleted: task.isCompleted,
          isStarred: Boolean(task.isStarred),
          ...catMeta,
        });
      }

      // 2. Individual subtask deadlines
      if (Array.isArray(task.subtasks)) {
        for (const st of task.subtasks) {
          const stDue = toLocalDate(st.dueDate);
          if (!stDue) continue;
          pushItem({
            id: `${task.id}__${st.id}`,
            type: 'subtask',
            dateKey: formatToDateString(stDue),
            title: st.title,
            parentTask: task,
            subtask: st,
            isCompleted: Boolean(st.isCompleted),
            isStarred: Boolean(task.isStarred),
            ...catMeta,
          });
        }
      }
    }

    // Sort items within each date: Pending first, Starred first, Main Tasks before Subtasks, then Title
    map.forEach((items) => {
      items.sort((a, b) => {
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
        if (a.isStarred !== b.isStarred) return a.isStarred ? -1 : 1;
        if (a.type !== b.type) return a.type === 'task' ? -1 : 1;
        return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
      });
    });

    return map;
  }, [scopedTasks, categories, hideCompleted]);

  // Month grid days
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(anchorDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(anchorDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [anchorDate]);

  // Week view days
  const weekDays = useMemo(() => {
    const start = startOfWeek(anchorDate, { weekStartsOn: 0 });
    const end = endOfWeek(anchorDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [anchorDate]);

  // Summary counts for currently viewed Month or Week
  const periodSummary = useMemo(() => {
    const daysToCount =
      viewMode === 'month'
        ? monthDays.filter((d) => isSameMonth(d, anchorDate))
        : weekDays;

    let pending = 0;
    let completed = 0;
    let busyDays = 0;

    for (const day of daysToCount) {
      const items = itemsByDate.get(formatToDateString(day)) || [];
      if (items.length > 0) busyDays++;
      for (const item of items) {
        if (item.isCompleted) completed++;
        else pending++;
      }
    }

    return { pending, completed, busyDays };
  }, [viewMode, monthDays, weekDays, anchorDate, itemsByDate]);

  const selectedDateKey = formatToDateString(selectedDate);
  const selectedDayItems = itemsByDate.get(selectedDateKey) || [];
  const selectedDateStatus = getDeadlineStatus(selectedDate);

  // Nearby days (±7 days from selectedDate) that have deadlines for quick comparison
  const nearbyDeadlineDays = useMemo(() => {
    const results: { date: Date; dateKey: string; pendingCount: number; totalCount: number }[] = [];
    for (let offset = -7; offset <= 7; offset++) {
      if (offset === 0) continue;
      const d = addDays(selectedDate, offset);
      const key = formatToDateString(d);
      const items = itemsByDate.get(key) || [];
      if (items.length > 0) {
        const pendingCount = items.filter((i) => !i.isCompleted).length;
        results.push({ date: d, dateKey: key, pendingCount, totalCount: items.length });
      }
    }
    return results.slice(0, 6);
  }, [selectedDate, itemsByDate]);

  const handlePrev = () => {
    if (viewMode === 'month') {
      const next = subMonths(anchorDate, 1);
      setAnchorDate(next);
    } else {
      const next = subWeeks(anchorDate, 1);
      setAnchorDate(next);
      setSelectedDate(next);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      const next = addMonths(anchorDate, 1);
      setAnchorDate(next);
    } else {
      const next = addWeeks(anchorDate, 1);
      setAnchorDate(next);
      setSelectedDate(next);
    }
  };

  const handleJumpToday = () => {
    const now = new Date();
    setAnchorDate(now);
    setSelectedDate(now);
  };

  const handleSelectDay = (day: Date) => {
    setSelectedDate(day);
    if (viewMode === 'month' && !isSameMonth(day, anchorDate)) {
      setAnchorDate(day);
    }
  };

  const handleToggleItem = (item: CalendarDeadlineItem) => {
    if (item.type === 'task') {
      onToggleTaskCompletion(item.parentTask.id, item.parentTask.isCompleted);
    } else if (item.subtask) {
      onToggleSubtask(item.parentTask.id, item.subtask.id);
    }
  };

  const isViewingCurrentPeriod =
    viewMode === 'month'
      ? isSameMonth(anchorDate, today)
      : weekDays.some((d) => isSameDay(d, today));

  const headerDateLabel = useMemo(() => {
    if (viewMode === 'month') {
      return format(anchorDate, 'MMMM yyyy');
    }
    const first = weekDays[0];
    const last = weekDays[6];
    if (first.getMonth() === last.getMonth()) {
      return `${format(first, 'd')} – ${format(last, 'd MMM yyyy')}`;
    }
    if (first.getFullYear() === last.getFullYear()) {
      return `${format(first, 'd MMM')} – ${format(last, 'd MMM yyyy')}`;
    }
    return `${format(first, 'd MMM yyyy')} – ${format(last, 'd MMM yyyy')}`;
  }, [viewMode, anchorDate, weekDays]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-slate-950/45 sm:backdrop-blur-xs flex items-end sm:items-center justify-center z-[9990] p-0 sm:p-3 md:p-5 overflow-hidden"
      onClick={onClose}
    >
      <div
        className="modal-enter w-full sm:max-w-6xl h-dvh sm:h-[90dvh] max-h-dvh sm:max-h-[calc(100dvh-2rem)] flex flex-col bg-[#3b0764] border-0 sm:ring-1 sm:ring-purple-950/30 rounded-none sm:rounded-3xl shadow-[0_24px_60px_rgba(59,7,100,0.38)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header — Rich Signature Dark Plum-Violet Banner matching Task Hub */}
        <div className="relative overflow-hidden px-3.5 sm:px-6 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2.5 sm:pt-2.5 sm:pb-3.5 border-b border-pink-400/25 bg-gradient-to-br from-[#3b0764] via-[#581c87] to-[#701a75] text-white shrink-0 space-y-2 sm:space-y-2.5">
          <div className="pointer-events-none absolute -right-12 -top-12 w-44 h-44 rounded-full bg-pink-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-12 -bottom-12 w-44 h-44 rounded-full bg-amber-400/15 blur-3xl" />

          {/* Row 1: Title, Summary & Close */}
          <div className="relative z-10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-white/15 border border-white/25 text-amber-300 flex items-center justify-center shadow-sm shrink-0">
                <CalendarDays className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight truncate">
                    Deadline Calendar
                  </h2>
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/15 text-amber-300 border border-white/20 shadow-2xs">
                    <span>{periodSummary.pending} pending</span>
                    {!hideCompleted && periodSummary.completed > 0 && (
                      <span className="text-emerald-300 font-semibold">· {periodSummary.completed} done</span>
                    )}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-purple-200/90 font-medium leading-tight mt-0.5 truncate">
                  {scopeAllPresets
                    ? 'Showing all periods · tasks & subtask milestones'
                    : `${activePresetName ? `Period: ${activePresetName} · ` : ''}Tasks & subtask deadlines`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white/15 hover:bg-white/25 text-purple-100 hover:text-white border border-white/25 transition flex items-center justify-center shrink-0 shadow-xs"
              aria-label="Close calendar"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Row 2: Navigation, View Mode Switcher & Quick Toggles */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
            {/* Date Navigator */}
            <div className="flex items-center gap-1.5">
              <div className="inline-flex items-center bg-white/15 rounded-xl border border-white/25 p-0.5 shadow-xs">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg text-purple-100 hover:text-white hover:bg-white/20 flex items-center justify-center transition"
                  title={viewMode === 'month' ? 'Previous month' : 'Previous week'}
                  aria-label={viewMode === 'month' ? 'Previous month' : 'Previous week'}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 sm:px-3 text-xs sm:text-sm font-extrabold text-white min-w-[118px] sm:min-w-[155px] text-center select-none">
                  {headerDateLabel}
                </span>
                <button
                  type="button"
                  onClick={handleNext}
                  className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg text-purple-100 hover:text-white hover:bg-white/20 flex items-center justify-center transition"
                  title={viewMode === 'month' ? 'Next month' : 'Next week'}
                  aria-label={viewMode === 'month' ? 'Next month' : 'Next week'}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleJumpToday}
                className={`h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl text-xs font-bold border transition shadow-xs ${isViewingCurrentPeriod && isSameDay(selectedDate, today)
                    ? 'bg-amber-400 text-purple-950 border-amber-300'
                    : 'bg-white/15 text-white border-white/25 hover:bg-white/25'
                  }`}
              >
                Today
              </button>
            </div>

            {/* Right Controls: Month/Week Switcher & Filters */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {/* Hide/Show Completed Toggle */}
              <button
                type="button"
                onClick={() => setHideCompleted((prev) => !prev)}
                className={`h-8 sm:h-9 px-2.5 rounded-xl text-[11px] sm:text-xs font-semibold border inline-flex items-center gap-1.5 transition shadow-xs ${hideCompleted
                    ? 'bg-pink-500 text-white border-pink-400'
                    : 'bg-white/15 text-purple-100 border-white/25 hover:bg-white/25 hover:text-white'
                  }`}
                title={hideCompleted ? 'Showing pending only' : 'Showing all tasks (including completed)'}
              >
                {hideCompleted ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-pink-200" />}
                <span>{hideCompleted ? 'Pending only' : 'All status'}</span>
              </button>

              {/* Period Scope Toggle (only if multiple presets exist) */}
              {hasMultiplePresets && (
                <button
                  type="button"
                  onClick={() => setScopeAllPresets((prev) => !prev)}
                  className={`h-8 sm:h-9 px-2.5 rounded-xl text-[11px] sm:text-xs font-semibold border inline-flex items-center gap-1.5 transition shadow-xs ${scopeAllPresets
                      ? 'bg-pink-500 text-white border-pink-400'
                      : 'bg-white/15 text-purple-100 border-white/25 hover:bg-white/25 hover:text-white'
                    }`}
                  title="Switch between current period and all periods"
                >
                  <Layers className={`w-3.5 h-3.5 ${scopeAllPresets ? 'text-white' : 'text-amber-200'}`} />
                  <span className="hidden xs:inline">{scopeAllPresets ? 'All Periods' : 'This Period'}</span>
                  <span className="xs:hidden">{scopeAllPresets ? 'All' : 'Period'}</span>
                </button>
              )}

              {/* Month / Week View Switcher */}
              <div className="inline-flex items-center bg-black/20 rounded-xl border border-white/20 p-0.5 shadow-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('month')}
                  className={`h-7 sm:h-8 px-2.5 sm:px-3 rounded-lg text-[11px] sm:text-xs font-bold inline-flex items-center gap-1.5 transition ${viewMode === 'month'
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xs'
                      : 'text-purple-100 hover:bg-white/15 hover:text-white'
                    }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Month</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAnchorDate(selectedDate);
                    setViewMode('week');
                  }}
                  className={`h-7 sm:h-8 px-2.5 sm:px-3 rounded-lg text-[11px] sm:text-xs font-bold inline-flex items-center gap-1.5 transition ${viewMode === 'week'
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xs'
                      : 'text-purple-100 hover:bg-white/15 hover:text-white'
                    }`}
                >
                  <Columns3 className="w-3.5 h-3.5" />
                  <span>Week</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Body */}
        {viewMode === 'month' ? (
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden bg-[#ece6f5] bg-gradient-to-br from-[#ece5f6] via-[#efeaf6] to-[#e6ecf8]">
            {/* Left / Top: Month Calendar Grid */}
            <div className="flex-1 min-w-0 flex flex-col p-2.5 sm:p-4 lg:p-5 lg:overflow-y-auto shrink-0 lg:shrink">
              {/* Weekday Headers — Harmonious Thai Day-of-Week Colors */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                {WEEKDAY_LABELS.map((day, idx) => (
                  <div
                    key={day}
                    className={`text-center text-[10px] sm:text-xs font-extrabold uppercase tracking-wider py-1.5 rounded-lg border ${WEEKDAY_STYLES[idx].pill}`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Day Cells */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 flex-1 auto-rows-fr">
                {monthDays.map((day) => {
                  const dateKey = formatToDateString(day);
                  const items = itemsByDate.get(dateKey) || [];
                  const pendingItems = items.filter((i) => !i.isCompleted);
                  const completedItems = items.filter((i) => i.isCompleted);
                  const inCurrentMonth = isSameMonth(day, anchorDate);
                  const isToday = dateKey === todayKey;
                  const isSelected = dateKey === selectedDateKey;
                  const isPastDay = dateKey < todayKey;
                  const hasOverduePending = isPastDay && pendingItems.length > 0;
                  const hasDueTodayPending = isToday && pendingItems.length > 0;
                  const isAllDoneDay = pendingItems.length === 0 && completedItems.length > 0;

                  // Clean, unmistakable status semantics:
                  // White = Normal/Upcoming (including Sat & Sun), Red Aura = Overdue, Yellow Aura = Due Today only, Green = All Done
                  let cellClasses = inCurrentMonth
                    ? 'bg-white border-purple-200/95 shadow-[0_2px_5px_rgba(88,28,135,0.06)] hover:border-purple-500 hover:shadow-sm'
                    : 'bg-slate-200/75 border-slate-300/80 text-slate-400 hover:border-purple-300';

                  if (hasOverduePending && inCurrentMonth) {
                    cellClasses = isSelected
                      ? 'bg-gradient-to-br from-rose-50 via-white to-rose-100/75 border-2 border-rose-500 ring-2 ring-purple-500/80 shadow-[0_0_0_2px_rgba(244,63,94,0.22),0_4px_14px_rgba(244,63,94,0.22)]'
                      : 'bg-gradient-to-br from-rose-50 via-white to-rose-100/75 border-2 border-rose-400 shadow-[0_0_0_2px_rgba(244,63,94,0.18),0_4px_14px_rgba(244,63,94,0.2)] hover:border-rose-500';
                  } else if (hasDueTodayPending) {
                    cellClasses = isSelected
                      ? 'bg-gradient-to-br from-amber-50 via-white to-amber-100/75 border-2 border-amber-500 ring-2 ring-purple-500/80 shadow-[0_0_0_2px_rgba(251,191,36,0.24),0_4px_14px_rgba(245,158,11,0.22)]'
                      : 'bg-gradient-to-br from-amber-50 via-white to-amber-100/75 border-2 border-amber-400 shadow-[0_0_0_2px_rgba(251,191,36,0.2),0_4px_14px_rgba(245,158,11,0.2)] hover:border-amber-500';
                  } else if (isAllDoneDay && inCurrentMonth) {
                    cellClasses = isSelected
                      ? 'bg-emerald-50 border-2 border-emerald-500 ring-2 ring-purple-500/80 shadow-md'
                      : 'bg-emerald-50 border-emerald-300 shadow-[0_2px_6px_rgba(16,185,129,0.1)] hover:border-emerald-400';
                  } else if (isSelected) {
                    cellClasses = 'bg-gradient-to-br from-purple-50 via-white to-pink-50 border-2 border-purple-600 ring-2 ring-pink-300/80 shadow-md';
                  } else if (isToday) {
                    cellClasses = 'bg-white border-2 border-purple-400 shadow-sm hover:border-purple-500';
                  }

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      onClick={() => handleSelectDay(day)}
                      className={`group relative flex flex-col items-stretch text-left rounded-xl sm:rounded-2xl border p-1 sm:p-1.5 min-h-[54px] sm:min-h-[86px] lg:min-h-[96px] transition-all cursor-pointer overflow-hidden ${cellClasses}`}
                    >
                      {/* Day Number + Status Count Pill */}
                      <div className="flex items-center justify-between gap-0.5 mb-1">
                        <span
                          className={`inline-flex items-center justify-center text-[11px] sm:text-xs font-extrabold w-5 h-5 sm:w-6 sm:h-6 rounded-full transition ${isToday
                              ? 'bg-gradient-to-br from-purple-600 to-pink-500 text-white shadow-sm'
                              : isSelected
                                ? 'text-white bg-purple-600 shadow-2xs'
                                : inCurrentMonth
                                  ? day.getDay() === 0
                                    ? 'text-rose-600'
                                    : day.getDay() === 6
                                      ? 'text-purple-700'
                                      : 'text-gray-900'
                                  : 'text-gray-400'
                            }`}
                        >
                          {format(day, 'd')}
                        </span>

                        {/* Clear Status Count Badge */}
                        {pendingItems.length > 0 ? (
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold leading-none border ${hasOverduePending
                                ? 'bg-rose-500 text-white border-rose-600 shadow-2xs'
                                : hasDueTodayPending
                                  ? 'bg-amber-400 text-purple-950 border-amber-500 shadow-2xs'
                                  : 'bg-purple-100 text-purple-800 border-purple-300'
                              } ${!inCurrentMonth ? 'opacity-65' : ''}`}
                          >
                            {pendingItems.length}
                          </span>
                        ) : completedItems.length > 0 ? (
                          <span
                            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold leading-none bg-emerald-500 text-white border border-emerald-600 shadow-2xs ${!inCurrentMonth ? 'opacity-60' : ''
                              }`}
                          >
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                            <span className="hidden sm:inline">{completedItems.length}</span>
                          </span>
                        ) : null}
                      </div>

                      {/* Mobile (< sm): Clean colored dots */}
                      {items.length > 0 && (
                        <div className={`flex sm:hidden flex-wrap items-center gap-0.5 mt-auto pt-0.5 ${!inCurrentMonth ? 'opacity-55' : ''}`}>
                          {items.slice(0, 4).map((item) => (
                            <span
                              key={item.id}
                              className={`h-1.5 w-1.5 rounded-full shrink-0 ${item.isCompleted ? 'opacity-45' : ''
                                }`}
                              style={{
                                backgroundColor:
                                  hasOverduePending && !item.isCompleted
                                    ? '#f43f5e'
                                    : item.categoryColor,
                              }}
                            />
                          ))}
                          {items.length > 4 && (
                            <span className="text-[8px] font-bold text-pink-600 leading-none">
                              +{items.length - 4}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Tablet & Desktop (sm+): Vibrant Category-Colored Preview Chips */}
                      {items.length > 0 && (
                        <div className={`hidden sm:flex flex-col gap-1 w-full min-w-0 flex-1 ${!inCurrentMonth ? 'opacity-60' : ''}`}>
                          {items.slice(0, 3).map((item, idx) => (
                            <div
                              key={item.id}
                              className={`${idx === 2 ? 'hidden xl:flex' : 'flex'} items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] leading-tight truncate border ${item.isCompleted
                                  ? 'bg-emerald-50/70 text-emerald-800/60 border-emerald-200/80 line-through'
                                  : item.type === 'subtask'
                                    ? 'border-dashed'
                                    : 'shadow-[0_1px_1px_rgba(0,0,0,0.04)]'
                                }`}
                              style={
                                !item.isCompleted
                                  ? item.type === 'subtask'
                                    ? {
                                      backgroundColor: hexToRgba(item.categoryColor, 0.16),
                                      borderColor: hexToRgba(item.categoryColor, 0.72),
                                      borderLeftWidth: '3px',
                                      borderLeftColor: item.categoryColor,
                                      color: item.categoryTextColor,
                                    }
                                    : {
                                      backgroundColor: hexToRgba(item.categoryColor, 0.24),
                                      borderColor: hexToRgba(item.categoryColor, 0.68),
                                      borderLeftWidth: '3.5px',
                                      borderLeftColor: item.categoryColor,
                                      color: item.categoryTextColor,
                                    }
                                  : undefined
                              }
                              title={`${item.type === 'subtask' ? `Subtask of "${item.parentTask.title}": ` : ''}${item.title}`}
                            >
                              {item.type === 'subtask' && (
                                <CornerDownRight className="w-2.5 h-2.5 shrink-0 opacity-85" />
                              )}
                              <span className="truncate font-bold">{item.title}</span>
                            </div>
                          ))}

                          {/* "+N more" count (adapts between sm-lg showing 2 chips and xl showing 3 chips) */}
                          {items.length > 2 && (
                            <div className={`text-[9px] font-extrabold text-pink-600 px-1 mt-auto ${items.length === 3 ? 'xl:hidden' : ''}`}>
                              <span className="xl:hidden">+{items.length - 2} more</span>
                              {items.length > 3 && (
                                <span className="hidden xl:inline">+{items.length - 3} more</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Clear Semantic Legend (Desktop/iPad) */}
              <div className="hidden sm:flex items-center justify-between gap-3 mt-3 px-3 py-1.5 rounded-xl bg-white/95 border border-purple-200/90 shadow-2xs text-[11px] text-purple-950/80 font-semibold">
                <div className="flex items-center gap-3.5 flex-wrap">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200 inline-block" />
                    Overdue
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-200 inline-block" />
                    Due Today
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                    Upcoming
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    All Done
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded border border-dashed border-purple-500 bg-purple-100 inline-flex items-center justify-center">
                      <CornerDownRight className="w-2.5 h-2.5 text-purple-700" />
                    </span>
                    Subtask
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-100/90 border border-purple-300/80 text-purple-800 font-bold">
                  {periodSummary.busyDays} active day{periodSummary.busyDays === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            {/* Right Sidebar (lg+) / Bottom Panel (< lg): Selected Day Inspector */}
            <div className="w-full lg:w-80 xl:w-96 border-t-2 lg:border-t-0 lg:border-l-2 border-purple-300/75 bg-white flex flex-col lg:min-h-0 lg:overflow-hidden shrink-0">
              {/* Selected Date Header */}
              <div
                className={`p-3.5 sm:p-4 border-b flex items-center justify-between gap-2 shrink-0 ${selectedDateKey === todayKey && selectedDayItems.some((i) => !i.isCompleted)
                    ? 'bg-gradient-to-r from-amber-100/90 via-amber-50 to-amber-100/60 border-amber-300/80'
                    : selectedDateKey < todayKey && selectedDayItems.some((i) => !i.isCompleted)
                      ? 'bg-gradient-to-r from-rose-100/85 to-pink-100/70 border-rose-300/80'
                      : selectedDayItems.length > 0 && selectedDayItems.every((i) => i.isCompleted)
                        ? 'bg-gradient-to-r from-emerald-100/80 via-emerald-50 to-teal-50/80 border-emerald-300/80'
                        : 'bg-gradient-to-r from-purple-100/90 via-indigo-50/90 to-pink-100/75 border-purple-200/95'
                  }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-extrabold text-gray-900 truncate">
                      {format(selectedDate, 'EEE, d MMM yyyy')}
                    </h3>
                    {selectedDateStatus && (
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${selectedDateStatus.type === 'today'
                            ? 'bg-amber-400 text-purple-950 border-amber-500'
                            : selectedDateStatus.type === 'overdue'
                              ? 'bg-rose-100 text-rose-700 border-rose-300'
                              : 'bg-indigo-100 text-indigo-800 border-indigo-300'
                          }`}
                      >
                        {selectedDateStatus.type === 'overdue'
                          ? `${Math.abs(selectedDateStatus.diffDays)}d ago`
                          : selectedDateStatus.text}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-600 font-semibold mt-0.5">
                    {selectedDayItems.length === 0
                      ? 'No deadlines scheduled'
                      : `${selectedDayItems.filter((i) => !i.isCompleted).length} pending · ${selectedDayItems.filter((i) => i.isCompleted).length
                      } completed`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onAddTaskForDate(selectedDateKey)}
                  className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs font-bold shadow-sm transition shrink-0"
                  title={`Add task due ${format(selectedDate, 'd MMM yyyy')}`}
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add</span>
                </button>
              </div>

              {/* Selected Day Task List */}
              <div className="flex-1 lg:overflow-y-auto p-3 sm:p-4 space-y-2.5">
                {selectedDayItems.length === 0 ? (
                  <div className="py-6 sm:py-8 px-4 text-center rounded-2xl border-2 border-dashed border-emerald-300/80 bg-gradient-to-br from-emerald-50/55 via-white to-teal-50/55 shadow-2xs">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-sm flex items-center justify-center mx-auto mb-2.5">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <p className="text-xs sm:text-sm font-extrabold text-emerald-950">Clear schedule!</p>
                    <p className="text-[11px] sm:text-xs text-emerald-700/80 font-medium mt-0.5 mb-3">
                      No tasks or subtasks due on {format(selectedDate, 'd MMM')}.
                    </p>
                    <button
                      type="button"
                      onClick={() => onAddTaskForDate(selectedDateKey)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-bold shadow-2xs transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Schedule a task</span>
                    </button>
                  </div>
                ) : (
                  selectedDayItems.map((item) => {
                    const isUpdating = togglingTaskId === item.parentTask.id;
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-2xl border transition shadow-xs ${item.isCompleted
                            ? 'bg-emerald-50/75 border-emerald-200/95'
                            : 'bg-white border-purple-200 hover:border-purple-400'
                          }`}
                        style={{
                          borderLeftWidth: '4px',
                          borderLeftColor: item.isCompleted ? '#10b981' : item.categoryColor,
                        }}
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Checkbox */}
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={item.isCompleted}
                            disabled={isUpdating}
                            onClick={() => handleToggleItem(item)}
                            className={`mt-0.5 h-4.5 w-4.5 sm:h-5 sm:w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition ${item.isCompleted
                                ? 'bg-gradient-to-br from-emerald-400 to-teal-500 border-transparent text-white shadow-2xs'
                                : 'bg-purple-50/80 border-purple-400 text-transparent hover:border-purple-600'
                              } ${isUpdating ? 'opacity-50' : ''}`}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </button>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="min-w-0">
                                {item.type === 'subtask' && (
                                  <div className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 mb-0.5">
                                    <CornerDownRight className="w-3 h-3 shrink-0" />
                                    <span className="truncate max-w-[180px]" title={item.parentTask.title}>
                                      {item.parentTask.title}
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5">
                                  {item.isStarred && item.type === 'task' && (
                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0" />
                                  )}
                                  <span
                                    className={`text-xs sm:text-sm font-semibold break-words leading-snug ${item.isCompleted ? 'line-through text-slate-600' : 'text-gray-900'
                                      }`}
                                  >
                                    {item.title}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => onEditTask(item.parentTask)}
                                className="h-6 w-6 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center shrink-0 transition"
                                title="Edit task"
                                aria-label={`Edit ${item.parentTask.title}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {item.type === 'task' && item.parentTask.description && (
                              <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-snug">
                                {item.parentTask.description}
                              </p>
                            )}

                            {/* Badges row */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              <span
                                className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-md border"
                                style={{
                                  backgroundColor: hexToRgba(item.categoryColor, 0.28),
                                  color: item.categoryTextColor,
                                  borderColor: hexToRgba(item.categoryColor, 0.6),
                                }}
                              >
                                {item.categoryName}
                              </span>

                              {item.type === 'subtask' && (
                                <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/80">
                                  Subtask
                                </span>
                              )}

                              {item.type === 'task' &&
                                item.parentTask.subtasks &&
                                item.parentTask.subtasks.length > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/80">
                                    <CheckCircle2 className="w-3 h-3" />
                                    {item.parentTask.subtasks.filter((s) => s.isCompleted).length}/
                                    {item.parentTask.subtasks.length}
                                  </span>
                                )}

                              {item.type === 'task' && item.parentTask.linkChip?.url && (
                                <TaskSmartChip chip={item.parentTask.linkChip} />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Nearby Deadlines Quick Comparison Strip */}
                {nearbyDeadlineDays.length > 0 && (
                  <div className="pt-3 mt-2 border-t border-purple-200">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-purple-900/60 mb-2">
                      Nearby Deadlines (±7 days)
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {nearbyDeadlineDays.map((nd) => {
                        const isOverdueNear = nd.dateKey < todayKey && nd.pendingCount > 0;
                        const isTodayNear = nd.dateKey === todayKey;
                        return (
                          <button
                            key={nd.dateKey}
                            type="button"
                            onClick={() => handleSelectDay(nd.date)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border shadow-2xs transition hover:scale-[1.02] ${isOverdueNear
                                ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                                : isTodayNear
                                  ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                  : nd.pendingCount > 0
                                    ? 'bg-purple-50/75 text-purple-900 border-purple-300 hover:bg-purple-100'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              }`}
                          >
                            <span>{format(nd.date, 'EEE d MMM')}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${isOverdueNear
                                  ? 'bg-rose-200/70 text-rose-800'
                                  : isTodayNear
                                    ? 'bg-amber-200/70 text-amber-900'
                                    : nd.pendingCount > 0
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-emerald-200/70 text-emerald-800'
                                }`}
                            >
                              {nd.pendingCount > 0 ? nd.pendingCount : `✓${nd.totalCount}`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* WEEK COMPARISON VIEW */
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[#ece6f5] bg-gradient-to-br from-[#ece5f6] via-[#efeaf6] to-[#e6ecf8]">
            {/* Mobile (< md): 7-Day Jump Strip + Vertical Day-by-Day Timeline */}
            <div className="flex md:hidden flex-col flex-1 min-h-0">
              {/* Top Sticky 7-Day Mini Strip */}
              <div className="grid grid-cols-7 gap-1 px-2.5 py-2 bg-white border-b-2 border-purple-200 shrink-0">
                {weekDays.map((day) => {
                  const dateKey = formatToDateString(day);
                  const items = itemsByDate.get(dateKey) || [];
                  const pendingCount = items.filter((i) => !i.isCompleted).length;
                  const isToday = dateKey === todayKey;
                  const isSelected = dateKey === selectedDateKey;
                  const hasOverdue = dateKey < todayKey && pendingCount > 0;
                  const dayStyle = WEEKDAY_STYLES[day.getDay()];

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      onClick={() => {
                        setSelectedDate(day);
                        mobileDaySectionRefs.current[dateKey]?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'start',
                        });
                      }}
                      className={`flex flex-col items-center py-1.5 px-1 rounded-xl border transition ${isSelected
                          ? 'bg-gradient-to-br from-purple-600 to-pink-500 text-white border-purple-600 shadow-xs'
                          : isToday
                            ? 'bg-amber-100 text-purple-950 border-amber-400'
                            : dayStyle.strip
                        }`}
                    >
                      <span className={`text-[9px] font-extrabold uppercase ${isSelected ? 'text-pink-100' : isToday ? 'text-amber-800' : dayStyle.label}`}>
                        {format(day, 'EEE')}
                      </span>
                      <span className="text-xs font-extrabold mt-0.5">{format(day, 'd')}</span>
                      <span
                        className={`mt-1 h-1.5 w-1.5 rounded-full ${pendingCount > 0
                            ? isSelected
                              ? 'bg-amber-300'
                              : hasOverdue
                                ? 'bg-rose-500'
                                : isToday
                                  ? 'bg-amber-500'
                                  : 'bg-purple-500'
                            : items.length > 0
                              ? 'bg-emerald-500'
                              : 'bg-transparent'
                          }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Vertical Chronological Comparison Cards for the 7 Days */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {weekDays.map((day) => {
                  const dateKey = formatToDateString(day);
                  const items = itemsByDate.get(dateKey) || [];
                  const pendingCount = items.filter((i) => !i.isCompleted).length;
                  const completedCount = items.length - pendingCount;
                  const isToday = dateKey === todayKey;
                  const hasOverdue = dateKey < todayKey && pendingCount > 0;
                  const hasDueToday = isToday && pendingCount > 0;
                  const isAllDoneDay = pendingCount === 0 && completedCount > 0;
                  const dayStyle = WEEKDAY_STYLES[day.getDay()];

                  return (
                    <div
                      key={dateKey}
                      ref={(el) => {
                        mobileDaySectionRefs.current[dateKey] = el;
                      }}
                      className={`rounded-2xl border overflow-hidden transition ${hasOverdue
                          ? 'bg-white border-2 border-rose-400 shadow-[0_0_0_2px_rgba(244,63,94,0.16),0_4px_12px_rgba(244,63,94,0.16)]'
                          : hasDueToday
                            ? 'bg-white border-2 border-amber-400 shadow-[0_0_0_2px_rgba(251,191,36,0.18),0_4px_12px_rgba(245,158,11,0.16)]'
                            : isAllDoneDay
                              ? 'bg-white border-emerald-300 shadow-xs'
                              : isToday
                                ? 'bg-white border-2 border-purple-400 shadow-sm'
                                : 'bg-white border-purple-200/90 shadow-xs'
                        }`}
                    >
                      <div
                        className={`px-3 py-2 flex items-center justify-between gap-2 ${isToday
                            ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white'
                            : hasOverdue
                              ? 'bg-rose-100/90'
                              : isAllDoneDay
                                ? 'bg-emerald-100/75'
                                : dayStyle.softHeader
                          } ${items.length > 0 ? 'border-b border-purple-200/80' : ''}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`text-xs font-extrabold ${isToday ? 'text-white' : hasOverdue ? 'text-rose-900' : isAllDoneDay ? 'text-emerald-900' : 'text-gray-900'
                              }`}
                          >
                            {format(day, 'EEEE, d MMM')}
                          </span>
                          {isToday && (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-400 text-purple-950">
                              Today
                            </span>
                          )}
                          {pendingCount > 0 && (
                            <span
                              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold border ${isToday
                                  ? 'bg-amber-400 text-purple-950 border-amber-300'
                                  : hasOverdue
                                    ? 'bg-rose-500 text-white border-rose-600'
                                    : 'bg-purple-100 text-purple-800 border-purple-300'
                                }`}
                            >
                              {pendingCount} pending
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => onAddTaskForDate(dateKey)}
                          className={`h-6 w-6 rounded-lg border flex items-center justify-center shrink-0 transition ${isToday
                              ? 'bg-white/20 hover:bg-white/30 text-white border-white/30'
                              : 'bg-white hover:bg-purple-100 text-purple-700 border-purple-300'
                            }`}
                          title={`Add task for ${format(day, 'd MMM')}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {items.length > 0 && (
                        <div className="p-2.5 space-y-2 bg-purple-50/20">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className={`flex items-start gap-2 p-2.5 rounded-xl border shadow-2xs ${item.isCompleted
                                  ? 'bg-emerald-50/60 border-emerald-200/80 opacity-80'
                                  : 'bg-white border-purple-200'
                                }`}
                              style={
                                !item.isCompleted
                                  ? {
                                    backgroundColor: hexToRgba(item.categoryColor, 0.1),
                                    borderColor: hexToRgba(item.categoryColor, 0.5),
                                    borderLeftWidth: '3.5px',
                                    borderLeftColor: item.categoryColor,
                                  }
                                  : undefined
                              }
                            >
                              <button
                                type="button"
                                role="checkbox"
                                aria-checked={item.isCompleted}
                                onClick={() => handleToggleItem(item)}
                                className={`mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition ${item.isCompleted
                                    ? 'bg-gradient-to-br from-emerald-400 to-teal-500 border-transparent text-white'
                                    : 'bg-white border-purple-400 text-transparent'
                                  }`}
                              >
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </button>
                              <div className="flex-1 min-w-0">
                                {item.type === 'subtask' && (
                                  <div className="flex items-center gap-1 text-[10px] font-bold text-purple-700 truncate">
                                    <CornerDownRight className="w-2.5 h-2.5 shrink-0" />
                                    <span className="truncate">{item.parentTask.title}</span>
                                  </div>
                                )}
                                <div
                                  className={`text-xs font-semibold break-words ${item.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'
                                    }`}
                                >
                                  {item.title}
                                </div>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span
                                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded border"
                                    style={{
                                      backgroundColor: hexToRgba(item.categoryColor, 0.25),
                                      color: item.categoryTextColor,
                                      borderColor: hexToRgba(item.categoryColor, 0.6),
                                    }}
                                  >
                                    {item.categoryName}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => onEditTask(item.parentTask)}
                                className="p-1 text-gray-500 hover:text-blue-600 rounded-lg shrink-0"
                                aria-label={`Edit ${item.parentTask.title}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* iPad & Desktop (md+): 7-Column Side-by-Side Comparison Board */}
            <div className="hidden md:flex flex-1 min-h-0 overflow-x-auto p-3.5 lg:p-4">
              <div className="grid grid-cols-7 gap-2.5 min-w-[1040px] xl:min-w-0 w-full h-full">
                {weekDays.map((day) => {
                  const dateKey = formatToDateString(day);
                  const items = itemsByDate.get(dateKey) || [];
                  const pendingCount = items.filter((i) => !i.isCompleted).length;
                  const completedCount = items.length - pendingCount;
                  const isToday = dateKey === todayKey;
                  const hasOverdue = dateKey < todayKey && pendingCount > 0;
                  const hasDueToday = isToday && pendingCount > 0;
                  const isAllDoneDay = pendingCount === 0 && completedCount > 0;
                  const dayStyle = WEEKDAY_STYLES[day.getDay()];

                  return (
                    <div
                      key={dateKey}
                      className={`group/col flex flex-col min-h-0 rounded-2xl border overflow-hidden transition ${hasOverdue
                          ? 'bg-white border-2 border-rose-400 shadow-[0_0_0_2px_rgba(244,63,94,0.16),0_4px_14px_rgba(244,63,94,0.18)]'
                          : hasDueToday
                            ? 'bg-white border-2 border-amber-400 shadow-[0_0_0_2px_rgba(251,191,36,0.2),0_4px_14px_rgba(245,158,11,0.18)]'
                            : isAllDoneDay
                              ? 'bg-white border-emerald-300 shadow-xs'
                              : isToday
                                ? 'bg-white border-2 border-purple-400 shadow-sm'
                                : 'bg-white border-purple-200/90 shadow-xs'
                        }`}
                    >
                      {/* Column Day Header */}
                      <div
                        className={`p-2.5 border-b shrink-0 ${isToday
                            ? 'bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-500 text-white border-pink-400'
                            : hasOverdue
                              ? 'bg-rose-100/90 border-rose-200'
                              : isAllDoneDay
                                ? 'bg-emerald-100/75 border-emerald-200'
                                : dayStyle.softHeader
                          }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`text-[11px] font-extrabold uppercase tracking-wider ${isToday
                                ? 'text-amber-300'
                                : hasOverdue
                                  ? 'text-rose-700'
                                  : dayStyle.label
                              }`}
                          >
                            {format(day, 'EEE')}
                          </span>
                          <button
                            type="button"
                            onClick={() => onAddTaskForDate(dateKey)}
                            className={`h-5 w-5 rounded-md border flex items-center justify-center opacity-80 group-hover/col:opacity-100 transition ${isToday
                                ? 'bg-white/20 hover:bg-white/35 text-white border-white/30'
                                : 'bg-white hover:bg-purple-600 hover:text-white text-purple-700 border-purple-300'
                              }`}
                            title={`Add task on ${format(day, 'd MMM yyyy')}`}
                          >
                            <Plus className="w-3 h-3 stroke-[2.5]" />
                          </button>
                        </div>

                        <div className="flex items-baseline justify-between mt-0.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center justify-center text-base font-black ${isToday ? 'text-white' : 'text-gray-900'
                                }`}
                            >
                              {format(day, 'd')}
                            </span>
                            <span className={`text-[11px] font-semibold ${isToday ? 'text-pink-100' : 'text-gray-500'}`}>
                              {format(day, 'MMM')}
                            </span>
                          </div>

                          {pendingCount > 0 ? (
                            <span
                              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold border ${isToday
                                  ? 'bg-amber-400 text-purple-950 border-amber-300'
                                  : hasOverdue
                                    ? 'bg-rose-500 text-white border-rose-600'
                                    : 'bg-purple-100 text-purple-800 border-purple-300'
                                }`}
                            >
                              {pendingCount}
                            </span>
                          ) : completedCount > 0 ? (
                            <span
                              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold border ${isToday
                                  ? 'bg-emerald-400 text-emerald-950 border-emerald-300'
                                  : 'bg-emerald-500 text-white border-emerald-600'
                                }`}
                            >
                              ✓{completedCount}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Column Scrollable Deadlines Stack */}
                      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2 bg-purple-50/20">
                        {items.length === 0 ? (
                          <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-center px-2 opacity-60">
                            <span className="text-xs font-medium text-gray-400">No deadlines</span>
                          </div>
                        ) : (
                          items.map((item) => {
                            const isUpdating = togglingTaskId === item.parentTask.id;
                            return (
                              <div
                                key={item.id}
                                className={`group/card p-2 rounded-xl border transition shadow-2xs ${item.isCompleted
                                    ? 'bg-emerald-50/60 border-emerald-200/80 opacity-75'
                                    : item.type === 'subtask'
                                      ? 'border-dashed hover:brightness-[0.98]'
                                      : 'hover:brightness-[0.98]'
                                  }`}
                                style={
                                  !item.isCompleted
                                    ? {
                                      backgroundColor: hexToRgba(item.categoryColor, item.type === 'subtask' ? 0.14 : 0.18),
                                      borderColor: hexToRgba(item.categoryColor, 0.55),
                                      borderLeftWidth: '3.5px',
                                      borderLeftColor: item.categoryColor,
                                    }
                                    : undefined
                                }
                              >
                                <div className="flex items-start gap-1.5">
                                  <button
                                    type="button"
                                    role="checkbox"
                                    aria-checked={item.isCompleted}
                                    disabled={isUpdating}
                                    onClick={() => handleToggleItem(item)}
                                    className={`mt-0.5 h-3.5 w-3.5 rounded border-2 flex items-center justify-center shrink-0 transition ${item.isCompleted
                                        ? 'bg-gradient-to-br from-emerald-400 to-teal-500 border-transparent text-white'
                                        : 'bg-white border-purple-400 text-transparent hover:border-purple-600'
                                      }`}
                                  >
                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  </button>

                                  <div
                                    className="flex-1 min-w-0 cursor-pointer"
                                    onClick={() => onEditTask(item.parentTask)}
                                    title="Click to edit task"
                                  >
                                    {item.type === 'subtask' && (
                                      <div className="flex items-center gap-0.5 text-[9px] font-bold text-purple-600 truncate mb-0.5">
                                        <CornerDownRight className="w-2.5 h-2.5 shrink-0" />
                                        <span className="truncate">{item.parentTask.title}</span>
                                      </div>
                                    )}
                                    <div
                                      className={`text-[11px] font-semibold break-words leading-snug ${item.isCompleted ? 'line-through text-slate-600' : 'text-gray-900'
                                        }`}
                                    >
                                      {item.isStarred && item.type === 'task' && (
                                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500 inline mr-1 -mt-0.5" />
                                      )}
                                      {item.title}
                                    </div>
                                    <div className="flex items-center justify-between gap-1 mt-1.5">
                                      <span
                                        className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.2 rounded border truncate max-w-[100px]"
                                        style={{
                                          backgroundColor: hexToRgba(item.categoryColor, 0.25),
                                          color: item.categoryTextColor,
                                          borderColor: hexToRgba(item.categoryColor, 0.55),
                                        }}
                                      >
                                        {item.categoryName}
                                      </span>
                                      <Pencil className="w-3 h-3 text-gray-400 opacity-0 group-hover/card:opacity-100 transition shrink-0" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default TaskCalendarModal;
