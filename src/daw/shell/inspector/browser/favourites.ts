// ── Library favourites (milestone 2.14) ────────────────────────────────────
//
// The ♡ on a Library row (and on a groove in the dock's Grooves tab) marks
// the item as the student's favourite. Favourites are a per-user pref
// (libraryFavourites): kept for the student on this computer by prefsStore,
// never in a project. Each is the item's id, its kind before a colon:
// 'part:<id>', 'groove:<id>', 'kit:<id>', 'preset:<source>:<name>' or
// 'template:<id>'. An item that has since gone keeps its id here unseen.
//
// prefsStore loads with the store on every page, so this module imports
// nothing.

/** The kinds a favourite's id can start with. */
const KINDS = ['part', 'groove', 'kit', 'preset', 'template'] as const;

/** Ids longer than this aren't ours. */
const MAX_ID_LENGTH = 160;
/** More than this many favourites aren't a student's. */
export const MAX_FAVOURITES = 500;

/** The favourite id of a groove in the Grooves library. */
export const grooveFavouriteId = (grooveId: string) => `groove:${grooveId}`;

/** Whether `id` names a Library item (a kind, a colon, a name). */
export function isFavouriteId(id: unknown): id is string {
  if (typeof id !== 'string' || id.length > MAX_ID_LENGTH) return false;
  const colon = id.indexOf(':');
  return (
    colon > 0 &&
    colon < id.length - 1 &&
    (KINDS as readonly string[]).includes(id.slice(0, colon))
  );
}

/** What prefsStore takes for libraryFavourites: sorted, unique item ids. */
export function isLibraryFavourites(value: unknown): value is string[] {
  if (!Array.isArray(value) || value.length > MAX_FAVOURITES) return false;
  for (let i = 0; i < value.length; i++) {
    if (!isFavouriteId(value[i])) return false;
    if (i > 0 && !(value[i - 1] < value[i])) return false;
  }
  return true;
}

/** `favourites` with `id` added, or taken out when it is there. */
export function toggledFavourites(
  favourites: readonly string[],
  id: string,
): string[] {
  if (favourites.includes(id)) return favourites.filter((f) => f !== id);
  if (!isFavouriteId(id) || favourites.length >= MAX_FAVOURITES) {
    return [...favourites];
  }
  return [...favourites, id].sort();
}
