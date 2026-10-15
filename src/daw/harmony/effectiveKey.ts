/**
 * effectiveKey.ts — the key everything that follows "the song's key" uses.
 *
 * The student's key (rootNote and mode, set on the key chip, in Prism or by
 * a song) is the key. Detection (the music-intelligence bus, which the
 * Insight analysis fills) only stands in while no key is set, and says so.
 * Before this, the synth's "follow project key", vocal pitch correction, the
 * live chord detector and "snap to song key" preferred the detected key, so
 * a student who set A minor could hear correction to whatever an older
 * analysis had guessed.
 */
import { useStore, type AllSlices } from '@/daw/store';

export type EffectiveKeySource = 'project' | 'detected';

export interface EffectiveKey {
  /** Tonic pitch class, 0–11. */
  rootPc: number;
  /** An ALL_MODES key. */
  mode: string;
  /** The student's key, or detection standing in for one. */
  source: EffectiveKeySource;
}

type KeyState = Pick<
  AllSlices,
  'rootNote' | 'mode' | 'detectedKeyRootPc' | 'detectedMode'
>;

let lastInputs: readonly unknown[] = [];
let lastKey: EffectiveKey | null = null;

/**
 * The key in effect: the student's, else a detected one, else none. The same
 * object while its inputs don't change, so it can be a store selector.
 */
export function selectEffectiveKey(state: KeyState): EffectiveKey | null {
  const inputs = [
    state.rootNote,
    state.mode,
    state.detectedKeyRootPc,
    state.detectedMode,
  ];
  if (inputs.every((value, i) => Object.is(value, lastInputs[i]))) {
    return lastKey;
  }
  lastInputs = inputs;
  if (state.rootNote !== null) {
    lastKey = {
      rootPc: state.rootNote,
      mode: state.mode || 'ionian',
      source: 'project',
    };
  } else if (state.detectedKeyRootPc !== null && state.detectedMode) {
    lastKey = {
      rootPc: state.detectedKeyRootPc,
      mode: state.detectedMode,
      source: 'detected',
    };
  } else {
    lastKey = null;
  }
  return lastKey;
}

/** The key in effect, for a component. */
export function useEffectiveKey(): EffectiveKey | null {
  return useStore(selectEffectiveKey);
}
