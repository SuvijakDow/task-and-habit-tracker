import React from 'react';
import { format } from 'date-fns';
import { Check, CheckCircle2, CornerDownRight, GripVertical, Pencil, Plus, Sparkles, Star, Trash2 } from 'lucide-react';
import { Task } from '@/types';
import { getDeadlineStatus } from '@/utils/dateUtils';
import { hexToRgba } from '@/utils/colorUtils';
import { TaskSmartChip } from '@/components/tasks/TaskSmartChip';
import { CalendarDeadlineItem, NearbyDeadlineDay } from './calendarTypes';

interface CalendarDayInspectorProps {
  selectedDate: Date;
  selectedDateKey: string;
  todayKey: string;
  selectedDayItems: CalendarDeadlineItem[];
  nearbyDeadlineDays: NearbyDeadlineDay[];
  togglingTaskId: string | null;
  draggingItemId?: string | null;
  onSelectDay: (day: Date) => void;
  onToggleItem: (item: CalendarDeadlineItem) => void;
  onEditTask: (task: Task) => void;
  onRequestDeleteItem: (item: CalendarDeadlineItem) => void;
  onAddTaskForDate: (dateStr: string) => void;
  onStartItemDrag?: (item: CalendarDeadlineItem, e: React.PointerEvent) => void;
}

export const CalendarDayInspector: React.FC<CalendarDayInspectorProps> = ({
  selectedDate,
  selectedDateKey,
  todayKey,
  selectedDayItems,
  nearbyDeadlineDays,
  togglingTaskId,
  draggingItemId = null,
  onSelectDay,
  onToggleItem,
  onEditTask,
  onRequestDeleteItem,
  onAddTaskForDate,
  onStartItemDrag,
}) => {
  const selectedDateStatus = getDeadlineStatus(selectedDate);

  return (
    <div className="flex-1 lg:flex-none w-full lg:w-80 xl:w-96 border-t-2 lg:border-t-0 lg:border-l-2 border-purple-300/75 bg-white flex flex-col lg:min-h-0 lg:overflow-hidden shrink-0">
      {/* Selected Date Header */}
      <div
        className={`p-3.5 sm:p-4 border-b flex items-center justify-between gap-2 shrink-0 ${
          selectedDateKey === todayKey && selectedDayItems.some((i) => !i.isCompleted)
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
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                  selectedDateStatus.type === 'today'
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
              : `${selectedDayItems.filter((i) => !i.isCompleted).length} pending · ${
                  selectedDayItems.filter((i) => i.isCompleted).length
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
            const isBeingDragged = draggingItemId === item.id;
            return (
              <div
                key={item.id}
                onPointerDown={(e) => onStartItemDrag?.(item, e)}
                className={`group/insp p-3 rounded-2xl border transition shadow-xs select-none cursor-grab active:cursor-grabbing ${
                  isBeingDragged ? 'opacity-40 scale-[0.98] border-dashed' : ''
                } ${
                  item.isCompleted
                    ? 'bg-emerald-50/75 border-emerald-200/95'
                    : 'bg-white border-purple-200 hover:border-purple-400'
                }`}
                style={{
                  borderLeftWidth: '4px',
                  borderLeftColor: item.isCompleted ? '#10b981' : item.categoryColor,
                }}
                title="Hold & drag onto a calendar date to move or duplicate"
              >
                <div className="flex items-start gap-2.5">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={item.isCompleted}
                    disabled={isUpdating}
                    onClick={() => onToggleItem(item)}
                    className={`mt-0.5 h-4.5 w-4.5 sm:h-5 sm:w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition ${
                      item.isCompleted
                        ? 'bg-gradient-to-br from-emerald-400 to-teal-500 border-transparent text-white shadow-2xs'
                        : 'bg-purple-50/80 border-purple-400 text-transparent hover:border-purple-600'
                    } ${isUpdating ? 'opacity-50' : ''}`}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </button>

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
                            className={`text-xs sm:text-sm font-semibold break-words leading-snug ${
                              item.isCompleted ? 'line-through text-slate-600' : 'text-gray-900'
                            }`}
                          >
                            {item.title}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <span
                          className="hidden sm:inline-flex h-6 w-4 items-center justify-center text-purple-300 opacity-0 group-hover/insp:opacity-100 transition"
                          aria-hidden="true"
                        >
                          <GripVertical className="w-3.5 h-3.5" />
                        </span>
                        <button
                          type="button"
                          onClick={() => onEditTask(item.parentTask)}
                          className="h-6 w-6 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center shrink-0 transition"
                          title="Edit task"
                          aria-label={`Edit ${item.parentTask.title}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRequestDeleteItem(item)}
                          className="h-6 w-6 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center shrink-0 transition"
                          title={item.type === 'subtask' ? 'Delete subtask' : 'Delete task'}
                          aria-label={`Delete ${item.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {item.type === 'task' && item.parentTask.description && (
                      <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-snug">
                        {item.parentTask.description}
                      </p>
                    )}

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
                    onClick={() => onSelectDay(nd.date)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border shadow-2xs transition hover:scale-[1.02] ${
                      isOverdueNear
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
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                        isOverdueNear
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
  );
};
