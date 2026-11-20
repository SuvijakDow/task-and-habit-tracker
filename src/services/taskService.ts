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
import { db } from '@/config/firebase';
import { Subtask, Task } from '@/types';
import { DEFAULT_TASK_CATEGORY_NAME } from '@/constants/defaults';
import { formatToDateString, toLocalDate } from '@/utils/dateUtils';

const TASKS_COLLECTION = 'tasks';

const normalizeTaskCategory = (value: unknown): string => {
  return typeof value === 'string' && value.trim() ? value : DEFAULT_TASK_CATEGORY_NAME;
};

const normalizeSubtaskDueDate = (rawDueDate: unknown): string | null => {
  if (!rawDueDate) return null;
  if (typeof rawDueDate === 'string') {
    const trimmed = rawDueDate.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  }
  const parsed = toLocalDate(rawDueDate);
  return parsed ? formatToDateString(parsed) : null;
};

const normalizeSubtasks = (rawSubtasks: unknown): Subtask[] => {
  if (!Array.isArray(rawSubtasks)) return [];
  return rawSubtasks.map((st: any, index: number) => {
    const dueDate = normalizeSubtaskDueDate(st?.dueDate);
    return {
      id: typeof st?.id === 'string' && st.id ? st.id : `st-${Date.now()}-${index}`,
      title: typeof st?.title === 'string' ? st.title : st?.name || st?.text || '',
      isCompleted: Boolean(st?.isCompleted ?? st?.completed ?? false),
      ...(dueDate ? { dueDate } : {}),
    };
  });
};

const mapDocToTask = (docId: string, data: Record<string, any>): Task =>
  ({
    id: docId,
    ...data,
    isStarred: Boolean(data.isStarred),
    subtasks: normalizeSubtasks(data.subtasks),
    category: normalizeTaskCategory(data.category),
    dueDate: toLocalDate(data.dueDate),
    createdAt: toLocalDate(data.createdAt) || new Date(),
    updatedAt: toLocalDate(data.updatedAt) || new Date(),
  }) as Task;

export const createTask = async (
  userId: string,
  taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
): Promise<string> => {
  try {
    const payload: Record<string, any> = {
      userId,
      title: taskData.title || '',
      description: taskData.description || '',
      isCompleted: Boolean(taskData.isCompleted),
      isStarred: Boolean(taskData.isStarred),
      subtasks: normalizeSubtasks(taskData.subtasks),
      category: normalizeTaskCategory(taskData.category),
      dueDate: taskData.dueDate ? Timestamp.fromDate(taskData.dueDate) : null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    if (taskData.setId) {
      payload.setId = taskData.setId;
    }

    if (taskData.linkChip && taskData.linkChip.url) {
      payload.linkChip = {
        url: taskData.linkChip.url,
        ...(taskData.linkChip.label ? { label: taskData.linkChip.label } : {}),
        ...(taskData.linkChip.icon ? { icon: taskData.linkChip.icon } : {}),
      };
    }

    const docRef = await addDoc(collection(db, TASKS_COLLECTION), payload);
    return docRef.id;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
};

export const getUserTasks = async (userId: string): Promise<Task[]> => {
  try {
    const q = query(collection(db, TASKS_COLLECTION), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((d) => mapDocToTask(d.id, d.data()));
  } catch (error) {
    console.error('Error getting user tasks:', error);
    throw error;
  }
};

export const updateTask = async (
  taskId: string,
  updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt'>>
): Promise<void> => {
  try {
    const docRef = doc(db, TASKS_COLLECTION, taskId);
    const dataToUpdate: Record<string, any> = {
      ...updates,
      updatedAt: Timestamp.now(),
    };

    if (updates.dueDate !== undefined) {
      dataToUpdate.dueDate = updates.dueDate ? Timestamp.fromDate(updates.dueDate) : null;
    }

    if (updates.category !== undefined) {
      dataToUpdate.category = normalizeTaskCategory(updates.category);
    }

    if (updates.subtasks !== undefined) {
      dataToUpdate.subtasks = normalizeSubtasks(updates.subtasks);
    }

    await updateDoc(docRef, dataToUpdate);
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
};

export const toggleTaskStar = async (taskId: string, isStarred: boolean): Promise<void> => {
  try {
    await updateTask(taskId, { isStarred });
  } catch (error) {
    console.error('Error toggling task star:', error);
    throw error;
  }
};

export const deleteTask = async (taskId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, TASKS_COLLECTION, taskId));
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};

export const duplicateTask = async (
  userId: string,
  task: Task,
  options?: { dueDate?: Date | null }
): Promise<string> => {
  try {
    const targetDueDate =
      options && options.dueDate !== undefined
        ? options.dueDate
        : task.dueDate
        ? new Date(task.dueDate)
        : null;

    let dayOffsetMs = 0;
    if (options && options.dueDate !== undefined && task.dueDate && targetDueDate) {
      const origStart = new Date(
        task.dueDate.getFullYear(),
        task.dueDate.getMonth(),
        task.dueDate.getDate()
      );
      const nextStart = new Date(
        targetDueDate.getFullYear(),
        targetDueDate.getMonth(),
        targetDueDate.getDate()
      );
      dayOffsetMs = nextStart.getTime() - origStart.getTime();
    }

    const rawSubtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
    const newSubtasks = rawSubtasks.map((st, index) => {
      let shiftedDueDate = st.dueDate;
      if (st.dueDate && dayOffsetMs !== 0) {
        const parsed = toLocalDate(st.dueDate);
        if (parsed) {
          shiftedDueDate = formatToDateString(new Date(parsed.getTime() + dayOffsetMs));
        }
      }
      return {
        id: `st-${Date.now()}-${index}`,
        title: st.title || '',
        isCompleted: false,
        ...(shiftedDueDate ? { dueDate: shiftedDueDate } : {}),
      };
    });

    const duplicateTitle = task.title.endsWith('(Copy)') ? task.title : `${task.title} (Copy)`;

    return await createTask(userId, {
      title: duplicateTitle,
      description: task.description || '',
      category: task.category,
      dueDate: targetDueDate,
      isCompleted: false,
      isStarred: Boolean(task.isStarred),
      setId: task.setId,
      subtasks: newSubtasks,
      linkChip: task.linkChip ? { ...task.linkChip } : undefined,
    });
  } catch (error) {
    console.error('Error duplicating task:', error);
    throw error;
  }
};
