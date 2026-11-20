import { useState, useEffect, useCallback, useMemo, useRef, useDeferredValue } from 'react';
import { CalendarDays, CheckCircle2, ChevronDown, FolderTree, Layers, ListTodo, Settings2, Plus, RotateCcw, Search, Sparkles, ClipboardList } from 'lucide-react';
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
import { ensureDefaultCategories, getUserCategories } from '@/services/categoryService';
import {
  createTaskPreset,
  deleteTaskPreset,
  getUserTaskPresets,
  setActiveTaskPreset,
  updateTaskPreset,
} from '@/services/taskPresetService';
import TasksTable from '@/components/tasks/TasksTable';
import { TaskItem } from '@/components/tasks/TaskItem';
import { TasksFilterBar } from '@/components/tasks/TasksFilterBar';
import { TaskCalendarModal } from '@/components/tasks/calendar/TaskCalendarModal';
import { CategoriesModal } from '@/components/modals/CategoriesModal';
import { ManageTaskPresetsModal } from '@/components/modals/ManageTaskPresetsModal';
import { TaskFormModal, TaskFormSubmitData } from '@/components/modals/TaskFormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showToast } from '@/components/ui/Toast';
import { playSuccessSound } from '@/utils/audio';
import { buildCategoryMap, getCategoryErrorMessage } from '@/utils/categoryUtils';
import {
  sortIncompleteTasks,
  sortCompletedTasks,
  QuickFilter,
  filterTask,
} from '@/utils/taskUtils';

const PENDING_LIST_BATCH_SIZE = 30;
const COMPLETED_LIST_BATCH_SIZE = 20;

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

  const categoryMap = useMemo(() => buildCategoryMap(categories), [categories]);

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
        <ConfirmDialog
          isOpen={Boolean(deletingTaskId)}
          title="Delete Task?"
          description="Are you sure you want to delete this task? This action cannot be undone."
          confirmLabel="Delete"
          tone="danger"
          onCancel={handleCancelDelete}
          onConfirm={handleConfirmDelete}
        />

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
