import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Activity, Flame, CalendarRange, Settings2, Calendar, Plus, Sun } from 'lucide-react';
import { DailyHabit, HabitSet, getHabitSetIds } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useDataRefresh } from '@/context/DataRefreshContext';
import {
  createDailyHabit,
  getUserDailyHabits,
  markHabitCompletedToday,
  unmarkHabitCompletedDate,
  updateHabitProgress,
  updateDailyHabit,
  deleteDailyHabit,
} from '@/services/habitService';
import {
  getUserHabitSets,
  createHabitSet,
  setActiveHabitSet,
  updateHabitSet,
  deleteHabitSet,
} from '@/services/habitSetService';
import { getTodayDateString } from '@/utils/dateUtils';
import { getHabitColorHex } from '@/utils/colorUtils';
import { sortHabitsByTodaySchedule } from '@/utils/habitSchedule';
import { showToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  playActionSound,
  playCheckSound,
  playDeleteSound,
  playSuccessSound,
  playUncheckSound,
} from '@/utils/audio';
import { HabitTimeline } from '@/components/habits/HabitTimeline';
import { HabitCard } from '@/components/habits/HabitCard';
import { HabitFormModal, HabitFormSubmitData } from '@/components/habits/HabitFormModal';
import { RoutineSelectorDropdown } from '@/components/habits/RoutineSelectorDropdown';
import HabitsTable from '@/components/habits/HabitsTable';
import { WeeklyScheduleModal } from '@/components/modals/WeeklyScheduleModal';
import { ManageHabitSetsModal } from '@/components/modals/ManageHabitSetsModal';

export function HabitsPage() {
  const { user, loading: authLoading } = useAuth();
  const { registerRefreshHabits, registerRefreshHabitSets, refreshAnalytics } = useDataRefresh();
  const [habits, setHabits] = useState<DailyHabit[]>([]);
  const habitsRef = useRef(habits);
  habitsRef.current = habits;

  const [habitSets, setHabitSets] = useState<HabitSet[]>([]);
  const [activeSetId, setActiveSetId] = useState<string>('');
  const [isManageSetsModalOpen, setIsManageSetsModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<DailyHabit | null>(null);
  const [isWeeklyModalOpen, setIsWeeklyModalOpen] = useState(false);
  const [deletingHabitId, setDeletingHabitId] = useState<string | null>(null);
  const [todayDate] = useState(getTodayDateString());

  useEffect(() => {
    if (!user) {
      setHabits([]);
      setHabitSets([]);
      setLoadError(null);
      setLoading(false);
      return;
    }
    loadHabits();
  }, [user]);

  useEffect(() => {
    registerRefreshHabits(() => {
      loadHabits();
    });
  }, [registerRefreshHabits]);

  useEffect(() => {
    registerRefreshHabitSets(() => {
      loadHabits();
    });
  }, [registerRefreshHabitSets]);

  const loadHabits = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setLoadError(null);
      const [userHabits, sets] = await Promise.all([
        getUserDailyHabits(user.uid),
        getUserHabitSets(user.uid),
      ]);
      setHabits(sortHabitsByTodaySchedule(userHabits, new Date().getDay()));
      setHabitSets(sets);

      const active = sets.find((s) => s.isActive) || sets[0];
      if (active) {
        setActiveSetId(active.id);
      }
    } catch (err) {
      setLoadError('Could not load habits. Refresh and try again.');
      console.error('Error loading habits:', err);
    } finally {
      setLoading(false);
    }
  };

  const sortedHabitSets = useMemo(() => {
    return [...habitSets].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [habitSets]);

  const activeSet = useMemo(() => {
    return habitSets.find((s) => s.id === activeSetId) || habitSets[0];
  }, [habitSets, activeSetId]);

  const activeRoutineHabits = useMemo(() => {
    if (!activeSet) return habits;
    const defaultSetId = habitSets[0]?.id;
    return habits.filter((h) => {
      const setIds = getHabitSetIds(h);
      if (setIds.length > 0) {
        return setIds.includes(activeSet.id);
      }
      return activeSet.id === defaultSetId;
    });
  }, [habits, activeSet, habitSets]);

  const todayDayIndex = new Date().getDay();

  const { habitsDueToday, habitsOtherDays } = useMemo(() => {
    const dueToday = sortHabitsByTodaySchedule(
      activeRoutineHabits.filter((h) => h.scheduledDays.includes(todayDayIndex)),
      todayDayIndex
    );
    const otherDays = sortHabitsByTodaySchedule(
      activeRoutineHabits.filter((h) => !h.scheduledDays.includes(todayDayIndex)),
      todayDayIndex
    );
    return { habitsDueToday: dueToday, habitsOtherDays: otherDays };
  }, [activeRoutineHabits, todayDayIndex]);

  const scheduledTodayCount = habitsDueToday.length;

  const completedTodayCount = useMemo(() => {
    const todayStr = getTodayDateString();
    return habitsDueToday.filter((h) => {
      if (h.completedDates?.includes(todayStr)) return true;
      if (h.targetValue && h.targetValue > 0) {
        return (h.dailyProgress?.[todayStr] || 0) >= h.targetValue;
      }
      return false;
    }).length;
  }, [habitsDueToday]);

  const todayPercent = useMemo(() => {
    if (habitsDueToday.length === 0) return 0;
    const todayStr = getTodayDateString();
    const totalProgressSum = habitsDueToday.reduce((acc, h) => {
      if (h.completedDates?.includes(todayStr)) return acc + 1.0;
      if (h.targetValue && h.targetValue > 0) {
        return acc + Math.min(1.0, (h.dailyProgress?.[todayStr] || 0) / h.targetValue);
      }
      return acc;
    }, 0);
    return Math.round((totalProgressSum / habitsDueToday.length) * 100);
  }, [habitsDueToday]);

  const handleSelectActiveSet = async (setId: string) => {
    if (!user || setId === activeSetId) return;

    const previousSetId = activeSetId;
    setActiveSetId(setId);
    setHabitSets((prev) => prev.map((s) => ({ ...s, isActive: s.id === setId })));

    try {
      await setActiveHabitSet(user.uid, setId);
      showToast('Activated routine preset', 'success');
    } catch (err) {
      console.error('Error activating habit set:', err);
      setActiveSetId(previousSetId);
      setHabitSets((prev) => prev.map((s) => ({ ...s, isActive: s.id === previousSetId })));
      showToast('Failed to change active routine preset', 'error');
    }
  };

  const handleCreateSet = async (name: string, color?: string) => {
    if (!user) return;
    const newSet = await createHabitSet(user.uid, { name, color, isActive: false });
    setHabitSets((prev) => [...prev, newSet]);
    showToast('Created routine preset', 'success');
  };

  const handleUpdateSet = async (setId: string, updates: Partial<HabitSet>) => {
    if (!user) return;
    await updateHabitSet(setId, updates);
    setHabitSets((prev) => prev.map((s) => (s.id === setId ? { ...s, ...updates } : s)));
    showToast('Updated routine preset', 'success');
  };

  const handleDeleteSet = async (setId: string) => {
    if (!user) return;
    await deleteHabitSet(setId, user.uid);
    const remainingSets = habitSets.filter((s) => s.id !== setId);
    setHabitSets(remainingSets);
    setHabits((prev) =>
      prev
        .map((h) => {
          const ids = getHabitSetIds(h).filter((id) => id !== setId);
          return { ...h, setIds: ids, setId: ids[0] };
        })
        .filter((h) => h.setIds && h.setIds.length > 0)
    );

    if (setId === activeSetId && remainingSets.length > 0) {
      await setActiveHabitSet(user.uid, remainingSets[0].id);
      setActiveSetId(remainingSets[0].id);
    }
    showToast('Deleted preset and associated habits', 'success');
  };

  const handleCreateHabitSubmit = useCallback(
    async (data: HabitFormSubmitData) => {
      if (!user) return;

      const newHabitId = await createDailyHabit(user.uid, {
        title: data.title,
        completedDates: [],
        scheduledDays: data.scheduledDays,
        startTime: data.startTime,
        endTime: data.endTime,
        customSchedule: data.customSchedule || undefined,
        color: data.color,
        setIds: data.setIds,
        setId: data.setIds[0],
        targetValue: data.targetValue,
        targetUnit: data.targetUnit,
      });

      const created: DailyHabit = {
        id: newHabitId,
        userId: user.uid,
        title: data.title,
        completedDates: [],
        scheduledDays: data.scheduledDays,
        startTime: data.startTime,
        endTime: data.endTime,
        customSchedule: data.customSchedule || undefined,
        color: data.color,
        setIds: data.setIds,
        setId: data.setIds[0],
        targetValue: data.targetValue,
        targetUnit: data.targetUnit,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setHabits((prev) => sortHabitsByTodaySchedule([...prev, created], new Date().getDay()));
      setIsAddModalOpen(false);
      playActionSound();
      refreshAnalytics();
    },
    [user, refreshAnalytics]
  );

  const handleSaveEditSubmit = useCallback(
    async (data: HabitFormSubmitData) => {
      if (!user || !editingHabit) return;

      const habitId = editingHabit.id;
      await updateDailyHabit(habitId, {
        title: data.title,
        scheduledDays: data.scheduledDays,
        startTime: data.startTime,
        endTime: data.endTime,
        customSchedule: data.customSchedule ?? null,
        color: data.color,
        setIds: data.setIds,
        setId: data.setIds[0],
        targetValue: data.targetValue ?? null,
        targetUnit: data.targetUnit ?? null,
      });

      setHabits((prev) =>
        sortHabitsByTodaySchedule(
          prev.map((h) =>
            h.id === habitId
              ? {
                  ...h,
                  title: data.title,
                  scheduledDays: data.scheduledDays,
                  startTime: data.startTime,
                  endTime: data.endTime,
                  customSchedule: data.customSchedule || undefined,
                  color: data.color,
                  setIds: data.setIds,
                  setId: data.setIds[0],
                  targetValue: data.targetValue,
                  targetUnit: data.targetUnit,
                  updatedAt: new Date(),
                }
              : h
          ),
          new Date().getDay()
        )
      );
      setEditingHabit(null);
      playActionSound();
      refreshAnalytics();
    },
    [user, editingHabit, refreshAnalytics]
  );

  const handleProgressChange = useCallback(
    async (habitId: string, newProgressValue: number) => {
      if (!user) return;
      const habit = habitsRef.current.find((h) => h.id === habitId);
      if (!habit) return;

      const target = habit.targetValue && habit.targetValue > 0 ? habit.targetValue : 1;
      const previousVal = habit.dailyProgress?.[todayDate] ?? 0;
      const val =
        habit.targetValue && habit.targetValue > 0
          ? Math.min(target, Math.max(0, newProgressValue))
          : Math.max(0, newProgressValue);
      const isCompletedNow = val >= target;
      const wasCompleted = habit.completedDates.includes(todayDate);

      if (isCompletedNow && !wasCompleted) {
        playSuccessSound();
      } else if (val > previousVal) {
        playCheckSound();
      } else if (val < previousVal) {
        playUncheckSound();
      }

      const updatedDailyProgress = { ...(habit.dailyProgress || {}), [todayDate]: val };
      const updatedCompletedDates = isCompletedNow
        ? [...new Set([...habit.completedDates, todayDate])]
        : habit.completedDates.filter((d) => d !== todayDate);

      setHabits((prev) =>
        prev.map((h) =>
          h.id === habitId
            ? { ...h, dailyProgress: updatedDailyProgress, completedDates: updatedCompletedDates }
            : h
        )
      );

      try {
        await updateHabitProgress(habitId, todayDate, val, habit.targetValue);
        refreshAnalytics();
      } catch (err) {
        console.error('Error updating habit progress:', err);
        showToast('Failed to update progress', 'error');
      }
    },
    [todayDate, user, refreshAnalytics]
  );

  const handleToggleHabit = useCallback(
    async (habitId: string, isCompletedToday: boolean) => {
      if (!user) return;
      const habit = habitsRef.current.find((h) => h.id === habitId);
      if (!habit) return;

      if (habit.targetValue && habit.targetValue > 0) {
        await handleProgressChange(habitId, isCompletedToday ? 0 : habit.targetValue);
        return;
      }

      if (!isCompletedToday) {
        playSuccessSound();
      } else {
        playUncheckSound();
      }

      const previousDates = [...habit.completedDates];
      const optimisticDates = isCompletedToday
        ? habit.completedDates.filter((date) => date !== todayDate)
        : [...habit.completedDates, todayDate];

      setHabits((prev) =>
        prev.map((h) => (h.id === habitId ? { ...h, completedDates: optimisticDates } : h))
      );

      try {
        if (isCompletedToday) {
          await unmarkHabitCompletedDate(habitId, todayDate);
        } else {
          await markHabitCompletedToday(habitId);
        }
        refreshAnalytics();
      } catch (err) {
        setHabits((prev) =>
          prev.map((h) => (h.id === habitId ? { ...h, completedDates: previousDates } : h))
        );
        showToast('Failed to update habit completion', 'error');
        console.error('Error toggling habit:', err);
      }
    },
    [handleProgressChange, todayDate, user, refreshAnalytics]
  );

  const handleEditHabit = useCallback((habitToEdit: DailyHabit) => {
    setEditingHabit(habitToEdit);
  }, []);

  const handleDeleteHabit = async () => {
    if (!user || !deletingHabitId) return;
    try {
      await deleteDailyHabit(deletingHabitId);
      setHabits((prev) => prev.filter((h) => h.id !== deletingHabitId));
      setDeletingHabitId(null);
      playDeleteSound();
      refreshAnalytics();
    } catch (err) {
      showToast('Failed to delete habit. Please try again.', 'error');
      console.error('Error deleting habit:', err);
    }
  };

  const handleBulkDeleteHabits = async (habitIds: string[]) => {
    if (habitIds.length === 0) return;
    try {
      await Promise.all(habitIds.map((id) => deleteDailyHabit(id)));
      const idSet = new Set(habitIds);
      setHabits((prev) => prev.filter((h) => !idSet.has(h.id)));
      playDeleteSound();
      showToast(`Deleted ${habitIds.length} habit(s).`, 'success');
      refreshAnalytics();
    } catch (err) {
      showToast('Bulk delete failed. Please try again.', 'error');
      console.error('Error bulk deleting habits:', err);
      await loadHabits();
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 md:pt-6 pb-8 md:pb-12">
        <div className="glass-card p-8 md:p-12 text-center">
          <div className="flex justify-center mb-3">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          </div>
          <p className="text-gray-600">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Please Sign In</h2>
          <p className="text-gray-600">Sign in to view and manage your daily habits.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-3.5 sm:pt-4 md:pt-2 pb-6 md:pb-12">
      <div className="max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto px-3 sm:px-6">
        {/* Hero Dashboard Overview Banner */}
        <div className="hero-banner-compact glass-card p-4 sm:p-6 mb-5 sm:mb-6 bg-gradient-to-br from-[#3b0764] via-[#581c87] to-[#701a75] text-white rounded-3xl border border-pink-400/30 shadow-xl shadow-fuchsia-950/40 relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-12 -top-12 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 sm:gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center xl:flex-col xl:items-start justify-between gap-3 xl:gap-1">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 border border-white/25 backdrop-blur-md shadow-2xs">
                  <Flame className="w-5 h-5 text-amber-300 animate-pulse" />
                </div>
                <h1 className="hero-banner-title text-xl sm:text-2xl font-black text-white tracking-tight">
                  Daily Habits
                </h1>
              </div>

              <div className="grid grid-cols-2 sm:flex sm:items-center xl:hidden gap-2 sm:gap-2.5 w-full sm:w-auto">
                <button
                  onClick={() => setIsWeeklyModalOpen(true)}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl backdrop-blur-md transition-all text-xs sm:text-sm font-semibold whitespace-nowrap shadow-2xs"
                  title="Weekly Timetable"
                >
                  <CalendarRange className="w-4 h-4 text-purple-200" />
                  <span>Timetable</span>
                </button>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl shadow-[0_8px_20px_rgba(244,63,94,0.3)] hover:shadow-[0_12px_28px_rgba(244,63,94,0.4)] hover:-translate-y-0.5 transition-all text-xs sm:text-sm font-bold whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                  <span>Add Habit</span>
                </button>
              </div>
            </div>

            <div className="hero-banner-stats grid grid-cols-3 gap-1.5 sm:gap-2 xl:gap-4 bg-white/10 backdrop-blur-md p-2 sm:p-2.5 xl:p-3 rounded-2xl border border-white/15 text-center w-full xl:flex-1 xl:max-w-xl xl:mx-4 shrink-0">
              <div className="px-1 sm:px-2 py-0.5 min-w-0">
                <div className="text-[10px] xl:text-xs text-purple-200 uppercase font-bold tracking-wider whitespace-nowrap">
                  Scheduled
                </div>
                <div className="hero-banner-stats-val text-base sm:text-lg font-black text-amber-300">
                  {scheduledTodayCount}
                </div>
              </div>
              <div className="px-1 sm:px-2 py-0.5 border-x border-white/15 min-w-0">
                <div className="text-[10px] xl:text-xs text-purple-200 uppercase font-bold tracking-wider whitespace-nowrap">
                  Completed
                </div>
                <div className="hero-banner-stats-val text-base sm:text-lg font-black text-emerald-300">
                  {completedTodayCount}
                </div>
              </div>
              <div className="px-1 sm:px-2 py-0.5 min-w-0">
                <div className="text-[10px] xl:text-xs text-purple-200 uppercase font-bold tracking-wider whitespace-nowrap">
                  Today %
                </div>
                <div className="hero-banner-stats-val text-base sm:text-lg font-black text-pink-300">
                  {todayPercent}%
                </div>
              </div>
            </div>

            <div className="hidden xl:flex xl:items-center gap-2.5 shrink-0">
              <button
                onClick={() => setIsWeeklyModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl backdrop-blur-md transition-all text-sm font-semibold whitespace-nowrap shadow-2xs"
                title="Weekly Timetable"
              >
                <CalendarRange className="w-4 h-4 text-purple-200" />
                <span>Timetable</span>
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl shadow-[0_8px_20px_rgba(244,63,94,0.3)] hover:shadow-[0_12px_28px_rgba(244,63,94,0.4)] hover:-translate-y-0.5 transition-all text-sm font-bold whitespace-nowrap"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
                <span>Add Habit</span>
              </button>
            </div>
          </div>
        </div>

        {/* Unified Control Bar: View Toggle & Routine Preset Selector */}
        <div className="relative z-10 mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 sm:gap-3 rounded-2xl border border-purple-100/90 bg-white/80 p-1.5 shadow-xs backdrop-blur-md sm:p-2">
          <div className="flex items-center gap-1 bg-white border border-purple-200/80 rounded-xl p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
                viewMode === 'list' ? 'bg-purple-600 text-white shadow-xs' : 'text-gray-700 hover:bg-gray-50'
              }`}
              aria-pressed={viewMode === 'list'}
              aria-label="List view"
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
                viewMode === 'table' ? 'bg-purple-600 text-white shadow-xs' : 'text-gray-700 hover:bg-gray-50'
              }`}
              aria-pressed={viewMode === 'table'}
              aria-label="Table view"
            >
              Table
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <RoutineSelectorDropdown
              habitSets={sortedHabitSets}
              selectedSetId={activeSetId}
              onSelect={handleSelectActiveSet}
              headerLabel="Switch Active Routine"
            />
            <button
              type="button"
              onClick={() => setIsManageSetsModalOpen(true)}
              className="inline-flex min-h-[36px] sm:min-h-[38px] items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 transition shadow-2xs whitespace-nowrap"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Manage Routines</span>
              <span className="sm:hidden">Manage</span>
            </button>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((idx) => (
              <div key={idx} className="glass-card p-4 sm:p-5 space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-md skeleton-shimmer shrink-0" />
                  <div className="h-5 w-2/3 sm:w-1/3 rounded-lg skeleton-shimmer" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-20 rounded-md skeleton-shimmer" />
                  <div className="h-5 w-28 rounded-md skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : loadError && habits.length === 0 ? (
          <div className="glass-card p-6 md:p-10 text-center">
            <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-2">Habits unavailable</h2>
            <p className="text-gray-600 mb-5">{loadError}</p>
            <button
              type="button"
              onClick={loadHabits}
              className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold hover:from-purple-700 hover:to-pink-600 transition"
            >
              Retry
            </button>
          </div>
        ) : activeRoutineHabits.length === 0 ? (
          <div className="glass-card p-5 sm:p-8 md:p-12 text-center">
            <div className="mb-4 flex justify-center">
              <Activity className="h-10 w-10 md:h-12 md:w-12 text-purple-300" />
            </div>
            <h3 className="text-lg md:text-xl font-semibold text-gray-800 mb-2">
              No habits in this routine preset
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-4">
              Start building better habits in this routine preset by adding one above!
            </p>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-lg bg-purple-100 text-purple-700 font-semibold hover:bg-purple-200 transition"
            >
              Add habit to preset
            </button>
          </div>
        ) : (
          <>
            {viewMode === 'table' ? (
              <HabitsTable
                habits={activeRoutineHabits}
                todayDate={todayDate}
                onToggleCompletion={handleToggleHabit}
                onProgressChange={handleProgressChange}
                onEdit={handleEditHabit}
                onDelete={setDeletingHabitId}
                onBulkDelete={handleBulkDeleteHabits}
              />
            ) : (
              <div className="space-y-6">
                {/* Today's Habits Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs sm:text-sm font-bold text-purple-900 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-purple-600 animate-pulse" />
                      Today's Scheduled Habits
                      <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                        {habitsDueToday.length}
                      </span>
                    </h3>
                  </div>
                  {habitsDueToday.length === 0 ? (
                    <div className="glass-card p-6 sm:p-8 text-center bg-gradient-to-b from-purple-50/50 via-pink-50/30 to-white rounded-2xl border border-dashed border-purple-200/90 shadow-2xs">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-pink-500 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-amber-500/20">
                        <Sun className="w-6 h-6 animate-pulse text-white drop-shadow-xs" />
                      </div>
                      <h4 className="text-sm sm:text-base font-extrabold text-gray-900 mb-1">
                        Free Day Ahead! ☀️
                      </h4>
                      <p className="text-xs text-gray-600 max-w-sm mx-auto font-medium">
                        No habits scheduled for today. Enjoy your rest or check habits scheduled for other days below!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 list-stagger">
                      {habitsDueToday.map((habit) => (
                        <HabitCard
                          key={habit.id}
                          habit={habit}
                          todayDate={todayDate}
                          todayDayIndex={todayDayIndex}
                          colorHex={getHabitColorHex(habit, habits)}
                          onToggleCompletion={handleToggleHabit}
                          onProgressChange={handleProgressChange}
                          onEdit={handleEditHabit}
                          onDelete={setDeletingHabitId}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Other Days Habits Section */}
                {habitsOtherDays.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-xs font-bold text-gray-500 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        Scheduled for Other Days
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                          {habitsOtherDays.length}
                        </span>
                      </h3>
                    </div>
                    <div className="space-y-3 list-stagger opacity-85">
                      {habitsOtherDays.map((habit) => (
                        <HabitCard
                          key={habit.id}
                          habit={habit}
                          todayDate={todayDate}
                          todayDayIndex={todayDayIndex}
                          colorHex={getHabitColorHex(habit, habits)}
                          onToggleCompletion={handleToggleHabit}
                          onProgressChange={handleProgressChange}
                          onEdit={handleEditHabit}
                          onDelete={setDeletingHabitId}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <HabitTimeline
              habits={activeRoutineHabits}
              getHabitColor={(id) => {
                const h = activeRoutineHabits.find((item) => item.id === id);
                return h ? getHabitColorHex(h, activeRoutineHabits) : '#A78BFA';
              }}
              onEditHabit={handleEditHabit}
            />
          </>
        )}

        {/* Isolated Add & Edit Habit Modals */}
        <HabitFormModal
          isOpen={isAddModalOpen}
          mode="add"
          allHabits={habits}
          sortedHabitSets={sortedHabitSets}
          activeSetId={activeSetId}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleCreateHabitSubmit}
        />
        <HabitFormModal
          isOpen={Boolean(editingHabit)}
          mode="edit"
          initialHabit={editingHabit}
          allHabits={habits}
          sortedHabitSets={sortedHabitSets}
          activeSetId={activeSetId}
          onClose={() => setEditingHabit(null)}
          onSubmit={handleSaveEditSubmit}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmDialog
          isOpen={Boolean(deletingHabitId)}
          title="Delete Habit?"
          description="Are you sure you want to delete this habit? This action cannot be undone and all history will be lost."
          confirmLabel="Delete"
          tone="danger"
          onCancel={() => setDeletingHabitId(null)}
          onConfirm={handleDeleteHabit}
        />

        {/* Weekly Schedule Modal */}
        <WeeklyScheduleModal
          isOpen={isWeeklyModalOpen}
          onClose={() => setIsWeeklyModalOpen(false)}
          habits={activeRoutineHabits}
          onEditHabit={handleEditHabit}
        />

        {/* Manage Routine Presets Modal */}
        <ManageHabitSetsModal
          isOpen={isManageSetsModalOpen}
          onClose={() => setIsManageSetsModalOpen(false)}
          habitSets={habitSets}
          activeSetId={activeSetId}
          onSelectActiveSet={handleSelectActiveSet}
          onCreateSet={handleCreateSet}
          onUpdateSet={handleUpdateSet}
          onDeleteSet={handleDeleteSet}
        />
      </div>
    </div>
  );
}
