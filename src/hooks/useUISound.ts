import { useCallback } from 'react';
import { playSound, type SoundName } from '@/lib/uiSounds';

/**
 * Hook for playing UI sound effects.
 *
 * Usage:
 * ```tsx
 * const { play } = useUISound();
 * <button onClick={() => { play('click'); doSomething(); }}>Click</button>
 * ```
 */
export function useUISound() {
  const play = useCallback((name: SoundName) => {
    playSound(name);
  }, []);

  return { play };
}
