import React, { useState, useEffect, useCallback } from 'react';
import { CalendarDays, CheckSquare } from 'lucide-react';
import { FirebaseError } from 'firebase/app';
import { Category, Task } from '@/types';
import { useAuth } from '@/context/AuthContext';
import {
  createTask,
  getUserTasks,
  updateTask,
  deleteTask,
} from '@/services/taskService';
import {
  getUserCategories,
} from '@/services/categoryService';
import { formatToDateString } from '@/utils/dateUtils';
import { showToast } from '@/components/Toast';

const DEFAULT_TASK_CATEGORY_NAME = 'Personal';
const DEFAULT_TASK_CATEGORY_COLOR = '#C4B5FD';
const COLOR_HEX_REGEX = /^#[0-9A-F]{6}$/i;

const isValidHexColor = (value: string): boolean => COLOR_HEX_REGEX.test(value);

const hexToRgba = (hex: string, alpha: number): string => {
  if (!isValidHexColor(hex)) {
    return `rgba(196, 181, 253, ${alpha})`;
  }

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getReadableCategoryTextColor = (hex: string): string => {
  if (!isValidHexColor(hex)) {
    return '#374151';
  }

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const darken = (channel: number) => Math.max(28, Math.round(channel * 0.45));
  return `rgb(${darken(r)}, ${darken(g)}, ${darken(b)})`;
};

const findCategoryByTaskValue = (
  categories: Category[],
  taskCategory: string
): Category | undefined => {
  return categories.find((category) => category.id === taskCategory || category.name === taskCategory);
};

const getCategoryErrorMessage = (error: unknown): string => {
  if (error instanceof FirebaseError) {
    if (error.code === 'permission-denied') {
      return 'Cannot access categories yet. Add Firestore rules for /categories so users can read/write their own documents.';
    }

    if (error.code === 'failed-precondition') {
      return 'Categories query is missing a Firestore index. Create the suggested index in Firebase Console.';
    }

    if (error.code === 'unauthenticated') {
      return 'Please sign in again to load categories.';
    }
  }

  return 'Failed to load categories. Please try again.';
};

export function TasksPage() {
  const { user, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: DEFAULT_TASK_CATEGORY_NAME,
    dueDate: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Edit state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    category: DEFAULT_TASK_CATEGORY_NAME,
    dueDate: '',
  });

  // Delete confirmation state
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  // Load tasks when user changes
  useEffect(() => {
    if (!user) {
      setTasks([]);
      setCategories([]);
      setLoading(false);
      return;
    }

    const loadData = async () => {
      await Promise.all([loadTasks(), loadCategories()]);
    };

    loadData();
  }, [user]);

  const getDefaultCategoryValue = (categoryList: Category[] = categories): string => {
    const defaultCategory =
      categoryList.find((category) => category.name === DEFAULT_TASK_CATEGORY_NAME) ||
      categoryList[0];

    return defaultCategory?.id || DEFAULT_TASK_CATEGORY_NAME;
  };

  const loadTasks = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const userTasks = await getUserTasks(user.uid);
      setTasks(userTasks);
      setError(null);
    } catch (err) {
      setError('Failed to load tasks. Please try again.');
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    if (!user) return;

    try {
      const userCategories = await getUserCategories(user.uid);
      setCategories(userCategories);

      if (userCategories.length > 0) {
        const validValues = new Set(userCategories.flatMap((category) => [category.id, category.name]));
        const defaultCategoryValue = getDefaultCategoryValue(userCategories);

        setFormData((prev) => ({
          ...prev,
          category: validValues.has(prev.category) ? prev.category : defaultCategoryValue,
        }));

        setEditFormData((prev) => ({
          ...prev,
          category: validValues.has(prev.category) ? prev.category : defaultCategoryValue,
        }));
      }
    } catch (err) {
      setError(getCategoryErrorMessage(err));
      console.error('Error loading categories:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.title.trim()) {
      setError('Task title is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const selectedCategory = findCategoryByTaskValue(categories, formData.category);

      await createTask(user.uid, {
        title: formData.title,
        description: formData.description,
        category: selectedCategory?.id || formData.category || getDefaultCategoryValue(),
        dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
        isCompleted: false,
      });

      // Reset form and close modal
      setFormData({ title: '', description: '', category: getDefaultCategoryValue(), dueDate: '' });
      setIsModalOpen(false);

      // Reload tasks
      await loadTasks();
    } catch (err) {
      setError('Failed to create task. Please try again.');
      console.error('Error creating task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleCompletion = useCallback(async (taskId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;

    // Optimistic update: instantly reflect the change in UI
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, isCompleted: newStatus } : t
      )
    );

    try {
      await updateTask(taskId, { isCompleted: newStatus });
    } catch (err) {
      // Revert to previous state on failure
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, isCompleted: currentStatus } : t
        )
      );
      showToast('Failed to update task. Please try again.', 'error');
      console.error('Error updating task:', err);
    }
  }, []);

  const handleEditTask = (task: Task) => {
    const matchedCategory = findCategoryByTaskValue(categories, task.category);
    setEditingTaskId(task.id);
    setEditFormData({
      title: task.title,
      description: task.description,
      category: matchedCategory?.id || task.category || getDefaultCategoryValue(),
      dueDate: task.dueDate
        ? task.dueDate.toISOString().split('T')[0]
        : '',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTaskId) return;

    if (!editFormData.title.trim()) {
      setError('Task title is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const selectedCategory = findCategoryByTaskValue(categories, editFormData.category);

      await updateTask(editingTaskId, {
        title: editFormData.title,
        description: editFormData.description,
        category: selectedCategory?.id || editFormData.category || getDefaultCategoryValue(),
        dueDate: editFormData.dueDate ? new Date(editFormData.dueDate) : null,
      });

      setTasks(
        tasks.map((t) =>
          t.id === editingTaskId
            ? {
                ...t,
                title: editFormData.title,
                description: editFormData.description,
                category: selectedCategory?.id || editFormData.category || getDefaultCategoryValue(),
                dueDate: editFormData.dueDate
                  ? new Date(editFormData.dueDate)
                  : null,
              }
            : t
        )
      );

      setEditingTaskId(null);
    } catch (err) {
      setError('Failed to update task. Please try again.');
      console.error('Error updating task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditFormData({ title: '', description: '', category: getDefaultCategoryValue(), dueDate: '' });
  };

  const handleDeleteTask = async (taskId: string) => {
    setDeletingTaskId(taskId);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTaskId) return;

    try {
      await deleteTask(deletingTaskId);
      setTasks(tasks.filter((t) => t.id !== deletingTaskId));
      setDeletingTaskId(null);
    } catch (err) {
      setError('Failed to delete task. Please try again.');
      console.error('Error deleting task:', err);
      setDeletingTaskId(null);
    }
  };

  const handleCancelDelete = () => {
    setDeletingTaskId(null);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Please Sign In</h1>
          <p className="text-gray-600">You need to be logged in to access tasks.</p>
        </div>
      </div>
    );
  }

  const incompleteTasks = tasks
    .filter((t) => !t.isCompleted)
    .sort((a, b) => {
      // Sort by due date: tasks with earlier dates first
      // Tasks without due dates go to the bottom
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  const completedTasks = tasks.filter((t) => t.isCompleted);
  const isEditCategoryMissing =
    !!editFormData.category &&
    !categories.some(
      (category) =>
        category.id === editFormData.category || category.name === editFormData.category
    );

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8 md:mb-10">
          <div className="mb-2 flex items-center gap-3">
            <CheckSquare className="h-7 w-7 md:h-8 md:w-8 text-fuchsia-500" />
            <h1 className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-500">
              Tasks
            </h1>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm md:text-base">
            {error}
          </div>
        )}

        {/* Add Task Form Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-white/90 sm:bg-white/85 backdrop-blur-none sm:backdrop-blur-md border border-white/40 rounded-t-2xl sm:rounded-3xl shadow-sm sm:shadow-xl sm:shadow-purple-500/10 max-w-md w-full max-h-[90vh] overflow-y-auto sm:max-h-none">
              <form onSubmit={handleSubmit} className="space-y-4 p-4 md:p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg md:text-xl font-semibold text-gray-900">Add New Task</h2>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Title Input */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Task Title *
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Enter task title"
                    className="w-full px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    disabled={isSubmitting}
                    autoFocus
                  />
                </div>

                {/* Description Textarea */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Enter task description (optional)"
                    rows={3}
                    className="w-full px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Category */}
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-white"
                    disabled={isSubmitting}
                  >
                    {categories.length === 0 ? (
                      <option value={DEFAULT_TASK_CATEGORY_NAME}>{DEFAULT_TASK_CATEGORY_NAME}</option>
                    ) : (
                      categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData({ ...formData, dueDate: e.target.value })
                    }
                    className="w-full px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                  >
                    {isSubmitting ? 'Adding...' : 'Add Task'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg transition duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Floating Action Button */}
        <button
          onClick={() => {
            setFormData({
              title: '',
              description: '',
              category: getDefaultCategoryValue(),
              dueDate: '',
            });
            setIsModalOpen(true);
          }}
          className="fixed bottom-6 right-6 md:bottom-8 md:right-8 h-14 w-14 bg-gradient-to-br from-fuchsia-400 via-purple-500 to-indigo-500 text-white rounded-full shadow-lg md:shadow-[0_14px_34px_rgba(157,78,221,0.42)] hover:shadow-xl md:hover:shadow-[0_18px_40px_rgba(157,78,221,0.5)] hover:scale-105 transition-all duration-200 z-40 flex items-center justify-center"
          title="Add new task"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {/* Tasks Sections */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-600">Loading tasks...</div>
          </div>
        ) : (
          <>
            {/* Incomplete Tasks Section */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Pending Tasks ({incompleteTasks.length})
              </h2>
              {incompleteTasks.length === 0 ? (
                <div className="bg-white/70 sm:bg-white/50 backdrop-blur-none sm:backdrop-blur-md border border-white/40 rounded-3xl shadow-sm sm:shadow-xl sm:shadow-purple-500/10 p-8 text-center text-gray-600">
                  <p>No pending tasks. Great job! 🎉</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {incompleteTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      categories={categories}
                      onToggleCompletion={handleToggleCompletion}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Completed Tasks Section */}
            {completedTasks.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Completed Tasks ({completedTasks.length})
                </h2>
                <div className="space-y-4">
                  {completedTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      categories={categories}
                      onToggleCompletion={handleToggleCompletion}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Edit Task Modal */}
        {editingTaskId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-white/90 sm:bg-white/85 backdrop-blur-none sm:backdrop-blur-md border border-white/40 rounded-t-2xl sm:rounded-3xl shadow-sm sm:shadow-xl sm:shadow-purple-500/10 max-w-md w-full max-h-[90vh] overflow-y-auto p-4 md:p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Edit Task</h2>
              <form onSubmit={handleSaveEdit} className="space-y-4">
                {/* Title Input */}
                <div>
                  <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 mb-1">
                    Task Title *
                  </label>
                  <input
                    id="edit-title"
                    type="text"
                    value={editFormData.title}
                    onChange={(e) =>
                     setEditFormData({ ...editFormData, title: e.target.value })
                    }
                    placeholder="Enter task title"
                    className="w-full px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Description Textarea */}
                <div>
                  <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="edit-description"
                    value={editFormData.description}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, description: e.target.value })
                    }
                    placeholder="Enter task description (optional)"
                    rows={3}
                    className="w-full px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Category */}
                <div>
                  <label htmlFor="edit-category" className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    id="edit-category"
                    value={editFormData.category}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, category: e.target.value })
                    }
                    className="w-full px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-white"
                    disabled={isSubmitting}
                  >
                    {isEditCategoryMissing && (
                      <option value={editFormData.category}>{editFormData.category}</option>
                    )}
                    {categories.length === 0 ? (
                      <option value={DEFAULT_TASK_CATEGORY_NAME}>{DEFAULT_TASK_CATEGORY_NAME}</option>
                    ) : (
                      categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label htmlFor="edit-dueDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    id="edit-dueDate"
                    type="date"
                    value={editFormData.dueDate}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, dueDate: e.target.value })
                    }
                    className="w-full px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isSubmitting}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingTaskId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white/90 sm:bg-white/85 backdrop-blur-none sm:backdrop-blur-md border border-white/40 rounded-3xl shadow-sm sm:shadow-xl sm:shadow-purple-500/10 max-w-sm w-full p-6">
              <div className="mb-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 4v2M6.34 5.34l1.414-1.414m3.536-3.536l1.414 1.414m3.536 3.536l1.414-1.414m-7.071 7.071l-1.414 1.414m3.536 3.536l-1.414-1.414m7.071-7.071l1.414 1.414" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">Delete Task?</h3>
              <p className="text-gray-600 text-sm text-center mb-6">
                Are you sure you want to delete this task? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelDelete}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Task Item Component
interface TaskItemProps {
  task: Task;
  categories: Category[];
  onToggleCompletion: (taskId: string, currentStatus: boolean) => void;
  onDelete: (taskId: string) => void;
  onEdit: (task: Task) => void;
}

function TaskItem({ task, categories, onToggleCompletion, onDelete, onEdit }: TaskItemProps) {
  const matchedCategory = findCategoryByTaskValue(categories, task.category);
  const categoryName = matchedCategory?.name || task.category || DEFAULT_TASK_CATEGORY_NAME;
  const categoryColor = isValidHexColor(matchedCategory?.color || '')
    ? (matchedCategory?.color as string)
    : DEFAULT_TASK_CATEGORY_COLOR;
  const categoryTextColor = getReadableCategoryTextColor(categoryColor);

  const getDueDateColor = () => {
    if (!task.dueDate) return 'text-gray-600';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'text-red-600'; // Overdue
    if (diffDays === 0) return 'text-yellow-600'; // Due today
    return 'text-gray-600'; // Future
  };

  const getDueDateBgColor = () => {
    if (!task.dueDate) return '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'ring-1 ring-red-200/80'; // Overdue
    if (diffDays === 0) return 'ring-1 ring-amber-200/80'; // Due today
    return '';
  };

  const formatDueDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(date);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return formatToDateString(date);
  };

  return (
    <div
      className={`group bg-white/70 sm:bg-white/50 backdrop-blur-none sm:backdrop-blur-md rounded-3xl border border-white/40 ${
        task.isCompleted ? 'opacity-80' : ''
      } ${getDueDateBgColor()} shadow-sm sm:shadow-xl sm:shadow-purple-500/10 transition-all duration-200 hover:shadow-md sm:hover:shadow-2xl`}
    >
      <div className="flex flex-row items-start sm:items-center gap-3 py-4 px-4 sm:px-6">
        <div className="flex-shrink-0 mt-1 sm:mt-0">
          <button
            type="button"
            role="checkbox"
            aria-checked={task.isCompleted}
            aria-label={`Mark ${task.title} as ${task.isCompleted ? 'incomplete' : 'completed'}`}
            onClick={() => onToggleCompletion(task.id, task.isCompleted)}
            className={`h-5 w-5 md:h-6 md:w-6 rounded-full border transition-all duration-200 flex items-center justify-center ${
              task.isCompleted
                ? 'bg-gradient-to-br from-pink-400 to-purple-500 border-transparent text-white shadow-[0_6px_16px_rgba(184,109,214,0.45)]'
                : 'bg-white/70 border-purple-200 text-transparent hover:border-purple-300'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <span
            className={`truncate font-medium text-sm md:text-base ${
              task.isCompleted
                ? 'line-through text-gray-500'
                : 'text-gray-900'
            }`}
          >
            {task.title}
          </span>

          <div className="flex flex-row flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs mt-1">
            <span
              className="inline-flex items-center text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full border"
              style={{
                backgroundColor: hexToRgba(categoryColor, 0.3),
                color: categoryTextColor,
                borderColor: hexToRgba(categoryColor, 0.65),
              }}
            >
              {categoryName}
            </span>

            {task.dueDate && (
              <p className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-medium text-purple-900/60">
                <span>Due:</span>
                <CalendarDays className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${getDueDateColor()}`} />
                <span className={`${getDueDateColor()} sm:whitespace-nowrap`}>{formatDueDate(task.dueDate)}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 flex flex-row gap-1 sm:gap-2 opacity-65 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(task)}
            className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-white/35 hover:bg-white/80 text-gray-500 hover:text-blue-600 transition-all flex items-center justify-center"
            title="Edit task"
            aria-label={`Edit ${task.title}`}
          >
            <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-white/35 hover:bg-white/80 text-gray-500 hover:text-red-600 transition-all flex items-center justify-center"
            title="Delete task"
            aria-label={`Delete ${task.title}`}
          >
            <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
