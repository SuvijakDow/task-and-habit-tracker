import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { DailyHabit } from '@/types';
import { ALL_WEEKDAYS } from '@/constants/defaults';
import { formatToDateString } from '@/utils/dateUtils';

// Re-export split modules so consumers can import from focused modules or habitService seamlessly
export {
  getUserHabitSets,
  createHabitSet,
  setActiveHabitSet,
  updateHabitSet,
  deleteHabitSet,
} from '@/services/habitSetService';
export {
  calculateTotalCompletions,
  calculateStreak,
  calculateConsistency,
  getPast7DaysStatus,
  getDayAbbreviation,
} from '@/utils/habitStats';
export {
  getHabitTimeSlotsForDay,
  sortHabitsByTodaySchedule,
  timeToMinutes,
  formatScheduledDays,
} from '@/utils/habitSchedule';
export { PASTEL_HABIT_COLORS } from '@/constants/colors';
export { getHabitColorHex, hexToRgba } from '@/utils/colorUtils';

const DAILY_HABITS_COLLECTION = 'dailyHabits';

export type HabitDateStatus = 'completed' | 'not_scheduled' | 'missed' | 'partial';

const mapDocToHabit = (docId: string, data: Record<string, any>): DailyHabit =>
  ({
    id: docId,
    ...data,
    scheduledDays: data.scheduledDays || [...ALL_WEEKDAYS],
    startTime: data.startTime || '09:00',
    endTime: data.endTime || '10:00',
    customSchedule: data.customSchedule || undefined,
    color: data.color || undefined,
    setId: data.setId || undefined,
    setIds: Array.isArray(data.setIds) ? data.setIds : data.setId ? [data.setId] : [],
    targetValue: data.targetValue || undefined,
    targetUnit: data.targetUnit || undefined,
    dailyProgress: data.dailyProgress || undefined,
    notScheduledDates: data.notScheduledDates || [],
    trackingStartDate: data.trackingStartDate ? data.trackingStartDate.toDate() : undefined,
    createdAt: data.createdAt?.toDate?.() || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || new Date(),
  }) as DailyHabit;

export const createDailyHabit = async (
  userId: string,
  habitData: Omit<DailyHabit, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
): Promise<string> => {
  try {
    const payload: Record<string, any> = {
      userId,
      title: habitData.title,
      completedDates: habitData.completedDates || [],
      scheduledDays: habitData.scheduledDays || [...ALL_WEEKDAYS],
      startTime: habitData.startTime || '09:00',
      endTime: habitData.endTime || '10:00',
      dailyProgress: habitData.dailyProgress || {},
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    if (habitData.color) payload.color = habitData.color;
    if (habitData.setId) payload.setId = habitData.setId;
    if (Array.isArray(habitData.setIds)) {
      payload.setIds = habitData.setIds;
    } else if (habitData.setId) {
      payload.setIds = [habitData.setId];
    }
    if (habitData.targetValue !== undefined && habitData.targetValue !== null && habitData.targetValue > 0) {
      payload.targetValue = habitData.targetValue;
    }
    if (habitData.targetUnit !== undefined && habitData.targetUnit !== null && habitData.targetUnit.trim().length > 0) {
      payload.targetUnit = habitData.targetUnit.trim();
    }
    if (habitData.customSchedule) payload.customSchedule = habitData.customSchedule;
    if (habitData.trackingStartDate) {
      payload.trackingStartDate = Timestamp.fromDate(habitData.trackingStartDate);
    }
    if (Array.isArray(habitData.notScheduledDates)) {
      payload.notScheduledDates = habitData.notScheduledDates;
    }
    if (typeof habitData.order === 'number') {
      payload.order = habitData.order;
    }

    const docRef = await addDoc(collection(db, DAILY_HABITS_COLLECTION), payload);
    return docRef.id;
  } catch (error) {
    console.error('Error creating daily habit:', error);
    throw error;
  }
};

export const getUserDailyHabits = async (userId: string): Promise<DailyHabit[]> => {
  try {
    const q = query(collection(db, DAILY_HABITS_COLLECTION), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((d) => mapDocToHabit(d.id, d.data()));
  } catch (error) {
    console.error('Error getting user daily habits:', error);
    throw error;
  }
};

export const updateHabitProgress = async (
  habitId: string,
  dateString: string,
  progressValue: number,
  targetValue?: number
): Promise<void> => {
  try {
    const docRef = doc(db, DAILY_HABITS_COLLECTION, habitId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;

    const data = docSnap.data();
    const newProgressValue = Math.max(0, progressValue);
    const updatedProgress = { ...(data.dailyProgress || {}), [dateString]: newProgressValue };

    const completedDates: string[] = data.completedDates || [];
    const isAlreadyCompleted = completedDates.includes(dateString);
    const target = targetValue || data.targetValue;

    let nextCompletedDates = [...completedDates];
    if (target && target > 0) {
      if (newProgressValue >= target && !isAlreadyCompleted) {
        nextCompletedDates.push(dateString);
      } else if (newProgressValue < target && isAlreadyCompleted) {
        nextCompletedDates = nextCompletedDates.filter((d) => d !== dateString);
      }
    }

    await updateDoc(docRef, {
      dailyProgress: updatedProgress,
      completedDates: nextCompletedDates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating habit progress:', error);
    throw error;
  }
};

export const updateDailyHabit = async (
  habitId: string,
  updates: Record<string, any>
): Promise<void> => {
  try {
    const docRef = doc(db, DAILY_HABITS_COLLECTION, habitId);
    const cleanUpdates: Record<string, any> = { updatedAt: Timestamp.now() };
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    });
    await updateDoc(docRef, cleanUpdates);
  } catch (error) {
    console.error('Error updating daily habit:', error);
    throw error;
  }
};

export const resetHabitData = async (habitId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, DAILY_HABITS_COLLECTION, habitId), {
      completedDates: [],
      notScheduledDates: [],
      dailyProgress: {},
      trackingStartDate: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error resetting habit data:', error);
    throw error;
  }
};

export const updateHabitDateStatus = async (
  habitId: string,
  dateString: string,
  newStatus: HabitDateStatus,
  progressValue?: number
): Promise<void> => {
  try {
    const docRef = doc(db, DAILY_HABITS_COLLECTION, habitId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;

    const data = docSnap.data();
    let completedDates: string[] = Array.isArray(data.completedDates) ? [...data.completedDates] : [];
    let notScheduledDates: string[] = Array.isArray(data.notScheduledDates)
      ? [...data.notScheduledDates]
      : [];
    const dailyProgress: Record<string, number> = { ...(data.dailyProgress || {}) };
    const targetValue: number | undefined = data.targetValue;

    if (newStatus === 'completed') {
      if (!completedDates.includes(dateString)) {
        completedDates.push(dateString);
      }
      notScheduledDates = notScheduledDates.filter((d) => d !== dateString);
      if (targetValue && targetValue > 0) {
        dailyProgress[dateString] = progressValue !== undefined ? progressValue : targetValue;
      }
    } else if (newStatus === 'not_scheduled') {
      completedDates = completedDates.filter((d) => d !== dateString);
      if (!notScheduledDates.includes(dateString)) {
        notScheduledDates.push(dateString);
      }
      delete dailyProgress[dateString];
    } else if (newStatus === 'missed') {
      completedDates = completedDates.filter((d) => d !== dateString);
      notScheduledDates = notScheduledDates.filter((d) => d !== dateString);
      delete dailyProgress[dateString];
    } else if (newStatus === 'partial') {
      completedDates = completedDates.filter((d) => d !== dateString);
      notScheduledDates = notScheduledDates.filter((d) => d !== dateString);
      const val = progressValue ?? 1;
      dailyProgress[dateString] = val;
      if (targetValue && val >= targetValue) {
        completedDates.push(dateString);
      }
    }

    await updateDoc(docRef, {
      completedDates,
      notScheduledDates,
      dailyProgress,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating habit date status:', error);
    throw error;
  }
};

export const markHabitCompletedToday = async (habitId: string): Promise<void> => {
  try {
    const today = formatToDateString(new Date());
    await updateDoc(doc(db, DAILY_HABITS_COLLECTION, habitId), {
      completedDates: arrayUnion(today),
      notScheduledDates: arrayRemove(today),
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error marking habit as completed today:', error);
    throw error;
  }
};

export const unmarkHabitCompletedDate = async (
  habitId: string,
  dateString: string
): Promise<void> => {
  try {
    await updateDoc(doc(db, DAILY_HABITS_COLLECTION, habitId), {
      completedDates: arrayRemove(dateString),
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error unmarking habit completion date:', error);
    throw error;
  }
};

export const deleteDailyHabit = async (habitId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, DAILY_HABITS_COLLECTION, habitId));
  } catch (error) {
    console.error('Error deleting daily habit:', error);
    throw error;
  }
};
