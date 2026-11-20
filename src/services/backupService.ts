import { Category, DailyHabit, HabitSet, Task, TaskPreset, UserProfile, getHabitSetIds } from '@/types';
import { createTask, getUserTasks, updateTask } from '@/services/taskService';
import { createDailyHabit, getUserDailyHabits, updateDailyHabit } from '@/services/habitService';
import { createHabitSet, getUserHabitSets } from '@/services/habitSetService';
import { createCategory, getUserCategories } from '@/services/categoryService';
import { createTaskPreset, getUserTaskPresets } from '@/services/taskPresetService';
import { clearAllUserData } from '@/services/accountService';
import { getStoredFontId } from '@/utils/fontUtils';
import { GradientMode, getStoredGradientMode } from '@/utils/gradientUtils';
import { SoundTheme, getStoredSoundTheme, getStoredSoundVolume } from '@/utils/audio';

export type BackupImportMode = 'replace' | 'merge';

export interface ImportBackupResult {
  tasksAddedCount: number;
  tasksUpdatedCount: number;
  habitsAddedCount: number;
  habitsMergedCount: number;
  importedFont?: string;
  importedGradient?: GradientMode;
  importedSoundTheme?: SoundTheme;
  importedSoundVolume?: number;
}

export const exportUserBackupFile = async (
  user: { uid: string; email?: string | null; displayName?: string | null },
  userProfile?: UserProfile | null
): Promise<void> => {
  const [userTasks, userHabits, userCategories, userSets, userTaskPresets] = await Promise.all([
    getUserTasks(user.uid),
    getUserDailyHabits(user.uid),
    getUserCategories(user.uid),
    getUserHabitSets(user.uid),
    getUserTaskPresets(user.uid),
  ]);

  const selectedFont = userProfile?.selectedFont || getStoredFontId();
  const gradientMode = userProfile?.gradientMode || getStoredGradientMode();
  const soundTheme = userProfile?.soundTheme || getStoredSoundTheme();
  const soundVolume =
    typeof userProfile?.soundVolume === 'number'
      ? userProfile.soundVolume
      : getStoredSoundVolume();

  const backupObj = {
    exportDate: new Date().toISOString(),
    appName: 'Task & Habit Tracker',
    version: '2.0',
    user: {
      uid: user.uid,
      email: user.email,
      displayName: userProfile?.displayName || user.displayName,
      selectedFont,
      gradientMode,
      soundTheme,
      soundVolume,
    },
    data: {
      tasks: userTasks,
      habits: userHabits,
      categories: userCategories,
      habitSets: userSets,
      taskPresets: userTaskPresets,
      settings: {
        selectedFont,
        gradientMode,
        soundTheme,
        soundVolume,
      },
    },
  };

  const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

export const importUserBackupFile = async (
  userId: string,
  file: File,
  importMode: BackupImportMode
): Promise<ImportBackupResult> => {
  const text = await file.text();
  const backupObj = JSON.parse(text);

  if (!backupObj.data || !backupObj.appName) {
    throw new Error('Invalid backup file format');
  }

  if (backupObj.appName !== 'Task & Habit Tracker') {
    throw new Error('This backup file is not compatible with this app');
  }

  if (importMode === 'replace') {
    await clearAllUserData(userId);
  }

  const { tasks, habits, categories, habitSets, taskPresets } = backupObj.data;

  let existingCategories: Category[] = [];
  let existingHabitSets: HabitSet[] = [];
  let existingTaskPresets: TaskPreset[] = [];
  let existingTasks: Task[] = [];
  let existingHabits: DailyHabit[] = [];

  if (importMode === 'merge') {
    [existingCategories, existingHabitSets, existingTaskPresets, existingTasks, existingHabits] =
      await Promise.all([
        getUserCategories(userId),
        getUserHabitSets(userId),
        getUserTaskPresets(userId),
        getUserTasks(userId),
        getUserDailyHabits(userId),
      ]);
  }

  const categoryMapping = new Map<string, string>();
  const habitSetMapping = new Map<string, string>();
  const taskPresetMapping = new Map<string, string>();

  // 1. Categories
  if (Array.isArray(categories) && categories.length > 0) {
    for (const category of categories) {
      try {
        if (importMode === 'merge') {
          const matchedCategory = existingCategories.find(
            (c) => c.name.trim().toLowerCase() === (category.name || '').trim().toLowerCase()
          );
          if (matchedCategory) {
            categoryMapping.set(category.id, matchedCategory.id);
            continue;
          }
        }

        const newCategory = await createCategory(userId, {
          name: category.name,
          color: category.color,
        });
        categoryMapping.set(category.id, newCategory.id);
        if (importMode === 'merge') existingCategories.push(newCategory);
      } catch (err) {
        console.warn('Failed to import category:', category.name, err);
      }
    }
  }

  // 2. Habit sets
  if (Array.isArray(habitSets) && habitSets.length > 0) {
    for (const set of habitSets) {
      try {
        if (importMode === 'merge') {
          const matchedSet = existingHabitSets.find(
            (s) => s.name.trim().toLowerCase() === (set.name || '').trim().toLowerCase()
          );
          if (matchedSet) {
            habitSetMapping.set(set.id, matchedSet.id);
            continue;
          }
        }

        const shouldBeActive =
          importMode === 'replace' ? Boolean(set.isActive) : existingHabitSets.length === 0;

        const newSet = await createHabitSet(userId, {
          name: set.name,
          color: set.color,
          isActive: shouldBeActive,
        });
        habitSetMapping.set(set.id, newSet.id);
        if (importMode === 'merge') existingHabitSets.push(newSet);
      } catch (err) {
        console.warn('Failed to import habit set:', set.name, err);
      }
    }
  }

  // 3. Task presets
  if (Array.isArray(taskPresets) && taskPresets.length > 0) {
    for (const preset of taskPresets) {
      try {
        if (importMode === 'merge') {
          const matchedPreset = existingTaskPresets.find(
            (p) => p.name.trim().toLowerCase() === (preset.name || '').trim().toLowerCase()
          );
          if (matchedPreset) {
            taskPresetMapping.set(preset.id, matchedPreset.id);
            continue;
          }
        }

        const shouldBeActive =
          importMode === 'replace' ? Boolean(preset.isActive) : existingTaskPresets.length === 0;

        const newPreset = await createTaskPreset(userId, preset.name, preset.color, shouldBeActive);
        taskPresetMapping.set(preset.id, newPreset.id);
        if (importMode === 'merge') existingTaskPresets.push(newPreset);
      } catch (err) {
        console.warn('Failed to import task preset:', preset.name, err);
      }
    }
  }

  let tasksAddedCount = 0;
  let tasksUpdatedCount = 0;

  // 4. Tasks
  if (Array.isArray(tasks) && tasks.length > 0) {
    for (const task of tasks) {
      try {
        const mappedCategoryId = categoryMapping.get(task.category) || task.category;
        const mappedPresetId = taskPresetMapping.get(task.setId) || task.setId;
        const normalizedTitle = (task.title || '').trim().toLowerCase();

        if (importMode === 'merge') {
          const existingTask = existingTasks.find(
            (t) =>
              t.title.trim().toLowerCase() === normalizedTitle &&
              (t.setId || '') === (mappedPresetId || '')
          );

          if (existingTask) {
            const updatesToApply: Record<string, any> = {};

            if (task.isCompleted && !existingTask.isCompleted) updatesToApply.isCompleted = true;
            if (task.isStarred && !existingTask.isStarred) updatesToApply.isStarred = true;
            if (task.description && !existingTask.description) {
              updatesToApply.description = task.description;
            }
            if (task.dueDate && !existingTask.dueDate) {
              updatesToApply.dueDate = new Date(task.dueDate);
            }
            if (task.linkChip?.url && !existingTask.linkChip) {
              updatesToApply.linkChip = {
                url: task.linkChip.url,
                label: task.linkChip.label || undefined,
                icon: task.linkChip.icon || 'link',
              };
            }

            if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
              const currentSubtasks = [...(existingTask.subtasks || [])];
              let subtaskModified = false;
              for (const st of task.subtasks) {
                if (!st || !st.title) continue;
                const stMatch = currentSubtasks.find(
                  (cst) => cst.title.trim().toLowerCase() === st.title.trim().toLowerCase()
                );
                if (stMatch) {
                  if (st.isCompleted && !stMatch.isCompleted) {
                    stMatch.isCompleted = true;
                    subtaskModified = true;
                  }
                  if (st.dueDate && !stMatch.dueDate) {
                    stMatch.dueDate = st.dueDate;
                    subtaskModified = true;
                  }
                } else {
                  currentSubtasks.push({
                    id:
                      st.id ||
                      'subtask_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                    title: st.title,
                    isCompleted: Boolean(st.isCompleted),
                    ...(st.dueDate ? { dueDate: st.dueDate } : {}),
                  });
                  subtaskModified = true;
                }
              }
              if (subtaskModified) updatesToApply.subtasks = currentSubtasks;
            }

            if (Object.keys(updatesToApply).length > 0) {
              await updateTask(existingTask.id, updatesToApply);
              tasksUpdatedCount++;
            }
            continue;
          }
        }

        const taskDataToCreate: any = {
          title: task.title || '',
          description: task.description || '',
          category: mappedCategoryId,
          dueDate: task.dueDate ? new Date(task.dueDate) : null,
          isCompleted: Boolean(task.isCompleted),
          isStarred: Boolean(task.isStarred),
          subtasks: task.subtasks || [],
          setId: mappedPresetId || undefined,
        };

        if (task.linkChip?.url) {
          taskDataToCreate.linkChip = {
            url: task.linkChip.url,
            label: task.linkChip.label || undefined,
            icon: task.linkChip.icon || 'link',
          };
        }

        const createdTaskId = await createTask(userId, taskDataToCreate);
        tasksAddedCount++;
        if (importMode === 'merge') {
          existingTasks.push({
            ...taskDataToCreate,
            id: createdTaskId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      } catch (err) {
        console.warn('Failed to import task:', task.title, err);
      }
    }
  }

  let habitsAddedCount = 0;
  let habitsMergedCount = 0;

  // 5. Habits
  if (Array.isArray(habits) && habits.length > 0) {
    for (const habit of habits) {
      try {
        const mappedSetId = habit.setId ? habitSetMapping.get(habit.setId) || habit.setId : undefined;
        const mappedSetIds = Array.isArray(habit.setIds)
          ? habit.setIds.map((id: string) => habitSetMapping.get(id) || id)
          : mappedSetId
          ? [mappedSetId]
          : [];

        const normalizedHabitTitle = (habit.title || '').trim().toLowerCase();

        if (importMode === 'merge') {
          const existingHabit = existingHabits.find((h) => {
            const sameTitle = h.title.trim().toLowerCase() === normalizedHabitTitle;
            const hSets = getHabitSetIds(h);
            const hasSetOverlap =
              mappedSetIds.length === 0 ||
              hSets.length === 0 ||
              mappedSetIds.some((sId: string) => hSets.includes(sId));
            return sameTitle && hasSetOverlap;
          });

          if (existingHabit) {
            const mergedCompletedDates = Array.from(
              new Set([...(existingHabit.completedDates || []), ...(habit.completedDates || [])])
            );

            const mergedDailyProgress: Record<string, number> = {
              ...(existingHabit.dailyProgress || {}),
            };
            if (habit.dailyProgress && typeof habit.dailyProgress === 'object') {
              Object.entries(habit.dailyProgress).forEach(([date, val]) => {
                const existingVal = mergedDailyProgress[date] || 0;
                mergedDailyProgress[date] = Math.max(existingVal, Number(val) || 0);
              });
            }

            const mergedNotScheduledDates = Array.from(
              new Set([
                ...(existingHabit.notScheduledDates || []),
                ...(habit.notScheduledDates || []),
              ])
            );

            const mergedSetIds = Array.from(
              new Set([...getHabitSetIds(existingHabit), ...mappedSetIds])
            );

            await updateDailyHabit(existingHabit.id, {
              completedDates: mergedCompletedDates,
              dailyProgress: mergedDailyProgress,
              notScheduledDates: mergedNotScheduledDates,
              setIds: mergedSetIds,
              setId: mergedSetIds[0] || existingHabit.setId,
            });

            habitsMergedCount++;
            continue;
          }
        }

        await createDailyHabit(userId, {
          title: habit.title,
          completedDates: habit.completedDates || [],
          scheduledDays: habit.scheduledDays || [0, 1, 2, 3, 4, 5, 6],
          startTime: habit.startTime || '09:00',
          endTime: habit.endTime || '10:00',
          customSchedule: habit.customSchedule,
          color: habit.color,
          setId: mappedSetId,
          setIds: mappedSetIds,
          order: typeof habit.order === 'number' ? habit.order : undefined,
          targetValue: habit.targetValue,
          targetUnit: habit.targetUnit,
          dailyProgress: habit.dailyProgress,
          notScheduledDates: Array.isArray(habit.notScheduledDates) ? habit.notScheduledDates : [],
          trackingStartDate: habit.trackingStartDate ? new Date(habit.trackingStartDate) : undefined,
        });
        habitsAddedCount++;
      } catch (err) {
        console.warn('Failed to import habit:', habit.title, err);
      }
    }
  }

  const importedFont = backupObj.data?.settings?.selectedFont || backupObj.user?.selectedFont;
  const importedGradient = backupObj.data?.settings?.gradientMode || backupObj.user?.gradientMode;
  const importedSoundTheme = backupObj.data?.settings?.soundTheme || backupObj.user?.soundTheme;
  const rawImportedVolume = backupObj.data?.settings?.soundVolume ?? backupObj.user?.soundVolume;
  const importedSoundVolume = typeof rawImportedVolume === 'number' ? rawImportedVolume : undefined;

  return {
    tasksAddedCount,
    tasksUpdatedCount,
    habitsAddedCount,
    habitsMergedCount,
    importedFont,
    importedGradient,
    importedSoundTheme,
    importedSoundVolume,
  };
};
