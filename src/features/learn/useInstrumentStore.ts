import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LessonInstrument } from '@/curriculum/types/activity.v2';

// ── Learn instrument ───────────────────────────────────────────────────────
// Which instrument Learn teaches on this device. It picks the Technique tiles
// (piano or guitar) and the guitar views' handedness. Device-level, like the
// saved-items and view preferences: a student may play guitar at school and
// piano at home.

export type LearnInstrument = LessonInstrument;

/** Every instrument the picker lists; only piano and guitar have lessons. */
export type InstrumentMenuId = LearnInstrument | 'bass' | 'ukulele';

export interface InstrumentOption {
  id: InstrumentMenuId;
  label: string;
  available: boolean;
}

const GUITAR_FLAG_KEY = 'learn-guitar';

/**
 * Guitar is rolled out behind a flag until audio evaluation ships:
 *   localStorage.setItem('learn-guitar', 'true')  → show Guitar in the picker
 *   localStorage.removeItem('learn-guitar')       → hide it again
 * Always on in development. The guitar routes work either way; the flag only
 * hides the way in.
 */
export function isGuitarLearnEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  try {
    return localStorage.getItem(GUITAR_FLAG_KEY) === 'true';
  } catch {
    return false;
  }
}

export function instrumentOptions(): InstrumentOption[] {
  return [
    { id: 'piano', label: 'Piano', available: true },
    { id: 'guitar', label: 'Guitar', available: isGuitarLearnEnabled() },
    { id: 'bass', label: 'Bass', available: false },
    { id: 'ukulele', label: 'Ukulele', available: false },
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
  return value === 'piano' || value === 'guitar';
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

/**
 * The instrument Learn should show now: the stored choice, except that guitar
 * reads as piano while its rollout flag is off.
 */
export function useLearnInstrument(): LearnInstrument {
  const instrument = useInstrumentStore((s) => s.instrument);
  return instrument === 'guitar' && !isGuitarLearnEnabled()
    ? 'piano'
    : instrument;
}
