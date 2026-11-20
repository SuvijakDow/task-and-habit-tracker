import React, { useRef } from 'react';
import { Check, ImagePlus, Palette, Sparkles, Type, Upload, Volume2, VolumeX } from 'lucide-react';
import { APP_FONTS } from '@/utils/fontUtils';
import { GradientMode } from '@/utils/gradientUtils';
import { SOUND_THEMES, SoundTheme } from '@/utils/audio';
import { normalizeProfilePhotoURL } from '@/services/userService';

interface ProfileThemeTabProps {
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  avatarOptions: string[];
  normalizedSelectedAvatar: string;
  isCustomUpload: boolean;
  isUploading: boolean;
  onSelectAvatar: (url: string) => void;
  onUploadFile: (file: File) => void;
  selectedFont: string;
  onSelectFont: (fontId: string) => void;
  selectedGradientMode: GradientMode;
  onSelectGradientMode: (mode: GradientMode) => void;
  selectedSoundTheme: SoundTheme;
  onSelectSoundTheme: (theme: SoundTheme) => void;
  selectedSoundVolume: number;
  onSelectSoundVolume: (volume: number, preview?: boolean) => void;
  disabled: boolean;
}

export const ProfileThemeTab: React.FC<ProfileThemeTabProps> = ({
  displayName,
  onDisplayNameChange,
  avatarOptions,
  normalizedSelectedAvatar,
  isCustomUpload,
  isUploading,
  onSelectAvatar,
  onUploadFile,
  selectedFont,
  onSelectFont,
  selectedGradientMode,
  onSelectGradientMode,
  selectedSoundTheme,
  onSelectSoundTheme,
  selectedSoundVolume,
  onSelectSoundVolume,
  disabled,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-5">
      {/* Display Name */}
      <div className="p-4 rounded-2xl bg-purple-100/60 border border-purple-200/90 space-y-2">
        <label
          htmlFor="settings-displayName"
          className="block text-xs font-extrabold text-purple-900 uppercase tracking-wider"
        >
          Display Name
        </label>
        <input
          id="settings-displayName"
          type="text"
          value={displayName}
          onChange={(e) => onDisplayNameChange(e.target.value)}
          placeholder="Your display name"
          disabled={disabled}
          className="w-full min-h-[44px] px-4 py-2.5 bg-white border border-purple-200/80 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-500/15 focus:border-purple-500 disabled:opacity-50 transition-all text-sm sm:text-base font-semibold text-gray-900 placeholder-gray-400 shadow-2xs"
        />
      </div>

      {/* Profile Avatar */}
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
              disabled={disabled}
              className="inline-flex items-center gap-2 min-h-[38px] px-3.5 py-1.5 bg-white border border-purple-200 text-purple-700 font-bold rounded-xl hover:bg-purple-50 hover:border-purple-300 transition-colors disabled:opacity-50 text-xs sm:text-sm shadow-2xs"
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
            onChange={handleFileChange}
            className="hidden"
            aria-label="Upload profile photo"
          />
        </div>

        <div className="pt-2">
          <p className="text-xs font-semibold text-gray-500 mb-2">Or select a cute default avatar:</p>
          <div className="grid grid-cols-6 gap-2">
            {avatarOptions.map((avatarURL, index) => {
              const normalizedAvatarURL = normalizeProfilePhotoURL(avatarURL);
              const isSelected = normalizedSelectedAvatar === normalizedAvatarURL;

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => onSelectAvatar(avatarURL)}
                  disabled={disabled}
                  className={`relative aspect-square rounded-xl border-2 overflow-hidden transition-[border-color,box-shadow,background-color] duration-150 disabled:opacity-50 cursor-pointer ${
                    isSelected
                      ? 'border-purple-500 ring-2 ring-purple-500/30 shadow-md bg-purple-50'
                      : 'border-white hover:border-purple-300 bg-white shadow-2xs'
                  }`}
                  title={`Avatar option ${index + 1}`}
                >
                  <img
                    src={normalizedAvatarURL}
                    alt={`Avatar ${index + 1}`}
                    className="w-full h-full object-cover"
                    decoding="async"
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

      {/* Website Font */}
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
                onClick={() => onSelectFont(font.id)}
                disabled={disabled}
                className={`flex flex-col text-left p-3 rounded-xl border transition-[border-color,box-shadow,background-color] duration-150 cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'bg-white border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                    : 'bg-white/80 border-purple-100 hover:border-purple-300 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-1 w-full mb-1">
                  <span
                    className="text-xs font-bold text-gray-900 truncate"
                    style={{ fontFamily: font.fontFamily }}
                  >
                    {font.name}{' '}
                    <span className="text-[11px] font-medium text-gray-500">({font.nameThai})</span>
                  </span>
                  {isSelected && (
                    <div className="h-4 w-4 bg-purple-600 rounded-full flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>
                <p
                  className="text-[11px] text-gray-600 leading-snug"
                  style={{ fontFamily: font.fontFamily }}
                >
                  {font.previewText}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Color Style */}
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
          <button
            type="button"
            onClick={() => onSelectGradientMode('solid')}
            disabled={disabled}
            className={`flex flex-col text-left p-3.5 rounded-xl border transition-[border-color,box-shadow,background-color] duration-150 cursor-pointer relative overflow-hidden ${
              selectedGradientMode === 'solid'
                ? 'bg-white border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                : 'bg-white/80 border-purple-100 hover:border-purple-300 hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between gap-1.5 w-full mb-1">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-purple-600 border border-purple-400 shrink-0 shadow-2xs" />
                <span className="text-xs sm:text-sm font-extrabold text-gray-900">Solid Color</span>
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

          <button
            type="button"
            onClick={() => onSelectGradientMode('gradient')}
            disabled={disabled}
            className={`flex flex-col text-left p-3.5 rounded-xl border transition-[border-color,box-shadow,background-color] duration-150 cursor-pointer relative overflow-hidden ${
              selectedGradientMode === 'gradient'
                ? 'bg-white border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                : 'bg-white/80 border-purple-100 hover:border-purple-300 hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between gap-1.5 w-full mb-1">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full shrink-0 shadow-2xs"
                  style={{
                    backgroundImage: 'linear-gradient(to right, #9333ea, #ec4899, #fbbf24)',
                  }}
                />
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

      {/* Sound Effects */}
      <div className="p-4 rounded-2xl bg-purple-100/60 border border-purple-200/90 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-extrabold text-purple-900 uppercase tracking-wider flex items-center gap-1.5 min-w-0">
            {selectedSoundTheme === 'off' ? (
              <VolumeX className="w-4 h-4 text-purple-700 flex-shrink-0" />
            ) : (
              <Volume2 className="w-4 h-4 text-purple-700 flex-shrink-0" />
            )}
            <span className="truncate">Sound Effects</span>
          </label>
          <span className="text-[11px] font-semibold text-purple-700 bg-white px-2 py-0.5 rounded-md border border-purple-200/80 flex-shrink-0 whitespace-nowrap">
            Click to preview
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {SOUND_THEMES.map((sound) => {
            const isSelected = selectedSoundTheme === sound.id;
            return (
              <button
                key={sound.id}
                type="button"
                data-sound="none"
                onClick={() => onSelectSoundTheme(sound.id)}
                disabled={disabled}
                className={`flex flex-col text-left p-3 rounded-xl border transition-[border-color,box-shadow,background-color] duration-150 cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'bg-white border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                    : 'bg-white/80 border-purple-100 hover:border-purple-300 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 w-full mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs sm:text-sm font-extrabold text-gray-900 truncate">
                      {sound.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 ${
                        sound.id === 'off'
                          ? 'bg-gray-100 text-gray-600 border-gray-200'
                          : 'bg-purple-50 text-purple-700 border-purple-200/80'
                      }`}
                    >
                      {sound.badge}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="h-4 w-4 bg-purple-600 rounded-full flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 font-medium leading-tight">
                  {sound.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Sound Volume Slider + Quick Presets */}
        {selectedSoundTheme !== 'off' && (
          <div className="pt-2.5 border-t border-purple-200/75 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="settings-sound-volume"
                className="text-xs font-bold text-purple-900 flex items-center gap-1.5"
              >
                <span>Volume</span>
                <span className="px-1.5 py-0.5 rounded-md bg-white border border-purple-200/80 text-[11px] font-extrabold text-purple-700 tabular-nums">
                  {selectedSoundVolume}%
                </span>
              </label>

              <div className="flex items-center gap-1">
                {[
                  { label: 'Soft', value: 40 },
                  { label: 'Medium', value: 75 },
                  { label: 'Loud', value: 100 },
                ].map((preset) => {
                  const isActive = Math.abs(selectedSoundVolume - preset.value) <= 5;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      data-sound="none"
                      disabled={disabled}
                      onClick={() => onSelectSoundVolume(preset.value, true)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition ${
                        isActive
                          ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                          : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Volume2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <input
                id="settings-sound-volume"
                type="range"
                min={10}
                max={100}
                step={5}
                value={selectedSoundVolume}
                disabled={disabled}
                onChange={(e) => onSelectSoundVolume(Number(e.target.value), false)}
                onPointerUp={(e) =>
                  onSelectSoundVolume(Number((e.target as HTMLInputElement).value), true)
                }
                onKeyUp={(e) =>
                  onSelectSoundVolume(Number((e.target as HTMLInputElement).value), true)
                }
                className="flex-1 h-2 rounded-full accent-purple-600 cursor-pointer bg-white/90"
              />
              <Volume2 className="w-4 h-4 text-purple-700 shrink-0" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
