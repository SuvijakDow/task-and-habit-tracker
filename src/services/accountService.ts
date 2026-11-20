import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  runTransaction,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { DEFAULT_PRESET_COLOR, DEFAULT_PRESET_NAME } from '@/constants/defaults';

const USER_DATA_COLLECTIONS = ['tasks', 'categories', 'dailyHabits', 'habitSets', 'taskPresets'] as const;
const USERS_COLLECTION = 'users';

const deleteInBatches = async (refs: Array<ReturnType<typeof doc>>) => {
  for (let index = 0; index < refs.length; index += 450) {
    const batch = writeBatch(db);
    refs.slice(index, index + 450).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
};

const resetPresetCollection = async (
  userId: string,
  collectionName: 'taskPresets' | 'habitSets',
  userDefaultField: 'defaultTaskPresetId' | 'defaultHabitSetId'
): Promise<void> => {
  const snapshot = await getDocs(
    query(collection(db, collectionName), where('userId', '==', userId))
  );
  await deleteInBatches(snapshot.docs.map((d) => d.ref));

  const userRef = doc(db, USERS_COLLECTION, userId);
  const newPresetRef = doc(collection(db, collectionName));

  await runTransaction(db, async (transaction) => {
    const defaultId = newPresetRef.id;
    transaction.set(newPresetRef, {
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
        [userDefaultField]: defaultId,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );
  });
};

/** Clear all user data collections without deleting the user profile doc (used by replace import). */
export const clearAllUserData = async (userId: string): Promise<void> => {
  const snapshots = await Promise.all(
    USER_DATA_COLLECTIONS.map((collectionName) =>
      getDocs(query(collection(db, collectionName), where('userId', '==', userId)))
    )
  );
  await deleteInBatches(snapshots.flatMap((snapshot) => snapshot.docs.map((d) => d.ref)));
};

/** Permanently removes every Firestore record owned by a user, including the user profile. */
export const deleteUserData = async (userId: string): Promise<void> => {
  await clearAllUserData(userId);
  await deleteDoc(doc(db, USERS_COLLECTION, userId));
};

export const resetUserTasks = async (userId: string): Promise<void> => {
  const snapshot = await getDocs(query(collection(db, 'tasks'), where('userId', '==', userId)));
  await deleteInBatches(snapshot.docs.map((d) => d.ref));
};

export const resetUserDailyHabits = async (userId: string): Promise<void> => {
  const snapshot = await getDocs(
    query(collection(db, 'dailyHabits'), where('userId', '==', userId))
  );
  await deleteInBatches(snapshot.docs.map((d) => d.ref));
};

export const resetUserTaskPresets = async (userId: string): Promise<void> => {
  await resetPresetCollection(userId, 'taskPresets', 'defaultTaskPresetId');
};

export const resetUserHabitSets = async (userId: string): Promise<void> => {
  await resetPresetCollection(userId, 'habitSets', 'defaultHabitSetId');
};
