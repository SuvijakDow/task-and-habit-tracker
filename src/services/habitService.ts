import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  runTransaction,
  where,
  Timestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '@/utils/firebase';
import { DailyHabit, HabitSet } from '@/types';
import { formatToDateString } from '@/utils/dateUtils';

const DAILY_HABITS_COLLECTION = 'dailyHabits';
const HABIT_SETS_COLLECTION = 'habitSets';
const USERS_COLLECTION = 'users';
const DEFAULT_HABIT_SET_NAME = 'General';

const ensureDefaultHabitSet = async (userId: string, sets: HabitSet[]): Promise<string> => {
  const activeOrFirst = sets.find((set) => set.isActive) || sets[0];
  if (sets.length > 0 && activeOrFirst) {
    return activeOrFirst.id;
  }

  const userRef = doc(db, USERS_COLLECTION, userId);
  const newSetRef = doc(collection(db, HABIT_SETS_COLLECTION));

  return runTransaction(db, async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const savedSetId = userSnapshot.data()?.defaultHabitSetId;
    if (typeof savedSetId === 'string' && savedSetId) {
      const savedSet = await transaction.get(doc(db, HABIT_SETS_COLLECTION, savedSetId));
      if (savedSet.exists()) return savedSetId;
    }

    const defaultSetId = newSetRef.id;
    transaction.set(newSetRef, {
      userId,
      name: DEFAULT_HABIT_SET_NAME,
      color: '#C084FC',
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    transaction.set(userRef, {
      defaultHabitSetId: defaultSetId,
      updatedAt: Timestamp.now(),
    }, { merge: true });
    return defaultSetId;
  });
};

const mergeDuplicateDefaultHabitSets = async (
  userId: string,
  sets: HabitSet[],
  defaultSetId: string
): Promise<void> => {
  const duplicates = sets.filter((set) => set.name === DEFAULT_HABIT_SET_NAME && set.id !== defaultSetId);
  await Promise.all(duplicates.map(async (duplicate) => {
    const habits = await getDocs(query(
      collection(db, DAILY_HABITS_COLLECTION),
      where('userId', '==', userId),
      where('setId', '==', duplicate.id)
    ));
    await Promise.all(habits.docs.map((habit) => updateDoc(habit.ref, {
      setId: defaultSetId,
      updatedAt: Timestamp.now(),
    })));
    await deleteDoc(doc(db, HABIT_SETS_COLLECTION, duplicate.id));
  }));
};

/**
 * Habit Set (Routine Preset) Services
 */
export const getUserHabitSets = async (userId: string): Promise<HabitSet[]> => {
  try {
    const q = query(
      collection(db, HABIT_SETS_COLLECTION),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);

    let sets = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as HabitSet[];

    if (sets.length === 0) {
      const defaultSetId = await ensureDefaultHabitSet(userId, sets);
      await mergeDuplicateDefaultHabitSets(userId, sets, defaultSetId);

      const updatedSnapshot = await getDocs(q);
      sets = updatedSnapshot.docs.map((setDoc) => ({
        id: setDoc.id,
        ...setDoc.data(),
        createdAt: setDoc.data().createdAt?.toDate() || new Date(),
        updatedAt: setDoc.data().updatedAt?.toDate() || new Date(),
      })) as HabitSet[];
    }

    return sets;
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.warn('Firestore Rule Notice: "habitSets" collection requires permission rules in Firebase Console.');
    } else {
      console.error('Error getting user habit sets:', error);
    }
    return [];
  }
};

export const createHabitSet = async (
  userId: string,
  setData: { name: string; color?: string; isActive?: boolean }
): Promise<HabitSet> => {
  try {
    const docRef = await addDoc(collection(db, HABIT_SETS_COLLECTION), {
      userId,
      name: setData.name,
      color: setData.color || '#C084FC',
      isActive: setData.isActive ?? false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return {
      id: docRef.id,
      userId,
      name: setData.name,
      color: setData.color || '#C084FC',
      isActive: setData.isActive ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error('Error creating habit set:', error);
    throw error;
  }
};

export const setActiveHabitSet = async (userId: string, targetSetId: string): Promise<void> => {
  try {
    const sets = await getUserHabitSets(userId);
    const updatePromises = sets.map((set) => {
      const isTarget = set.id === targetSetId;
      if (set.isActive !== isTarget) {
        const docRef = doc(db, HABIT_SETS_COLLECTION, set.id);
        return updateDoc(docRef, {
          isActive: isTarget,
          updatedAt: Timestamp.now(),
        });
      }
      return Promise.resolve();
    });
    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error setting active habit set:', error);
    throw error;
  }
};

export const updateHabitSet = async (
  setId: string,
  updates: Partial<Pick<HabitSet, 'name' | 'color'>>
): Promise<void> => {
  try {
    const docRef = doc(db, HABIT_SETS_COLLECTION, setId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating habit set:', error);
    throw error;
  }
};

export const deleteHabitSet = async (setId: string, userId?: string): Promise<void> => {
  try {
    const docRef = doc(db, HABIT_SETS_COLLECTION, setId);
    await deleteDoc(docRef);

    if (userId) {
      const q = query(
        collection(db, DAILY_HABITS_COLLECTION),
        where('userId', '==', userId),
        where('setId', '==', setId)
      );
      const snapshot = await getDocs(q);
      await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
    }
  } catch (error) {
    console.error('Error deleting habit set:', error);
    throw error;
  }
};

export const createDailyHabit = async (
  userId: string,
  habitData: Omit<DailyHabit, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, DAILY_HABITS_COLLECTION), {
      userId,
      ...habitData,
      completedDates: habitData.completedDates || [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating daily habit:', error);
    throw error;
  }
};

export const PASTEL_HABIT_COLORS = [
  '#F87171', // Red
  '#FB923C', // Orange
  '#FACC15', // Yellow
  '#34D399', // Emerald
  '#2DD4BF', // Teal
  '#38BDF8', // Sky
  '#60A5FA', // Blue
  '#C084FC', // Purple
  '#F472B6', // Pink
];

export const getHabitColorHex = (habit: DailyHabit, habits: DailyHabit[]): string => {
  if (habit.color && habit.color.startsWith('#')) {
    return habit.color;
  }
  const index = habits.findIndex((h) => h.id === habit.id);
  return PASTEL_HABIT_COLORS[(index >= 0 ? index : 0) % PASTEL_HABIT_COLORS.length];
};

export const hexToRgba = (hex: string, alpha: number): string => {
  if (!hex || !hex.startsWith('#') || hex.length !== 7) {
    return `rgba(167, 139, 250, ${alpha})`;
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Get all daily habits for a user
 */
export const getUserDailyHabits = async (userId: string): Promise<DailyHabit[]> => {
  try {
    const q = query(
      collection(db, DAILY_HABITS_COLLECTION),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      scheduledDays: doc.data().scheduledDays || [0, 1, 2, 3, 4, 5, 6],
      startTime: doc.data().startTime || '09:00',
      endTime: doc.data().endTime || '10:00',
      color: doc.data().color || undefined,
      setId: doc.data().setId || undefined,
      trackingStartDate: doc.data().trackingStartDate ? doc.data().trackingStartDate.toDate() : undefined,
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate(),
    })) as DailyHabit[];
  } catch (error) {
    console.error('Error getting user daily habits:', error);
    throw error;
  }
};

/**
 * Get a single daily habit by ID
 */
export const getDailyHabitById = async (habitId: string): Promise<DailyHabit | null> => {
  try {
    const docRef = doc(db, DAILY_HABITS_COLLECTION, habitId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    return {
      id: docSnap.id,
      ...docSnap.data(),
      scheduledDays: docSnap.data().scheduledDays || [0, 1, 2, 3, 4, 5, 6],
      startTime: docSnap.data().startTime || '09:00',
      endTime: docSnap.data().endTime || '10:00',
      trackingStartDate: docSnap.data().trackingStartDate ? docSnap.data().trackingStartDate.toDate() : undefined,
      createdAt: docSnap.data().createdAt.toDate(),
      updatedAt: docSnap.data().updatedAt.toDate(),
    } as DailyHabit;
  } catch (error) {
    console.error('Error getting daily habit:', error);
    throw error;
  }
};

/**
 * Update a daily habit
 */
export const updateDailyHabit = async (
  habitId: string,
  updates: Partial<Omit<DailyHabit, 'id' | 'userId' | 'createdAt'>>
): Promise<void> => {
  try {
    const docRef = doc(db, DAILY_HABITS_COLLECTION, habitId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating daily habit:', error);
    throw error;
  }
};

/**
 * Reset habit data (clear completed dates and set new tracking start date)
 */
export const resetHabitData = async (habitId: string): Promise<void> => {
  try {
    const docRef = doc(db, DAILY_HABITS_COLLECTION, habitId);
    await updateDoc(docRef, {
      completedDates: [],
      trackingStartDate: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error resetting habit data:', error);
    throw error;
  }
};

/**
 * Mark habit as completed for today
 */
export const markHabitCompletedToday = async (habitId: string): Promise<void> => {
  try {
    const docRef = doc(db, DAILY_HABITS_COLLECTION, habitId);
    const today = formatToDateString(new Date());
    
    await updateDoc(docRef, {
      completedDates: arrayUnion(today),
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error marking habit as completed today:', error);
    throw error;
  }
};

/**
 * Unmark habit as completed for a specific date
 */
export const unmarkHabitCompletedDate = async (
  habitId: string,
  dateString: string
): Promise<void> => {
  try {
    const docRef = doc(db, DAILY_HABITS_COLLECTION, habitId);
    
    await updateDoc(docRef, {
      completedDates: arrayRemove(dateString),
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error unmarking habit completion date:', error);
    throw error;
  }
};

/**
 * Check if habit is completed for a specific date
 */
export const isHabitCompletedOnDate = async (
  habitId: string,
  dateString: string
): Promise<boolean> => {
  try {
    const habit = await getDailyHabitById(habitId);
    if (!habit) return false;
    
    return habit.completedDates.includes(dateString);
  } catch (error) {
    console.error('Error checking habit completion:', error);
    throw error;
  }
};

/**
 * Get completion statistics for a habit
 */
export const getHabitStats = async (habitId: string) => {
  try {
    const habit = await getDailyHabitById(habitId);
    if (!habit) return null;
    
    const completedCount = habit.completedDates.length;
    const createdDate = habit.createdAt;
    const daysActive = Math.floor(
      (new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
    const completionRate = Math.round((completedCount / daysActive) * 100);
    
    return {
      completedCount,
      daysActive,
      completionRate,
      currentStreak: calculateStreak(habit.completedDates),
    };
  } catch (error) {
    console.error('Error getting habit stats:', error);
    throw error;
  }
};

/**
 * Calculate current streak for a habit (consecutive completed scheduled days)
 */
export const calculateStreak = (completedDates: string[], scheduledDays?: number[]): number => {
  if (completedDates.length === 0) return 0;
  
  const defaultSchedule = [0, 1, 2, 3, 4, 5, 6];
  const schedule = scheduledDays || defaultSchedule;
  
  let streak = 0;
  let currentDate = new Date();
  
  // Check up to 365 days back
  for (let i = 0; i < 365; i++) {
    const dayOfWeek = currentDate.getDay();
    const dateStr = formatToDateString(currentDate);
    
    // Only count if this day is scheduled
    if (schedule.includes(dayOfWeek)) {
      if (completedDates.includes(dateStr)) {
        streak++;
      } else {
        // Streak broken on a scheduled day
        break;
      }
    }
    // If not scheduled, skip this day without breaking streak
    
    currentDate.setDate(currentDate.getDate() - 1);
  }
  
  return streak;
};

/**
 * Calculate overall consistency percentage
 * (completed on scheduled days / total scheduled days that have passed) * 100
 */
export const calculateConsistency = (completedDates: string[], scheduledDays?: number[], startDateInput?: Date): number => {
  const defaultSchedule = [0, 1, 2, 3, 4, 5, 6];
  const schedule = scheduledDays || defaultSchedule;
  
  // Get the date range (from creation to today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const startDate = startDateInput ? new Date(startDateInput) : new Date(today);
  startDate.setHours(0, 0, 0, 0);
  
  let scheduledDayCount = 0;
  let completedScheduledCount = 0;
  
  // Count scheduled days from creation to today
  let currentDate = new Date(startDate);
  while (currentDate <= today) {
    const dayOfWeek = currentDate.getDay();
    if (schedule.includes(dayOfWeek)) {
      scheduledDayCount++;
      const dateStr = formatToDateString(currentDate);
      if (completedDates.includes(dateStr)) {
        completedScheduledCount++;
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  if (scheduledDayCount === 0) return 0;
  return Math.round((completedScheduledCount / scheduledDayCount) * 100);
};

/**
 * Delete a daily habit
 */
export const deleteDailyHabit = async (habitId: string): Promise<void> => {
  try {
    const docRef = doc(db, DAILY_HABITS_COLLECTION, habitId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting daily habit:', error);
    throw error;
  }
};


/**
 * Reset completion history for ALL habits of a user
 */
export const resetAllHabitsAnalytics = async (userId: string): Promise<void> => {
  try {
    const habits = await getUserDailyHabits(userId);
    await Promise.all(
      habits.map((habit) =>
        updateDoc(doc(db, DAILY_HABITS_COLLECTION, habit.id), {
          completedDates: [],
          updatedAt: Timestamp.now(),
        })
      )
    );
  } catch (error) {
    console.error('Error resetting all habits analytics:', error);
    throw error;
  }
};

/**
 * Get the past 7 days completion status
 */
export const getPast7DaysStatus = (completedDates: string[]): { date: string; completed: boolean }[] => {
  const past7Days = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = formatToDateString(date);
    past7Days.push({
      date: dateStr,
      completed: completedDates.includes(dateStr),
    });
  }
  
  return past7Days;
};

/**
 * Get the day abbreviation from date string (YYYY-MM-DD format)
 */
export const getDayAbbreviation = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-');
  const date = new Date(`${year}-${month}-${day}T00:00:00`);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
};

/**
 * Time utilities for habit timeline
 */
export const timeToMinutes = (timeString: string): number => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

export const minutesToPercent = (minutes: number): number => {
  return (minutes / (24 * 60)) * 100;
};

export const calculateHabitOverlaps = (
  habits: DailyHabit[]
): Map<string, number> => {
  const overlapMap = new Map<string, number>();
  
  habits.forEach((habit, index) => {
    const habitStartMin = timeToMinutes(habit.startTime);
    const habitEndMin = timeToMinutes(habit.endTime);
    
    let overlapCount = 0;
    habits.forEach((otherHabit, otherIndex) => {
      if (index !== otherIndex) {
        const otherStartMin = timeToMinutes(otherHabit.startTime);
        const otherEndMin = timeToMinutes(otherHabit.endTime);
        
        // Check if times overlap
        if (habitStartMin < otherEndMin && habitEndMin > otherStartMin) {
          if (otherIndex < index) overlapCount++;
        }
      }
    });
    
    overlapMap.set(habit.id, overlapCount);
  });
  
  return overlapMap;
};
