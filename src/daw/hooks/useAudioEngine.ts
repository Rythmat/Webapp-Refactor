import { useCallback, useEffect, useState, useRef } from 'react';
import { audioEngine } from '@/daw/audio/AudioEngine';

// ── useAudioEngine ──────────────────────────────────────────────────────
// Initialises the Tone.js audio context on first user interaction.
// Call `initEngine()` from a click / keydown handler to satisfy the
// browser autoplay policy.

export function useAudioEngine() {
  // The engine is an app-wide singleton that outlives the editor, so a return
  // to the editor starts ready: the track engines rebuild at once instead of
  // waiting for the next click (a MIDI note doesn't count as one).
  const [isReady, setIsReady] = useState(() => audioEngine.getIsInitialized());
  const initPromise = useRef<Promise<void> | null>(null);

  const initEngine = useCallback(async () => {
    if (audioEngine.getIsInitialized()) {
      setIsReady(true);
      return;
    }
    if (!initPromise.current) {
      // Forget a failed start so the next interaction can retry it.
      initPromise.current = audioEngine.init().catch((err: unknown) => {
        initPromise.current = null;
        throw err;
      });
    }
    await initPromise.current;
    setIsReady(true);
  }, []);

  return { isReady, initEngine, audioEngine };
}

/**
 * Start audio on the first click or key press anywhere on the page. The
 * listeners stay until the engine is ready, so a start that fails is logged
 * and retried on the next gesture (engine-hooks-23).
 */
export function useStartAudioOnGesture(
  isReady: boolean,
  initEngine: () => Promise<void>,
): void {
  useEffect(() => {
    if (isReady) return;
    const handler = () => {
      void initEngine().catch((err: unknown) => {
        console.warn(
          '[audio] Audio could not start; retrying on the next click or key press',
          err,
        );
      });
    };
    document.addEventListener('click', handler);
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('keydown', handler);
    };
  }, [isReady, initEngine]);
}
