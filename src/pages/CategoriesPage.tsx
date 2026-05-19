import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FirebaseError } from 'firebase/app';
import { Pencil, Plus, Trash2 } from 'lucide-react';
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
      return 'You do not have access to categories yet. Update Firestore rules for /categories, then refresh.';
    }

    if (error.code === 'failed-precondition') {
      return 'Category lookup needs a Firestore index. Create the suggested index in Firebase Console.';
    }

    if (error.code === 'unauthenticated') {
      return 'Your session expired. Sign in again to manage categories.';
    }
  }

  return 'Could not load categories. Refresh and try again.';
};

export function CategoriesPage() {
  const { user, userProfile } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
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
  const categoryNameInputRef = useRef<HTMLInputElement>(null);
  const userDisplayName = userProfile?.displayName?.trim() || user?.displayName?.trim() || 'there';

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setLoadError(null);
      const [userCategories, userTasks] = await Promise.all([
        getUserCategories(user.uid),
        getUserTasks(user.uid),
      ]);
      setCategories(userCategories);
      setTasks(userTasks);
      setError(null);
    } catch (err) {
      const message = getCategoryErrorMessage(err);
      setLoadError(message);
      setError(message);
      console.error('Error loading category manager data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setCategories([]);
      setTasks([]);
      setLoadError(null);
      setLoading(false);
      return;
    }

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
      setError('Enter a category name.');
      return;
    }

    const duplicate = categories.some((category) => category.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
      setError('A category with this name already exists.');
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
      setError('Keep at least one category.');
      return;
    }

    const fallbackCategory =
      categories.find(
        (category) =>
          category.name === DEFAULT_TASK_CATEGORY_NAME &&
          category.id !== categoryToDelete.id
      ) || categories.find((category) => category.id !== categoryToDelete.id);

    if (!fallbackCategory) {
      setError('No fallback category is available. Create another category and try again.');
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
      setError('Enter a category name.');
      return;
    }

    const duplicate = categories.some(
      (item) =>
        item.id !== category.id && item.name.toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      setError('A category with this name already exists.');
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 md:pt-6 pb-8 md:pb-12">
        <div className="glass-card p-8 md:p-12 text-center">
          <div className="flex justify-center mb-3">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600">Loading your categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 pt-3 md:pt-6 pb-6 md:pb-12">
      <div className="mb-6">
        <h1 className="text-xl sm:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-700 to-pink-600">
          Hello, {userDisplayName}
        </h1>
        <p className="mt-1 text-sm sm:text-base text-gray-500 font-medium">Organize tasks into clear color groups.</p>
      </div>

      {error && !(loadError && categories.length === 0) && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm md:text-base">
          {error}
        </div>
      )}

      {loadError && categories.length === 0 && (
        <div className="glass-card p-8 md:p-10 mb-6 text-center">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">Could not load categories</h2>
          <p className="text-gray-600 mb-5">{loadError}</p>
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold hover:from-purple-700 hover:to-pink-600 transition"
          >
            Retry
          </button>
        </div>
      )}

      <form
        onSubmit={handleCreateCategory}
        className="glass-card p-2.5 sm:p-5 md:p-6 mb-6 space-y-2.5 sm:space-y-4"
      >
        <h2 className="text-sm md:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-pink-600">Add Category</h2>
        <label htmlFor="new-category-name" className="block text-xs sm:text-sm font-medium text-gray-700">
          Category Name
        </label>
        <input
          id="new-category-name"
          ref={categoryNameInputRef}
          type="text"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Category name"
          className="w-full min-h-[36px] sm:min-h-[44px] px-2.5 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
          disabled={isSubmitting || !!deletingCategoryId}
        />
        <div className="flex justify-start flex-wrap gap-[3px] sm:gap-2">
          {PASTEL_CATEGORY_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, color }))}
              className={`h-6 w-6 sm:h-11 sm:w-11 rounded-full border-2 transition flex-shrink-0 ${
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
          className="inline-flex items-center gap-1.5 min-h-[36px] sm:min-h-[44px] px-2.5 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-base rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 disabled:bg-purple-300 transition"
        >
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          {isSubmitting ? 'Adding...' : 'Add Category'}
        </button>
      </form>

      {categories.length === 0 ? (
        <div className="glass-card p-8 md:p-10 text-center">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">No categories yet</h2>
          <p className="text-gray-600 mb-5">Create your first category to organize tasks by topic.</p>
          <button
            type="button"
            onClick={() => categoryNameInputRef.current?.focus()}
            className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-lg bg-purple-100 text-purple-700 font-semibold hover:bg-purple-200 transition"
          >
            Add first category
          </button>
        </div>
      ) : (
        <div className="space-y-2.5 sm:space-y-3 list-stagger">
          {categories.map((category) => (
            <div
              key={category.id}
              className="glass-card px-3 sm:px-4 py-2.5 sm:py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="h-4 w-4 rounded-full border border-white/70 flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-[13px] sm:text-sm md:text-base text-gray-900 truncate">{category.name}</p>
                    <p className="text-xs text-gray-500">{getTaskCount(category)} task(s)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(category)}
                    disabled={!!deletingCategoryId || isSubmitting || !!savingCategoryId}
                    className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:opacity-60 transition"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(category)}
                    disabled={categories.length <= 1 || !!deletingCategoryId || isSubmitting || !!savingCategoryId}
                    className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-md bg-rose-100 text-rose-700 hover:bg-rose-200 disabled:opacity-60 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {deletingCategoryId === category.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>

              {editingCategoryId === category.id && (
                <div className="mt-3 p-3 rounded-lg border border-indigo-100 bg-indigo-50/70 space-y-3">
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Category name"
                    className="w-full min-h-[42px] sm:min-h-[44px] px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition bg-white"
                    disabled={!!savingCategoryId}
                  />
                  <div className="flex justify-start flex-wrap gap-[3px] sm:gap-2">
                    {PASTEL_CATEGORY_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setEditFormData((prev) => ({ ...prev, color }))}
                        className={`h-6 w-6 sm:h-10 sm:w-10 rounded-full border-2 transition flex-shrink-0 ${
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
                      className="px-3 sm:px-4 py-2 sm:py-2.5 min-h-[42px] sm:min-h-[44px] text-xs sm:text-sm font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300 transition"
                    >
                      {savingCategoryId === category.id ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={!!savingCategoryId}
                      className="px-3 sm:px-4 py-2 sm:py-2.5 min-h-[42px] sm:min-h-[44px] text-xs sm:text-sm font-semibold rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {deleteTarget && createPortal(
        <div className="fixed inset-0 bg-gradient-to-b from-slate-950/35 via-purple-900/20 to-fuchsia-900/30 backdrop-blur-0 sm:backdrop-blur-[2px] flex items-center justify-center z-[9999] p-4">
          <div className="modal-enter max-w-sm w-full max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-rose-100/80 bg-white/95 backdrop-blur-none sm:backdrop-blur-xl p-5 sm:p-6 shadow-[0_24px_56px_rgba(244,63,94,0.22)]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 border border-rose-200">
              <svg className="h-6 w-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-7.938 4h15.856C21.07 19 22 18.07 22 16.928V7.072C22 5.93 21.07 5 19.928 5H4.072A1.93 1.93 0 002.144 6.928v9.856C2.144 18.07 3.074 19 4.216 19z" />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 text-center">Delete Category?</h3>
            <p className="text-gray-700 text-sm text-center mb-6">
              Delete "{deleteTarget.category.name}" and move its tasks to "{deleteTarget.fallback.name}"?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={!!deletingCategoryId}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 font-semibold rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteCategory}
                disabled={!!deletingCategoryId}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-semibold rounded-lg transition disabled:from-rose-300 disabled:to-red-300 shadow-[0_8px_20px_rgba(244,63,94,0.28)]"
              >
                {deletingCategoryId ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
