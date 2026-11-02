const CORTEX_FLAG_KEY = 'learn-cortex';

/**
 * The Cortex on Learn's own page waits behind a flag until the owner has tried
 * it: on in development, and in one browser with
 *   localStorage.setItem('learn-cortex', 'true')  → show it
 *   localStorage.removeItem('learn-cortex')       → hide it again
 * Capture runs either way, so the map isn't empty on the day it appears.
 */
export function isCortexEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  try {
    return localStorage.getItem(CORTEX_FLAG_KEY) === 'true';
  } catch {
    return false;
  }
}
