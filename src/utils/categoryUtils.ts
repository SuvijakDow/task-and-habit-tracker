import { FirebaseError } from 'firebase/app';
import { Category } from '@/types';
import { DEFAULT_TASK_CATEGORY_COLOR } from '@/constants/colors';
import { DEFAULT_TASK_CATEGORY_NAME } from '@/constants/defaults';
import { getReadableCategoryTextColor, isValidHexColor } from '@/utils/colorUtils';

export const findCategoryByTaskValue = (
  categories: Category[],
  taskCategory: string
): Category | undefined => {
  return categories.find((c) => c.id === taskCategory || c.name === taskCategory);
};

export const buildCategoryMap = (categories: Category[]): Map<string, Category> => {
  const map = new Map<string, Category>();
  for (const category of categories) {
    map.set(category.id, category);
    map.set(category.name, category);
  }
  return map;
};

export const getDefaultCategoryValue = (categories: Category[]): string => {
  const defaultCategory =
    categories.find((category) => category.name === DEFAULT_TASK_CATEGORY_NAME) || categories[0];
  return defaultCategory?.id || DEFAULT_TASK_CATEGORY_NAME;
};

export const resolveCategoryDisplay = (
  matchedCategory: Category | undefined,
  fallbackValue?: string
) => {
  const categoryName = matchedCategory?.name || fallbackValue || DEFAULT_TASK_CATEGORY_NAME;
  const categoryColor = isValidHexColor(matchedCategory?.color || '')
    ? (matchedCategory?.color as string)
    : DEFAULT_TASK_CATEGORY_COLOR;
  const categoryTextColor = getReadableCategoryTextColor(categoryColor);
  return { categoryName, categoryColor, categoryTextColor };
};

export const getCategoryErrorMessage = (error: unknown): string => {
  if (error instanceof FirebaseError) {
    if (error.code === 'permission-denied') {
      return 'You do not have access to categories yet. Update Firestore rules for /categories, then refresh.';
    }
    if (error.code === 'failed-precondition') {
      return 'Category lookup needs a Firestore index. Create the suggested index in Firebase Console.';
    }
    if (error.code === 'unauthenticated') {
      return 'Your session expired. Sign in again to load categories.';
    }
  }
  return 'Could not load categories. Refresh and try again.';
};
