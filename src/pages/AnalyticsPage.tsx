import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Activity, CheckCircle2, TrendingUp, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getUserDailyHabits, calculateStreak, calculateConsistency, getPast7DaysStatus, getDayAbbreviation, resetHabitData } from '@/services/habitService';
import { DailyHabit } from '@/types';

export function AnalyticsPage() {
  const { user, userProfile } = useAuth();
  const [habits, setHabits] = useState<DailyHabit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetTargetHabit, setResetTargetHabit] = useState<DailyHabit | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const userDisplayName = userProfile?.displayName?.trim() || user?.displayName?.trim() || 'there';

  const handleResetConfirm = async () => {
    if (!resetTargetHabit) return;
    try {
      setIsResetting(true);
      await resetHabitData(resetTargetHabit.id);
      await loadAnalytics(); // Reload after reset
    } catch (err) {
      console.error('Error resetting habit:', err);
    } finally {
      setIsResetting(false);
      setResetTargetHabit(null);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getDaysAgoText = (startDate: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '(Started today)';
    if (diffDays === 1) return '(1 day ago)';
    return `(${diffDays} days ago)`;
  };

  const loadAnalytics = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const fetchedHabits = await getUserDailyHabits(user.uid);
      // Sort habits by order field to match Habits page
      const sortedHabits = fetchedHabits.sort((a, b) => {
        const orderA = (a as any).order ?? Infinity;
        const orderB = (b as any).order ?? Infinity;
        return orderA - orderB;
      });
      setHabits(sortedHabits);
    } catch (loadError) {
      setError('Could not load analytics. Refresh and try again.');
      console.error('Error fetching habits:', loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setHabits([]);
      setError(null);
      setLoading(false);
      return;
    }

    loadAnalytics();
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Please Sign In</h2>
          <p className="text-gray-600">Sign in to view your analytics.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-3 sm:px-6 pt-3 md:pt-6 pb-6 md:pb-12">
        <div className="glass-card p-5 sm:p-8 md:p-12 text-center">
          <div className="flex justify-center mb-3">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600">Loading your analytics...</p>
        </div>
      </div>
    );
  }

  if (error && habits.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 md:pt-6 pb-8 md:pb-12">
        <div className="glass-card p-8 md:p-12 text-center">
          <div className="flex justify-center mb-4">
            <TrendingUp className="h-12 w-12 text-rose-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Analytics unavailable</h3>
          <p className="text-gray-600 mb-5">{error}</p>
          <button
            type="button"
            onClick={loadAnalytics}
            className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold hover:from-purple-700 hover:to-pink-600 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (habits.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 md:pt-6 pb-8 md:pb-12">
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
    <div className="max-w-3xl mx-auto px-3 sm:px-6 pt-3 md:pt-6 pb-6 md:pb-12">
      <div className="mb-6">
        <h1 className="text-xl sm:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-700 to-pink-600">
          Hello, {userDisplayName}
        </h1>
        <p className="mt-1 text-sm sm:text-base text-gray-500 font-medium">Track consistency and momentum over time.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm md:text-base">
          {error}
        </div>
      )}

      <div className="space-y-3 sm:space-y-4 md:space-y-6 list-stagger">
        {habits.map((habit) => {
          const scheduledDays = (habit as any).scheduledDays || [0, 1, 2, 3, 4, 5, 6];
          const streak = calculateStreak(habit.completedDates, scheduledDays);
          const totalCompletions = habit.completedDates.length;
          const startDate = habit.trackingStartDate || habit.createdAt;
          const consistency = calculateConsistency(habit.completedDates, scheduledDays, startDate);
          const past7Days = getPast7DaysStatus(habit.completedDates);

          return (
            <div
              key={habit.id}
              className="glass-card p-4 sm:p-6 md:p-8 md:hover:shadow-2xl md:hover:-translate-y-0.5 transition-all"
            >
              {/* Habit Title & Reset */}
              <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2">
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 truncate">
                    {habit.title}
                  </h2>
                  <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 flex items-center gap-1 font-medium">
                    <span>🗓️</span> Tracking since: {formatDate(habit.trackingStartDate || habit.createdAt)} <span className="text-purple-600/80 ml-0.5">{getDaysAgoText(habit.trackingStartDate || habit.createdAt)}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setResetTargetHabit(habit)}
                  disabled={isResetting}
                  className="flex-shrink-0 p-1.5 sm:p-2 rounded-lg bg-gray-100/80 hover:bg-rose-100 text-gray-400 hover:text-rose-600 transition-colors disabled:opacity-50"
                  title="Reset Habit Data"
                  aria-label={`Reset tracking for ${habit.title}`}
                >
                  <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
                {/* Current Streak */}
                <div className="glass-card p-4 sm:p-6">
                  <p className="text-gray-600 text-xs md:text-sm font-medium">Current Streak</p>
                  <p className="mt-1 inline-flex items-center gap-1.5 sm:gap-2 text-xl sm:text-2xl md:text-3xl font-bold text-orange-600">
                    <Activity className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-pink-500" />
                    <span>{streak}</span>
                  </p>
                  <p className="text-gray-500 text-xs md:text-sm mt-1">
                    {streak === 1 ? 'day' : 'days'}
                  </p>
                </div>

                {/* Total Completions */}
                <div className="glass-card p-4 sm:p-6">
                  <p className="text-gray-600 text-xs md:text-sm font-medium">Total Completions</p>
                  <p className="mt-1 inline-flex items-center gap-1.5 sm:gap-2 text-xl sm:text-2xl md:text-3xl font-bold text-purple-600">
                    <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-purple-500" />
                    <span>{totalCompletions}</span>
                  </p>
                  <p className="text-gray-500 text-xs md:text-sm mt-1">
                    {totalCompletions === 1 ? 'time' : 'times'}
                  </p>
                </div>
              </div>

              {/* 7-Day Mini Bar Chart */}
              <div className="glass-card p-4 sm:p-6">
                <p className="text-gray-600 text-xs md:text-sm font-medium mb-3">Last 7 Days</p>
                <div className="flex gap-1.5 sm:gap-2 md:gap-3 justify-between items-end">
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
                          className="w-full max-w-[30px] sm:max-w-[32px] h-12 sm:h-14 md:h-16 rounded-lg border border-purple-200 bg-white/75 p-1 flex items-end"
                          title={`${day.date}: ${day.completed ? 'Completed' : !isScheduled ? 'Not scheduled' : 'Missed'}`}
                        >
                          <div className={`w-full rounded-md transition-all duration-300 ${barHeightClass} ${barColorClass}`} />
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
              <div className="glass-card mt-3 sm:mt-4 md:mt-6 p-4 sm:p-6">
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

      {resetTargetHabit && createPortal(
        <div className="fixed inset-0 bg-gradient-to-b from-slate-950/35 via-purple-900/20 to-fuchsia-900/30 backdrop-blur-[2px] flex items-center justify-center z-[9999] p-4">
          <div className="modal-enter max-w-sm w-full bg-white/95 backdrop-blur-xl rounded-2xl p-5 sm:p-6 shadow-[0_24px_56px_rgba(244,63,94,0.22)] border border-rose-100/80">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 border border-rose-200">
              <RefreshCw className="h-6 w-6 text-rose-600" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 text-center">Reset Data?</h3>
            <p className="text-gray-700 text-sm text-center mb-6">
              Are you sure you want to reset all tracking data for "<strong>{resetTargetHabit.title}</strong>"?<br/><br/>Your streak and completions will become 0. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setResetTargetHabit(null)}
                disabled={isResetting}
                className="flex-1 px-3 py-2.5 text-sm sm:text-base text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleResetConfirm}
                disabled={isResetting}
                className="flex-1 px-3 py-2.5 text-sm sm:text-base bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-semibold rounded-xl transition disabled:opacity-70 shadow-[0_8px_20px_rgba(243,110,132,0.28)]"
              >
                {isResetting ? 'Resetting...' : 'Reset'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
