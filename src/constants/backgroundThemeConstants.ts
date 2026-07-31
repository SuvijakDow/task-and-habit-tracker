import { BackgroundTheme } from '@/types';

export interface BackgroundThemePreset {
  id: string;
  name: string;
  gradientStart: string;
  gradientEnd: string;
  description: string;
}

export const BACKGROUND_THEME_PRESETS: BackgroundThemePreset[] = [
  {
    id: 'purple-pink',
    name: 'Purple-Pink',
    gradientStart: '#E9D5FF',
    gradientEnd: '#FBCFE8',
    description: 'Soft purple to pink gradient (default)',
  },
  {
    id: 'blue-cyan',
    name: 'Blue-Cyan',
    gradientStart: '#DBEAFE',
    gradientEnd: '#CFFAFE',
    description: 'Calm blue to cyan gradient',
  },
  {
    id: 'green-mint',
    name: 'Green-Mint',
    gradientStart: '#D1FAE5',
    gradientEnd: '#ECFCCB',
    description: 'Fresh green to mint gradient',
  },
  {
    id: 'orange-peach',
    name: 'Orange-Peach',
    gradientStart: '#FED7AA',
    gradientEnd: '#FECACA',
    description: 'Warm orange to peach gradient',
  },
  {
    id: 'rose-lavender',
    name: 'Rose-Lavender',
    gradientStart: '#FECDD3',
    gradientEnd: '#DDD6FE',
    description: 'Soft rose to lavender gradient',
  },
];

export const DEFAULT_BACKGROUND_THEME: BackgroundTheme = {
  type: 'preset',
  presetId: 'purple-pink',
};

export const getPresetThemeById = (id: string): BackgroundThemePreset | undefined => {
  return BACKGROUND_THEME_PRESETS.find((preset) => preset.id === id);
};

export const getBackgroundGradient = (theme: BackgroundTheme | undefined): string => {
  if (!theme) {
    const defaultPreset = getPresetThemeById(DEFAULT_BACKGROUND_THEME.presetId!);
    return `linear-gradient(135deg, ${defaultPreset?.gradientStart || '#E9D5FF'} 0%, ${defaultPreset?.gradientEnd || '#FBCFE8'} 100%)`;
  }

  if (theme.type === 'preset' && theme.presetId) {
    const preset = getPresetThemeById(theme.presetId);
    if (preset) {
      return `linear-gradient(135deg, ${preset.gradientStart} 0%, ${preset.gradientEnd} 100%)`;
    }
  }

  if (theme.type === 'custom-gradient' && theme.gradientStart && theme.gradientEnd) {
    return `linear-gradient(135deg, ${theme.gradientStart} 0%, ${theme.gradientEnd} 100%)`;
  }

  if (theme.type === 'custom-image' && theme.imageUrl) {
    return `url(${theme.imageUrl})`;
  }

  const defaultPreset = getPresetThemeById(DEFAULT_BACKGROUND_THEME.presetId!);
  return `linear-gradient(135deg, ${defaultPreset?.gradientStart || '#E9D5FF'} 0%, ${defaultPreset?.gradientEnd || '#FBCFE8'} 100%)`;
};
