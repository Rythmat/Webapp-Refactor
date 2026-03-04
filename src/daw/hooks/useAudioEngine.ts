import { useCallback, useState, useRef } from 'react';
import { audioEngine } from '@/daw/audio/AudioEngine';

// ── useAudioEngine ──────────────────────────────────────────────────────
// Initialises the Tone.js audio context on first user interaction.
// Call `initEngine()` from a click / keydown handler to satisfy the
// browser autoplay policy.

export function useAudioEngine() {
  const [isReady, setIsReady] = useState(false);
  const initPromise = useRef<Promise<void> | null>(null);

  const initEngine = useCallback(async () => {
    if (audioEngine.getIsInitialized()) {
      setIsReady(true);
      return;
    }
    if (!initPromise.current) {
      initPromise.current = audioEngine.init();
    }
    await initPromise.current;
    setIsReady(true);
  }, []);

  return { isReady, initEngine, audioEngine };
}
