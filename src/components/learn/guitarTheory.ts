import { LearnRoutes } from '@/constants/routes';
import {
  GUITAR_MODES,
  isGuitarMode,
} from '@/curriculum/data/guitar/modes/modeNames';
import type { GuitarMode } from '@/curriculum/data/guitar/types';
import { keyLabelToUrlParam } from '@/lib/musicKeyUrl';

// ── Learn → Theory on guitar ───────────────────────────────────────────────
// Guitar teaches the seven diatonic modes in all 12 keys: Ionian (Major) from
// The Guitar Atlas: Book One, and Dorian … Locrian built on it. Every other
// Theory tile reads "Coming soon for guitar". The lesson data is loaded only
// when a key is opened, so none of it lands in the Learn hub's bundle.

/** Theory modes that have guitar lessons. */
export const GUITAR_THEORY_MODES: readonly string[] = GUITAR_MODES;

export const COMING_SOON_FOR_GUITAR = 'Coming soon for guitar';

/** Whether a Theory tile has guitar lessons (only modes do, not key tiles). */
export function isTheoryItemOnGuitar(item: { mode?: string }): boolean {
  return item.mode != null && GUITAR_THEORY_MODES.includes(item.mode);
}

export interface GuitarTheoryChapter {
  id: string;
  name: string;
  stepCount: number;
  route: string;
}

/** A key's guitar lesson in a mode, e.g. 'F#' → '/learn/guitar/dorian/fsharp'. */
export function guitarLessonRoute(mode: GuitarMode, keyLabel: string): string {
  return LearnRoutes.guitarLesson({
    mode,
    key: keyLabelToUrlParam(keyLabel),
  });
}

/**
 * The chapters of a key's guitar lesson in a mode (Melody, Chords,
 * Play-Along), each linking to the lesson opened at that chapter.
 * @param mode - A guitar mode: 'ionian', 'dorian' …
 * @param keyLabel - A Theory key label: 'C', 'F#', 'D♭'…
 */
export async function guitarTheoryChapters(
  mode: string,
  keyLabel: string,
): Promise<GuitarTheoryChapter[]> {
  if (!isGuitarMode(mode)) return [];
  const { buildGuitarModeFlow } = await import(
    '@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals'
  );
  // Same conversion as the lesson page: display label ("D♭") → ASCII ("Db").
  const flow = buildGuitarModeFlow(
    keyLabel.replace('♯', '#').replace('♭', 'b'),
    mode,
  );
  const key = keyLabelToUrlParam(keyLabel);
  return flow.sections.map((section) => ({
    id: section.id,
    name: section.name,
    stepCount: section.steps.length,
    route: LearnRoutes.guitarLesson({ mode, key }, { section: section.id }),
  }));
}
