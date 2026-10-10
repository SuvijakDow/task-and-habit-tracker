import React, { memo } from 'react';
import { Search, X } from 'lucide-react';
import { Category } from '@/types';
import { QuickFilter } from '@/utils/taskUtils';

interface TasksFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  quickFilter: QuickFilter;
  onQuickFilterChange: (value: QuickFilter) => void;
  categories: Category[];
  totalCount?: number;
  filteredCount?: number;
  onClearFilters?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export const TasksFilterBar = memo(function TasksFilterBar({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  quickFilter,
  onQuickFilterChange,
  categories,
  totalCount,
  filteredCount,
  onClearFilters,
  children,
  className = '',
}: TasksFilterBarProps) {
  const hasActiveFilters =
    Boolean(searchQuery.trim()) || categoryFilter !== 'all' || quickFilter !== 'all';

  return (
    <div className={`glass-card p-2.5 sm:p-4 ${className}`}>
      <div className="flex flex-col lg:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tasks, description, or category..."
            className="w-full min-h-[36px] sm:min-h-[40px] rounded-lg border border-gray-200 bg-white pl-9 pr-8 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-300/50 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600 transition-colors p-1"
              title="Clear search"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 lg:flex lg:flex-row gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
            className="min-h-[36px] sm:min-h-[40px] rounded-lg border border-gray-200 bg-white px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-300/50 focus:outline-none truncate"
            aria-label="Filter by category"
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
            onChange={(e) => onQuickFilterChange(e.target.value as QuickFilter)}
            className="min-h-[36px] sm:min-h-[40px] rounded-lg border border-gray-200 bg-white px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-300/50 focus:outline-none truncate"
            aria-label="Filter by due state"
          >
            <option value="all">All Due States</option>
            <option value="today">Due Today</option>
            <option value="overdue">Overdue</option>
            <option value="week">Due in 7 Days</option>
          </select>
        </div>
      </div>

      {/* Optional Children (e.g. Table view multi-select batch bar) */}
      {children}

      {/* Filter status summary for List view when filters are active without children */}
      {!children && hasActiveFilters && (
        <div className="mt-2.5 pt-2 border-t border-purple-100/60 flex items-center justify-between text-xs text-gray-500">
          <span>
            {filteredCount !== undefined && totalCount !== undefined
              ? `Showing ${filteredCount} of ${totalCount} task${totalCount === 1 ? '' : 's'}`
              : 'Filters active'}
          </span>
          {onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="text-purple-600 hover:text-purple-700 font-semibold hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
});

export default TasksFilterBar;
