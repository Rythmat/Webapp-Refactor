/**
 * The references a record refuses before they go in, and why: a group among
 * its own members, an artist influencing themselves, a label under its own
 * imprint (REF_PATHS `acyclic`: `member_of`, `imprint_of`), and a reference
 * listed twice.
 *
 * Pure: the walks go over what the caller hands them (the bodies the
 * console has loaded, `useServedBodies`), so the row panel's record editors
 * and, next, the Table's cells refuse the same things in the same words.
 * The API refuses a loop too; these say so before a save is tried.
 */

/** A reference as a list stores it: a member, an influence. */
type Ref = Readonly<Record<string, unknown>>;

/**
 * Whether following `next` from `from` reaches `target`: the walk a new
 * reference would close into a loop (REF_PATHS `acyclic`: a label's parent,
 * a group's members). A loop already stored ends the walk rather than it.
 */
export function reaches(
  from: string,
  target: string,
  next: (slug: string) => readonly string[],
): boolean {
  const seen = new Set<string>();
  const queue = [from];
  while (queue.length) {
    const slug = queue.shift()!;
    if (slug === target) return true;
    if (seen.has(slug)) continue;
    seen.add(slug);
    queue.push(...next(slug));
  }
  return false;
}

/**
 * Why `artistId` cannot be a member of the group `self` — added, or in place
 * of the member at `at` — or null. Membership may not loop: a group cannot
 * take on an artist that already has it among their own members, as
 * `membersOf` (an artist's stored members) says.
 */
export function memberRefusal(
  self: string | undefined,
  members: readonly Ref[],
  artistId: string,
  membersOf: (slug: string) => readonly string[],
  at?: number,
): string | null {
  if (artistId === self) return 'A group cannot be its own member.';
  if (members.some((m, n) => n !== at && m.artistId === artistId)) {
    return 'Already a member.';
  }
  if (self && reaches(artistId, self, membersOf)) {
    return 'That artist already has this group among its members: it would loop.';
  }
  return null;
}

/**
 * Why `artistId` cannot be listed as an influence on `self` — added, or in
 * place of the influence at `at` — or null.
 */
export function influenceRefusal(
  self: string | undefined,
  influences: readonly Ref[],
  artistId: string,
  at?: number,
): string | null {
  if (artistId === self) return 'An artist cannot influence themselves.';
  if (influences.some((f, n) => n !== at && f.artistId === artistId)) {
    return 'Already listed.';
  }
  return null;
}

/**
 * Why the label `slug` cannot be an imprint of `parent`, or null. Imprints
 * may not loop: `parentOf` gives a label's stored parent.
 */
export function parentLabelRefusal(
  slug: string | undefined,
  parent: string,
  parentOf: (label: string) => readonly string[],
): string | null {
  if (parent === slug) return 'A label cannot be an imprint of itself.';
  if (slug && reaches(parent, slug, parentOf)) {
    return 'That label is an imprint of this one: it would loop.';
  }
  return null;
}
