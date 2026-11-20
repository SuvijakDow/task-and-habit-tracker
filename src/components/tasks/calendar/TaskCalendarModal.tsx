import React, { useEffect, useMemo, useState } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Columns3,
  Eye,
  EyeOff,
  Layers,
  LayoutGrid,
  X,
} from 'lucide-react';
import { Category, Task } from '@/types';
import { formatToDateString, toLocalDate } from '@/utils/dateUtils';
import { buildCategoryMap, resolveCategoryDisplay } from '@/utils/categoryUtils';
import { CalendarDeadlineItem, NearbyDeadlineDay } from './calendarTypes';
import { CalendarMonthView } from './CalendarMonthView';
import { CalendarDayInspector } from './CalendarDayInspector';
import { CalendarWeekView } from './CalendarWeekView';

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

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

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
  const categoryMap = useMemo(() => buildCategoryMap(categories), [categories]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarDeadlineItem[]>();

    const pushItem = (item: CalendarDeadlineItem) => {
      if (hideCompleted && item.isCompleted) return;
      const existing = map.get(item.dateKey);
      if (existing) existing.push(item);
      else map.set(item.dateKey, [item]);
    };

    for (const task of scopedTasks) {
      const catMeta = resolveCategoryDisplay(categoryMap.get(task.category), task.category);

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

    map.forEach((items) => {
      items.sort((a, b) => {
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
        if (a.isStarred !== b.isStarred) return a.isStarred ? -1 : 1;
        if (a.type !== b.type) return a.type === 'task' ? -1 : 1;
        return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
      });
    });

    return map;
  }, [scopedTasks, categoryMap, hideCompleted]);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(anchorDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(anchorDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [anchorDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchorDate, { weekStartsOn: 0 });
    const end = endOfWeek(anchorDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [anchorDate]);

  const periodSummary = useMemo(() => {
    const daysToCount =
      viewMode === 'month' ? monthDays.filter((d) => isSameMonth(d, anchorDate)) : weekDays;

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

  const nearbyDeadlineDays = useMemo<NearbyDeadlineDay[]>(() => {
    const results: NearbyDeadlineDay[] = [];
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
      setAnchorDate(subMonths(anchorDate, 1));
    } else {
      const next = subWeeks(anchorDate, 1);
      setAnchorDate(next);
      setSelectedDate(next);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setAnchorDate(addMonths(anchorDate, 1));
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
                      <span className="text-emerald-300 font-semibold">
                        · {periodSummary.completed} done
                      </span>
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
                className={`h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl text-xs font-bold border transition shadow-xs ${
                  isViewingCurrentPeriod && isSameDay(selectedDate, today)
                    ? 'bg-amber-400 text-purple-950 border-amber-300'
                    : 'bg-white/15 text-white border-white/25 hover:bg-white/25'
                }`}
              >
                Today
              </button>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setHideCompleted((prev) => !prev)}
                className={`h-8 sm:h-9 px-2.5 rounded-xl text-[11px] sm:text-xs font-semibold border inline-flex items-center gap-1.5 transition shadow-xs ${
                  hideCompleted
                    ? 'bg-pink-500 text-white border-pink-400'
                    : 'bg-white/15 text-purple-100 border-white/25 hover:bg-white/25 hover:text-white'
                }`}
                title={hideCompleted ? 'Showing pending only' : 'Showing all tasks (including completed)'}
              >
                {hideCompleted ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5 text-pink-200" />
                )}
                <span>{hideCompleted ? 'Pending only' : 'All status'}</span>
              </button>

              {hasMultiplePresets && (
                <button
                  type="button"
                  onClick={() => setScopeAllPresets((prev) => !prev)}
                  className={`h-8 sm:h-9 px-2.5 rounded-xl text-[11px] sm:text-xs font-semibold border inline-flex items-center gap-1.5 transition shadow-xs ${
                    scopeAllPresets
                      ? 'bg-pink-500 text-white border-pink-400'
                      : 'bg-white/15 text-purple-100 border-white/25 hover:bg-white/25 hover:text-white'
                  }`}
                  title="Switch between current period and all periods"
                >
                  <Layers className={`w-3.5 h-3.5 ${scopeAllPresets ? 'text-white' : 'text-amber-200'}`} />
                  <span className="hidden xs:inline">
                    {scopeAllPresets ? 'All Periods' : 'This Period'}
                  </span>
                  <span className="xs:hidden">{scopeAllPresets ? 'All' : 'Period'}</span>
                </button>
              )}

              <div className="inline-flex items-center bg-black/20 rounded-xl border border-white/20 p-0.5 shadow-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('month')}
                  className={`h-7 sm:h-8 px-2.5 sm:px-3 rounded-lg text-[11px] sm:text-xs font-bold inline-flex items-center gap-1.5 transition ${
                    viewMode === 'month'
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
                  className={`h-7 sm:h-8 px-2.5 sm:px-3 rounded-lg text-[11px] sm:text-xs font-bold inline-flex items-center gap-1.5 transition ${
                    viewMode === 'week'
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
            <CalendarMonthView
              monthDays={monthDays}
              anchorDate={anchorDate}
              todayKey={todayKey}
              selectedDateKey={selectedDateKey}
              itemsByDate={itemsByDate}
              busyDaysCount={periodSummary.busyDays}
              onSelectDay={handleSelectDay}
            />
            <CalendarDayInspector
              selectedDate={selectedDate}
              selectedDateKey={selectedDateKey}
              todayKey={todayKey}
              selectedDayItems={selectedDayItems}
              nearbyDeadlineDays={nearbyDeadlineDays}
              togglingTaskId={togglingTaskId}
              onSelectDay={handleSelectDay}
              onToggleItem={handleToggleItem}
              onEditTask={onEditTask}
              onAddTaskForDate={onAddTaskForDate}
            />
          </div>
        ) : (
          <CalendarWeekView
            weekDays={weekDays}
            todayKey={todayKey}
            selectedDateKey={selectedDateKey}
            itemsByDate={itemsByDate}
            togglingTaskId={togglingTaskId}
            onSelectDate={setSelectedDate}
            onToggleItem={handleToggleItem}
            onEditTask={onEditTask}
            onAddTaskForDate={onAddTaskForDate}
          />
        )}
      </div>
    </div>,
    document.body
  );
};

export default TaskCalendarModal;
