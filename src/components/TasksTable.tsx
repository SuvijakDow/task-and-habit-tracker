import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Task, Category } from '@/types';
import { CalendarDays, RefreshCw } from 'lucide-react';

const DEFAULT_TASK_CATEGORY_NAME = 'Personal';
const DEFAULT_TASK_CATEGORY_COLOR = '#C4B5FD';
const COLOR_HEX_REGEX = /^#[0-9A-F]{6}$/i;

type QuickFilter = 'all' | 'today' | 'overdue' | 'week';

const isValidHexColor = (value: string): boolean => COLOR_HEX_REGEX.test(value);

const hexToRgba = (hex: string, alpha: number): string => {
  if (!isValidHexColor(hex)) {
    return `rgba(196, 181, 253, ${alpha})`;
  }

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getReadableCategoryTextColor = (hex: string): string => {
  if (!isValidHexColor(hex)) {
    return '#374151';
  }

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const darken = (channel: number) => Math.max(28, Math.round(channel * 0.45));
  return `rgb(${darken(r)}, ${darken(g)}, ${darken(b)})`;
};

interface Props {
  tasks: Task[];
  categories: Category[];
  onToggleCompletion: (taskId: string, currentStatus: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onBulkSetCompletion: (taskIds: string[], isCompleted: boolean) => Promise<void>;
  onBulkDelete: (taskIds: string[]) => Promise<void>;
}

export default function TasksTable({
  tasks,
  categories,
  onToggleCompletion,
  onEdit,
  onDelete,
  onBulkSetCompletion,
  onBulkDelete,
}: Props) {
  const [pendingPage, setPendingPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const [pendingPageSize, setPendingPageSize] = useState(10);
  const [completedPageSize, setCompletedPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkRunning, setIsBulkRunning] = useState(false);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);

  const getCategory = (taskCategory: string) =>
    categories.find((c) => c.id === taskCategory || c.name === taskCategory);

  const getCategoryName = (task: Task) => {
    const matchedCategory = getCategory(task.category);
    return matchedCategory?.name || task.category || DEFAULT_TASK_CATEGORY_NAME;
  };

  const getDeadlineStatus = (task: Task) => {
    if (!task.dueDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const overdueDays = Math.abs(diffDays);
      return {
        text: `Overdue by ${overdueDays} day${overdueDays > 1 ? 's' : ''}`,
        className: 'text-red-600 bg-red-50 border-red-200',
      };
    }

    if (diffDays === 0) {
      return {
        text: 'Due today',
        className: 'text-amber-600 bg-amber-50 border-amber-200',
      };
    }

    return {
      text: `${diffDays} day${diffDays > 1 ? 's' : ''} left`,
      className: 'text-green-600 bg-green-50 border-green-200',
    };
  };

  const matchesQuickFilter = (task: Task): boolean => {
    if (quickFilter === 'all') return true;
    if (!task.dueDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    if (quickFilter === 'today') {
      return dueDate.getTime() === today.getTime();
    }

    if (quickFilter === 'overdue') {
      return dueDate.getTime() < today.getTime();
    }

    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);
    return dueDate.getTime() >= today.getTime() && dueDate.getTime() <= weekEnd.getTime();
  };

  const matchesFilters = (task: Task): boolean => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const categoryName = getCategoryName(task).toLowerCase();
    const title = task.title.toLowerCase();
    const description = task.description.toLowerCase();
    const matchesSearch =
      normalizedSearch.length === 0 ||
      title.includes(normalizedSearch) ||
      description.includes(normalizedSearch) ||
      categoryName.includes(normalizedSearch);

    const matchedCategory = getCategory(task.category);
    const categoryId = matchedCategory?.id || task.category;
    const categoryNameRaw = matchedCategory?.name || task.category;
    const matchesCategory =
      categoryFilter === 'all' ||
      categoryFilter === categoryId ||
      categoryFilter === categoryNameRaw;

    return matchesSearch && matchesCategory && matchesQuickFilter(task);
  };

  const pendingTasks = useMemo(
    () =>
      tasks
        .filter((t) => !t.isCompleted)
        .sort((a, b) => {
          if (!a.dueDate && !b.dueDate) {
            return b.createdAt.getTime() - a.createdAt.getTime();
          }
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;

          const dueDiff = a.dueDate.getTime() - b.dueDate.getTime();
          return dueDiff !== 0 ? dueDiff : b.createdAt.getTime() - a.createdAt.getTime();
        }),
    [tasks]
  );

  const completedTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.isCompleted)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    [tasks]
  );

  const filteredPendingTasks = useMemo(
    () => pendingTasks.filter(matchesFilters),
    [pendingTasks, searchQuery, categoryFilter, quickFilter, categories]
  );
  const filteredCompletedTasks = useMemo(
    () => completedTasks.filter(matchesFilters),
    [completedTasks, searchQuery, categoryFilter, quickFilter, categories]
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
    headerTheme: 'purple' | 'pink' = 'purple'
  ) => {
    const headerBg = headerTheme === 'purple' ? 'bg-purple-600' : 'bg-pink-600';
    const iconColor = headerTheme === 'purple' ? 'text-purple-100' : 'text-pink-100';

    return (
      <div className="overflow-x-auto bg-white border border-gray-100 rounded-lg shadow-sm">
        <table className="min-w-[980px] w-full text-sm table-fixed">
          <colgroup>
            <col style={{ width: '37%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '20%' }} />
          </colgroup>
          <thead className={`${headerBg} text-white`}>
            <tr>
              <th className="px-3 py-2.5 text-left font-semibold">Title</th>
              <th className="px-3 py-2.5 text-left font-semibold">Category</th>
              <th className="px-3 py-2.5 text-left font-semibold">
                <span className="inline-flex items-center gap-2">
                  Due
                  <CalendarDays className={`h-4 w-4 ${iconColor}`} />
                </span>
              </th>
              <th className="px-3 py-2.5 text-left font-semibold">Status</th>
              <th className="px-3 py-2.5 text-center font-semibold">Done</th>
              <th className="px-3 py-2.5 text-right font-semibold">Actions</th>
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
              rows.map((t) => (
                <tr key={t.id} className="border-t last:border-b hover:bg-gray-50 transition">
                  <td className="px-3 py-3 align-top max-w-[45%]">
                    <div className="font-medium truncate">{t.title}</div>
                    {t.description && <div className="text-xs text-gray-500 truncate">{t.description}</div>}
                  </td>
                  <td className="px-3 py-3 align-top">
                    {(() => {
                      const matchedCategory = getCategory(t.category);
                      const categoryName = matchedCategory?.name || t.category || DEFAULT_TASK_CATEGORY_NAME;
                      const categoryColor = isValidHexColor(matchedCategory?.color || '')
                        ? (matchedCategory?.color as string)
                        : DEFAULT_TASK_CATEGORY_COLOR;
                      const categoryTextColor = getReadableCategoryTextColor(categoryColor);

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
                  <td className="px-3 py-3 align-top">
                    {t.dueDate ? (
                      <div className="text-sm text-gray-700">{new Date(t.dueDate).toLocaleDateString()}</div>
                    ) : (
                      <div className="text-sm text-gray-400">—</div>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top">
                    {t.dueDate ? (
                      (() => {
                        const deadlineStatus = getDeadlineStatus(t);
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
                  <td className="px-3 py-3 align-top text-center">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={t.isCompleted}
                      aria-label={`Mark ${t.title} as ${t.isCompleted ? 'incomplete' : 'completed'}`}
                      onClick={() => onToggleCompletion(t.id, t.isCompleted)}
                      className={`mx-auto h-5 w-5 rounded border transition-all duration-200 flex items-center justify-center ${t.isCompleted
                        ? 'bg-gradient-to-br from-pink-400 to-purple-500 border-transparent text-white shadow-[0_4px_12px_rgba(184,109,214,0.35)]'
                        : 'bg-white border-purple-300 text-transparent hover:border-purple-400'
                        }`}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  </td>
                  <td className="px-3 py-3 align-top text-right">
                    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                      <button
                        onClick={() => toggleSelected(t.id)}
                        className={`px-2 py-1 text-xs rounded border ${selectedIds.has(t.id)
                          ? 'bg-purple-100 border-purple-300 text-purple-700'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                          }`}
                      >
                        {selectedIds.has(t.id) ? 'Selected' : 'Select'}
                      </button>
                      <button onClick={() => onEdit(t)} className="px-2 py-1 text-xs rounded bg-white border hover:bg-gray-50">Edit</button>
                      <button onClick={() => onDelete(t.id)} className="px-2 py-1 text-xs rounded bg-white border hover:bg-gray-50 text-rose-600">Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-3 sm:p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks, description, or category..."
            className="min-h-[40px] flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-300/50 focus:outline-none"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="min-h-[40px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-300/50 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            value={quickFilter}
            onChange={(e) => setQuickFilter(e.target.value as QuickFilter)}
            className="min-h-[40px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-300/50 focus:outline-none"
          >
            <option value="all">All Due States</option>
            <option value="today">Due Today</option>
            <option value="overdue">Overdue</option>
            <option value="week">Due in 7 Days</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleSelectAllFiltered}
            className="px-3 py-1.5 text-sm rounded-lg bg-white border border-gray-200 hover:bg-gray-50"
          >
            {allFilteredSelected ? 'Unselect filtered' : 'Select filtered'}
          </button>
          <span className="text-sm text-gray-600">{selectedIds.size} selected</span>
          <button
            type="button"
            disabled={selectedPendingIds.length === 0 || isBulkRunning}
            onClick={() => runBulk(() => onBulkSetCompletion(selectedPendingIds, true))}
            className="px-3 py-1.5 text-sm rounded-lg bg-purple-600 text-white disabled:opacity-50"
          >
            Complete selected
          </button>
          <button
            type="button"
            disabled={selectedCompletedIds.length === 0 || isBulkRunning}
            onClick={() => runBulk(() => onBulkSetCompletion(selectedCompletedIds, false))}
            className="px-3 py-1.5 text-sm rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
          >
            Move selected to pending
          </button>
          <button
            type="button"
            disabled={selectedIds.size === 0 || isBulkRunning}
            onClick={() => setIsBulkDeleteConfirmOpen(true)}
            className="px-3 py-1.5 text-sm rounded-lg bg-rose-600 text-white disabled:opacity-50"
          >
            Delete selected
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-pink-600 mb-3 sm:mb-4">
          Pending Tasks ({filteredPendingTasks.length})
        </h2>
        {renderTable(pendingPaged, 'No pending tasks. Great job, everything is complete.', 'pink')}
        <div className="flex items-center justify-between px-3 py-2 border border-t-0 border-pink-200 rounded-b-lg bg-pink-600 text-white">
          <div className="flex items-center gap-2 text-sm text-white">
            <span>Page {pendingPage} of {pendingTotalPages}</span>
            <select
              value={pendingPageSize}
              onChange={(e) => {
                setPendingPageSize(Number(e.target.value));
                setPendingPage(1);
              }}
              className="border border-white/50 bg-white/95 text-pink-700 rounded px-2 py-1 text-sm"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPendingPage((p) => Math.max(1, p - 1))}
              disabled={pendingPage === 1}
              className="px-3 py-1 bg-white/95 text-pink-700 border border-white/60 rounded disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={() => setPendingPage((p) => Math.min(pendingTotalPages, p + 1))}
              disabled={pendingPage === pendingTotalPages}
              className="px-3 py-1 bg-white/95 text-pink-700 border border-white/60 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-purple-700 mb-3 sm:mb-4">
          Completed Tasks ({filteredCompletedTasks.length})
        </h2>
        {renderTable(completedPaged, 'No completed tasks yet.', 'purple')}
        <div className="flex items-center justify-between px-3 py-2 border border-t-0 border-purple-200 rounded-b-lg bg-purple-600 text-white">
          <div className="flex items-center gap-2 text-sm text-white">
            <span>Page {completedPage} of {completedTotalPages}</span>
            <select
              value={completedPageSize}
              onChange={(e) => {
                setCompletedPageSize(Number(e.target.value));
                setCompletedPage(1);
              }}
              className="border border-white/50 bg-white/95 text-purple-700 rounded px-2 py-1 text-sm"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCompletedPage((p) => Math.max(1, p - 1))}
              disabled={completedPage === 1}
              className="px-3 py-1 bg-white/95 text-purple-700 border border-white/60 rounded disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={() => setCompletedPage((p) => Math.min(completedTotalPages, p + 1))}
              disabled={completedPage === completedTotalPages}
              className="px-3 py-1 bg-white/95 text-purple-700 border border-white/60 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {isBulkDeleteConfirmOpen &&
        createPortal(
          <div className="fixed inset-0 bg-gradient-to-b from-slate-950/35 via-purple-900/20 to-fuchsia-900/30 backdrop-blur-[2px] flex items-center justify-center z-[9999] p-4">
            <div className="modal-enter max-w-sm w-full max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-rose-100/80 bg-white/95 backdrop-blur-xl p-5 sm:p-6 shadow-[0_24px_56px_rgba(244,63,94,0.22)]">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 border border-rose-200">
                <RefreshCw className="h-6 w-6 text-rose-600" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 text-center">Delete selected tasks?</h3>
              <p className="text-gray-700 text-sm text-center mb-6">
                Are you sure you want to delete <strong>{selectedIds.size}</strong> selected task(s)? This action cannot be undone.
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
                  onClick={() =>
                    runBulk(async () => {
                      await onBulkDelete(Array.from(selectedIds));
                      setIsBulkDeleteConfirmOpen(false);
                    })
                  }
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
