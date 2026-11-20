import { useEffect } from 'react';
import {
  resolveAutoInteractiveSound,
  triggerAutoInteractiveSound,
  unlockAudioContext,
} from '@/utils/audio';

/**
 * Global zero-render audio manager:
 * 1. Unlocks the singleton Web AudioContext on the first user gesture (crucial on iPadOS/iOS & Android).
 * 2. Listens in CAPTURE phase so clicks inside portaled modals with `e.stopPropagation()`
 *    (like Deadline Calendar, Month/Year Picker, ConfirmDialog) are NEVER swallowed.
 * 3. Defers the generic tap/switch sound by 0ms so React's synchronous `onClick` runs first;
 *    if a dedicated semantic sound (success/check/star/delete/action) fired, the generic click backs off automatically.
 */
export function GlobalSoundEffects() {
  useEffect(() => {
    const handleUnlock = () => {
      unlockAudioContext();
    };

    const handleClickCapture = (e: MouseEvent) => {
      if (e.button !== 0) return;
      unlockAudioContext();

      const soundKind = resolveAutoInteractiveSound(e.target);
      if (!soundKind) return;

      window.setTimeout(() => {
        triggerAutoInteractiveSound(soundKind);
      }, 0);
    };

    window.addEventListener('pointerdown', handleUnlock, { capture: true, passive: true });
    window.addEventListener('keydown', handleUnlock, { capture: true, passive: true });
    window.addEventListener('click', handleClickCapture, { capture: true });

    return () => {
      window.removeEventListener('pointerdown', handleUnlock, { capture: true });
      window.removeEventListener('keydown', handleUnlock, { capture: true });
      window.removeEventListener('click', handleClickCapture, { capture: true });
    };
  }, []);

  return null;
}

export default GlobalSoundEffects;
