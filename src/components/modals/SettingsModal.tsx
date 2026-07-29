import React, { useState, useRef } from 'react';
import { AlertTriangle, Settings, Trash2, X, Upload, ImagePlus, Type, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  updateUserProfile,
  uploadProfilePhoto,
  DEFAULT_AVATARS,
  normalizeProfilePhotoURL,
} from '@/services/userService';
import { deleteUserData } from '@/services/accountService';
import { deleteAuthenticatedUser, reauthenticateCurrentUser } from '@/services/authService';
import { APP_FONTS, applyAppFont, getStoredFontId, preloadAllAppFonts } from '@/utils/fontUtils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [selectedAvatar, setSelectedAvatar] = useState(userProfile?.photoURL || '');
  const [selectedFont, setSelectedFont] = useState(userProfile?.selectedFont || getStoredFontId());
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Build the avatar options: 8 defaults + Google photo if available
  const googlePhotoURL = user?.photoURL || null;
  const normalizedGooglePhotoURL = normalizeProfilePhotoURL(googlePhotoURL);
  const normalizedSelectedAvatar = normalizeProfilePhotoURL(selectedAvatar);
  const avatarOptions = [
    ...DEFAULT_AVATARS,
    ...(googlePhotoURL && !DEFAULT_AVATARS.includes(googlePhotoURL)
      ? [googlePhotoURL]
      : []),
  ];

  // Check if current avatar is a custom upload (not a default or Google photo)
  const isCustomUpload = selectedAvatar
    && !DEFAULT_AVATARS.includes(selectedAvatar)
    && normalizedSelectedAvatar !== normalizedGooglePhotoURL;

  const busy = isSaving || isUploading || isDeletingAccount;

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
      // Reset file input so same file can be selected again
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

      // Auto-close after a brief success flash
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

  // Reset state when modal opens — use Firestore profile, fallback to Auth data
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
      setIsDeleteDialogOpen(false);
      setDeleteConfirmation('');
      setDeletePassword('');
    }
  }, [isOpen, userProfile, user]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-950/40 via-purple-950/25 to-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="modal-enter w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col bg-white/95 backdrop-blur-2xl border border-purple-100/90 rounded-2xl shadow-[0_24px_56px_rgba(120,87,255,0.25)] overflow-hidden">
        {/* Sticky Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-purple-100/80 bg-white/95 shrink-0">
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

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Messages */}
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
              Profile saved successfully!
            </div>
          )}

          {/* Display Name Input */}
          <div>
            <label htmlFor="settings-displayName" className="block text-sm font-bold text-gray-800 mb-1.5">
              Display Name
            </label>
            <input
              id="settings-displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
              disabled={busy}
              className="w-full min-h-[44px] px-4 py-2.5 bg-purple-50/40 border border-purple-200/80 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-500/15 focus:border-purple-500 focus:bg-white disabled:opacity-50 transition-all text-base font-semibold text-gray-900 placeholder-gray-400 shadow-2xs"
            />
          </div>

          {/* Master Font Selection */}
          <div className="pt-3 border-t border-purple-100/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <Type className="w-4 h-4 text-purple-600" />
                Application Master Font
              </label>
              <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/80">
                Thai & English
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1 p-0.5">
              {APP_FONTS.map((font) => {
                const isSelected = selectedFont === font.id;
                return (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => handleFontSelect(font.id)}
                    disabled={busy}
                    className={`flex flex-col text-left p-2.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-gradient-to-br from-purple-50 to-pink-50/40 border-purple-500 ring-2 ring-purple-500/20 shadow-2xs scale-[1.01]'
                        : 'bg-white border-purple-100 hover:border-purple-300 hover:bg-purple-50/30'
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

          {/* Avatar Selection Section */}
          <div className="pt-3 border-t border-purple-100/70">
            <p className="text-sm font-bold text-gray-800 mb-3">
              Profile Picture
            </p>

            {/* Current preview + Upload button */}
            <div className="flex items-center gap-4 mb-4">
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
                  className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 bg-purple-50 border border-purple-200 text-purple-700 font-bold rounded-xl hover:bg-purple-100 hover:border-purple-300 transition-all disabled:opacity-50 text-sm shadow-2xs"
                >
                  <Upload size={15} />
                  {isUploading ? 'Uploading...' : 'Upload Photo'}
                </button>
                <p className="text-gray-400 text-xs mt-1.5 font-medium">JPG, PNG, or WebP · Max 5MB</p>
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

            {/* Avatar grid */}
            <p className="text-xs font-semibold text-gray-500 mb-2.5">Or choose a default avatar:</p>
            <div className="grid grid-cols-4 gap-2.5">
              {avatarOptions.map((avatarURL, index) => {
                const normalizedAvatarURL = normalizeProfilePhotoURL(avatarURL);
                const isSelected = normalizedSelectedAvatar === normalizedAvatarURL;
                const isGooglePhoto = normalizedAvatarURL === normalizedGooglePhotoURL && !DEFAULT_AVATARS.includes(avatarURL);

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedAvatar(avatarURL)}
                    disabled={busy}
                    className={`relative aspect-square rounded-2xl border-2 overflow-hidden transition-all duration-200 hover:scale-105 disabled:opacity-50 ${
                      isSelected
                        ? 'border-purple-500 ring-4 ring-purple-500/20 shadow-md shadow-purple-500/25 scale-105'
                        : 'border-purple-100 hover:border-purple-300 shadow-2xs'
                    }`}
                    aria-label={isGooglePhoto ? 'Your Google photo' : `Avatar option ${index + 1}`}
                    title={isGooglePhoto ? 'Your Google photo' : `Avatar ${index + 1}`}
                  >
                    <img
                      src={normalizedAvatarURL}
                      alt={isGooglePhoto ? 'Google profile photo' : `Avatar ${index + 1}`}
                      className="w-full h-full object-cover bg-white"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />

                    {/* Selected checkmark */}
                    {isSelected && (
                      <div className="absolute bottom-1 right-1 h-5 w-5 bg-gradient-to-br from-purple-600 to-pink-500 rounded-full flex items-center justify-center shadow-md ring-2 ring-white">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}

                    {/* Google badge */}
                    {isGooglePhoto && (
                      <div className="absolute top-1 left-1 h-4 w-4 bg-white rounded-full flex items-center justify-center shadow-xs border border-gray-200">
                        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom uploaded photo badge */}
            {isCustomUpload && (
              <p className="text-xs text-purple-600 font-semibold mt-2.5 flex items-center gap-1.5">
                <Upload size={13} />
                Using your uploaded photo
              </p>
            )}
          </div>

          {/* Danger Zone */}
          <section className="rounded-2xl border border-rose-200/90 bg-rose-50/60 p-4 shadow-2xs">
            <div className="flex gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 shadow-2xs">
                <AlertTriangle size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-rose-900 text-sm">Danger Zone</h3>
                <p className="mt-1 text-xs leading-relaxed text-rose-700 font-medium">
                  Permanently delete your account and all tasks, habits, categories, presets, and profile data.
                </p>
                <button
                  type="button"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  disabled={busy}
                  className="mt-3 inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-3.5 py-1.5 text-xs font-bold text-white transition shadow-2xs disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Delete Account
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Sticky Footer Action Buttons */}
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
      </div>

      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="modal-enter w-full max-w-md rounded-2xl border border-rose-100 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start gap-3"><div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600"><AlertTriangle size={20} /></div><div><h3 className="text-lg font-bold text-gray-900">Delete your account?</h3><p className="mt-1 text-sm text-gray-600">This cannot be undone. All of your stored data will be permanently removed.</p></div></div>
            <div className="mt-5 space-y-4">
              {usesPasswordProvider && <div><label htmlFor="delete-password" className="mb-1 block text-sm font-semibold text-gray-700">Password</label><input id="delete-password" type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} disabled={isDeletingAccount} className="w-full rounded-lg border border-rose-200 px-3 py-2 text-sm outline-none focus:border-rose-500" autoComplete="current-password" /></div>}
              <div><label htmlFor="delete-confirmation" className="mb-1 block text-sm font-semibold text-gray-700">Type <span className="font-bold text-rose-600">DELETE</span> to confirm</label><input id="delete-confirmation" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} disabled={isDeletingAccount} className="w-full rounded-lg border border-rose-200 px-3 py-2 text-sm outline-none focus:border-rose-500" autoComplete="off" /></div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeletingAccount} className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50">Cancel</button><button type="button" onClick={handleDeleteAccount} disabled={isDeletingAccount || deleteConfirmation !== 'DELETE' || (usesPasswordProvider && !deletePassword)} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">{isDeletingAccount ? 'Deleting...' : 'Permanently Delete Account'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsModal;
