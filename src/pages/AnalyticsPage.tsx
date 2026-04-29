import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, TrendingUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getUserDailyHabits, calculateStreak, calculateConsistency, getPast7DaysStatus, getDayAbbreviation } from '@/services/habitService';
import { DailyHabit } from '@/types';

export function AnalyticsPage() {
  const { user, userProfile } = useAuth();
  const [habits, setHabits] = useState<DailyHabit[]>([]);
  const [loading, setLoading] = useState(true);
  const userDisplayName = userProfile?.displayName?.trim() || user?.displayName?.trim() || 'there';

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
      <div className="max-w-3xl mx-auto px-6 pt-4 md:pt-6 pb-8 md:pb-12">
        <div className="glass-card p-8 md:p-12 text-center">
          <div className="flex justify-center mb-4">
            <TrendingUp className="h-12 w-12 text-purple-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No habits yet</h3>
          <p className="text-gray-600">
            Create a habit first to see analytics!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 pt-4 md:pt-6 pb-8 md:pb-12">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-700 to-pink-600">
          Hello, {userDisplayName}
        </h1>
        <p className="mt-1 text-sm sm:text-base text-gray-500 font-medium">Track consistency and momentum over time.</p>
      </div>

      <div className="space-y-4 md:space-y-6 list-stagger">
        {habits.map((habit) => {
          const scheduledDays = (habit as any).scheduledDays || [0, 1, 2, 3, 4, 5, 6];
          const streak = calculateStreak(habit.completedDates, scheduledDays);
          const totalCompletions = habit.completedDates.length;
          const consistency = calculateConsistency(habit.completedDates, scheduledDays, habit.createdAt);
          const past7Days = getPast7DaysStatus(habit.completedDates);

          return (
            <div
              key={habit.id}
              className="glass-card p-6 md:p-8 hover:shadow-2xl hover:-translate-y-0.5 transition-all"
            >
              {/* Habit Title */}
              <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-4 truncate">
                {habit.title}
              </h2>

              {/* Stats Row */}
              <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
                {/* Current Streak */}
                <div className="glass-card p-6">
                  <p className="text-gray-600 text-xs md:text-sm font-medium">Current Streak</p>
                  <p className="mt-1 inline-flex items-center gap-2 text-2xl md:text-3xl font-bold text-orange-600">
                    <Activity className="h-6 w-6 md:h-7 md:w-7 text-pink-500" />
                    <span>{streak}</span>
                  </p>
                  <p className="text-gray-500 text-xs md:text-sm mt-1">
                    {streak === 1 ? 'day' : 'days'}
                  </p>
                </div>

                {/* Total Completions */}
                <div className="glass-card p-6">
                  <p className="text-gray-600 text-xs md:text-sm font-medium">Total Completions</p>
                  <p className="mt-1 inline-flex items-center gap-2 text-2xl md:text-3xl font-bold text-purple-600">
                    <CheckCircle2 className="h-6 w-6 md:h-7 md:w-7 text-purple-500" />
                    <span>{totalCompletions}</span>
                  </p>
                  <p className="text-gray-500 text-xs md:text-sm mt-1">
                    {totalCompletions === 1 ? 'time' : 'times'}
                  </p>
                </div>
              </div>

              {/* 7-Day Mini Bar Chart */}
              <div className="glass-card p-6">
                <p className="text-gray-600 text-xs md:text-sm font-medium mb-3">Last 7 Days</p>
                <div className="flex gap-2 md:gap-3 justify-between items-end">
                  {past7Days.map((day, index) => {
                    const dayOfWeek = new Date(day.date).getDay();
                    const isScheduled = (habit as any).scheduledDays?.includes(dayOfWeek) ?? true;
                    const barHeightClass = day.completed
                      ? 'h-12 md:h-14'
                      : isScheduled
                      ? 'h-4 md:h-5'
                      : 'h-3 md:h-4';
                    const barColorClass = day.completed
                      ? 'bg-gradient-to-t from-purple-600 via-fuchsia-500 to-pink-400 shadow-[0_6px_14px_rgba(167,139,250,0.4)]'
                      : isScheduled
                      ? 'bg-gradient-to-t from-slate-400 to-slate-200 opacity-90'
                      : 'bg-gradient-to-t from-slate-300 to-slate-100 opacity-50';

                    return (
                      <div key={index} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                        <div
                          className="w-full max-w-[32px] h-14 md:h-16 rounded-xl border border-purple-100/70 bg-white/75 p-1 flex items-end"
                          title={`${day.date}: ${day.completed ? 'Completed' : !isScheduled ? 'Not scheduled' : 'Missed'}`}
                        >
                          <div className={`w-full rounded-lg transition-all duration-300 ${barHeightClass} ${barColorClass}`} />
                        </div>
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
              <div className="glass-card mt-4 md:mt-6 p-6">
                <div className="flex items-center justify-between">
                  <p className="text-gray-600 text-xs md:text-sm font-medium">Overall Consistency</p>
                  <span className="text-sm md:text-base font-semibold text-purple-700">
                    {consistency}%
                  </span>
                </div>
                {/* Progress Bar */}
                <div className="mt-3 w-full h-4 md:h-5 rounded-full bg-gradient-to-r from-purple-100/90 via-pink-100/90 to-indigo-100/90 p-1 shadow-inner">
                  <div
                    className="consistency-gradient-animated h-full rounded-full transition-[width] duration-700 ease-out"
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
