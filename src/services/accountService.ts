import { collection, deleteDoc, doc, getDocs, query, where, writeBatch, runTransaction, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

const USER_DATA_COLLECTIONS = ['tasks', 'categories', 'dailyHabits', 'habitSets', 'taskPresets'] as const;
const USERS_COLLECTION = 'users';
const DEFAULT_PRESET_NAME = 'General';

const deleteInBatches = async (refs: Array<ReturnType<typeof doc>>) => {
  for (let index = 0; index < refs.length; index += 450) {
    const batch = writeBatch(db);
    refs.slice(index, index + 450).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
};

/** Permanently removes every Firestore record owned by a user. */
export const deleteUserData = async (userId: string): Promise<void> => {
  const snapshots = await Promise.all(
    USER_DATA_COLLECTIONS.map((collectionName) => getDocs(query(
      collection(db, collectionName),
      where('userId', '==', userId)
    )))
  );

  await deleteInBatches(snapshots.flatMap((snapshot) => snapshot.docs.map((snapshotDoc) => snapshotDoc.ref)));
  await deleteDoc(doc(db, 'users', userId));
};

/** Reset all tasks for a user. */
export const resetUserTasks = async (userId: string): Promise<void> => {
  const snapshot = await getDocs(query(collection(db, 'tasks'), where('userId', '==', userId)));
  await deleteInBatches(snapshot.docs.map((d) => d.ref));
};

/** Reset all daily habits for a user. */
export const resetUserDailyHabits = async (userId: string): Promise<void> => {
  const snapshot = await getDocs(query(collection(db, 'dailyHabits'), where('userId', '==', userId)));
  await deleteInBatches(snapshot.docs.map((d) => d.ref));
};

/** Reset all task presets and create a new General preset. */
export const resetUserTaskPresets = async (userId: string): Promise<void> => {
  // Delete all existing task presets
  const snapshot = await getDocs(query(collection(db, 'taskPresets'), where('userId', '==', userId)));
  await deleteInBatches(snapshot.docs.map((d) => d.ref));

  // Create a new General preset
  const userRef = doc(db, USERS_COLLECTION, userId);
  const newPresetRef = doc(collection(db, 'taskPresets'));

  await runTransaction(db, async (transaction) => {
    const defaultPresetId = newPresetRef.id;
    transaction.set(newPresetRef, {
      userId,
      name: DEFAULT_PRESET_NAME,
      color: '#C084FC',
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    transaction.set(userRef, {
      defaultTaskPresetId: defaultPresetId,
      updatedAt: Timestamp.now(),
    }, { merge: true });
  });
};

/** Reset all habit sets and create a new General set. */
export const resetUserHabitSets = async (userId: string): Promise<void> => {
  // Delete all existing habit sets
  const snapshot = await getDocs(query(collection(db, 'habitSets'), where('userId', '==', userId)));
  await deleteInBatches(snapshot.docs.map((d) => d.ref));

  // Create a new General habit set
  const userRef = doc(db, USERS_COLLECTION, userId);
  const newSetRef = doc(collection(db, 'habitSets'));

  await runTransaction(db, async (transaction) => {
    const defaultSetId = newSetRef.id;
    transaction.set(newSetRef, {
      userId,
      name: DEFAULT_PRESET_NAME,
      color: '#C084FC',
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    transaction.set(userRef, {
      defaultHabitSetId: defaultSetId,
      updatedAt: Timestamp.now(),
    }, { merge: true });
  });
};
