import { LearnRoutes } from '@/constants/routes';
import { isBassTheorySlug } from '@/curriculum/data/bass/theoryCatalog';
import { keyLabelToUrlParam } from '@/lib/musicKeyUrl';

// ── Learn → Theory on bass ─────────────────────────────────────────────────
// Which Theory tiles have bass lessons comes from the bass Theory catalog
// (data/bass/theoryCatalog), as guitarTheory.ts does for guitar: a live
// family's tiles open, the rest read "Coming soon for bass".

export const COMING_SOON_FOR_BASS = 'Coming soon for bass';

/** Whether a Theory tile (or a Relative / Parallel tile's modes) has bass lessons. */
export function isTheoryItemOnBass(item: {
  mode?: string;
  subItems?: readonly { mode?: string }[];
}): boolean {
  if (item.mode != null) return isBassTheorySlug(item.mode);
  const subs = item.subItems ?? [];
  return subs.length > 0 && subs.every((s) => isBassTheorySlug(s.mode));
}

/** A key's bass lesson for a Theory slug: 'F#' → '/learn/bass/dorian/fsharp'. */
export function bassLessonRoute(slug: string, keyLabel: string): string {
  return LearnRoutes.bassLesson({
    mode: slug,
    key: keyLabelToUrlParam(keyLabel),
  });
}
