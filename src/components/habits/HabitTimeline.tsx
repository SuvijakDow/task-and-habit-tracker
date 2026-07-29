import React, { useMemo } from 'react';
import { DailyHabit } from '@/types';
import { formatToDateString } from '@/utils/dateUtils';
import { timeToMinutes } from '@/services/habitService';

interface HabitTimelineProps {
  habits: DailyHabit[];
  getHabitColor: (habitId: string) => string;
  onEditHabit?: (habit: DailyHabit) => void;
}

interface PositionedHabit extends DailyHabit {
  index: number;
  column: number;
  totalColumns: number;
}

export const HabitTimeline: React.FC<HabitTimelineProps> = ({
  habits,
  getHabitColor,
  onEditHabit,
}) => {
  const today = new Date();
  const todayDayOfWeek = today.getDay();
  const todayDateStr = formatToDateString(today);

  // Filter habits that are scheduled for today
  const todaysHabits = useMemo(() => {
    return habits.filter((habit) => habit.scheduledDays.includes(todayDayOfWeek));
  }, [habits, todayDayOfWeek]);

  // Sort habits by start time
  const sortedHabits = useMemo(() => {
    return [...todaysHabits].sort(
      (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );
  }, [todaysHabits]);

  // Calculate time range (min and max hours with ±1 hour buffer)
  const timeRange = useMemo(() => {
    if (sortedHabits.length === 0) {
      return { startHour: 9, endHour: 10 };
    }

    const times = sortedHabits.flatMap((habit) => [
      timeToMinutes(habit.startTime),
      timeToMinutes(habit.endTime),
    ]);

    const minMinutes = Math.min(...times);
    const maxMinutes = Math.max(...times);

    let startHour = Math.max(0, Math.floor((minMinutes - 60) / 60));
    let endHour = Math.min(24, Math.ceil((maxMinutes + 60) / 60));

    // Ensure at least 4 hours of display
    if (endHour - startHour < 4) {
      const midHour = Math.floor((startHour + endHour) / 2);
      startHour = Math.max(0, midHour - 2);
      endHour = Math.min(24, midHour + 2);
    }

    return { startHour, endHour };
  }, [sortedHabits]);

  // Calculate positions for overlapping habits
  const positionedHabits = useMemo(() => {
    const positioned: PositionedHabit[] = [];
    const columns: number[] = new Array(sortedHabits.length).fill(-1);

    // Assign the lowest available column
    for (let i = 0; i < sortedHabits.length; i++) {
      const habit = sortedHabits[i];
      const startMin = timeToMinutes(habit.startTime);
      const endMin = timeToMinutes(habit.endTime);
      
      const takenColumns = new Set<number>();
      for (let j = 0; j < i; j++) {
        const other = sortedHabits[j];
        const otherStart = timeToMinutes(other.startTime);
        const otherEnd = timeToMinutes(other.endTime);
        
        if (startMin < otherEnd && endMin > otherStart) {
          takenColumns.add(columns[j]);
        }
      }
      
      let col = 0;
      while (takenColumns.has(col)) {
        col++;
      }
      columns[i] = col;
    }

    // Calculate total columns required for each habit's group
    for (let i = 0; i < sortedHabits.length; i++) {
      const habit = sortedHabits[i];
      const startMin = timeToMinutes(habit.startTime);
      const endMin = timeToMinutes(habit.endTime);
      
      let maxColInGroup = columns[i];
      for (let j = 0; j < sortedHabits.length; j++) {
        const other = sortedHabits[j];
        const otherStart = timeToMinutes(other.startTime);
        const otherEnd = timeToMinutes(other.endTime);
        
        if (startMin < otherEnd && endMin > otherStart) {
          maxColInGroup = Math.max(maxColInGroup, columns[j]);
        }
      }
      
      positioned.push({
        ...habit,
        index: i,
        column: columns[i],
        totalColumns: maxColInGroup + 1,
      });
    }

    return positioned;
  }, [sortedHabits]);

  const getHabitPosition = (habit: PositionedHabit) => {
    const { startHour, endHour } = timeRange;
    const totalMinutes = (endHour - startHour) * 60;
    
    const startMin = timeToMinutes(habit.startTime);
    const endMin = timeToMinutes(habit.endTime);
    const startHourMin = startHour * 60;

    const topPercent = ((startMin - startHourMin) / totalMinutes) * 100;
    const heightPercent = ((endMin - startMin) / totalMinutes) * 100;
    const leftPercent = (habit.column / Math.max(habit.totalColumns, 1)) * 100;
    const widthPercent = 100 / Math.max(habit.totalColumns, 1);

    return { topPercent, heightPercent, leftPercent, widthPercent };
  };

  if (todaysHabits.length === 0) {
    return (
      <div className="mt-8 p-6 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-4">
          Today's Schedule
        </h3>
        <p className="text-center text-slate-500 dark:text-slate-400 py-8">
          No habits scheduled for today
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 p-4 sm:p-6 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700">
      <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-4">
        Today's Schedule
      </h3>

      {/* Calendar Grid */}
      <div className="relative overflow-x-auto">
        <div className="flex min-w-full">
          {/* Time labels sidebar */}
          <div className="w-12 flex-shrink-0 pt-[1px]">
            {Array.from({ length: timeRange.endHour - timeRange.startHour }).map((_, i) => {
              const hour = timeRange.startHour + i;
              return (
                <div
                  key={`label-${hour}`}
                  className="flex items-start justify-end pr-2 text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700"
                  style={{ height: '84px' }}
                >
                  {String(hour).padStart(2, '0')}:00
                </div>
              );
            })}
          </div>

          {/* Timeline grid */}
          <div
            className="flex-grow relative bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
            style={{ height: `${(timeRange.endHour - timeRange.startHour) * 84 + 2}px` }}
          >
            {/* Hour grid lines */}
            {Array.from({ length: timeRange.endHour - timeRange.startHour }).map((_, i) => {
              const hour = timeRange.startHour + i;
              return (
                <div
                  key={`line-${hour}`}
                  className="absolute left-0 right-0 border-b border-slate-200 dark:border-slate-700"
                  style={{
                    top: `${(i / (timeRange.endHour - timeRange.startHour)) * 100}%`,
                    height: '84px',
                  }}
                />
              );
            })}

            {/* Habit blocks */}
            {positionedHabits.map((habit) => {
              const { topPercent, heightPercent, leftPercent, widthPercent } = getHabitPosition(habit);
              const isCompleted = habit.completedDates.includes(todayDateStr);
              const habitColor = getHabitColor(habit.id);
              const isHex = habitColor.startsWith('#');
              const sMin = timeToMinutes(habit.startTime);
              const eMin = timeToMinutes(habit.endTime);
              const durationMins = Math.max(1, eMin - sMin);

              return (
                <div
                  key={habit.id}
                  className={`absolute cursor-pointer transition-all hover:shadow-lg hover:z-30 ${
                    isCompleted ? 'opacity-60' : 'opacity-100'
                  }`}
                  style={{
                    top: `calc(${topPercent}% + 1px)`,
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                    height: `calc(${heightPercent}% - 2px)`,
                    minHeight: '30px',
                  }}
                  onClick={() => {
                    if (onEditHabit) {
                      onEditHabit(habit);
                    }
                  }}
                  title={`${habit.title}\nTime: ${habit.startTime} - ${habit.endTime}\nClick to edit habit`}
                >
                  <div
                    className={`w-full h-full rounded-lg px-3 py-1.5 flex ${
                      durationMins < 25 ? 'flex-row items-center justify-between' : 'flex-col justify-center'
                    } border-l-4 border-white/80 text-white shadow-sm overflow-hidden ${
                      !isHex ? habitColor : ''
                    }`}
                    style={isHex ? { backgroundColor: habitColor } : undefined}
                  >
                    {durationMins < 25 ? (
                      <>
                        <span className="text-xs font-bold text-white truncate leading-none mr-2">
                          {habit.title}
                        </span>
                        <span className="text-[10px] font-semibold text-white/90 whitespace-nowrap leading-none flex-shrink-0">
                          {habit.startTime} - {habit.endTime}
                        </span>
                      </>
                    ) : (
                      <>
                        <p className="text-xs sm:text-sm font-bold text-white truncate leading-tight">
                          {habit.title}
                        </p>
                        <p className="text-[10px] sm:text-xs font-semibold text-white/90 truncate mt-0.5 leading-tight">
                          {habit.startTime} - {habit.endTime}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Help text */}
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span>●</span>
        <span>Click a habit to edit time</span>
      </div>
    </div>
  );
};
