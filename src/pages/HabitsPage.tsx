import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Activity, Flame, Clock, CalendarRange, Layers, Settings2, ChevronDown } from 'lucide-react';
import { DailyHabit, HabitSet } from '@/types';
import { useAuth } from '@/context/AuthContext';
import {
  createDailyHabit,
  getUserDailyHabits,
  markHabitCompletedToday,
  unmarkHabitCompletedDate,
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
  const { user, userProfile, loading: authLoading } = useAuth();
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

  const handleSelectActiveSet = async (setId: string) => {
    if (!user) return;
    try {
      await setActiveHabitSet(user.uid, setId);
      setActiveSetId(setId);
      setHabitSets((prev) =>
        prev.map((s) => ({ ...s, isActive: s.id === setId }))
      );
      showToast('Activated routine preset', 'success');
    } catch (err) {
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
      setHabitColor(PASTEL_HABIT_COLORS[0]);
      setIsAddModalOpen(false);
    } catch (err) {
      setError('Failed to add habit. Please try again.');
      console.error('Error adding habit:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleHabit = useCallback(
    async (habitId: string, isCompletedToday: boolean) => {
      if (!user) return;

      if (!isCompletedToday) {
        playSuccessSound();
      }

      const habit = habits.find((h) => h.id === habitId);
      if (!habit) return;

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
    [habits, todayDate, user]
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
  const userDisplayName = userProfile?.displayName?.trim() || user.displayName?.trim() || 'there';

  return (
    <div className="min-h-screen pt-3 md:pt-6 pb-6 md:pb-12">
      <div className="max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto px-3 sm:px-6">
        {/* Top Bar Header */}
        <div className="mb-6">
          {/* Desktop/Tablet Header: Everything in one row */}
          <div className="hidden sm:flex items-center justify-between gap-3 w-full">
            <div className="min-w-0 pr-2">
              <h1 className="text-xl sm:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-700 to-pink-600 truncate">
                Hello, {userDisplayName}
              </h1>
              <p className="mt-0.5 text-sm text-gray-500 font-medium">Build better routines.</p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition ${
                    viewMode === 'list' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  aria-pressed={viewMode === 'list'}
                  aria-label="List view"
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition ${
                    viewMode === 'table' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  aria-pressed={viewMode === 'table'}
                  aria-label="Table view"
                >
                  Table
                </button>
              </div>

              {/* Weekly Timetable Button */}
              <button
                onClick={() => setIsWeeklyModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 bg-white text-purple-700 border border-purple-200 hover:bg-purple-50 rounded-xl shadow-xs transition-all text-xs sm:text-sm font-semibold whitespace-nowrap"
              >
                <CalendarRange className="w-4 h-4 text-purple-600" />
                <span>Weekly Timetable</span>
              </button>

              {/* Add Habit Button */}
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
                className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl shadow-[0_8px_20px_rgba(157,78,221,0.25)] hover:shadow-[0_12px_28px_rgba(157,78,221,0.35)] hover:-translate-y-0.5 transition-all text-xs sm:text-sm font-semibold whitespace-nowrap"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Add Habit
              </button>
            </div>
          </div>

          {/* Mobile Header Layout */}
          <div className="sm:hidden flex flex-col gap-3.5 w-full">
            <div className="flex items-center justify-between gap-2 w-full">
              <h1 className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-700 to-pink-600 truncate">
                Hello, {userDisplayName}
              </h1>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => setIsWeeklyModalOpen(true)}
                  className="inline-flex items-center justify-center p-2 bg-white text-purple-700 border border-purple-200 hover:bg-purple-50 rounded-xl shadow-xs text-xs font-semibold"
                  title="Weekly Timetable"
                >
                  <CalendarRange className="w-4 h-4 text-purple-600" />
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
                  className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl shadow-md text-xs font-semibold whitespace-nowrap"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Habit
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 w-full shadow-sm">
              <button
                onClick={() => setViewMode('list')}
                className={`flex-1 px-3 py-2 rounded-md text-xs font-semibold transition ${
                  viewMode === 'list' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-50'
                }`}
                aria-pressed={viewMode === 'list'}
                aria-label="List view"
              >
                List
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex-1 px-3 py-2 rounded-md text-xs font-semibold transition ${
                  viewMode === 'table' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-50'
                }`}
                aria-pressed={viewMode === 'table'}
                aria-label="Table view"
              >
                Table
              </button>
            </div>
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
            <div className="fixed inset-0 bg-gradient-to-b from-slate-950/35 via-purple-900/20 to-fuchsia-900/30 backdrop-blur-0 sm:backdrop-blur-[2px] flex items-end sm:items-center justify-center z-[9999] p-0 sm:p-4">
              <div className="modal-enter w-full sm:max-w-lg h-dvh sm:h-auto max-h-dvh sm:max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white/95 sm:bg-white/88 backdrop-blur-none sm:backdrop-blur-xl border border-white/70 rounded-none sm:rounded-2xl shadow-[0_-12px_32px_rgba(120,87,255,0.24)] sm:shadow-[0_24px_56px_rgba(120,87,255,0.26)]">
                <form onSubmit={handleAddHabit} className="space-y-4 sm:space-y-5 p-4 sm:p-6 md:p-7">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-pink-600">
                      Add New Habit
                    </h2>
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl text-purple-400 hover:text-purple-600 hover:bg-white/80 transition flex items-center justify-center"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div>
                    <label htmlFor="habit-title" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Habit Name *
                    </label>
                    <input
                      id="habit-title"
                      type="text"
                      value={habitTitle}
                      onChange={(e) => setHabitTitle(e.target.value)}
                      placeholder="e.g., Morning Exercise, Read 30 mins"
                      className="w-full min-h-[38px] sm:min-h-[44px] rounded-lg border border-purple-200 bg-white/90 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-base text-gray-800 placeholder:text-gray-400 shadow-sm transition focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 focus:outline-none"
                      disabled={isSubmitting}
                      autoFocus
                    />
                  </div>

                  <div>
                    <label htmlFor="habit-preset" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Routine Preset
                    </label>
                    <select
                      id="habit-preset"
                      value={habitSetId || activeSetId}
                      onChange={(e) => setHabitSetId(e.target.value)}
                      className="w-full min-h-[38px] sm:min-h-[44px] rounded-lg border border-purple-200 bg-white/90 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-base text-gray-800 shadow-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 focus:outline-none"
                    >
                      {habitSets.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.id === activeSetId ? '(Active)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Days Selection */}
                  <div className="bg-gradient-to-br from-purple-50/80 via-white/85 to-pink-50/80 border border-purple-100/70 rounded-lg sm:rounded-xl shadow-sm p-2.5 sm:p-5">
                    <p className="text-[11px] sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Schedule:</p>
                    <div className="grid grid-cols-7 gap-1 sm:gap-2">
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
                          <span className="flex min-h-[28px] sm:min-h-[44px] items-center justify-center rounded-lg border border-purple-200/80 bg-white/90 text-[9px] sm:text-sm font-medium text-gray-700 transition-all peer-checked:border-transparent peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-500 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-purple-300/70">
                            {day}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Time Selection */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
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
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                      Habit Color
                    </label>
                    <div className="flex justify-start flex-wrap gap-2">
                      {PASTEL_HABIT_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setHabitColor(c)}
                          className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 transition flex-shrink-0 ${
                            habitColor === c ? 'border-purple-600 scale-110 shadow-sm' : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: c }}
                          aria-label={`Select color ${c}`}
                          disabled={isSubmitting}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="sticky bottom-0 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-white/95 via-white/90 to-transparent">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 min-h-[38px] sm:min-h-[44px] bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-400 text-white text-xs sm:text-base font-semibold py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl transition duration-200 shadow-[0_8px_20px_rgba(157,78,221,0.25)]"
                    >
                      {isSubmitting ? 'Adding...' : 'Add Habit'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      disabled={isSubmitting}
                      className="flex-1 min-h-[38px] sm:min-h-[44px] bg-white/90 hover:bg-white text-gray-700 border border-purple-100 text-xs sm:text-base font-semibold py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl transition duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )}

        {/* Sleek Compact Routine Bar */}
        <div className="relative z-30 mb-4 flex items-center justify-between gap-2 bg-white/80 backdrop-blur-md p-1.5 sm:p-2 rounded-2xl border border-purple-100/90 shadow-xs">
          <div className="relative routine-dropdown-container flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setIsRoutineDropdownOpen(!isRoutineDropdownOpen)}
              className="w-full flex items-center justify-between min-h-[38px] bg-white border border-purple-200 hover:border-purple-400 rounded-xl px-3 sm:px-4 py-1.5 text-xs sm:text-sm text-gray-900 shadow-xs hover:shadow-sm transition-all font-semibold focus:outline-none"
            >
              <div className="flex items-center gap-2 truncate">
                <Layers className="w-4 h-4 text-purple-600 flex-shrink-0" />
                <span className="text-gray-500 font-normal hidden sm:inline">Routine:</span>
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: activeSet?.color || '#C084FC' }}
                  />
                  <span className="font-bold text-gray-900 truncate">{activeSet?.name || 'General Routine'}</span>
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
                {habitSets.map((set) => {
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
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 transition shadow-xs whitespace-nowrap"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Manage Presets</span>
            <span className="sm:hidden">Manage</span>
          </button>
        </div>

        {/* Content Section: Loading / Error / Empty / Table / List */}
        {loading ? (
          <div className="glass-card p-5 sm:p-8 md:p-12 text-center">
            <div className="flex justify-center mb-3">
              <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-600">Loading your habits...</p>
          </div>
        ) : loadError && habits.length === 0 ? (
          <div className="glass-card p-5 sm:p-8 md:p-12 text-center">
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
                onEdit={handleEditHabit}
                onDelete={(id) => setDeletingHabitId(id)}
                onBulkDelete={handleBulkDeleteHabits}
              />
            ) : (
              <div className="space-y-3 sm:space-y-4 list-stagger">
                {habitsToDisplay.map((habit) => {
                  const isCompletedToday = habit.completedDates.includes(todayDate);
                  const streak = habit.completedDates.length;

                  return (
                    <div key={habit.id}>
                      <div
                        className={`glass-card flex flex-col gap-2.5 py-2.5 md:py-4 px-3 sm:px-6 transition-all duration-200 group ${
                          isCompletedToday ? 'bg-gradient-to-r from-white/55 to-pink-50/60' : ''
                        } hover:shadow-md sm:hover:shadow-2xl`}
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
                        </div>

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

                          <div className="flex flex-row items-center gap-2 opacity-65 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs md:text-sm font-semibold text-purple-700 bg-white/65 px-1.5 sm:px-2 py-0.5 rounded-md whitespace-nowrap">
                              <Flame className="h-3.5 w-3.5 text-pink-500" />
                              {streak}
                            </span>

                            <div className="flex items-center gap-1 sm:gap-2">
                              <button
                                onClick={() => handleEditHabit(habit)}
                                className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 rounded-lg bg-white/35 hover:bg-white/80 text-gray-500 hover:text-blue-600 transition-all flex items-center justify-center"
                                title="Edit habit"
                                aria-label={`Edit ${habit.title}`}
                              >
                                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setDeletingHabitId(habit.id)}
                                className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 rounded-lg bg-white/35 hover:bg-white/80 text-gray-500 hover:text-red-600 transition-all flex items-center justify-center"
                                title="Delete habit"
                                aria-label={`Delete ${habit.title}`}
                              >
                                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

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
            <div className="fixed inset-0 bg-gradient-to-b from-slate-950/35 via-purple-900/20 to-fuchsia-900/30 backdrop-blur-0 sm:backdrop-blur-[2px] flex items-end sm:items-center justify-center z-[10000] p-0 sm:p-4">
              <div className="modal-enter w-full sm:max-w-lg h-dvh sm:h-auto max-h-dvh sm:max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white/95 sm:bg-white/88 backdrop-blur-none sm:backdrop-blur-xl border border-white/70 rounded-none sm:rounded-2xl shadow-[0_-12px_32px_rgba(120,87,255,0.24)] sm:shadow-[0_24px_56px_rgba(120,87,255,0.26)]">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveEdit();
                  }}
                  className="space-y-4 sm:space-y-5 p-4 sm:p-6 md:p-7"
                >
                  <h2 className="text-lg sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-pink-600">
                    Edit Habit
                  </h2>

                  {editError && (
                    <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-start gap-3">
                      <div className="flex-shrink-0 text-rose-600 mt-0.5">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <p className="text-sm text-rose-700 font-medium">{editError}</p>
                    </div>
                  )}

                  <div>
                    <label htmlFor="edit-habit-title" className="block text-sm font-medium text-gray-700 mb-1">
                      Habit Name *
                    </label>
                    <input
                      id="edit-habit-title"
                      type="text"
                      value={editHabitTitle}
                      onChange={(e) => setEditHabitTitle(e.target.value)}
                      className="w-full min-h-[42px] sm:min-h-[44px] rounded-lg border border-purple-200 bg-white/90 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-gray-800 placeholder:text-gray-400 shadow-sm transition focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 focus:outline-none"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-habit-preset" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Routine Preset
                    </label>
                    <select
                      id="edit-habit-preset"
                      value={editHabitSetId || activeSetId}
                      onChange={(e) => setEditHabitSetId(e.target.value)}
                      className="w-full min-h-[38px] sm:min-h-[44px] rounded-lg border border-purple-200 bg-white/90 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-base text-gray-800 shadow-sm focus:border-purple-400 focus:outline-none"
                    >
                      {habitSets.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.id === activeSetId ? '(Active)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50/80 via-white/85 to-pink-50/80 border border-purple-100/70 rounded-xl shadow-sm p-3 sm:p-5">
                    <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-3">Schedule:</p>
                    <div className="grid grid-cols-7 gap-1 sm:gap-2">
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
                          <span className="flex min-h-[28px] sm:min-h-[44px] items-center justify-center rounded-lg border border-purple-200/80 bg-white/90 text-[9px] sm:text-sm font-medium text-gray-700 transition-all peer-checked:border-transparent peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-500 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-purple-300/70">
                            {day}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Time Selection */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
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
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                      Habit Color
                    </label>
                    <div className="flex justify-start flex-wrap gap-2">
                      {PASTEL_HABIT_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditHabitColor(c)}
                          className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 transition flex-shrink-0 ${
                            editHabitColor === c ? 'border-purple-600 scale-110 shadow-sm' : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: c }}
                          aria-label={`Select color ${c}`}
                          disabled={isSubmitting}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="sticky bottom-0 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-white/95 via-white/90 to-transparent">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 min-h-[42px] sm:min-h-[44px] bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-400 text-white text-sm sm:text-base font-semibold py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg transition duration-200 shadow-[0_8px_20px_rgba(157,78,221,0.25)]"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={isSubmitting}
                      className="flex-1 min-h-[42px] sm:min-h-[44px] bg-white/90 hover:bg-white text-gray-700 border border-purple-100 disabled:bg-white/70 disabled:text-gray-500 text-sm sm:text-base font-semibold py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg transition duration-200"
                    >
                      Cancel
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
