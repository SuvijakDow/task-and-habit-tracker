import React, { useState } from 'react';
import { Award, Calendar, CheckCircle2, Clock, Flame, Minus, RefreshCw, Sparkles, TrendingUp, X } from 'lucide-react';
import { DailyHabit, HabitSet, getHabitSetIds } from '@/types';
import { ALL_WEEKDAYS } from '@/constants/defaults';
import { toLocalDate } from '@/utils/dateUtils';
import { getHabitColorHex } from '@/utils/colorUtils';
import { formatScheduledDays } from '@/utils/habitSchedule';
import {
  calculateConsistency,
  calculateStreak,
  calculateTotalCompletions,
  getDayAbbreviation,
  getPast7DaysStatus,
} from '@/utils/habitStats';
import { ContributionHeatmap } from '@/components/habits/ContributionHeatmap';

interface HabitAnalyticsCardProps {
  habit: DailyHabit;
  habits: DailyHabit[];
  habitSets: HabitSet[];
  onRequestReset: (habit: DailyHabit) => void;
  isResetting: boolean;
  onEditHistoryDate: (habit: DailyHabit, dateString: string) => void;
}

const getConsistencyTier = (pct: number) => {
  if (pct >= 80) {
    return {
      label: `Master (${pct}%)`,
      badgeClass: 'bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 text-white shadow-2xs',
      icon: <Award className="w-3.5 h-3.5 text-white" />,
    };
  }
  if (pct >= 50) {
    return {
      label: `High Momentum (${pct}%)`,
      badgeClass: 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-2xs',
      icon: <Flame className="w-3.5 h-3.5 text-white" />,
    };
  }
  return {
    label: `Building Habit (${pct}%)`,
    badgeClass: 'bg-purple-100 text-purple-800 border border-purple-200/90',
    icon: <Sparkles className="w-3.5 h-3.5 text-purple-600" />,
  };
};

export const HabitAnalyticsCard: React.FC<HabitAnalyticsCardProps> = React.memo(
  function HabitAnalyticsCard({
    habit,
    habits,
    habitSets,
    onRequestReset,
    isResetting,
    onEditHistoryDate,
  }) {
    const [showFullHistory, setShowFullHistory] = useState(false);

    const setIds = getHabitSetIds(habit);
    const isPresetActive =
      setIds.length === 0
        ? habitSets[0]
          ? habitSets[0].isActive
          : true
        : setIds.some((id) => {
            const s = habitSets.find((set) => set.id === id);
            return s ? s.isActive : false;
          });

    const rawScheduledDays = habit.scheduledDays || [...ALL_WEEKDAYS];
    const completedDatesList = habit.completedDates || [];
    const streak = calculateStreak(
      completedDatesList,
      rawScheduledDays,
      habit.targetValue,
      habit.dailyProgress,
      habit.notScheduledDates
    );
    const totalCompletions = calculateTotalCompletions(
      completedDatesList,
      habit.targetValue,
      habit.dailyProgress,
      habit.notScheduledDates
    );
    const startDateObj = toLocalDate(habit.trackingStartDate || habit.createdAt) || new Date();
    const consistency = calculateConsistency(
      completedDatesList,
      rawScheduledDays,
      startDateObj,
      habit.targetValue,
      habit.dailyProgress,
      habit.notScheduledDates
    );

    const displayScheduledDays = isPresetActive ? rawScheduledDays : [];
    const past7Days = getPast7DaysStatus(completedDatesList);

    const sinceDateLabel = startDateObj.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const startMidnight = new Date(startDateObj);
    startMidnight.setHours(0, 0, 0, 0);
    const totalDaysTracked = Math.max(
      1,
      Math.floor((todayMidnight.getTime() - startMidnight.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
    const daysAgoLabel = totalDaysTracked === 1 ? '1 day' : `${totalDaysTracked} days`;

    const tier = getConsistencyTier(consistency);

    return (
      <div className="glass-card perf-list-item p-4 sm:p-5 lg:p-6 border border-purple-200/80 rounded-2xl lg:rounded-3xl transition-all duration-300 relative overflow-hidden bg-white/95 backdrop-blur-xl space-y-3.5 lg:space-y-5 shadow-sm hover:shadow-md">
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-2 border-b border-purple-100/70 pb-3 lg:pb-4">
          <div className="flex items-center gap-2.5 lg:gap-3.5 min-w-0">
            <span
              className="w-2.5 h-6 sm:w-3 sm:h-7 lg:w-3.5 lg:h-8 rounded-full shrink-0 shadow-2xs"
              style={{ backgroundColor: getHabitColorHex(habit, habits) }}
            />
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight truncate">
              {habit.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onRequestReset(habit)}
            disabled={isResetting}
            className="shrink-0 p-1.5 lg:p-2 rounded-xl bg-gray-50 hover:bg-rose-50 text-gray-400 hover:text-rose-600 border border-gray-200/70 hover:border-rose-200 transition disabled:opacity-50"
            title="Reset Habit Data"
            aria-label={`Reset tracking for ${habit.title}`}
          >
            <RefreshCw className="h-4 w-4 lg:h-5 lg:w-5" />
          </button>
        </div>

        {/* Meta Pills Bar */}
        <div className="flex items-center gap-1.5 lg:gap-2.5 flex-wrap text-[11px] sm:text-xs lg:text-sm font-medium">
          <span className="bg-purple-50 text-purple-700 border border-purple-200/80 px-2 py-0.5 lg:px-3 lg:py-1 rounded-md lg:rounded-lg font-semibold inline-flex items-center gap-1 lg:gap-1.5">
            <Calendar className="w-3 h-3 lg:w-4 lg:h-4 text-purple-500" />
            {formatScheduledDays(rawScheduledDays)}
          </span>

          <span className="bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2 py-0.5 lg:px-3 lg:py-1 rounded-md lg:rounded-lg font-semibold inline-flex items-center gap-1 lg:gap-1.5">
            <Clock className="w-3 h-3 lg:w-4 lg:h-4 text-indigo-500" />
            {habit.customSchedule && Object.keys(habit.customSchedule).length > 0
              ? 'Flexible Times'
              : `${habit.startTime} - ${habit.endTime}`}
          </span>

          <span className="bg-slate-50 text-slate-700 border border-slate-200/80 px-2.5 py-0.5 lg:px-3.5 lg:py-1 rounded-md lg:rounded-lg font-semibold inline-flex items-center gap-1.5">
            <span>🗓️</span>
            <span>Since {sinceDateLabel}</span>
            <span className="text-purple-600 font-bold">• {daysAgoLabel}</span>
          </span>

          {!isPresetActive && (
            <span className="bg-amber-50 text-amber-700 border border-amber-200/80 px-2 py-0.5 lg:px-3 lg:py-1 rounded-md lg:rounded-lg font-semibold inline-flex items-center gap-1 lg:gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Inactive Routine
            </span>
          )}
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:gap-5">
          <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-pink-500/10 border border-orange-200/80 rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-5 shadow-2xs">
            <div className="flex items-center justify-between text-gray-700 text-xs lg:text-sm font-bold">
              <span>Current Streak</span>
              <Flame className="w-4 h-4 lg:w-5 lg:h-5 text-orange-500 animate-pulse" />
            </div>
            <div className="mt-1 lg:mt-2 flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl lg:text-4xl font-black text-orange-600">
                {streak}
              </span>
              <span className="text-xs lg:text-sm font-bold text-orange-800/80">
                {streak === 1 ? 'day' : 'days'}
              </span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500/10 via-fuchsia-500/5 to-indigo-500/10 border border-purple-200/80 rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-5 shadow-2xs">
            <div className="flex items-center justify-between text-gray-700 text-xs lg:text-sm font-bold">
              <span>Total Completions</span>
              <CheckCircle2 className="w-4 h-4 lg:w-5 lg:h-5 text-purple-600" />
            </div>
            <div className="mt-1 lg:mt-2 flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl lg:text-4xl font-black text-purple-600">
                {totalCompletions}
              </span>
              <span className="text-xs lg:text-sm font-bold text-purple-800/80">
                {totalCompletions === 1 ? 'time' : 'times'}
              </span>
            </div>
          </div>
        </div>

        {/* History Toggle Container */}
        <div className="p-3 sm:p-4 lg:p-5 border border-purple-100/90 rounded-xl lg:rounded-2xl bg-purple-50/30 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-gray-800 text-xs lg:text-sm font-bold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 lg:w-4.5 lg:h-4.5 text-purple-600" />
              Habit History
            </p>
            <button
              type="button"
              onClick={() => setShowFullHistory(!showFullHistory)}
              className="text-[11px] lg:text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-100/80 hover:bg-purple-200 px-2.5 py-1 lg:px-3 lg:py-1.5 rounded-lg lg:rounded-xl transition"
            >
              {showFullHistory ? 'Show Last 7 Days' : 'View Full History'}
            </button>
          </div>

          {showFullHistory ? (
            <ContributionHeatmap
              startDate={startDateObj}
              completedDates={completedDatesList}
              scheduledDays={displayScheduledDays}
              targetValue={habit.targetValue}
              targetUnit={habit.targetUnit}
              dailyProgress={habit.dailyProgress}
              notScheduledDates={habit.notScheduledDates}
              onCellClick={(dateStr) => onEditHistoryDate(habit, dateStr)}
            />
          ) : (
            <div className="flex justify-between items-center pt-1 px-1">
              {past7Days.map((dayStatus) => {
                const [year, month, day] = dayStatus.date.split('-');
                const localDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
                const dayOfWeek = localDate.getDay();

                const isBeforeTrackingStart = localDate < startMidnight;
                const isExplicitlyNotScheduled = habit.notScheduledDates?.includes(dayStatus.date);
                const isScheduled =
                  isBeforeTrackingStart || isExplicitlyNotScheduled
                    ? false
                    : displayScheduledDays.includes(dayOfWeek);

                const isPast = localDate < todayMidnight;
                const loggedVal = habit.dailyProgress?.[dayStatus.date];
                const target = habit.targetValue;
                const ratio = dayStatus.completed
                  ? 1.0
                  : target && target > 0 && loggedVal && loggedVal > 0
                  ? Math.min(1.0, loggedVal / target)
                  : 0;

                let circleClass =
                  'w-7 h-7 sm:w-8 sm:h-8 lg:w-11 lg:h-11 rounded-full flex items-center justify-center transition-all ';
                if (isPast) {
                  circleClass += 'cursor-pointer hover:scale-110 hover:ring-2 hover:ring-purple-300 ';
                }

                let content: React.ReactNode = null;
                let styleObj: React.CSSProperties | undefined;

                if (ratio > 0) {
                  circleClass +=
                    'bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-pink-400 text-white shadow-xs border border-purple-300/60';
                  content = <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-6 lg:h-6" />;
                  styleObj = { opacity: Math.max(0.3, ratio) };
                } else if (!isScheduled) {
                  circleClass += 'bg-transparent border border-dashed border-gray-300 text-gray-300';
                  content = <Minus className="w-3 h-3 lg:w-4 lg:h-4" />;
                } else if (isPast) {
                  circleClass += 'bg-rose-50 border border-rose-200 text-rose-500';
                  content = <X className="w-3.5 h-3.5 lg:w-4.5 lg:h-4.5" />;
                } else {
                  circleClass += 'bg-slate-100 border border-slate-200 text-slate-400';
                }

                return (
                  <div
                    key={dayStatus.date}
                    className={`flex flex-col items-center gap-1 lg:gap-1.5 group ${
                      isPast ? 'cursor-pointer' : ''
                    }`}
                    onClick={() => isPast && onEditHistoryDate(habit, dayStatus.date)}
                    title={isPast ? `Click to edit status for ${dayStatus.date}` : undefined}
                  >
                    <span
                      className={`text-[10px] lg:text-xs text-gray-600 font-bold ${
                        isPast ? 'group-hover:text-purple-600' : ''
                      } transition-colors`}
                    >
                      {getDayAbbreviation(dayStatus.date)}
                    </span>
                    <div className={circleClass} style={styleObj}>
                      {content}
                    </div>
                    <span
                      className={`text-[9px] lg:text-xs text-gray-400 font-bold ${
                        isPast ? 'group-hover:text-purple-600' : ''
                      } transition-colors`}
                    >
                      {parseInt(day, 10)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Completion Rate & Rank Tier */}
        <div className="p-3 sm:p-4 lg:p-5 border border-purple-100/90 rounded-xl lg:rounded-2xl bg-purple-50/30 space-y-2 lg:space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
            <p className="text-gray-800 text-xs lg:text-sm font-bold flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 lg:w-4.5 lg:h-4.5 text-purple-600" />
              Overall Consistency
            </p>
            <div
              className={`px-2 py-0.5 lg:px-3.5 lg:py-1 rounded-full text-[10px] sm:text-xs lg:text-sm font-extrabold flex items-center gap-1 lg:gap-1.5 ${tier.badgeClass}`}
            >
              {tier.icon}
              <span>{tier.label}</span>
            </div>
          </div>

          <div className="w-full h-3.5 sm:h-4 lg:h-5 rounded-full bg-gradient-to-r from-purple-100/90 via-pink-100/90 to-indigo-100/90 p-0.5 shadow-inner border border-purple-200/50">
            <div
              className="h-full bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-500 rounded-full transition-all duration-500 shadow-xs"
              style={{ width: `${consistency}%` }}
            />
          </div>
        </div>
      </div>
    );
  }
);
