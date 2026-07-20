import { useMemo, useState } from 'react';
import { Task, Category } from '@/types';
import { CalendarDays } from 'lucide-react';

interface Props {
  tasks: Task[];
  categories: Category[];
  onToggleCompletion: (taskId: string, currentStatus: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export default function TasksTable({ tasks, categories, onToggleCompletion, onEdit, onDelete }: Props) {
  const [sortBy, setSortBy] = useState<'title' | 'category' | 'dueDate' | 'status'>('dueDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const getCategoryName = (taskCategory: string) => {
    const c = categories.find((c) => c.id === taskCategory || c.name === taskCategory);
    return c?.name || taskCategory || 'Personal';
  };

  const sorted = useMemo(() => {
    const copy = [...tasks];
    copy.sort((a, b) => {
      if (sortBy === 'title') {
        const x = a.title.localeCompare(b.title);
        return sortDir === 'asc' ? x : -x;
      }

      if (sortBy === 'category') {
        const x = getCategoryName(a.category).localeCompare(getCategoryName(b.category));
        return sortDir === 'asc' ? x : -x;
      }

      if (sortBy === 'status') {
        const ax = a.isCompleted ? 1 : 0;
        const bx = b.isCompleted ? 1 : 0;
        const x = ax - bx;
        return sortDir === 'asc' ? x : -x;
      }

      // dueDate
      const ad = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const bd = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      const x = ad - bd;
      return sortDir === 'asc' ? x : -x;
    });
    return copy;
  }, [tasks, sortBy, sortDir, categories]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (col: typeof sortBy) => {
    if (col === sortBy) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
    setPage(1);
  };

  return (
    <div className="overflow-x-auto bg-white border border-gray-100 rounded-lg shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left"><button onClick={() => toggleSort('title')} className="font-semibold">Title</button></th>
            <th className="px-3 py-2 text-left hidden md:table-cell"><button onClick={() => toggleSort('category')} className="font-semibold">Category</button></th>
            <th className="px-3 py-2 text-left"><button onClick={() => toggleSort('dueDate')} className="font-semibold flex items-center gap-2">Due <CalendarDays className="h-4 w-4 text-purple-600" /></button></th>
            <th className="px-3 py-2 text-left"><button onClick={() => toggleSort('status')} className="font-semibold">Status</button></th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {paged.map((t) => (
            <tr key={t.id} className="border-t last:border-b hover:bg-gray-50 transition">
              <td className="px-3 py-3 align-top max-w-[40%]">
                <div className="font-medium truncate">{t.title}</div>
                {t.description && <div className="text-xs text-gray-500 truncate">{t.description}</div>}
              </td>
              <td className="px-3 py-3 align-top hidden md:table-cell">
                <div className="text-sm text-gray-700">{getCategoryName(t.category)}</div>
              </td>
              <td className="px-3 py-3 align-top">
                {t.dueDate ? (
                  <div className="text-sm text-gray-700">{new Date(t.dueDate).toLocaleDateString()}</div>
                ) : (
                  <div className="text-sm text-gray-400">—</div>
                )}
              </td>
              <td className="px-3 py-3 align-top">
                <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${t.isCompleted ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                  {t.isCompleted ? 'Completed' : 'Pending'}
                </div>
              </td>
              <td className="px-3 py-3 align-top text-right">
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => onToggleCompletion(t.id, t.isCompleted)} className="px-2 py-1 text-xs rounded bg-white border hover:bg-gray-50">Toggle</button>
                  <button onClick={() => onEdit(t)} className="px-2 py-1 text-xs rounded bg-white border hover:bg-gray-50">Edit</button>
                  <button onClick={() => onDelete(t.id)} className="px-2 py-1 text-xs rounded bg-white border hover:bg-gray-50 text-rose-600">Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center justify-between px-3 py-2 border-t bg-gray-50">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Page {page} of {totalPages}</span>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="border rounded px-2 py-1 text-sm">
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 bg-white border rounded disabled:opacity-50">Prev</button>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 bg-white border rounded disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
}
