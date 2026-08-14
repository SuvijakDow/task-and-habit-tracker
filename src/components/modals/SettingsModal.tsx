import React, { useState, useRef, memo } from 'react';
import {
  AlertTriangle,
  Settings,
  Trash2,
  X,
  Upload,
  ImagePlus,
  Type,
  Check,
  User,
  Database,
  Download,
  RotateCcw,
  ShieldAlert,
  Palette,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDataRefresh } from '@/context/DataRefreshContext';
import {
  updateUserProfile,
  uploadProfilePhoto,
  DEFAULT_AVATARS,
  normalizeProfilePhotoURL,
} from '@/services/userService';
import { deleteUserData, resetUserTasks, resetUserDailyHabits, resetUserTaskPresets, resetUserHabitSets, clearAllUserData } from '@/services/accountService';
import { deleteAuthenticatedUser, reauthenticateCurrentUser } from '@/services/authService';
import { APP_FONTS, applyAppFont, getStoredFontId, preloadAllAppFonts } from '@/utils/fontUtils';
import { GradientMode, applyGradientMode, getStoredGradientMode } from '@/utils/gradientUtils';
import { getUserTasks, createTask } from '@/services/taskService';
import { getUserDailyHabits, getUserHabitSets, createDailyHabit, createHabitSet } from '@/services/habitService';
import { getUserCategories, createCategory } from '@/services/categoryService';
import { createTaskPreset, getUserTaskPresets } from '@/services/taskPresetService';
import { showToast } from '@/components/ui/Toast';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal = memo(function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const { refreshTasks, refreshHabits, refreshTaskPresets, refreshHabitSets, refreshCategories, refreshAnalytics } = useDataRefresh();

  const [activeTab, setActiveTab] = useState<'profile' | 'data'>('profile');
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [selectedAvatar, setSelectedAvatar] = useState(userProfile?.photoURL || '');
  const [selectedFont, setSelectedFont] = useState(userProfile?.selectedFont || getStoredFontId());
  const [selectedGradientMode, setSelectedGradientMode] = useState<GradientMode>(
    userProfile?.gradientMode || getStoredGradientMode()
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Modals inside Settings
  const [isResetTasksOpen, setIsResetTasksOpen] = useState(false);
  const [isResetHabitsOpen, setIsResetHabitsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Build the avatar options: 12 cute defaults + Google photo if available
  const googlePhotoURL = user?.photoURL || null;
  const normalizedGooglePhotoURL = normalizeProfilePhotoURL(googlePhotoURL);
  const normalizedSelectedAvatar = normalizeProfilePhotoURL(selectedAvatar);
  const avatarOptions = [
    ...DEFAULT_AVATARS,
    ...(googlePhotoURL && !DEFAULT_AVATARS.includes(googlePhotoURL)
      ? [googlePhotoURL]
      : []),
  ];

  const isCustomUpload = selectedAvatar
    && !DEFAULT_AVATARS.includes(selectedAvatar)
    && normalizedSelectedAvatar !== normalizedGooglePhotoURL;

  const busy = isSaving || isUploading || isDeletingAccount || isExporting || isImporting || isResetting;

  const handleFontSelect = (fontId: string) => {
    setSelectedFont(fontId);
    applyAppFont(fontId);
  };

  const handleGradientModeSelect = (mode: GradientMode) => {
    setSelectedGradientMode(mode);
    applyGradientMode(mode);
  };

  const handleClose = () => {
    if (busy) return;
    const initialFont = userProfile?.selectedFont || getStoredFontId();
    applyAppFont(initialFont);
    const initialGradientMode = userProfile?.gradientMode || getStoredGradientMode();
    applyGradientMode(initialGradientMode);
    onClose();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setIsUploading(true);
      setError(null);

      const downloadURL = await uploadProfilePhoto(user.uid, file);
      setSelectedAvatar(downloadURL);
    } catch (err: any) {
      const msg = err.message || 'Failed to upload photo';
      setError(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (!displayName.trim()) {
      setError('Display name cannot be empty');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(false);

      await updateUserProfile(user.uid, {
        displayName: displayName.trim(),
        photoURL: normalizeProfilePhotoURL(selectedAvatar),
        selectedFont,
        gradientMode: selectedGradientMode,
      });

      applyAppFont(selectedFont);
      applyGradientMode(selectedGradientMode);
      await refreshUserProfile();
      setSuccess(true);

      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 800);
    } catch (err) {
      setError('Failed to save profile. Please try again.');
      console.error('Error saving profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportBackup = async () => {
    setIsExportDialogOpen(true);
  };

  const confirmExportBackup = async () => {
    if (!user) return;
    try {
      setIsExporting(true);
      setError(null);
      setIsExportDialogOpen(false);

      const [userTasks, userHabits, userCategories, userSets, userTaskPresets] = await Promise.all([
        getUserTasks(user.uid),
        getUserDailyHabits(user.uid),
        getUserCategories(user.uid),
        getUserHabitSets(user.uid),
        getUserTaskPresets(user.uid),
      ]);

      const backupObj = {
        exportDate: new Date().toISOString(),
        appName: 'Task & Habit Tracker',
        user: {
          uid: user.uid,
          email: user.email,
          displayName: userProfile?.displayName || user.displayName,
        },
        data: {
          tasks: userTasks,
          habits: userHabits,
          categories: userCategories,
          habitSets: userSets,
          taskPresets: userTaskPresets,
        },
      };

      const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('Exported JSON backup file successfully!', 'success');
    } catch (err) {
      console.error('Error exporting backup:', err);
      showToast('Failed to export backup file.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetTasks = async () => {
    if (!user) return;
    try {
      setIsResetting(true);
      await resetUserTasks(user.uid);
      await resetUserTaskPresets(user.uid);
      setIsResetTasksOpen(false);
      refreshTasks();
      refreshTaskPresets();
      refreshAnalytics();
      showToast('Reset all tasks and presets.', 'success');
    } catch (err) {
      console.error('Error resetting tasks:', err);
      showToast('Failed to reset tasks', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetHabits = async () => {
    if (!user) return;
    try {
      setIsResetting(true);
      await resetUserDailyHabits(user.uid);
      await resetUserHabitSets(user.uid);
      setIsResetHabitsOpen(false);
      refreshHabits();
      refreshHabitSets();
      refreshAnalytics();
      showToast('Reset all habits and routine presets.', 'success');
    } catch (err) {
      console.error('Error resetting habits:', err);
      showToast('Failed to reset habits', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const processImportFile = async (file: File) => {
    if (!user) return;

    try {
      setIsImporting(true);
      setError(null);

      const text = await file.text();
      const backupObj = JSON.parse(text);

      // Validate backup structure
      if (!backupObj.data || !backupObj.appName) {
        throw new Error('Invalid backup file format');
      }

      if (backupObj.appName !== 'Task & Habit Tracker') {
        throw new Error('This backup file is not compatible with this app');
      }

      // Clear all existing user data if in replace mode
      if (importMode === 'replace') {
        await clearAllUserData(user.uid);
      }

      const { tasks, habits, categories, habitSets, taskPresets } = backupObj.data;

      // Create ID mappings to preserve relationships
      const categoryMapping = new Map<string, string>();
      const habitSetMapping = new Map<string, string>();
      const taskPresetMapping = new Map<string, string>();

      // Import categories first and create mapping
      if (Array.isArray(categories) && categories.length > 0) {
        for (const category of categories) {
          try {
            const newCategory = await createCategory(user.uid, {
              name: category.name,
              color: category.color,
            });
            categoryMapping.set(category.id, newCategory.id);
          } catch (err) {
            console.warn('Failed to import category:', category.name, err);
          }
        }
      }

      // Import habit sets and create mapping
      if (Array.isArray(habitSets) && habitSets.length > 0) {
        for (const set of habitSets) {
          try {
            const newSet = await createHabitSet(user.uid, {
              name: set.name,
              color: set.color,
              isActive: importMode === 'replace' ? set.isActive : false, // In merge mode, default to inactive
            });
            habitSetMapping.set(set.id, newSet.id);
          } catch (err) {
            console.warn('Failed to import habit set:', set.name, err);
          }
        }
      }

      // Import task presets and create mapping
      if (Array.isArray(taskPresets) && taskPresets.length > 0) {
        for (const preset of taskPresets) {
          try {
            const newPreset = await createTaskPreset(user.uid, preset.name, preset.color);
            taskPresetMapping.set(preset.id, newPreset.id);
          } catch (err) {
            console.warn('Failed to import task preset:', preset.name, err);
          }
        }
      }

      // Import tasks with mapped IDs
      if (Array.isArray(tasks) && tasks.length > 0) {
        for (const task of tasks) {
          try {
            // Map category ID if it exists in mapping
            const mappedCategoryId = categoryMapping.get(task.category) || task.category;
            // Map preset ID if it exists in mapping
            const mappedPresetId = taskPresetMapping.get(task.setId) || task.setId;

            await createTask(user.uid, {
              title: task.title,
              description: task.description,
              category: mappedCategoryId,
              dueDate: task.dueDate ? new Date(task.dueDate) : null,
              isCompleted: task.isCompleted,
              subtasks: task.subtasks,
              setId: mappedPresetId,
            });
          } catch (err) {
            console.warn('Failed to import task:', task.title, err);
          }
        }
      }

      // Import habits with mapped IDs
      if (Array.isArray(habits) && habits.length > 0) {
        for (const habit of habits) {
          try {
            // Map habit set IDs
            const mappedSetId = habit.setId ? (habitSetMapping.get(habit.setId) || habit.setId) : undefined;
            const mappedSetIds = Array.isArray(habit.setIds)
              ? habit.setIds.map((id: string) => habitSetMapping.get(id) || id)
              : (mappedSetId ? [mappedSetId] : []);

            await createDailyHabit(user.uid, {
              title: habit.title,
              completedDates: habit.completedDates || [],
              scheduledDays: habit.scheduledDays || [0, 1, 2, 3, 4, 5, 6],
              startTime: habit.startTime || '09:00',
              endTime: habit.endTime || '10:00',
              customSchedule: habit.customSchedule,
              color: habit.color,
              setId: mappedSetId,
              setIds: mappedSetIds,
              targetValue: habit.targetValue,
              targetUnit: habit.targetUnit,
              dailyProgress: habit.dailyProgress,
              trackingStartDate: habit.trackingStartDate ? new Date(habit.trackingStartDate) : undefined,
            });
          } catch (err) {
            console.warn('Failed to import habit:', habit.title, err);
          }
        }
      }

      // Refresh all data
      await refreshTasks();
      await refreshHabits();
      await refreshTaskPresets();
      await refreshHabitSets();
      await refreshCategories();
      await refreshAnalytics();

      showToast('Backup imported successfully!', 'success');
    } catch (err: any) {
      const msg = err.message || 'Failed to import backup file';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsImporting(false);
      if (importFileInputRef.current) {
        importFileInputRef.current.value = '';
      }
    }
  };

  const handleImportFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processImportFile(file);
      setIsImportDialogOpen(false);
    }
  };

  const handleImportBackup = () => {
    setImportMode('replace'); // Reset to default mode
    setIsImportDialogOpen(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/json') {
      await processImportFile(file);
      setIsImportDialogOpen(false);
    } else {
      showToast('Please drop a valid JSON backup file', 'error');
    }
  };

  const usesPasswordProvider = user?.providerData.some((provider) => provider.providerId === 'password') ?? false;
  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmation !== displayName) return;
    try {
      setIsDeletingAccount(true);
      setError(null);
      await reauthenticateCurrentUser(usesPasswordProvider ? deletePassword : undefined);
      await deleteUserData(user.uid);
      await deleteAuthenticatedUser();
      setIsDeleteDialogOpen(false);
      onClose();
    } catch (err: any) {
      const message = err?.code === 'auth/wrong-password'
        ? 'Incorrect password. Your account was not deleted.'
        : err?.code === 'auth/popup-closed-by-user'
          ? 'Google verification was cancelled. Your account was not deleted.'
          : err?.message || 'Could not delete the account. Please try again.';
      setError(message);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      const name = userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || '';
      const avatar = userProfile?.photoURL || user?.photoURL || DEFAULT_AVATARS[0];
      const font = userProfile?.selectedFont || getStoredFontId();

      setDisplayName(name);
      setSelectedAvatar(avatar);
      setSelectedFont(font);
      applyAppFont(font);
      preloadAllAppFonts();

      setActiveTab('profile'); // Always default to Profile & Theme tab
      setError(null);
      setSuccess(false);
      setIsResetTasksOpen(false);
      setIsResetHabitsOpen(false);
      setIsDeleteDialogOpen(false);
      setIsExportDialogOpen(false);
      setIsImportDialogOpen(false);
      setDeleteConfirmation('');
      setDeletePassword('');
    }
  }, [isOpen, userProfile, user]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-950/40 via-purple-950/25 to-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="modal-enter w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col bg-white/95 backdrop-blur-2xl border border-purple-100/90 rounded-2xl shadow-[0_24px_56px_rgba(120,87,255,0.25)] overflow-hidden">
        {/* Header with Title & Tab Navigation */}
        <div className="border-b border-purple-100/80 bg-gradient-to-r from-purple-50/50 via-white to-pink-50/30 shrink-0">
          <div className="flex items-center justify-between p-4 sm:px-6 sm:py-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-500 flex items-center justify-center shadow-md shadow-purple-500/25">
                <Settings className="text-white" size={19} />
              </div>
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Settings</h2>
            </div>
            <button
              onClick={handleClose}
              disabled={busy}
              className="h-9 w-9 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 transition-all flex items-center justify-center border border-purple-100 disabled:opacity-50"
              aria-label="Close settings"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center px-4 sm:px-6 gap-2 border-t border-purple-100/50 pt-2 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'profile'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white/80 text-gray-600 hover:bg-purple-50 hover:text-purple-900 border border-purple-100'
              }`}
            >
              <User size={15} />
              <span>Profile & Theme</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('data')}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'data'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white/80 text-gray-600 hover:bg-rose-50 hover:text-rose-900 border border-purple-100'
              }`}
            >
              <Database size={15} />
              <span>Data & Danger Zone</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Status Messages */}
          {error && (
            <div className="p-3 bg-rose-50/90 border border-rose-200 rounded-xl text-rose-700 text-sm font-medium">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-semibold flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Settings saved successfully!
            </div>
          )}

          {/* TAB 1: PROFILE & THEME */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              {/* Display Name Container */}
              <div className="p-4 rounded-2xl bg-purple-100/60 border border-purple-200/90 space-y-2">
                <label htmlFor="settings-displayName" className="block text-xs font-extrabold text-purple-900 uppercase tracking-wider">
                  Display Name
                </label>
                <input
                  id="settings-displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  disabled={busy}
                  className="w-full min-h-[44px] px-4 py-2.5 bg-white border border-purple-200/80 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-500/15 focus:border-purple-500 disabled:opacity-50 transition-all text-sm sm:text-base font-semibold text-gray-900 placeholder-gray-400 shadow-2xs"
                />
              </div>

              {/* Profile Picture Section */}
              <div className="p-4 rounded-2xl bg-purple-100/60 border border-purple-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-purple-900 uppercase tracking-wider">
                    Profile Avatar
                  </label>
                  {isCustomUpload && (
                    <span className="text-[11px] font-semibold text-purple-600 flex items-center gap-1">
                      <Upload size={12} /> Using Custom Photo
                    </span>
                  )}
                </div>

                {/* Current Avatar + Upload Action */}
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl border-2 border-purple-400/80 overflow-hidden shadow-md shrink-0 bg-white">
                    {normalizedSelectedAvatar ? (
                      <img
                        src={normalizedSelectedAvatar}
                        alt="Current avatar"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                        <ImagePlus className="text-purple-400" size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={busy}
                      className="inline-flex items-center gap-2 min-h-[38px] px-3.5 py-1.5 bg-white border border-purple-200 text-purple-700 font-bold rounded-xl hover:bg-purple-50 hover:border-purple-300 transition-all disabled:opacity-50 text-xs sm:text-sm shadow-2xs"
                    >
                      <Upload size={14} />
                      {isUploading ? 'Uploading...' : 'Upload Custom Photo'}
                    </button>
                    <p className="text-gray-400 text-[11px] mt-1 font-medium">JPG, PNG, or WebP · Max 5MB</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileSelect}
                    className="hidden"
                    aria-label="Upload profile photo"
                  />
                </div>

                {/* Cute Avatar Selection Grid (6 Columns) */}
                <div className="pt-2">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Or select a cute default avatar:</p>
                  <div className="grid grid-cols-6 sm:grid-cols-6 gap-2">
                    {avatarOptions.map((avatarURL, index) => {
                      const normalizedAvatarURL = normalizeProfilePhotoURL(avatarURL);
                      const isSelected = normalizedSelectedAvatar === normalizedAvatarURL;

                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setSelectedAvatar(avatarURL)}
                          disabled={busy}
                          className={`relative aspect-square rounded-xl border-2 overflow-hidden transition-all duration-200 hover:scale-110 disabled:opacity-50 cursor-pointer ${
                            isSelected
                              ? 'border-purple-500 ring-2 ring-purple-500/30 shadow-md scale-105 bg-purple-50'
                              : 'border-white hover:border-purple-200 bg-white shadow-2xs'
                          }`}
                          title={`Avatar option ${index + 1}`}
                        >
                          <img
                            src={normalizedAvatarURL}
                            alt={`Avatar ${index + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-purple-900/20 flex items-center justify-center">
                              <div className="h-4 w-4 bg-purple-600 rounded-full flex items-center justify-center ring-1 ring-white">
                                <Check className="w-2.5 h-2.5 text-white" />
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Master Font Selection Card */}
              <div className="p-4 rounded-2xl bg-purple-100/60 border border-purple-200/90 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-extrabold text-purple-900 uppercase tracking-wider flex items-center gap-1.5 min-w-0">
                    <Type className="w-4 h-4 text-purple-700 flex-shrink-0" />
                    <span className="truncate">Website Font</span>
                  </label>
                  <span className="text-[11px] font-semibold text-purple-700 bg-white px-2 py-0.5 rounded-md border border-purple-200/80 flex-shrink-0 whitespace-nowrap">
                    Thai & English
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {APP_FONTS.map((font) => {
                    const isSelected = selectedFont === font.id;
                    return (
                      <button
                        key={font.id}
                        type="button"
                        onClick={() => handleFontSelect(font.id)}
                        disabled={busy}
                        className={`flex flex-col text-left p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                          isSelected
                            ? 'bg-white border-purple-500 ring-2 ring-purple-500/20 shadow-xs scale-[1.01]'
                            : 'bg-white/80 border-purple-100 hover:border-purple-300 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 w-full mb-1">
                          <span className="text-xs font-bold text-gray-900 truncate" style={{ fontFamily: font.fontFamily }}>
                            {font.name} <span className="text-[11px] font-medium text-gray-500">({font.nameThai})</span>
                          </span>
                          {isSelected && (
                            <div className="h-4 w-4 bg-purple-600 rounded-full flex items-center justify-center shrink-0">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-600 leading-snug" style={{ fontFamily: font.fontFamily }}>
                          {font.previewText}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Style / Gradient Mode Selection Card */}
              <div className="p-4 rounded-2xl bg-purple-100/60 border border-purple-200/90 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-extrabold text-purple-900 uppercase tracking-wider flex items-center gap-1.5 min-w-0">
                    <Palette className="w-4 h-4 text-purple-700 flex-shrink-0" />
                    <span className="truncate">Color Style</span>
                  </label>
                  <span className="text-[11px] font-semibold text-purple-700 bg-white px-2 py-0.5 rounded-md border border-purple-200/80 flex-shrink-0 whitespace-nowrap">
                    Theme Mode
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: Solid Color */}
                  <button
                    type="button"
                    onClick={() => handleGradientModeSelect('solid')}
                    disabled={busy}
                    className={`flex flex-col text-left p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                      selectedGradientMode === 'solid'
                        ? 'bg-white border-purple-500 ring-2 ring-purple-500/20 shadow-xs scale-[1.01]'
                        : 'bg-white/80 border-purple-100 hover:border-purple-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 w-full mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-purple-600 border border-purple-400 shrink-0 shadow-2xs" />
                        <span className="text-xs sm:text-sm font-extrabold text-gray-900">
                          Solid Color
                        </span>
                      </div>
                      {selectedGradientMode === 'solid' && (
                        <div className="h-4 w-4 bg-purple-600 rounded-full flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium leading-tight">
                      Flat & clean without gradients
                    </p>
                  </button>

                  {/* Option 2: Gradient Theme */}
                  <button
                    type="button"
                    onClick={() => handleGradientModeSelect('gradient')}
                    disabled={busy}
                    className={`flex flex-col text-left p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                      selectedGradientMode === 'gradient'
                        ? 'bg-white border-purple-500 ring-2 ring-purple-500/20 shadow-xs scale-[1.01]'
                        : 'bg-white/80 border-purple-100 hover:border-purple-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 w-full mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-amber-400 shrink-0 shadow-2xs" />
                        <span className="text-xs sm:text-sm font-extrabold text-gray-900 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                          Gradient Theme
                        </span>
                      </div>
                      {selectedGradientMode === 'gradient' && (
                        <div className="h-4 w-4 bg-purple-600 rounded-full flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium leading-tight">
                      Vibrant & colorful gradients (Default)
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DATA & DANGER ZONE */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              {/* Export/Import Backup JSON Section */}
              <div className="p-4 sm:p-6 rounded-2xl bg-blue-50/70 border-2 border-blue-200/90 space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Download size={16} />
                    </div>
                    <div>
                      <h3 className="font-bold text-blue-950 text-sm sm:text-base">Data Backup (JSON)</h3>
                      <p className="text-xs text-blue-700 font-medium">Download or restore a backup file of your tasks, habits, and presets.</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    disabled={busy}
                    className="flex-1 inline-flex items-center justify-center gap-2 min-h-[38px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 text-xs sm:text-sm shadow-sm"
                  >
                    <Download size={15} />
                    {isExporting ? 'Exporting...' : 'Export Backup'}
                  </button>

                  <button
                    type="button"
                    onClick={handleImportBackup}
                    disabled={busy}
                    className="flex-1 inline-flex items-center justify-center gap-2 min-h-[38px] px-4 py-2 bg-white border-2 border-blue-300 text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition-all disabled:opacity-50 text-xs sm:text-sm shadow-sm"
                  >
                    <Upload size={15} />
                    Import Backup
                  </button>
                </div>
              </div>

              {/* Data Reset Actions (Tasks & Habits) */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border-2 border-amber-200/90 space-y-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                    <RotateCcw size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-950 text-sm sm:text-base">Module Data Reset</h3>
                    <p className="text-xs text-amber-800 font-medium">Clear specific modules without deleting your account.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsResetTasksOpen(true)}
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3 py-2 bg-white border-2 border-amber-300 text-amber-900 font-bold rounded-xl hover:bg-amber-100/50 transition-all text-xs disabled:opacity-50 shadow-sm"
                  >
                    <RotateCcw size={13} />
                    Reset All Tasks
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsResetHabitsOpen(true)}
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3 py-2 bg-white border-2 border-amber-300 text-amber-900 font-bold rounded-xl hover:bg-amber-100/50 transition-all text-xs disabled:opacity-50 shadow-sm"
                  >
                    <RotateCcw size={13} />
                    Reset All Habits
                  </button>
                </div>
              </div>

              {/* Danger Zone Account Deletion */}
              <div className="p-4 rounded-2xl bg-rose-50/70 border-2 border-rose-200/90 space-y-3 shadow-md">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                    <ShieldAlert size={17} />
                  </div>
                  <div>
                    <h3 className="font-bold text-rose-950 text-sm sm:text-base">Account Danger Zone</h3>
                    <p className="text-xs text-rose-700 font-medium">Permanently remove your profile and all associated data.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-1.5 min-h-[38px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm transition shadow-md disabled:opacity-50"
                >
                  <Trash2 size={15} />
                  Delete Account Permanently
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer Action Buttons */}
        {activeTab === 'profile' ? (
          <div className="flex items-center gap-3 p-4 border-t border-purple-100/80 bg-white/95 shrink-0 rounded-b-2xl">
            <button
              type="button"
              onClick={handleClose}
              disabled={busy}
              className="flex-1 min-h-[42px] py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-xl border border-gray-200 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={busy}
              className="flex-1 min-h-[42px] py-2 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-500 text-white text-sm font-bold rounded-xl shadow-md shadow-purple-500/25 hover:brightness-110 hover:scale-[1.01] transition-all disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end p-4 border-t border-purple-100/80 bg-white/95 shrink-0 rounded-b-2xl">
            <button
              type="button"
              onClick={handleClose}
              disabled={busy}
              className="min-h-[42px] px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-xl border border-gray-200 transition-all disabled:opacity-50"
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* Reset Tasks Confirmation Dialog */}
      {isResetTasksOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="modal-enter w-full max-w-sm rounded-2xl border border-amber-200 bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-700 font-bold">
              <RotateCcw size={20} />
              <span>Reset All Tasks?</span>
            </div>
            <p className="text-xs text-gray-600 font-medium leading-relaxed">
              This action will delete all completed and pending tasks. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsResetTasksOpen(false)}
                disabled={isResetting}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetTasks}
                disabled={isResetting}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-700"
              >
                {isResetting ? 'Resetting...' : 'Yes, Reset Tasks'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Habits Confirmation Dialog */}
      {isResetHabitsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="modal-enter w-full max-w-sm rounded-2xl border border-amber-200 bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-700 font-bold">
              <RotateCcw size={20} />
              <span>Reset All Habits?</span>
            </div>
            <p className="text-xs text-gray-600 font-medium leading-relaxed">
              This action will delete all daily habits and completion histories. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsResetHabitsOpen(false)}
                disabled={isResetting}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetHabits}
                disabled={isResetting}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-700"
              >
                {isResetting ? 'Resetting...' : 'Yes, Reset Habits'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Backup Confirmation Dialog */}
      {isExportDialogOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="modal-enter w-full max-w-sm rounded-2xl border border-blue-200 bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-blue-700 font-bold">
              <Download size={20} />
              <span>Export Data Backup?</span>
            </div>
            <p className="text-xs text-gray-600 font-medium leading-relaxed">
              This will download a JSON file containing all your tasks, habits, categories, and routine presets.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsExportDialogOpen(false)}
                disabled={isExporting}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmExportBackup}
                disabled={isExporting}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700"
              >
                {isExporting ? 'Exporting...' : 'Yes, Export'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Backup Dialog */}
      {isImportDialogOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="modal-enter w-full max-w-lg rounded-2xl border border-blue-200 bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-blue-700 font-bold">
              <Upload size={20} />
              <span>Import Data Backup</span>
            </div>

            {/* Import Mode Selection */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">Import Mode:</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setImportMode('replace')}
                  className={`flex-1 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                    importMode === 'replace'
                      ? 'border-rose-500 bg-rose-50 text-rose-700'
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="font-bold mb-1">Replace</div>
                  <div className="text-xs font-normal">Delete existing data</div>
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('merge')}
                  className={`flex-1 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                    importMode === 'merge'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="font-bold mb-1">Merge</div>
                  <div className="text-xs font-normal">Add to existing data</div>
                </button>
              </div>
            </div>

            {/* Warning Message */}
            <div className={`${importMode === 'replace' ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'} border rounded-xl p-3`}>
              <p className={`text-xs font-semibold flex items-start gap-2 ${importMode === 'replace' ? 'text-rose-800' : 'text-amber-800'}`}>
                <ShieldAlert size={14} className="mt-0.5 flex-shrink-0" />
                <span>
                  <span className={`font-bold ${importMode === 'replace' ? 'text-rose-900' : 'text-amber-900'}`}>Warning:</span>{' '}
                  {importMode === 'replace'
                    ? 'This will delete all your existing data and replace it with the backup file. This action cannot be undone.'
                    : 'This will add the backup data to your existing data. Routines from the backup will be imported as inactive (your existing routines will remain unchanged).'}
                </span>
              </p>
            </div>
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all min-h-[140px] flex items-center justify-center ${
                isImporting ? 'border-blue-500 bg-blue-100' : isDraggingOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isImporting ? (
                <div className="w-full">
                  <div className="animate-spin mx-auto mb-2">
                    <Upload size={32} className="text-blue-500" />
                  </div>
                  <p className="text-sm font-semibold text-blue-700">Importing backup file...</p>
                  <p className="text-xs text-gray-500 mt-1">Please wait while we restore your data</p>
                </div>
              ) : isDraggingOver ? (
                <div className="w-full">
                  <Upload size={32} className="mx-auto text-blue-500 mb-2" />
                  <p className="text-sm font-semibold text-blue-700">Drop your backup file here</p>
                </div>
              ) : (
                <div className="w-full">
                  <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm font-medium text-gray-600 mb-2">Drag and drop your backup file here</p>
                  <p className="text-xs text-gray-500">or</p>
                  <button
                    type="button"
                    onClick={() => importFileInputRef.current?.click()}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-all"
                  >
                    Select File
                  </button>
                </div>
              )}
            </div>
            <input
              ref={importFileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportFileSelect}
              className="hidden"
              aria-label="Import backup file"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsImportDialogOpen(false)}
                disabled={isImporting}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Dialog */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="modal-enter w-full max-w-md rounded-2xl border border-rose-100 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete your account?</h3>
                <p className="mt-1 text-sm text-gray-600">This cannot be undone. All of your stored data will be permanently removed.</p>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              {usesPasswordProvider && (
                <div>
                  <label htmlFor="delete-password" className="mb-1 block text-sm font-semibold text-gray-700">Password</label>
                  <input
                    id="delete-password"
                    type="password"
                    value={deletePassword}
                    onChange={(event) => setDeletePassword(event.target.value)}
                    disabled={isDeletingAccount}
                    className="w-full rounded-lg border border-rose-200 px-3 py-2 text-sm outline-none focus:border-rose-500"
                    autoComplete="current-password"
                  />
                </div>
              )}
              <div>
                <label htmlFor="delete-confirmation" className="mb-1 block text-sm font-semibold text-gray-700">
                  Type <span className="font-bold text-rose-600">{displayName}</span> to confirm
                </label>
                <input
                  id="delete-confirmation"
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  disabled={isDeletingAccount}
                  placeholder={displayName}
                  className="w-full rounded-lg border border-rose-200 px-3 py-2 text-sm outline-none focus:border-rose-500"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isDeletingAccount}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount || deleteConfirmation !== displayName || (usesPasswordProvider && !deletePassword)}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeletingAccount ? 'Deleting...' : 'Permanently Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default SettingsModal;
