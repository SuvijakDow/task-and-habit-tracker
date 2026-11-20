import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  runTransaction,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { HabitSet } from '@/types';
import { DEFAULT_PRESET_COLOR, DEFAULT_PRESET_NAME } from '@/constants/defaults';

const DAILY_HABITS_COLLECTION = 'dailyHabits';
const HABIT_SETS_COLLECTION = 'habitSets';
const USERS_COLLECTION = 'users';

const mapDocToHabitSet = (docId: string, data: Record<string, any>): HabitSet => ({
  id: docId,
  ...(data as Omit<HabitSet, 'id' | 'createdAt' | 'updatedAt'>),
  createdAt: data.createdAt?.toDate?.() || new Date(),
  updatedAt: data.updatedAt?.toDate?.() || new Date(),
});

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
      name: DEFAULT_PRESET_NAME,
      color: DEFAULT_PRESET_COLOR,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    transaction.set(
      userRef,
      {
        defaultHabitSetId: defaultSetId,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );
    return defaultSetId;
  });
};

export const getUserHabitSets = async (userId: string): Promise<HabitSet[]> => {
  try {
    const q = query(collection(db, HABIT_SETS_COLLECTION), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    let sets = querySnapshot.docs.map((d) => mapDocToHabitSet(d.id, d.data()));

    if (sets.length === 0) {
      await ensureDefaultHabitSet(userId, []);
      const updatedSnapshot = await getDocs(q);
      sets = updatedSnapshot.docs.map((d) => mapDocToHabitSet(d.id, d.data()));
    }

    // Deduplicate habit sets by name if duplicates exist
    const uniqueSetsMap = new Map<string, HabitSet>();
    const duplicatesToDelete: HabitSet[] = [];

    for (const set of sets) {
      const key = set.name.trim().toLowerCase();
      if (!uniqueSetsMap.has(key)) {
        uniqueSetsMap.set(key, set);
      } else {
        const existing = uniqueSetsMap.get(key)!;
        if (set.isActive && !existing.isActive) {
          duplicatesToDelete.push(existing);
          uniqueSetsMap.set(key, set);
        } else {
          duplicatesToDelete.push(set);
        }
      }
    }

    if (duplicatesToDelete.length > 0) {
      const keepSetId = Array.from(uniqueSetsMap.values())[0]?.id;
      if (keepSetId) {
        await Promise.all(
          duplicatesToDelete.map(async (duplicate) => {
            const habitsSnapshot = await getDocs(
              query(
                collection(db, DAILY_HABITS_COLLECTION),
                where('userId', '==', userId),
                where('setId', '==', duplicate.id)
              )
            );
            await Promise.all(
              habitsSnapshot.docs.map((habitDoc) =>
                updateDoc(habitDoc.ref, {
                  setId: keepSetId,
                  updatedAt: Timestamp.now(),
                })
              )
            );
            await deleteDoc(doc(db, HABIT_SETS_COLLECTION, duplicate.id));
          })
        );
      }
      return Array.from(uniqueSetsMap.values());
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
    const color = setData.color || DEFAULT_PRESET_COLOR;
    const isActive = setData.isActive ?? false;
    const docRef = await addDoc(collection(db, HABIT_SETS_COLLECTION), {
      userId,
      name: setData.name,
      color,
      isActive,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return {
      id: docRef.id,
      userId,
      name: setData.name,
      color,
      isActive,
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
    await Promise.all(
      sets
        .filter((set) => set.isActive !== (set.id === targetSetId))
        .map((set) =>
          updateDoc(doc(db, HABIT_SETS_COLLECTION, set.id), {
            isActive: set.id === targetSetId,
            updatedAt: Timestamp.now(),
          })
        )
    );
  } catch (error) {
    console.error('Error setting active habit set:', error);
    throw error;
  }
};

export const updateHabitSet = async (
  setId: string,
  updates: Partial<Pick<HabitSet, 'name' | 'color' | 'isActive'>>
): Promise<void> => {
  try {
    await updateDoc(doc(db, HABIT_SETS_COLLECTION, setId), {
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
    await deleteDoc(doc(db, HABIT_SETS_COLLECTION, setId));

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
