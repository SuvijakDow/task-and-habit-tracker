import React, { useState, useRef } from 'react';
import { Settings, X, Upload, ImagePlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  updateUserProfile,
  uploadProfilePhoto,
  DEFAULT_AVATARS,
  normalizeProfilePhotoURL,
} from '@/services/userService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [selectedAvatar, setSelectedAvatar] = useState(userProfile?.photoURL || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
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
      });

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

  // Reset state when modal opens — use Firestore profile, fallback to Auth data
  React.useEffect(() => {
    if (isOpen) {
      const name = userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || '';
      const avatar = userProfile?.photoURL || user?.photoURL || DEFAULT_AVATARS[0];
      setDisplayName(name);
      setSelectedAvatar(avatar);
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, userProfile, user]);

  if (!isOpen) return null;

  const busy = isSaving || isUploading;

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-950/35 via-purple-900/20 to-fuchsia-900/30 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div className="modal-enter w-full max-w-md max-h-[90vh] overflow-y-auto bg-white/95 sm:bg-white/88 backdrop-blur-xl border border-white/70 rounded-3xl shadow-[0_24px_56px_rgba(120,87,255,0.26)]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Settings className="text-white" size={18} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Settings</h2>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="h-8 w-8 rounded-xl bg-white/50 hover:bg-white/80 text-gray-400 hover:text-gray-600 transition-all flex items-center justify-center disabled:opacity-50"
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-6 pt-4 space-y-6">
          {/* Messages */}
          {error && (
            <div className="p-3 bg-red-50/90 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Profile saved!
            </div>
          )}

          {/* Display Name */}
          <div>
            <label htmlFor="settings-displayName" className="block text-sm font-semibold text-gray-700 mb-2">
              Display Name
            </label>
            <input
              id="settings-displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              disabled={busy}
              className="w-full px-4 py-3 bg-white/60 border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white disabled:opacity-50 transition-all text-gray-900 placeholder-gray-400"
            />
          </div>

          {/* Avatar Selection */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Profile Picture
            </p>

            {/* Current preview + Upload button */}
            <div className="flex items-center gap-4 mb-4">
              <div className="h-16 w-16 rounded-2xl border-2 border-purple-300 overflow-hidden shadow-lg flex-shrink-0 bg-white/70">
                {normalizedSelectedAvatar ? (
                  <img
                    src={normalizedSelectedAvatar}
                    alt="Current avatar"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                    <ImagePlus className="text-purple-300" size={24} />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/70 border border-purple-200 text-purple-700 font-semibold rounded-xl hover:bg-white hover:border-purple-300 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Upload size={15} />
                  {isUploading ? 'Uploading...' : 'Upload Photo'}
                </button>
                <p className="text-gray-400 text-xs mt-1.5">JPG, PNG, or WebP · Max 5MB</p>
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
            <p className="text-xs font-medium text-gray-500 mb-2">Or choose a default avatar:</p>
            <div className="grid grid-cols-4 gap-3">
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
                    className={`relative aspect-square rounded-2xl border-2 overflow-hidden transition-all duration-200 hover:scale-105 disabled:opacity-50 ${isSelected
                        ? 'border-purple-500 ring-2 ring-purple-300 shadow-lg shadow-purple-500/25 scale-105'
                        : 'border-white/50 hover:border-purple-300 shadow-md'
                      }`}
                    aria-label={isGooglePhoto ? 'Your Google photo' : `Avatar option ${index + 1}`}
                    title={isGooglePhoto ? 'Your Google photo' : `Avatar ${index + 1}`}
                    >
                    <img
                      src={normalizedAvatarURL}
                      alt={isGooglePhoto ? 'Google profile photo' : `Avatar ${index + 1}`}
                      className="w-full h-full object-cover bg-white/70"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />

                    {/* Selected checkmark */}
                    {isSelected && (
                      <div className="absolute bottom-1 right-1 h-5 w-5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-md">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}

                    {/* Google badge */}
                    {isGooglePhoto && (
                      <div className="absolute top-1 left-1 h-4 w-4 bg-white rounded-full flex items-center justify-center shadow-sm">
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

            {/* Show label if custom uploaded photo is selected */}
            {isCustomUpload && (
              <p className="text-xs text-purple-600 font-medium mt-2 flex items-center gap-1.5">
                <Upload size={12} />
                Using your uploaded photo
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={busy}
              className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/30 hover:brightness-110 hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={onClose}
              disabled={busy}
              className="flex-1 py-3 bg-white/60 border border-white/40 text-gray-700 font-semibold rounded-xl hover:bg-white/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
