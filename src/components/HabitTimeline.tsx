import React, { useMemo } from 'react';
import { DailyHabit } from '@/types';
import { formatToDateString } from '@/utils/dateUtils';
import {
  timeToMinutes,
  minutesToPercent,
  calculateHabitOverlaps,
} from '@/services/habitService';

interface HabitTimelineProps {
  habits: DailyHabit[];
  onEditHabit?: (habitId: string, title: string, scheduledDays: number[], startTime: string, endTime: string) => void;
}

const HABIT_COLORS = [
  'bg-red-400',
  'bg-teal-400',
  'bg-blue-400',
  'bg-orange-400',
  'bg-emerald-300',
  'bg-yellow-400',
  'bg-purple-400',
  'bg-sky-400',
];

export const HabitTimeline: React.FC<HabitTimelineProps> = ({
  habits,
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

  // Calculate overlaps for positioning
  const overlapMap = useMemo(() => {
    return calculateHabitOverlaps(sortedHabits);
  }, [sortedHabits]);

  // Get category color for habit based on index
  const getHabitColor = (index: number) => {
    return HABIT_COLORS[index % HABIT_COLORS.length];
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

      {/* Timeline container */}
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Hour labels */}
          <div className="flex mb-2 relative">
            <div className="w-16 flex-shrink-0"></div>
            <div className="flex-grow relative">
              {Array.from({ length: 24 }).map((_, hour) => (
                <div
                  key={`hour-${hour}`}
                  className="flex-grow text-center text-xs text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700 pl-1"
                  style={{
                    minWidth: '60px',
                  }}
                >
                  {String(hour).padStart(2, '0')}:00
                </div>
              ))}
            </div>
          </div>

          {/* Habit blocks */}
          <div className="space-y-2">
            {sortedHabits.map((habit, index) => {
              const startMin = timeToMinutes(habit.startTime);
              const endMin = timeToMinutes(habit.endTime);
              const durationMin = endMin - startMin;
              const startPercent = minutesToPercent(startMin);
              const durationPercent = minutesToPercent(durationMin);
              const overlapIndex = overlapMap.get(habit.id) || 0;
              const isCompleted = habit.completedDates.includes(todayDateStr);

              return (
                <div key={habit.id} className="flex items-center gap-2">
                  {/* Time label */}
                  <div className="w-16 flex-shrink-0 text-xs font-medium text-slate-600 dark:text-slate-400">
                    {habit.startTime}
                  </div>

                  {/* Timeline block */}
                  <div className="flex-grow relative h-12 bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden">
                    <div
                      className={`absolute top-0 bottom-0 rounded-lg cursor-pointer transition-all hover:shadow-lg hover:scale-y-105 ${getHabitColor(
                        index
                      )} ${isCompleted ? 'opacity-60' : 'opacity-100'} border border-slate-300 dark:border-slate-600`}
                      style={{
                        left: `${startPercent}%`,
                        width: `${Math.max(durationPercent, 2)}%`,
                        marginLeft: `${overlapIndex * 4}%`,
                        marginRight: `${overlapIndex * 2}%`,
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
                      <div className="p-1 h-full flex flex-col justify-center">
                        <p className="text-xs font-semibold text-white truncate">
                          {habit.title}
                        </p>
                        <p className="text-xs text-white opacity-90">
                          {habit.startTime} - {habit.endTime}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time scale guide */}
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>●</span>
            <span>Tap a block to edit time</span>
          </div>
        </div>
      </div>
    </div>
  );
};
