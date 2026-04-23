import { useEffect, useMemo, useState } from 'react';
import { FirebaseError } from 'firebase/app';
import { FolderTree, Pencil, Plus, Trash2 } from 'lucide-react';
import { Category, Task } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { getUserTasks } from '@/services/taskService';
import {
  createCategory,
  deleteCategoryAndReassignTasks,
  getUserCategories,
  PASTEL_CATEGORY_COLORS,
  updateCategory,
} from '@/services/categoryService';

const DEFAULT_TASK_CATEGORY_NAME = 'Personal';

const getCategoryErrorMessage = (error: unknown): string => {
  if (error instanceof FirebaseError) {
    if (error.code === 'permission-denied') {
      return 'Cannot access categories. Check Firestore rules for /categories.';
    }

    if (error.code === 'failed-precondition') {
      return 'Categories query is missing a Firestore index. Create it in Firebase Console.';
    }

    if (error.code === 'unauthenticated') {
      return 'Please sign in again to manage categories.';
    }
  }

  return 'Failed to manage categories. Please try again.';
};

export function CategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    category: Category;
    fallback: Category;
  } | null>(null);
  const [formData, setFormData] = useState<{ name: string; color: string }>({
    name: '',
    color: PASTEL_CATEGORY_COLORS[0],
  });
  const [editFormData, setEditFormData] = useState<{ name: string; color: string }>({
    name: '',
    color: PASTEL_CATEGORY_COLORS[0],
  });

  useEffect(() => {
    if (!user) {
      setCategories([]);
      setTasks([]);
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const [userCategories, userTasks] = await Promise.all([
          getUserCategories(user.uid),
          getUserTasks(user.uid),
        ]);
        setCategories(userCategories);
        setTasks(userTasks);
        setError(null);
      } catch (err) {
        setError(getCategoryErrorMessage(err));
        console.error('Error loading category manager data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const taskCountByCategory = useMemo(() => {
    const map = new Map<string, number>();
    tasks.forEach((task) => {
      map.set(task.category, (map.get(task.category) || 0) + 1);
    });
    return map;
  }, [tasks]);

  const getTaskCount = (category: Category): number => {
    return (taskCountByCategory.get(category.id) || 0) + (taskCountByCategory.get(category.name) || 0);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const name = formData.name.trim();
    if (!name) {
      setError('Category name is required.');
      return;
    }

    const duplicate = categories.some((category) => category.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
      setError('Category already exists.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const createdCategory = await createCategory(user.uid, {
        name,
        color: formData.color,
      });

      setCategories((prev) => [...prev, createdCategory].sort((a, b) => a.name.localeCompare(b.name)));
      setFormData({ name: '', color: PASTEL_CATEGORY_COLORS[0] });
    } catch (err) {
      setError(getCategoryErrorMessage(err));
      console.error('Error creating category:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = (categoryToDelete: Category) => {
    if (categories.length <= 1) {
      setError('You must keep at least one category.');
      return;
    }

    const fallbackCategory =
      categories.find(
        (category) =>
          category.name === DEFAULT_TASK_CATEGORY_NAME &&
          category.id !== categoryToDelete.id
      ) || categories.find((category) => category.id !== categoryToDelete.id);

    if (!fallbackCategory) {
      setError('No fallback category available.');
      return;
    }

    setDeleteTarget({
      category: categoryToDelete,
      fallback: fallbackCategory,
    });
    setError(null);
  };

  const handleConfirmDeleteCategory = async () => {
    if (!user || !deleteTarget) return;
    try {
      setDeletingCategoryId(deleteTarget.category.id);
      setError(null);

      await deleteCategoryAndReassignTasks(user.uid, {
        categoryId: deleteTarget.category.id,
        categoryName: deleteTarget.category.name,
        fallbackCategoryId: deleteTarget.fallback.id,
      });

      setCategories((prev) => prev.filter((category) => category.id !== deleteTarget.category.id));
      setTasks((prev) =>
        prev.map((task) =>
          task.category === deleteTarget.category.id || task.category === deleteTarget.category.name
            ? { ...task, category: deleteTarget.fallback.id }
            : task
        )
      );
    } catch (err) {
      setError(getCategoryErrorMessage(err));
      console.error('Error deleting category:', err);
    } finally {
      setDeletingCategoryId(null);
      setDeleteTarget(null);
    }
  };

  const handleStartEdit = (category: Category) => {
    setEditingCategoryId(category.id);
    setEditFormData({
      name: category.name,
      color: category.color,
    });
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingCategoryId(null);
    setEditFormData({ name: '', color: PASTEL_CATEGORY_COLORS[0] });
  };

  const handleSaveEdit = async (category: Category) => {
    if (!user) return;

    const name = editFormData.name.trim();
    if (!name) {
      setError('Category name is required.');
      return;
    }

    const duplicate = categories.some(
      (item) =>
        item.id !== category.id && item.name.toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      setError('Category name already exists.');
      return;
    }

    try {
      setSavingCategoryId(category.id);
      setError(null);

      await updateCategory(user.uid, {
        categoryId: category.id,
        previousName: category.name,
        name,
        color: editFormData.color,
      });

      setCategories((prev) =>
        prev
          .map((item) =>
            item.id === category.id
              ? { ...item, name, color: editFormData.color.toUpperCase() }
              : item
          )
          .sort((a, b) => a.name.localeCompare(b.name))
      );

      setTasks((prev) =>
        prev.map((task) =>
          task.category === category.name
            ? { ...task, category: category.id }
            : task
        )
      );

      handleCancelEdit();
    } catch (err) {
      setError(getCategoryErrorMessage(err));
      console.error('Error updating category:', err);
    } finally {
      setSavingCategoryId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 md:py-12">
      <div className="mb-6 md:mb-8 flex items-center gap-3">
        <FolderTree className="h-7 w-7 md:h-8 md:w-8 text-indigo-500" />
        <h1 className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-500">
          Categories
        </h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm md:text-base">
          {error}
        </div>
      )}

      <form
        onSubmit={handleCreateCategory}
        className="bg-white/75 sm:bg-white/55 backdrop-blur-none sm:backdrop-blur-md border border-white/40 rounded-3xl shadow-sm sm:shadow-xl sm:shadow-purple-500/10 p-5 md:p-6 mb-6 space-y-4"
      >
        <h2 className="text-lg md:text-xl font-semibold text-gray-900">Add Category</h2>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Category name"
          className="w-full px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
          disabled={isSubmitting || !!deletingCategoryId}
        />
        <div className="flex flex-wrap gap-2">
          {PASTEL_CATEGORY_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, color }))}
              className={`h-8 w-8 rounded-full border-2 transition ${
                formData.color === color
                  ? 'border-purple-500 scale-110'
                  : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
              aria-label={`Select color ${color}`}
              disabled={isSubmitting || !!deletingCategoryId}
            />
          ))}
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !!deletingCategoryId}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm md:text-base rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 disabled:bg-purple-300 transition"
        >
          <Plus className="h-4 w-4" />
          {isSubmitting ? 'Adding...' : 'Add Category'}
        </button>
      </form>

      <div className="space-y-3">
        {categories.map((category) => (
          <div
            key={category.id}
            className="bg-white/75 sm:bg-white/55 backdrop-blur-none sm:backdrop-blur-md border border-white/40 rounded-2xl shadow-sm sm:shadow-xl sm:shadow-purple-500/10 px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="h-4 w-4 rounded-full border border-white/70 flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                />
                <div className="min-w-0">
                  <p className="font-semibold text-sm md:text-base text-gray-900 truncate">{category.name}</p>
                  <p className="text-xs text-gray-500">{getTaskCount(category)} task(s)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStartEdit(category)}
                  disabled={!!deletingCategoryId || isSubmitting || !!savingCategoryId}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:opacity-60 transition"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(category)}
                    disabled={categories.length <= 1 || !!deletingCategoryId || isSubmitting || !!savingCategoryId}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md bg-rose-100 text-rose-700 hover:bg-rose-200 disabled:opacity-60 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {deletingCategoryId === category.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>

            {editingCategoryId === category.id && (
              <div className="mt-3 p-3 rounded-xl border border-indigo-100 bg-indigo-50/70 space-y-3">
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Category name"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition bg-white"
                  disabled={!!savingCategoryId}
                />
                <div className="flex flex-wrap gap-2">
                  {PASTEL_CATEGORY_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditFormData((prev) => ({ ...prev, color }))}
                      className={`h-7 w-7 rounded-full border-2 transition ${
                        editFormData.color === color
                          ? 'border-indigo-500 scale-110'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Select color ${color}`}
                      disabled={!!savingCategoryId}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(category)}
                    disabled={!!savingCategoryId}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300 transition"
                  >
                    {savingCategoryId === category.id ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={!!savingCategoryId}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 sm:bg-white/85 backdrop-blur-none sm:backdrop-blur-md border border-white/40 rounded-3xl shadow-sm sm:shadow-xl sm:shadow-purple-500/10 max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">Delete Category?</h3>
            <p className="text-gray-600 text-sm text-center mb-6">
              Delete "{deleteTarget.category.name}" and move its tasks to "{deleteTarget.fallback.name}"?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={!!deletingCategoryId}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 font-semibold rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteCategory}
                disabled={!!deletingCategoryId}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition disabled:bg-red-300"
              >
                {deletingCategoryId ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

