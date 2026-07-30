import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  updateUserProfile,
  uploadProfilePhoto,
  DEFAULT_AVATARS,
  normalizeProfilePhotoURL,
} from '@/services/userService';
import { deleteUserData, resetUserTasks, resetUserDailyHabits } from '@/services/accountService';
import { deleteAuthenticatedUser, reauthenticateCurrentUser } from '@/services/authService';
import { APP_FONTS, applyAppFont, getStoredFontId, preloadAllAppFonts } from '@/utils/fontUtils';
import { getUserTasks } from '@/services/taskService';
import { getUserDailyHabits, getUserHabitSets } from '@/services/habitService';
import { getUserCategories } from '@/services/categoryService';
import { showToast } from '@/components/ui/Toast';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user, userProfile, refreshUserProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'data'>('profile');
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [selectedAvatar, setSelectedAvatar] = useState(userProfile?.photoURL || '');
  const [selectedFont, setSelectedFont] = useState(userProfile?.selectedFont || getStoredFontId());

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Modals inside Settings
  const [isResetTasksOpen, setIsResetTasksOpen] = useState(false);
  const [isResetHabitsOpen, setIsResetHabitsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
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

  const handleClose = () => {
    if (busy) return;
    const initialFont = userProfile?.selectedFont || getStoredFontId();
    applyAppFont(initialFont);
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
      });

      applyAppFont(selectedFont);
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

      const [userTasks, userHabits, userCategories, userSets] = await Promise.all([
        getUserTasks(user.uid),
        getUserDailyHabits(user.uid),
        getUserCategories(user.uid),
        getUserHabitSets(user.uid),
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
      setIsResetTasksOpen(false);
      showToast('Reset all tasks successfully', 'success');
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
      setIsResetHabitsOpen(false);
      showToast('Reset all habits successfully', 'success');
    } catch (err) {
      console.error('Error resetting habits:', err);
      showToast('Failed to reset habits', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const handleImportFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

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

      // Import data (this would require additional service functions)
      // For now, just show a message that this feature needs implementation
      showToast('Import feature requires additional service implementation', 'error');
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

  const usesPasswordProvider = user?.providerData.some((provider) => provider.providerId === 'password') ?? false;
  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmation !== 'DELETE') return;
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

      setError(null);
      setSuccess(false);
      setIsResetTasksOpen(false);
      setIsResetHabitsOpen(false);
      setIsDeleteDialogOpen(false);
      setIsExportDialogOpen(false);
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
                        <p className="text-[11px] text-gray-600 truncate leading-tight" style={{ fontFamily: font.fontFamily }}>
                          {font.previewText}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DATA & DANGER ZONE */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              {/* Export/Import Backup JSON Section */}
              <div className="p-4 rounded-2xl bg-blue-50/70 border-2 border-blue-200/90 space-y-2.5 shadow-sm">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-2 min-h-[38px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 text-xs sm:text-sm shadow-sm"
                  >
                    <Download size={15} />
                    {isExporting ? 'Exporting...' : 'Export Backup'}
                  </button>

                  <button
                    type="button"
                    onClick={() => importFileInputRef.current?.click()}
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-2 min-h-[38px] px-4 py-2 bg-white border-2 border-blue-300 text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition-all disabled:opacity-50 text-xs sm:text-sm shadow-sm"
                  >
                    <Upload size={15} />
                    {isImporting ? 'Importing...' : 'Import Backup'}
                  </button>
                </div>
                <input
                  ref={importFileInputRef}
                  type="file"
                  accept="application/json"
                  onChange={handleImportFileSelect}
                  className="hidden"
                  aria-label="Import backup file"
                />
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
                  Type <span className="font-bold text-rose-600">DELETE</span> to confirm
                </label>
                <input
                  id="delete-confirmation"
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  disabled={isDeletingAccount}
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
                disabled={isDeletingAccount || deleteConfirmation !== 'DELETE' || (usesPasswordProvider && !deletePassword)}
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
}

export default SettingsModal;
