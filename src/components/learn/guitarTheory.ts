import { LearnRoutes } from '@/constants/routes';
import {
  guitarTheoryEntry,
  isGuitarTheorySlug,
} from '@/curriculum/data/guitar/theoryCatalog';
import { keyLabelToUrlParam } from '@/lib/musicKeyUrl';

// ── Learn → Theory on guitar ───────────────────────────────────────────────
// Which Theory tiles have guitar lessons comes from the guitar Theory
// catalog (data/guitar/theoryCatalog): a family's tiles open once it is live,
// and the rest read "Coming soon for guitar". Relative and Parallel tiles
// open when all the modes they list do. The lesson data is loaded only when
// a key is opened, so none of it lands in the Learn hub's bundle.

export const COMING_SOON_FOR_GUITAR = 'Coming soon for guitar';

/**
 * Whether a Theory tile has guitar lessons: a mode or scale tile whose family
 * is live, or a Relative / Parallel key tile whose modes all are.
 */
export function isTheoryItemOnGuitar(item: {
  mode?: string;
  subItems?: readonly { mode?: string }[];
}): boolean {
  if (item.mode != null) return isGuitarTheorySlug(item.mode);
  const subs = item.subItems ?? [];
  return subs.length > 0 && subs.every((s) => isGuitarTheorySlug(s.mode));
}

export interface GuitarTheoryChapter {
  id: string;
  name: string;
  stepCount: number;
  route: string;
}

/** A key's guitar lesson for a Theory slug: 'F#' → '/learn/guitar/dorian/fsharp'. */
export function guitarLessonRoute(slug: string, keyLabel: string): string {
  return LearnRoutes.guitarLesson({
    mode: slug,
    key: keyLabelToUrlParam(keyLabel),
  });
}

/**
 * The chapters of a key's guitar lesson for a Theory slug (Melody, Chords,
 * Play-Along; pentatonic and blues have no Chords), each linking to the
 * lesson opened at that chapter.
 * @param slug - A Theory tile's slug: 'ionian', 'ionian#5', 'minorblues'.
 * @param keyLabel - A Theory key label: 'C', 'F#', 'D♭'…
 */
export async function guitarTheoryChapters(
  slug: string,
  keyLabel: string,
): Promise<GuitarTheoryChapter[]> {
  if (!guitarTheoryEntry(slug)) return [];
  const { buildGuitarTheoryFlow } = await import(
    '@/curriculum/data/activityFlows/guitarTheoryFlows'
  );
  // Same conversion as the lesson page: display label ("D♭") → ASCII ("Db").
  const flow = buildGuitarTheoryFlow(
    keyLabel.replace('♯', '#').replace('♭', 'b'),
    slug,
  );
  const key = keyLabelToUrlParam(keyLabel);
  return flow.sections.map((section) => ({
    id: section.id,
    name: section.name,
    stepCount: section.steps.length,
    route: LearnRoutes.guitarLesson(
      { mode: slug, key },
      { section: section.id },
    ),
  }));
}
