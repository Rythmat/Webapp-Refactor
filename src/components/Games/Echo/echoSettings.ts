import { useCallback, useSyncExternalStore } from 'react';
import type { EchoLevelNumber } from '@/curriculum/engine/echo';

// ── Game Settings, remembered on this device ───────────────────────────────
// What the student set in Echo's Game Settings, in localStorage (every read
// and write wrapped, so private browsing just forgets):
//
//   input        Pads or Keyboard. Left unset, each level's default: Pads
//                at Level 1, Keyboard from Level 2 (docs/echo-game.md,
//                Input and views). Once the student picks one it stays.
//   groove       the drum groove under the music, on unless turned off
//   scaffolding  Make Your Song's training wheels (Auto-Tune Melody, Roots
//                Only Chords, Auto Fill Bars), all off unless turned on
//
// The view (roll, staff or falling notes) is the app's own Learn view
// (lib/notation useRollView), so it follows the student between Echo and
// Music Literacy.

export type EchoInputMode = 'pads' | 'keyboard';

export interface EchoScaffoldingSettings {
  autoTune: boolean;
  rootsOnly: boolean;
  autoFill: boolean;
}

export interface EchoSettings {
  /** The input picked in Game Settings; null: the level's default. */
  input: EchoInputMode | null;
  /** The drum groove plays under the calls and answers. */
  groove: boolean;
  scaffolding: EchoScaffoldingSettings;
}

export const ECHO_SETTINGS_KEY = 'echo_game_settings';

export const DEFAULT_ECHO_SETTINGS: EchoSettings = {
  input: null,
  groove: true,
  scaffolding: { autoTune: false, rootsOnly: false, autoFill: false },
};

/** Pads at Level 1, where the beginner starts; the keyboard after. */
export const defaultInputFor = (level: EchoLevelNumber): EchoInputMode =>
  level === 1 ? 'pads' : 'keyboard';

/** The input a level plays with: the student's pick, else its default. */
export const inputFor = (
  settings: EchoSettings,
  level: EchoLevelNumber,
): EchoInputMode => settings.input ?? defaultInputFor(level);

const bool = (value: unknown, fallback: boolean) =>
  typeof value === 'boolean' ? value : fallback;

/** Saved settings read back (JSON already parsed); anything odd, the default. */
export function parseEchoSettings(raw: unknown): EchoSettings {
  if (!raw || typeof raw !== 'object') return DEFAULT_ECHO_SETTINGS;
  const value = raw as Record<string, unknown>;
  const scaffolding = (value.scaffolding ?? {}) as Record<string, unknown>;
  const fallback = DEFAULT_ECHO_SETTINGS.scaffolding;
  return {
    input:
      value.input === 'pads' || value.input === 'keyboard' ? value.input : null,
    groove: bool(value.groove, DEFAULT_ECHO_SETTINGS.groove),
    scaffolding: {
      autoTune: bool(scaffolding.autoTune, fallback.autoTune),
      rootsOnly: bool(scaffolding.rootsOnly, fallback.rootsOnly),
      autoFill: bool(scaffolding.autoFill, fallback.autoFill),
    },
  };
}

function read(): EchoSettings {
  try {
    const raw = localStorage.getItem(ECHO_SETTINGS_KEY);
    return raw ? parseEchoSettings(JSON.parse(raw)) : DEFAULT_ECHO_SETTINGS;
  } catch {
    return DEFAULT_ECHO_SETTINGS;
  }
}

let current: EchoSettings | null = null;
const listeners = new Set<() => void>();

/** The settings now (read from the device once, then kept). */
export function getEchoSettings(): EchoSettings {
  current ??= read();
  return current;
}

/** Change some settings, and remember them on the device. */
export function updateEchoSettings(
  change: Partial<Omit<EchoSettings, 'scaffolding'>> & {
    scaffolding?: Partial<EchoScaffoldingSettings>;
  },
): void {
  const before = getEchoSettings();
  current = {
    ...before,
    ...change,
    scaffolding: { ...before.scaffolding, ...change.scaffolding },
  };
  try {
    localStorage.setItem(ECHO_SETTINGS_KEY, JSON.stringify(current));
  } catch {
    // Storage full or private browsing: kept for this visit only.
  }
  listeners.forEach((listener) => listener());
}

/** Forget the settings held in memory (a test, or another tab's change). */
export function resetEchoSettingsCache(): void {
  current = null;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Game Settings, and the way to change them. */
export function useEchoSettings(): [EchoSettings, typeof updateEchoSettings] {
  const settings = useSyncExternalStore(
    subscribe,
    getEchoSettings,
    getEchoSettings,
  );
  const update = useCallback(
    (change: Parameters<typeof updateEchoSettings>[0]) =>
      updateEchoSettings(change),
    [],
  );
  return [settings, update];
}
