/**
 * Lesson pairings (ledger D-084): the back office's "Use in lessons". Each
 * file in src/curriculum/data/lessonPairings/ names the drum groove, bass
 * line and chord comping one lesson style plays (lessonStyles.ts). A pairing wins over the
 * steps' own groove and bass; an unpaired style keeps them.
 *
 * Repo files for now, written by the dev server like grooves and bass lines
 * (scripts/vite/devContentWriter.ts); commit a file to ship it. Only a
 * published groove or line reaches students — a pairing to a draft waits.
 */

import {
  getLessonStyle,
  lessonStyleFor,
  type LessonStyle,
} from '../../data/lessonStyles';
import type { BassLine } from '../bassLines/bassLine';
import { getLiveBassLine } from '../bassLines/registry';
import type { ChordComping } from '../chordComping/chordComping';
import { getLiveComping } from '../chordComping/registry';
import type { DrumGroove } from '../drumGrooves/drumGroove';
import { getLiveGroove, preloadStudioGroove } from '../drumGrooves/registry';

export type PairingKind = 'drums' | 'bass' | 'comping';

export interface LessonPairing {
  /** The lesson style's id (lessonStyles.ts) — also the file name. */
  id: string;
  /** A drum groove id (Drum Grooves), lesson or Studio set. */
  drums?: string;
  /** A bass line id (Bass Lines). */
  bass?: string;
  /** A chord comping pattern id (Chord Comping, D-087). */
  comping?: string;
}

const files = import.meta.glob<LessonPairing>(
  '../../data/lessonPairings/*.json',
  { eager: true, import: 'default' },
);

const PAIRINGS = new Map<string, LessonPairing>(
  Object.values(files).map((p) => [p.id, p]),
);

/** Every pairing file, by style id. */
export function listPairings(): readonly LessonPairing[] {
  return [...PAIRINGS.values()];
}

export function getPairing(styleId: string): LessonPairing | undefined {
  return PAIRINGS.get(styleId);
}

/**
 * The console's edit, applied here at once so lessons opened in the same
 * session hear it before the dev server's reload.
 */
export function rememberPairing(pairing: LessonPairing): void {
  if (pairing.drums || pairing.bass || pairing.comping)
    PAIRINGS.set(pairing.id, pairing);
  else PAIRINGS.delete(pairing.id);
  if (pairing.drums) void preloadStudioGroove(pairing.drums);
}

/** The styles an item is paired with, in lessonStyles order. */
export function stylesUsing(kind: PairingKind, itemId: string): LessonStyle[] {
  return listPairings()
    .filter((p) => p[kind] === itemId)
    .map((p) => getLessonStyle(p.id))
    .filter((s): s is LessonStyle => !!s);
}

/**
 * Resolves once every Studio groove a pairing names is loaded, so the
 * synchronous lesson and Practice Track paths can read it. Started when this
 * module loads; startBacking awaits it.
 */
export const pairingsReady: Promise<void> = Promise.all(
  listPairings()
    .map((p) => p.drums)
    .filter((id): id is string => !!id)
    .map((id) => preloadStudioGroove(id)),
).then(() => undefined);

export interface ResolvedPairing {
  style: LessonStyle;
  /** Published groove, or undefined (unpaired, draft or missing). */
  drums?: DrumGroove;
  /** Published bass line, or undefined. */
  bass?: BassLine;
  /** Published comping pattern, or undefined. */
  comping?: ChordComping;
}

/** What a step's style is paired with, published items only. */
export function pairingFor(
  genre: string,
  level: number,
  styleRef: string | undefined,
): ResolvedPairing | undefined {
  const style = lessonStyleFor(genre, level, styleRef);
  if (!style) return undefined;
  return pairingForStyle(style);
}

export function pairingForStyle(
  style: LessonStyle,
): ResolvedPairing | undefined {
  const pairing = PAIRINGS.get(style.id);
  if (!pairing) return undefined;
  const drums = getLiveGroove(pairing.drums);
  const bass = getLiveBassLine(pairing.bass);
  const comping = getLiveComping(pairing.comping);
  if (!drums && !bass && !comping) return undefined;
  return { style, drums, bass, comping };
}
