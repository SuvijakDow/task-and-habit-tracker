import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { DailyHabit } from '@/types';
import { Activity, Calendar, Check, Clock, Flame, Pencil, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { getHabitColorHex, getHabitTimeSlotsForDay } from '@/services/habitService';

const formatScheduledDays = (days: number[]): string => {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (!days || days.length === 7) return 'Everyday';
  if (days.length === 0) return 'No days';
  return days.map((d) => dayNames[d]).join(', ');
};

interface Props {
  habits: DailyHabit[];
  todayDate: string;
  onToggleCompletion: (habitId: string, isCompletedToday: boolean) => void;
  onProgressChange?: (habitId: string, value: number) => void;
  onEdit: (habit: DailyHabit) => void;
  onDelete: (habitId: string) => void;
  onBulkDelete?: (habitIds: string[]) => Promise<void>;
}

export default function HabitsTable({
  habits,
  todayDate,
  onToggleCompletion,
  onProgressChange,
  onEdit,
  onDelete,
  onBulkDelete,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkRunning, setIsBulkRunning] = useState(false);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);

  const matchesFilters = (habit: DailyHabit): boolean => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const title = habit.title.toLowerCase();
    return normalizedSearch.length === 0 || title.includes(normalizedSearch);
  };

  const filteredHabits = useMemo(
    () => habits.filter(matchesFilters),
    [habits, searchQuery]
  );

  useEffect(() => {
    setSelectedIds((prev) => {
      const existing = new Set(habits.map((h) => h.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (existing.has(id)) next.add(id);
      });
      return next;
    });
  }, [habits]);

  useEffect(() => {
    if (selectedIds.size === 0) {
      setIsBulkDeleteConfirmOpen(false);
    }
  }, [selectedIds]);

  const allFilteredIds = useMemo(
    () => filteredHabits.map((h) => h.id),
    [filteredHabits]
  );

  const allFilteredSelected =
    allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.has(id));

  const toggleSelected = (habitId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(habitId)) next.delete(habitId);
      else next.add(habitId);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        allFilteredIds.forEach((id) => next.delete(id));
      } else {
        allFilteredIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const runBulkDelete = async () => {
    try {
      setIsBulkRunning(true);
      if (onBulkDelete) {
        await onBulkDelete(Array.from(selectedIds));
      }
      clearSelection();
      setIsBulkDeleteConfirmOpen(false);
    } finally {
      setIsBulkRunning(false);
    }
  };
  const todayDayIndex = new Date().getDay();
  const todayHabits = useMemo(
    () => filteredHabits.filter((h) => h.scheduledDays.includes(todayDayIndex)),
    [filteredHabits, todayDayIndex]
  );
  const otherHabits = useMemo(
    () => filteredHabits.filter((h) => !h.scheduledDays.includes(todayDayIndex)),
    [filteredHabits, todayDayIndex]
  );

  const renderTable = (
    sectionTitle: string,
    icon: React.ReactNode,
    habitsList: DailyHabit[],
    theme: 'pink' | 'purple'
  ) => {
    const isPink = theme === 'pink';
    const headerBgClass = isPink
      ? 'bg-gradient-to-r from-pink-600 via-fuchsia-600 to-purple-600 text-white'
      : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white';
    const containerBorderClass = isPink
      ? 'border border-pink-300/90 rounded-xl overflow-hidden bg-white shadow-sm'
      : 'border border-purple-200/90 rounded-xl overflow-hidden bg-white shadow-sm';
    const doneColBorderClass = isPink ? 'border-r-2 border-pink-300' : 'border-r-2 border-purple-200';

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className={`text-xs sm:text-sm font-bold flex items-center gap-2 ${isPink ? 'text-pink-900' : 'text-purple-900'}`}>
            {icon}
            {sectionTitle}
            <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${isPink ? 'bg-pink-100 text-pink-800 border-pink-200' : 'bg-purple-100 text-purple-800 border-purple-200'}`}>
              {habitsList.length}
            </span>
          </h3>
        </div>

        <div className={containerBorderClass}>
          <div className="overflow-x-auto">
            <table className="min-w-[700px] w-full text-sm">
              <thead className={headerBgClass}>
                <tr>
                  <th className="px-3.5 py-3 text-center font-semibold whitespace-nowrap w-px border-r-2 border-white/30">Done</th>
                  <th className="px-3.5 py-3 text-left font-semibold w-full min-w-[calc(100vw-78px)] sm:min-w-[220px] border-r border-white/15">Habit Title</th>
                  <th className="px-3.5 py-3 text-left font-semibold whitespace-nowrap w-px border-r border-white/15">Schedule</th>
                  <th className="px-3.5 py-3 text-left font-semibold whitespace-nowrap w-px border-r border-white/15">Time</th>
                  <th className="px-3.5 py-3 text-center font-semibold whitespace-nowrap w-px border-r border-white/15">Streak</th>
                  <th className="px-3.5 py-3 text-right font-semibold whitespace-nowrap w-px">Actions</th>
                </tr>
              </thead>
              <tbody>
                {habitsList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-gray-500 text-xs">
                      No habits in this section.
                    </td>
                  </tr>
                ) : (
                  habitsList.map((habit) => {
                    const isCompletedToday = habit.completedDates.includes(todayDate);
                    const streak = habit.completedDates.length;
                    const isSelected = selectedIds.has(habit.id);
                    const isDueToday = habit.scheduledDays.includes(todayDayIndex);

                    const rowBgClass = isSelected
                      ? 'bg-purple-100/90 hover:bg-purple-100'
                      : isCompletedToday
                      ? 'bg-emerald-50/40 hover:bg-emerald-50/70'
                      : isPink
                      ? 'bg-gradient-to-r from-pink-50/20 via-white to-purple-50/10 hover:bg-pink-50/40'
                      : 'hover:bg-purple-50/30';

                    return (
                      <tr key={habit.id} className={`border-t last:border-b transition-all ${rowBgClass}`}>
                        {/* Done Checkbox */}
                        <td className={`px-3.5 py-3 align-middle text-center whitespace-nowrap relative ${doneColBorderClass}`}>
                          {!isCompletedToday && isDueToday && (
                            <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-gradient-to-b from-purple-600 to-pink-500 shadow-2xs" />
                          )}
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={isCompletedToday}
                            aria-label={`Mark ${habit.title} as ${isCompletedToday ? 'incomplete' : 'completed'}`}
                            onClick={() => onToggleCompletion(habit.id, isCompletedToday)}
                            className={`mx-auto h-5 w-5 rounded border transition-all duration-200 flex items-center justify-center ${
                              isCompletedToday
                                ? 'bg-gradient-to-br from-pink-400 to-purple-500 border-transparent text-white shadow-[0_4px_12px_rgba(184,109,214,0.35)]'
                                : 'bg-white border-purple-300 text-transparent hover:border-purple-400'
                            }`}
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        </td>

                        {/* Title */}
                        <td className="px-3.5 py-3 align-middle min-w-[calc(100vw-78px)] sm:min-w-[220px] border-r border-purple-100/70">
                          <span className={`font-medium block break-words ${isCompletedToday ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {habit.title}
                          </span>
                          {habit.targetValue && habit.targetValue > 0 && (() => {
                            const currentProgress = habit.dailyProgress?.[todayDate] ?? (isCompletedToday ? habit.targetValue : 0);
                            const target = habit.targetValue;
                            const percent = Math.min(100, Math.round((currentProgress / target) * 100));

                            return (
                              <div className="flex items-center gap-1.5 mt-1.5 p-1 rounded-lg bg-purple-50/70 border border-purple-100/90 shadow-2xs">
                                <div className="inline-flex items-center gap-1 bg-white border border-purple-200/90 rounded-md p-0.5 shadow-2xs shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => onProgressChange?.(habit.id, currentProgress - 1)}
                                    className="w-4 h-4 rounded bg-purple-100/80 text-purple-800 font-bold hover:bg-purple-200 flex items-center justify-center text-xs transition disabled:opacity-40"
                                    disabled={currentProgress <= 0}
                                  >
                                    -
                                  </button>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={currentProgress === 0 ? '' : currentProgress}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const raw = e.target.value.replace(/[^0-9]/g, '');
                                      if (raw === '') {
                                        onProgressChange?.(habit.id, 0);
                                      } else {
                                        const parsed = parseInt(raw, 10);
                                        const val = Math.min(target, Math.max(0, parsed));
                                        onProgressChange?.(habit.id, val);
                                      }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-5 text-center text-[11px] font-bold text-purple-900 bg-purple-50/90 rounded border border-purple-200/80 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-400 px-1 transition-all"
                                    style={{ width: `${Math.max(2.2, String(currentProgress).length + 1.5)}ch` }}
                                  />
                                  <span className="text-[11px] font-bold text-purple-900 whitespace-nowrap pl-0.5 pr-1.5">
                                    / {target} {habit.targetUnit || ''}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => onProgressChange?.(habit.id, currentProgress + 1)}
                                    className="w-4 h-4 rounded bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold hover:opacity-90 flex items-center justify-center text-xs transition disabled:opacity-40"
                                    disabled={currentProgress >= target}
                                  >
                                    +
                                  </button>
                                </div>

                                <div className="flex-1 h-1.5 bg-purple-200/70 rounded-full overflow-hidden min-w-[30px]">
                                  <div
                                    className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 rounded-full transition-all duration-300"
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>

                                <span className="text-[10px] font-bold text-purple-800 shrink-0">{percent}%</span>
                              </div>
                            );
                          })()}
                        </td>

                        {/* Schedule */}
                        <td className="px-3.5 py-3 align-middle whitespace-nowrap border-r border-purple-100/70">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100/70 border border-purple-200/80 text-purple-700">
                            {formatScheduledDays(habit.scheduledDays)}
                          </span>
                          {isDueToday && !isCompletedToday && (
                            <span className="inline-flex items-center gap-1 ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-2xs">
                              Today
                            </span>
                          )}
                        </td>

                        {/* Time */}
                        <td className="px-3.5 py-3 align-middle whitespace-nowrap border-r border-purple-100/70">
                          {(() => {
                            const hasCustomSchedule = habit.customSchedule && Object.keys(habit.customSchedule).length > 0;
                            if (hasCustomSchedule) {
                              return (
                                <div
                                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg text-white text-[10px] sm:text-xs font-semibold whitespace-nowrap shadow-xs"
                                  style={{ backgroundColor: getHabitColorHex(habit, habits) }}
                                  title="Flexible per-day schedule"
                                >
                                  <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white/90" />
                                  <span>Flexible Times</span>
                                </div>
                              );
                            }

                            const timeSlots = getHabitTimeSlotsForDay(habit, todayDayIndex);
                            const slotsToDisplay = timeSlots.length > 0 ? timeSlots : [{ startTime: habit.startTime, endTime: habit.endTime }];
                            return (
                              <div className="flex flex-col gap-1">
                                {slotsToDisplay.map((slot, idx) => (
                                  <div
                                    key={idx}
                                    className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg text-white text-[10px] sm:text-xs font-semibold whitespace-nowrap shadow-xs"
                                    style={{ backgroundColor: getHabitColorHex(habit, habits) }}
                                  >
                                    <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white/90" />
                                    <span>
                                      {slot.startTime} - {slot.endTime}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </td>

                        {/* Streak */}
                        <td className="px-3.5 py-3 align-middle text-center whitespace-nowrap border-r border-purple-100/70">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 bg-white border border-purple-200 px-2 py-0.5 rounded-md shadow-xs">
                            <Flame className="h-3.5 w-3.5 text-pink-500" />
                            {streak}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-3.5 py-3 align-middle text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => toggleSelected(habit.id)}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all duration-150 flex items-center gap-1 shadow-2xs ${
                                isSelected
                                  ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-xs'
                                  : 'bg-purple-50/80 hover:bg-purple-100/90 text-purple-700 border border-purple-200/80'
                              }`}
                              title={isSelected ? 'Deselect habit' : 'Select habit for bulk actions'}
                            >
                              {isSelected ? (
                                <>
                                  <Check className="w-3 h-3 text-white stroke-[3]" />
                                  <span>Selected</span>
                                </>
                              ) : (
                                <span>Select</span>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => onEdit(habit)}
                              className="h-7 w-7 rounded-lg bg-white hover:bg-blue-50 text-gray-500 hover:text-blue-600 border border-gray-200/80 hover:border-blue-200 transition-all flex items-center justify-center shadow-2xs"
                              title="Edit habit"
                              aria-label={`Edit ${habit.title}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onDelete(habit.id)}
                              className="h-7 w-7 rounded-lg bg-white hover:bg-rose-50 text-gray-400 hover:text-rose-600 border border-gray-200/80 hover:border-rose-200 transition-all flex items-center justify-center shadow-2xs"
                              title="Delete habit"
                              aria-label={`Delete ${habit.title}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filter and Control Bar */}
      <div className="glass-card p-2.5 sm:p-4">
        <div className="flex flex-col lg:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search habits..."
              className="w-full min-h-[36px] sm:min-h-[40px] rounded-lg border border-gray-200 bg-white pl-9 pr-8 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-300/50 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600 transition-colors p-1"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={toggleSelectAllFiltered}
            className="px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm rounded-lg bg-white border border-gray-200 hover:bg-gray-50 font-medium transition"
          >
            {allFilteredSelected ? 'Unselect filtered' : 'Select filtered'}
          </button>
          <span className="text-xs sm:text-sm text-gray-500 font-medium px-1">{selectedIds.size} selected</span>

          {selectedIds.size > 0 && (
            <button
              type="button"
              disabled={selectedIds.size === 0 || isBulkRunning}
              onClick={() => setIsBulkDeleteConfirmOpen(true)}
              className="px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 disabled:opacity-50 transition"
            >
              Delete selected ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      {/* Table Sections */}
      <div className="space-y-6">
        {renderTable(
          "Today's Scheduled Habits",
          <Activity className="w-4 h-4 text-pink-600 animate-pulse" />,
          todayHabits,
          'pink'
        )}

        {otherHabits.length > 0 &&
          renderTable(
            'Scheduled for Other Days',
            <Calendar className="w-4 h-4 text-purple-600" />,
            otherHabits,
            'purple'
          )}
      </div>

      {/* Bulk Delete Modal */}
      {isBulkDeleteConfirmOpen &&
        createPortal(
          <div className="fixed inset-0 bg-gradient-to-b from-slate-950/35 via-purple-900/20 to-fuchsia-900/30 backdrop-blur-[2px] flex items-center justify-center z-[9999] p-4">
            <div className="modal-enter max-w-sm w-full max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-rose-100/80 bg-white/95 backdrop-blur-xl p-5 sm:p-6 shadow-[0_24px_56px_rgba(244,63,94,0.22)]">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 border border-rose-200">
                <RefreshCw className="h-6 w-6 text-rose-600" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 text-center">Delete selected habits?</h3>
              <p className="text-gray-700 text-sm text-center mb-6">
                Are you sure you want to delete <strong>{selectedIds.size}</strong> selected habit(s)? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsBulkDeleteConfirmOpen(false)}
                  disabled={isBulkRunning}
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 font-semibold rounded-xl transition disabled:opacity-70"
                >
                  Cancel
                </button>
                <button
                  onClick={runBulkDelete}
                  disabled={isBulkRunning}
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-semibold rounded-xl transition shadow-[0_8px_20px_rgba(244,63,94,0.28)] disabled:opacity-70"
                >
                  {isBulkRunning ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
