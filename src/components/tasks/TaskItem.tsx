import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  Copy,
  ListChecks,
  MoreVertical,
  Pencil,
  Star,
  Trash2,
} from 'lucide-react';
import { Category, Task } from '@/types';
import { formatDueDateDisplay, getDeadlineStatus } from '@/utils/dateUtils';
import {
  getEarliestIncompleteSubtask,
  getEffectiveTaskDueDate,
  sortSubtasksByDueDate,
} from '@/utils/taskUtils';
import { hexToRgba } from '@/utils/colorUtils';
import { resolveCategoryDisplay } from '@/utils/categoryUtils';
import { TaskSmartChip } from '@/components/tasks/TaskSmartChip';
import { NextSubtaskBadge, SubtaskDateControl } from '@/components/tasks/SubtaskDateControl';

export interface TaskItemProps {
  task: Task;
  matchedCategory?: Category;
  onToggleCompletion: (taskId: string, currentStatus: boolean) => void;
  onToggleStar?: (taskId: string, currentStarred: boolean) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onUpdateSubtaskDueDate?: (taskId: string, subtaskId: string, dueDate: string | null) => void;
  onDelete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onDuplicate: (task: Task) => void;
  isToggling: boolean;
}

export const TaskItem = React.memo(function TaskItem({
  task,
  matchedCategory,
  onToggleCompletion,
  onToggleStar,
  onToggleSubtask,
  onUpdateSubtaskDueDate,
  onDelete,
  onEdit,
  onDuplicate,
  isToggling,
}: TaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  const { categoryName, categoryColor, categoryTextColor } = resolveCategoryDisplay(
    matchedCategory,
    task.category
  );

  const subtasks = task.subtasks || [];
  const sortedSubtasks = useMemo(() => sortSubtasksByDueDate(subtasks), [subtasks]);
  const earliestIncompleteSubtask = useMemo(() => getEarliestIncompleteSubtask(task), [task]);
  const totalSubtasks = subtasks.length;
  const completedSubtasks = subtasks.filter((s) => s.isCompleted).length;
  const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const effectiveDueDate = getEffectiveTaskDueDate(task);
  const effectiveDeadlineStatus = getDeadlineStatus(effectiveDueDate);
  const deadlineType =
    !task.isCompleted && effectiveDeadlineStatus ? effectiveDeadlineStatus.type : 'normal';

  let borderStyleClass = 'border border-white/70 bg-white/90 hover:border-purple-200';
  if (deadlineType === 'overdue') {
    borderStyleClass =
      'border-2 border-rose-500/90 bg-white/95 shadow-[0_4px_20px_rgba(244,63,94,0.12)]';
  } else if (deadlineType === 'today') {
    borderStyleClass =
      'border-2 border-amber-400/95 bg-white/95 shadow-[0_4px_20px_rgba(245,158,11,0.12)]';
  }

  return (
    <div
      className={`group glass-card ${!isMobileMenuOpen ? 'perf-list-item' : ''} ${borderStyleClass} ${
        task.isCompleted ? 'opacity-80' : ''
      } transition-[box-shadow,transform,opacity,border-color] duration-150 sm:hover:shadow-xl relative py-3 sm:py-4 px-3 sm:px-6 flex flex-col gap-2`}
    >
      {isToggling && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-purple-50/70 to-pink-50/70 backdrop-blur-[3px] rounded-lg sm:rounded-xl flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 border-4 border-purple-200 rounded-full" />
              <div className="absolute top-0 left-0 w-8 h-8 border-4 border-transparent border-t-purple-500 border-r-pink-500 rounded-full animate-spin" />
            </div>
            <span className="text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Updating...
            </span>
          </div>
        </div>
      )}

      {/* Row 1: Checkbox + Title & Description & Action Buttons */}
      <div className="flex items-center gap-2.5 sm:gap-3 w-full">
        <div className="w-6 sm:w-7 flex items-center justify-center shrink-0">
          <button
            type="button"
            role="checkbox"
            aria-checked={task.isCompleted}
            aria-label={`Mark ${task.title} as ${task.isCompleted ? 'incomplete' : 'completed'}`}
            onClick={() => onToggleCompletion(task.id, task.isCompleted)}
            disabled={isToggling}
            className={`h-5 w-5 sm:h-6 sm:w-6 aspect-square rounded-lg border-2 transition-all duration-200 flex items-center justify-center shrink-0 shadow-2xs ${
              task.isCompleted
                ? 'bg-gradient-to-br from-pink-400 to-purple-500 border-transparent text-white shadow-[0_6px_16px_rgba(184,109,214,0.45)]'
                : 'bg-purple-50/90 border-purple-400/90 text-transparent hover:border-purple-600 hover:bg-purple-100/90'
            } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isToggling ? (
              <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`font-medium text-sm sm:text-base md:text-lg break-words leading-tight ${
                task.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'
              }`}
            >
              {task.title}
            </span>

            {/* Desktop Action Buttons */}
            <div className="hidden sm:flex flex-shrink-0 flex-row items-center gap-1 sm:gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit(task)}
                className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-transparent hover:bg-white/80 text-gray-500 hover:text-blue-600 transition-all flex items-center justify-center"
                title="Edit task"
                aria-label={`Edit ${task.title}`}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
              <button
                onClick={() => onDuplicate(task)}
                className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-transparent hover:bg-white/80 text-gray-500 hover:text-purple-600 transition-all flex items-center justify-center"
                title="Duplicate task"
                aria-label={`Duplicate ${task.title}`}
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(task.id)}
                className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-transparent hover:bg-white/80 text-gray-500 hover:text-red-600 transition-all flex items-center justify-center"
                title="Delete task"
                aria-label={`Delete ${task.title}`}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {/* Mobile 3-Dots Action Menu */}
            <div className="relative sm:hidden flex-shrink-0" ref={mobileMenuRef}>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                className="h-7 w-7 rounded-full hover:bg-purple-100/70 text-gray-400 hover:text-purple-600 transition-all flex items-center justify-center"
                title="More actions"
                aria-label="More actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isMobileMenuOpen && (
                <div className="absolute right-0 top-8 z-30 w-36 rounded-xl bg-white/95 backdrop-blur-md border border-purple-100 shadow-xl py-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onEdit(task);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 text-gray-700 hover:bg-purple-50 hover:text-purple-700 font-semibold transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5 text-blue-500" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onDuplicate(task);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 text-gray-700 hover:bg-purple-50 hover:text-purple-700 font-semibold transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-purple-500" />
                    <span>Duplicate</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onDelete(task.id);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 text-rose-600 hover:bg-rose-50 font-semibold transition-colors border-t border-gray-100"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {task.description && (
            <p
              className={`text-xs sm:text-sm text-gray-500 break-words max-w-full leading-snug ${
                task.isCompleted ? 'opacity-60' : ''
              }`}
              title={task.description}
            >
              {task.description}
            </p>
          )}
        </div>
      </div>

      {/* Row 2: Star Button + Category & Due Date Badges */}
      <div className="flex items-center gap-2.5 sm:gap-3 w-full">
        <div className="w-6 sm:w-7 flex items-center justify-center shrink-0">
          {onToggleStar && (
            <button
              type="button"
              onClick={() => onToggleStar(task.id, Boolean(task.isStarred))}
              className={`h-5 w-5 sm:h-6 sm:w-6 rounded-full transition-all flex items-center justify-center shrink-0 shadow-2xs ${
                task.isStarred
                  ? 'bg-amber-100/90 border border-amber-300'
                  : 'bg-amber-50/80 hover:bg-amber-100 border border-amber-200/90'
              }`}
              title={task.isStarred ? 'Unstar task' : 'Star task'}
              aria-label={task.isStarred ? `Unstar ${task.title}` : `Star ${task.title}`}
            >
              <Star
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-150 ${
                  task.isStarred
                    ? 'fill-amber-400 text-amber-500 drop-shadow-[0_2px_6px_rgba(245,158,11,0.45)] scale-105'
                    : 'text-amber-500/80 hover:text-amber-600'
                }`}
              />
            </button>
          )}
        </div>

        <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-2.5 flex-1 min-w-0">
          <span
            className="inline-flex items-center text-[9px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-md border"
            style={{
              backgroundColor: hexToRgba(categoryColor, 0.3),
              color: categoryTextColor,
              borderColor: hexToRgba(categoryColor, 0.65),
            }}
          >
            {categoryName}
          </span>

          {task.dueDate && (
            <span className="inline-flex items-center gap-1 text-[9px] sm:text-xs font-medium px-2 py-0.5 rounded-md bg-purple-50/90 text-purple-700 border border-purple-200/70">
              <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600" />
              <span className="sm:whitespace-nowrap">{formatDueDateDisplay(task.dueDate)}</span>
            </span>
          )}

          {(() => {
            const deadlineStatus = getDeadlineStatus(task.dueDate);
            return deadlineStatus ? (
              <span
                className={`inline-flex items-center text-[9px] sm:text-xs font-semibold px-2 py-0.5 rounded-md border ${deadlineStatus.className}`}
              >
                {deadlineStatus.text}
              </span>
            ) : null;
          })()}

          {task.linkChip?.url && <TaskSmartChip chip={task.linkChip} />}

          {totalSubtasks > 0 && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-semibold bg-purple-50/90 text-purple-700 border border-purple-200/70 hover:bg-purple-100/80 transition cursor-pointer shadow-2xs"
            >
              <ListChecks className="w-3.5 h-3.5 text-purple-600" />
              <span>
                Subtasks {completedSubtasks}/{totalSubtasks}
              </span>
              <div className="w-10 sm:w-16 h-1.5 bg-purple-200/80 rounded-full overflow-hidden ml-0.5">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-purple-600 ml-0.5">{progressPercent}%</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-purple-500 transition-transform duration-200 ${
                  isExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>
          )}

          {!task.isCompleted && earliestIncompleteSubtask?.dueDate && (
            <NextSubtaskBadge
              subtask={earliestIncompleteSubtask}
              onClick={() => setIsExpanded(!isExpanded)}
            />
          )}
        </div>
      </div>

      {/* Expandable Subtask Checklist Box */}
      {totalSubtasks > 0 && isExpanded && (
        <div className="mt-3 p-3.5 sm:p-4 rounded-2xl bg-purple-100/70 border border-purple-200/90 shadow-sm space-y-2.5 w-full">
          <div className="flex items-center justify-between text-xs font-semibold text-purple-900/80 px-1 pb-1.5 border-b border-purple-200/70">
            <span className="flex items-center gap-1.5 font-bold text-purple-900">
              <ListChecks className="w-4 h-4 text-purple-700" />
              Subtasks Progress
            </span>
            <span className="font-semibold text-purple-800 bg-white/80 border border-purple-200 px-2 py-0.5 rounded-full text-[11px]">
              {completedSubtasks}/{totalSubtasks} ({progressPercent}%)
            </span>
          </div>
          <div className="space-y-1.5 pt-0.5">
            {sortedSubtasks.map((st) => {
              const isNextUp =
                !task.isCompleted &&
                !st.isCompleted &&
                earliestIncompleteSubtask?.id === st.id &&
                Boolean(st.dueDate);
              return (
                <div
                  key={st.id}
                  onClick={() => onToggleSubtask?.(task.id, st.id)}
                  className={`flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/90 hover:bg-white border transition cursor-pointer shadow-2xs group/st ${
                    isNextUp ? 'border-purple-300/90 ring-1 ring-purple-200/60' : 'border-purple-100/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={st.isCompleted}
                      className={`h-4 w-4 rounded-md border-2 transition duration-150 flex items-center justify-center shrink-0 shadow-2xs ${
                        st.isCompleted
                          ? 'bg-gradient-to-br from-pink-400 to-purple-500 border-transparent text-white shadow-xs'
                          : 'bg-purple-50/90 border-purple-400/90 text-transparent group-hover/st:border-purple-600'
                      }`}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <span
                      className={`text-xs sm:text-sm break-words flex-1 min-w-0 ${
                        st.isCompleted ? 'line-through text-gray-400' : 'text-gray-800 font-medium'
                      }`}
                    >
                      {st.title}
                    </span>
                  </div>

                  <SubtaskDateControl
                    variant="checklist"
                    dueDate={st.dueDate}
                    isCompleted={st.isCompleted}
                    onChange={(newDate) => onUpdateSubtaskDueDate?.(task.id, st.id, newDate)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});
