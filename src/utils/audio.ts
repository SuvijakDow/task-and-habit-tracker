export const playSuccessSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      // Sine wave for a soft, pleasant bell sound
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      // Envelope to make it sound like a strike/chime
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02); // quick attack
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // fade out
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    // Play a quick two-note success chime (C5 -> E5)
    playTone(523.25, ctx.currentTime, 0.15); // C5
    playTone(659.25, ctx.currentTime + 0.1, 0.3); // E5
  } catch (e) {
    console.error('Audio playback failed', e);
  }
};
