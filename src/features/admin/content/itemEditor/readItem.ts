import {
  ContentApiError,
  type ContentItemDetail,
  type ContentKind,
  type ContentListItem,
  contentRequest,
} from '@/hooks/data/admin/useAdminContent';

/**
 * Reading an item as stored now, in full, before writing it: Link…'s owner
 * (ConfirmConnectionDialog, on open and again just before its save), a bulk
 * write's precondition (useBulkWrite), and next the Table's cell writes.
 *
 * Always `/items/:id`, never an export row or a cache. An export is lean —
 * it leaves out a song's `sections` and `audioSources` — so a body built on
 * one and written back would wipe the song's chart. The id is the export's
 * when the page has it, else looked up by kind and slug where the server
 * offers that (`features.lookup`).
 */

/** Where an item is: its kind and slug, and its DB id when that is known. */
export interface ItemRef {
  kind: ContentKind;
  slug: string;
  /** The DB id (an `/export` row has it): read straight away, no lookup. */
  id?: string;
}

/** Why an item with no id cannot be read: the server does not look slugs up. */
export const NO_LOOKUP =
  'this server cannot find an item by its slug; plan from /export, which gives each item its id';

export const isNotFound = (error: unknown): boolean =>
  error instanceof ContentApiError && error.status === 404;

/** The item's DB id: the one given, else the lookup's (a 404 is thrown). */
async function idOf(
  token: string,
  ref: ItemRef,
  canLookup: boolean,
): Promise<string> {
  if (ref.id) return ref.id;
  if (!canLookup) throw new Error(NO_LOOKUP);
  const found = await contentRequest<ContentListItem>(
    `/items/lookup?kind=${encodeURIComponent(ref.kind)}&slug=${encodeURIComponent(ref.slug)}`,
    token,
  );
  return found.id;
}

const byId = (token: string, id: string) =>
  contentRequest<ContentItemDetail>(`/items/${encodeURIComponent(id)}`, token);

/**
 * The item as stored now, or null when it is not there to read: no id was
 * given, and the server has no item with the slug (the lookup's 404) or
 * cannot look one up. Anything else the server answers is thrown — a 404
 * for an id given too, since that item has gone.
 */
export async function readItem(
  token: string,
  ref: ItemRef,
  canLookup: boolean,
): Promise<ContentItemDetail | null> {
  if (!ref.id && !canLookup) return null;
  let id: string;
  try {
    id = await idOf(token, ref, canLookup);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
  return byId(token, id);
}

/**
 * The item as stored now, for a write that must find it: an item that is
 * not there is thrown — the lookup's own 404 (`isNotFound` tells it from a
 * failure), or `NO_LOOKUP` where the server cannot look a slug up.
 */
export async function readStoredItem(
  token: string,
  ref: ItemRef,
  canLookup: boolean,
): Promise<ContentItemDetail> {
  return byId(token, await idOf(token, ref, canLookup));
}
