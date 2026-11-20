export type SoundTheme = 'bubble' | 'crisp' | 'arcade' | 'off';

export interface SoundThemeOption {
  id: SoundTheme;
  name: string;
  description: string;
  badge: string;
}

export const SOUND_THEMES: SoundThemeOption[] = [
  {
    id: 'bubble',
    name: 'Soft Bubble',
    description: 'Cozy rounded pops & warm chime bells (Default)',
    badge: 'Warm',
  },
  {
    id: 'crisp',
    name: 'Crisp Minimal',
    description: 'Clean tactile clicks & airy glass pings',
    badge: 'Focus',
  },
  {
    id: 'arcade',
    name: 'Playful Chime',
    description: 'Bright marimba plucks & cheerful chord rewards',
    badge: 'Upbeat',
  },
  {
    id: 'off',
    name: 'Muted',
    description: 'Silence all click and action sound effects',
    badge: 'Silent',
  },
];

const SOUND_THEME_STORAGE_KEY = 'app_sound_theme';
const SOUND_VOLUME_STORAGE_KEY = 'app_sound_volume';
const DEFAULT_SOUND_VOLUME = 75;
const VALID_THEMES = new Set<SoundTheme>(['bubble', 'crisp', 'arcade', 'off']);

let sharedAudioCtx: AudioContext | null = null;
let activeSoundTheme: SoundTheme = 'bubble';
let activeSoundVolume: number = DEFAULT_SOUND_VOLUME;
let lastSemanticSoundAt = 0;
let lastAutoSoundAt = 0;

const isValidSoundTheme = (val: unknown): val is SoundTheme => {
  return typeof val === 'string' && VALID_THEMES.has(val as SoundTheme);
};

const clampVolume = (val: unknown): number => {
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(num)) return DEFAULT_SOUND_VOLUME;
  return Math.max(10, Math.min(100, Math.round(num)));
};

export const getStoredSoundTheme = (): SoundTheme => {
  try {
    const raw = localStorage.getItem(SOUND_THEME_STORAGE_KEY);
    if (isValidSoundTheme(raw)) return raw;
  } catch {
    // Ignore storage restrictions
  }
  return 'bubble';
};

export const getStoredSoundVolume = (): number => {
  try {
    const raw = localStorage.getItem(SOUND_VOLUME_STORAGE_KEY);
    if (raw !== null) return clampVolume(raw);
  } catch {
    // Ignore storage restrictions
  }
  return DEFAULT_SOUND_VOLUME;
};

export const getActiveSoundTheme = (): SoundTheme => activeSoundTheme;
export const getActiveSoundVolume = (): number => activeSoundVolume;

export const applySoundTheme = (theme?: string | null, persist = true): SoundTheme => {
  const resolved: SoundTheme = isValidSoundTheme(theme) ? theme : 'bubble';
  activeSoundTheme = resolved;
  if (persist) {
    try {
      localStorage.setItem(SOUND_THEME_STORAGE_KEY, resolved);
    } catch {
      // Ignore storage restrictions
    }
  }
  return resolved;
};

export const applySoundVolume = (volume?: number | null, persist = true): number => {
  const resolved = volume === undefined || volume === null ? DEFAULT_SOUND_VOLUME : clampVolume(volume);
  activeSoundVolume = resolved;
  if (persist) {
    try {
      localStorage.setItem(SOUND_VOLUME_STORAGE_KEY, String(resolved));
    } catch {
      // Ignore storage restrictions
    }
  }
  return resolved;
};

// Initialize from storage immediately on module load
activeSoundTheme = getStoredSoundTheme();
activeSoundVolume = getStoredSoundVolume();

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioCtx();
  }
  return sharedAudioCtx;
};

/**
 * Unlock/resume the singleton AudioContext inside a user gesture
 * (required for reliable zero-latency audio on iPadOS/iOS Safari & Android Chrome).
 */
export const unlockAudioContext = () => {
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => undefined);
    }
  } catch {
    // Ignore audio context errors
  }
};

interface ToneSpec {
  type: OscillatorType;
  freqStart: number;
  freqEnd?: number;
  delay?: number;
  duration: number;
  gain: number;
  attack?: number;
  lowpassFreq?: number;
}

const scheduleTones = (tones: ToneSpec[], overrideTheme?: SoundTheme) => {
  const theme = overrideTheme ?? activeSoundTheme;
  if (theme === 'off') return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const run = () => {
      // Volume multiplier: 10% -> 0.24x, 50% -> 1.15x, 75% (default) -> 1.72x, 100% -> 2.3x (crisp on mobile speakers)
      const volumeScale = (activeSoundVolume / 100) * 2.3;
      const now = ctx.currentTime + 0.004;
      for (const spec of tones) {
        const start = now + (spec.delay || 0);
        const end = start + spec.duration;
        const attack = Math.min(spec.attack ?? 0.006, spec.duration * 0.35);
        const scaledGain = Math.min(0.42, Math.max(0.002, spec.gain * volumeScale));

        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = spec.type;
        osc.frequency.setValueAtTime(spec.freqStart, start);
        if (spec.freqEnd && spec.freqEnd !== spec.freqStart) {
          osc.frequency.exponentialRampToValueAtTime(Math.max(40, spec.freqEnd), end);
        }

        // Smooth attack & natural decay curve for gentle, clearly audible tone on all speakers
        gainNode.gain.setValueAtTime(0.001, start);
        gainNode.gain.linearRampToValueAtTime(scaledGain, start + attack);
        gainNode.gain.exponentialRampToValueAtTime(0.001, end);

        if (spec.lowpassFreq) {
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(spec.lowpassFreq, start);
          osc.connect(filter);
          filter.connect(gainNode);
        } else {
          osc.connect(gainNode);
        }

        gainNode.connect(ctx.destination);
        osc.start(start);
        osc.stop(end + 0.02);
      }
    };

    if (ctx.state === 'suspended') {
      ctx
        .resume()
        .then(run)
        .catch(() => undefined);
    } else {
      run();
    }
  } catch {
    // Never let audio playback disrupt UI interactions
  }
};

const markSemanticSound = () => {
  lastSemanticSoundAt = performance.now();
};

/** Gentle tactile tap for standard buttons, calendar day cells, and filter pills */
export const playTapSound = (overrideTheme?: SoundTheme) => {
  const theme = overrideTheme ?? activeSoundTheme;
  if (theme === 'off') return;

  if (theme === 'crisp') {
    scheduleTones(
      [
        {
          type: 'triangle',
          freqStart: 1200,
          freqEnd: 600,
          duration: 0.05,
          gain: 0.085,
          attack: 0.003,
          lowpassFreq: 3000,
        },
      ],
      theme
    );
    return;
  }

  if (theme === 'arcade') {
    scheduleTones(
      [
        {
          type: 'triangle',
          freqStart: 640,
          freqEnd: 860,
          duration: 0.062,
          gain: 0.09,
          attack: 0.004,
          lowpassFreq: 3400,
        },
      ],
      theme
    );
    return;
  }

  // 'bubble' (default — gentle warm bubble pop)
  scheduleTones(
    [
      {
        type: 'sine',
        freqStart: 680,
        freqEnd: 410,
        duration: 0.062,
        gain: 0.09,
        attack: 0.004,
        lowpassFreq: 2200,
      },
      {
        type: 'triangle',
        freqStart: 1360,
        freqEnd: 820,
        duration: 0.038,
        gain: 0.024,
        attack: 0.003,
        lowpassFreq: 2800,
      },
    ],
    theme
  );
};

/** Crisp soft switch tick for tabs, toggles, dropdowns, Month/Week, Prev/Next, and List/Table */
export const playSwitchSound = (overrideTheme?: SoundTheme) => {
  const theme = overrideTheme ?? activeSoundTheme;
  if (theme === 'off') return;

  if (theme === 'crisp') {
    scheduleTones(
      [
        {
          type: 'triangle',
          freqStart: 1420,
          freqEnd: 840,
          duration: 0.055,
          gain: 0.09,
          attack: 0.003,
          lowpassFreq: 3400,
        },
      ],
      theme
    );
    return;
  }

  if (theme === 'arcade') {
    scheduleTones(
      [
        { type: 'triangle', freqStart: 587.33, duration: 0.06, gain: 0.085, attack: 0.004 },
        {
          type: 'sine',
          freqStart: 880,
          delay: 0.03,
          duration: 0.068,
          gain: 0.08,
          attack: 0.004,
        },
      ],
      theme
    );
    return;
  }

  // 'bubble' (gentle upward bubble flick)
  scheduleTones(
    [
      {
        type: 'sine',
        freqStart: 540,
        freqEnd: 880,
        duration: 0.068,
        gain: 0.09,
        attack: 0.004,
      },
      {
        type: 'triangle',
        freqStart: 1080,
        freqEnd: 1580,
        duration: 0.045,
        gain: 0.024,
        attack: 0.003,
      },
    ],
    theme
  );
};

/** Upbeat mini-pop for checking a single subtask or incrementing habit progress */
export const playCheckSound = (overrideTheme?: SoundTheme) => {
  markSemanticSound();
  const theme = overrideTheme ?? activeSoundTheme;
  if (theme === 'off') return;

  if (theme === 'crisp') {
    scheduleTones(
      [
        { type: 'sine', freqStart: 783.99, duration: 0.09, gain: 0.095, attack: 0.005 },
        { type: 'sine', freqStart: 1174.66, delay: 0.045, duration: 0.12, gain: 0.085, attack: 0.005 },
      ],
      theme
    );
    return;
  }

  if (theme === 'arcade') {
    scheduleTones(
      [
        { type: 'triangle', freqStart: 587.33, duration: 0.08, gain: 0.1, attack: 0.004 },
        { type: 'triangle', freqStart: 880, delay: 0.05, duration: 0.13, gain: 0.095, attack: 0.005 },
      ],
      theme
    );
    return;
  }

  // 'bubble'
  scheduleTones(
    [
      {
        type: 'sine',
        freqStart: 540,
        freqEnd: 900,
        duration: 0.095,
        gain: 0.105,
        attack: 0.005,
      },
      {
        type: 'sine',
        freqStart: 1046.5,
        delay: 0.045,
        duration: 0.12,
        gain: 0.06,
        attack: 0.005,
      },
    ],
    theme
  );
};

/** Soft gentle descending tone for unchecking a task/subtask/habit or decrementing progress */
export const playUncheckSound = (overrideTheme?: SoundTheme) => {
  markSemanticSound();
  const theme = overrideTheme ?? activeSoundTheme;
  if (theme === 'off') return;

  if (theme === 'crisp') {
    scheduleTones(
      [
        {
          type: 'triangle',
          freqStart: 620,
          freqEnd: 370,
          duration: 0.085,
          gain: 0.085,
          attack: 0.004,
          lowpassFreq: 1900,
        },
      ],
      theme
    );
    return;
  }

  if (theme === 'arcade') {
    scheduleTones(
      [
        { type: 'triangle', freqStart: 523.25, duration: 0.07, gain: 0.085, attack: 0.004 },
        { type: 'triangle', freqStart: 392, delay: 0.045, duration: 0.095, gain: 0.078, attack: 0.004 },
      ],
      theme
    );
    return;
  }

  // 'bubble'
  scheduleTones(
    [
      {
        type: 'sine',
        freqStart: 550,
        freqEnd: 335,
        duration: 0.105,
        gain: 0.09,
        attack: 0.005,
      },
    ],
    theme
  );
};

/** Warm rewarding chord chime for completing a full Task, all Subtasks, or a Daily Habit */
export const playSuccessSound = (overrideTheme?: SoundTheme) => {
  markSemanticSound();
  const theme = overrideTheme ?? activeSoundTheme;
  if (theme === 'off') return;

  if (theme === 'crisp') {
    scheduleTones(
      [
        { type: 'sine', freqStart: 587.33, duration: 0.15, gain: 0.095, attack: 0.006 }, // D5
        { type: 'sine', freqStart: 880, delay: 0.07, duration: 0.22, gain: 0.1, attack: 0.006 }, // A5
        { type: 'sine', freqStart: 1174.66, delay: 0.13, duration: 0.28, gain: 0.075, attack: 0.008 }, // D6
      ],
      theme
    );
    return;
  }

  if (theme === 'arcade') {
    scheduleTones(
      [
        { type: 'triangle', freqStart: 523.25, duration: 0.11, gain: 0.1, attack: 0.005 }, // C5
        { type: 'triangle', freqStart: 659.25, delay: 0.065, duration: 0.13, gain: 0.1, attack: 0.005 }, // E5
        { type: 'triangle', freqStart: 783.99, delay: 0.13, duration: 0.16, gain: 0.1, attack: 0.005 }, // G5
        { type: 'sine', freqStart: 1046.5, delay: 0.19, duration: 0.3, gain: 0.095, attack: 0.008 }, // C6
      ],
      theme
    );
    return;
  }

  // 'bubble' (warm harmonic bell C5 -> E5 -> G5 + soft shimmer)
  scheduleTones(
    [
      { type: 'sine', freqStart: 523.25, duration: 0.16, gain: 0.105, attack: 0.007 }, // C5
      { type: 'sine', freqStart: 659.25, delay: 0.075, duration: 0.2, gain: 0.11, attack: 0.007 }, // E5
      { type: 'sine', freqStart: 783.99, delay: 0.145, duration: 0.28, gain: 0.1, attack: 0.008 }, // G5
      { type: 'sine', freqStart: 1567.98, delay: 0.145, duration: 0.22, gain: 0.032, attack: 0.01 }, // G6 sparkle
    ],
    theme
  );
};

/** Shimmering airy sparkle for starring/pinning a task */
export const playStarSound = (overrideTheme?: SoundTheme) => {
  markSemanticSound();
  const theme = overrideTheme ?? activeSoundTheme;
  if (theme === 'off') return;

  if (theme === 'crisp') {
    scheduleTones(
      [
        { type: 'sine', freqStart: 987.77, duration: 0.12, gain: 0.085, attack: 0.005 },
        { type: 'sine', freqStart: 1479.98, delay: 0.055, duration: 0.18, gain: 0.075, attack: 0.006 },
      ],
      theme
    );
    return;
  }

  if (theme === 'arcade') {
    scheduleTones(
      [
        { type: 'triangle', freqStart: 783.99, duration: 0.085, gain: 0.09, attack: 0.004 },
        { type: 'sine', freqStart: 1174.66, delay: 0.05, duration: 0.16, gain: 0.085, attack: 0.005 },
        { type: 'sine', freqStart: 1567.98, delay: 0.1, duration: 0.18, gain: 0.06, attack: 0.006 },
      ],
      theme
    );
    return;
  }

  // 'bubble'
  scheduleTones(
    [
      { type: 'sine', freqStart: 880, duration: 0.12, gain: 0.09, attack: 0.005 }, // A5
      { type: 'sine', freqStart: 1318.51, delay: 0.06, duration: 0.2, gain: 0.085, attack: 0.006 }, // E6
    ],
    theme
  );
};

/** Confident confirmation pop for creating, saving, moving, or duplicating */
export const playActionSound = (overrideTheme?: SoundTheme) => {
  markSemanticSound();
  const theme = overrideTheme ?? activeSoundTheme;
  if (theme === 'off') return;

  if (theme === 'crisp') {
    scheduleTones(
      [
        { type: 'sine', freqStart: 587.33, duration: 0.085, gain: 0.085, attack: 0.005 },
        { type: 'sine', freqStart: 880, delay: 0.048, duration: 0.13, gain: 0.085, attack: 0.005 },
      ],
      theme
    );
    return;
  }

  if (theme === 'arcade') {
    scheduleTones(
      [
        { type: 'triangle', freqStart: 440, duration: 0.075, gain: 0.095, attack: 0.004 },
        { type: 'triangle', freqStart: 659.25, delay: 0.048, duration: 0.14, gain: 0.095, attack: 0.005 },
      ],
      theme
    );
    return;
  }

  // 'bubble'
  scheduleTones(
    [
      {
        type: 'sine',
        freqStart: 460,
        freqEnd: 620,
        duration: 0.09,
        gain: 0.095,
        attack: 0.005,
      },
      {
        type: 'sine',
        freqStart: 698.46,
        delay: 0.052,
        duration: 0.14,
        gain: 0.09,
        attack: 0.005,
      },
    ],
    theme
  );
};

/** Subtle muted descending soft-thud for deleting or resetting items */
export const playDeleteSound = (overrideTheme?: SoundTheme) => {
  markSemanticSound();
  const theme = overrideTheme ?? activeSoundTheme;
  if (theme === 'off') return;

  if (theme === 'crisp') {
    scheduleTones(
      [
        {
          type: 'triangle',
          freqStart: 380,
          freqEnd: 165,
          duration: 0.12,
          gain: 0.095,
          attack: 0.004,
          lowpassFreq: 1100,
        },
      ],
      theme
    );
    return;
  }

  if (theme === 'arcade') {
    scheduleTones(
      [
        { type: 'triangle', freqStart: 440, freqEnd: 293.66, duration: 0.08, gain: 0.095, attack: 0.004 },
        {
          type: 'triangle',
          freqStart: 293.66,
          freqEnd: 174.61,
          delay: 0.058,
          duration: 0.11,
          gain: 0.085,
          attack: 0.004,
        },
      ],
      theme
    );
    return;
  }

  // 'bubble'
  scheduleTones(
    [
      {
        type: 'sine',
        freqStart: 360,
        freqEnd: 160,
        duration: 0.14,
        gain: 0.105,
        attack: 0.005,
        lowpassFreq: 1000,
      },
      {
        type: 'triangle',
        freqStart: 240,
        freqEnd: 125,
        duration: 0.11,
        gain: 0.045,
        attack: 0.005,
        lowpassFreq: 850,
      },
    ],
    theme
  );
};

/** Feather-light upward pluck when lifting a card during calendar drag */
export const playPickupSound = (overrideTheme?: SoundTheme) => {
  markSemanticSound();
  const theme = overrideTheme ?? activeSoundTheme;
  if (theme === 'off') return;

  scheduleTones(
    [
      {
        type: theme === 'arcade' ? 'triangle' : 'sine',
        freqStart: 460,
        freqEnd: 800,
        duration: 0.08,
        gain: 0.095,
        attack: 0.004,
      },
    ],
    theme
  );
};

/** Gentle tactile landing pop when dropping a dragged card onto a calendar date */
export const playDropSound = (overrideTheme?: SoundTheme) => {
  markSemanticSound();
  playSwitchSound(overrideTheme);
};

/** Soft polite double bump for error notifications */
export const playErrorSound = (overrideTheme?: SoundTheme) => {
  markSemanticSound();
  const theme = overrideTheme ?? activeSoundTheme;
  if (theme === 'off') return;

  scheduleTones(
    [
      {
        type: 'triangle',
        freqStart: 270,
        freqEnd: 215,
        duration: 0.09,
        gain: 0.09,
        attack: 0.005,
        lowpassFreq: 900,
      },
      {
        type: 'triangle',
        freqStart: 225,
        freqEnd: 170,
        delay: 0.09,
        duration: 0.12,
        gain: 0.085,
        attack: 0.005,
        lowpassFreq: 850,
      },
    ],
    theme
  );
};

/** Plays a short signature preview when selecting a sound theme in Settings */
export const playThemePreviewSound = (theme: SoundTheme) => {
  markSemanticSound();
  if (theme === 'off') return;
  playSuccessSound(theme);
};

/**
 * Inspect an event target during CAPTURE phase (before any modal `stopPropagation()` or unmount)
 * and return which automatic UI sound should play, or null if skipped.
 */
export const resolveAutoInteractiveSound = (
  target: EventTarget | null
): 'tap' | 'switch' | null => {
  if (activeSoundTheme === 'off') return null;
  if (!(target instanceof Element)) return null;

  const interactive = target.closest<HTMLElement>(
    'button, [role="button"], [role="tab"], [role="switch"], a[href], select, summary, input[type="checkbox"]'
  );
  if (!interactive) return null;

  // Skip disabled controls or elements explicitly opting out
  if (
    interactive.hasAttribute('disabled') ||
    interactive.getAttribute('aria-disabled') === 'true' ||
    interactive.dataset.sound === 'none' ||
    interactive.closest('[data-sound="none"]')
  ) {
    return null;
  }

  // Skip custom role="checkbox" buttons (they play semantic check/uncheck/success sounds directly)
  if (interactive.getAttribute('role') === 'checkbox') return null;

  if (interactive.dataset.sound === 'switch') {
    return 'switch';
  }

  const isSwitchLike =
    interactive.getAttribute('role') === 'tab' ||
    interactive.getAttribute('role') === 'switch' ||
    interactive.hasAttribute('aria-pressed') ||
    interactive.hasAttribute('aria-expanded') ||
    interactive.hasAttribute('aria-haspopup') ||
    interactive.tagName === 'SELECT' ||
    (interactive.tagName === 'INPUT' && (interactive as HTMLInputElement).type === 'checkbox');

  return isSwitchLike ? 'switch' : 'tap';
};

/**
 * Play the resolved auto interactive sound after React's synchronous click handler finishes,
 * backing off automatically if a higher-priority semantic sound already played.
 */
export const triggerAutoInteractiveSound = (kind: 'tap' | 'switch') => {
  if (activeSoundTheme === 'off') return;
  const now = performance.now();
  if (now - lastSemanticSoundAt < 150) return;
  if (now - lastAutoSoundAt < 45) return;

  lastAutoSoundAt = now;
  if (kind === 'switch') {
    playSwitchSound();
  } else {
    playTapSound();
  }
};
