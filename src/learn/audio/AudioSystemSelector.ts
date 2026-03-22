// ── AudioSystemSelector ──────────────────────────────────────────────────
// Feature flag for switching between v1 and v2 audio detection systems.
//
// Usage:
//   localStorage.setItem('audio-system-v2', 'true')  → enable v2
//   localStorage.setItem('audio-system-v2', 'false') → force v1
//   localStorage.removeItem('audio-system-v2')       → use default (v1)
//
// Rollback: setting to 'false' instantly reverts to v1. No data migration.

const STORAGE_KEY = 'audio-system-v2';

export type AudioSystemVersion = 'v1' | 'v2';

/** Read the audio system version from localStorage. Default: 'v1'. */
export function getAudioSystemVersion(): AudioSystemVersion {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true' || stored === 'v2') return 'v2';
    return 'v1';
  } catch {
    return 'v1';
  }
}

/** Set the audio system version. */
export function setAudioSystemVersion(version: AudioSystemVersion): void {
  try {
    if (version === 'v2') {
      localStorage.setItem(STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage may be unavailable
  }
}

/** Check if v2 is enabled. */
export function isV2Enabled(): boolean {
  return getAudioSystemVersion() === 'v2';
}
