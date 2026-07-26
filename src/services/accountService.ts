import { collection, deleteDoc, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from '@/utils/firebase';

const USER_DATA_COLLECTIONS = ['tasks', 'categories', 'dailyHabits', 'habitSets', 'taskPresets'] as const;

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
