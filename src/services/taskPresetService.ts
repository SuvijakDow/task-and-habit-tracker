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
import { db } from '@/utils/firebase';
import { TaskPreset } from '@/types';

const TASK_PRESETS_COLLECTION = 'taskPresets';
const USERS_COLLECTION = 'users';
const DEFAULT_PRESET_NAME = 'General';

const ensureDefaultTaskPreset = async (userId: string, presets: TaskPreset[]): Promise<string> => {
  const activeOrFirst = presets.find((preset) => preset.isActive) || presets[0];
  if (presets.length > 0 && activeOrFirst) {
    return activeOrFirst.id;
  }

  const userRef = doc(db, USERS_COLLECTION, userId);
  const newPresetRef = doc(collection(db, TASK_PRESETS_COLLECTION));

  return runTransaction(db, async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const savedPresetId = userSnapshot.data()?.defaultTaskPresetId;
    if (typeof savedPresetId === 'string' && savedPresetId) {
      const savedPreset = await transaction.get(doc(db, TASK_PRESETS_COLLECTION, savedPresetId));
      if (savedPreset.exists()) return savedPresetId;
    }

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
    return defaultPresetId;
  });
};

const mergeDuplicateDefaultTaskPresets = async (
  userId: string,
  presets: TaskPreset[],
  defaultPresetId: string
): Promise<void> => {
  const duplicates = presets.filter((preset) => preset.name === DEFAULT_PRESET_NAME && preset.id !== defaultPresetId);
  await Promise.all(duplicates.map(async (duplicate) => {
    const tasks = await getDocs(query(
      collection(db, 'tasks'),
      where('userId', '==', userId),
      where('setId', '==', duplicate.id)
    ));
    await Promise.all(tasks.docs.map((task) => updateDoc(task.ref, {
      setId: defaultPresetId,
      updatedAt: Timestamp.now(),
    })));
    await deleteDoc(doc(db, TASK_PRESETS_COLLECTION, duplicate.id));
  }));
};

export const getUserTaskPresets = async (userId: string): Promise<TaskPreset[]> => {
  const snapshot = await getDocs(
    query(collection(db, TASK_PRESETS_COLLECTION), where('userId', '==', userId))
  );

  let presets = snapshot.docs.map((snapshotDoc) => ({
    id: snapshotDoc.id,
    ...snapshotDoc.data(),
    createdAt: snapshotDoc.data().createdAt?.toDate() || new Date(),
    updatedAt: snapshotDoc.data().updatedAt?.toDate() || new Date(),
  })) as TaskPreset[];

  if (presets.length === 0) {
    const defaultPresetId = await ensureDefaultTaskPreset(userId, presets);
    await mergeDuplicateDefaultTaskPresets(userId, presets, defaultPresetId);

    const updatedSnapshot = await getDocs(
      query(collection(db, TASK_PRESETS_COLLECTION), where('userId', '==', userId))
    );
    presets = updatedSnapshot.docs.map((snapshotDoc) => ({
      id: snapshotDoc.id,
      ...snapshotDoc.data(),
      createdAt: snapshotDoc.data().createdAt?.toDate() || new Date(),
      updatedAt: snapshotDoc.data().updatedAt?.toDate() || new Date(),
    })) as TaskPreset[];
  }

  return presets;
};

export const createTaskPreset = async (userId: string, name: string, color = '#C084FC'): Promise<TaskPreset> => {
  const presetDoc = await addDoc(collection(db, TASK_PRESETS_COLLECTION), {
    userId,
    name,
    color,
    isActive: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  return {
    id: presetDoc.id,
    userId,
    name,
    color,
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

export const updateTaskPreset = async (
  presetId: string,
  updates: Partial<Pick<TaskPreset, 'name' | 'color'>>
): Promise<void> => {
  await updateDoc(doc(db, TASK_PRESETS_COLLECTION, presetId), {
    ...updates,
    updatedAt: Timestamp.now(),
  });
};

export const setActiveTaskPreset = async (userId: string, presetId: string): Promise<void> => {
  const presets = await getUserTaskPresets(userId);
  await Promise.all(
    presets
      .filter((preset) => preset.isActive !== (preset.id === presetId))
      .map((preset) => updateDoc(doc(db, TASK_PRESETS_COLLECTION, preset.id), {
        isActive: preset.id === presetId,
        updatedAt: Timestamp.now(),
      }))
  );
};

export const deleteTaskPreset = async (presetId: string): Promise<void> => {
  await deleteDoc(doc(db, TASK_PRESETS_COLLECTION, presetId));
};
