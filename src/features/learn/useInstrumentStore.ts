import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LearnRoutes } from '@/constants/routes';
import type { LessonInstrument } from '@/curriculum/types/activity.v2';

// ── Learn instrument ───────────────────────────────────────────────────────
// Which instrument Learn teaches on this device. On guitar, Theory's tiles
// open guitar lessons (Ionian (Major) is The Guitar Atlas's key centers; see
// data/guitar/theoryCatalog) and the Technique tab is hidden; it also sets
// the guitar views' handedness. Device-level, like the saved-items and view
// preferences: a student may play guitar at school and piano at home.

export type LearnInstrument = LessonInstrument;

/** Every instrument the picker lists. */
export type InstrumentMenuId = LearnInstrument;

export interface InstrumentOption {
  id: InstrumentMenuId;
  label: string;
  available: boolean;
}

const GUITAR_FLAG_KEY = 'learn-guitar';

/**
 * Guitar is on for everyone (owner, 2026-10-24): it used to wait behind a
 * flag outside development, so the live site said "Coming soon". The flag
 * stays as an off switch for one browser:
 *   localStorage.setItem('learn-guitar', 'false') → hide Guitar's ways in
 *   localStorage.removeItem('learn-guitar')       → show them again
 * The guitar routes work either way; the flag only hides the way in.
 */
export function isGuitarLearnEnabled(): boolean {
  try {
    return localStorage.getItem(GUITAR_FLAG_KEY) !== 'false';
  } catch {
    return true;
  }
}

const BASS_FLAG_KEY = 'learn-bass';

/**
 * Bass (The Bass Atlas, started 2026-10-27) waits behind a flag until the
 * owner has played it through: on in development, and in one browser with
 *   localStorage.setItem('learn-bass', 'true')  → show Bass's ways in
 *   localStorage.removeItem('learn-bass')       → hide them again
 * The bass routes work either way; the flag only hides the way in.
 */
export function isBassLearnEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  try {
    return localStorage.getItem(BASS_FLAG_KEY) === 'true';
  } catch {
    return false;
  }
}

const UKULELE_FLAG_KEY = 'learn-ukulele';

/**
 * Ukulele (The Ukulele Atlas, started 2026-10-27) waits behind a flag until
 * the owner has played it through: on in development, and in one browser with
 *   localStorage.setItem('learn-ukulele', 'true')  → show Ukulele's ways in
 *   localStorage.removeItem('learn-ukulele')       → hide them again
 * The ukulele routes work either way; the flag only hides the way in.
 */
export function isUkuleleLearnEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  try {
    return localStorage.getItem(UKULELE_FLAG_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Whether an instrument's Learn pages are open on this device. */
export function isLearnInstrumentEnabled(instrument: LearnInstrument): boolean {
  if (instrument === 'guitar') return isGuitarLearnEnabled();
  if (instrument === 'bass') return isBassLearnEnabled();
  if (instrument === 'ukulele') return isUkuleleLearnEnabled();
  return true;
}

export function instrumentOptions(): InstrumentOption[] {
  return [
    { id: 'piano', label: 'Piano', available: true },
    { id: 'guitar', label: 'Guitar', available: isGuitarLearnEnabled() },
    { id: 'bass', label: 'Bass', available: isBassLearnEnabled() },
    { id: 'ukulele', label: 'Ukulele', available: isUkuleleLearnEnabled() },
  ];
}

interface InstrumentState {
  instrument: LearnInstrument;
  /** Mirror the fretboard and chord diagrams for left-handed players. */
  leftHanded: boolean;
  setInstrument: (instrument: LearnInstrument) => void;
  setLeftHanded: (leftHanded: boolean) => void;
}

function isLearnInstrument(value: unknown): value is LearnInstrument {
  return (
    value === 'piano' ||
    value === 'guitar' ||
    value === 'bass' ||
    value === 'ukulele'
  );
}

/**
 * Restore stored settings. A value from an older build, or a hand-edited one,
 * falls back to piano rather than leaving Learn on an instrument it can't
 * teach.
 */
export function mergeStoredInstrument<T extends InstrumentState>(
  persisted: unknown,
  current: T,
): T {
  const stored = (persisted ?? {}) as Partial<InstrumentState>;
  return {
    ...current,
    instrument: isLearnInstrument(stored.instrument)
      ? stored.instrument
      : 'piano',
    leftHanded: stored.leftHanded === true,
  };
}

export const useInstrumentStore = create<InstrumentState>()(
  persist(
    (set) => ({
      instrument: 'piano',
      leftHanded: false,
      setInstrument: (instrument) => set({ instrument }),
      setLeftHanded: (leftHanded) => set({ leftHanded }),
    }),
    {
      name: 'music-atlas-learn-instrument',
      version: 1,
      partialize: (state) => ({
        instrument: state.instrument,
        leftHanded: state.leftHanded,
      }),
      merge: mergeStoredInstrument,
    },
  ),
);

/** The Learn page for an instrument: /learn/keyboard, /learn/guitar … */
export const learnPageRoute = (instrument: LearnInstrument) =>
  instrument === 'guitar'
    ? LearnRoutes.guitar()
    : instrument === 'bass'
      ? LearnRoutes.bass()
      : instrument === 'ukulele'
        ? LearnRoutes.ukulele()
        : LearnRoutes.keyboard();

/** The Learn page for the instrument chosen now (Home's row, the side rail). */
export const useLearnPageRoute = () => learnPageRoute(useLearnInstrument());

/**
 * The instrument Learn should show now: the stored choice, except that guitar,
 * bass or ukulele reads as piano while its rollout flag is off.
 */
export function useLearnInstrument(): LearnInstrument {
  const instrument = useInstrumentStore((s) => s.instrument);
  return isLearnInstrumentEnabled(instrument) ? instrument : 'piano';
}
