/**
 * practiceSettingsStore.ts — Module-level store for the Learn practice controls.
 *
 * Holds the two settings that apply to every Learn surface (theory mode
 * lessons, fundamentals, genre courses): whether the metronome clicks, and an
 * optional tempo override. Persists to localStorage so a tempo you dialled in
 * for one scale is still there for the next one.
 *
 * Deliberately a module-level store rather than context: the same value has to
 * reach three surfaces with three different playback engines, and each of them
 * mounts its own activity components.
 *
 * TEMPO
 * `null` means "use whatever tempo this activity defines" — 80 BPM for theory
 * activities, the flow's own tempo for genre lessons. Only an explicit number
 * overrides it, so clearing the override always returns an activity to the
 * tempo its content was written for.
 */

const STORAGE_KEY = 'learn-practice-settings';

/** Slowest and fastest the tempo control will go. */
export const MIN_PRACTICE_BPM = 40;
export const MAX_PRACTICE_BPM = 160;

export interface PracticeSettings {
  metronomeEnabled: boolean;
  /** Explicit BPM, or null to follow the activity's own tempo. */
  tempoBpm: number | null;
}

const DEFAULTS: PracticeSettings = {
  metronomeEnabled: true,
  tempoBpm: null,
};

export function clampBpm(bpm: number): number {
  return Math.max(
    MIN_PRACTICE_BPM,
    Math.min(MAX_PRACTICE_BPM, Math.round(bpm)),
  );
}

function readInitial(): PracticeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<PracticeSettings>;
    return {
      metronomeEnabled:
        typeof parsed.metronomeEnabled === 'boolean'
          ? parsed.metronomeEnabled
          : DEFAULTS.metronomeEnabled,
      tempoBpm:
        typeof parsed.tempoBpm === 'number' && Number.isFinite(parsed.tempoBpm)
          ? clampBpm(parsed.tempoBpm)
          : null,
    };
  } catch {
    return DEFAULTS;
  }
}

let current: PracticeSettings = readInitial();
const listeners = new Set<() => void>();

function commit(next: PracticeSettings): void {
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage may be unavailable; the in-memory value still applies.
  }
  for (const cb of listeners) cb();
}

export function getPracticeSettings(): PracticeSettings {
  return current;
}

export function subscribePracticeSettings(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function setMetronomeEnabled(enabled: boolean): void {
  if (current.metronomeEnabled === enabled) return;
  commit({ ...current, metronomeEnabled: enabled });
}

/** Pass null to go back to the activity's own tempo. */
export function setTempoBpm(bpm: number | null): void {
  const next = bpm === null ? null : clampBpm(bpm);
  if (current.tempoBpm === next) return;
  commit({ ...current, tempoBpm: next });
}

/** The tempo an activity should actually run at. */
export function resolveTempo(activityDefaultBpm: number): number {
  return current.tempoBpm ?? activityDefaultBpm;
}
