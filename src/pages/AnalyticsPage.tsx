import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserDailyHabits, calculateStreak, calculateConsistency, getPast7DaysStatus, getDayAbbreviation } from '@/services/habitService';
import { DailyHabit } from '@/types';

export function AnalyticsPage() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<DailyHabit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchHabits = async () => {
      try {
        setLoading(true);
        const fetchedHabits = await getUserDailyHabits(user.uid);
        // Sort habits by order field to match Habits page
        const sortedHabits = fetchedHabits.sort((a, b) => {
          const orderA = (a as any).order ?? Infinity;
          const orderB = (b as any).order ?? Infinity;
          return orderA - orderB;
        });
        setHabits(sortedHabits);
      } catch (error) {
        console.error('Error fetching habits:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHabits();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (habits.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <div className="text-purple-300 text-5xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No habits yet</h3>
          <p className="text-gray-600">
            Create a habit first to see analytics!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6 md:mb-8">
        📊 Habit Analytics
      </h1>

      <div className="space-y-4 md:space-y-6">
        {habits.map((habit) => {
          const scheduledDays = (habit as any).scheduledDays || [0, 1, 2, 3, 4, 5, 6];
          const streak = calculateStreak(habit.completedDates, scheduledDays);
          const totalCompletions = habit.completedDates.length;
          const consistency = calculateConsistency(habit.completedDates, scheduledDays, habit.createdAt);
          const past7Days = getPast7DaysStatus(habit.completedDates);

          return (
            <div
              key={habit.id}
              className="bg-white rounded-lg shadow-md p-4 md:p-6 hover:shadow-lg transition-shadow"
            >
              {/* Habit Title */}
              <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-4 truncate">
                {habit.title}
              </h2>

              {/* Stats Row */}
              <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
                {/* Current Streak */}
                <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-3 md:p-4">
                  <p className="text-gray-600 text-xs md:text-sm font-medium">Current Streak</p>
                  <p className="text-2xl md:text-3xl font-bold text-orange-600 mt-1">
                    🔥 {streak}
                  </p>
                  <p className="text-gray-500 text-xs md:text-sm mt-1">
                    {streak === 1 ? 'day' : 'days'}
                  </p>
                </div>

                {/* Total Completions */}
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-3 md:p-4">
                  <p className="text-gray-600 text-xs md:text-sm font-medium">Total Completions</p>
                  <p className="text-2xl md:text-3xl font-bold text-purple-600 mt-1">
                    ✨ {totalCompletions}
                  </p>
                  <p className="text-gray-500 text-xs md:text-sm mt-1">
                    {totalCompletions === 1 ? 'time' : 'times'}
                  </p>
                </div>
              </div>

              {/* 7-Day Visual Calendar */}
              <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                <p className="text-gray-600 text-xs md:text-sm font-medium mb-3">Last 7 Days</p>
                <div className="flex gap-2 md:gap-3 justify-between">
                  {past7Days.map((day, index) => {
                    const dayOfWeek = new Date(day.date).getDay();
                    const isScheduled = (habit as any).scheduledDays?.includes(dayOfWeek) ?? true;

                    return (
                      <div key={index} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                        {/* Colored Dot */}
                        <div
                          className={`w-6 h-6 md:w-7 md:h-7 rounded-full transition-all ${
                            day.completed
                              ? 'bg-green-400 shadow-md'
                              : !isScheduled
                              ? 'bg-gray-200 opacity-50'
                              : 'bg-gray-300'
                          }`}
                          title={`${day.date}: ${day.completed ? 'Completed' : !isScheduled ? 'Not scheduled' : 'Missed'}`}
                        />
                        {/* Day Label */}
                        <span className="text-gray-600 text-xs md:text-sm font-medium">
                          {getDayAbbreviation(day.date)}
                        </span>
                        {/* Date */}
                        <span className="text-gray-400 text-xs">
                          {day.date.split('-')[2]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Completion Rate */}
              <div className="mt-4 md:mt-6 bg-blue-50 rounded-lg p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <p className="text-gray-600 text-xs md:text-sm font-medium">Overall Consistency</p>
                  <span className="text-sm md:text-base font-semibold text-blue-600">
                    {consistency}%
                  </span>
                </div>
                {/* Progress Bar */}
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${consistency}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
