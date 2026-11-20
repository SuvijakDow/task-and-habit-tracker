import React, { useState, useEffect, useCallback, useMemo, useRef, useDeferredValue } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, CheckCircle2, ChevronDown, Copy, FolderTree, Layers, ListTodo, Settings2, ListChecks, MoreVertical, Pencil, Plus, RotateCcw, Search, Star, Trash2, Sparkles, ClipboardList } from 'lucide-react';
import { FirebaseError } from 'firebase/app';
import { Category, Task, TaskPreset } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useDataRefresh } from '@/context/DataRefreshContext';
import {
  createTask,
  getUserTasks,
  updateTask,
  deleteTask,
  duplicateTask,
  toggleTaskStar,
} from '@/services/taskService';
import { ensureDefaultCategories } from '@/services/categoryService';
import TasksTable from '@/components/tasks/TasksTable';
import { TasksFilterBar } from '@/components/tasks/TasksFilterBar';
import { CategoriesModal } from '@/components/modals/CategoriesModal';
import {
  getUserCategories,
} from '@/services/categoryService';
import { showToast } from '@/components/ui/Toast';
import { playSuccessSound } from '@/utils/audio';
import {
  sortIncompleteTasks,
  sortCompletedTasks,
  QuickFilter,
  filterTask,
  getEarliestIncompleteSubtask,
  getEffectiveTaskDueDate,
  sortSubtasksByDueDate,
} from '@/utils/taskUtils';
import { formatDueDateDisplay, getDeadlineStatus } from '@/utils/dateUtils';
import {
  createTaskPreset,
  deleteTaskPreset,
  getUserTaskPresets,
  setActiveTaskPreset,
  updateTaskPreset,
} from '@/services/taskPresetService';
import { ManageTaskPresetsModal } from '@/components/modals/ManageTaskPresetsModal';
import { TaskCalendarModal } from '@/components/modals/TaskCalendarModal';
import { TaskFormModal, TaskFormSubmitData } from '@/components/modals/TaskFormModal';
import { TaskSmartChip } from '@/components/tasks/TaskSmartChip';
import { SubtaskDateControl, NextSubtaskBadge } from '@/components/tasks/SubtaskDateControl';

const DEFAULT_TASK_CATEGORY_NAME = 'Personal';
const DEFAULT_TASK_CATEGORY_COLOR = '#C4B5FD';
const COLOR_HEX_REGEX = /^#[0-9A-F]{6}$/i;
const PENDING_LIST_BATCH_SIZE = 30;
const COMPLETED_LIST_BATCH_SIZE = 20;

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
  const { user, loading: authLoading } = useAuth();
  const { registerRefreshTasks, registerRefreshTaskPresets, registerRefreshCategories } = useDataRefresh();
  const [tasks, setTasks] = useState<Task[]>([]);
  const tasksRef = useRef(tasks);
  const [categories, setCategories] = useState<Category[]>([]);
  const [presets, setPresets] = useState<TaskPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState('');
  const [isPresetDropdownOpen, setIsPresetDropdownOpen] = useState(false);
  const [isManagePresetsOpen, setIsManagePresetsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // View mode: 'list' or 'table'
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list');
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');

  // Progressive list rendering state (keeps 100-1000+ tasks snappy)
  const [visiblePendingCount, setVisiblePendingCount] = useState(PENDING_LIST_BATCH_SIZE);
  const [visibleCompletedCount, setVisibleCompletedCount] = useState(COMPLETED_LIST_BATCH_SIZE);
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(true);

  // Isolated Add / Edit modal open triggers (form typing state lives inside TaskFormModal)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalInitialDueDate, setAddModalInitialDueDate] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Delete confirmation & toggling state
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);

  // Update tasksRef whenever tasks changes
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // Reset progressive list counts when switching period or filters
  useEffect(() => {
    setVisiblePendingCount(PENDING_LIST_BATCH_SIZE);
    setVisibleCompletedCount(COMPLETED_LIST_BATCH_SIZE);
  }, [activePresetId, searchQuery, categoryFilter, quickFilter]);

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

  // Register refresh function with DataRefreshContext
  useEffect(() => {
    registerRefreshTasks(() => {
      loadTasks();
    });
  }, [registerRefreshTasks]);

  // Register preset refresh function with DataRefreshContext
  useEffect(() => {
    registerRefreshTaskPresets(() => {
      loadPresets();
    });
  }, [registerRefreshTaskPresets]);

  // Register categories refresh function with DataRefreshContext
  useEffect(() => {
    registerRefreshCategories(() => {
      loadCategories();
    });
  }, [registerRefreshCategories]);

  useEffect(() => {
    if (!isPresetDropdownOpen) return;
    const closeDropdown = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('.routine-dropdown-container')) setIsPresetDropdownOpen(false);
    };
    document.addEventListener('click', closeDropdown);
    return () => document.removeEventListener('click', closeDropdown);
  }, [isPresetDropdownOpen]);

  const loadTasks = useCallback(async () => {
    if (!user) return;
    try {
      setLoadError(null);
      const userTasks = await getUserTasks(user.uid);
      setTasks(userTasks);
    } catch (err) {
      const message = 'Could not load tasks. Refresh and try again.';
      setLoadError(message);
      console.error('Error loading tasks:', err);
    }
  }, [user]);

  const loadCategories = async () => {
    if (!user) return;

    try {
      // Ensure default categories exist before loading (uses lock to prevent duplicates)
      await ensureDefaultCategories(user.uid);

      const userCategories = await getUserCategories(user.uid);
      setCategories(userCategories);
    } catch (err) {
      showToast(getCategoryErrorMessage(err), 'error');
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
      }
    } catch (err) {
      console.error('Error loading task presets:', err);
      showToast('Could not load task presets. Check Firestore permissions.', 'error');
    }
  };

  const retryLoadData = async () => {
    await Promise.all([loadTasks(), loadCategories(), loadPresets()]);
  };

  const handleOpenAddModal = useCallback((dueDateStr = '') => {
    setAddModalInitialDueDate(dueDateStr);
    setIsAddModalOpen(true);
  }, []);

  const handleCloseAddModal = useCallback(() => {
    setIsAddModalOpen(false);
  }, []);

  const handleCreateTaskSubmit = useCallback(async (data: TaskFormSubmitData) => {
    if (!user) return;

    const createdTaskId = await createTask(user.uid, {
      title: data.title,
      description: data.description,
      category: data.category,
      dueDate: data.dueDate,
      isCompleted: false,
      setId: data.setId,
      subtasks: data.subtasks,
      linkChip: data.linkChip,
    });

    const now = new Date();
    const newTask: Task = {
      id: createdTaskId,
      userId: user.uid,
      title: data.title,
      description: data.description,
      category: data.category,
      dueDate: data.dueDate,
      isCompleted: false,
      isStarred: false,
      setId: data.setId,
      subtasks: data.subtasks,
      linkChip: data.linkChip,
      createdAt: now,
      updatedAt: now,
    };

    // Update local state immediately without triggering a full collection re-fetch
    setTasks((prev) => [newTask, ...prev]);
    setIsAddModalOpen(false);
  }, [user]);

  const handleToggleCompletion = useCallback(async (taskId: string, currentStatus: boolean) => {
    const task = tasksRef.current.find((t) => t.id === taskId);
    if (!task) return;

    const newStatus = !currentStatus;
    if (newStatus) {
      playSuccessSound();
    }

    const previousSubtasks = task.subtasks;
    const updatedSubtasks =
      task.subtasks && task.subtasks.length > 0
        ? task.subtasks.map((st) => ({ ...st, isCompleted: newStatus }))
        : task.subtasks;

    const updatesToSave: Partial<Task> = { isCompleted: newStatus };
    if (updatedSubtasks && updatedSubtasks.length > 0) {
      updatesToSave.subtasks = updatedSubtasks;
    }

    // Instant optimistic UI update (zero blocking spinner, zero memo invalidation)
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              isCompleted: newStatus,
              subtasks: updatedSubtasks,
            }
          : t
      )
    );

    try {
      await updateTask(taskId, updatesToSave);
    } catch (err) {
      // Revert smoothly on error
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                isCompleted: currentStatus,
                subtasks: previousSubtasks,
              }
            : t
        )
      );
      showToast('Task update failed. Please try again.', 'error');
      console.error('Error updating task:', err);
    }
  }, []);

  const handleToggleStar = useCallback(async (taskId: string, currentStarred: boolean) => {
    const newStarred = !currentStarred;

    // Optimistic state update
    setTasks((prevTasks) =>
      prevTasks.map((t) => (t.id === taskId ? { ...t, isStarred: newStarred } : t))
    );

    try {
      await toggleTaskStar(taskId, newStarred);
    } catch (err) {
      showToast('Failed to update star status. Please try again.', 'error');
      console.error('Error toggling task star:', err);
      await loadTasks();
    }
  }, [loadTasks]);

  const handleToggleTaskSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    // Read the current state from ref to avoid stale closure
    const currentTask = tasksRef.current.find((t) => t.id === taskId);
    if (!currentTask) return;

    const wasAlreadyComplete = currentTask.isCompleted;
    const currentSubtasks = currentTask.subtasks || [];
    const updatedSubtasks = currentSubtasks.map((st) =>
      st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st
    );
    
    // When all subtasks are checked: mark task as complete
    // When any subtask is unchecked: mark task as incomplete
    const isTaskNowComplete = updatedSubtasks.length > 0 && updatedSubtasks.every((st) => st.isCompleted);

    // Optimistic update
    setTasks((prevTasks) =>
      prevTasks.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            subtasks: updatedSubtasks,
            isCompleted: isTaskNowComplete,
          };
        }
        return t;
      })
    );

    try {
      await updateTask(taskId, {
        subtasks: updatedSubtasks,
        isCompleted: isTaskNowComplete,
      });
      
      // Only show toast after successful save
      if (isTaskNowComplete && !wasAlreadyComplete) {
        playSuccessSound();
        showToast('All subtasks completed! Task marked as done 🎉', 'success');
      }
    } catch (err) {
      console.error('Error toggling subtask:', err);
      showToast('Subtask update failed. Please try again.', 'error');
      // Reload tasks to revert optimistic update
      await loadTasks();
    }
  }, []);

  const handleUpdateTaskSubtaskDueDate = useCallback(async (taskId: string, subtaskId: string, dueDate: string | null) => {
    const currentTask = tasksRef.current.find((t) => t.id === taskId);
    if (!currentTask) return;

    const currentSubtasks = currentTask.subtasks || [];
    const updatedSubtasks = currentSubtasks.map((st) =>
      st.id === subtaskId ? { ...st, dueDate: dueDate || null } : st
    );

    // Optimistic update
    setTasks((prevTasks) =>
      prevTasks.map((t) => (t.id === taskId ? { ...t, subtasks: updatedSubtasks } : t))
    );

    try {
      await updateTask(taskId, {
        subtasks: updatedSubtasks,
      });
    } catch (err) {
      console.error('Error updating subtask due date:', err);
      showToast('Failed to update subtask due date.', 'error');
      await loadTasks();
    }
  }, []);

  const handleBulkSetCompletion = useCallback(async (taskIds: string[], isCompleted: boolean) => {
    if (taskIds.length === 0) return;

    if (isCompleted) {
      playSuccessSound();
    }

    try {
      const idSet = new Set(taskIds);
      const currentTasks = tasksRef.current;

      // Prepare updates for each task - update subtasks to match the task completion status
      const updatePromises = taskIds.map((taskId) => {
        const task = currentTasks.find((t) => t.id === taskId);
        if (!task) return updateTask(taskId, { isCompleted });

        if (task.subtasks && task.subtasks.length > 0) {
          const updatedSubtasks = task.subtasks.map((st) => ({ ...st, isCompleted }));
          return updateTask(taskId, { isCompleted, subtasks: updatedSubtasks });
        }

        return updateTask(taskId, { isCompleted });
      });

      await Promise.all(updatePromises);

      setTasks((prev) =>
        prev.map((task) => {
          if (idSet.has(task.id)) {
            const updatedSubtasks =
              task.subtasks && task.subtasks.length > 0
                ? task.subtasks.map((st) => ({ ...st, isCompleted }))
                : task.subtasks;

            return {
              ...task,
              isCompleted,
              subtasks: updatedSubtasks,
            };
          }
          return task;
        })
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
  }, [loadTasks]);

  const handleBulkDelete = useCallback(async (taskIds: string[]) => {
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
  }, [loadTasks]);

  const handleDuplicateTask = useCallback(async (task: Task) => {
    if (!user) return;
    try {
      setTogglingTaskId(task.id);
      await duplicateTask(user.uid, task);
      await loadTasks();
      showToast(`Duplicated "${task.title}" successfully.`, 'success');
    } catch (err) {
      showToast('Could not duplicate task. Please try again.', 'error');
      console.error('Error duplicating task:', err);
    } finally {
      setTogglingTaskId(null);
    }
  }, [user, loadTasks]);

  const handleBulkDuplicate = useCallback(async (taskIds: string[]) => {
    if (!user || taskIds.length === 0) return;
    try {
      const idSet = new Set(taskIds);
      const tasksToDuplicate = tasksRef.current.filter((t) => idSet.has(t.id));
      await Promise.all(tasksToDuplicate.map((task) => duplicateTask(user.uid, task)));
      await loadTasks();
      showToast(`Duplicated ${tasksToDuplicate.length} task(s).`, 'success');
    } catch (err) {
      showToast('Bulk duplicate failed. Please try again.', 'error');
      console.error('Error bulk duplicating tasks:', err);
      await loadTasks();
    }
  }, [user, loadTasks]);

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setEditingTask(null);
  }, []);

  const handleSaveEditSubmit = useCallback(async (data: TaskFormSubmitData) => {
    if (!editingTask) return;
    const taskId = editingTask.id;
    const currentTask = tasksRef.current.find((t) => t.id === taskId) || editingTask;
    const isCompleted = currentTask.isCompleted ?? false;

    const updates: any = {
      title: data.title,
      description: data.description,
      category: data.category,
      dueDate: data.dueDate,
      setId: data.setId,
      isCompleted,
      linkChip: data.linkChip || null,
    };

    if (data.subtasks.length > 0 || (currentTask.subtasks && currentTask.subtasks.length > 0)) {
      updates.subtasks = data.subtasks;
    }

    await updateTask(taskId, updates);

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              title: data.title,
              description: data.description,
              category: data.category,
              dueDate: data.dueDate,
              setId: data.setId,
              subtasks: updates.subtasks !== undefined ? data.subtasks : t.subtasks,
              isCompleted,
              linkChip: data.linkChip,
            }
          : t
      )
    );

    setEditingTask(null);
  }, [editingTask]);

  const handleDeleteTask = useCallback((taskId: string) => {
    setDeletingTaskId(taskId);
  }, []);

  const handleConfirmDelete = async () => {
    if (!deletingTaskId) return;

    try {
      await deleteTask(deletingTaskId);
      setTasks((prev) => prev.filter((t) => t.id !== deletingTaskId));
      setDeletingTaskId(null);
    } catch (err) {
      showToast('Could not delete this task. Please try again.', 'error');
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
    handleClearFilters();
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

  const deferredSearchQuery = useDeferredValue(searchQuery);

  const filteredVisibleTasks = useMemo(() => {
    return visibleTasks.filter((task) =>
      filterTask(task, deferredSearchQuery, categoryFilter, quickFilter, categories)
    );
  }, [visibleTasks, deferredSearchQuery, categoryFilter, quickFilter, categories]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) || categoryFilter !== 'all' || quickFilter !== 'all';

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setCategoryFilter('all');
    setQuickFilter('all');
  }, []);

  const periodIncompleteCount = useMemo(
    () => visibleTasks.filter((t) => !t.isCompleted).length,
    [visibleTasks]
  );
  const periodCompletedCount = useMemo(
    () => visibleTasks.filter((t) => t.isCompleted).length,
    [visibleTasks]
  );

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    for (const category of categories) {
      map.set(category.id, category);
      map.set(category.name, category);
    }
    return map;
  }, [categories]);

  const incompleteTasks = useMemo(
    () =>
      filteredVisibleTasks
        .filter((t) => !t.isCompleted)
        .sort(sortIncompleteTasks),
    [filteredVisibleTasks]
  );
  const completedTasks = useMemo(
    () =>
      filteredVisibleTasks
        .filter((t) => t.isCompleted)
        .sort(sortCompletedTasks),
    [filteredVisibleTasks]
  );

  const visibleIncompleteTasks = useMemo(
    () => incompleteTasks.slice(0, visiblePendingCount),
    [incompleteTasks, visiblePendingCount]
  );
  const visibleCompletedTasks = useMemo(
    () => completedTasks.slice(0, visibleCompletedCount),
    [completedTasks, visibleCompletedCount]
  );

  const handleAddTaskForDate = useCallback(
    (dateStr: string) => {
      handleOpenAddModal(dateStr);
    },
    [handleOpenAddModal]
  );

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto px-3 sm:px-6 pt-3.5 sm:pt-4 md:pt-2 pb-6 md:pb-12">
        {/* Hero Dashboard Overview Banner */}
        <div className="hero-banner-compact glass-card p-4 sm:p-6 mb-5 sm:mb-6 bg-gradient-to-br from-[#3b0764] via-[#581c87] to-[#701a75] text-white rounded-3xl border border-pink-400/30 shadow-xl shadow-fuchsia-950/40 relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-12 -top-12 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 sm:gap-4">
            {/* Top Row / Desktop Left: Title */}
            <div className="flex flex-col sm:flex-row sm:items-center xl:flex-col xl:items-start justify-between gap-3 xl:gap-1">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 border border-white/25 backdrop-blur-md shadow-2xs">
                    <CheckCircle2 className="w-5 h-5 text-amber-300" />
                  </div>
                  <h1 className="hero-banner-title text-xl sm:text-2xl font-black text-white tracking-tight">
                    Task Hub
                  </h1>
                </div>
              </div>

              {/* Mobile & iPad/Tablet Action Buttons (Hidden on full desktop xl) */}
              <div className="grid grid-cols-3 sm:flex sm:items-center xl:hidden gap-1.5 sm:gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setIsCalendarModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3.5 py-2 sm:py-2.5 bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl backdrop-blur-md transition-all text-[11px] sm:text-sm font-semibold whitespace-nowrap shadow-2xs min-w-0"
                  title="Deadline Calendar"
                >
                  <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-200 shrink-0" />
                  <span className="truncate">Calendar</span>
                </button>

                <button
                  onClick={() => setIsCategoriesModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3.5 py-2 sm:py-2.5 bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl backdrop-blur-md transition-all text-[11px] sm:text-sm font-semibold whitespace-nowrap shadow-2xs min-w-0"
                  title="Manage Categories"
                >
                  <FolderTree className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-200 shrink-0" />
                  <span className="truncate">Categories</span>
                </button>

                <button
                  onClick={() => handleOpenAddModal()}
                  className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl shadow-[0_8px_20px_rgba(244,63,94,0.3)] hover:shadow-[0_12px_28px_rgba(244,63,94,0.4)] hover:-translate-y-0.5 transition-all text-[11px] sm:text-sm font-bold whitespace-nowrap min-w-0"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-5 sm:h-5 stroke-[2.5] shrink-0" />
                  <span className="truncate">Add Task</span>
                </button>
              </div>
            </div>

            {/* Desktop Center: Stats Badges (Full width on mobile/tablet, expanded box on desktop) */}
            <div className="hero-banner-stats grid grid-cols-3 gap-1.5 sm:gap-2 xl:gap-4 bg-white/10 backdrop-blur-md p-2 sm:p-2.5 xl:p-3 rounded-2xl border border-white/15 text-center w-full xl:flex-1 xl:max-w-lg xl:mx-3 shrink-0">
              <div className="px-1 sm:px-2 py-0.5 min-w-0">
                <div className="text-[10px] xl:text-xs text-purple-200 uppercase font-bold tracking-wider whitespace-nowrap">Pending</div>
                <div className="hero-banner-stats-val text-base sm:text-lg font-black text-amber-300">{periodIncompleteCount}</div>
              </div>
              <div className="px-1 sm:px-2 py-0.5 border-x border-white/15 min-w-0">
                <div className="text-[10px] xl:text-xs text-purple-200 uppercase font-bold tracking-wider whitespace-nowrap">Completed</div>
                <div className="text-base sm:text-lg font-black text-emerald-300">{periodCompletedCount}</div>
              </div>
              <div className="px-1 sm:px-2 py-0.5 min-w-0">
                <div className="text-[10px] xl:text-xs text-purple-200 uppercase font-bold tracking-wider whitespace-nowrap">Progress</div>
                <div className="text-base sm:text-lg font-black text-pink-300">
                  {visibleTasks.length > 0 ? Math.round((periodCompletedCount / visibleTasks.length) * 100) : 0}%
                </div>
              </div>
            </div>

            {/* Desktop Right: Action Buttons (Only visible on full desktop xl) */}
            <div className="hidden xl:flex xl:items-center gap-2 shrink-0">
              <button
                onClick={() => setIsCalendarModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl backdrop-blur-md transition-all text-sm font-semibold whitespace-nowrap shadow-2xs"
                title="View Deadline Calendar"
              >
                <CalendarDays className="w-4 h-4 text-pink-200" />
                <span>Calendar</span>
              </button>

              <button
                onClick={() => setIsCategoriesModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl backdrop-blur-md transition-all text-sm font-semibold whitespace-nowrap shadow-2xs"
                title="Manage Categories"
              >
                <FolderTree className="w-4 h-4 text-purple-200" />
                <span>Categories</span>
              </button>

              <button
                onClick={() => handleOpenAddModal()}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl shadow-[0_8px_20px_rgba(244,63,94,0.3)] hover:shadow-[0_12px_28px_rgba(244,63,94,0.4)] hover:-translate-y-0.5 transition-all text-sm font-bold whitespace-nowrap"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
                <span>Add Task</span>
              </button>
            </div>
          </div>
        </div>

        {/* Unified Control Bar: Period Selector & View Toggle */}
        <div className="relative z-10 mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 sm:gap-3 rounded-2xl border border-purple-100/90 bg-white/80 p-1.5 shadow-xs backdrop-blur-md sm:p-2">
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

          {/* Period Selector & Manage Button */}
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
                  <span className="hidden font-normal text-gray-500 sm:inline">Period:</span>
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: activePreset?.color || '#C084FC' }} />
                    <span className="truncate font-bold text-gray-900">{activePreset?.name || ''}</span>
                  </div>
                </div>
                <ChevronDown className={`ml-2 h-4 w-4 flex-shrink-0 text-purple-500 transition-transform duration-200 ${isPresetDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isPresetDropdownOpen && (
                <div className="modal-enter absolute left-0 top-full z-[100] mt-1.5 w-64 rounded-xl border-2 border-purple-300 bg-white py-1.5 shadow-[0_16px_36px_rgba(120,87,255,0.35)]">
                  <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">Switch Period</div>
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
              <span className="hidden sm:inline">Manage Periods</span><span className="sm:hidden">Manage</span>
            </button>
          </div>
        </div>

        {/* Tasks Sections */}
        {loading ? (
          <div className="space-y-4">
            <div className="h-14 rounded-2xl skeleton-shimmer border border-purple-100/80" />
            <div className="space-y-3">
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} className="glass-card p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-lg skeleton-shimmer shrink-0" />
                    <div className="h-5 w-2/3 sm:w-1/2 rounded-lg skeleton-shimmer" />
                  </div>
                  <div className="flex items-center gap-2 pl-9">
                    <div className="h-5 w-16 rounded-md skeleton-shimmer" />
                    <div className="h-5 w-24 rounded-md skeleton-shimmer" />
                    <div className="h-5 w-20 rounded-md skeleton-shimmer" />
                  </div>
                </div>
              ))}
            </div>
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
          <div className="glass-card p-6 sm:p-10 md:p-12 text-center rounded-3xl border border-purple-100 bg-white/95 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-pink-500 text-white flex items-center justify-center mx-auto mb-3.5 shadow-md shadow-purple-500/25">
              <ClipboardList className="w-7 h-7 stroke-[2.2] text-white drop-shadow-xs" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-gray-900 mb-1.5 tracking-tight">No tasks yet</h2>
            <p className="text-xs sm:text-sm text-gray-600 mb-5 font-medium max-w-sm mx-auto">Add your first task to start planning your week.</p>
            <button
              type="button"
              onClick={() => handleOpenAddModal()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add first task</span>
            </button>
          </div>
        ) : (
          <>
            {viewMode === 'table' ? (
              <div className="mb-6">
                <TasksTable
                  tasks={visibleTasks}
                  categories={categories}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  categoryFilter={categoryFilter}
                  onCategoryFilterChange={setCategoryFilter}
                  quickFilter={quickFilter}
                  onQuickFilterChange={setQuickFilter}
                  onToggleCompletion={handleToggleCompletion}
                  onToggleStar={handleToggleStar}
                  onToggleSubtask={handleToggleTaskSubtask}
                  onUpdateSubtaskDueDate={handleUpdateTaskSubtaskDueDate}
                  onEdit={handleEditTask}
                  onDuplicate={handleDuplicateTask}
                  onDelete={handleDeleteTask}
                  onBulkSetCompletion={handleBulkSetCompletion}
                  onBulkDuplicate={handleBulkDuplicate}
                  onBulkDelete={handleBulkDelete}
                  togglingTaskId={togglingTaskId}
                />
              </div>
            ) : (
              <>
                {/* Search & Filter Bar */}
                <div className="mb-4 sm:mb-6">
                  <TasksFilterBar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    categoryFilter={categoryFilter}
                    onCategoryFilterChange={setCategoryFilter}
                    quickFilter={quickFilter}
                    onQuickFilterChange={setQuickFilter}
                    categories={categories}
                    totalCount={visibleTasks.length}
                    filteredCount={filteredVisibleTasks.length}
                    onClearFilters={handleClearFilters}
                  />
                </div>

                {filteredVisibleTasks.length === 0 && hasActiveFilters ? (
                  <div className="glass-card p-6 sm:p-10 text-center rounded-2xl border border-purple-100 bg-white/80 shadow-2xs mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto mb-3">
                      <Search className="w-6 h-6" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">No tasks match your filters</h3>
                    <p className="text-xs sm:text-sm text-gray-500 mb-4">
                      Try adjusting your search terms or clearing the selected filters.
                    </p>
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset filters</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Incomplete Tasks Section */}
                    <div className="mb-8 sm:mb-10">
                      <div className="flex items-center justify-between mb-3.5 px-1">
                        <h2 className="text-base sm:text-lg md:text-xl font-bold text-pink-950 flex items-center gap-2">
                          <ListTodo className="w-5 h-5 text-pink-600 animate-pulse" />
                          <span>Pending Tasks</span>
                          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-pink-100/90 text-pink-800 border border-pink-200/90 shadow-2xs">
                            {incompleteTasks.length}
                          </span>
                        </h2>
                      </div>
                      {incompleteTasks.length === 0 ? (
                        hasActiveFilters ? (
                          <div className="glass-card p-6 sm:p-8 text-center rounded-2xl border border-purple-200/80 bg-purple-50/20 shadow-2xs">
                            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
                              <Search className="w-6 h-6" />
                            </div>
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">No pending tasks match your filters</h3>
                            <p className="text-xs sm:text-sm text-gray-600 font-medium mb-3">There are no incomplete tasks matching the current filters.</p>
                            <button
                              type="button"
                              onClick={handleClearFilters}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 text-xs font-semibold shadow-2xs transition"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Clear filters</span>
                            </button>
                          </div>
                        ) : (
                          <div className="glass-card p-6 sm:p-8 text-center rounded-2xl border border-emerald-200/80 bg-emerald-50/20 shadow-2xs">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-green-500 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-emerald-500/20">
                              <Sparkles className="w-6 h-6 animate-bounce text-white drop-shadow-xs" />
                            </div>
                            <h3 className="text-base sm:text-lg font-extrabold text-emerald-950 mb-1">All caught up! 🎉</h3>
                            <p className="text-xs sm:text-sm text-emerald-700/90 font-medium">No pending tasks. Great job, everything is complete.</p>
                          </div>
                        )
                      ) : (
                        <>
                          <div className="space-y-3 sm:space-y-4 list-stagger">
                            {visibleIncompleteTasks.map((task) => (
                              <TaskItem
                                key={task.id}
                                task={task}
                                matchedCategory={categoryMap.get(task.category)}
                                onToggleCompletion={handleToggleCompletion}
                                onToggleStar={handleToggleStar}
                                onToggleSubtask={handleToggleTaskSubtask}
                                onUpdateSubtaskDueDate={handleUpdateTaskSubtaskDueDate}
                                onEdit={handleEditTask}
                                onDuplicate={handleDuplicateTask}
                                onDelete={handleDeleteTask}
                                isToggling={togglingTaskId === task.id}
                              />
                            ))}
                          </div>
                          {incompleteTasks.length > PENDING_LIST_BATCH_SIZE && (
                            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                              {visiblePendingCount < incompleteTasks.length ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setVisiblePendingCount((prev) => prev + PENDING_LIST_BATCH_SIZE)
                                    }
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-pink-50 text-pink-800 border border-pink-200/90 text-xs sm:text-sm font-bold shadow-2xs transition"
                                  >
                                    <span>
                                      Show {Math.min(PENDING_LIST_BATCH_SIZE, incompleteTasks.length - visiblePendingCount)} more
                                    </span>
                                    <span className="text-pink-500 font-semibold">
                                      ({incompleteTasks.length - visiblePendingCount} left)
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setVisiblePendingCount(incompleteTasks.length)}
                                    className="inline-flex items-center px-3.5 py-2 rounded-xl bg-pink-50/80 hover:bg-pink-100 text-pink-700 border border-pink-200/80 text-xs sm:text-sm font-semibold transition"
                                  >
                                    Show all ({incompleteTasks.length})
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setVisiblePendingCount(PENDING_LIST_BATCH_SIZE)}
                                  className="inline-flex items-center px-3.5 py-1.5 rounded-xl bg-white/90 hover:bg-pink-50 text-pink-700 border border-pink-200/80 text-xs font-semibold shadow-2xs transition"
                                >
                                  Show less
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Completed Tasks Section */}
                    {completedTasks.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3.5 px-1 gap-2">
                          <button
                            type="button"
                            onClick={() => setIsCompletedExpanded((prev) => !prev)}
                            className="text-base sm:text-lg md:text-xl font-bold text-purple-950 flex items-center gap-2 group text-left"
                            aria-expanded={isCompletedExpanded}
                          >
                            <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0" />
                            <span>Completed Tasks</span>
                            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-purple-100/90 text-purple-800 border border-purple-200/90 shadow-2xs">
                              {completedTasks.length}
                            </span>
                            <ChevronDown
                              className={`w-4 h-4 text-purple-500 transition-transform duration-200 ${
                                isCompletedExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </button>

                          {isCompletedExpanded && completedTasks.length > COMPLETED_LIST_BATCH_SIZE && (
                            <span className="text-[11px] sm:text-xs font-semibold text-purple-700/75 whitespace-nowrap">
                              Showing {Math.min(visibleCompletedCount, completedTasks.length)} of {completedTasks.length}
                            </span>
                          )}
                        </div>

                        {isCompletedExpanded && (
                          <>
                            <div className="space-y-3 sm:space-y-4 list-stagger">
                              {visibleCompletedTasks.map((task) => (
                                <TaskItem
                                  key={task.id}
                                  task={task}
                                  matchedCategory={categoryMap.get(task.category)}
                                  onToggleCompletion={handleToggleCompletion}
                                  onToggleStar={handleToggleStar}
                                  onToggleSubtask={handleToggleTaskSubtask}
                                  onUpdateSubtaskDueDate={handleUpdateTaskSubtaskDueDate}
                                  onEdit={handleEditTask}
                                  onDuplicate={handleDuplicateTask}
                                  onDelete={handleDeleteTask}
                                  isToggling={togglingTaskId === task.id}
                                />
                              ))}
                            </div>

                            {completedTasks.length > COMPLETED_LIST_BATCH_SIZE && (
                              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                                {visibleCompletedCount < completedTasks.length ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setVisibleCompletedCount((prev) => prev + COMPLETED_LIST_BATCH_SIZE)
                                      }
                                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-purple-50 text-purple-800 border border-purple-200/90 text-xs sm:text-sm font-bold shadow-2xs transition"
                                    >
                                      <span>
                                        Show {Math.min(COMPLETED_LIST_BATCH_SIZE, completedTasks.length - visibleCompletedCount)} more
                                      </span>
                                      <span className="text-purple-500 font-semibold">
                                        ({completedTasks.length - visibleCompletedCount} left)
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setVisibleCompletedCount(completedTasks.length)}
                                      className="inline-flex items-center px-3.5 py-2 rounded-xl bg-purple-50/90 hover:bg-purple-100 text-purple-700 border border-purple-200/80 text-xs sm:text-sm font-semibold transition"
                                    >
                                      Show all ({completedTasks.length})
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setVisibleCompletedCount(COMPLETED_LIST_BATCH_SIZE)}
                                    className="inline-flex items-center px-3.5 py-1.5 rounded-xl bg-white/90 hover:bg-purple-50 text-purple-700 border border-purple-200/80 text-xs font-semibold shadow-2xs transition"
                                  >
                                    Show less
                                  </button>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
        {/* Isolated Add & Edit Task Form Modals (prevents keystroke re-renders across the task list) */}
        <TaskFormModal
          isOpen={isAddModalOpen}
          mode="add"
          initialDueDate={addModalInitialDueDate}
          categories={categories}
          presets={presets}
          activePresetId={activePresetId}
          onClose={handleCloseAddModal}
          onSubmit={handleCreateTaskSubmit}
        />
        <TaskFormModal
          isOpen={Boolean(editingTask)}
          mode="edit"
          initialTask={editingTask}
          categories={categories}
          presets={presets}
          activePresetId={activePresetId}
          onClose={handleCloseEditModal}
          onSubmit={handleSaveEditSubmit}
        />

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
        <TaskCalendarModal
          isOpen={isCalendarModalOpen}
          onClose={() => setIsCalendarModalOpen(false)}
          visibleTasks={visibleTasks}
          allTasks={tasks}
          categories={categories}
          activePresetName={activePreset?.name}
          hasMultiplePresets={presets.length > 1}
          onToggleTaskCompletion={handleToggleCompletion}
          onToggleSubtask={handleToggleTaskSubtask}
          onEditTask={handleEditTask}
          onAddTaskForDate={handleAddTaskForDate}
          togglingTaskId={togglingTaskId}
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
  matchedCategory?: Category;
  onToggleCompletion: (taskId: string, currentStatus: boolean) => void;
  onToggleStar?: (taskId: string, currentStarred: boolean) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onUpdateSubtaskDueDate?: (taskId: string, subtaskId: string, dueDate: string | null) => void;
  onDelete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onDuplicate: (task: Task) => void;
  isToggling: boolean;
}

const TaskItem = React.memo(function TaskItem({ task, matchedCategory, onToggleCompletion, onToggleStar, onToggleSubtask, onUpdateSubtaskDueDate, onDelete, onEdit, onDuplicate, isToggling }: TaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  const categoryName = matchedCategory?.name || task.category || DEFAULT_TASK_CATEGORY_NAME;
  const categoryColor = isValidHexColor(matchedCategory?.color || '')
    ? (matchedCategory?.color as string)
    : DEFAULT_TASK_CATEGORY_COLOR;
  const categoryTextColor = getReadableCategoryTextColor(categoryColor);

  const subtasks = task.subtasks || [];
  const sortedSubtasks = useMemo(() => sortSubtasksByDueDate(subtasks), [subtasks]);
  const earliestIncompleteSubtask = useMemo(() => getEarliestIncompleteSubtask(task), [task]);
  const totalSubtasks = subtasks.length;
  const completedSubtasks = subtasks.filter((s) => s.isCompleted).length;
  const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const effectiveDueDate = getEffectiveTaskDueDate(task);
  const effectiveDeadlineStatus = getDeadlineStatus(effectiveDueDate);
  const deadlineType = !task.isCompleted && effectiveDeadlineStatus ? effectiveDeadlineStatus.type : 'normal';

  let borderStyleClass = 'border border-white/70 bg-white/90 hover:border-purple-200';
  if (deadlineType === 'overdue') {
    borderStyleClass = 'border-2 border-rose-500/90 bg-white/95 shadow-[0_4px_20px_rgba(244,63,94,0.12)]';
  } else if (deadlineType === 'today') {
    borderStyleClass = 'border-2 border-amber-400/95 bg-white/95 shadow-[0_4px_20px_rgba(245,158,11,0.12)]';
  }

  return (
    <div
      className={`group glass-card ${!isMobileMenuOpen ? 'perf-list-item' : ''} ${borderStyleClass} ${task.isCompleted ? 'opacity-80' : ''
        } transition-[box-shadow,transform,opacity,border-color] duration-150 sm:hover:shadow-xl relative py-3 sm:py-4 px-3 sm:px-6 flex flex-col gap-2`}
    >
      {isToggling && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-purple-50/70 to-pink-50/70 backdrop-blur-[3px] rounded-lg sm:rounded-xl flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 border-4 border-purple-200 rounded-full" />
              <div className="absolute top-0 left-0 w-8 h-8 border-4 border-transparent border-t-purple-500 border-r-pink-500 rounded-full animate-spin" />
            </div>
            <span className="text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Updating...</span>
          </div>
        </div>
      )}

      {/* Row 1: Checkbox + Title & Description & Action Buttons */}
      <div className="flex items-center gap-2.5 sm:gap-3 w-full">
        {/* Checkbox column (vertically centered with Title + Description) */}
        <div className="w-6 sm:w-7 flex items-center justify-center shrink-0">
          <button
            type="button"
            role="checkbox"
            aria-checked={task.isCompleted}
            aria-label={`Mark ${task.title} as ${task.isCompleted ? 'incomplete' : 'completed'}`}
            onClick={() => onToggleCompletion(task.id, task.isCompleted)}
            disabled={isToggling}
            className={`h-5 w-5 sm:h-6 sm:w-6 aspect-square rounded-lg border-2 transition-all duration-200 flex items-center justify-center shrink-0 shadow-2xs ${task.isCompleted
                ? 'bg-gradient-to-br from-pink-400 to-purple-500 border-transparent text-white shadow-[0_6px_16px_rgba(184,109,214,0.45)]'
                : 'bg-purple-50/90 border-purple-400/90 text-transparent hover:border-purple-600 hover:bg-purple-100/90'
              } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isToggling ? (
              <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        </div>

        {/* Title + Description block */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`font-medium text-sm sm:text-base md:text-lg break-words leading-tight ${task.isCompleted
                  ? 'line-through text-gray-500'
                  : 'text-gray-900'
                }`}
            >
              {task.title}
            </span>

            {/* Desktop Action Buttons */}
            <div className="hidden sm:flex flex-shrink-0 flex-row items-center gap-1 sm:gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
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
                onClick={() => onDuplicate(task)}
                className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-transparent hover:bg-white/80 text-gray-500 hover:text-purple-600 transition-all flex items-center justify-center"
                title="Duplicate task"
                aria-label={`Duplicate ${task.title}`}
              >
                <Copy className="w-3.5 h-3.5" />
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

            {/* Mobile 3-Dots Action Menu */}
            <div className="relative sm:hidden flex-shrink-0" ref={mobileMenuRef}>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                className="h-7 w-7 rounded-full hover:bg-purple-100/70 text-gray-400 hover:text-purple-600 transition-all flex items-center justify-center"
                title="More actions"
                aria-label="More actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isMobileMenuOpen && (
                <div className="absolute right-0 top-8 z-30 w-36 rounded-xl bg-white/95 backdrop-blur-md border border-purple-100 shadow-xl py-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onEdit(task);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 text-gray-700 hover:bg-purple-50 hover:text-purple-700 font-semibold transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5 text-blue-500" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onDuplicate(task);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 text-gray-700 hover:bg-purple-50 hover:text-purple-700 font-semibold transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-purple-500" />
                    <span>Duplicate</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onDelete(task.id);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 text-rose-600 hover:bg-rose-50 font-semibold transition-colors border-t border-gray-100"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Description (if exists) */}
          {task.description && (
            <p
              className={`text-xs sm:text-sm text-gray-500 break-words max-w-full leading-snug ${task.isCompleted ? 'opacity-60' : ''}`}
              title={task.description}
            >
              {task.description}
            </p>
          )}
        </div>
      </div>

      {/* Row 2: Star Button + Category & Due Date Badges */}
      <div className="flex items-center gap-2.5 sm:gap-3 w-full">
        {/* Star column (aligns horizontally with Checkbox above and vertically with Badges) */}
        <div className="w-6 sm:w-7 flex items-center justify-center shrink-0">
          {onToggleStar && (
            <button
              type="button"
              onClick={() => onToggleStar(task.id, Boolean(task.isStarred))}
              className={`h-5 w-5 sm:h-6 sm:w-6 rounded-full transition-all flex items-center justify-center shrink-0 shadow-2xs ${
                task.isStarred
                  ? 'bg-amber-100/90 border border-amber-300'
                  : 'bg-amber-50/80 hover:bg-amber-100 border border-amber-200/90'
              }`}
              title={task.isStarred ? 'Unstar task' : 'Star task'}
              aria-label={task.isStarred ? `Unstar ${task.title}` : `Star ${task.title}`}
            >
              <Star
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-150 ${
                  task.isStarred
                    ? 'fill-amber-400 text-amber-500 drop-shadow-[0_2px_6px_rgba(245,158,11,0.45)] scale-105'
                    : 'text-amber-500/80 hover:text-amber-600'
                }`}
              />
            </button>
          )}
        </div>

        {/* Badges container */}
        <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-2.5 flex-1 min-w-0">
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

          {(() => {
            const deadlineStatus = getDeadlineStatus(task.dueDate);
            return deadlineStatus ? (
              <span className={`inline-flex items-center text-[9px] sm:text-xs font-semibold px-2 py-0.5 rounded-md border ${deadlineStatus.className}`}>
                {deadlineStatus.text}
              </span>
            ) : null;
          })()}

          {/* Link Smart Chip (if exists) */}
          {task.linkChip && task.linkChip.url && (
            <TaskSmartChip chip={task.linkChip} />
          )}

          {totalSubtasks > 0 && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-semibold bg-purple-50/90 text-purple-700 border border-purple-200/70 hover:bg-purple-100/80 transition cursor-pointer shadow-2xs"
            >
              <ListChecks className="w-3.5 h-3.5 text-purple-600" />
              <span>
                Subtasks {completedSubtasks}/{totalSubtasks}
              </span>
              <div className="w-10 sm:w-16 h-1.5 bg-purple-200/80 rounded-full overflow-hidden ml-0.5">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-purple-600 ml-0.5">{progressPercent}%</span>
              <ChevronDown className={`w-3.5 h-3.5 text-purple-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          )}

          {!task.isCompleted && earliestIncompleteSubtask && earliestIncompleteSubtask.dueDate && (
            <NextSubtaskBadge
              subtask={earliestIncompleteSubtask}
              onClick={() => setIsExpanded(!isExpanded)}
            />
          )}
        </div>
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
                {sortedSubtasks.map((st) => {
                  const isNextUp = !task.isCompleted && !st.isCompleted && earliestIncompleteSubtask?.id === st.id && Boolean(st.dueDate);
                  return (
                    <div
                      key={st.id}
                      onClick={() => onToggleSubtask?.(task.id, st.id)}
                      className={`flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/90 hover:bg-white border transition cursor-pointer shadow-2xs group/st ${
                        isNextUp ? 'border-purple-300/90 ring-1 ring-purple-200/60' : 'border-purple-100/70'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={st.isCompleted}
                          className={`h-4 w-4 rounded-md border-2 transition duration-150 flex items-center justify-center shrink-0 shadow-2xs ${st.isCompleted
                              ? 'bg-gradient-to-br from-pink-400 to-purple-500 border-transparent text-white shadow-xs'
                              : 'bg-purple-50/90 border-purple-400/90 text-transparent group-hover/st:border-purple-600'
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

                      <SubtaskDateControl
                        variant="checklist"
                        dueDate={st.dueDate}
                        isCompleted={st.isCompleted}
                        onChange={(newDate) => onUpdateSubtaskDueDate?.(task.id, st.id, newDate)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
    </div>
  );
});
