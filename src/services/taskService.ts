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
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Task, Subtask } from '@/types';

const TASKS_COLLECTION = 'tasks';
const DEFAULT_TASK_CATEGORY = 'Personal';

const normalizeTaskCategory = (value: unknown): string => {
  return typeof value === 'string' && value.trim() ? value : DEFAULT_TASK_CATEGORY;
};

export const normalizeSubtasks = (rawSubtasks: any): Subtask[] => {
  if (!Array.isArray(rawSubtasks)) {
    return [];
  }
  const normalized = rawSubtasks.map((st, index) => ({
    id: typeof st?.id === 'string' && st.id ? st.id : `st-${Date.now()}-${index}`,
    title: typeof st?.title === 'string' ? st.title : (st?.name || st?.text || ''),
    isCompleted: Boolean(st?.isCompleted ?? st?.completed ?? false),
  }));
  return normalized;
};

/**
 * Create a new task
 */
export const createTask = async (
  userId: string,
  taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, TASKS_COLLECTION), {
      userId,
      ...taskData,
      isStarred: Boolean(taskData.isStarred),
      subtasks: normalizeSubtasks(taskData.subtasks),
      category: normalizeTaskCategory(taskData.category),
      dueDate: taskData.dueDate ? Timestamp.fromDate(taskData.dueDate) : null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
};

/**
 * Get all tasks for a user
 */
export const getUserTasks = async (userId: string): Promise<Task[]> => {
  try {
    const q = query(
      collection(db, TASKS_COLLECTION),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map((doc) => {
      const task = doc.data();
      return {
        id: doc.id,
        ...task,
        isStarred: Boolean(task.isStarred),
        subtasks: normalizeSubtasks(task.subtasks),
        category: normalizeTaskCategory(task.category),
        dueDate: task.dueDate?.toDate() || null,
        createdAt: task.createdAt.toDate(),
        updatedAt: task.updatedAt.toDate(),
      };
    }) as Task[];
  } catch (error) {
    console.error('Error getting user tasks:', error);
    throw error;
  }
};

/**
 * Get completed tasks for a user
 */
export const getCompletedTasks = async (userId: string): Promise<Task[]> => {
  try {
    const q = query(
      collection(db, TASKS_COLLECTION),
      where('userId', '==', userId),
      where('isCompleted', '==', true)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map((doc) => {
      const task = doc.data();
      return {
        id: doc.id,
        ...task,
        isStarred: Boolean(task.isStarred),
        subtasks: normalizeSubtasks(task.subtasks),
        category: normalizeTaskCategory(task.category),
        dueDate: task.dueDate?.toDate() || null,
        createdAt: task.createdAt.toDate(),
        updatedAt: task.updatedAt.toDate(),
      };
    }) as Task[];
  } catch (error) {
    console.error('Error getting completed tasks:', error);
    throw error;
  }
};

/**
 * Get pending tasks for a user
 */
export const getPendingTasks = async (userId: string): Promise<Task[]> => {
  try {
    const q = query(
      collection(db, TASKS_COLLECTION),
      where('userId', '==', userId),
      where('isCompleted', '==', false)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map((doc) => {
      const task = doc.data();
      return {
        id: doc.id,
        ...task,
        isStarred: Boolean(task.isStarred),
        subtasks: normalizeSubtasks(task.subtasks),
        category: normalizeTaskCategory(task.category),
        dueDate: task.dueDate?.toDate() || null,
        createdAt: task.createdAt.toDate(),
        updatedAt: task.updatedAt.toDate(),
      };
    }) as Task[];
  } catch (error) {
    console.error('Error getting pending tasks:', error);
    throw error;
  }
};

/**
 * Get a single task by ID
 */
export const getTaskById = async (taskId: string): Promise<Task | null> => {
  try {
    const docRef = doc(db, TASKS_COLLECTION, taskId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const task = docSnap.data();
    return {
      id: docSnap.id,
      ...task,
      isStarred: Boolean(task.isStarred),
      subtasks: normalizeSubtasks(task.subtasks),
      category: normalizeTaskCategory(task.category),
      dueDate: task.dueDate?.toDate() || null,
      createdAt: task.createdAt.toDate(),
      updatedAt: task.updatedAt.toDate(),
    } as Task;
  } catch (error) {
    console.error('Error getting task:', error);
    throw error;
  }
};

/**
 * Update a task
 */
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
      dataToUpdate.dueDate = updates.dueDate
        ? Timestamp.fromDate(updates.dueDate)
        : null;
    }

    if (updates.category !== undefined) {
      dataToUpdate.category = normalizeTaskCategory(updates.category);
    }

    if (updates.subtasks !== undefined) {
      // Ensure subtasks is an array before normalizing
      const subtasksToSave = Array.isArray(updates.subtasks) ? updates.subtasks : [];
      dataToUpdate.subtasks = normalizeSubtasks(subtasksToSave);
    }
    
    await updateDoc(docRef, dataToUpdate);
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
};

/**
 * Toggle task completion status
 */
export const toggleTaskCompletion = async (
  taskId: string,
  isCompleted: boolean
): Promise<void> => {
  try {
    await updateTask(taskId, { isCompleted });
  } catch (error) {
    console.error('Error toggling task completion:', error);
    throw error;
  }
};

/**
 * Toggle task star status
 */
export const toggleTaskStar = async (
  taskId: string,
  isStarred: boolean
): Promise<void> => {
  try {
    await updateTask(taskId, { isStarred });
  } catch (error) {
    console.error('Error toggling task star:', error);
    throw error;
  }
};

/**
 * Delete a task
 */
export const deleteTask = async (taskId: string): Promise<void> => {
  try {
    const docRef = doc(db, TASKS_COLLECTION, taskId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};

/**
 * Duplicate an existing task
 */
export const duplicateTask = async (
  userId: string,
  task: Task
): Promise<string> => {
  try {
    const rawSubtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
    const newSubtasks = rawSubtasks.map((st, index) => ({
      id: `st-${Date.now()}-${index}`,
      title: st.title || '',
      isCompleted: false,
    }));

    const duplicateTitle = task.title.endsWith('(Copy)')
      ? task.title
      : `${task.title} (Copy)`;

    return await createTask(userId, {
      title: duplicateTitle,
      description: task.description || '',
      category: task.category,
      dueDate: task.dueDate ? new Date(task.dueDate) : null,
      isCompleted: false,
      isStarred: Boolean(task.isStarred),
      setId: task.setId,
      subtasks: newSubtasks,
    });
  } catch (error) {
    console.error('Error duplicating task:', error);
    throw error;
  }
};

