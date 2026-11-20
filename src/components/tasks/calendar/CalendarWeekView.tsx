import React, { useRef } from 'react';
import { format } from 'date-fns';
import { Check, CornerDownRight, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { Task } from '@/types';
import { WEEKDAY_STYLES } from '@/constants/calendar';
import { formatToDateString } from '@/utils/dateUtils';
import { hexToRgba } from '@/utils/colorUtils';
import { CalendarDeadlineItem } from './calendarTypes';

interface CalendarWeekViewProps {
  weekDays: Date[];
  todayKey: string;
  selectedDateKey: string;
  itemsByDate: Map<string, CalendarDeadlineItem[]>;
  togglingTaskId: string | null;
  draggingItemId?: string | null;
  highlightedDropDateKey?: string | null;
  isPendingDropTarget?: boolean;
  onSelectDate: (day: Date) => void;
  onToggleItem: (item: CalendarDeadlineItem) => void;
  onEditTask: (task: Task) => void;
  onRequestDeleteItem: (item: CalendarDeadlineItem) => void;
  onAddTaskForDate: (dateStr: string) => void;
  onStartItemDrag?: (item: CalendarDeadlineItem, e: React.PointerEvent) => void;
  shouldSuppressClick?: () => boolean;
}

export const CalendarWeekView: React.FC<CalendarWeekViewProps> = ({
  weekDays,
  todayKey,
  selectedDateKey,
  itemsByDate,
  togglingTaskId,
  draggingItemId = null,
  highlightedDropDateKey = null,
  isPendingDropTarget = false,
  onSelectDate,
  onToggleItem,
  onEditTask,
  onRequestDeleteItem,
  onAddTaskForDate,
  onStartItemDrag,
  shouldSuppressClick,
}) => {
  const mobileDaySectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  return (
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
                  onSelectDate(day);
                  mobileDaySectionRefs.current[dateKey]?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  });
                }}
                className={`flex flex-col items-center py-1.5 px-1 rounded-xl border transition ${
                  isSelected
                    ? 'bg-gradient-to-br from-purple-600 to-pink-500 text-white border-purple-600 shadow-xs'
                    : isToday
                    ? 'bg-amber-100 text-purple-950 border-amber-400'
                    : dayStyle.strip
                }`}
              >
                <span
                  className={`text-[9px] font-extrabold uppercase ${
                    isSelected ? 'text-pink-100' : isToday ? 'text-amber-800' : dayStyle.label
                  }`}
                >
                  {format(day, 'EEE')}
                </span>
                <span className="text-xs font-extrabold mt-0.5">{format(day, 'd')}</span>
                <span
                  className={`mt-1 h-1.5 w-1.5 rounded-full ${
                    pendingCount > 0
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
            const isDropTarget = highlightedDropDateKey === dateKey;

            return (
              <div
                key={dateKey}
                data-calendar-drop-date={dateKey}
                ref={(el) => {
                  mobileDaySectionRefs.current[dateKey] = el;
                }}
                className={`rounded-2xl border overflow-hidden transition ${
                  isDropTarget
                    ? 'bg-pink-50/70 border-2 border-pink-500 ring-2 ring-pink-300/90 shadow-md'
                    : hasOverdue
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
                  className={`px-3 py-2 flex items-center justify-between gap-2 ${
                    isToday
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
                      className={`text-xs font-extrabold ${
                        isToday
                          ? 'text-white'
                          : hasOverdue
                          ? 'text-rose-900'
                          : isAllDoneDay
                          ? 'text-emerald-900'
                          : 'text-gray-900'
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
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          isToday
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
                    className={`h-6 w-6 rounded-lg border flex items-center justify-center shrink-0 transition ${
                      isToday
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
                        onPointerDown={(e) => onStartItemDrag?.(item, e)}
                        className={`flex items-start gap-2 p-2.5 rounded-xl border shadow-2xs select-none cursor-grab active:cursor-grabbing transition ${
                          draggingItemId === item.id ? 'opacity-40 scale-[0.98] border-dashed' : ''
                        } ${
                          item.isCompleted
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
                          onClick={() => onToggleItem(item)}
                          className={`mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition ${
                            item.isCompleted
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
                            className={`text-xs font-semibold break-words ${
                              item.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'
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
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onEditTask(item.parentTask)}
                            className="p-1 text-gray-500 hover:text-blue-600 rounded-lg shrink-0"
                            aria-label={`Edit ${item.parentTask.title}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRequestDeleteItem(item)}
                            className="p-1 text-gray-400 hover:text-rose-600 rounded-lg shrink-0"
                            title={item.type === 'subtask' ? 'Delete subtask' : 'Delete task'}
                            aria-label={`Delete ${item.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
            const isDropTarget = highlightedDropDateKey === dateKey;

            return (
              <div
                key={dateKey}
                data-calendar-drop-date={dateKey}
                className={`group/col relative flex flex-col min-h-0 rounded-2xl border overflow-hidden transition ${
                  isDropTarget
                    ? 'bg-pink-50/75 border-2 border-pink-500 ring-2 ring-pink-300/90 shadow-[0_0_0_3px_rgba(236,72,153,0.18),0_8px_20px_rgba(147,51,234,0.16)]'
                    : hasOverdue
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
                  className={`p-2.5 border-b shrink-0 ${
                    isToday
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
                      className={`text-[11px] font-extrabold uppercase tracking-wider ${
                        isToday
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
                      className={`h-5 w-5 rounded-md border flex items-center justify-center opacity-80 group-hover/col:opacity-100 transition ${
                        isToday
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
                        className={`inline-flex items-center justify-center text-base font-black ${
                          isToday ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        {format(day, 'd')}
                      </span>
                      <span
                        className={`text-[11px] font-semibold ${
                          isToday ? 'text-pink-100' : 'text-gray-500'
                        }`}
                      >
                        {format(day, 'MMM')}
                      </span>
                    </div>

                    {pendingCount > 0 ? (
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          isToday
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
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          isToday
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
                      const isBeingDragged = draggingItemId === item.id;
                      return (
                        <div
                          key={item.id}
                          onPointerDown={(e) => onStartItemDrag?.(item, e)}
                          className={`group/card p-2 rounded-xl border transition shadow-2xs select-none cursor-grab active:cursor-grabbing ${
                            isBeingDragged ? 'opacity-35 scale-[0.97] border-dashed' : ''
                          } ${
                            item.isCompleted
                              ? 'bg-emerald-50/60 border-emerald-200/80 opacity-75'
                              : item.type === 'subtask'
                              ? 'border-dashed hover:brightness-[0.98]'
                              : 'hover:brightness-[0.98]'
                          }`}
                          style={
                            !item.isCompleted
                              ? {
                                  backgroundColor: hexToRgba(
                                    item.categoryColor,
                                    item.type === 'subtask' ? 0.14 : 0.18
                                  ),
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
                              onClick={() => onToggleItem(item)}
                              className={`mt-0.5 h-3.5 w-3.5 rounded border-2 flex items-center justify-center shrink-0 transition ${
                                item.isCompleted
                                  ? 'bg-gradient-to-br from-emerald-400 to-teal-500 border-transparent text-white'
                                  : 'bg-white border-purple-400 text-transparent hover:border-purple-600'
                              }`}
                            >
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </button>

                            <div
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => {
                                if (shouldSuppressClick?.()) return;
                                onEditTask(item.parentTask);
                              }}
                              title="Click to edit, or hold & drag to another day"
                            >
                              {item.type === 'subtask' && (
                                <div className="flex items-center gap-0.5 text-[9px] font-bold text-purple-600 truncate mb-0.5">
                                  <CornerDownRight className="w-2.5 h-2.5 shrink-0" />
                                  <span className="truncate">{item.parentTask.title}</span>
                                </div>
                              )}
                              <div
                                className={`text-[11px] font-semibold break-words leading-snug ${
                                  item.isCompleted ? 'line-through text-slate-600' : 'text-gray-900'
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
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <Pencil className="w-3 h-3 text-gray-400 group-hover/card:text-blue-600 transition" />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onRequestDeleteItem(item);
                                    }}
                                    className="p-0.5 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50/90 transition"
                                    title={item.type === 'subtask' ? 'Delete subtask' : 'Delete task'}
                                    aria-label={`Delete ${item.title}`}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {isDropTarget && (
                  <div className="pointer-events-none absolute inset-x-2 bottom-2 flex justify-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-md">
                      {isPendingDropTarget ? 'Move / Copy' : 'Drop here'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
