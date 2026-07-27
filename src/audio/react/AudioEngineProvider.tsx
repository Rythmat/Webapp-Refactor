import { createContext, useEffect, type ReactNode } from 'react';
import { audioEngine } from '../AudioEngine';

/**
 * Hands the engine singleton to the tree. It holds no audio state of its own —
 * this app mounts a separate <AppContext> per top-level route branch, so a
 * provider that *owned* the engine would tear it down every time you navigated
 * between Studio, Arcade and Learn. The engine outlives all of them; this
 * component only publishes a reference and wires app-level lifecycle.
 */
export const AudioEngineContext = createContext(audioEngine);

export function AudioEngineProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Browsers keep a fresh AudioContext suspended until the page has user
    // activation. Rather than making every feature remember to resume, we lift
    // it once on the first interaction anywhere in the app.
    const unlock = () => audioEngine.resume();
    const opts = { passive: true } as const;
    window.addEventListener('pointerdown', unlock, opts);
    window.addEventListener('keydown', unlock, opts);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  return (
    <AudioEngineContext.Provider value={audioEngine}>
      {children}
    </AudioEngineContext.Provider>
  );
}
