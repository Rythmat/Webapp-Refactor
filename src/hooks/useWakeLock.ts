import { useEffect, useState } from 'react';

/**
 * Keep the screen awake.
 *
 * A player reads a chart for three minutes without touching the glass, and a
 * phone's idle timer does not know that. Held only while `active`, released
 * the moment it is not, because a lock left on flattens a battery.
 *
 * The lock is dropped by the browser whenever the tab is hidden — switching
 * apps, locking the phone — so it is re-taken on visibilitychange. Safari
 * below 16.4 and any non-secure origin simply have no wakeLock; that is not
 * an error, it just means the screen may dim.
 */

interface WakeLockSentinel {
  release: () => Promise<void>;
  addEventListener: (type: 'release', listener: () => void) => void;
}

type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> };
};

export function useWakeLock(active: boolean): { held: boolean } {
  const [held, setHeld] = useState(false);

  useEffect(() => {
    const api = (navigator as WakeLockNavigator).wakeLock;
    if (!active || !api) {
      setHeld(false);
      return;
    }

    let sentinel: WakeLockSentinel | null = null;
    let dropped = false;

    const take = async () => {
      if (dropped || document.visibilityState !== 'visible') return;
      try {
        sentinel = await api.request('screen');
        if (dropped) {
          void sentinel.release();
          return;
        }
        setHeld(true);
        sentinel.addEventListener('release', () => setHeld(false));
      } catch {
        // Denied (battery saver, no user gesture, insecure origin). The stand
        // still works; the screen may just dim.
        setHeld(false);
      }
    };

    // A hidden tab loses the lock, so it is taken again on the way back.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void take();
    };

    void take();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      dropped = true;
      document.removeEventListener('visibilitychange', onVisible);
      setHeld(false);
      void sentinel?.release().catch(() => {
        /* already gone */
      });
      sentinel = null;
    };
  }, [active]);

  return { held };
}
