import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays } from 'lucide-react';
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

export function TasksPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
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
      setLoadError(null);
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
      setLoadError(null);
      const userTasks = await getUserTasks(user.uid);
      setTasks(userTasks);
      setError(null);
    } catch (err) {
      const message = 'Could not load tasks. Refresh and try again.';
      setLoadError(message);
      setError(message);
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

  const retryLoadData = async () => {
    await Promise.all([loadTasks(), loadCategories()]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.title.trim()) {
      setError('Add a task title.');
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
      setError('Could not create the task. Check your connection and try again.');
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
      showToast('Task update failed. Please try again.', 'error');
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
      setError('Add a task title.');
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
      setError('Could not save task changes. Please try again.');
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
      setError('Could not delete this task. Please try again.');
      console.error('Error deleting task:', err);
      setDeletingTaskId(null);
    }
  };

  const handleCancelDelete = () => {
    setDeletingTaskId(null);
  };

  if (authLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 md:pt-6 pb-8 md:pb-12">
        <div className="glass-card p-8 md:p-12 text-center">
          <div className="flex justify-center mb-3">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600">Loading your account...</p>
        </div>
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
  const userDisplayName = userProfile?.displayName?.trim() || user.displayName?.trim() || 'there';

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
      <div className="max-w-3xl mx-auto px-3 sm:px-6 pt-3 md:pt-6 pb-6 md:pb-12">
        {/* Hero Greeting */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-700 to-pink-600">
              Hello, {userDisplayName}
            </h1>
            <p className="mt-1 text-sm sm:text-base text-gray-500 font-medium">Focus list for today.</p>
          </div>
          
          {/* Desktop Add Task Button */}
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
            className="hidden md:flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl shadow-[0_8px_20px_rgba(157,78,221,0.25)] hover:shadow-[0_12px_28px_rgba(157,78,221,0.35)] hover:-translate-y-0.5 transition-all font-semibold"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add Task
          </button>
        </div>

        {/* Add Task Form Modal */}
        {isModalOpen && createPortal(
          <div className="fixed inset-0 bg-gradient-to-b from-slate-950/35 via-purple-900/20 to-fuchsia-900/30 backdrop-blur-0 sm:backdrop-blur-[2px] flex items-end sm:items-center justify-center z-[9999] p-0 sm:p-4">
            <div className="modal-enter w-full sm:max-w-lg h-dvh sm:h-auto max-h-dvh sm:max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white/95 sm:bg-white/88 backdrop-blur-none sm:backdrop-blur-xl border border-white/70 rounded-none sm:rounded-2xl shadow-[0_-12px_32px_rgba(120,87,255,0.24)] sm:shadow-[0_24px_56px_rgba(120,87,255,0.26)]">
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 p-4 sm:p-6 md:p-7">
                {/* Header */}
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h2 className="text-lg sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-pink-600">Add New Task</h2>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl text-purple-400 hover:text-purple-600 hover:bg-white/80 transition flex items-center justify-center"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm md:text-base">
                    {error}
                  </div>
                )}

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
                    className="w-full min-h-[42px] sm:min-h-[44px] rounded-lg border border-purple-200 bg-white/90 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-gray-800 placeholder:text-gray-400 shadow-sm transition focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 focus:outline-none"
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
                    className="w-full rounded-lg border border-purple-200 bg-white/90 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-gray-800 placeholder:text-gray-400 shadow-sm transition resize-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 focus:outline-none"
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
                    className="w-full min-h-[42px] sm:min-h-[44px] rounded-lg border border-purple-200 bg-white/90 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-gray-800 shadow-sm transition focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 focus:outline-none"
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
                    className="w-full min-h-[42px] sm:min-h-[44px] rounded-lg border border-purple-200 bg-white/90 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-gray-800 shadow-sm transition focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 focus:outline-none"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Buttons */}
                <div className="sticky bottom-0 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-white/95 via-white/90 to-transparent">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 min-h-[42px] sm:min-h-[44px] bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-400 text-white text-sm sm:text-base font-semibold py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl transition duration-200 shadow-[0_8px_20px_rgba(157,78,221,0.25)]"
                  >
                    {isSubmitting ? 'Adding...' : 'Add Task'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                    className="flex-1 min-h-[42px] sm:min-h-[44px] bg-white/90 hover:bg-white text-gray-700 border border-purple-100 disabled:bg-white/70 disabled:text-gray-500 text-sm sm:text-base font-semibold py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl transition duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* Tasks Sections */}
        {loading ? (
          <div className="glass-card p-5 sm:p-8 md:p-12 text-center">
            <div className="flex justify-center mb-3">
              <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-600">Loading your tasks...</p>
          </div>
        ) : loadError && tasks.length === 0 ? (
          <div className="glass-card p-5 sm:p-8 md:p-12 text-center">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Tasks unavailable</h2>
            <p className="text-gray-600 mb-5">{loadError}</p>
            <button
              type="button"
              onClick={retryLoadData}
              className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold hover:from-purple-700 hover:to-pink-600 transition"
            >
              Retry
            </button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="glass-card p-5 sm:p-8 md:p-12 text-center">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">No tasks yet</h2>
            <p className="text-gray-600 mb-5">Add your first task to start planning your week.</p>
            <button
              type="button"
              onClick={() => {
                setFormData({
                  title: '',
                  description: '',
                  category: getDefaultCategoryValue(),
                  dueDate: '',
                });
                setIsModalOpen(true);
              }}
              className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-lg bg-purple-100 text-purple-700 font-semibold hover:bg-purple-200 transition"
            >
              Add first task
            </button>
          </div>
        ) : (
          <>
            {/* Incomplete Tasks Section */}
            <div className="mb-8 sm:mb-10">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                Pending Tasks ({incompleteTasks.length})
              </h2>
              {incompleteTasks.length === 0 ? (
                <div className="glass-card p-6 sm:p-8 text-center text-gray-600">
                  <p>No pending tasks. Great job, everything is complete.</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4 list-stagger">
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
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                  Completed Tasks ({completedTasks.length})
                </h2>
                <div className="space-y-3 sm:space-y-4 list-stagger">
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
        {editingTaskId && createPortal(
          <div className="fixed inset-0 bg-gradient-to-b from-slate-950/35 via-purple-900/20 to-fuchsia-900/30 backdrop-blur-0 sm:backdrop-blur-[2px] flex items-end sm:items-center justify-center z-[9999] p-0 sm:p-4">
            <div className="modal-enter w-full sm:max-w-lg h-dvh sm:h-auto max-h-dvh sm:max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white/95 sm:bg-white/88 backdrop-blur-none sm:backdrop-blur-xl border border-white/70 rounded-none sm:rounded-2xl shadow-[0_-12px_32px_rgba(120,87,255,0.24)] sm:shadow-[0_24px_56px_rgba(120,87,255,0.26)]">
              <form onSubmit={handleSaveEdit} className="space-y-4 sm:space-y-5 p-4 sm:p-6 md:p-7">
                <h2 className="text-lg sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-pink-600">Edit Task</h2>
                
                {/* Error Message */}
                {error && (
                  <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm md:text-base">
                    {error}
                  </div>
                )}

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
                    className="w-full min-h-[42px] sm:min-h-[44px] rounded-lg border border-purple-200 bg-white/90 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-gray-800 placeholder:text-gray-400 shadow-sm transition focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 focus:outline-none"
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
                    className="w-full rounded-lg border border-purple-200 bg-white/90 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-gray-800 placeholder:text-gray-400 shadow-sm transition resize-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 focus:outline-none"
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
                    className="w-full min-h-[42px] sm:min-h-[44px] rounded-lg border border-purple-200 bg-white/90 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-gray-800 shadow-sm transition focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 focus:outline-none"
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
                    className="w-full min-h-[42px] sm:min-h-[44px] rounded-lg border border-purple-200 bg-white/90 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-gray-800 shadow-sm transition focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 focus:outline-none"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Buttons */}
                <div className="sticky bottom-0 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-white/95 via-white/90 to-transparent">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 min-h-[42px] sm:min-h-[44px] bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-400 text-white text-sm sm:text-base font-semibold py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl transition duration-200 shadow-[0_8px_20px_rgba(157,78,221,0.25)]"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isSubmitting}
                    className="flex-1 min-h-[42px] sm:min-h-[44px] bg-white/90 hover:bg-white text-gray-700 border border-purple-100 disabled:bg-white/70 disabled:text-gray-500 text-sm sm:text-base font-semibold py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl transition duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* Delete Confirmation Modal */}
        {deletingTaskId && createPortal(
          <div className="fixed inset-0 bg-gradient-to-b from-slate-950/35 via-purple-900/20 to-fuchsia-900/30 backdrop-blur-0 sm:backdrop-blur-[2px] flex items-center justify-center z-[9999] p-4">
            <div className="modal-enter max-w-sm w-full max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-rose-100/80 bg-white/95 backdrop-blur-none sm:backdrop-blur-xl p-5 sm:p-6 shadow-[0_24px_56px_rgba(244,63,94,0.22)]">
              <div className="mb-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 border border-rose-200">
                  <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 4v2M6.34 5.34l1.414-1.414m3.536-3.536l1.414 1.414m3.536 3.536l1.414-1.414m-7.071 7.071l-1.414 1.414m3.536 3.536l-1.414-1.414m7.071-7.071l1.414 1.414" />
                  </svg>
                </div>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 text-center">Delete Task?</h3>
              <p className="text-gray-700 text-sm text-center mb-6">
                Are you sure you want to delete this task? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelDelete}
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-semibold rounded-xl transition shadow-[0_8px_20px_rgba(244,63,94,0.28)]"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>

      {/* Floating Action Button - Fixed outside container (Mobile only) */}
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
        className="fixed bottom-24 right-4 md:hidden h-12 w-12 bg-gradient-to-br from-fuchsia-400 via-purple-500 to-indigo-500 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 z-50 flex items-center justify-center fab-breathe"
        title="Add new task"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
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

  const getDeadlineStatus = () => {
    if (!task.dueDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const overdueDays = Math.abs(diffDays);
      return {
        text: `Overdue by ${overdueDays} day${overdueDays > 1 ? 's' : ''}`,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    }
    if (diffDays === 0) {
      return {
        text: 'Due today',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200'
      };
    }
    return {
      text: `${diffDays} day${diffDays > 1 ? 's' : ''} left`,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    };
  };

  const formatDueDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div
      className={`group glass-card ${
        task.isCompleted ? 'opacity-80' : ''
      } ${getDueDateBgColor()} transition-[box-shadow,transform,opacity] duration-200 sm:hover:shadow-2xl`}
    >
      <div className="flex flex-row items-start sm:items-center gap-2.5 sm:gap-3 py-3 sm:py-4 px-3 sm:px-6">
        <div className="flex-shrink-0 mt-1 sm:mt-0">
          <button
            type="button"
            role="checkbox"
            aria-checked={task.isCompleted}
            aria-label={`Mark ${task.title} as ${task.isCompleted ? 'incomplete' : 'completed'}`}
            onClick={() => onToggleCompletion(task.id, task.isCompleted)}
            className={`h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 aspect-square rounded-md border transition-all duration-200 flex items-center justify-center shrink-0 ${
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
            className={`truncate font-medium text-sm sm:text-base md:text-lg ${
              task.isCompleted
                ? 'line-through text-gray-500'
                : 'text-gray-900'
            }`}
          >
            {task.title}
          </span>

          {task.description && (
            <p 
              className={`text-xs sm:text-sm text-gray-500 truncate max-w-[95%] ${task.isCompleted ? 'opacity-60' : ''}`}
              title={task.description}
            >
              {task.description}
            </p>
          )}

          <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-3 mt-0.5 sm:mt-1 text-[11px] sm:text-sm text-purple-900/60">
            <span
              className="inline-flex items-center text-[9px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-md border"
              style={{
                backgroundColor: hexToRgba(categoryColor, 0.3),
                color: categoryTextColor,
                borderColor: hexToRgba(categoryColor, 0.65),
              }}
            >
              {categoryName}
            </span>

            {task.dueDate && (() => {
              const status = getDeadlineStatus();
              return (
                <div className="inline-flex items-center gap-1.5 sm:gap-2 font-medium">
                  <p className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600" />
                    <span className="sm:whitespace-nowrap">{formatDueDate(task.dueDate)}</span>
                  </p>
                  {status && (
                    <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-xs font-semibold border ${status.color} ${status.bgColor} ${status.borderColor}`}>
                      {status.text}
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        <div className="flex-shrink-0 flex flex-row gap-1 sm:gap-2 opacity-65 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(task)}
            className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 rounded-full bg-transparent hover:bg-white/70 text-gray-500 hover:text-blue-600 transition-all flex items-center justify-center"
            title="Edit task"
            aria-label={`Edit ${task.title}`}
          >
            <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 rounded-full bg-transparent hover:bg-white/70 text-gray-500 hover:text-red-600 transition-all flex items-center justify-center"
            title="Delete task"
            aria-label={`Delete ${task.title}`}
          >
            <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="currentColor" viewBox="0 0 20 20">
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
