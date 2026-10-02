import { LearnRoutes } from '@/constants/routes';
import { keyLabelToUrlParam } from '@/lib/musicKeyUrl';

// ── Learn → Theory on guitar ───────────────────────────────────────────────
// The Guitar Atlas (Book One) teaches the 12 major key centers, so on guitar
// Theory has one mode so far: Ionian (Major). Every other Theory tile reads
// "Coming soon for guitar". The book data is loaded only when a key is
// opened, so none of it lands in the Learn hub's bundle.

/** Theory modes that have guitar lessons. */
export const GUITAR_THEORY_MODES: readonly string[] = ['ionian'];

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

/** A key's guitar Ionian lesson, e.g. 'F#' → '/learn/guitar/ionian/fsharp'. */
export function guitarIonianLessonRoute(keyLabel: string): string {
  return LearnRoutes.guitarLesson({
    mode: 'ionian',
    key: keyLabelToUrlParam(keyLabel),
  });
}

/**
 * The chapters of a key's guitar Ionian lesson (Melody, Chords, Play-Along),
 * each linking to the lesson opened at that chapter.
 * @param keyLabel - A Theory key label: 'C', 'F#', 'D♭'…
 */
export async function guitarTheoryChapters(
  keyLabel: string,
): Promise<GuitarTheoryChapter[]> {
  const { buildGuitarAppliedTheoryFundamentalsFlow } = await import(
    '@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals'
  );
  // Same conversion as the lesson page: display label ("D♭") → ASCII ("Db").
  const flow = buildGuitarAppliedTheoryFundamentalsFlow(
    keyLabel.replace('♯', '#').replace('♭', 'b'),
  );
  const key = keyLabelToUrlParam(keyLabel);
  return flow.sections.map((section) => ({
    id: section.id,
    name: section.name,
    stepCount: section.steps.length,
    route: LearnRoutes.guitarLesson(
      { mode: 'ionian', key },
      { section: section.id },
    ),
  }));
}
