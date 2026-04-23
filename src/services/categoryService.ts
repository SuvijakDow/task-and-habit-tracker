import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/utils/firebase';
import { Category } from '@/types';

const CATEGORIES_COLLECTION = 'categories';
const TASKS_COLLECTION = 'tasks';

export const PASTEL_CATEGORY_COLORS = [
  '#93C5FD', // blue
  '#A5B4FC', // indigo
  '#C4B5FD', // purple
  '#F9A8D4', // pink
  '#FDBA74', // orange
  '#86EFAC', // green
  '#67E8F9', // cyan
  '#FDE68A', // yellow
] as const;

const DEFAULT_CATEGORIES: Array<{ name: string; color: string }> = [
  { name: 'Academic', color: '#93C5FD' },
  { name: 'Personal', color: '#C4B5FD' },
  { name: 'Health', color: '#86EFAC' },
];

const isValidHexColor = (value: string): boolean => /^#[0-9A-F]{6}$/i.test(value);

const normalizeCategoryName = (value: string): string => value.trim();

const normalizeCategoryColor = (value: string): string => {
  return isValidHexColor(value) ? value.toUpperCase() : PASTEL_CATEGORY_COLORS[0];
};

/**
 * Create a new category for a user.
 */
export const createCategory = async (
  userId: string,
  data: { name: string; color: string }
): Promise<Category> => {
  try {
    const name = normalizeCategoryName(data.name);
    if (!name) {
      throw new Error('Category name is required');
    }

    const now = Timestamp.now();
    const color = normalizeCategoryColor(data.color);

    const docRef = await addDoc(collection(db, CATEGORIES_COLLECTION), {
      userId,
      name,
      color,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id: docRef.id,
      userId,
      name,
      color,
      createdAt: now.toDate(),
      updatedAt: now.toDate(),
    };
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
};

/**
 * Get all categories for a user.
 */
export const getUserCategories = async (userId: string): Promise<Category[]> => {
  try {
    const q = query(
      collection(db, CATEGORIES_COLLECTION),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);

    const categories = querySnapshot.docs.map((categoryDoc) => {
      const category = categoryDoc.data();
      return {
        id: categoryDoc.id,
        userId: category.userId,
        name: category.name || 'Category',
        color: normalizeCategoryColor(category.color || ''),
        createdAt: category.createdAt?.toDate?.() || new Date(),
        updatedAt: category.updatedAt?.toDate?.() || new Date(),
      } as Category;
    });

    return categories.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error getting user categories:', error);
    throw error;
  }
};

/**
 * Ensure default categories exist for a user.
 */
export const ensureDefaultCategories = async (userId: string): Promise<void> => {
  try {
    const q = query(
      collection(db, CATEGORIES_COLLECTION),
      where('userId', '==', userId)
    );
    const existing = await getDocs(q);
    if (!existing.empty) {
      return;
    }

    const batch = writeBatch(db);
    const now = Timestamp.now();

    DEFAULT_CATEGORIES.forEach((category) => {
      const newDocRef = doc(collection(db, CATEGORIES_COLLECTION));
      batch.set(newDocRef, {
        userId,
        name: category.name,
        color: category.color,
        createdAt: now,
        updatedAt: now,
      });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error ensuring default categories:', error);
    throw error;
  }
};

/**
 * Delete a category and reassign related tasks to another category.
 */
export const deleteCategoryAndReassignTasks = async (
  userId: string,
  params: {
    categoryId: string;
    categoryName: string;
    fallbackCategoryId: string;
  }
): Promise<void> => {
  try {
    if (params.categoryId === params.fallbackCategoryId) {
      throw new Error('Fallback category must be different from deleted category');
    }

    const [tasksByCategoryId, tasksByCategoryName] = await Promise.all([
      getDocs(
        query(
          collection(db, TASKS_COLLECTION),
          where('userId', '==', userId),
          where('category', '==', params.categoryId)
        )
      ),
      getDocs(
        query(
          collection(db, TASKS_COLLECTION),
          where('userId', '==', userId),
          where('category', '==', params.categoryName)
        )
      ),
    ]);

    const batch = writeBatch(db);
    const now = Timestamp.now();
    const taskDocMap = new Map<string, (typeof tasksByCategoryId.docs)[number]['ref']>();

    tasksByCategoryId.docs.forEach((taskDoc) => {
      taskDocMap.set(taskDoc.id, taskDoc.ref);
    });

    tasksByCategoryName.docs.forEach((taskDoc) => {
      taskDocMap.set(taskDoc.id, taskDoc.ref);
    });

    taskDocMap.forEach((taskRef) => {
      batch.update(taskRef, {
        category: params.fallbackCategoryId,
        updatedAt: now,
      });
    });

    batch.delete(doc(db, CATEGORIES_COLLECTION, params.categoryId));
    await batch.commit();
  } catch (error) {
    console.error('Error deleting category and reassigning tasks:', error);
    throw error;
  }
};

/**
 * Update a category and normalize legacy tasks that still store category name.
 */
export const updateCategory = async (
  userId: string,
  params: {
    categoryId: string;
    previousName: string;
    name: string;
    color: string;
  }
): Promise<void> => {
  try {
    const name = normalizeCategoryName(params.name);
    if (!name) {
      throw new Error('Category name is required');
    }

    const color = normalizeCategoryColor(params.color);
    const categoryRef = doc(db, CATEGORIES_COLLECTION, params.categoryId);

    const legacyTasks = await getDocs(
      query(
        collection(db, TASKS_COLLECTION),
        where('userId', '==', userId),
        where('category', '==', params.previousName)
      )
    );

    const batch = writeBatch(db);
    const now = Timestamp.now();

    batch.update(categoryRef, {
      name,
      color,
      updatedAt: now,
    });

    legacyTasks.docs.forEach((taskDoc) => {
      batch.update(taskDoc.ref, {
        category: params.categoryId,
        updatedAt: now,
      });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

