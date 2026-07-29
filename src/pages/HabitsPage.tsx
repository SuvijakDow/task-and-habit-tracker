import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Activity, Flame, Clock, CalendarRange, Layers, Settings2, ChevronDown, Calendar, Palette, Plus, Check, X, Target, Pencil, Trash2 } from 'lucide-react';
import { DailyHabit, HabitSet } from '@/types';
import { useAuth } from '@/context/AuthContext';
import {
  createDailyHabit,
  getUserDailyHabits,
  markHabitCompletedToday,
  unmarkHabitCompletedDate,
  updateHabitProgress,
  deleteDailyHabit,
  PASTEL_HABIT_COLORS,
  getHabitColorHex,
  getUserHabitSets,
  createHabitSet,
  setActiveHabitSet,
  updateHabitSet,
  deleteHabitSet,
} from '@/services/habitService';
import { getTodayDateString } from '@/utils/dateUtils';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/utils/firebase';
import { showToast } from '@/components/Toast';
import { playSuccessSound } from '@/utils/audio';
import { HabitTimeline } from '@/components/HabitTimeline';
import { TimePickerInput } from '@/components/TimePickerInput';
import { WeeklyScheduleModal } from '@/components/WeeklyScheduleModal';
import { ManageHabitSetsModal } from '@/components/ManageHabitSetsModal';
import HabitsTable from '@/components/HabitsTable';

export function HabitsPage() {
  const { user, loading: authLoading } = useAuth();
  const [habits, setHabits] = useState<DailyHabit[]>([]);
  const [habitSets, setHabitSets] = useState<HabitSet[]>([]);
  const [activeSetId, setActiveSetId] = useState<string>('');
  const [isRoutineDropdownOpen, setIsRoutineDropdownOpen] = useState(false);
  const [isManageSetsModalOpen, setIsManageSetsModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isWeeklyModalOpen, setIsWeeklyModalOpen] = useState(false);

  // Form state
  const [habitTitle, setHabitTitle] = useState('');
  const [scheduledDays, setScheduledDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [habitColor, setHabitColor] = useState(PASTEL_HABIT_COLORS[0]);
  const [habitSetId, setHabitSetId] = useState<string>('');
  const [targetValue, setTargetValue] = useState<number | undefined>(undefined);
  const [targetUnit, setTargetUnit] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [todayDate] = useState(getTodayDateString());

  // Edit state
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [editHabitTitle, setEditHabitTitle] = useState('');
  const [editScheduledDays, setEditScheduledDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [editStartTime, setEditStartTime] = useState('09:00');
  const [editEndTime, setEditEndTime] = useState('10:00');
  const [editHabitColor, setEditHabitColor] = useState(PASTEL_HABIT_COLORS[0]);
  const [editHabitSetId, setEditHabitSetId] = useState<string>('');
  const [editTargetValue, setEditTargetValue] = useState<number | undefined>(undefined);
  const [editTargetUnit, setEditTargetUnit] = useState<string | undefined>(undefined);

  // Delete confirmation state
  const [deletingHabitId, setDeletingHabitId] = useState<string | null>(null);

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
    if (!isRoutineDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.routine-dropdown-container')) {
        setIsRoutineDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isRoutineDropdownOpen]);

  const loadHabits = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setLoadError(null);
      const [userHabits, sets] = await Promise.all([
        getUserDailyHabits(user.uid),
        getUserHabitSets(user.uid),
      ]);
      setHabits(userHabits.sort((a, b) => a.startTime.localeCompare(b.startTime)));
      setHabitSets(sets);

      const active = sets.find((s) => s.isActive) || sets[0];
      if (active) {
        setActiveSetId(active.id);
        setHabitSetId(active.id);
      }
      setError(null);
    } catch (err) {
      const message = 'Could not load habits. Refresh and try again.';
      setLoadError(message);
      setError(message);
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

  // Habits belonging strictly to active routine set (or default set for legacy habits)
  const activeRoutineHabits = useMemo(() => {
    if (!activeSet) return habits;
    const defaultSetId = habitSets[0]?.id;
    return habits.filter((h) => {
      if (h.setId) {
        return h.setId === activeSet.id;
      }
      return activeSet.id === defaultSetId;
    });
  }, [habits, activeSet, habitSets]);

  const habitsToDisplay = activeRoutineHabits;

  const scheduledTodayCount = useMemo(() => {
    const todayDay = new Date().getDay();
    return habitsToDisplay.filter((h) => {
      const days = (h as any).scheduledDays || [0, 1, 2, 3, 4, 5, 6];
      return days.includes(todayDay);
    }).length;
  }, [habitsToDisplay]);

  const completedTodayCount = useMemo(() => {
    const todayStr = getTodayDateString();
    const todayDay = new Date().getDay();
    return habitsToDisplay.filter((h) => {
      const days = (h as any).scheduledDays || [0, 1, 2, 3, 4, 5, 6];
      if (!days.includes(todayDay)) return false;
      const isCompleted = h.completedDates?.includes(todayStr);
      const logged = h.dailyProgress?.[todayStr] ?? (isCompleted ? (h.targetValue || 1) : 0);
      return (h.targetValue && h.targetValue > 0) ? logged >= h.targetValue * 0.5 : isCompleted;
    }).length;
  }, [habitsToDisplay]);

  const handleSelectActiveSet = async (setId: string) => {
    if (!user || setId === activeSetId) {
      setIsRoutineDropdownOpen(false);
      return;
    }

    const previousSetId = activeSetId;

    // Optimistic Update: Instantly update active state & close dropdown
    setActiveSetId(setId);
    setHabitSets((prev) =>
      prev.map((s) => ({ ...s, isActive: s.id === setId }))
    );
    setIsRoutineDropdownOpen(false);

    try {
      await setActiveHabitSet(user.uid, setId);
      showToast('Activated routine preset', 'success');
    } catch (err) {
      console.error('Error activating habit set:', err);
      // Revert on failure
      setActiveSetId(previousSetId);
      setHabitSets((prev) =>
        prev.map((s) => ({ ...s, isActive: s.id === previousSetId }))
      );
      showToast('Failed to change active routine preset', 'error');
    }
  };

  const handleCreateSet = async (name: string, color?: string) => {
    if (!user) return;
    const newSet = await createHabitSet(user.uid, { name, color, isActive: false });
    setHabitSets((prev) => [...prev, newSet]);
    showToast('Created new routine preset', 'success');
  };

  const handleUpdateSet = async (setId: string, updates: Partial<Pick<HabitSet, 'name' | 'color'>>) => {
    await updateHabitSet(setId, updates);
    setHabitSets((prev) =>
      prev.map((s) => (s.id === setId ? { ...s, ...updates } : s))
    );
    showToast('Updated routine preset', 'success');
  };

  const handleDeleteSet = async (setId: string) => {
    if (!user) return;
    await deleteHabitSet(setId, user.uid);
    setHabitSets((prev) => prev.filter((s) => s.id !== setId));
    setHabits((prev) => prev.filter((h) => h.setId !== setId));

    // If active set was deleted, fallback to first remaining set
    if (setId === activeSetId) {
      const remaining = habitSets.filter((s) => s.id !== setId);
      if (remaining.length > 0) {
        await setActiveHabitSet(user.uid, remaining[0].id);
        setActiveSetId(remaining[0].id);
      }
    }
    showToast('Deleted preset and associated habits', 'success');
  };

  const handleAddHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!habitTitle.trim()) {
      setError('Habit name is required');
      return;
    }

    if (endTime <= startTime) {
      setError('End time must be after start time');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const targetSetId = habitSetId || activeSetId;
      const newHabitId = await createDailyHabit(user.uid, {
        title: habitTitle.trim(),
        completedDates: [],
        scheduledDays,
        startTime,
        endTime,
        color: habitColor,
        setId: targetSetId,
        targetValue: targetValue && targetValue > 0 ? targetValue : undefined,
        targetUnit: targetUnit?.trim() || undefined,
      });

      setHabits((prev) => {
        const newHabits = [
          ...prev,
          {
            id: newHabitId,
            userId: user.uid,
            title: habitTitle.trim(),
            completedDates: [],
            scheduledDays,
            startTime,
            endTime,
            color: habitColor,
            setId: targetSetId,
            targetValue: targetValue && targetValue > 0 ? targetValue : undefined,
            targetUnit: targetUnit?.trim() || undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
        return newHabits.sort((a, b) => a.startTime.localeCompare(b.startTime));
      });

      // Reset form and close modal
      setHabitTitle('');
      setScheduledDays([0, 1, 2, 3, 4, 5, 6]);
      setStartTime('09:00');
      setEndTime('10:00');
      setTargetValue(undefined);
      setTargetUnit(undefined);
      setHabitColor(PASTEL_HABIT_COLORS[0]);
      setIsAddModalOpen(false);
    } catch (err) {
      setError('Failed to add habit. Please try again.');
      console.error('Error adding habit:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProgressChange = useCallback(
    async (habitId: string, newProgressValue: number) => {
      if (!user) return;
      const habit = habits.find((h) => h.id === habitId);
      if (!habit) return;

      const target = habit.targetValue && habit.targetValue > 0 ? habit.targetValue : 1;
      const val = habit.targetValue && habit.targetValue > 0
        ? Math.min(target, Math.max(0, newProgressValue))
        : Math.max(0, newProgressValue);
      const isCompletedNow = val >= target;
      const wasCompleted = habit.completedDates.includes(todayDate);

      if (isCompletedNow && !wasCompleted) {
        playSuccessSound();
      }

      const currentDailyProgress = habit.dailyProgress || {};
      const updatedDailyProgress = { ...currentDailyProgress, [todayDate]: val };
      const updatedCompletedDates = isCompletedNow
        ? [...new Set([...habit.completedDates, todayDate])]
        : habit.completedDates.filter((d) => d !== todayDate);

      // Optimistic UI update
      setHabits((prev) =>
        prev.map((h) =>
          h.id === habitId
            ? {
                ...h,
                dailyProgress: updatedDailyProgress,
                completedDates: updatedCompletedDates,
              }
            : h
        )
      );

      try {
        await updateHabitProgress(habitId, todayDate, val, habit.targetValue);
      } catch (err) {
        console.error('Error updating habit progress:', err);
        showToast('Failed to update progress', 'error');
      }
    },
    [habits, todayDate, user]
  );

  const handleToggleHabit = useCallback(
    async (habitId: string, isCompletedToday: boolean) => {
      if (!user) return;

      const habit = habits.find((h) => h.id === habitId);
      if (!habit) return;

      // If habit has a targetValue, toggle between 0 and targetValue!
      if (habit.targetValue && habit.targetValue > 0) {
        const nextVal = isCompletedToday ? 0 : habit.targetValue;
        await handleProgressChange(habitId, nextVal);
        return;
      }

      if (!isCompletedToday) {
        playSuccessSound();
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
      } catch (err) {
        setHabits((prev) =>
          prev.map((h) => (h.id === habitId ? { ...h, completedDates: previousDates } : h))
        );
        showToast('Failed to update habit. Please try again.', 'error');
        console.error('Error toggling habit:', err);
      }
    },
    [habits, handleProgressChange, todayDate, user]
  );

  const handleEditHabit = (
    habitToEdit: DailyHabit
  ) => {
    setEditingHabitId(habitToEdit.id);
    setEditHabitTitle(habitToEdit.title);
    setEditScheduledDays(habitToEdit.scheduledDays);
    setEditStartTime(habitToEdit.startTime);
    setEditEndTime(habitToEdit.endTime);
    setEditHabitColor(getHabitColorHex(habitToEdit, habits));
    setEditHabitSetId(habitToEdit.setId || activeSetId);
    setEditTargetValue(habitToEdit.targetValue);
    setEditTargetUnit(habitToEdit.targetUnit);
  };

  const handleSaveEdit = async () => {
    if (!user || !editingHabitId) return;

    if (!editHabitTitle.trim()) {
      setEditError('Habit name is required');
      return;
    }

    if (editEndTime <= editStartTime) {
      setEditError('End time must be after start time');
      return;
    }

    try {
      setIsSubmitting(true);
      setEditError(null);

      const targetSetId = editHabitSetId || activeSetId;
      await updateDoc(doc(db, 'dailyHabits', editingHabitId), {
        title: editHabitTitle.trim(),
        scheduledDays: editScheduledDays,
        startTime: editStartTime,
        endTime: editEndTime,
        color: editHabitColor,
        setId: targetSetId,
        targetValue: editTargetValue && editTargetValue > 0 ? editTargetValue : null,
        targetUnit: editTargetUnit?.trim() || null,
        updatedAt: new Date(),
      });

      const updatedHabits = habits.map((habit) =>
        habit.id === editingHabitId
          ? {
              ...habit,
              title: editHabitTitle.trim(),
              scheduledDays: editScheduledDays,
              startTime: editStartTime,
              endTime: editEndTime,
              color: editHabitColor,
              setId: targetSetId,
              targetValue: editTargetValue && editTargetValue > 0 ? editTargetValue : undefined,
              targetUnit: editTargetUnit?.trim() || undefined,
              updatedAt: new Date(),
            }
          : habit
      );

      setHabits(updatedHabits.sort((a, b) => a.startTime.localeCompare(b.startTime)));
      setEditingHabitId(null);
      setEditHabitTitle('');
      setEditScheduledDays([0, 1, 2, 3, 4, 5, 6]);
      setEditStartTime('09:00');
      setEditEndTime('10:00');
      setEditTargetValue(undefined);
      setEditTargetUnit(undefined);
      setEditError(null);
    } catch (err) {
      setEditError('Failed to save habit. Please try again.');
      console.error('Error saving habit:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingHabitId(null);
    setEditHabitTitle('');
    setEditScheduledDays([0, 1, 2, 3, 4, 5, 6]);
    setEditStartTime('09:00');
    setEditEndTime('10:00');
    setEditError(null);
  };

  const handleDeleteHabit = async () => {
    if (!user || !deletingHabitId) return;

    try {
      setError(null);
      await deleteDailyHabit(deletingHabitId);
      setHabits((prev) => prev.filter((h) => h.id !== deletingHabitId));
      setDeletingHabitId(null);
    } catch (err) {
      setError('Failed to delete habit. Please try again.');
      console.error('Error deleting habit:', err);
    }
  };

  const handleBulkDeleteHabits = async (habitIds: string[]) => {
    if (habitIds.length === 0) return;
    try {
      await Promise.all(habitIds.map((id) => deleteDailyHabit(id)));
      const idSet = new Set(habitIds);
      setHabits((prev) => prev.filter((h) => !idSet.has(h.id)));
      showToast(`Deleted ${habitIds.length} habit(s).`, 'success');
    } catch (err) {
      showToast('Bulk delete failed. Please try again.', 'error');
      console.error('Error bulk deleting habits:', err);
      await loadHabits();
    }
  };

  const formatScheduledDays = (days: number[]): string => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (!days || days.length === 7) return 'Everyday';
    if (days.length === 0) return 'No days';
    return days.map((d) => dayNames[d]).join(', ');
  };

  if (authLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 md:pt-6 pb-8 md:pb-12">
        <div className="glass-card p-8 md:p-12 text-center">
          <div className="flex justify-center mb-3">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
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
        <div className="glass-card p-4 sm:p-6 mb-5 sm:mb-6 bg-gradient-to-br from-purple-900/95 via-fuchsia-900/90 to-indigo-950/95 text-white rounded-3xl border border-white/20 shadow-xl relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-12 -top-12 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 sm:gap-4">
            {/* Top Row / Desktop Left: Title */}
            <div className="flex flex-col sm:flex-row sm:items-center xl:flex-col xl:items-start justify-between gap-3 xl:gap-1">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 border border-white/25 backdrop-blur-md shadow-2xs">
                    <Flame className="w-5 h-5 text-amber-300 animate-pulse" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Daily Habits
                  </h1>
                </div>
              </div>

              {/* Tablet Top-Right Action Buttons (Hidden on full desktop xl, shown inside flex-row on mobile/tablet) */}
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
                  onClick={() => {
                    setHabitTitle('');
                    setScheduledDays([0, 1, 2, 3, 4, 5, 6]);
                    setStartTime('09:00');
                    setEndTime('10:00');
                    setHabitSetId(activeSetId);
                    setError(null);
                    setIsAddModalOpen(true);
                  }}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl shadow-[0_8px_20px_rgba(244,63,94,0.3)] hover:shadow-[0_12px_28px_rgba(244,63,94,0.4)] hover:-translate-y-0.5 transition-all text-xs sm:text-sm font-bold whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                  <span>Add Habit</span>
                </button>
              </div>
            </div>

            {/* Desktop Center: Stats Badges (Full width on mobile/tablet, expanded box on desktop) */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 xl:gap-4 bg-white/10 backdrop-blur-md p-2 sm:p-2.5 xl:p-3 rounded-2xl border border-white/15 text-center w-full xl:flex-1 xl:max-w-xl xl:mx-4 shrink-0">
              <div className="px-1 sm:px-2 py-0.5 min-w-0">
                <div className="text-[10px] xl:text-xs text-purple-200 uppercase font-bold tracking-wider whitespace-nowrap">Scheduled</div>
                <div className="text-base sm:text-lg font-black text-amber-300">{scheduledTodayCount}</div>
              </div>
              <div className="px-1 sm:px-2 py-0.5 border-x border-white/15 min-w-0">
                <div className="text-[10px] xl:text-xs text-purple-200 uppercase font-bold tracking-wider whitespace-nowrap">Completed</div>
                <div className="text-base sm:text-lg font-black text-emerald-300">{completedTodayCount}</div>
              </div>
              <div className="px-1 sm:px-2 py-0.5 min-w-0">
                <div className="text-[10px] xl:text-xs text-purple-200 uppercase font-bold tracking-wider whitespace-nowrap">Today %</div>
                <div className="text-base sm:text-lg font-black text-pink-300">
                  {scheduledTodayCount > 0 ? Math.round((completedTodayCount / scheduledTodayCount) * 100) : 0}%
                </div>
              </div>
            </div>

            {/* Desktop Right: Action Buttons (Only visible on full desktop xl) */}
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
                onClick={() => {
                  setHabitTitle('');
                  setScheduledDays([0, 1, 2, 3, 4, 5, 6]);
                  setStartTime('09:00');
                  setEndTime('10:00');
                  setHabitSetId(activeSetId);
                  setError(null);
                  setIsAddModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl shadow-[0_8px_20px_rgba(244,63,94,0.3)] hover:shadow-[0_12px_28px_rgba(244,63,94,0.4)] hover:-translate-y-0.5 transition-all text-sm font-bold whitespace-nowrap"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
                <span>Add Habit</span>
              </button>
            </div>
          </div>
        </div>

        {/* Unified Control Bar: Routine Preset Selector & View Toggle */}
        <div className="relative z-30 mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 sm:gap-3 rounded-2xl border border-purple-100/90 bg-white/80 p-1.5 shadow-xs backdrop-blur-md sm:p-2">
          {/* View Toggle */}
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

          {/* Routine Selector & Manage Button */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className="relative routine-dropdown-container flex-1 min-w-0">
              <button
                type="button"
                onClick={() => setIsRoutineDropdownOpen(!isRoutineDropdownOpen)}
                className="w-full flex items-center justify-between min-h-[36px] sm:min-h-[38px] bg-white border border-purple-200 hover:border-purple-400 rounded-xl px-3 sm:px-4 py-1.5 text-xs sm:text-sm text-gray-900 shadow-2xs hover:shadow-xs transition-all font-semibold focus:outline-none"
              >
                <div className="flex items-center gap-2 truncate">
                  <Layers className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  <span className="text-gray-500 font-normal hidden sm:inline">Routine:</span>
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: activeSet?.color || '#C084FC' }}
                    />
                    <span className="font-bold text-gray-900 truncate">{activeSet?.name || ''}</span>
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded-full font-bold">
                      Active
                    </span>
                  </div>
                </div>
                <ChevronDown className={`ml-2 h-4 w-4 text-purple-500 flex-shrink-0 transition-transform duration-200 ${isRoutineDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isRoutineDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 z-[100] w-64 bg-white border-2 border-purple-300 rounded-xl shadow-[0_16px_36px_rgba(120,87,255,0.35)] py-1.5 modal-enter">
                  <div className="px-3 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Switch Active Routine
                  </div>
                  {sortedHabitSets.map((set) => {
                    const isActive = set.id === activeSetId;
                    return (
                      <button
                        key={set.id}
                        type="button"
                        onClick={() => {
                          handleSelectActiveSet(set.id);
                          setIsRoutineDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs sm:text-sm transition-all hover:bg-purple-50 flex items-center justify-between ${
                          isActive ? 'bg-purple-50 text-purple-900 font-bold' : 'text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: set.color || '#C084FC' }}
                          />
                          <span className="truncate">{set.name}</span>
                        </div>
                        {isActive && (
                          <span className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full font-bold">
                            Active
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

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

        {/* Global Error Banner */}
        {error && !(loadError && habits.length === 0) && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 text-xs sm:text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* Add Habit Form Modal */}
        {isAddModalOpen &&
          createPortal(
            <div className="fixed inset-0 bg-gradient-to-b from-slate-950/40 via-purple-900/25 to-fuchsia-900/35 backdrop-blur-xs sm:backdrop-blur-sm flex items-end sm:items-center justify-center z-[9999] p-0 sm:p-4">
              <div className="modal-enter w-full sm:max-w-lg h-dvh sm:h-[85vh] max-h-dvh sm:max-h-[750px] flex flex-col bg-white sm:bg-white/95 backdrop-blur-xl border border-white/80 rounded-none sm:rounded-3xl shadow-[0_24px_56px_rgba(120,87,255,0.28)] overflow-hidden">
                <form onSubmit={handleAddHabit} className="flex flex-col h-full min-h-0">
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 sm:p-5 border-b border-purple-100/80 bg-purple-50/50 shrink-0">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                      <Plus className="w-5 h-5 text-purple-600" />
                      Add New Habit
                    </h2>
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="h-8 w-8 rounded-full text-gray-400 hover:text-gray-700 hover:bg-white transition flex items-center justify-center"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Scrollable Form Body */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                    {/* Error Message */}
                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
                        {error}
                      </div>
                    )}

                    {/* Habit Title */}
                    <div>
                      <label htmlFor="habit-title" className="block text-xs font-semibold text-gray-700 mb-1">
                        Habit Name *
                      </label>
                      <input
                        id="habit-title"
                        type="text"
                        value={habitTitle}
                        onChange={(e) => setHabitTitle(e.target.value)}
                        placeholder="e.g., Morning Exercise, Read 30 mins"
                        className="w-full min-h-[42px] rounded-xl border border-purple-200 bg-white px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 shadow-2xs transition focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
                        disabled={isSubmitting}
                        autoFocus
                      />
                    </div>

                    {/* Routine */}
                    <div>
                      <label htmlFor="habit-preset" className="block text-xs font-semibold text-gray-700 mb-1">
                        Routine
                      </label>
                      <select
                        id="habit-preset"
                        value={habitSetId || activeSetId}
                        onChange={(e) => setHabitSetId(e.target.value)}
                        className="w-full min-h-[40px] rounded-xl border border-purple-200 bg-white px-3 py-2 text-xs sm:text-sm text-gray-800 shadow-2xs transition focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
                      >
                        {habitSets.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} {s.id === activeSetId ? '(Active)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Schedule Section */}
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-purple-50/60 border border-purple-100/90 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-purple-700" />
                          Schedule
                        </label>
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                          <button
                            type="button"
                            onClick={() => setScheduledDays([0, 1, 2, 3, 4, 5, 6])}
                            className="text-purple-700 hover:text-purple-900 hover:underline transition"
                          >
                            All Days
                          </button>
                          <span className="text-purple-300">•</span>
                          <button
                            type="button"
                            onClick={() => setScheduledDays([1, 2, 3, 4, 5])}
                            className="text-purple-700 hover:text-purple-900 hover:underline transition"
                          >
                            Weekdays
                          </button>
                          <span className="text-purple-300">•</span>
                          <button
                            type="button"
                            onClick={() => setScheduledDays([])}
                            className="text-gray-500 hover:text-rose-600 hover:underline transition"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                          <label key={index} className="cursor-pointer">
                            <input
                              type="checkbox"
                              checked={scheduledDays.includes(index)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setScheduledDays((prev) => [...prev, index].sort());
                                } else {
                                  setScheduledDays((prev) => prev.filter((d) => d !== index));
                                }
                              }}
                              className="peer sr-only"
                            />
                            <span className="flex min-h-[32px] sm:min-h-[38px] items-center justify-center rounded-xl border border-purple-200/80 bg-white text-[10px] sm:text-xs font-semibold text-gray-700 transition-all peer-checked:border-transparent peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-pink-500 peer-checked:text-white peer-checked:shadow-sm hover:border-purple-300">
                              {day}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Time Selection */}
                    <div className="grid grid-cols-2 gap-3">
                      <TimePickerInput
                        value={startTime}
                        onChange={setStartTime}
                        label="Start Time"
                        popoverPosition="top"
                        align="left"
                        required
                        disabled={isSubmitting}
                      />
                      <TimePickerInput
                        value={endTime}
                        onChange={setEndTime}
                        label="End Time"
                        popoverPosition="top"
                        align="right"
                        required
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* Color Selection */}
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-purple-50/60 border border-purple-100/90 space-y-2">
                      <label className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                        <Palette className="w-4 h-4 text-purple-700" />
                        Habit Color
                      </label>
                      <div className="grid grid-cols-9 gap-1 sm:gap-2.5 justify-items-center pt-0.5">
                        {PASTEL_HABIT_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setHabitColor(c)}
                            className={`h-6 w-6 sm:h-8 sm:w-8 rounded-full border-2 transition-all flex items-center justify-center shrink-0 ${
                              habitColor === c
                                ? 'border-purple-600 scale-110 shadow-md ring-2 ring-purple-400/40'
                                : 'border-white/80 hover:scale-105'
                            }`}
                            style={{ backgroundColor: c }}
                            aria-label={`Select color ${c}`}
                            disabled={isSubmitting}
                          >
                            {habitColor === c && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white drop-shadow-xs" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Target Goal (Optional) */}
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-purple-50/60 border border-purple-100/90 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-xs font-bold text-purple-900 flex items-center gap-1.5 shrink-0">
                          <Target className="w-4 h-4 text-purple-700" />
                          Quantitative Target Goal <span className="font-normal text-purple-600">(Optional)</span>
                        </label>
                        <span className="text-[11px] font-medium text-purple-600 truncate text-right">e.g. 5 videos, 10 pages</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-1">Target Value</label>
                          <input
                            type="number"
                            min="1"
                            value={targetValue ?? ''}
                            onChange={(e) => setTargetValue(e.target.value ? Math.max(1, parseInt(e.target.value)) : undefined)}
                            placeholder="e.g. 5"
                            className="w-full min-h-[38px] rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs sm:text-sm text-gray-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-1">Unit</label>
                          <input
                            type="text"
                            value={targetUnit ?? ''}
                            onChange={(e) => setTargetUnit(e.target.value)}
                            placeholder="e.g. videos, pages"
                            className="w-full min-h-[38px] rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs sm:text-sm text-gray-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 p-4 sm:p-5 bg-purple-50/50 border-t border-purple-100/80 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="w-full sm:w-1/2 min-h-[42px] px-4 py-2.5 rounded-xl border border-purple-200 bg-white text-xs sm:text-sm font-semibold text-purple-700 hover:bg-purple-50 transition"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-1/2 min-h-[42px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white text-xs sm:text-sm font-semibold hover:from-purple-700 hover:to-pink-600 transition shadow-md shadow-purple-500/20 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Creating...' : 'Create Habit'}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )}

        {/* Content Section: Loading / Error / Empty / Table / List */}
        {loading ? (
          <div className="glass-card p-5 sm:p-8 md:p-12 text-center">
            <div className="flex justify-center mb-3">
              <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-600">Loading your habits...</p>
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
        ) : habitsToDisplay.length === 0 ? (
          <div className="glass-card p-5 sm:p-8 md:p-12 text-center">
            <div className="mb-4 flex justify-center">
              <Activity className="h-10 w-10 md:h-12 md:w-12 text-purple-300" />
            </div>
            <h3 className="text-lg md:text-xl font-semibold text-gray-800 mb-2">No habits in this routine preset</h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-4">Start building better habits in this routine preset by adding one above!</p>
            <button
              type="button"
              onClick={() => {
                setHabitTitle('');
                setScheduledDays([0, 1, 2, 3, 4, 5, 6]);
                setStartTime('09:00');
                setEndTime('10:00');
                setError(null);
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-lg bg-purple-100 text-purple-700 font-semibold hover:bg-purple-200 transition"
            >
              Add habit to preset
            </button>
          </div>
        ) : (
          <>
            {viewMode === 'table' ? (
              <HabitsTable
                habits={habitsToDisplay}
                todayDate={todayDate}
                onToggleCompletion={handleToggleHabit}
                onProgressChange={handleProgressChange}
                onEdit={handleEditHabit}
                onDelete={(id) => setDeletingHabitId(id)}
                onBulkDelete={handleBulkDeleteHabits}
              />
            ) : (() => {
              const todayDayIndex = new Date().getDay();
              const habitsDueToday = habitsToDisplay.filter((h) => h.scheduledDays.includes(todayDayIndex));
              const habitsOtherDays = habitsToDisplay.filter((h) => !h.scheduledDays.includes(todayDayIndex));

              const renderCard = (habit: DailyHabit) => {
                const isCompletedToday = habit.completedDates.includes(todayDate);
                const streak = habit.completedDates.length;
                const isDueToday = habit.scheduledDays.includes(todayDayIndex);

                const cardStyleClass = isCompletedToday
                  ? 'bg-gradient-to-r from-emerald-50/60 via-white/80 to-purple-50/40 border border-emerald-200/80'
                  : isDueToday
                  ? 'bg-gradient-to-r from-purple-50/90 via-white to-pink-50/50 border-l-4 border-l-purple-600 border border-purple-300/90 shadow-md ring-1 ring-purple-400/20'
                  : 'bg-white/40 border border-gray-200/60 opacity-65 hover:opacity-100';

                return (
                  <div key={habit.id}>
                    <div
                      className={`glass-card flex flex-col gap-2.5 py-2.5 md:py-4 px-3 sm:px-6 transition-all duration-200 group ${cardStyleClass} hover:shadow-md sm:hover:shadow-2xl`}
                    >
                      <div className="flex flex-row items-center gap-3 w-full md:w-auto min-w-0">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={isCompletedToday}
                          aria-label={`Mark ${habit.title} as ${isCompletedToday ? 'incomplete' : 'completed'}`}
                          onClick={() => handleToggleHabit(habit.id, isCompletedToday)}
                          className={`h-4 w-4 sm:h-5 sm:w-5 rounded-md border transition-all duration-200 flex items-center justify-center flex-shrink-0 ${
                            isCompletedToday
                              ? 'bg-gradient-to-br from-pink-400 to-purple-500 border-transparent text-white shadow-[0_6px_16px_rgba(184,109,214,0.45)]'
                              : 'bg-white/70 border-purple-200 text-transparent hover:border-purple-300'
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
                        const currentProgress = habit.dailyProgress?.[todayDate] ?? (isCompletedToday ? habit.targetValue : 0);
                        const target = habit.targetValue;
                        const percent = Math.min(100, Math.round((currentProgress / target) * 100));

                        return (
                          <div className="flex items-center gap-2 sm:gap-3 py-1 px-2.5 rounded-xl bg-purple-50/70 border border-purple-100/90 shadow-2xs">
                            <div className="inline-flex items-center gap-1 bg-white border border-purple-200/90 rounded-lg p-0.5 shadow-2xs shrink-0">
                              <button
                                type="button"
                                onClick={() => handleProgressChange(habit.id, currentProgress - 1)}
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
                                      handleProgressChange(habit.id, 0);
                                    } else {
                                      const parsed = parseInt(raw, 10);
                                      const val = Math.min(target, Math.max(0, parsed));
                                      handleProgressChange(habit.id, val);
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
                                onClick={() => handleProgressChange(habit.id, currentProgress + 1)}
                                className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold hover:opacity-90 flex items-center justify-center transition disabled:opacity-40"
                                disabled={currentProgress >= target}
                              >
                                +
                              </button>
                            </div>

                            {/* Dynamic Progress Bar filling remaining flex space */}
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
                            style={{ backgroundColor: getHabitColorHex(habit, habits) }}
                          >
                            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white/90" />
                            <span>
                              {habit.startTime} - {habit.endTime}
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
                            onClick={() => handleEditHabit(habit)}
                            className="p-1 sm:p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition"
                            title="Edit habit"
                          >
                            <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingHabitId(habit.id)}
                            className="p-1 sm:p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete habit"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              };

              return (
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
                      <div className="p-4 text-center text-xs text-gray-500 bg-purple-50/30 rounded-xl border border-dashed border-purple-200">
                        No habits scheduled for today.
                      </div>
                    ) : (
                      <div className="space-y-3 list-stagger">
                        {habitsDueToday.map(renderCard)}
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
                        {habitsOtherDays.map(renderCard)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Habit Timeline at the bottom for both List and Table views */}
            {habitsToDisplay.length > 0 && (
              <HabitTimeline
                habits={habitsToDisplay}
                getHabitColor={(id) => {
                  const h = habitsToDisplay.find((item) => item.id === id);
                  return h ? getHabitColorHex(h, habitsToDisplay) : '#A78BFA';
                }}
                onEditHabit={handleEditHabit}
              />
            )}
          </>
        )}

        {/* Edit Habit Modal */}
        {editingHabitId &&
          createPortal(
            <div className="fixed inset-0 bg-gradient-to-b from-slate-950/40 via-purple-900/25 to-fuchsia-900/35 backdrop-blur-xs sm:backdrop-blur-sm flex items-end sm:items-center justify-center z-[10000] p-0 sm:p-4">
              <div className="modal-enter w-full sm:max-w-lg h-dvh sm:h-[85vh] max-h-dvh sm:max-h-[750px] flex flex-col bg-white sm:bg-white/95 backdrop-blur-xl border border-white/80 rounded-none sm:rounded-3xl shadow-[0_24px_56px_rgba(120,87,255,0.28)] overflow-hidden">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveEdit();
                  }}
                  className="flex flex-col h-full min-h-0"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 sm:p-5 border-b border-purple-100/80 bg-purple-50/50 shrink-0">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                      <Settings2 className="w-5 h-5 text-purple-600" />
                      Edit Habit
                    </h2>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="h-8 w-8 rounded-full text-gray-400 hover:text-gray-700 hover:bg-white transition flex items-center justify-center"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Scrollable Form Body */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                    {/* Error Message */}
                    {editError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
                        {editError}
                      </div>
                    )}

                    {/* Habit Title */}
                    <div>
                      <label htmlFor="edit-habit-title" className="block text-xs font-semibold text-gray-700 mb-1">
                        Habit Name *
                      </label>
                      <input
                        id="edit-habit-title"
                        type="text"
                        value={editHabitTitle}
                        onChange={(e) => setEditHabitTitle(e.target.value)}
                        placeholder="Enter habit name"
                        className="w-full min-h-[42px] rounded-xl border border-purple-200 bg-white px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 shadow-2xs transition focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* Routine Preset */}
                    <div>
                      <label htmlFor="edit-habit-preset" className="block text-xs font-semibold text-gray-700 mb-1">
                        Routine Preset
                      </label>
                      <select
                        id="edit-habit-preset"
                        value={editHabitSetId || activeSetId}
                        onChange={(e) => setEditHabitSetId(e.target.value)}
                        className="w-full min-h-[40px] rounded-xl border border-purple-200 bg-white px-3 py-2 text-xs sm:text-sm text-gray-800 shadow-2xs transition focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
                      >
                        {habitSets.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} {s.id === activeSetId ? '(Active)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Schedule Section */}
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-purple-50/60 border border-purple-100/90 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-purple-700" />
                          Schedule
                        </label>
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                          <button
                            type="button"
                            onClick={() => setEditScheduledDays([0, 1, 2, 3, 4, 5, 6])}
                            className="text-purple-700 hover:text-purple-900 hover:underline transition"
                          >
                            All Days
                          </button>
                          <span className="text-purple-300">•</span>
                          <button
                            type="button"
                            onClick={() => setEditScheduledDays([1, 2, 3, 4, 5])}
                            className="text-purple-700 hover:text-purple-900 hover:underline transition"
                          >
                            Weekdays
                          </button>
                          <span className="text-purple-300">•</span>
                          <button
                            type="button"
                            onClick={() => setEditScheduledDays([])}
                            className="text-gray-500 hover:text-rose-600 hover:underline transition"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                          <label key={index} className="cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editScheduledDays.includes(index)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditScheduledDays((prev) => [...prev, index].sort());
                                } else {
                                  setEditScheduledDays((prev) => prev.filter((d) => d !== index));
                                }
                              }}
                              className="peer sr-only"
                            />
                            <span className="flex min-h-[32px] sm:min-h-[38px] items-center justify-center rounded-xl border border-purple-200/80 bg-white text-[10px] sm:text-xs font-semibold text-gray-700 transition-all peer-checked:border-transparent peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-pink-500 peer-checked:text-white peer-checked:shadow-sm hover:border-purple-300">
                              {day}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Time Selection */}
                    <div className="grid grid-cols-2 gap-3">
                      <TimePickerInput
                        value={editStartTime}
                        onChange={setEditStartTime}
                        label="Start Time"
                        popoverPosition="top"
                        align="left"
                        required
                        disabled={isSubmitting}
                      />
                      <TimePickerInput
                        value={editEndTime}
                        onChange={setEditEndTime}
                        label="End Time"
                        popoverPosition="top"
                        align="right"
                        required
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* Color Selection */}
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-purple-50/60 border border-purple-100/90 space-y-2">
                      <label className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                        <Palette className="w-4 h-4 text-purple-700" />
                        Habit Color
                      </label>
                      <div className="grid grid-cols-9 gap-1 sm:gap-2.5 justify-items-center pt-0.5">
                        {PASTEL_HABIT_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setEditHabitColor(c)}
                            className={`h-6 w-6 sm:h-8 sm:w-8 rounded-full border-2 transition-all flex items-center justify-center shrink-0 ${
                              editHabitColor === c
                                ? 'border-purple-600 scale-110 shadow-md ring-2 ring-purple-400/40'
                                : 'border-white/80 hover:scale-105'
                            }`}
                            style={{ backgroundColor: c }}
                            aria-label={`Select color ${c}`}
                            disabled={isSubmitting}
                          >
                            {editHabitColor === c && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white drop-shadow-xs" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Target Goal (Optional) */}
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-purple-50/60 border border-purple-100/90 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-xs font-bold text-purple-900 flex items-center gap-1.5 shrink-0">
                          <Target className="w-4 h-4 text-purple-700" />
                          Quantitative Target Goal <span className="font-normal text-purple-600">(Optional)</span>
                        </label>
                        <span className="text-[11px] font-medium text-purple-600 truncate text-right">e.g. 5 videos, 10 pages</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-1">Target Value</label>
                          <input
                            type="number"
                            min="1"
                            value={editTargetValue ?? ''}
                            onChange={(e) => setEditTargetValue(e.target.value ? Math.max(1, parseInt(e.target.value)) : undefined)}
                            placeholder="e.g. 5"
                            className="w-full min-h-[38px] rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs sm:text-sm text-gray-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-1">Unit</label>
                          <input
                            type="text"
                            value={editTargetUnit ?? ''}
                            onChange={(e) => setEditTargetUnit(e.target.value)}
                            placeholder="e.g. videos, pages"
                            className="w-full min-h-[38px] rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs sm:text-sm text-gray-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 p-4 sm:p-5 bg-purple-50/50 border-t border-purple-100/80 shrink-0">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={isSubmitting}
                      className="w-full sm:w-1/2 min-h-[42px] px-4 py-2.5 rounded-xl border border-purple-200 bg-white text-xs sm:text-sm font-semibold text-purple-700 hover:bg-purple-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-1/2 min-h-[42px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white text-xs sm:text-sm font-semibold hover:from-purple-700 hover:to-pink-600 transition shadow-md shadow-purple-500/20 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )}

        {/* Delete Confirmation Modal */}
        {deletingHabitId &&
          createPortal(
            <div className="fixed inset-0 bg-gradient-to-b from-slate-950/35 via-purple-900/20 to-fuchsia-900/30 backdrop-blur-0 sm:backdrop-blur-[2px] flex items-center justify-center z-[9999] p-4">
              <div className="modal-enter max-w-sm w-full max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-rose-100/80 bg-white/95 backdrop-blur-none sm:backdrop-blur-xl p-5 sm:p-6 shadow-[0_24px_56px_rgba(244,63,94,0.22)]">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-rose-100 border border-rose-200 rounded-full mb-4">
                  <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4v2m0-10H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-5z"
                    />
                  </svg>
                </div>
                <h3 className="text-base sm:text-xl font-bold text-gray-900 text-center mb-2">Delete Habit?</h3>
                <p className="text-xs sm:text-sm text-gray-700 text-center mb-6">
                  This action cannot be undone. All habit data will be permanently deleted.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeletingHabitId(null)}
                    className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg transition duration-200 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteHabit}
                    className="flex-1 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-semibold py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg transition duration-200 text-sm shadow-[0_8px_20px_rgba(244,63,94,0.28)]"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* Weekly Schedule Timetable Modal */}
        <WeeklyScheduleModal
          isOpen={isWeeklyModalOpen}
          onClose={() => setIsWeeklyModalOpen(false)}
          habits={habitsToDisplay}
          onEditHabit={handleEditHabit}
        />

        {/* Manage Habit Sets Modal */}
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
