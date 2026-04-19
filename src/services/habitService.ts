import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  Timestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '@/utils/firebase';
import { DailyHabit } from '@/types';
import { formatToDateString } from '@/utils/dateUtils';

const DAILY_HABITS_COLLECTION = 'dailyHabits';

/**
 * Create a new daily habit
 */
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
export const calculateConsistency = (completedDates: string[], scheduledDays?: number[], createdAt?: Date): number => {
  const defaultSchedule = [0, 1, 2, 3, 4, 5, 6];
  const schedule = scheduledDays || defaultSchedule;
  
  // Get the date range (from creation to today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const startDate = createdAt ? new Date(createdAt) : new Date(today);
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
