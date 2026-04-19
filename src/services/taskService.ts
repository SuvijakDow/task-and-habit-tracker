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
  DocumentData,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/utils/firebase';
import { Task } from '@/types';

const TASKS_COLLECTION = 'tasks';

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
    
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      dueDate: doc.data().dueDate?.toDate() || null,
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate(),
    })) as Task[];
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
    
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      dueDate: doc.data().dueDate?.toDate() || null,
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate(),
    })) as Task[];
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
    
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      dueDate: doc.data().dueDate?.toDate() || null,
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate(),
    })) as Task[];
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
    
    return {
      id: docSnap.id,
      ...docSnap.data(),
      dueDate: docSnap.data().dueDate?.toDate() || null,
      createdAt: docSnap.data().createdAt.toDate(),
      updatedAt: docSnap.data().updatedAt.toDate(),
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
    const dataToUpdate: DocumentData = {
      ...updates,
      updatedAt: Timestamp.now(),
    };
    
    if (updates.dueDate !== undefined) {
      dataToUpdate.dueDate = updates.dueDate
        ? Timestamp.fromDate(updates.dueDate)
        : null;
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
