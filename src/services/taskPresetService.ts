import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/utils/firebase';
import { TaskPreset } from '@/types';

const TASK_PRESETS_COLLECTION = 'taskPresets';
const DEFAULT_PRESET_NAME = 'Inbox';

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
    const defaultPreset = {
      userId,
      name: DEFAULT_PRESET_NAME,
      color: '#C084FC',
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    const presetDoc = await addDoc(collection(db, TASK_PRESETS_COLLECTION), defaultPreset);
    presets = [{
      id: presetDoc.id,
      userId,
      name: DEFAULT_PRESET_NAME,
      color: '#C084FC',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }];
  }

  return presets.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
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
