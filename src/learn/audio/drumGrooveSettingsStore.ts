/**
 * drumGrooveSettingsStore.ts — Module-level store for the play-along drums.
 *
 * Music Literacy's Settings let a student (or a teacher running the class)
 * play a step over a drum groove instead of the bare metronome. Kept here,
 * beside the other Learn practice settings and the same way
 * (practiceSettingsStore.ts): a module-level value persisted to
 * localStorage, so the groove you chose is still chosen on the next step,
 * the next lesson and after a reload, on this device.
 *
 *   grooveId  the groove's id, or null for none (the metronome alone)
 *   click     whether the metronome keeps clicking past the count-in over
 *             the drums; off by default, the drums keep time
 *   volume    the drums' level, 0..1, under the lesson volume
 *
 * An id that no longer names a live 4/4 groove (unpublished, deleted) is
 * kept, and plays as none; publish it again and it's back.
 */

const STORAGE_KEY = 'learn-drum-groove';

export interface DrumGrooveSettings {
  grooveId: string | null;
  click: boolean;
  volume: number;
}

export const DEFAULT_DRUMS_VOLUME = 0.7;

const DEFAULTS: DrumGrooveSettings = {
  grooveId: null,
  click: false,
  volume: DEFAULT_DRUMS_VOLUME,
};

const clampVolume = (v: number) => Math.max(0, Math.min(1, v));

function readInitial(): DrumGrooveSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<DrumGrooveSettings>;
    return {
      grooveId:
        typeof parsed.grooveId === 'string' && parsed.grooveId
          ? parsed.grooveId
          : null,
      click: typeof parsed.click === 'boolean' ? parsed.click : DEFAULTS.click,
      volume:
        typeof parsed.volume === 'number' && Number.isFinite(parsed.volume)
          ? clampVolume(parsed.volume)
          : DEFAULTS.volume,
    };
  } catch {
    return DEFAULTS;
  }
}

let current: DrumGrooveSettings = readInitial();
const listeners = new Set<() => void>();

function commit(next: DrumGrooveSettings): void {
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage may be unavailable; the in-memory value still applies.
  }
  for (const cb of listeners) cb();
}

export function getDrumGrooveSettings(): DrumGrooveSettings {
  return current;
}

export function subscribeDrumGrooveSettings(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Pass null for no groove: the metronome alone. */
export function setDrumGrooveId(grooveId: string | null): void {
  if (current.grooveId === grooveId) return;
  commit({ ...current, grooveId });
}

export function setDrumGrooveClick(click: boolean): void {
  if (current.click === click) return;
  commit({ ...current, click });
}

export function setDrumsVolume(volume: number): void {
  const next = clampVolume(volume);
  if (current.volume === next) return;
  commit({ ...current, volume: next });
}
