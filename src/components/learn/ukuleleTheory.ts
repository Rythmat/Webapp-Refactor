import { LearnRoutes } from '@/constants/routes';
import { isUkuleleTheorySlug } from '@/curriculum/data/ukulele/theoryCatalog';
import { keyLabelToUrlParam } from '@/lib/musicKeyUrl';

// ── Learn → Theory on ukulele ─────────────────────────────────────────────────
// Which Theory tiles have ukulele lessons comes from the ukulele Theory catalog
// (data/ukulele/theoryCatalog), as guitarTheory.ts does for guitar: a live
// family's tiles open, the rest read "Coming soon for ukulele".

export const COMING_SOON_FOR_UKULELE = 'Coming soon for ukulele';

/** Whether a Theory tile (or a Relative / Parallel tile's modes) has ukulele lessons. */
export function isTheoryItemOnUkulele(item: {
  mode?: string;
  subItems?: readonly { mode?: string }[];
}): boolean {
  if (item.mode != null) return isUkuleleTheorySlug(item.mode);
  const subs = item.subItems ?? [];
  return subs.length > 0 && subs.every((s) => isUkuleleTheorySlug(s.mode));
}

/** A key's ukulele lesson for a Theory slug: 'F#' → '/learn/ukulele/dorian/fsharp'. */
export function ukuleleLessonRoute(slug: string, keyLabel: string): string {
  return LearnRoutes.ukuleleLesson({
    mode: slug,
    key: keyLabelToUrlParam(keyLabel),
  });
}
