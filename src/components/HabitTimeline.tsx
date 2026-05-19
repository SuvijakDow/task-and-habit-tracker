import React, { useMemo } from 'react';
import { DailyHabit } from '@/types';
import { formatToDateString } from '@/utils/dateUtils';
import { timeToMinutes } from '@/services/habitService';

interface HabitTimelineProps {
  habits: DailyHabit[];
  getHabitColor: (habitId: string) => string;
  onEditHabit?: (habitId: string, title: string, scheduledDays: number[], startTime: string, endTime: string) => void;
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
    const timeSlots: Map<string, number[]> = new Map();

    // Group habits by time slot
    sortedHabits.forEach((habit, index) => {
      const startMin = timeToMinutes(habit.startTime);
      const endMin = timeToMinutes(habit.endTime);
      const key = `${startMin}-${endMin}`;

      if (!timeSlots.has(key)) {
        timeSlots.set(key, []);
      }
      timeSlots.get(key)!.push(index);
    });

    // Assign column positions
    sortedHabits.forEach((habit, index) => {
      const startMin = timeToMinutes(habit.startTime);
      const endMin = timeToMinutes(habit.endTime);
      
      // Find overlapping habits
      let maxColumn = 0;
      sortedHabits.forEach((other, otherIndex) => {
        if (index !== otherIndex) {
          const otherStart = timeToMinutes(other.startTime);
          const otherEnd = timeToMinutes(other.endTime);
          
          // Check overlap
          if (startMin < otherEnd && endMin > otherStart) {
            if (otherIndex < index) maxColumn++;
          }
        }
      });

      // Count total overlapping
      let totalColumns = 1;
      sortedHabits.forEach((other, otherIndex) => {
        if (index !== otherIndex) {
          const otherStart = timeToMinutes(other.startTime);
          const otherEnd = timeToMinutes(other.endTime);
          
          if (startMin < otherEnd && endMin > otherStart) {
            totalColumns = Math.max(totalColumns, 2);
          }
        }
      });

      positioned.push({
        ...habit,
        index,
        column: maxColumn,
        totalColumns,
      });
    });

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
          <div className="w-12 flex-shrink-0 pt-4">
            {Array.from({ length: timeRange.endHour - timeRange.startHour }).map((_, i) => {
              const hour = timeRange.startHour + i;
              return (
                <div
                  key={`label-${hour}`}
                  className="h-16 flex items-start justify-end pr-2 text-xs font-medium text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700"
                >
                  {String(hour).padStart(2, '0')}:00
                </div>
              );
            })}
          </div>

          {/* Timeline grid */}
          <div
            className="flex-grow relative bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
            style={{ minHeight: `${(timeRange.endHour - timeRange.startHour) * 64}px` }}
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
                    height: '64px',
                  }}
                />
              );
            })}

            {/* Habit blocks */}
            {positionedHabits.map((habit) => {
              const { topPercent, heightPercent, leftPercent, widthPercent } = getHabitPosition(habit);
              const isCompleted = habit.completedDates.includes(todayDateStr);

              return (
                <div
                  key={habit.id}
                  className={`absolute cursor-pointer transition-all hover:shadow-lg hover:z-20 ${
                    isCompleted ? 'opacity-60' : 'opacity-100'
                  }`}
                  style={{
                    top: `${topPercent}%`,
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                    height: `${Math.max(heightPercent, 5)}%`,
                    minHeight: '40px',
                  }}
                  onClick={() => {
                    if (onEditHabit) {
                      onEditHabit(
                        habit.id,
                        habit.title,
                        habit.scheduledDays,
                        habit.startTime,
                        habit.endTime
                      );
                    }
                  }}
                  title={`${habit.title} (${habit.startTime}-${habit.endTime})`}
                >
                  <div
                    className={`w-full h-full rounded-md p-2 flex flex-col justify-center border-l-4 border-slate-300 dark:border-slate-600 ${getHabitColor(
                      habit.id
                    )}`}
                  >
                    <p className="text-xs sm:text-sm font-semibold text-white truncate leading-tight">
                      {habit.title}
                    </p>
                    <p className="text-xs text-white/90 truncate leading-tight">
                      {habit.startTime} - {habit.endTime}
                    </p>
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
