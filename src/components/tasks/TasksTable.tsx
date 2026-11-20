import { useEffect, useMemo, useState, useDeferredValue, memo } from 'react';
import { Task, Category } from '@/types';
import { CalendarDays, Check, CheckCircle2, ChevronDown, Copy, ListChecks, ListTodo, Pencil, RefreshCw, Star, Trash2 } from 'lucide-react';
import {
  sortIncompleteTasks,
  sortCompletedTasks,
  QuickFilter,
  filterTask,
  getEarliestIncompleteSubtask,
  getEffectiveTaskDueDate,
  sortSubtasksByDueDate,
} from '@/utils/taskUtils';
import { formatDueDateDisplay, getDeadlineStatus } from '@/utils/dateUtils';
import { hexToRgba } from '@/utils/colorUtils';
import { buildCategoryMap, resolveCategoryDisplay } from '@/utils/categoryUtils';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TaskSmartChip } from './TaskSmartChip';
import { TasksFilterBar } from './TasksFilterBar';
import { SubtaskDateControl, NextSubtaskBadge } from './SubtaskDateControl';

interface Props {
  tasks: Task[];
  categories: Category[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  quickFilter: QuickFilter;
  onQuickFilterChange: (value: QuickFilter) => void;
  onToggleCompletion: (taskId: string, currentStatus: boolean) => void;
  onToggleStar?: (taskId: string, currentStarred: boolean) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onUpdateSubtaskDueDate?: (taskId: string, subtaskId: string, dueDate: string | null) => void;
  onEdit: (task: Task) => void;
  onDuplicate: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onBulkSetCompletion: (taskIds: string[], isCompleted: boolean) => Promise<void>;
  onBulkDuplicate: (taskIds: string[]) => Promise<void>;
  onBulkDelete: (taskIds: string[]) => Promise<void>;
  togglingTaskId: string | null;
}

const TasksTable = memo(function TasksTable({
  tasks,
  categories,
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  quickFilter,
  onQuickFilterChange,
  onToggleCompletion,
  onToggleStar,
  onToggleSubtask,
  onUpdateSubtaskDueDate,
  onEdit,
  onDuplicate,
  onDelete,
  onBulkSetCompletion,
  onBulkDuplicate,
  onBulkDelete,
  togglingTaskId,
}: Props) {
  const [pendingPage, setPendingPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const [pendingPageSize, setPendingPageSize] = useState(20);
  const [completedPageSize, setCompletedPageSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const [isBulkRunning, setIsBulkRunning] = useState(false);

  const toggleExpandTask = (id: string) => {
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);

  const deferredSearchQuery = useDeferredValue(searchQuery);

  const categoryMap = useMemo(() => buildCategoryMap(categories), [categories]);

  const getCategory = (taskCategory: string) => categoryMap.get(taskCategory);

  const matchesFilters = (task: Task): boolean => {
    return filterTask(task, deferredSearchQuery, categoryFilter, quickFilter, categories);
  };

  const pendingTasks = useMemo(
    () =>
      tasks
        .filter((t) => !t.isCompleted)
        .sort(sortIncompleteTasks),
    [tasks]
  );

  const completedTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.isCompleted)
        .sort(sortCompletedTasks),
    [tasks]
  );

  const filteredPendingTasks = useMemo(
    () => pendingTasks.filter(matchesFilters),
    [pendingTasks, deferredSearchQuery, categoryFilter, quickFilter, categories]
  );
  const filteredCompletedTasks = useMemo(
    () => completedTasks.filter(matchesFilters),
    [completedTasks, deferredSearchQuery, categoryFilter, quickFilter, categories]
  );

  const pendingTotalPages = Math.max(1, Math.ceil(filteredPendingTasks.length / pendingPageSize));
  const completedTotalPages = Math.max(1, Math.ceil(filteredCompletedTasks.length / completedPageSize));
  const pendingPaged = filteredPendingTasks.slice((pendingPage - 1) * pendingPageSize, pendingPage * pendingPageSize);
  const completedPaged = filteredCompletedTasks.slice(
    (completedPage - 1) * completedPageSize,
    completedPage * completedPageSize
  );

  useEffect(() => {
    setPendingPage(1);
    setCompletedPage(1);
  }, [searchQuery, categoryFilter, quickFilter]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const existing = new Set(tasks.map((t) => t.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (existing.has(id)) next.add(id);
      });
      return next;
    });
  }, [tasks]);

  useEffect(() => {
    if (selectedIds.size === 0) {
      setIsBulkDeleteConfirmOpen(false);
    }
  }, [selectedIds]);

  const allFilteredIds = useMemo(
    () => [...filteredPendingTasks, ...filteredCompletedTasks].map((t) => t.id),
    [filteredPendingTasks, filteredCompletedTasks]
  );

  const allFilteredSelected =
    allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.has(id));

  const selectedPendingIds = useMemo(
    () => pendingTasks.filter((t) => selectedIds.has(t.id)).map((t) => t.id),
    [pendingTasks, selectedIds]
  );
  const selectedCompletedIds = useMemo(
    () => completedTasks.filter((t) => selectedIds.has(t.id)).map((t) => t.id),
    [completedTasks, selectedIds]
  );

  const toggleSelected = (taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
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

  const runBulk = async (action: () => Promise<void>) => {
    try {
      setIsBulkRunning(true);
      await action();
      clearSelection();
    } finally {
      setIsBulkRunning(false);
    }
  };

  const renderTable = (
    rows: Task[],
    emptyText: string,
    headerTheme: 'purple' | 'pink' = 'purple',
    pageInfo: {
      page: number;
      totalPages: number;
      pageSize: number;
      onPageChange: (p: number) => void;
      onPageSizeChange: (s: number) => void;
    }
  ) => {
    const headerBg = headerTheme === 'purple' ? 'bg-purple-600' : 'bg-pink-600';
    const iconColor = headerTheme === 'purple' ? 'text-purple-100' : 'text-pink-100';
    const borderColor = headerTheme === 'purple' ? 'border-purple-200' : 'border-pink-200';
    const textColor = headerTheme === 'purple' ? 'text-purple-700' : 'text-pink-700';

    return (
      <div className={`border ${borderColor} rounded-xl overflow-hidden bg-white shadow-sm`}>
        <div className="overflow-x-auto">
          <table className="min-w-[700px] w-full text-sm">
            <thead className={`${headerBg} text-white`}>
              <tr>
                <th className="px-3.5 py-2.5 text-center font-semibold whitespace-nowrap w-px border-r-2 border-white/30">Done</th>
                <th className="px-3.5 py-2.5 text-left font-semibold w-full min-w-[calc(100vw-78px)] sm:min-w-[220px] border-r border-white/15">Title</th>
                <th className="px-3.5 py-2.5 text-center font-semibold whitespace-nowrap w-px border-r border-white/15">Category</th>
                <th className="px-3.5 py-2.5 text-center font-semibold whitespace-nowrap w-px border-r border-white/15">
                  <span className="inline-flex items-center justify-center gap-2">
                    Due
                    <CalendarDays className={`h-4 w-4 ${iconColor}`} />
                  </span>
                </th>
                <th className="px-3.5 py-2.5 text-center font-semibold whitespace-nowrap w-px border-r border-white/15">Status</th>
                <th className="px-3.5 py-2.5 text-center font-semibold whitespace-nowrap w-px">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                    {emptyText}
                  </td>
                </tr>
              ) : (
                rows.map((t) => {
                  const tdPaddingClass = 'py-3 align-middle';
                  const isSelected = selectedIds.has(t.id);
                  const selectedBg =
                    headerTheme === 'pink'
                      ? 'bg-pink-100/90 hover:bg-pink-100'
                      : 'bg-purple-100/90 hover:bg-purple-100';

                  const effectiveDueDate = getEffectiveTaskDueDate(t);
                  const deadlineStatus = getDeadlineStatus(effectiveDueDate);
                  const deadlineType = !t.isCompleted && deadlineStatus ? deadlineStatus.type : 'normal';

                  let statusRowClass = 'hover:bg-gray-50';
                  if (deadlineType === 'overdue') {
                    statusRowClass = 'hover:bg-rose-50/20';
                  } else if (deadlineType === 'today') {
                    statusRowClass = 'hover:bg-amber-50/20';
                  }

                  const rowBgClass = isSelected ? selectedBg : statusRowClass;

                  return (
                    <tr key={t.id} className={`border-t last:border-b transition-colors ${rowBgClass} ${togglingTaskId === t.id ? 'pointer-events-none' : ''}`}>
                      <td className={`px-3.5 ${tdPaddingClass} whitespace-nowrap text-center border-r-2 border-purple-200`}>
                        {togglingTaskId === t.id && (
                          <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-purple-50/70 to-pink-50/70 backdrop-blur-[3px] rounded-lg flex items-center justify-center z-10 pointer-events-auto">
                            <div className="flex flex-col items-center gap-2">
                              <div className="relative">
                                <div className="w-6 h-6 border-4 border-purple-200 rounded-full" />
                                <div className="absolute top-0 left-0 w-6 h-6 border-4 border-transparent border-t-purple-500 border-r-pink-500 rounded-full animate-spin" />
                              </div>
                              <span className="text-xs font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Updating...</span>
                            </div>
                          </div>
                        )}
                        <div className="relative inline-flex items-center justify-center">
                          {deadlineType === 'overdue' && (
                            <span className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-1.5 h-5 rounded-r-full bg-rose-500 shadow-2xs" />
                          )}
                          {deadlineType === 'today' && (
                            <span className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-1.5 h-5 rounded-r-full bg-amber-500 shadow-2xs" />
                          )}
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={t.isCompleted}
                            aria-label={`Mark ${t.title} as ${t.isCompleted ? 'incomplete' : 'completed'}`}
                            onClick={() => onToggleCompletion(t.id, t.isCompleted)}
                            disabled={togglingTaskId === t.id}
                            className={`mx-auto h-5 w-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center shadow-2xs ${t.isCompleted
                              ? 'bg-gradient-to-br from-pink-400 to-purple-500 border-transparent text-white shadow-[0_4px_12px_rgba(184,109,214,0.35)]'
                              : 'bg-purple-50/90 border-purple-400/90 text-transparent hover:border-purple-600 hover:bg-purple-100/90'
                            } ${togglingTaskId === t.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {togglingTaskId === t.id ? (
                              <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                      <td className={`px-3.5 ${tdPaddingClass} min-w-[calc(100vw-78px)] sm:min-w-[220px] border-r border-purple-100/70`}>
                        <div className="flex items-center gap-2">
                          {onToggleStar && (
                            <button
                              type="button"
                              onClick={() => onToggleStar(t.id, Boolean(t.isStarred))}
                              className={`p-1 -ml-1 rounded-lg transition-all shrink-0 shadow-2xs ${
                                t.isStarred
                                  ? 'bg-amber-100/90 border border-amber-300'
                                  : 'bg-amber-50/80 hover:bg-amber-100 border border-amber-200/90'
                              }`}
                              title={t.isStarred ? 'Unstar task' : 'Star task'}
                              aria-label={t.isStarred ? `Unstar ${t.title}` : `Star ${t.title}`}
                            >
                              <Star
                                className={`w-4 h-4 transition-transform duration-150 ${
                                  t.isStarred
                                    ? 'fill-amber-400 text-amber-500 drop-shadow-[0_2px_6px_rgba(245,158,11,0.45)] scale-105'
                                    : 'text-amber-500/80 hover:text-amber-600'
                                }`}
                              />
                            </button>
                          )}
                          <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                            <div className="font-medium text-gray-900 break-words leading-tight">{t.title}</div>
                            {t.description && <div className="text-xs text-gray-500 break-words leading-snug">{t.description}</div>}
                            {t.linkChip && t.linkChip.url && (
                              <div className="mt-0.5">
                                <TaskSmartChip chip={t.linkChip} />
                              </div>
                            )}
                          </div>
                        </div>
                        {t.subtasks && t.subtasks.length > 0 && (() => {
                          const total = t.subtasks.length;
                          const completed = t.subtasks.filter((s) => s.isCompleted).length;
                          const percent = Math.round((completed / total) * 100);
                          const isExpanded = expandedTaskIds.has(t.id);
                          const sortedSubtasks = sortSubtasksByDueDate(t.subtasks);
                          const earliestIncompleteSubtask = getEarliestIncompleteSubtask(t);

                          return (
                            <div className="mt-1.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => toggleExpandTask(t.id)}
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-purple-100/90 text-purple-800 border border-purple-200/90 hover:bg-purple-200/90 transition cursor-pointer shadow-2xs"
                                >
                                  <ListChecks className="w-3.5 h-3.5 text-purple-700" />
                                  <span>
                                    Subtasks {completed}/{total}
                                  </span>
                                  <div className="w-10 h-1.5 bg-purple-200/80 rounded-full overflow-hidden ml-0.5">
                                    <div
                                      className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full transition-all duration-300"
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>
                                  <ChevronDown className={`w-3 h-3 text-purple-600 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                </button>

                                {!t.isCompleted && earliestIncompleteSubtask && earliestIncompleteSubtask.dueDate && (
                                  <NextSubtaskBadge
                                    subtask={earliestIncompleteSubtask}
                                    onClick={() => toggleExpandTask(t.id)}
                                  />
                                )}
                              </div>

                              {isExpanded && (
                                <div className="mt-2 p-2.5 rounded-xl bg-purple-100/70 border border-purple-200/90 space-y-1.5 shadow-2xs">
                                  <div className="flex items-center justify-between text-[11px] font-semibold text-purple-900/80 pb-1 border-b border-purple-200/70">
                                    <span>Subtasks Progress</span>
                                    <span>{percent}%</span>
                                  </div>
                                  <div className="space-y-1 pt-0.5">
                                    {sortedSubtasks.map((st) => {
                                      const isNextUp = !t.isCompleted && !st.isCompleted && earliestIncompleteSubtask?.id === st.id && Boolean(st.dueDate);
                                      return (
                                        <div
                                          key={st.id}
                                          onClick={() => onToggleSubtask?.(t.id, st.id)}
                                          className={`flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white/90 hover:bg-white border transition cursor-pointer shadow-2xs group/st ${
                                            isNextUp ? 'border-purple-300/90 ring-1 ring-purple-200/60' : 'border-purple-100/80'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <button
                                              type="button"
                                              role="checkbox"
                                              aria-checked={st.isCompleted}
                                              className={`h-3.5 w-3.5 rounded border transition duration-150 flex items-center justify-center shrink-0 ${
                                                st.isCompleted
                                                  ? 'bg-gradient-to-br from-pink-400 to-purple-500 border-transparent text-white'
                                                  : 'bg-white border-purple-300 text-transparent group-hover/st:border-purple-400'
                                              }`}
                                            >
                                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                              </svg>
                                            </button>
                                            <span className={`text-xs break-words flex-1 min-w-0 ${st.isCompleted ? 'line-through text-gray-400' : 'text-gray-800 font-medium'}`}>
                                              {st.title}
                                            </span>
                                          </div>

                                          <SubtaskDateControl
                                            variant="checklist"
                                            dueDate={st.dueDate}
                                            isCompleted={st.isCompleted}
                                            onChange={(newDate) => onUpdateSubtaskDueDate?.(t.id, st.id, newDate)}
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className={`px-3.5 ${tdPaddingClass} whitespace-nowrap border-r border-purple-100/70 text-center`}>
                        {(() => {
                          const { categoryName, categoryColor, categoryTextColor } = resolveCategoryDisplay(
                            getCategory(t.category),
                            t.category
                          );

                          return (
                            <span
                              className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md border"
                              style={{
                                backgroundColor: hexToRgba(categoryColor, 0.3),
                                color: categoryTextColor,
                                borderColor: hexToRgba(categoryColor, 0.65),
                              }}
                            >
                              {categoryName}
                            </span>
                          );
                        })()}
                      </td>
                      <td className={`px-3.5 ${tdPaddingClass} whitespace-nowrap border-r border-purple-100/70 text-center`}>
                        {t.dueDate ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-100/70 border border-purple-200/80 text-purple-700 whitespace-nowrap shadow-2xs">
                            <CalendarDays className="w-3.5 h-3.5 text-purple-600" />
                            {formatDueDateDisplay(t.dueDate)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium">—</span>
                        )}
                      </td>
                      <td className={`px-3.5 ${tdPaddingClass} whitespace-nowrap border-r border-purple-100/70 text-center`}>
                        {t.dueDate ? (
                          (() => {
                            const deadlineStatus = getDeadlineStatus(t.dueDate);
                            return deadlineStatus ? (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${deadlineStatus.className}`}>
                                {deadlineStatus.text}
                              </span>
                            ) : (
                              <div className="text-sm text-gray-400">—</div>
                            );
                          })()
                        ) : (
                          <div className="text-sm text-gray-400">—</div>
                        )}
                      </td>
                      <td className={`px-3.5 ${tdPaddingClass} whitespace-nowrap text-center`}>
                        <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleSelected(t.id)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all duration-150 flex items-center gap-1 shadow-2xs ${
                              selectedIds.has(t.id)
                                ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-xs'
                                : 'bg-purple-50/80 hover:bg-purple-100/90 text-purple-700 border border-purple-200/80'
                            }`}
                            title={selectedIds.has(t.id) ? 'Deselect task' : 'Select task for bulk actions'}
                          >
                            {selectedIds.has(t.id) ? (
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
                            onClick={() => onEdit(t)}
                            className="h-7 w-7 rounded-lg bg-white hover:bg-blue-50 text-gray-500 hover:text-blue-600 border border-gray-200/80 hover:border-blue-200 transition-all flex items-center justify-center shadow-2xs"
                            title="Edit task"
                            aria-label={`Edit ${t.title}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onDuplicate(t)}
                            className="h-7 w-7 rounded-lg bg-white hover:bg-purple-50 text-gray-500 hover:text-purple-600 border border-gray-200/80 hover:border-purple-200 transition-all flex items-center justify-center shadow-2xs"
                            title="Duplicate task"
                            aria-label={`Duplicate ${t.title}`}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onDelete(t.id)}
                            className="h-7 w-7 rounded-lg bg-white hover:bg-rose-50 text-gray-400 hover:text-rose-600 border border-gray-200/80 hover:border-rose-200 transition-all flex items-center justify-center shadow-2xs"
                            title="Delete task"
                            aria-label={`Delete ${t.title}`}
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

        {/* Pagination Footer */}
        <div className={`flex items-center justify-between px-3.5 py-2.5 ${headerBg} text-white border-t border-white/20`}>
          <div className="flex items-center gap-2 text-sm text-white">
            <span>Page {pageInfo.page} of {pageInfo.totalPages}</span>
            <select
              value={pageInfo.pageSize}
              onChange={(e) => pageInfo.onPageSizeChange(Number(e.target.value))}
              className={`border border-white/50 bg-white/95 ${textColor} rounded px-2 py-1 text-sm focus:outline-none`}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => pageInfo.onPageChange(Math.max(1, pageInfo.page - 1))}
              disabled={pageInfo.page === 1}
              className={`px-3 py-1 bg-white/95 ${textColor} border border-white/60 rounded font-medium disabled:opacity-50`}
            >
              Prev
            </button>
            <button
              onClick={() => pageInfo.onPageChange(Math.min(pageInfo.totalPages, pageInfo.page + 1))}
              disabled={pageInfo.page === pageInfo.totalPages}
              className={`px-3 py-1 bg-white/95 ${textColor} border border-white/60 rounded font-medium disabled:opacity-50`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <TasksFilterBar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={onCategoryFilterChange}
        quickFilter={quickFilter}
        onQuickFilterChange={onQuickFilterChange}
        categories={categories}
      >
        <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
          <button
            type="button"
            onClick={toggleSelectAllFiltered}
            className="px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition"
          >
            {allFilteredSelected ? 'Unselect filtered' : 'Select filtered'}
          </button>
          <span className="text-xs sm:text-sm text-gray-500 font-medium px-1">{selectedIds.size} selected</span>

          {selectedIds.size > 0 && (
            <>
              <button
                type="button"
                disabled={selectedPendingIds.length === 0 || isBulkRunning}
                onClick={() => runBulk(() => onBulkSetCompletion(selectedPendingIds, true))}
                className="px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition"
              >
                Complete selected ({selectedPendingIds.length})
              </button>
              <button
                type="button"
                disabled={selectedCompletedIds.length === 0 || isBulkRunning}
                onClick={() => runBulk(() => onBulkSetCompletion(selectedCompletedIds, false))}
                className="px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
              >
                Pending selected ({selectedCompletedIds.length})
              </button>
              <button
                type="button"
                disabled={selectedIds.size === 0 || isBulkRunning}
                onClick={() => runBulk(() => onBulkDuplicate(Array.from(selectedIds)))}
                className="px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm rounded-lg bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 disabled:opacity-50 transition"
              >
                Duplicate selected ({selectedIds.size})
              </button>
              <button
                type="button"
                disabled={selectedIds.size === 0 || isBulkRunning}
                onClick={() => setIsBulkDeleteConfirmOpen(true)}
                className="px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition"
              >
                Delete selected ({selectedIds.size})
              </button>
            </>
          )}
        </div>
      </TasksFilterBar>

      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h2 className="text-sm sm:text-base font-bold text-pink-950 flex items-center gap-2">
            <ListTodo className="w-4.5 h-4.5 text-pink-600 animate-pulse" />
            <span>Pending Tasks</span>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-pink-100/90 text-pink-800 border border-pink-200/90 shadow-2xs">
              {filteredPendingTasks.length}
            </span>
          </h2>
        </div>
        {renderTable(pendingPaged, 'No pending tasks. Great job, everything is complete.', 'pink', {
          page: pendingPage,
          totalPages: pendingTotalPages,
          pageSize: pendingPageSize,
          onPageChange: setPendingPage,
          onPageSizeChange: (s) => {
            setPendingPageSize(s);
            setPendingPage(1);
          },
        })}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h2 className="text-sm sm:text-base font-bold text-purple-950 flex items-center gap-2">
            <CheckCircle2 className="w-4.5 h-4.5 text-purple-600" />
            <span>Completed Tasks</span>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-purple-100/90 text-purple-800 border border-purple-200/90 shadow-2xs">
              {filteredCompletedTasks.length}
            </span>
          </h2>
        </div>
        {renderTable(completedPaged, 'No completed tasks yet.', 'purple', {
          page: completedPage,
          totalPages: completedTotalPages,
          pageSize: completedPageSize,
          onPageChange: setCompletedPage,
          onPageSizeChange: (s) => {
            setCompletedPageSize(s);
            setCompletedPage(1);
          },
        })}
      </div>

      <ConfirmDialog
        isOpen={isBulkDeleteConfirmOpen}
        title="Delete selected tasks?"
        description={
          <>
            Are you sure you want to delete <strong>{selectedIds.size}</strong> selected task(s)? This action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        loadingLabel="Deleting..."
        isLoading={isBulkRunning}
        tone="danger"
        icon={<RefreshCw className="h-6 w-6 text-rose-600" />}
        onCancel={() => setIsBulkDeleteConfirmOpen(false)}
        onConfirm={() =>
          runBulk(async () => {
            await onBulkDelete(Array.from(selectedIds));
            setIsBulkDeleteConfirmOpen(false);
          })
        }
      />
    </div>
  );
});

export default TasksTable;
