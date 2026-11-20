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
  ChevronDown,
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
import { useCalendarDrag } from './useCalendarDrag';
import { CalendarDragGhost, CalendarDropActionPopover } from './CalendarDragOverlay';
import { CalendarMonthYearPicker } from './CalendarMonthYearPicker';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

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
  onDeleteTask: (taskId: string) => Promise<void> | void;
  onDeleteSubtask: (taskId: string, subtaskId: string) => Promise<void> | void;
  onAddTaskForDate: (dateStr: string) => void;
  onMoveTaskDate: (taskId: string, targetDateKey: string) => void;
  onDuplicateTaskToDate: (task: Task, targetDateKey: string) => void;
  onMoveSubtaskDate: (taskId: string, subtaskId: string, targetDateKey: string) => void;
  onDuplicateSubtaskToDate: (taskId: string, subtaskId: string, targetDateKey: string) => void;
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
  onDeleteTask,
  onDeleteSubtask,
  onAddTaskForDate,
  onMoveTaskDate,
  onDuplicateTaskToDate,
  onMoveSubtaskDate,
  onDuplicateSubtaskToDate,
  togglingTaskId,
}) => {
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [hideCompleted, setHideCompleted] = useState(false);
  const [scopeAllPresets, setScopeAllPresets] = useState(false);
  const [deletingItem, setDeletingItem] = useState<CalendarDeadlineItem | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const monthPickerTriggerRef = useRef<HTMLButtonElement | null>(null);

  const {
    activeDrag,
    hoveredDateKey,
    pendingDrop,
    ghostRef,
    startItemDrag,
    dismissPendingDrop,
    shouldSuppressClick,
  } = useCalendarDrag(isOpen);

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
      setIsMonthPickerOpen(false);
      setDeletingItem(null);
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
      const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
      const hasScheduledSubtask = subtasks.some((st) => Boolean(toLocalDate(st.dueDate)));

      if (hasScheduledSubtask) {
        // Smart Adaptive: when a task schedules milestones on subtasks, hide the parent wrapper
        // to avoid double-counting; unscheduled sibling subtasks inherit the parent due date.
        for (const st of subtasks) {
          const effectiveDue = toLocalDate(st.dueDate) || taskDue;
          if (!effectiveDue) continue;
          pushItem({
            id: `${task.id}__${st.id}`,
            type: 'subtask',
            dateKey: formatToDateString(effectiveDue),
            title: st.title,
            parentTask: task,
            subtask: st,
            isCompleted: Boolean(st.isCompleted),
            isStarred: Boolean(task.isStarred),
            ...catMeta,
          });
        }
      } else if (taskDue) {
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

  const activeYearMonths = useMemo(() => {
    const set = new Set<string>();
    itemsByDate.forEach((_items, dateKey) => {
      if (dateKey.length >= 7) {
        set.add(dateKey.slice(0, 7));
      }
    });
    return set;
  }, [itemsByDate]);

  const handleSelectMonthYear = (year: number, monthIndex: number) => {
    const target =
      year === today.getFullYear() && monthIndex === today.getMonth()
        ? new Date(today)
        : new Date(year, monthIndex, 1);
    setAnchorDate(target);
    if (viewMode === 'week') {
      setSelectedDate(target);
    }
  };

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

  const handleConfirmDropMove = () => {
    if (!pendingDrop) return;
    const { item, targetDateKey } = pendingDrop;
    dismissPendingDrop();
    if (item.type === 'task') {
      onMoveTaskDate(item.parentTask.id, targetDateKey);
    } else if (item.subtask) {
      onMoveSubtaskDate(item.parentTask.id, item.subtask.id, targetDateKey);
    }
  };

  const handleConfirmDropDuplicate = () => {
    if (!pendingDrop) return;
    const { item, targetDateKey } = pendingDrop;
    dismissPendingDrop();
    if (item.type === 'task') {
      onDuplicateTaskToDate(item.parentTask, targetDateKey);
    } else if (item.subtask) {
      onDuplicateSubtaskToDate(item.parentTask.id, item.subtask.id, targetDateKey);
    }
  };

  const handleConfirmDeleteItem = async () => {
    if (!deletingItem || isDeletingItem) return;
    setIsDeletingItem(true);
    try {
      if (deletingItem.type === 'task') {
        await onDeleteTask(deletingItem.parentTask.id);
      } else if (deletingItem.subtask) {
        await onDeleteSubtask(deletingItem.parentTask.id, deletingItem.subtask.id);
      }
      setDeletingItem(null);
    } finally {
      setIsDeletingItem(false);
    }
  };

  const highlightedDropDateKey = pendingDrop
    ? pendingDrop.targetDateKey
    : activeDrag && hoveredDateKey && hoveredDateKey !== activeDrag.item.dateKey
    ? hoveredDateKey
    : null;
  const draggingItemId = activeDrag?.item.id ?? null;

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
      className="fixed inset-0 bg-slate-950/45 sm:backdrop-blur-xs flex items-end sm:items-center justify-center z-[9990] p-0 sm:p-2 md:p-3 overflow-hidden"
      onClick={() => {
        if (activeDrag || pendingDrop || deletingItem || shouldSuppressClick()) return;
        onClose();
      }}
    >
      <div
        className="modal-enter w-full sm:max-w-6xl h-dvh sm:h-[94dvh] max-h-dvh sm:max-h-[calc(100dvh-1rem)] flex flex-col bg-[#3b0764] border-0 sm:ring-1 sm:ring-purple-950/30 rounded-none sm:rounded-3xl shadow-[0_24px_60px_rgba(59,7,100,0.38)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Single-Row Desktop / Tight Mobile Header */}
        <div className="relative overflow-hidden px-3 sm:px-4 pt-[max(0.35rem,env(safe-area-inset-top))] pb-2 sm:pt-1.5 sm:pb-2 border-b border-pink-400/25 bg-gradient-to-br from-[#3b0764] via-[#581c87] to-[#701a75] text-white shrink-0">
          <div className="pointer-events-none absolute -right-12 -top-12 w-40 h-40 rounded-full bg-pink-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-12 -bottom-12 w-40 h-40 rounded-full bg-amber-400/15 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-1.5 lg:gap-2">
            {/* Title, Period Badge & Mobile Close */}
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 rounded-lg bg-white/15 border border-white/25 text-amber-300 flex items-center justify-center shadow-xs shrink-0">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                  <h2 className="text-sm sm:text-base font-black text-white tracking-tight leading-none truncate">
                    Deadline Calendar
                  </h2>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-amber-300 border border-white/20 leading-none shrink-0">
                    <span>{periodSummary.pending} pending</span>
                    {!hideCompleted && periodSummary.completed > 0 && (
                      <span className="text-emerald-300 font-semibold">
                        · {periodSummary.completed} done
                      </span>
                    )}
                  </span>
                  {!scopeAllPresets && activePresetName && (
                    <span className="hidden xl:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/20 text-purple-200 border border-white/15 leading-none max-w-[120px] truncate">
                      {activePresetName}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="lg:hidden h-7 w-7 rounded-full bg-white/15 hover:bg-white/25 text-purple-100 hover:text-white border border-white/25 transition flex items-center justify-center shrink-0 shadow-xs"
                aria-label="Close calendar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation, Quick Toggles, View Switcher & Desktop Close */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:justify-end gap-1.5">
              {/* Mobile: Full-width Date Selector + Today */}
              <div className="flex items-center gap-1.5 sm:gap-1 w-full sm:w-auto">
                <div className="flex sm:inline-flex flex-1 sm:flex-none items-center justify-between bg-white/15 rounded-lg border border-white/25 p-0.5 shadow-xs">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="h-7 w-8 sm:h-7 sm:w-7 rounded-md text-purple-100 hover:text-white hover:bg-white/20 flex items-center justify-center transition shrink-0"
                    title={viewMode === 'month' ? 'Previous month' : 'Previous week'}
                    aria-label={viewMode === 'month' ? 'Previous month' : 'Previous week'}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    ref={monthPickerTriggerRef}
                    type="button"
                    onClick={() => setIsMonthPickerOpen((prev) => !prev)}
                    className={`flex-1 sm:flex-none h-7 px-2 rounded-md text-xs font-extrabold text-white min-w-[116px] sm:min-w-[138px] inline-flex items-center justify-center gap-1 transition select-none leading-none ${
                      isMonthPickerOpen ? 'bg-white/25' : 'hover:bg-white/20'
                    }`}
                    title="Click to jump to any month or year"
                    aria-expanded={isMonthPickerOpen}
                    aria-haspopup="dialog"
                  >
                    <span className="truncate">{headerDateLabel}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-purple-200 shrink-0 transition-transform duration-150 ${
                        isMonthPickerOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="h-7 w-8 sm:h-7 sm:w-7 rounded-md text-purple-100 hover:text-white hover:bg-white/20 flex items-center justify-center transition shrink-0"
                    title={viewMode === 'month' ? 'Next month' : 'Next week'}
                    aria-label={viewMode === 'month' ? 'Next month' : 'Next week'}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleJumpToday}
                  className={`h-8 sm:h-8 px-3.5 sm:px-2.5 rounded-lg text-[11px] font-bold border transition shadow-xs shrink-0 ${
                    isViewingCurrentPeriod && isSameDay(selectedDate, today)
                      ? 'bg-amber-400 text-purple-950 border-amber-300'
                      : 'bg-white/15 text-white border-white/25 hover:bg-white/25'
                  }`}
                >
                  Today
                </button>
              </div>

              {/* Mobile: Full-width Filter & View Switcher Row */}
              <div className="flex items-center gap-1.5 sm:gap-1.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setHideCompleted((prev) => !prev)}
                  className={`flex-1 sm:flex-none h-8 px-2 rounded-lg text-[11px] font-semibold border inline-flex items-center justify-center gap-1 transition shadow-xs whitespace-nowrap ${
                    hideCompleted
                      ? 'bg-pink-500 text-white border-pink-400'
                      : 'bg-white/15 text-purple-100 border-white/25 hover:bg-white/25 hover:text-white'
                  }`}
                  title={hideCompleted ? 'Showing pending only' : 'Showing all tasks (including completed)'}
                >
                  {hideCompleted ? (
                    <EyeOff className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <Eye className="w-3.5 h-3.5 text-pink-200 shrink-0" />
                  )}
                  <span>{hideCompleted ? 'Pending' : 'All'}</span>
                </button>

                {hasMultiplePresets && (
                  <button
                    type="button"
                    onClick={() => setScopeAllPresets((prev) => !prev)}
                    className={`flex-1 sm:flex-none h-8 px-2 rounded-lg text-[11px] font-semibold border inline-flex items-center justify-center gap-1 transition shadow-xs whitespace-nowrap ${
                      scopeAllPresets
                        ? 'bg-pink-500 text-white border-pink-400'
                        : 'bg-white/15 text-purple-100 border-white/25 hover:bg-white/25 hover:text-white'
                    }`}
                    title="Switch between current period and all periods"
                  >
                    <Layers className={`w-3.5 h-3.5 shrink-0 ${scopeAllPresets ? 'text-white' : 'text-amber-200'}`} />
                    <span>{scopeAllPresets ? 'All Periods' : 'Period'}</span>
                  </button>
                )}

                <div className="flex-[1.6] sm:flex-none grid grid-cols-2 sm:inline-flex items-center bg-black/20 rounded-lg border border-white/20 p-0.5 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode('month')}
                    className={`h-7 px-2 sm:px-2.5 rounded-md text-[11px] font-bold inline-flex items-center justify-center gap-1 transition ${
                      viewMode === 'month'
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xs'
                        : 'text-purple-100 hover:bg-white/15 hover:text-white'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                    <span>Month</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAnchorDate(selectedDate);
                      setViewMode('week');
                    }}
                    className={`h-7 px-2 sm:px-2.5 rounded-md text-[11px] font-bold inline-flex items-center justify-center gap-1 transition ${
                      viewMode === 'week'
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xs'
                        : 'text-purple-100 hover:bg-white/15 hover:text-white'
                    }`}
                  >
                    <Columns3 className="w-3.5 h-3.5 shrink-0" />
                    <span>Week</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="hidden lg:flex h-8 w-8 rounded-full bg-white/15 hover:bg-white/25 text-purple-100 hover:text-white border border-white/25 transition items-center justify-center shrink-0 shadow-xs ml-0.5"
                  aria-label="Close calendar"
                >
                  <X className="w-4 h-4" />
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
              draggingItemId={draggingItemId}
              highlightedDropDateKey={highlightedDropDateKey}
              isPendingDropTarget={Boolean(pendingDrop)}
              onSelectDay={handleSelectDay}
              onStartItemDrag={startItemDrag}
              shouldSuppressClick={shouldSuppressClick}
            />
            <CalendarDayInspector
              selectedDate={selectedDate}
              selectedDateKey={selectedDateKey}
              todayKey={todayKey}
              selectedDayItems={selectedDayItems}
              nearbyDeadlineDays={nearbyDeadlineDays}
              togglingTaskId={togglingTaskId}
              draggingItemId={draggingItemId}
              onSelectDay={handleSelectDay}
              onToggleItem={handleToggleItem}
              onEditTask={onEditTask}
              onRequestDeleteItem={setDeletingItem}
              onAddTaskForDate={onAddTaskForDate}
              onStartItemDrag={startItemDrag}
            />
          </div>
        ) : (
          <CalendarWeekView
            weekDays={weekDays}
            todayKey={todayKey}
            selectedDateKey={selectedDateKey}
            itemsByDate={itemsByDate}
            togglingTaskId={togglingTaskId}
            draggingItemId={draggingItemId}
            highlightedDropDateKey={highlightedDropDateKey}
            isPendingDropTarget={Boolean(pendingDrop)}
            onSelectDate={setSelectedDate}
            onToggleItem={handleToggleItem}
            onEditTask={onEditTask}
            onRequestDeleteItem={setDeletingItem}
            onAddTaskForDate={onAddTaskForDate}
            onStartItemDrag={startItemDrag}
            shouldSuppressClick={shouldSuppressClick}
          />
        )}
      </div>

      {/* Quick Month / Year Picker Popover */}
      <CalendarMonthYearPicker
        isOpen={isMonthPickerOpen}
        anchorEl={monthPickerTriggerRef.current}
        currentDate={anchorDate}
        today={today}
        activeYearMonths={activeYearMonths}
        onSelectMonthYear={handleSelectMonthYear}
        onJumpToday={handleJumpToday}
        onClose={() => setIsMonthPickerOpen(false)}
      />

      {/* Smooth 60fps Drag Ghost & Drop Action Popover */}
      <CalendarDragGhost
        activeDrag={activeDrag}
        hoveredDateKey={hoveredDateKey}
        ghostRef={ghostRef}
      />
      <CalendarDropActionPopover
        pendingDrop={pendingDrop}
        onMove={handleConfirmDropMove}
        onDuplicate={handleConfirmDropDuplicate}
        onCancel={dismissPendingDrop}
      />
      <ConfirmDialog
        isOpen={Boolean(deletingItem)}
        title={deletingItem?.type === 'subtask' ? 'Delete Subtask?' : 'Delete Task?'}
        description={
          deletingItem?.type === 'subtask' ? (
            <>
              Remove subtask <span className="font-bold text-gray-900">"{deletingItem.title}"</span>{' '}
              from <span className="font-semibold text-purple-800">"{deletingItem.parentTask.title}"</span>?
            </>
          ) : (
            <>
              Are you sure you want to delete{' '}
              <span className="font-bold text-gray-900">"{deletingItem?.title}"</span>? This action
              cannot be undone.
            </>
          )
        }
        confirmLabel="Delete"
        loadingLabel="Deleting..."
        isLoading={isDeletingItem}
        tone="danger"
        onCancel={() => {
          if (!isDeletingItem) setDeletingItem(null);
        }}
        onConfirm={handleConfirmDeleteItem}
      />
    </div>,
    document.body
  );
};

export default TaskCalendarModal;
