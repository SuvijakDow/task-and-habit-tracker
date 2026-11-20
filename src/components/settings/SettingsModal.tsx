import { useEffect, useRef, useState, memo } from 'react';
import { Database, Download, RotateCcw, Settings, User, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDataRefresh } from '@/context/DataRefreshContext';
import {
  DEFAULT_AVATARS,
  normalizeProfilePhotoURL,
  updateUserProfile,
  uploadProfilePhoto,
} from '@/services/userService';
import {
  deleteUserData,
  resetUserDailyHabits,
  resetUserHabitSets,
  resetUserTaskPresets,
  resetUserTasks,
} from '@/services/accountService';
import { deleteAuthenticatedUser, reauthenticateCurrentUser } from '@/services/authService';
import {
  BackupImportMode,
  exportUserBackupFile,
  importUserBackupFile,
} from '@/services/backupService';
import { applyAppFont, getStoredFontId, preloadAllAppFonts } from '@/utils/fontUtils';
import { GradientMode, applyGradientMode, getStoredGradientMode } from '@/utils/gradientUtils';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showToast } from '@/components/ui/Toast';
import { ProfileThemeTab } from './ProfileThemeTab';
import { DataDangerZoneTab } from './DataDangerZoneTab';
import { ImportBackupDialog } from './ImportBackupDialog';
import { DeleteAccountDialog } from './DeleteAccountDialog';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal = memo(function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const {
    refreshTasks,
    refreshHabits,
    refreshTaskPresets,
    refreshHabitSets,
    refreshCategories,
    refreshAnalytics,
  } = useDataRefresh();

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
  const [importMode, setImportMode] = useState<BackupImportMode>('replace');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [isResetTasksOpen, setIsResetTasksOpen] = useState(false);
  const [isResetHabitsOpen, setIsResetHabitsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const initialFontRef = useRef<string>(userProfile?.selectedFont || getStoredFontId());
  const initialGradientModeRef = useRef<GradientMode>(
    userProfile?.gradientMode || getStoredGradientMode()
  );

  useEffect(() => {
    if (!isOpen) return;

    const name =
      userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || '';
    const avatar = userProfile?.photoURL || user?.photoURL || DEFAULT_AVATARS[0];
    const font = userProfile?.selectedFont || getStoredFontId();
    const gradientMode = userProfile?.gradientMode || getStoredGradientMode();

    initialFontRef.current = font;
    initialGradientModeRef.current = gradientMode;

    setDisplayName(name);
    setSelectedAvatar(avatar);
    setSelectedFont(font);
    setSelectedGradientMode(gradientMode);
    applyAppFont(font, false);
    applyGradientMode(gradientMode, false);
    preloadAllAppFonts();

    setActiveTab('profile');
    setError(null);
    setSuccess(false);
    setIsResetTasksOpen(false);
    setIsResetHabitsOpen(false);
    setIsDeleteDialogOpen(false);
    setIsExportDialogOpen(false);
    setIsImportDialogOpen(false);
    setDeleteConfirmation('');
    setDeletePassword('');
  }, [isOpen, userProfile, user]);

  if (!isOpen) return null;

  const googlePhotoURL = user?.photoURL || null;
  const normalizedGooglePhotoURL = normalizeProfilePhotoURL(googlePhotoURL);
  const normalizedSelectedAvatar = normalizeProfilePhotoURL(selectedAvatar);
  const avatarOptions = [
    ...DEFAULT_AVATARS,
    ...(googlePhotoURL && !DEFAULT_AVATARS.includes(googlePhotoURL) ? [googlePhotoURL] : []),
  ];
  const isCustomUpload = Boolean(
    selectedAvatar &&
      !DEFAULT_AVATARS.includes(selectedAvatar) &&
      normalizedSelectedAvatar !== normalizedGooglePhotoURL
  );
  const busy =
    isSaving || isUploading || isDeletingAccount || isExporting || isImporting || isResetting;
  const usesPasswordProvider =
    user?.providerData.some((provider) => provider.providerId === 'password') ?? false;
  const deleteConfirmName = (userProfile?.displayName || displayName || '').trim();

  const handleFontSelect = (fontId: string) => {
    setSelectedFont(fontId);
    applyAppFont(fontId, false);
  };

  const handleGradientModeSelect = (mode: GradientMode) => {
    setSelectedGradientMode(mode);
    applyGradientMode(mode, false);
  };

  const handleClose = () => {
    if (busy) return;
    applyAppFont(initialFontRef.current, false);
    applyGradientMode(initialGradientModeRef.current, false);
    onClose();
  };

  const handleUploadFile = async (file: File) => {
    if (!user) return;
    try {
      setIsUploading(true);
      setError(null);
      const downloadURL = await uploadProfilePhoto(user.uid, file);
      setSelectedAvatar(downloadURL);
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo');
    } finally {
      setIsUploading(false);
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

      initialFontRef.current = selectedFont;
      initialGradientModeRef.current = selectedGradientMode;
      applyAppFont(selectedFont, true);
      applyGradientMode(selectedGradientMode, true);
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

  const handleConfirmExport = async () => {
    if (!user) return;
    try {
      setIsExporting(true);
      setError(null);
      setIsExportDialogOpen(false);
      await exportUserBackupFile(user, userProfile);
      showToast('Exported JSON backup file successfully!', 'success');
    } catch (err) {
      console.error('Error exporting backup:', err);
      showToast('Failed to export backup file.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = async (file: File) => {
    if (!user) return;
    try {
      setIsImporting(true);
      setError(null);

      const result = await importUserBackupFile(user.uid, file, importMode);

      if (importMode === 'replace' && (result.importedFont || result.importedGradient)) {
        if (result.importedFont) {
          setSelectedFont(result.importedFont);
          initialFontRef.current = result.importedFont;
          applyAppFont(result.importedFont, true);
        }
        if (result.importedGradient) {
          setSelectedGradientMode(result.importedGradient);
          initialGradientModeRef.current = result.importedGradient;
          applyGradientMode(result.importedGradient, true);
        }
        await updateUserProfile(user.uid, {
          selectedFont: result.importedFont || selectedFont,
          gradientMode: result.importedGradient || selectedGradientMode,
        });
        await refreshUserProfile();
      }

      await Promise.all([
        refreshTasks(),
        refreshHabits(),
        refreshTaskPresets(),
        refreshHabitSets(),
        refreshCategories(),
        refreshAnalytics(),
      ]);

      if (importMode === 'merge') {
        const details: string[] = [];
        if (result.tasksAddedCount > 0) details.push(`+${result.tasksAddedCount} tasks`);
        if (result.tasksUpdatedCount > 0) details.push(`${result.tasksUpdatedCount} tasks updated`);
        if (result.habitsAddedCount > 0) details.push(`+${result.habitsAddedCount} habits`);
        if (result.habitsMergedCount > 0) details.push(`${result.habitsMergedCount} habits merged`);
        const summary = details.length > 0 ? ` (${details.join(', ')})` : '';
        showToast(`Backup merged successfully!${summary}`, 'success');
      } else {
        showToast('Backup imported successfully!', 'success');
      }
      setIsImportDialogOpen(false);
    } catch (err: any) {
      const msg = err.message || 'Failed to import backup file';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsImporting(false);
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

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmation.trim() !== deleteConfirmName) return;
    try {
      setIsDeletingAccount(true);
      setError(null);
      await reauthenticateCurrentUser(usesPasswordProvider ? deletePassword : undefined);
      await deleteUserData(user.uid);
      await deleteAuthenticatedUser();
      setIsDeleteDialogOpen(false);
      onClose();
    } catch (err: any) {
      const message =
        err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential'
          ? 'Incorrect password. Your account was not deleted.'
          : err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request'
          ? 'Google verification was cancelled. Your account was not deleted.'
          : err?.message || 'Could not delete the account. Please try again.';
      setError(message);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-950/40 via-purple-950/25 to-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="modal-enter w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col bg-white border border-purple-100 rounded-2xl shadow-[0_24px_56px_rgba(120,87,255,0.22)] overflow-hidden">
        {/* Header with Title & Tabs */}
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
              className="h-9 w-9 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors flex items-center justify-center border border-purple-100 disabled:opacity-50"
              aria-label="Close settings"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex items-center px-4 sm:px-6 gap-2 border-t border-purple-100/50 pt-2 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
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
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 [will-change:scroll-position] transform-gpu">
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

          {activeTab === 'profile' ? (
            <ProfileThemeTab
              displayName={displayName}
              onDisplayNameChange={setDisplayName}
              avatarOptions={avatarOptions}
              normalizedSelectedAvatar={normalizedSelectedAvatar}
              isCustomUpload={isCustomUpload}
              isUploading={isUploading}
              onSelectAvatar={setSelectedAvatar}
              onUploadFile={handleUploadFile}
              selectedFont={selectedFont}
              onSelectFont={handleFontSelect}
              selectedGradientMode={selectedGradientMode}
              onSelectGradientMode={handleGradientModeSelect}
              disabled={busy}
            />
          ) : (
            <DataDangerZoneTab
              disabled={busy}
              isExporting={isExporting}
              onExportClick={() => setIsExportDialogOpen(true)}
              onImportClick={() => {
                setImportMode('replace');
                setIsImportDialogOpen(true);
              }}
              onResetTasksClick={() => setIsResetTasksOpen(true)}
              onResetHabitsClick={() => setIsResetHabitsOpen(true)}
              onDeleteAccountClick={() => setIsDeleteDialogOpen(true)}
            />
          )}
        </div>

        {/* Sticky Footer */}
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

      {/* Sub-Dialogs */}
      <ConfirmDialog
        isOpen={isResetTasksOpen}
        title="Reset All Tasks?"
        description="This action will delete all completed and pending tasks and reset your periods. This cannot be undone."
        confirmLabel="Yes, Reset Tasks"
        loadingLabel="Resetting..."
        isLoading={isResetting}
        tone="warning"
        icon={<RotateCcw className="h-6 w-6 text-amber-600" />}
        zIndexClass="z-[60]"
        onCancel={() => setIsResetTasksOpen(false)}
        onConfirm={handleResetTasks}
      />

      <ConfirmDialog
        isOpen={isResetHabitsOpen}
        title="Reset All Habits?"
        description="This action will delete all daily habits, completion histories, and routines. This cannot be undone."
        confirmLabel="Yes, Reset Habits"
        loadingLabel="Resetting..."
        isLoading={isResetting}
        tone="warning"
        icon={<RotateCcw className="h-6 w-6 text-amber-600" />}
        zIndexClass="z-[60]"
        onCancel={() => setIsResetHabitsOpen(false)}
        onConfirm={handleResetHabits}
      />

      <ConfirmDialog
        isOpen={isExportDialogOpen}
        title="Export Data Backup?"
        description="This will download a JSON file containing all your tasks (including subtasks, deadlines & link chips), habits, categories, periods/routines, and theme preferences."
        confirmLabel="Yes, Export"
        loadingLabel="Exporting..."
        isLoading={isExporting}
        tone="primary"
        icon={<Download className="h-6 w-6 text-purple-600" />}
        zIndexClass="z-[60]"
        onCancel={() => setIsExportDialogOpen(false)}
        onConfirm={handleConfirmExport}
      />

      <ImportBackupDialog
        isOpen={isImportDialogOpen}
        importMode={importMode}
        isImporting={isImporting}
        onImportModeChange={setImportMode}
        onImportFile={handleImportFile}
        onClose={() => setIsImportDialogOpen(false)}
      />

      <DeleteAccountDialog
        isOpen={isDeleteDialogOpen}
        usesPasswordProvider={usesPasswordProvider}
        deleteConfirmName={deleteConfirmName}
        deletePassword={deletePassword}
        deleteConfirmation={deleteConfirmation}
        error={error}
        isDeleting={isDeletingAccount}
        onPasswordChange={setDeletePassword}
        onConfirmationChange={setDeleteConfirmation}
        onCancel={() => {
          setError(null);
          setIsDeleteDialogOpen(false);
        }}
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
});
