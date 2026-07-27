import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FirebaseError } from 'firebase/app';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
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

interface CategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesUpdated?: () => void;
}

export function CategoriesModal({ isOpen, onClose, onCategoriesUpdated }: CategoriesModalProps) {
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
  const categoryNameInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    if (!user) return;
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

  useEffect(() => {
    if (isOpen && user) {
      loadData();
    }
  }, [isOpen, user]);

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
      if (onCategoriesUpdated) onCategoriesUpdated();
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
      if (onCategoriesUpdated) onCategoriesUpdated();
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
      if (onCategoriesUpdated) onCategoriesUpdated();
    } catch (err) {
      setError(getCategoryErrorMessage(err));
      console.error('Error updating category:', err);
    } finally {
      setSavingCategoryId(null);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-gradient-to-b from-slate-950/35 via-purple-900/20 to-fuchsia-900/30 backdrop-blur-0 sm:backdrop-blur-[2px] flex items-end sm:items-center justify-center z-[9999] p-0 sm:p-4">
      <div className="modal-enter w-full sm:max-w-xl h-dvh sm:h-auto max-h-dvh sm:max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white/95 sm:bg-white/90 backdrop-blur-none sm:backdrop-blur-xl border border-white/70 rounded-none sm:rounded-2xl shadow-[0_-12px_32px_rgba(120,87,255,0.24)] sm:shadow-[0_24px_56px_rgba(120,87,255,0.26)] p-4 sm:p-6 md:p-7">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-pink-600">
              Manage Categories
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">Organize tasks into clear color groups.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl text-purple-400 hover:text-purple-600 hover:bg-white/80 transition flex items-center justify-center"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs sm:text-sm">
            {error}
          </div>
        )}

        {/* Create Category Form */}
        <form
          onSubmit={handleCreateCategory}
          className="glass-card p-3 sm:p-4 mb-5 space-y-3 bg-white/80 border border-purple-100"
        >
          <h3 className="text-sm font-bold text-purple-800">Add New Category</h3>
          <input
            id="new-category-name"
            ref={categoryNameInputRef}
            type="text"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Category name"
            className="w-full min-h-[38px] sm:min-h-[42px] px-3 py-2 text-xs sm:text-sm border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-400 focus:outline-none bg-white"
            disabled={isSubmitting || !!deletingCategoryId}
          />
          <div className="flex justify-start flex-wrap gap-1.5 sm:gap-2">
            {PASTEL_CATEGORY_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, color }))}
                className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 transition flex-shrink-0 ${
                  formData.color === color
                    ? 'border-purple-600 scale-110'
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
            className="inline-flex items-center gap-1.5 min-h-[36px] sm:min-h-[40px] px-3 py-2 text-xs sm:text-sm rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 disabled:bg-purple-300 transition"
          >
            <Plus className="h-4 w-4" />
            {isSubmitting ? 'Adding...' : 'Add Category'}
          </button>
        </form>

        {/* Categories List */}
        {loading ? (
          <div className="py-8 text-center text-gray-500">
            <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-2"></div>
            Loading categories...
          </div>
        ) : categories.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No categories found.</div>
        ) : (
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {categories.map((category) => (
              <div
                key={category.id}
                className="glass-card px-3 sm:px-4 py-2.5 bg-white/90 border border-gray-100 shadow-xs"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="h-4 w-4 rounded-full border border-white/70 flex-shrink-0 shadow-xs"
                      style={{ backgroundColor: category.color }}
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-xs sm:text-sm text-gray-900 truncate">{category.name}</p>
                      <p className="text-[11px] text-gray-500">{getTaskCount(category)} task(s)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(category)}
                      disabled={!!deletingCategoryId || isSubmitting || !!savingCategoryId}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:opacity-60 transition"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(category)}
                      disabled={categories.length <= 1 || !!deletingCategoryId || isSubmitting || !!savingCategoryId}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded bg-rose-100 text-rose-700 hover:bg-rose-200 disabled:opacity-60 transition"
                    >
                      <Trash2 className="h-3 w-3" />
                      {deletingCategoryId === category.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>

                {editingCategoryId === category.id && (
                  <div className="mt-3 p-3 rounded-lg border border-indigo-100 bg-indigo-50/70 space-y-2.5">
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Category name"
                      className="w-full min-h-[38px] px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition bg-white"
                      disabled={!!savingCategoryId}
                    />
                    <div className="flex justify-start flex-wrap gap-1.5">
                      {PASTEL_CATEGORY_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setEditFormData((prev) => ({ ...prev, color }))}
                          className={`h-6 w-6 rounded-full border-2 transition flex-shrink-0 ${
                            editFormData.color === color
                              ? 'border-indigo-600 scale-110'
                              : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: color }}
                          aria-label={`Select color ${color}`}
                          disabled={!!savingCategoryId}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(category)}
                        disabled={!!savingCategoryId}
                        className="px-3 py-1.5 text-xs font-semibold rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300 transition"
                      >
                        {savingCategoryId === category.id ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={!!savingCategoryId}
                        className="px-3 py-1.5 text-xs font-semibold rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
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
          <div className="fixed inset-0 bg-gradient-to-b from-slate-950/35 via-purple-900/20 to-fuchsia-900/30 backdrop-blur-0 sm:backdrop-blur-[2px] flex items-center justify-center z-[10000] p-4">
            <div className="modal-enter max-w-sm w-full max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-rose-100/80 bg-white/95 backdrop-blur-none sm:backdrop-blur-xl p-5 sm:p-6 shadow-[0_24px_56px_rgba(244,63,94,0.22)]">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 text-center">Delete Category?</h3>
              <p className="text-gray-700 text-xs sm:text-sm text-center mb-6">
                Delete "{deleteTarget.category.name}" and move its tasks to "{deleteTarget.fallback.name}"?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={!!deletingCategoryId}
                  className="flex-1 px-3 py-2 text-xs sm:text-sm text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteCategory}
                  disabled={!!deletingCategoryId}
                  className="flex-1 px-3 py-2 text-xs sm:text-sm bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-semibold rounded-lg transition disabled:from-rose-300 disabled:to-red-300"
                >
                  {deletingCategoryId ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>,
    document.body
  );
}
