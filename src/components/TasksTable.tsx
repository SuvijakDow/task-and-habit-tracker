import { useMemo, useState } from 'react';
import { Task, Category } from '@/types';
import { CalendarDays } from 'lucide-react';

const DEFAULT_TASK_CATEGORY_NAME = 'Personal';
const DEFAULT_TASK_CATEGORY_COLOR = '#C4B5FD';
const COLOR_HEX_REGEX = /^#[0-9A-F]{6}$/i;

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
}

export default function TasksTable({ tasks, categories, onToggleCompletion, onEdit, onDelete }: Props) {
  const [pendingPage, setPendingPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const [pendingPageSize, setPendingPageSize] = useState(10);
  const [completedPageSize, setCompletedPageSize] = useState(10);

  const getCategory = (taskCategory: string) =>
    categories.find((c) => c.id === taskCategory || c.name === taskCategory);

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

  const pendingTotalPages = Math.max(1, Math.ceil(pendingTasks.length / pendingPageSize));
  const completedTotalPages = Math.max(1, Math.ceil(completedTasks.length / completedPageSize));
  const pendingPaged = pendingTasks.slice((pendingPage - 1) * pendingPageSize, pendingPage * pendingPageSize);
  const completedPaged = completedTasks.slice((completedPage - 1) * completedPageSize, completedPage * completedPageSize);

  const renderTable = (
    rows: Task[],
    emptyText: string
  ) => (
    <div className="overflow-x-auto bg-white border border-gray-100 rounded-lg shadow-sm">
      <table className="min-w-[940px] w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Title</th>
            <th className="px-3 py-2 text-left font-semibold">Category</th>
            <th className="px-3 py-2 text-left font-semibold">
              <span className="inline-flex items-center gap-2">
                Due
                <CalendarDays className="h-4 w-4 text-purple-600" />
              </span>
            </th>
            <th className="px-3 py-2 text-center font-semibold">Done</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
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
                    <div className="inline-flex items-center gap-2 flex-wrap">
                      <div className="text-sm text-gray-700">{new Date(t.dueDate).toLocaleDateString()}</div>
                      {(() => {
                        const deadlineStatus = getDeadlineStatus(t);
                        return deadlineStatus ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${deadlineStatus.className}`}>
                            {deadlineStatus.text}
                          </span>
                        ) : null;
                      })()}
                    </div>
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
                    className={`mx-auto h-5 w-5 rounded border transition-all duration-200 flex items-center justify-center ${
                      t.isCompleted
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
                  <div className="flex items-center justify-end gap-2">
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
          Pending Tasks ({pendingTasks.length})
        </h2>
        {renderTable(pendingPaged, 'No pending tasks. Great job, everything is complete.')}
        <div className="flex items-center justify-between px-3 py-2 border border-t-0 border-gray-100 rounded-b-lg bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Page {pendingPage} of {pendingTotalPages}</span>
            <select
              value={pendingPageSize}
              onChange={(e) => {
                setPendingPageSize(Number(e.target.value));
                setPendingPage(1);
              }}
              className="border rounded px-2 py-1 text-sm"
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
              className="px-3 py-1 bg-white border rounded disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={() => setPendingPage((p) => Math.min(pendingTotalPages, p + 1))}
              disabled={pendingPage === pendingTotalPages}
              className="px-3 py-1 bg-white border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
          Completed Tasks ({completedTasks.length})
        </h2>
        {renderTable(completedPaged, 'No completed tasks yet.')}
        <div className="flex items-center justify-between px-3 py-2 border border-t-0 border-gray-100 rounded-b-lg bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Page {completedPage} of {completedTotalPages}</span>
            <select
              value={completedPageSize}
              onChange={(e) => {
                setCompletedPageSize(Number(e.target.value));
                setCompletedPage(1);
              }}
              className="border rounded px-2 py-1 text-sm"
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
              className="px-3 py-1 bg-white border rounded disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={() => setCompletedPage((p) => Math.min(completedTotalPages, p + 1))}
              disabled={completedPage === completedTotalPages}
              className="px-3 py-1 bg-white border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
