import React, { useRef } from 'react';
import { CalendarDays, CornerDownRight, X } from 'lucide-react';
import { Subtask } from '@/types';
import { formatDueDateDisplay, formatShortDueDateDisplay, getDeadlineStatus } from '@/utils/dateUtils';

interface SubtaskDateControlProps {
  dueDate?: string | null;
  isCompleted?: boolean;
  onChange: (newDate: string | null) => void;
  disabled?: boolean;
  /** 'checklist' is used inside the expanded subtask list on task cards; 'modal' is used inside Add/Edit modals; 'input' is used in the new-subtask input bar */
  variant?: 'checklist' | 'modal' | 'input';
}

export const SubtaskDateControl: React.FC<SubtaskDateControlProps> = ({
  dueDate,
  isCompleted = false,
  onChange,
  disabled = false,
  variant = 'checklist',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const hasDate = Boolean(dueDate);
  const shortDate = hasDate ? formatShortDueDateDisplay(dueDate) : '';
  const fullDate = hasDate ? formatDueDateDisplay(dueDate) : '';
  const status = hasDate ? getDeadlineStatus(dueDate) : null;

  const handleOpenPicker = (e: React.MouseEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (disabled) return;
    try {
      (e.currentTarget as any).showPicker?.();
    } catch {
      // Fallback for browsers that do not support showPicker or throw when already open
    }
  };

  if (variant === 'input') {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative inline-flex items-center min-h-[38px] rounded-xl border transition shadow-2xs shrink-0 ${
          hasDate
            ? 'bg-purple-100/90 border-purple-300 text-purple-800 px-2.5 gap-1.5'
            : 'bg-white border-purple-200 text-gray-500 hover:text-purple-700 hover:border-purple-300 px-2.5'
        } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        title={hasDate ? `Subtask due: ${fullDate}` : 'Set subtask due date (optional)'}
      >
        <div className="relative inline-flex items-center gap-1.5 cursor-pointer py-1">
          <CalendarDays className={`w-3.5 h-3.5 shrink-0 ${hasDate ? 'text-purple-700' : 'text-purple-500'}`} />
          {hasDate && <span className="text-xs font-semibold whitespace-nowrap">{shortDate}</span>}
          <input
            ref={inputRef}
            type="date"
            value={dueDate || ''}
            disabled={disabled}
            onClick={handleOpenPicker}
            onChange={(e) => onChange(e.target.value || null)}
            aria-label="Set subtask due date"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        {hasDate && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="relative z-10 p-0.5 -mr-1 rounded-full text-purple-500 hover:text-rose-600 hover:bg-white/80 transition"
            title="Clear subtask due date"
            aria-label="Clear subtask due date"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  if (variant === 'modal') {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center shrink-0"
      >
        {hasDate ? (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition ${
              isCompleted
                ? 'bg-gray-100 text-gray-400 border-gray-200'
                : status?.type === 'overdue'
                ? 'bg-red-50 text-red-600 border-red-200'
                : status?.type === 'today'
                ? 'bg-amber-50 text-amber-600 border-amber-200'
                : 'bg-purple-50 text-purple-700 border-purple-200'
            }`}
            title={`Due: ${fullDate}${status ? ` (${status.text})` : ''}`}
          >
            <span className="relative inline-flex items-center gap-1 cursor-pointer">
              <CalendarDays className="w-3 h-3 shrink-0" />
              <span className="whitespace-nowrap">{shortDate}</span>
              <input
                ref={inputRef}
                type="date"
                value={dueDate || ''}
                disabled={disabled}
                onClick={handleOpenPicker}
                onChange={(e) => onChange(e.target.value || null)}
                aria-label="Change subtask due date"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="relative z-10 p-0.5 -mr-0.5 rounded hover:bg-black/5 text-current opacity-70 hover:opacity-100 transition"
              title="Clear due date"
              aria-label="Clear due date"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ) : (
          <div
            className="relative p-1 rounded text-gray-400 hover:text-purple-700 hover:bg-purple-100/70 transition cursor-pointer"
            title="Set subtask due date"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <input
              ref={inputRef}
              type="date"
              value=""
              disabled={disabled}
              onClick={handleOpenPicker}
              onChange={(e) => onChange(e.target.value || null)}
              aria-label="Set subtask due date"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        )}
      </div>
    );
  }

  // Default: 'checklist' variant (inside TaskItem & TasksTable expanded subtask rows)
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center shrink-0"
    >
      {hasDate ? (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold border transition ${
            isCompleted
              ? 'bg-gray-50 text-gray-400 border-gray-200/80'
              : status?.className || 'bg-purple-50 text-purple-700 border-purple-200'
          }`}
          title={`Subtask due: ${fullDate}${!isCompleted && status ? ` (${status.text})` : ''} — Click to change`}
        >
          <span className="relative inline-flex items-center gap-1 cursor-pointer">
            <CalendarDays className="w-3 h-3 shrink-0 opacity-85" />
            <span className={`whitespace-nowrap ${isCompleted ? 'line-through' : ''}`}>
              {shortDate}
            </span>
            {!isCompleted && status && (
              <>
                <span className="opacity-50">·</span>
                <span className="whitespace-nowrap">{status.shortText}</span>
              </>
            )}
            <input
              ref={inputRef}
              type="date"
              value={dueDate || ''}
              disabled={disabled}
              onClick={handleOpenPicker}
              onChange={(e) => onChange(e.target.value || null)}
              aria-label="Change subtask due date"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="relative z-10 p-0.5 -mr-0.5 rounded-full hover:bg-black/10 text-current opacity-60 hover:opacity-100 transition"
            title="Clear due date"
            aria-label="Clear due date"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ) : (
        <div
          className="relative p-1 rounded-md text-gray-300 hover:text-purple-600 hover:bg-purple-50 sm:opacity-0 sm:group-hover/st:opacity-100 transition cursor-pointer"
          title="Set due date for this subtask"
        >
          <CalendarDays className="w-3.5 h-3.5" />
          <input
            ref={inputRef}
            type="date"
            value=""
            disabled={disabled}
            onClick={handleOpenPicker}
            onChange={(e) => onChange(e.target.value || null)}
            aria-label="Set due date for this subtask"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      )}
    </div>
  );
};

interface NextSubtaskBadgeProps {
  subtask: Subtask;
  onClick?: () => void;
}

/**
 * Compact badge shown on the task card when an incomplete subtask has an upcoming/overdue deadline,
 * so the user immediately sees which subtask needs to be done next and why the task is prioritized.
 */
export const NextSubtaskBadge: React.FC<NextSubtaskBadgeProps> = ({ subtask, onClick }) => {
  if (!subtask.dueDate || subtask.isCompleted) return null;
  const status = getDeadlineStatus(subtask.dueDate);
  const shortDate = formatShortDueDateDisplay(subtask.dueDate);
  const fullDate = formatDueDateDisplay(subtask.dueDate);
  if (!status) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      title={`Next subtask: "${subtask.title}" — Due ${fullDate} (${status.text})`}
      className={`inline-flex items-center gap-1 text-[9px] sm:text-xs font-semibold px-2 py-0.5 rounded-md border transition hover:brightness-95 cursor-pointer max-w-full ${status.className}`}
    >
      <CornerDownRight className="w-3 h-3 shrink-0 opacity-80" />
      <span className="truncate max-w-[95px] sm:max-w-[150px] font-bold">{subtask.title}</span>
      <span className="opacity-60 shrink-0">·</span>
      <span className="hidden sm:inline shrink-0">{shortDate}</span>
      <span className="hidden sm:inline opacity-60 shrink-0">·</span>
      <span className="shrink-0 whitespace-nowrap">{status.shortText}</span>
    </button>
  );
};
