import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { DailyHabit } from '@/types';
import { Flame, RefreshCw, Clock, Search } from 'lucide-react';
import { getHabitColorHex } from '@/services/habitService';

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
  onEdit: (habit: DailyHabit) => void;
  onDelete: (habitId: string) => void;
  onBulkDelete: (habitIds: string[]) => Promise<void>;
}

export default function HabitsTable({
  habits,
  todayDate,
  onToggleCompletion,
  onEdit,
  onDelete,
  onBulkDelete,
}: Props) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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

  const totalPages = Math.max(1, Math.ceil(filteredHabits.length / pageSize));
  const pagedHabits = filteredHabits.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

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
      await onBulkDelete(Array.from(selectedIds));
      clearSelection();
      setIsBulkDeleteConfirmOpen(false);
    } finally {
      setIsBulkRunning(false);
    }
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
              className="w-full min-h-[36px] sm:min-h-[40px] rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-300/50 focus:outline-none"
            />
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

      {/* Table & Pagination Card Container */}
      <div className="border border-purple-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[700px] w-full text-sm">
            <thead className="bg-purple-600 text-white">
              <tr>
                <th className="px-3.5 py-3 text-left font-semibold w-full min-w-[220px]">Habit Title</th>
                <th className="px-3.5 py-3 text-left font-semibold whitespace-nowrap w-px">Schedule</th>
                <th className="px-3.5 py-3 text-left font-semibold whitespace-nowrap w-px">Time</th>
                <th className="px-3.5 py-3 text-center font-semibold whitespace-nowrap w-px">Streak</th>
                <th className="px-3.5 py-3 text-center font-semibold whitespace-nowrap w-px">Done</th>
                <th className="px-3.5 py-3 text-right font-semibold whitespace-nowrap w-px">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedHabits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                    No habits found.
                  </td>
                </tr>
              ) : (
                pagedHabits.map((habit) => {
                  const isCompletedToday = habit.completedDates.includes(todayDate);
                  const streak = habit.completedDates.length;
                  const isSelected = selectedIds.has(habit.id);
                  const todayDayIndex = new Date().getDay();
                  const isDueToday = habit.scheduledDays.includes(todayDayIndex);

                  const rowBgClass = isSelected
                    ? 'bg-purple-100/90 hover:bg-purple-100'
                    : isCompletedToday
                    ? 'bg-emerald-50/40 hover:bg-emerald-50/70'
                    : isDueToday
                    ? 'bg-purple-50/80 hover:bg-purple-100/70 font-semibold'
                    : 'opacity-65 hover:opacity-100 hover:bg-gray-50';

                  return (
                    <tr key={habit.id} className={`border-t last:border-b transition-colors ${rowBgClass}`}>
                      {/* Title */}
                      <td className="px-3.5 py-3 align-middle min-w-[220px]">
                        <span className={`font-medium block break-words ${isCompletedToday ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {habit.title}
                        </span>
                      </td>

                      {/* Schedule */}
                      <td className="px-3.5 py-3 align-middle whitespace-nowrap">
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
                      <td className="px-3.5 py-3 align-middle whitespace-nowrap">
                        <div
                          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg text-white text-[10px] sm:text-xs font-semibold whitespace-nowrap shadow-xs"
                          style={{ backgroundColor: getHabitColorHex(habit, habits) }}
                        >
                          <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white/90" />
                          <span>
                            {habit.startTime} - {habit.endTime}
                          </span>
                        </div>
                      </td>

                      {/* Streak */}
                      <td className="px-3.5 py-3 align-middle text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 bg-white border border-purple-200 px-2 py-0.5 rounded-md shadow-xs">
                          <Flame className="h-3.5 w-3.5 text-pink-500" />
                          {streak}
                        </span>
                      </td>

                      {/* Done Checkbox */}
                      <td className="px-3.5 py-3 align-middle text-center whitespace-nowrap">
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

                      {/* Actions */}
                      <td className="px-3.5 py-3 align-middle text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <button
                            onClick={() => toggleSelected(habit.id)}
                            className={`px-2 py-1 text-xs rounded border transition ${
                              isSelected
                                ? 'bg-purple-100 border-purple-300 text-purple-700 font-medium'
                                : 'bg-white border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            {isSelected ? 'Selected' : 'Select'}
                          </button>
                          <button
                            onClick={() => onEdit(habit)}
                            className="px-2 py-1 text-xs rounded bg-white border border-gray-200 hover:bg-gray-50 text-gray-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDelete(habit.id)}
                            className="px-2 py-1 text-xs rounded bg-white border border-gray-200 hover:bg-gray-50 text-rose-600"
                          >
                            Delete
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

        {/* Pagination Footer - Seamlessly attached */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-purple-600 text-white border-t border-purple-500">
          <div className="flex items-center gap-2 text-sm text-white">
            <span>Page {page} of {totalPages}</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="border border-white/50 bg-white/95 text-purple-700 rounded px-2 py-1 text-sm focus:outline-none"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 bg-white/95 text-purple-700 border border-white/60 rounded font-medium disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 bg-white/95 text-purple-700 border border-white/60 rounded font-medium disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
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
