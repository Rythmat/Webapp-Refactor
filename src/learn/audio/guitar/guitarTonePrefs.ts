/**
 * guitarTonePrefs.ts — How lesson guitar sounds, remembered on this device.
 *
 * 'amp' plays a plucked string through one of the Studio's guitar amps (NAM
 * models, listed by their Studio names); 'acoustic' is the GM steel string
 * with no amp. The guitar voice and the amp rig both follow this store, so a
 * change made in the tone menu applies to the next note.
 */

import { useSyncExternalStore } from 'react';
import {
  BUNDLED_MODELS,
  type NamModelEntry,
} from '@/daw/audio/nam/NamModelStore';
import type { GuitarTonePrefs } from './types';

const STORAGE_KEY = 'learn-guitar-tone-v1';

/** The Studio's guitar amps, in the Studio's order. */
export const GUITAR_AMP_MODELS: readonly NamModelEntry[] =
  BUNDLED_MODELS.filter((m) => m.forInstrument === 'guitar');

/** Quartz, the Studio's clean amp, through which lessons sound by default. */
export const DEFAULT_GUITAR_TONE_PREFS: GuitarTonePrefs = {
  tone: 'amp',
  ampModelId: 'nam-clean-twin',
};

const listeners = new Set<() => void>();

/** getSnapshot must return the same object until the stored value changes. */
let cachedRaw: string | null = null;
let cached: GuitarTonePrefs = DEFAULT_GUITAR_TONE_PREFS;

/** A choice storage refused (private mode, quota): kept for this session. */
let unsaved: string | null = null;

function readRaw(): string | null {
  if (unsaved !== null) return unsaved;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Stored prefs, with anything unknown (an amp since removed) set to default. */
function parse(raw: string | null): GuitarTonePrefs {
  if (raw === null) return DEFAULT_GUITAR_TONE_PREFS;
  try {
    const stored = JSON.parse(raw) as Partial<GuitarTonePrefs> | null;
    const amp = GUITAR_AMP_MODELS.find((m) => m.id === stored?.ampModelId);
    return {
      tone:
        stored?.tone === 'acoustic' || stored?.tone === 'amp'
          ? stored.tone
          : DEFAULT_GUITAR_TONE_PREFS.tone,
      ampModelId: amp?.id ?? DEFAULT_GUITAR_TONE_PREFS.ampModelId,
    };
  } catch {
    return DEFAULT_GUITAR_TONE_PREFS;
  }
}

export function getGuitarTonePrefs(): GuitarTonePrefs {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parse(raw);
  }
  return cached;
}

export function setGuitarTonePrefs(next: Partial<GuitarTonePrefs>): void {
  const current = getGuitarTonePrefs();
  const merged = parse(JSON.stringify({ ...current, ...next }));
  if (
    merged.tone === current.tone &&
    merged.ampModelId === current.ampModelId
  ) {
    return;
  }
  const raw = JSON.stringify(merged);
  try {
    localStorage.setItem(STORAGE_KEY, raw);
    unsaved = null;
  } catch {
    unsaved = raw;
  }
  listeners.forEach((listener) => listener());
}

/** Called after every change, from this tab or another. */
export function subscribeGuitarTonePrefs(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STORAGE_KEY) listener();
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage);
    }
  };
}

/** The tone prefs and their setter; re-renders when they change. */
export function useGuitarTonePrefs(): [
  GuitarTonePrefs,
  (next: Partial<GuitarTonePrefs>) => void,
] {
  const prefs = useSyncExternalStore(
    subscribeGuitarTonePrefs,
    getGuitarTonePrefs,
    () => DEFAULT_GUITAR_TONE_PREFS,
  );
  return [prefs, setGuitarTonePrefs];
}
