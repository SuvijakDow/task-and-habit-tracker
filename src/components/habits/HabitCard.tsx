import React from 'react';
import { Activity, Clock, Flame, Pencil, Trash2 } from 'lucide-react';
import { DailyHabit } from '@/types';
import { formatScheduledDays } from '@/utils/habitSchedule';

interface HabitCardProps {
  habit: DailyHabit;
  todayDate: string;
  todayDayIndex: number;
  colorHex: string;
  onToggleCompletion: (habitId: string, isCompletedToday: boolean) => void;
  onProgressChange: (habitId: string, newProgress: number) => void;
  onEdit: (habit: DailyHabit) => void;
  onDelete: (habitId: string) => void;
}

export const HabitCard = React.memo(function HabitCard({
  habit,
  todayDate,
  todayDayIndex,
  colorHex,
  onToggleCompletion,
  onProgressChange,
  onEdit,
  onDelete,
}: HabitCardProps) {
  const isCompletedToday = habit.completedDates.includes(todayDate);
  const streak = habit.completedDates.length;
  const isDueToday = habit.scheduledDays.includes(todayDayIndex);

  const cardStyleClass = isCompletedToday
    ? 'bg-gradient-to-r from-emerald-50/60 via-white/80 to-purple-50/40 border border-emerald-200/80'
    : isDueToday
    ? 'bg-gradient-to-r from-purple-50/90 via-white to-pink-50/50 border-l-4 border-l-purple-600 border border-purple-300/90 shadow-md ring-1 ring-purple-400/20'
    : 'bg-white/40 border border-gray-200/60 opacity-65 hover:opacity-100';

  return (
    <div
      className={`glass-card perf-list-item flex flex-col gap-2.5 py-2.5 md:py-4 px-3 sm:px-6 transition-all duration-200 group ${cardStyleClass} hover:shadow-md sm:hover:shadow-2xl`}
    >
      <div className="flex flex-row items-center gap-3 w-full md:w-auto min-w-0">
        <button
          type="button"
          role="checkbox"
          aria-checked={isCompletedToday}
          aria-label={`Mark ${habit.title} as ${isCompletedToday ? 'incomplete' : 'completed'}`}
          onClick={() => onToggleCompletion(habit.id, isCompletedToday)}
          className={`h-4 w-4 sm:h-5 sm:w-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center flex-shrink-0 shadow-2xs ${
            isCompletedToday
              ? 'bg-gradient-to-br from-pink-400 to-purple-500 border-transparent text-white shadow-[0_6px_16px_rgba(184,109,214,0.45)]'
              : 'bg-purple-50/90 border-purple-400/90 text-transparent hover:border-purple-600 hover:bg-purple-100/90'
          }`}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </button>

        <span
          className={`flex-1 truncate text-[13px] sm:text-base md:text-lg font-medium transition-all ${
            isCompletedToday ? 'text-purple-700 line-through opacity-70' : 'text-gray-900'
          }`}
        >
          {habit.title}
        </span>

        {isDueToday && !isCompletedToday && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-2xs shrink-0">
            <Activity className="w-3 h-3 text-amber-300 animate-pulse" /> Today
          </span>
        )}
      </div>

      {/* Quantitative Target Goal Quick Counter & Progress Bar */}
      {habit.targetValue && habit.targetValue > 0 && (() => {
        const currentProgress =
          habit.dailyProgress?.[todayDate] ?? (isCompletedToday ? habit.targetValue : 0);
        const target = habit.targetValue;
        const percent = Math.min(100, Math.round((currentProgress / target) * 100));

        return (
          <div className="flex items-center gap-2 sm:gap-3 py-1 px-2.5 rounded-xl bg-purple-50/70 border border-purple-100/90 shadow-2xs">
            <div className="inline-flex items-center gap-1 bg-white border border-purple-200/90 rounded-lg p-0.5 shadow-2xs shrink-0">
              <button
                type="button"
                onClick={() => onProgressChange(habit.id, currentProgress - 1)}
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-purple-100/80 text-purple-800 font-bold hover:bg-purple-200 flex items-center justify-center transition disabled:opacity-40"
                disabled={currentProgress <= 0}
              >
                -
              </button>
              <div className="flex items-center gap-1 px-1">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={currentProgress === 0 ? '' : currentProgress}
                  placeholder="0"
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    if (raw === '') {
                      onProgressChange(habit.id, 0);
                    } else {
                      const parsed = parseInt(raw, 10);
                      const val = Math.min(target, Math.max(0, parsed));
                      onProgressChange(habit.id, val);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="h-6 text-center text-xs font-bold text-purple-900 bg-purple-50/90 rounded border border-purple-200/80 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-400 px-1 transition-all"
                  style={{ width: `${Math.max(2.2, String(currentProgress).length + 1.6)}ch` }}
                />
                <span className="text-xs font-bold text-purple-900 whitespace-nowrap pl-0.5 pr-1.5">
                  / {target} {habit.targetUnit || ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onProgressChange(habit.id, currentProgress + 1)}
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold hover:opacity-90 flex items-center justify-center transition disabled:opacity-40"
                disabled={currentProgress >= target}
              >
                +
              </button>
            </div>

            <div className="flex-1 h-2 bg-purple-200/70 rounded-full overflow-hidden min-w-[50px]">
              <div
                className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 rounded-full transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>

            <span className="text-[11px] sm:text-xs font-bold text-purple-800 shrink-0">
              {percent}%
            </span>
          </div>
        );
      })()}

      <div className="flex flex-row items-center justify-between w-full gap-3">
        <div className="flex flex-row items-center gap-2 flex-wrap flex-1 min-w-0">
          <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-purple-100/70 border border-purple-200/80 text-[10px] sm:text-xs font-semibold text-purple-700 whitespace-nowrap flex-shrink-0">
            {formatScheduledDays(habit.scheduledDays)}
          </span>

          <div
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg text-white text-[10px] sm:text-xs font-semibold whitespace-nowrap flex-shrink-0 shadow-xs"
            style={{ backgroundColor: colorHex }}
            title={
              habit.customSchedule && Object.keys(habit.customSchedule).length > 0
                ? 'Flexible per-day schedule'
                : undefined
            }
          >
            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white/90" />
            <span>
              {habit.customSchedule && Object.keys(habit.customSchedule).length > 0
                ? 'Flexible Times'
                : `${habit.startTime} - ${habit.endTime}`}
            </span>
          </div>
        </div>

        <div className="flex flex-row items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 text-[10px] sm:text-xs font-medium text-pink-600 mr-1 sm:mr-2">
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-500" />
            <span>{streak}</span>
          </div>

          <button
            type="button"
            onClick={() => onEdit(habit)}
            className="p-1 sm:p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition"
            title="Edit habit"
          >
            <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(habit.id)}
            className="p-1 sm:p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition"
            title="Delete habit"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </div>
  );
});
