import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp, CalendarDays, ChevronDown, FolderTree, Layers, Settings2, ListChecks, Plus, X } from 'lucide-react';
import { FirebaseError } from 'firebase/app';
import { Category, Task, TaskPreset, Subtask } from '@/types';
import { useAuth } from '@/context/AuthContext';
import {
  createTask,
  getUserTasks,
  updateTask,
  deleteTask,
} from '@/services/taskService';
import TasksTable from '@/components/TasksTable';
import { CategoriesModal } from '@/components/CategoriesModal';
import {
  getUserCategories,
} from '@/services/categoryService';
import { showToast } from '@/components/Toast';
import { playSuccessSound } from '@/utils/audio';
import { sortIncompleteTasks, sortCompletedTasks } from '@/utils/taskUtils';
import { formatDueDateDisplay } from '@/utils/dateUtils';
import {
  createTaskPreset,
  deleteTaskPreset,
  getUserTaskPresets,
  setActiveTaskPreset,
  updateTaskPreset,
} from '@/services/taskPresetService';
import { ManageTaskPresetsModal } from '@/components/ManageTaskPresetsModal';

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
  const [presets, setPresets] = useState<TaskPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState('');
  const [isPresetDropdownOpen, setIsPresetDropdownOpen] = useState(false);
  const [isManagePresetsOpen, setIsManagePresetsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // View mode: 'list' or 'table'
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list');
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    category: string;
    dueDate: string;
    setId: string;
    subtasks: Subtask[];
  }>({
    title: '',
    description: '',
    category: DEFAULT_TASK_CATEGORY_NAME,
    dueDate: '',
    setId: '',
    subtasks: [],
  });
  const [subtaskInputText, setSubtaskInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Edit state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{
    title: string;
    description: string;
    category: string;
    dueDate: string;
    setId: string;
    subtasks: Subtask[];
  }>({
    title: '',
    description: '',
    category: DEFAULT_TASK_CATEGORY_NAME,
    dueDate: '',
    setId: '',
    subtasks: [],
  });
  const [editSubtaskInputText, setEditSubtaskInputText] = useState('');

  // Delete confirmation state
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  // Load tasks when user changes
  useEffect(() => {
    if (!user) {
      setTasks([]);
      setCategories([]);
      setPresets([]);
      setLoadError(null);
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        await Promise.all([loadTasks(), loadCategories(), loadPresets()]);
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  useEffect(() => {
    if (!isPresetDropdownOpen) return;
    const closeDropdown = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('.routine-dropdown-container')) setIsPresetDropdownOpen(false);
    };
    document.addEventListener('click', closeDropdown);
    return () => document.removeEventListener('click', closeDropdown);
  }, [isPresetDropdownOpen]);

  const getDefaultCategoryValue = (categoryList: Category[] = categories): string => {
    const defaultCategory =
      categoryList.find((category) => category.name === DEFAULT_TASK_CATEGORY_NAME) ||
      categoryList[0];

    return defaultCategory?.id || DEFAULT_TASK_CATEGORY_NAME;
  };

  const loadTasks = async () => {
    if (!user) return;
    try {
      setLoadError(null);
      const userTasks = await getUserTasks(user.uid);
      setTasks(userTasks);
      setError(null);
    } catch (err) {
      const message = 'Could not load tasks. Refresh and try again.';
      setLoadError(message);
      setError(message);
      console.error('Error loading tasks:', err);
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

  const loadPresets = async () => {
    if (!user) return;
    try {
      const userPresets = await getUserTaskPresets(user.uid);
      setPresets(userPresets);
      const active = userPresets.find((preset) => preset.isActive) || userPresets[0];
      if (active) {
        setActivePresetId(active.id);
        setFormData((previous) => ({ ...previous, setId: previous.setId || active.id }));
      }
    } catch (err) {
      console.error('Error loading task presets:', err);
      showToast('Could not load task presets. Check Firestore permissions.', 'error');
    }
  };

  // Add modal subtask handlers
  const handleAddModalSubtask = () => {
    if (!subtaskInputText.trim()) return;
    const newSt: Subtask = {
      id: 'subtask_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: subtaskInputText.trim(),
      isCompleted: false,
    };
    setFormData((prev) => ({
      ...prev,
      subtasks: [...prev.subtasks, newSt],
    }));
    setSubtaskInputText('');
  };

  const handleRemoveModalSubtask = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      subtasks: prev.subtasks.filter((st) => st.id !== id),
    }));
  };

  const handleToggleModalSubtask = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      subtasks: prev.subtasks.map((st) => (st.id === id ? { ...st, isCompleted: !st.isCompleted } : st)),
    }));
  };

  const handleUpdateModalSubtaskTitle = (id: string, newTitle: string) => {
    setFormData((prev) => ({
      ...prev,
      subtasks: prev.subtasks.map((st) => (st.id === id ? { ...st, title: newTitle } : st)),
    }));
  };

  const handleMoveModalSubtaskUp = (index: number) => {
    if (index <= 0) return;
    setFormData((prev) => {
      const updated = [...prev.subtasks];
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
      return { ...prev, subtasks: updated };
    });
  };

  const handleMoveModalSubtaskDown = (index: number) => {
    setFormData((prev) => {
      if (index >= prev.subtasks.length - 1) return prev;
      const updated = [...prev.subtasks];
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
      return { ...prev, subtasks: updated };
    });
  };

  // Edit modal subtask handlers
  const handleAddEditSubtask = () => {
    if (!editSubtaskInputText.trim()) return;
    const newSt: Subtask = {
      id: 'subtask_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: editSubtaskInputText.trim(),
      isCompleted: false,
    };
    setEditFormData((prev) => ({
      ...prev,
      subtasks: [...prev.subtasks, newSt],
    }));
    setEditSubtaskInputText('');
  };

  const handleRemoveEditSubtask = (id: string) => {
    setEditFormData((prev) => ({
      ...prev,
      subtasks: prev.subtasks.filter((st) => st.id !== id),
    }));
  };

  const handleToggleEditSubtask = (id: string) => {
    setEditFormData((prev) => ({
      ...prev,
      subtasks: prev.subtasks.map((st) => (st.id === id ? { ...st, isCompleted: !st.isCompleted } : st)),
    }));
  };

  const handleUpdateEditSubtaskTitle = (id: string, newTitle: string) => {
    setEditFormData((prev) => ({
      ...prev,
      subtasks: prev.subtasks.map((st) => (st.id === id ? { ...st, title: newTitle } : st)),
    }));
  };

  const handleMoveEditSubtaskUp = (index: number) => {
    if (index <= 0) return;
    setEditFormData((prev) => {
      const updated = [...prev.subtasks];
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
      return { ...prev, subtasks: updated };
    });
  };

  const handleMoveEditSubtaskDown = (index: number) => {
    setEditFormData((prev) => {
      if (index >= prev.subtasks.length - 1) return prev;
      const updated = [...prev.subtasks];
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
      return { ...prev, subtasks: updated };
    });
  };

  const retryLoadData = async () => {
    await Promise.all([loadTasks(), loadCategories(), loadPresets()]);
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
        setId: formData.setId || activePresetId || undefined,
        subtasks: formData.subtasks || [],
      });

      // Reset form and close modal
      setFormData({ title: '', description: '', category: getDefaultCategoryValue(), dueDate: '', setId: activePresetId, subtasks: [] });
      setSubtaskInputText('');
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

    if (newStatus) {
      playSuccessSound();
    }

    let updatedSubtasks: Subtask[] = [];

    // Optimistic update: instantly reflect change in UI for main task AND all subtasks
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          updatedSubtasks = (t.subtasks || []).map((st) => ({ ...st, isCompleted: newStatus }));
          return {
            ...t,
            isCompleted: newStatus,
            subtasks: updatedSubtasks,
          };
        }
        return t;
      })
    );

    try {
      await updateTask(taskId, { isCompleted: newStatus, subtasks: updatedSubtasks });
    } catch (err) {
      showToast('Task update failed. Please try again.', 'error');
      console.error('Error updating task:', err);
      await loadTasks();
    }
  }, []);

  const handleToggleTaskSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    let updatedSubtasks: Subtask[] = [];
    let isTaskNowComplete = false;
    let wasAlreadyComplete = false;

    setTasks((prevTasks) =>
      prevTasks.map((t) => {
        if (t.id === taskId) {
          wasAlreadyComplete = t.isCompleted;
          const currentSubtasks = t.subtasks || [];
          updatedSubtasks = currentSubtasks.map((st) =>
            st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st
          );
          // Parent task is complete IF AND ONLY IF all subtasks are checked
          isTaskNowComplete = updatedSubtasks.length > 0 && updatedSubtasks.every((st) => st.isCompleted);
          return {
            ...t,
            subtasks: updatedSubtasks,
            isCompleted: isTaskNowComplete,
          };
        }
        return t;
      })
    );

    if (isTaskNowComplete && !wasAlreadyComplete) {
      playSuccessSound();
      showToast('All subtasks completed! Task marked as done 🎉', 'success');
    }

    try {
      await updateTask(taskId, {
        subtasks: updatedSubtasks,
        isCompleted: isTaskNowComplete,
      });
    } catch (err) {
      console.error('Error toggling subtask:', err);
      showToast('Subtask update failed.', 'error');
      await loadTasks();
    }
  }, []);

  const handleBulkSetCompletion = async (taskIds: string[], isCompleted: boolean) => {
    if (taskIds.length === 0) return;

    if (isCompleted) {
      playSuccessSound();
    }

    try {
      await Promise.all(taskIds.map((taskId) => updateTask(taskId, { isCompleted })));
      const idSet = new Set(taskIds);
      setTasks((prev) =>
        prev.map((task) => (idSet.has(task.id) ? { ...task, isCompleted } : task))
      );
      showToast(
        isCompleted
          ? `Marked ${taskIds.length} task(s) as completed.`
          : `Moved ${taskIds.length} task(s) back to pending.`,
        'success'
      );
    } catch (err) {
      showToast('Bulk update failed. Please try again.', 'error');
      console.error('Error bulk updating tasks:', err);
      await loadTasks();
    }
  };

  const handleBulkDelete = async (taskIds: string[]) => {
    if (taskIds.length === 0) return;

    try {
      await Promise.all(taskIds.map((taskId) => deleteTask(taskId)));
      const idSet = new Set(taskIds);
      setTasks((prev) => prev.filter((task) => !idSet.has(task.id)));
      showToast(`Deleted ${taskIds.length} task(s).`, 'success');
    } catch (err) {
      showToast('Bulk delete failed. Please try again.', 'error');
      console.error('Error bulk deleting tasks:', err);
      await loadTasks();
    }
  };

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
      setId: task.setId || presets[0]?.id || activePresetId,
      subtasks: task.subtasks || [],
    });
    setEditSubtaskInputText('');
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
        setId: editFormData.setId || activePresetId || undefined,
        subtasks: editFormData.subtasks || [],
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
                setId: editFormData.setId || activePresetId || undefined,
                subtasks: editFormData.subtasks || [],
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
    setEditFormData({ title: '', description: '', category: getDefaultCategoryValue(), dueDate: '', setId: activePresetId, subtasks: [] });
    setEditSubtaskInputText('');
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

  const sortedPresets = useMemo(() => {
    return [...presets].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [presets]);

  const activePreset = useMemo(
    () => presets.find((preset) => preset.id === activePresetId) || presets[0],
    [presets, activePresetId]
  );
  const visibleTasks = useMemo(() => {
    if (!activePreset) return tasks;
    const defaultPresetId = presets[0]?.id;
    return tasks.filter((task) => task.setId ? task.setId === activePreset.id : activePreset.id === defaultPresetId);
  }, [tasks, presets, activePreset]);

  const handleActivatePreset = async (presetId: string) => {
    if (!user || presetId === activePresetId) {
      setIsPresetDropdownOpen(false);
      return;
    }

    const previousPresetId = activePresetId;

    // Optimistic Update: Instantly update active state & close dropdown
    setActivePresetId(presetId);
    setPresets((previous) =>
      previous.map((preset) => ({ ...preset, isActive: preset.id === presetId }))
    );
    setIsPresetDropdownOpen(false);

    try {
      await setActiveTaskPreset(user.uid, presetId);
    } catch (err) {
      console.error('Error activating task preset:', err);
      // Revert on failure
      setActivePresetId(previousPresetId);
      setPresets((previous) =>
        previous.map((preset) => ({ ...preset, isActive: preset.id === previousPresetId }))
      );
      showToast('Could not switch task preset.', 'error');
    }
  };

  const handleCreatePreset = async (name: string, color: string) => {
    if (!user) return;
    const preset = await createTaskPreset(user.uid, name, color);
    setPresets((previous) => [...previous, preset]);
    showToast('Created task preset.', 'success');
  };

  const handleUpdatePreset = async (presetId: string, updates: Partial<Pick<TaskPreset, 'name' | 'color'>>) => {
    await updateTaskPreset(presetId, updates);
    setPresets((previous) => previous.map((preset) => preset.id === presetId ? { ...preset, ...updates } : preset));
    showToast('Updated task preset.', 'success');
  };

  const handleDeletePreset = async (presetId: string) => {
    if (!user || presets.length <= 1) return;
    const fallback = presets.find((preset) => preset.id !== presetId);
    if (!fallback) return;
    try {
      const defaultPresetId = presets[0]?.id;
      const tasksInPreset = tasks.filter((task) => task.setId === presetId || (!task.setId && presetId === defaultPresetId));
      await Promise.all(tasksInPreset.map((task) => deleteTask(task.id)));
      await deleteTaskPreset(presetId);
      setTasks((previous) => previous.filter((task) => !tasksInPreset.some((deletedTask) => deletedTask.id === task.id)));
      setPresets((previous) => previous.filter((preset) => preset.id !== presetId));
      if (presetId === activePresetId) await handleActivatePreset(fallback.id);
      showToast('Deleted task preset and its tasks.', 'success');
    } catch (err) {
      console.error('Error deleting task preset:', err);
      showToast('Could not delete task preset.', 'error');
    }
  };

  const incompleteTasks = visibleTasks
    .filter((t) => !t.isCompleted)
    .sort(sortIncompleteTasks);
  const completedTasks = visibleTasks
    .filter((t) => t.isCompleted)
    .sort(sortCompletedTasks);
  const isEditCategoryMissing =
    !!editFormData.category &&
    !categories.some(
      (category) =>
        category.id === editFormData.category || category.name === editFormData.category
    );

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto px-3 sm:px-6 pt-3 md:pt-6 pb-6 md:pb-12">
        {/* Top Bar Header */}
        <div className="mb-3 sm:mb-4 flex items-center justify-between gap-3 w-full">
          <div className="min-w-0 pr-2">
            <h1 className="text-xl sm:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-700 to-pink-600 truncate">
              Hello, {userDisplayName}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500 font-medium hidden sm:block">Focus list for today.</p>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            {/* Categories Button */}
            <button
              onClick={() => setIsCategoriesModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 bg-white text-purple-700 border border-purple-200 hover:bg-purple-50 rounded-xl shadow-xs transition-all text-xs sm:text-sm font-semibold whitespace-nowrap"
              title="Manage Categories"
            >
              <FolderTree className="w-4 h-4 text-purple-600" />
              <span className="hidden sm:inline">Categories</span>
            </button>

            {/* Add Task Button */}
            <button
              onClick={() => {
                setFormData({
                  title: '',
                  description: '',
                  category: getDefaultCategoryValue(),
                  dueDate: '',
                  setId: activePresetId,
                  subtasks: [],
                });
                setSubtaskInputText('');
                setIsModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl shadow-[0_8px_20px_rgba(157,78,221,0.25)] hover:shadow-[0_12px_28px_rgba(157,78,221,0.35)] hover:-translate-y-0.5 transition-all text-xs sm:text-sm font-semibold whitespace-nowrap"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Task</span>
            </button>
          </div>
        </div>

        {/* Unified Control Bar: Preset Selector & View Toggle */}
        <div className="relative z-30 mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 sm:gap-3 rounded-2xl border border-purple-100/90 bg-white/80 p-1.5 shadow-xs backdrop-blur-md sm:p-2">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-white border border-purple-200/80 rounded-xl p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition ${viewMode === 'list' ? 'bg-purple-600 text-white shadow-xs' : 'text-gray-700 hover:bg-gray-50'}`}
              aria-pressed={viewMode === 'list'}
              aria-label="List view"
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition ${viewMode === 'table' ? 'bg-purple-600 text-white shadow-xs' : 'text-gray-700 hover:bg-gray-50'}`}
              aria-pressed={viewMode === 'table'}
              aria-label="Table view"
            >
              Table
            </button>
          </div>

          {/* Preset Selector & Manage Button */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className="relative routine-dropdown-container min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setIsPresetDropdownOpen(!isPresetDropdownOpen)}
                className="flex min-h-[36px] sm:min-h-[38px] w-full items-center justify-between rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-2xs transition-all hover:border-purple-400 hover:shadow-xs focus:outline-none sm:px-4 sm:text-sm"
                aria-expanded={isPresetDropdownOpen}
              >
                <div className="flex items-center gap-2 truncate">
                  <Layers className="h-4 w-4 flex-shrink-0 text-purple-600" />
                  <span className="hidden font-normal text-gray-500 sm:inline">Preset:</span>
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: activePreset?.color || '#C084FC' }} />
                    <span className="truncate font-bold text-gray-900">{activePreset?.name || ''}</span>
                  </div>
                </div>
                <ChevronDown className={`ml-2 h-4 w-4 flex-shrink-0 text-purple-500 transition-transform duration-200 ${isPresetDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isPresetDropdownOpen && (
                <div className="modal-enter absolute left-0 top-full z-[100] mt-1.5 w-64 rounded-xl border-2 border-purple-300 bg-white py-1.5 shadow-[0_16px_36px_rgba(120,87,255,0.35)]">
                  <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">Switch Preset</div>
                  {sortedPresets.map((preset) => {
                    const isActive = preset.id === activePresetId;
                    return (
                      <button key={preset.id} type="button" onClick={() => handleActivatePreset(preset.id)} className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-xs transition-all hover:bg-purple-50 sm:text-sm ${isActive ? 'bg-purple-50 font-bold text-purple-900' : 'text-gray-700'}`}>
                        <div className="flex items-center gap-2 truncate"><span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: preset.color || '#C084FC' }} /><span className="truncate">{preset.name}</span></div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <button type="button" onClick={() => setIsManagePresetsOpen(true)} className="inline-flex min-h-[36px] sm:min-h-[38px] items-center whitespace-nowrap rounded-xl border border-purple-200 bg-white px-3 py-2 text-xs font-semibold text-purple-700 shadow-2xs transition hover:bg-purple-50">
              <Settings2 className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Manage Presets</span><span className="sm:hidden">Manage</span>
            </button>
          </div>
        </div>

        {/* Add Task Form Modal */}
        {isModalOpen && createPortal(
          <div className="fixed inset-0 bg-gradient-to-b from-slate-950/40 via-purple-900/25 to-fuchsia-900/35 backdrop-blur-xs sm:backdrop-blur-sm flex items-end sm:items-center justify-center z-[9999] p-0 sm:p-4">
            <div className="modal-enter w-full sm:max-w-lg h-dvh sm:h-auto max-h-dvh sm:max-h-[calc(100dvh-2rem)] flex flex-col bg-white sm:bg-white/95 backdrop-blur-xl border border-white/80 rounded-none sm:rounded-3xl shadow-[0_24px_56px_rgba(120,87,255,0.28)] overflow-hidden">
              <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-purple-100/80 bg-purple-50/50">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-purple-600" />
                    Add New Task
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="h-8 w-8 rounded-full text-gray-400 hover:text-gray-700 hover:bg-white transition flex items-center justify-center"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Scrollable Form Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                  {/* Error Message */}
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
                      {error}
                    </div>
                  )}

                  {/* Title Input */}
                  <div>
                    <label htmlFor="title" className="block text-xs font-semibold text-gray-700 mb-1">
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
                      className="w-full min-h-[42px] rounded-xl border border-purple-200 bg-white px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 shadow-2xs transition focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
                      disabled={isSubmitting}
                      autoFocus
                    />
                  </div>

                  {/* Description Textarea */}
                  <div>
                    <label htmlFor="description" className="block text-xs font-semibold text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Enter task description (optional)"
                      rows={2}
                      className="w-full rounded-xl border border-purple-200 bg-white px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 shadow-2xs transition resize-none focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Grouped Grid Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Category */}
                    <div>
                      <label htmlFor="category" className="block text-xs font-semibold text-gray-700 mb-1">
                        Category
                      </label>
                      <select
                        id="category"
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({ ...formData, category: e.target.value })
                        }
                        className="w-full min-h-[40px] rounded-xl border border-purple-200 bg-white px-2.5 py-2 text-xs sm:text-sm text-gray-800 shadow-2xs transition focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
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

                    {/* Task Preset */}
                    <div>
                      <label htmlFor="task-preset" className="block text-xs font-semibold text-gray-700 mb-1">
                        Preset
                      </label>
                      <select
                        id="task-preset"
                        value={formData.setId}
                        onChange={(e) => setFormData({ ...formData, setId: e.target.value })}
                        className="w-full min-h-[40px] rounded-xl border border-purple-200 bg-white px-2.5 py-2 text-xs sm:text-sm text-gray-800 shadow-2xs transition focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
                        disabled={isSubmitting}
                      >
                        {presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
                      </select>
                    </div>

                    {/* Due Date */}
                    <div>
                      <label htmlFor="dueDate" className="block text-xs font-semibold text-gray-700 mb-1">
                        Due Date
                      </label>
                      <input
                        id="dueDate"
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) =>
                          setFormData({ ...formData, dueDate: e.target.value })
                        }
                        className="w-full min-h-[40px] rounded-xl border border-purple-200 bg-white px-2.5 py-1.5 text-xs sm:text-sm text-gray-800 shadow-2xs transition focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {/* Subtasks Framed Section */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-purple-50/60 border border-purple-100/90 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                        <ListChecks className="w-4 h-4 text-purple-700" />
                        Subtasks (Checklist)
                      </label>
                      {formData.subtasks.length > 0 && (
                        <span className="text-[11px] font-semibold text-purple-700 bg-white/90 px-2 py-0.5 rounded-full border border-purple-200/80">
                          {formData.subtasks.filter((s) => s.isCompleted).length}/{formData.subtasks.length} Completed
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={subtaskInputText}
                        onChange={(e) => setSubtaskInputText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddModalSubtask();
                          }
                        }}
                        placeholder="Type subtask title and press Enter..."
                        className="flex-1 min-h-[38px] rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs sm:text-sm text-gray-800 placeholder:text-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={handleAddModalSubtask}
                        disabled={isSubmitting || !subtaskInputText.trim()}
                        className="min-h-[38px] px-3 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 disabled:opacity-50 rounded-xl transition inline-flex items-center gap-1 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    </div>

                    {formData.subtasks.length > 0 && (
                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {formData.subtasks.map((st, index) => (
                          <div
                            key={st.id}
                            className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/90 border border-purple-100 hover:border-purple-200 transition group shadow-2xs"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <button
                                type="button"
                                role="checkbox"
                                aria-checked={st.isCompleted}
                                onClick={() => handleToggleModalSubtask(st.id)}
                                className={`h-4 w-4 rounded border transition flex items-center justify-center shrink-0 ${
                                  st.isCompleted
                                    ? 'bg-gradient-to-br from-pink-400 to-purple-500 border-transparent text-white'
                                    : 'bg-white border-purple-300 text-transparent hover:border-purple-400'
                                }`}
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <input
                                type="text"
                                value={st.title}
                                onChange={(e) => handleUpdateModalSubtaskTitle(st.id, e.target.value)}
                                className={`flex-1 min-w-0 bg-transparent text-xs sm:text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-purple-400 rounded px-2 py-1 transition ${
                                  st.isCompleted ? 'line-through text-gray-400' : 'text-gray-800 font-medium'
                                }`}
                                placeholder="Subtask title..."
                              />
                            </div>

                            <div className="flex items-center gap-0.5 shrink-0 opacity-70 group-hover:opacity-100 transition">
                              <button
                                type="button"
                                onClick={() => handleMoveModalSubtaskUp(index)}
                                disabled={index === 0}
                                className="p-1 rounded text-gray-400 hover:text-purple-700 hover:bg-purple-100/70 disabled:opacity-25 disabled:hover:bg-transparent transition"
                                title="Move up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveModalSubtaskDown(index)}
                                disabled={index === formData.subtasks.length - 1}
                                className="p-1 rounded text-gray-400 hover:text-purple-700 hover:bg-purple-100/70 disabled:opacity-25 disabled:hover:bg-transparent transition"
                                title="Move down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveModalSubtask(st.id)}
                                className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition ml-0.5"
                                title="Remove subtask"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 p-4 sm:p-5 bg-purple-50/50 border-t border-purple-100/80">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                    className="flex-1 min-h-[42px] bg-white hover:bg-gray-50 text-gray-700 border border-purple-200/80 disabled:opacity-50 text-sm font-semibold py-2 px-4 rounded-xl transition shadow-2xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 min-h-[42px] bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-400 text-white text-sm font-semibold py-2 px-4 rounded-xl transition shadow-md"
                  >
                    {isSubmitting ? 'Adding...' : 'Add Task'}
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
        ) : visibleTasks.length === 0 ? (
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
                  setId: activePresetId,
                  subtasks: [],
                });
                setSubtaskInputText('');
                setIsModalOpen(true);
              }}
              className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-lg bg-purple-100 text-purple-700 font-semibold hover:bg-purple-200 transition"
            >
              Add first task
            </button>
          </div>
        ) : (
          <>
            {viewMode === 'table' ? (
              <div className="mb-6">
                <TasksTable
                  tasks={visibleTasks}
                  categories={categories}
                  onToggleCompletion={handleToggleCompletion}
                  onToggleSubtask={handleToggleTaskSubtask}
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
                  onBulkSetCompletion={handleBulkSetCompletion}
                  onBulkDelete={handleBulkDelete}
                />
              </div>
            ) : (
              <>
                {/* Incomplete Tasks Section */}
                <div className="mb-8 sm:mb-10">
                  <h2 className="text-xl sm:text-2xl font-bold text-pink-600 mb-3 sm:mb-4">
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
                          onToggleSubtask={handleToggleTaskSubtask}
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
                    <h2 className="text-xl sm:text-2xl font-bold text-purple-700 mb-3 sm:mb-4">
                      Completed Tasks ({completedTasks.length})
                    </h2>
                    <div className="space-y-3 sm:space-y-4 list-stagger">
                      {completedTasks.map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          categories={categories}
                          onToggleCompletion={handleToggleCompletion}
                          onToggleSubtask={handleToggleTaskSubtask}
                          onEdit={handleEditTask}
                          onDelete={handleDeleteTask}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}        {/* Edit Task Modal */}
        {editingTaskId && createPortal(
          <div className="fixed inset-0 bg-gradient-to-b from-slate-950/40 via-purple-900/25 to-fuchsia-900/35 backdrop-blur-xs sm:backdrop-blur-sm flex items-end sm:items-center justify-center z-[9999] p-0 sm:p-4">
            <div className="modal-enter w-full sm:max-w-lg h-dvh sm:h-auto max-h-dvh sm:max-h-[calc(100dvh-2rem)] flex flex-col bg-white sm:bg-white/95 backdrop-blur-xl border border-white/80 rounded-none sm:rounded-3xl shadow-[0_24px_56px_rgba(120,87,255,0.28)] overflow-hidden">
              <form onSubmit={handleSaveEdit} className="flex flex-col h-full max-h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-purple-100/80 bg-purple-50/50">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Settings2 className="w-5 h-5 text-purple-600" />
                    Edit Task
                  </h2>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="h-8 w-8 rounded-full text-gray-400 hover:text-gray-700 hover:bg-white transition flex items-center justify-center"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Scrollable Form Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                  {/* Error Message */}
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
                      {error}
                    </div>
                  )}

                  {/* Title Input */}
                  <div>
                    <label htmlFor="edit-title" className="block text-xs font-semibold text-gray-700 mb-1">
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
                      className="w-full min-h-[42px] rounded-xl border border-purple-200 bg-white px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 shadow-2xs transition focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Description Textarea */}
                  <div>
                    <label htmlFor="edit-description" className="block text-xs font-semibold text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      id="edit-description"
                      value={editFormData.description}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, description: e.target.value })
                      }
                      placeholder="Enter task description (optional)"
                      rows={2}
                      className="w-full rounded-xl border border-purple-200 bg-white px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 shadow-2xs transition resize-none focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Grouped Grid Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Category */}
                    <div>
                      <label htmlFor="edit-category" className="block text-xs font-semibold text-gray-700 mb-1">
                        Category
                      </label>
                      <select
                        id="edit-category"
                        value={editFormData.category}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, category: e.target.value })
                        }
                        className="w-full min-h-[40px] rounded-xl border border-purple-200 bg-white px-2.5 py-2 text-xs sm:text-sm text-gray-800 shadow-2xs transition focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
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

                    {/* Task Preset */}
                    <div>
                      <label htmlFor="edit-task-preset" className="block text-xs font-semibold text-gray-700 mb-1">
                        Preset
                      </label>
                      <select
                        id="edit-task-preset"
                        value={editFormData.setId}
                        onChange={(e) => setEditFormData({ ...editFormData, setId: e.target.value })}
                        className="w-full min-h-[40px] rounded-xl border border-purple-200 bg-white px-2.5 py-2 text-xs sm:text-sm text-gray-800 shadow-2xs transition focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
                        disabled={isSubmitting}
                      >
                        {presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
                      </select>
                    </div>

                    {/* Due Date */}
                    <div>
                      <label htmlFor="edit-dueDate" className="block text-xs font-semibold text-gray-700 mb-1">
                        Due Date
                      </label>
                      <input
                        id="edit-dueDate"
                        type="date"
                        value={editFormData.dueDate}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, dueDate: e.target.value })
                        }
                        className="w-full min-h-[40px] rounded-xl border border-purple-200 bg-white px-2.5 py-1.5 text-xs sm:text-sm text-gray-800 shadow-2xs transition focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {/* Subtasks Framed Section */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-purple-50/60 border border-purple-100/90 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                        <ListChecks className="w-4 h-4 text-purple-700" />
                        Subtasks (Checklist)
                      </label>
                      {editFormData.subtasks.length > 0 && (
                        <span className="text-[11px] font-semibold text-purple-700 bg-white/90 px-2 py-0.5 rounded-full border border-purple-200/80">
                          {editFormData.subtasks.filter((s) => s.isCompleted).length}/{editFormData.subtasks.length} Completed
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editSubtaskInputText}
                        onChange={(e) => setEditSubtaskInputText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddEditSubtask();
                          }
                        }}
                        placeholder="Type subtask title and press Enter..."
                        className="flex-1 min-h-[38px] rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs sm:text-sm text-gray-800 placeholder:text-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={handleAddEditSubtask}
                        disabled={isSubmitting || !editSubtaskInputText.trim()}
                        className="min-h-[38px] px-3 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 disabled:opacity-50 rounded-xl transition inline-flex items-center gap-1 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    </div>

                    {editFormData.subtasks.length > 0 && (
                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {editFormData.subtasks.map((st, index) => (
                          <div
                            key={st.id}
                            className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/90 border border-purple-100 hover:border-purple-200 transition group shadow-2xs"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <button
                                type="button"
                                role="checkbox"
                                aria-checked={st.isCompleted}
                                onClick={() => handleToggleEditSubtask(st.id)}
                                className={`h-4 w-4 rounded border transition flex items-center justify-center shrink-0 ${
                                  st.isCompleted
                                    ? 'bg-gradient-to-br from-pink-400 to-purple-500 border-transparent text-white'
                                    : 'bg-white border-purple-300 text-transparent hover:border-purple-400'
                                }`}
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <input
                                type="text"
                                value={st.title}
                                onChange={(e) => handleUpdateEditSubtaskTitle(st.id, e.target.value)}
                                className={`flex-1 min-w-0 bg-transparent text-xs sm:text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-purple-400 rounded px-2 py-1 transition ${
                                  st.isCompleted ? 'line-through text-gray-400' : 'text-gray-800 font-medium'
                                }`}
                                placeholder="Subtask title..."
                              />
                            </div>

                            <div className="flex items-center gap-0.5 shrink-0 opacity-70 group-hover:opacity-100 transition">
                              <button
                                type="button"
                                onClick={() => handleMoveEditSubtaskUp(index)}
                                disabled={index === 0}
                                className="p-1 rounded text-gray-400 hover:text-purple-700 hover:bg-purple-100/70 disabled:opacity-25 disabled:hover:bg-transparent transition"
                                title="Move up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveEditSubtaskDown(index)}
                                disabled={index === editFormData.subtasks.length - 1}
                                className="p-1 rounded text-gray-400 hover:text-purple-700 hover:bg-purple-100/70 disabled:opacity-25 disabled:hover:bg-transparent transition"
                                title="Move down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveEditSubtask(st.id)}
                                className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition ml-0.5"
                                title="Remove subtask"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 p-4 sm:p-5 bg-purple-50/50 border-t border-purple-100/80">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isSubmitting}
                    className="flex-1 min-h-[42px] bg-white hover:bg-gray-50 text-gray-700 border border-purple-200/80 disabled:opacity-50 text-sm font-semibold py-2 px-4 rounded-xl transition shadow-2xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 min-h-[42px] bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-400 text-white text-sm font-semibold py-2 px-4 rounded-xl transition shadow-md"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
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

        {/* Categories Modal */}
        <CategoriesModal
          isOpen={isCategoriesModalOpen}
          onClose={() => setIsCategoriesModalOpen(false)}
          onCategoriesUpdated={loadCategories}
        />
        <ManageTaskPresetsModal
          isOpen={isManagePresetsOpen}
          presets={presets}
          activePresetId={activePresetId}
          onClose={() => setIsManagePresetsOpen(false)}
          onActivate={handleActivatePreset}
          onCreate={handleCreatePreset}
          onUpdate={handleUpdatePreset}
          onDelete={handleDeletePreset}
        />
      </div>
    </div>
  );
}

// Task Item Component
interface TaskItemProps {
  task: Task;
  categories: Category[];
  onToggleCompletion: (taskId: string, currentStatus: boolean) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onDelete: (taskId: string) => void;
  onEdit: (task: Task) => void;
}

function TaskItem({ task, categories, onToggleCompletion, onToggleSubtask, onDelete, onEdit }: TaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const matchedCategory = findCategoryByTaskValue(categories, task.category);
  const categoryName = matchedCategory?.name || task.category || DEFAULT_TASK_CATEGORY_NAME;
  const categoryColor = isValidHexColor(matchedCategory?.color || '')
    ? (matchedCategory?.color as string)
    : DEFAULT_TASK_CATEGORY_COLOR;
  const categoryTextColor = getReadableCategoryTextColor(categoryColor);

  const subtasks = task.subtasks || [];
  const totalSubtasks = subtasks.length;
  const completedSubtasks = subtasks.filter((s) => s.isCompleted).length;
  const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return (
    <div
      className={`group glass-card ${
        task.isCompleted ? 'opacity-80' : ''
      } transition-[box-shadow,transform,opacity] duration-200 sm:hover:shadow-2xl`}
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

        <div className="flex-1 min-w-0 flex flex-col gap-0.5 sm:gap-1">
          {/* Line 1: Title & Action Buttons */}
          <div className="flex items-center justify-between gap-2">
            <span
              className={`font-medium text-sm sm:text-base md:text-lg break-words flex-1 min-w-0 leading-tight ${
                task.isCompleted
                  ? 'line-through text-gray-500'
                  : 'text-gray-900'
              }`}
            >
              {task.title}
            </span>

            {/* Line 1 Action Buttons */}
            <div className="flex-shrink-0 flex flex-row items-center gap-1 sm:gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit(task)}
                className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-transparent hover:bg-white/80 text-gray-500 hover:text-blue-600 transition-all flex items-center justify-center"
                title="Edit task"
                aria-label={`Edit ${task.title}`}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
              <button
                onClick={() => onDelete(task.id)}
                className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-transparent hover:bg-white/80 text-gray-500 hover:text-red-600 transition-all flex items-center justify-center"
                title="Delete task"
                aria-label={`Delete ${task.title}`}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>

          {task.description && (
            <p 
              className={`text-xs sm:text-sm text-gray-500 break-words max-w-full leading-snug ${task.isCompleted ? 'opacity-60' : ''}`}
              title={task.description}
            >
              {task.description}
            </p>
          )}

          <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-2.5 mt-0.5 text-[11px] sm:text-sm text-purple-900/60">
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

            {task.dueDate && (
              <span className="inline-flex items-center gap-1 text-[9px] sm:text-xs font-medium px-2 py-0.5 rounded-md bg-purple-50/90 text-purple-700 border border-purple-200/70">
                <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600" />
                <span className="sm:whitespace-nowrap">{formatDueDateDisplay(task.dueDate)}</span>
              </span>
            )}

            {totalSubtasks > 0 && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50/90 text-purple-700 border border-purple-200/70 hover:bg-purple-100/80 transition cursor-pointer shadow-2xs"
              >
                <ListChecks className="w-3.5 h-3.5 text-purple-600" />
                <span>
                  Subtasks {completedSubtasks}/{totalSubtasks}
                </span>
                <div className="w-12 sm:w-16 h-1.5 bg-purple-200/80 rounded-full overflow-hidden ml-1">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-purple-600 ml-0.5">{progressPercent}%</span>
                <ChevronDown className={`w-3.5 h-3.5 text-purple-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>

          {/* Expandable Subtask Checklist Box - Full Width */}
          {totalSubtasks > 0 && isExpanded && (
            <div className="mt-3 p-3.5 sm:p-4 rounded-2xl bg-purple-100/70 border border-purple-200/90 shadow-sm space-y-2.5 w-full">
              <div className="flex items-center justify-between text-xs font-semibold text-purple-900/80 px-1 pb-1.5 border-b border-purple-200/70">
                <span className="flex items-center gap-1.5 font-bold text-purple-900">
                  <ListChecks className="w-4 h-4 text-purple-700" />
                  Subtasks Progress
                </span>
                <span className="font-semibold text-purple-800 bg-white/80 border border-purple-200 px-2 py-0.5 rounded-full text-[11px]">
                  {completedSubtasks}/{totalSubtasks} ({progressPercent}%)
                </span>
              </div>
              <div className="space-y-1.5 pt-0.5">
                {subtasks.map((st) => (
                  <div
                    key={st.id}
                    onClick={() => onToggleSubtask?.(task.id, st.id)}
                    className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-white/90 hover:bg-white border border-purple-100/70 transition cursor-pointer shadow-2xs group/st"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={st.isCompleted}
                        className={`h-4 w-4 rounded border transition duration-150 flex items-center justify-center shrink-0 ${
                          st.isCompleted
                            ? 'bg-gradient-to-br from-pink-400 to-purple-500 border-transparent text-white shadow-xs'
                            : 'bg-white border-purple-300 text-transparent group-hover/st:border-purple-400'
                        }`}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <span className={`text-xs sm:text-sm break-words flex-1 min-w-0 ${st.isCompleted ? 'line-through text-gray-400' : 'text-gray-800 font-medium'}`}>
                        {st.title}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
