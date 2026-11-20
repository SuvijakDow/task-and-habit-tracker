import React from 'react';
import { format, isSameMonth } from 'date-fns';
import { Check, CornerDownRight, GripVertical } from 'lucide-react';
import { WEEKDAY_SHORT_LABELS, WEEKDAY_STYLES } from '@/constants/calendar';
import { formatToDateString } from '@/utils/dateUtils';
import { hexToRgba } from '@/utils/colorUtils';
import { CalendarDeadlineItem } from './calendarTypes';

interface CalendarMonthViewProps {
  monthDays: Date[];
  anchorDate: Date;
  todayKey: string;
  selectedDateKey: string;
  itemsByDate: Map<string, CalendarDeadlineItem[]>;
  busyDaysCount: number;
  draggingItemId?: string | null;
  highlightedDropDateKey?: string | null;
  isPendingDropTarget?: boolean;
  onSelectDay: (day: Date) => void;
  onStartItemDrag?: (item: CalendarDeadlineItem, e: React.PointerEvent) => void;
  shouldSuppressClick?: () => boolean;
}

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
  monthDays,
  anchorDate,
  todayKey,
  selectedDateKey,
  itemsByDate,
  busyDaysCount,
  draggingItemId = null,
  highlightedDropDateKey = null,
  isPendingDropTarget = false,
  onSelectDay,
  onStartItemDrag,
  shouldSuppressClick,
}) => {
  return (
    <div className="flex-1 min-w-0 flex flex-col p-2.5 sm:p-4 lg:p-5 lg:overflow-y-auto shrink-0 lg:shrink">
      {/* Weekday Headers — Harmonious Thai Day-of-Week Colors */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
        {WEEKDAY_SHORT_LABELS.map((day, idx) => (
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
          const isDropTarget = highlightedDropDateKey === dateKey;

          let cellClasses = inCurrentMonth
            ? 'bg-white border-purple-200/95 shadow-[0_2px_5px_rgba(88,28,135,0.06)] hover:border-purple-500 hover:shadow-sm'
            : 'bg-slate-200/75 border-slate-300/80 text-slate-400 hover:border-purple-300';

          if (isDropTarget) {
            cellClasses =
              'bg-gradient-to-br from-pink-50 via-white to-purple-100/85 border-2 border-pink-500 ring-2 ring-pink-300/90 shadow-[0_0_0_3px_rgba(236,72,153,0.18),0_8px_20px_rgba(147,51,234,0.18)] scale-[1.015] z-10';
          } else if (hasOverduePending && inCurrentMonth) {
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
            cellClasses =
              'bg-gradient-to-br from-purple-50 via-white to-pink-50 border-2 border-purple-600 ring-2 ring-pink-300/80 shadow-md';
          } else if (isToday) {
            cellClasses = 'bg-white border-2 border-purple-400 shadow-sm hover:border-purple-500';
          }

          return (
            <div
              key={dateKey}
              role="button"
              tabIndex={0}
              data-calendar-drop-date={dateKey}
              onClick={() => {
                if (shouldSuppressClick?.()) return;
                onSelectDay(day);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectDay(day);
                }
              }}
              className={`group relative flex flex-col items-stretch text-left rounded-xl sm:rounded-2xl border p-1 sm:p-1.5 min-h-[54px] sm:min-h-[86px] lg:min-h-[96px] transition-all cursor-pointer overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${cellClasses}`}
            >
              {/* Day Number + Status Count Pill */}
              <div className="flex items-center justify-between gap-0.5 mb-1">
                <span
                  className={`inline-flex items-center justify-center text-[11px] sm:text-xs font-extrabold w-5 h-5 sm:w-6 sm:h-6 rounded-full transition ${
                    isDropTarget
                      ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-sm'
                      : isToday
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

                {pendingItems.length > 0 ? (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold leading-none border ${
                      hasOverduePending
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
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold leading-none bg-emerald-500 text-white border border-emerald-600 shadow-2xs ${
                      !inCurrentMonth ? 'opacity-60' : ''
                    }`}
                  >
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                    <span className="hidden sm:inline">{completedItems.length}</span>
                  </span>
                ) : null}
              </div>

              {/* Mobile (< sm): Clean colored dots */}
              {items.length > 0 && (
                <div
                  className={`flex sm:hidden flex-wrap items-center gap-0.5 mt-auto pt-0.5 ${
                    !inCurrentMonth ? 'opacity-55' : ''
                  }`}
                >
                  {items.slice(0, 4).map((item) => (
                    <span
                      key={item.id}
                      className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                        item.isCompleted ? 'opacity-45' : ''
                      }`}
                      style={{
                        backgroundColor:
                          hasOverduePending && !item.isCompleted ? '#f43f5e' : item.categoryColor,
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

              {/* Tablet & Desktop (sm+): Vibrant Category-Colored Draggable Preview Chips */}
              {items.length > 0 && (
                <div
                  className={`hidden sm:flex flex-col gap-1 w-full min-w-0 flex-1 ${
                    !inCurrentMonth ? 'opacity-60' : ''
                  }`}
                >
                  {items.slice(0, 3).map((item, idx) => {
                    const isBeingDragged = draggingItemId === item.id;
                    return (
                      <div
                        key={item.id}
                        onPointerDown={(e) => onStartItemDrag?.(item, e)}
                        className={`${
                          idx === 2 ? 'hidden xl:flex' : 'flex'
                        } items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] leading-tight truncate border select-none cursor-grab active:cursor-grabbing transition-all ${
                          isBeingDragged
                            ? 'opacity-35 scale-[0.96] border-dashed'
                            : 'hover:brightness-[0.96] hover:scale-[1.01]'
                        } ${
                          item.isCompleted
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
                        title={`${
                          item.type === 'subtask' ? `Subtask of "${item.parentTask.title}": ` : ''
                        }${item.title} — Hold & drag to move or duplicate`}
                      >
                        {item.type === 'subtask' && (
                          <CornerDownRight className="w-2.5 h-2.5 shrink-0 opacity-85" />
                        )}
                        <span className="truncate font-bold">{item.title}</span>
                      </div>
                    );
                  })}

                  {items.length > 2 && (
                    <div
                      className={`text-[9px] font-extrabold text-pink-600 px-1 mt-auto ${
                        items.length === 3 ? 'xl:hidden' : ''
                      }`}
                    >
                      <span className="xl:hidden">+{items.length - 2} more</span>
                      {items.length > 3 && (
                        <span className="hidden xl:inline">+{items.length - 3} more</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Drop Target Overlay Badge (Zero layout shift) */}
              {isDropTarget && (
                <div className="pointer-events-none absolute inset-x-1 bottom-1 flex justify-center">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-sm">
                    {isPendingDropTarget ? 'Move / Copy' : 'Drop here'}
                  </span>
                </div>
              )}
            </div>
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
          <span className="hidden xl:inline-flex items-center gap-1 text-purple-700/80 border-l border-purple-200 pl-3">
            <GripVertical className="w-3 h-3 text-purple-500" />
            Hold &amp; drag to move or copy
          </span>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-purple-100/90 border border-purple-300/80 text-purple-800 font-bold shrink-0">
          {busyDaysCount} active day{busyDaysCount === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  );
};
