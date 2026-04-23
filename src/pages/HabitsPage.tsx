import React, { useState, useEffect } from 'react';
import { DailyHabit } from '@/types';
import { useAuth } from '@/context/AuthContext';
import {
  createDailyHabit,
  getUserDailyHabits,
  markHabitCompletedToday,
  unmarkHabitCompletedDate,
  deleteDailyHabit,
} from '@/services/habitService';
import { getTodayDateString } from '@/utils/dateUtils';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/utils/firebase';

export function HabitsPage() {
  const { user, loading: authLoading } = useAuth();
  const [habits, setHabits] = useState<DailyHabit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [habitTitle, setHabitTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [todayDate] = useState(getTodayDateString());

  // Edit state
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [editHabitTitle, setEditHabitTitle] = useState('');

  // Scheduled days state
  const [scheduledDays, setScheduledDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [editScheduledDays, setEditScheduledDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  // Delete confirmation state
  const [deletingHabitId, setDeletingHabitId] = useState<string | null>(null);

  // Drag state
  const [draggedHabitId, setDraggedHabitId] = useState<string | null>(null);
  const [overHabitId, setOverHabitId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setHabits([]);
      setLoading(false);
      return;
    }

    loadHabits();
  }, [user]);

  const loadHabits = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const userHabits = await getUserDailyHabits(user.uid);
      setHabits(userHabits.sort((a, b) => (a.order || 0) - (b.order || 0)));
      setError(null);
    } catch (err) {
      setError('Failed to load habits. Please try again.');
      console.error('Error loading habits:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!habitTitle.trim()) {
      setError('Habit name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const newHabitId = await createDailyHabit(user.uid, {
        title: habitTitle.trim(),
        completedDates: [],
        scheduledDays,
      });

      setHabits((prev) => [
        ...prev,
        {
          id: newHabitId,
          userId: user.uid,
          title: habitTitle.trim(),
          completedDates: [],
          scheduledDays,
          createdAt: new Date(),
          updatedAt: new Date(),
          order: prev.length,
        },
      ]);

      setHabitTitle('');
      setScheduledDays([0, 1, 2, 3, 4, 5, 6]);
    } catch (err) {
      setError('Failed to add habit. Please try again.');
      console.error('Error adding habit:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleHabit = async (habitId: string, isCompletedToday: boolean) => {
    if (!user) return;

    try {
      setError(null);
      if (isCompletedToday) {
        await unmarkHabitCompletedDate(habitId, todayDate);
      } else {
        await markHabitCompletedToday(habitId);
      }

      const updatedHabits = habits.map((habit) => {
        if (habit.id === habitId) {
          const completedDates = isCompletedToday
            ? habit.completedDates.filter((date) => date !== todayDate)
            : [...habit.completedDates, todayDate];
          return { ...habit, completedDates };
        }
        return habit;
      });

      setHabits(updatedHabits);
    } catch (err) {
      setError('Failed to update habit. Please try again.');
      console.error('Error toggling habit:', err);
    }
  };

  const handleEditHabit = (habitId: string, title: string, days: number[]) => {
    setEditingHabitId(habitId);
    setEditHabitTitle(title);
    setEditScheduledDays(days);
  };

  const handleSaveEdit = async () => {
    if (!user || !editingHabitId) return;

    if (!editHabitTitle.trim()) {
      setError('Habit name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await updateDoc(doc(db, 'dailyHabits', editingHabitId), {
        title: editHabitTitle.trim(),
        scheduledDays: editScheduledDays,
        updatedAt: new Date(),
      });

      const updatedHabits = habits.map((habit) =>
        habit.id === editingHabitId
          ? {
              ...habit,
              title: editHabitTitle.trim(),
              scheduledDays: editScheduledDays,
              updatedAt: new Date(),
            }
          : habit
      );

      setHabits(updatedHabits);
      setEditingHabitId(null);
      setEditHabitTitle('');
      setEditScheduledDays([0, 1, 2, 3, 4, 5, 6]);
    } catch (err) {
      setError('Failed to save habit. Please try again.');
      console.error('Error saving habit:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingHabitId(null);
    setEditHabitTitle('');
    setEditScheduledDays([0, 1, 2, 3, 4, 5, 6]);
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

  // Drag and drop handlers
  const handleDragStart = (habitId: string) => {
    setDraggedHabitId(habitId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (habitId: string) => {
    if (draggedHabitId !== habitId) {
      setOverHabitId(habitId);
    }
  };

  const handleDragLeave = () => {
    setOverHabitId(null);
  };

  const handleDrop = async (targetHabitId: string) => {
    if (!draggedHabitId || draggedHabitId === targetHabitId) {
      setDraggedHabitId(null);
      setOverHabitId(null);
      return;
    }

    const draggedIndex = habits.findIndex((h) => h.id === draggedHabitId);
    const targetIndex = habits.findIndex((h) => h.id === targetHabitId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      const newHabits = [...habits];
      [newHabits[draggedIndex], newHabits[targetIndex]] = [
        newHabits[targetIndex],
        newHabits[draggedIndex],
      ];

      setHabits(newHabits);

      // Update order field in Firestore
      try {
        await Promise.all(
          newHabits.map((habit, index) =>
            updateDoc(doc(db, 'dailyHabits', habit.id), { order: index })
          )
        );
      } catch (err) {
        console.error('Error updating habit order:', err);
      }
    }

    setDraggedHabitId(null);
    setOverHabitId(null);
  };

  // Touch handlers for mobile drag (for future implementation)
  // const handleTouchStart = (habitId: string, e: React.TouchEvent) => {
  //   setDraggedHabitId(habitId);
  // };

  if (authLoading) {
    return <div className="text-center py-8">Loading...</div>;
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
    <div className="min-h-screen py-8 md:py-12 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 md:mb-10">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Daily Habits</h1>
          <p className="text-sm text-gray-600 mt-1.5">Build better routines</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 text-xs sm:text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* Add Habit Form */}
        <div className="bg-white/55 backdrop-blur-md rounded-3xl border border-white/40 shadow-xl shadow-purple-500/10 p-6 md:p-8 mb-8 md:mb-10">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Add New Habit</h2>
          <form onSubmit={handleAddHabit} className="space-y-4">
            <div>
              <label htmlFor="habit-title" className="block text-sm font-medium text-gray-700 mb-1">
                Habit Name *
              </label>
              <input
                id="habit-title"
                type="text"
                value={habitTitle}
                onChange={(e) => setHabitTitle(e.target.value)}
                placeholder="e.g., Morning Exercise, Read 30 mins"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                disabled={isSubmitting}
              />
            </div>

            {/* Days Selection */}
            <div className="bg-white/60 rounded-2xl p-4 md:p-5">
              <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-3">Schedule (select days):</p>
              <div className="flex flex-wrap gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                  <label key={index} className="flex items-center gap-2 cursor-pointer">
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
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 cursor-pointer"
                    />
                    <span className="text-xs sm:text-sm text-gray-700">{day}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 text-sm"
            >
              {isSubmitting ? 'Adding...' : 'Add Habit'}
            </button>
          </form>
        </div>

        {/* Habits List */}
        {!loading && habits.length === 0 ? (
          <div className="bg-white/55 backdrop-blur-md rounded-3xl border border-white/40 shadow-xl shadow-purple-500/10 p-8 md:p-12 text-center">
            <div className="text-purple-300 text-4xl md:text-5xl mb-4">✨</div>
            <h3 className="text-lg md:text-xl font-semibold text-gray-800 mb-2">No habits yet</h3>
            <p className="text-xs sm:text-sm text-gray-600">Start building better habits by adding one above!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {habits.map((habit) => {
              const isCompletedToday = habit.completedDates.includes(todayDate);
              const streak = habit.completedDates.length;
              const isDragging = draggedHabitId === habit.id;
              const isOver = overHabitId === habit.id;

              return (
                <div key={habit.id}>
                  <div
                    draggable
                    data-habit-id={habit.id}
                    onDragStart={() => handleDragStart(habit.id)}
                    onDragOver={handleDragOver}
                    onDragEnter={() => handleDragEnter(habit.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={() => handleDrop(habit.id)}
                    className={`bg-white/50 backdrop-blur-md rounded-3xl border border-white/40 shadow-xl shadow-purple-500/10 p-6 flex items-start gap-2 sm:gap-2 md:gap-3 transition-all duration-200 cursor-move group ${
                      isCompletedToday ? 'bg-gradient-to-r from-white/55 to-pink-50/60' : ''
                    } ${isDragging ? 'opacity-50 scale-95' : 'hover:shadow-2xl'} ${
                      isOver ? 'ring-2 ring-purple-400 ring-opacity-50' : ''
                    }`}
                  >
                    {/* Desktop Drag Handle */}
                    <div className="flex-shrink-0 text-gray-300 group-hover:text-purple-400 transition-colors duration-200 hidden sm:block">
                      <svg className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
                      </svg>
                      <svg className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 -mt-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
                      </svg>
                    </div>

                    {/* Mobile Drag Handle */}
                    <div
                      className="flex-shrink-0 text-gray-400 active:text-purple-400 transition-colors duration-200 sm:hidden"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
                      </svg>
                      <svg className="w-4 h-4 -mt-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
                      </svg>
                    </div>

                    {/* Checkbox + Title */}
                    <div className="flex items-start gap-2 sm:gap-2.5 flex-1 min-w-0">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isCompletedToday}
                        aria-label={`Mark ${habit.title} as ${isCompletedToday ? 'incomplete' : 'completed'}`}
                        onClick={() => handleToggleHabit(habit.id, isCompletedToday)}
                        className={`mt-0.5 h-4 w-4 sm:h-5 sm:w-5 rounded-full border transition-all duration-200 flex items-center justify-center flex-shrink-0 ${
                          isCompletedToday
                            ? 'bg-gradient-to-br from-pink-400 to-purple-500 border-transparent text-white shadow-[0_6px_16px_rgba(184,109,214,0.45)]'
                            : 'bg-white/70 border-purple-200 text-transparent hover:border-purple-300'
                        }`}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>

                      <div className="min-w-0 flex-1">
                        <span
                          className={`text-xs sm:text-sm md:text-sm font-medium transition-all truncate block ${
                            isCompletedToday
                              ? 'text-purple-700 line-through opacity-70'
                              : 'text-gray-900'
                          }`}
                        >
                          {habit.title}
                        </span>
                        <span className="inline-flex mt-2 text-xs sm:text-xs md:text-sm font-semibold text-purple-700 bg-white/65 px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap">
                          🔥 {streak}
                        </span>
                      </div>
                    </div>

                    <div className="ml-1 flex items-start gap-1 flex-shrink-0 opacity-65 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditHabit(habit.id, habit.title, habit.scheduledDays)}
                        className="h-7 w-7 sm:h-7 sm:w-7 md:h-8 md:w-8 rounded-lg bg-white/35 hover:bg-white/80 text-gray-500 hover:text-blue-600 transition-all flex items-center justify-center"
                        title="Edit habit"
                        aria-label={`Edit ${habit.title}`}
                      >
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeletingHabitId(habit.id)}
                        className="h-7 w-7 sm:h-7 sm:w-7 md:h-8 md:w-8 rounded-lg bg-white/35 hover:bg-white/80 text-gray-500 hover:text-red-600 transition-all flex items-center justify-center"
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
              );
            })}
          </div>
        )}

        {/* Edit Habit Modal */}
        {editingHabitId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Edit Habit</h2>
              <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="space-y-4">
                <div>
                  <label htmlFor="edit-habit-title" className="block text-sm font-medium text-gray-700 mb-1">
                    Habit Name *
                  </label>
                  <input
                    id="edit-habit-title"
                    type="text"
                    value={editHabitTitle}
                    onChange={(e) => setEditHabitTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="bg-purple-50 rounded-lg p-3 md:p-4">
                  <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-3">Schedule:</p>
                  <div className="flex flex-wrap gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                      <label key={index} className="flex items-center gap-2 cursor-pointer">
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
                          className="w-4 h-4 rounded border-gray-300 text-purple-600 cursor-pointer"
                        />
                        <span className="text-xs sm:text-sm text-gray-700">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 text-sm"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isSubmitting}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition duration-200 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingHabitId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0-10H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-5z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 text-center mb-2">Delete Habit?</h3>
              <p className="text-xs sm:text-sm text-gray-600 text-center mb-6">
                This action cannot be undone. All habit data will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingHabitId(null)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition duration-200 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteHabit}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
