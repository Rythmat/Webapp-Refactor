import {
  parseMusicPrompt,
  type MusicPrompt,
  type PromptMode,
} from './parseMusicPrompt';
import { partsOf, sectionRequest } from './partWords';

// ── A prompt's key and tempo, for the session (owner, 2026-10-24) ──────────
//
// A key center or a tempo the prompt names is the session's from then on:
// the part is written in it, and the project takes it. A prompt that asks
// for nothing else ("change the key to G minor", "make it 100 bpm") just
// sets them, writing no part. No runtime imports beyond the prompt reader,
// so the Studio's bar can tell before the generator loads.

/** The session's key, as a part's context gives it (null: none yet). */
export interface SessionKey {
  tonicPc: number | null;
  mode: string | null;
}

/** Each tonic as the circle of fifths spells its key. */
export const KEY_LABELS = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
];

const DIATONIC: readonly PromptMode[] = [
  'ionian',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'aeolian',
];

/** The project's mode as one the engine plays: a scale with a minor third
 *  is read as minor, any other as major. */
export function engineMode(mode: string | null): PromptMode {
  if (mode && (DIATONIC as readonly string[]).includes(mode)) {
    return mode as PromptMode;
  }
  return mode && /minor|locrian|phrygian/i.test(mode) ? 'aeolian' : 'ionian';
}

export interface PromptKey {
  tonicPc: number;
  label: string;
  mode: PromptMode;
}

/**
 * The key a prompt names, whole: its tonic with its mode — the session's
 * mode for a tonic named alone ("in G" on an E Mixolydian song is G
 * Mixolydian; on a song with no key, the plan's major or minor) — or the
 * session's tonic in a mode named alone ("in Dorian"). Null when it names
 * neither, or a mode alone on a song with no key.
 */
export function namedKey(
  read: Pick<MusicPrompt, 'tonicPc' | 'tonicLabel' | 'mode'>,
  context: SessionKey,
): PromptKey | null {
  if (read.tonicPc !== null) {
    if (!read.mode && context.tonicPc === null) return null;
    return {
      tonicPc: read.tonicPc,
      label: read.tonicLabel ?? KEY_LABELS[read.tonicPc],
      mode: read.mode ?? engineMode(context.mode),
    };
  }
  if (read.mode && context.tonicPc !== null) {
    return {
      tonicPc: context.tonicPc,
      label: KEY_LABELS[context.tonicPc],
      mode: read.mode,
    };
  }
  return null;
}

/** Words that ask for something to be written. "Make it…" sets, not makes. */
const WRITE_WORDS =
  /\b(write|add|make|create|play|give|generate|compose|build|start|put|lay|drop|need|want)\b/i;

/**
 * The key and tempo a prompt asks the session for, when that's all it asks
 * ("change the key to G minor", "make it 100 bpm", "in Dorian at 90"); null
 * when it names neither, or asks for a part, a section, a style or a mood
 * too — those are written, in the key and tempo named.
 */
export function sessionSettingsOf(
  text: string,
  session: SessionKey,
): { key: PromptKey | null; bpm: number | null } | null {
  const read = parseMusicPrompt(text);
  // A tonic alone on a song with no key yet: its major.
  const key =
    namedKey(read, session) ??
    (read.tonicPc !== null
      ? {
          tonicPc: read.tonicPc,
          label: read.tonicLabel ?? KEY_LABELS[read.tonicPc],
          mode: read.mode ?? 'ionian',
        }
      : null);
  if (!key && read.bpm === null) return null;
  if (partsOf(text) || sectionRequest(text)) return null;
  if (read.genre || read.vibes.length) return null;
  if (WRITE_WORDS.test(text.replace(/\bmake it\b/gi, ''))) return null;
  return { key, bpm: read.bpm };
}
