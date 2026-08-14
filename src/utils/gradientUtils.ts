export type GradientMode = 'solid' | 'gradient';

export const DEFAULT_GRADIENT_MODE: GradientMode = 'gradient';

export const getStoredGradientMode = (): GradientMode => {
  if (typeof window === 'undefined') return DEFAULT_GRADIENT_MODE;
  const stored = localStorage.getItem('app_gradient_mode');
  if (stored === 'solid' || stored === 'gradient') {
    return stored;
  }
  return DEFAULT_GRADIENT_MODE;
};

export const applyGradientMode = (mode: GradientMode) => {
  if (typeof document === 'undefined') return;
  const validMode: GradientMode = mode === 'solid' ? 'solid' : 'gradient';
  document.documentElement.setAttribute('data-gradient-mode', validMode);
  localStorage.setItem('app_gradient_mode', validMode);
};
