import {
  DEFAULT_ARTIST_TITLE,
  DEFAULT_SHOW_TITLE,
  FAVORITES_TITLE,
  INBOX_TITLE,
  LIMITS,
  SETLIST_SCHEMA_VERSION,
  type Artist,
  type SaveDestination,
  type SetList,
  type SetListEntry,
  type SetListParent,
  type SetListProjectEntry,
  type SetListsBlob,
  type SetListSongEntry,
  type Show,
  type StoredChart,
} from './types';

/**
 * Every edit a user can make to their set lists, as pure functions over the
 * document: `(blob, …) => blob`. Nothing here touches storage or React, so it
 * can all be tested directly — which is how the classroom planner does it.
 *
 * `now` is injected rather than read from the clock so results are reproducible.
 */

let counter = 0;
/** Ids are minted client-side so they can become server keys unchanged. */
export const uid = (prefix: string): string =>
  `${prefix}_${(counter++).toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const clamp = (text: string, max: number) => text.slice(0, max).trim();

/**
 * A short, stable fingerprint of a chart's music — its sections, bars and
 * chords. Two charts with the same chords fingerprint the same; a corrected
 * chord changes it. Cheap and good enough to answer "did this change?".
 */
export function chartFingerprint(song: {
  key: string;
  sections: { label: string; bars: { chords: { chordName: string }[] }[] }[];
}): string {
  const text =
    song.key +
    '|' +
    song.sections
      .map(
        (s) =>
          s.label +
          ':' +
          s.bars
            .map((b) => b.chords.map((c) => c.chordName).join(' '))
            .join('|'),
      )
      .join('//');
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}
const mod12 = (n: number) => ((n % 12) + 12) % 12;

export const emptyBlob = (now = 0): SetListsBlob => ({
  schemaVersion: SETLIST_SCHEMA_VERSION,
  updatedAt: now,
  artists: {},
  shows: {},
  setLists: {},
  order: { artists: [], shows: [], setLists: [] },
});

/**
 * Version 1 filed every set list under a show, and gave everyone a "My Music"
 * band with an "Unfiled" show whether they wanted one or not — two levels of
 * filing for a system with one folder and no way to add another. Version 2
 * keeps the bands and shows a player actually made and unfiles the rest, so
 * the hierarchy starts empty and only ever holds what someone put there.
 */
function migrateV1(raw: Record<string, unknown>, now: number): SetListsBlob {
  const legacy = raw as {
    artists?: Record<string, Artist>;
    shows?: Record<string, Show & { artistId?: string }>;
    setLists?: Record<string, SetList & { showId?: string }>;
    order?: {
      artists?: string[];
      showsByArtist?: Record<string, string[]>;
      setListsByShow?: Record<string, string[]>;
    };
  };
  const artists = { ...(legacy.artists ?? {}) };
  const shows = { ...(legacy.shows ?? {}) };
  const order = legacy.order ?? {};

  // The band and show v1 made for everyone, recognised by never having been
  // renamed. A player who renamed either of them meant it, so theirs stay.
  const stockArtists = new Set(
    Object.values(artists)
      .filter((a) => a.title === 'My Music')
      .map((a) => a.id),
  );
  const stockShows = new Set(
    Object.values(shows)
      .filter(
        (sh) =>
          sh.title === 'Unfiled' &&
          (!sh.artistId || stockArtists.has(sh.artistId)),
      )
      .map((sh) => sh.id),
  );

  const setLists: Record<string, SetList> = {};
  for (const [id, list] of Object.entries(legacy.setLists ?? {})) {
    const { showId, ...rest } = list;
    const filed = showId && !stockShows.has(showId) && shows[showId];
    setLists[id] = {
      ...rest,
      id,
      ...(filed ? { parent: { kind: 'show' as const, id: showId } } : {}),
    };
  }
  for (const id of stockShows) delete shows[id];
  for (const id of stockArtists) delete artists[id];

  const flatShows = Object.values(order.showsByArtist ?? {}).flat();
  const flatLists = Object.values(order.setListsByShow ?? {}).flat();
  return {
    schemaVersion: SETLIST_SCHEMA_VERSION,
    updatedAt: now,
    artists,
    shows,
    setLists,
    order: {
      artists: (order.artists ?? []).filter((id) => artists[id]),
      shows: flatShows.filter((id) => shows[id]),
      setLists: flatLists.filter((id) => setLists[id]),
    },
  };
}

/** A document read back from storage, made safe to use whatever it contains. */
export function normalizeBlob(raw: unknown, now = 0): SetListsBlob {
  const blob = raw as Partial<SetListsBlob> | null | undefined;
  if (!blob || typeof blob !== 'object' || !blob.setLists || !blob.order)
    return emptyBlob(now);
  // Migrate, then normalise the result: the v2 pass is what strips bad
  // entries and dangling parents, and a v1 document needs that too.
  if (blob.schemaVersion === 1)
    return normalizeBlob(migrateV1(raw as Record<string, unknown>, now), now);
  if (blob.schemaVersion !== SETLIST_SCHEMA_VERSION) return emptyBlob(now);

  const artists = blob.artists ?? {};
  const shows = blob.shows ?? {};
  const setLists: Record<string, SetList> = {};
  for (const [id, list] of Object.entries(blob.setLists)) {
    if (!list || typeof list !== 'object') continue;
    // A parent pointing at something that is gone is no parent at all.
    const parent =
      list.parent &&
      (list.parent.kind === 'artist'
        ? artists[list.parent.id]
        : shows[list.parent.id])
        ? list.parent
        : undefined;
    setLists[id] = {
      ...list,
      id,
      ...(parent ? { parent } : { parent: undefined }),
      entries: (list.entries ?? []).filter(
        (e): e is SetListEntry =>
          !!e &&
          (e.kind === 'song' || e.kind === 'text' || e.kind === 'project'),
      ),
    };
  }
  return {
    schemaVersion: SETLIST_SCHEMA_VERSION,
    updatedAt: blob.updatedAt ?? now,
    artists,
    shows,
    setLists,
    order: {
      artists: (blob.order.artists ?? []).filter((id) => artists[id]),
      shows: (blob.order.shows ?? []).filter((id) => shows[id]),
      setLists: (blob.order.setLists ?? []).filter((id) => setLists[id]),
    },
  };
}

const touch = (blob: SetListsBlob, now: number): SetListsBlob => ({
  ...blob,
  updatedAt: now,
});

/* ── The two lists everyone starts with ───────────────────────────────── */

/**
 * The two lists the app itself writes into — the repertoire and the subset of
 * it a player has starred — created on the first edit, so someone who never
 * opens the feature never gets a document written.
 *
 * No band and no show: the hierarchy starts empty and only ever holds what
 * someone put in it.
 */
export function ensureDefaults(blob: SetListsBlob, now = 0): SetListsBlob {
  let next = blob;
  for (const [role, title] of [
    ['inbox', INBOX_TITLE],
    ['favorites', FAVORITES_TITLE],
  ] as const) {
    if (hasRoleIn(next, role)) continue;
    next = createSetList(next, { title, role }, now).blob;
  }
  return reclaimRenamedRepertoire(next, now);
}

/**
 * The repertoire is a fixed idea with a fixed name, and no longer renameable.
 *
 * Anyone who renamed it did so before there were bands to name, and they were
 * almost certainly reaching for one — "My Band 1" is not a thing a master list
 * of charts is called. Rather than quietly drop the name, it becomes the band
 * it was meant to be, once: after this the title is the default again, so it
 * never fires twice.
 */
function reclaimRenamedRepertoire(
  blob: SetListsBlob,
  now: number,
): SetListsBlob {
  const inbox = Object.values(blob.setLists).find((l) => l.role === 'inbox');
  if (!inbox || inbox.title === INBOX_TITLE) return blob;
  const taken = Object.values(blob.artists).some(
    (a) => a.title === inbox.title,
  );
  const named = taken ? blob : createArtist(blob, inbox.title, now).blob;
  return touch(
    {
      ...named,
      setLists: {
        ...named.setLists,
        [inbox.id]: { ...inbox, title: INBOX_TITLE, updatedAt: now },
      },
    },
    now,
  );
}

const hasRoleIn = (blob: SetListsBlob, role: 'inbox' | 'favorites') =>
  Object.values(blob.setLists).some((l) => l.role === role);

export const roleList = (
  blob: SetListsBlob,
  role: 'inbox' | 'favorites',
): SetList | undefined =>
  Object.values(blob.setLists).find((l) => l.role === role);

/* ── Artists, shows, lists ────────────────────────────────────────────── */

export function createArtist(
  blob: SetListsBlob,
  title = DEFAULT_ARTIST_TITLE,
  now = 0,
): { blob: SetListsBlob; artistId: string } {
  if (blob.order.artists.length >= LIMITS.artists)
    return { blob, artistId: '' };
  const artist: Artist = {
    id: uid('art'),
    title: clamp(title, LIMITS.title) || DEFAULT_ARTIST_TITLE,
    createdAt: now,
    updatedAt: now,
  };
  return {
    artistId: artist.id,
    blob: touch(
      {
        ...blob,
        artists: { ...blob.artists, [artist.id]: artist },
        order: { ...blob.order, artists: [...blob.order.artists, artist.id] },
      },
      now,
    ),
  };
}

/**
 * A show, either under a band or standing on its own.
 *
 * Which of those it is, it stays: a show is not moved between bands, because
 * "the Quartet's summer tour" is not a thing that can become someone else's.
 * To get the same shape elsewhere, duplicate it.
 */
export function createShow(
  blob: SetListsBlob,
  artistId?: string,
  title = DEFAULT_SHOW_TITLE,
  now = 0,
): { blob: SetListsBlob; showId: string } {
  if (blob.order.shows.length >= LIMITS.shows) return { blob, showId: '' };
  if (artistId && !blob.artists[artistId]) return { blob, showId: '' };
  const show: Show = {
    id: uid('show'),
    ...(artistId ? { artistId } : {}),
    title: clamp(title, LIMITS.title) || DEFAULT_SHOW_TITLE,
    createdAt: now,
    updatedAt: now,
  };
  return {
    showId: show.id,
    blob: touch(
      {
        ...blob,
        shows: { ...blob.shows, [show.id]: show },
        order: { ...blob.order, shows: [...blob.order.shows, show.id] },
      },
      now,
    ),
  };
}

export function createSetList(
  blob: SetListsBlob,
  opts: {
    title?: string;
    parent?: SetListParent;
    role?: 'inbox' | 'favorites';
  } = {},
  now = 0,
): { blob: SetListsBlob; setListId: string } {
  if (Object.keys(blob.setLists).length >= LIMITS.lists)
    return { blob, setListId: '' };

  const list: SetList = {
    id: uid('sl'),
    title: clamp(opts.title ?? 'New Set List', LIMITS.title) || 'New Set List',
    entries: [],
    ...(opts.parent ? { parent: opts.parent } : {}),
    ...(opts.role ? { role: opts.role } : {}),
    createdAt: now,
    updatedAt: now,
  };
  return {
    setListId: list.id,
    blob: touch(
      {
        ...blob,
        setLists: { ...blob.setLists, [list.id]: list },
        order: {
          ...blob.order,
          setLists: [...blob.order.setLists, list.id],
        },
      },
      now,
    ),
  };
}

/** Move `id` so it sits just before `beforeId`, or last when that is null. */
function placeBefore(
  order: readonly string[],
  id: string,
  beforeId: string | null,
): string[] {
  if (id === beforeId) return [...order];
  const without = order.filter((x) => x !== id);
  const at = beforeId ? without.indexOf(beforeId) : -1;
  if (beforeId && at < 0) return [...order];
  if (at < 0) return [...without, id];
  return [...without.slice(0, at), id, ...without.slice(at)];
}

/**
 * Put a show in a band, or take it out of one with `undefined`.
 *
 * A show belongs to the band it was made in: it can join a band, and it can
 * leave one, but it is never handed straight from one band to another. "The
 * Quartet's summer tour" is not a thing that becomes somebody else's — to get
 * the same shape elsewhere, duplicate it.
 */
export function fileShow(
  blob: SetListsBlob,
  showId: string,
  artistId: string | undefined,
  now = 0,
): SetListsBlob {
  const show = blob.shows[showId];
  if (!show) return blob;
  if (artistId && !blob.artists[artistId]) return blob;
  if (show.artistId && artistId && show.artistId !== artistId) return blob;
  if (show.artistId === artistId) return blob;
  const next: Show = { ...show, updatedAt: now };
  if (artistId) next.artistId = artistId;
  else delete next.artistId;
  return touch({ ...blob, shows: { ...blob.shows, [showId]: next } }, now);
}

/** Order a show among its siblings; `beforeShowId` null sends it last. */
export function moveShow(
  blob: SetListsBlob,
  showId: string,
  beforeShowId: string | null,
  now = 0,
): SetListsBlob {
  if (!blob.shows[showId]) return blob;
  return touch(
    {
      ...blob,
      order: {
        ...blob.order,
        shows: placeBefore(blob.order.shows, showId, beforeShowId),
      },
    },
    now,
  );
}

/**
 * Put a show in a band and order it, in one go.
 *
 * One gesture, one edit: two calls in a row would each read the document as it
 * was before the drop and the second would undo the first.
 */
export function fileShowAt(
  blob: SetListsBlob,
  showId: string,
  artistId: string | undefined,
  beforeShowId: string | null,
  now = 0,
): SetListsBlob {
  const filed = fileShow(blob, showId, artistId, now);
  // A refused hand-off between bands is refused whole, order and all.
  if (filed === blob && blob.shows[showId]?.artistId !== artistId) return blob;
  return moveShow(filed, showId, beforeShowId, now);
}

/** File a set list and order it among its new siblings, in one edit. */
export function fileSetListAt(
  blob: SetListsBlob,
  id: string,
  parent: SetListParent | undefined,
  beforeId: string | null,
  now = 0,
): SetListsBlob {
  const filed = fileSetList(blob, id, parent, now);
  if (filed === blob && blob.setLists[id]?.parent !== parent) return blob;
  return moveSetListOrder(filed, id, beforeId, now);
}

/** Order a set list among its siblings; `beforeId` null sends it last. */
export function moveSetListOrder(
  blob: SetListsBlob,
  id: string,
  beforeId: string | null,
  now = 0,
): SetListsBlob {
  if (!blob.setLists[id]) return blob;
  return touch(
    {
      ...blob,
      order: {
        ...blob.order,
        setLists: placeBefore(blob.order.setLists, id, beforeId),
      },
    },
    now,
  );
}

/**
 * File a set list under a band or a show, or unfile it with `undefined`.
 *
 * Filing never moves anything: the flat list is the whole library and always
 * shows every set. This only says where else it appears.
 */
export function fileSetList(
  blob: SetListsBlob,
  id: string,
  parent: SetListParent | undefined,
  now = 0,
): SetListsBlob {
  const list = blob.setLists[id];
  if (!list || list.role) return blob;
  const exists =
    !parent ||
    (parent.kind === 'artist'
      ? blob.artists[parent.id]
      : blob.shows[parent.id]);
  if (!exists) return blob;
  const next: SetList = { ...list, updatedAt: now };
  if (parent) next.parent = parent;
  else delete next.parent;
  return touch({ ...blob, setLists: { ...blob.setLists, [id]: next } }, now);
}

/** Everything a show holds goes back to being unfiled; the sets survive. */
export function deleteShow(
  blob: SetListsBlob,
  showId: string,
  now = 0,
): SetListsBlob {
  if (!blob.shows[showId]) return blob;
  const shows = { ...blob.shows };
  delete shows[showId];
  const setLists: Record<string, SetList> = {};
  for (const [id, list] of Object.entries(blob.setLists)) {
    if (list.parent?.kind === 'show' && list.parent.id === showId) {
      const freed: SetList = { ...list, updatedAt: now };
      delete freed.parent;
      setLists[id] = freed;
    } else setLists[id] = list;
  }
  return touch(
    {
      ...blob,
      shows,
      setLists,
      order: {
        ...blob.order,
        shows: blob.order.shows.filter((s) => s !== showId),
      },
    },
    now,
  );
}

/** A band goes, its shows go with it, and every set it held is unfiled. */
export function deleteArtist(
  blob: SetListsBlob,
  artistId: string,
  now = 0,
): SetListsBlob {
  if (!blob.artists[artistId]) return blob;
  let next = blob;
  for (const show of Object.values(blob.shows))
    if (show.artistId === artistId) next = deleteShow(next, show.id, now);

  const artists = { ...next.artists };
  delete artists[artistId];
  const setLists: Record<string, SetList> = {};
  for (const [id, list] of Object.entries(next.setLists)) {
    if (list.parent?.kind === 'artist' && list.parent.id === artistId) {
      const freed: SetList = { ...list, updatedAt: now };
      delete freed.parent;
      setLists[id] = freed;
    } else setLists[id] = list;
  }
  return touch(
    {
      ...next,
      artists,
      setLists,
      order: {
        ...next.order,
        artists: next.order.artists.filter((a) => a !== artistId),
      },
    },
    now,
  );
}

/** A copy of a show, with copies of the sets filed under it. */
export function duplicateShow(
  blob: SetListsBlob,
  showId: string,
  now = 0,
): { blob: SetListsBlob; showId: string } {
  const show = blob.shows[showId];
  if (!show) return { blob, showId: '' };
  const made = createShow(blob, show.artistId, `${show.title} copy`, now);
  if (!made.showId) return { blob, showId: '' };
  let next = made.blob;
  for (const id of blob.order.setLists) {
    const list = next.setLists[id];
    if (list?.parent?.kind !== 'show' || list.parent.id !== showId) continue;
    next = duplicateSetList(
      next,
      id,
      { kind: 'show', id: made.showId },
      now,
    ).blob;
  }
  return { blob: next, showId: made.showId };
}

/** A copy of a band, its shows, and everything filed under either. */
export function duplicateArtist(
  blob: SetListsBlob,
  artistId: string,
  now = 0,
): { blob: SetListsBlob; artistId: string } {
  const artist = blob.artists[artistId];
  if (!artist) return { blob, artistId: '' };
  const made = createArtist(blob, `${artist.title} copy`, now);
  if (!made.artistId) return { blob, artistId: '' };
  let next = made.blob;

  for (const id of blob.order.shows) {
    const show = blob.shows[id];
    if (show?.artistId !== artistId) continue;
    const copy = createShow(next, made.artistId, show.title, now);
    next = copy.blob;
    if (!copy.showId) continue;
    for (const listId of blob.order.setLists) {
      const list = next.setLists[listId];
      if (list?.parent?.kind !== 'show' || list.parent.id !== id) continue;
      next = duplicateSetList(
        next,
        listId,
        {
          kind: 'show',
          id: copy.showId,
        },
        now,
      ).blob;
    }
  }
  for (const listId of blob.order.setLists) {
    const list = next.setLists[listId];
    if (list?.parent?.kind !== 'artist' || list.parent.id !== artistId)
      continue;
    next = duplicateSetList(
      next,
      listId,
      {
        kind: 'artist',
        id: made.artistId,
      },
      now,
    ).blob;
  }
  return { blob: next, artistId: made.artistId };
}

/** A copy of a set list, entries and all, filed wherever it is told. */
export function duplicateSetList(
  blob: SetListsBlob,
  id: string,
  parent: SetListParent | undefined,
  now = 0,
): { blob: SetListsBlob; setListId: string } {
  const list = blob.setLists[id];
  if (!list) return { blob, setListId: '' };
  const made = createSetList(
    blob,
    { title: `${list.title} copy`, ...(parent ? { parent } : {}) },
    now,
  );
  if (!made.setListId) return { blob, setListId: '' };
  return {
    setListId: made.setListId,
    blob: {
      ...made.blob,
      setLists: {
        ...made.blob.setLists,
        [made.setListId]: {
          ...made.blob.setLists[made.setListId],
          entries: list.entries.map((e) => ({ ...e, id: uid('e') })),
        },
      },
    },
  };
}

export const renameArtist = (
  blob: SetListsBlob,
  id: string,
  title: string,
  now = 0,
) =>
  blob.artists[id]
    ? touch(
        {
          ...blob,
          artists: {
            ...blob.artists,
            [id]: {
              ...blob.artists[id],
              title: clamp(title, LIMITS.title) || blob.artists[id].title,
              updatedAt: now,
            },
          },
        },
        now,
      )
    : blob;

export const renameShow = (
  blob: SetListsBlob,
  id: string,
  title: string,
  now = 0,
) =>
  blob.shows[id]
    ? touch(
        {
          ...blob,
          shows: {
            ...blob.shows,
            [id]: {
              ...blob.shows[id],
              title: clamp(title, LIMITS.title) || blob.shows[id].title,
              updatedAt: now,
            },
          },
        },
        now,
      )
    : blob;

/**
 * Rename a set list. The repertoire and the favourites keep their names: they
 * are fixed ideas the app writes into, not sets a player made, and a rename
 * would only be lost the next time the page drew their headings.
 */
export const renameSetList = (
  blob: SetListsBlob,
  id: string,
  title: string,
  now = 0,
) =>
  blob.setLists[id] && !blob.setLists[id].role
    ? touch(
        {
          ...blob,
          setLists: {
            ...blob.setLists,
            [id]: {
              ...blob.setLists[id],
              title: clamp(title, LIMITS.title) || blob.setLists[id].title,
              updatedAt: now,
            },
          },
        },
        now,
      )
    : blob;

/** Delete a set list. The two role lists are permanent. */
export function deleteSetList(
  blob: SetListsBlob,
  id: string,
  now = 0,
): SetListsBlob {
  const list = blob.setLists[id];
  if (!list || list.role) return blob;
  const setLists = { ...blob.setLists };
  delete setLists[id];
  return touch(
    {
      ...blob,
      setLists,
      order: {
        ...blob.order,
        setLists: blob.order.setLists.filter((x) => x !== id),
      },
    },
    now,
  );
}

/* ── Entries ──────────────────────────────────────────────────────────── */

const withEntries = (
  blob: SetListsBlob,
  setListId: string,
  entries: SetListEntry[],
  now: number,
): SetListsBlob =>
  blob.setLists[setListId]
    ? touch(
        {
          ...blob,
          setLists: {
            ...blob.setLists,
            [setListId]: {
              ...blob.setLists[setListId],
              entries,
              updatedAt: now,
            },
          },
        },
        now,
      )
    : blob;

export function addSongEntry(
  blob: SetListsBlob,
  setListId: string,
  input: {
    songId: string;
    title?: string;
    semitones?: number;
    notes?: string;
    chartFingerprint?: string;
  },
  atIndex?: number,
  now = 0,
): { blob: SetListsBlob; entryId: string } {
  const list = blob.setLists[setListId];
  if (!list || list.entries.length >= LIMITS.entriesPerList)
    return { blob, entryId: '' };
  const entry: SetListSongEntry = {
    kind: 'song',
    id: uid('e'),
    songId: input.songId,
    ...(input.chartFingerprint
      ? { chartFingerprint: input.chartFingerprint }
      : {}),
    ...(input.title ? { title: clamp(input.title, LIMITS.title) } : {}),
    semitones: mod12(input.semitones ?? 0),
    ...(input.notes ? { notes: clamp(input.notes, LIMITS.notes) } : {}),
    createdAt: now,
  };
  const entries = [...list.entries];
  entries.splice(atIndex ?? entries.length, 0, entry);
  return {
    entryId: entry.id,
    blob: withEntries(blob, setListId, entries, now),
  };
}

export function addTextEntry(
  blob: SetListsBlob,
  setListId: string,
  text = '',
  atIndex?: number,
  now = 0,
): { blob: SetListsBlob; entryId: string } {
  const list = blob.setLists[setListId];
  if (!list || list.entries.length >= LIMITS.entriesPerList)
    return { blob, entryId: '' };
  const entry: SetListEntry = {
    kind: 'text',
    id: uid('e'),
    text: text.slice(0, LIMITS.text),
    createdAt: now,
  };
  const entries = [...list.entries];
  entries.splice(atIndex ?? entries.length, 0, entry);
  return {
    entryId: entry.id,
    blob: withEntries(blob, setListId, entries, now),
  };
}

/**
 * A Studio lead sheet, printed into a set.
 *
 * The chart travels with the entry. `projectId` is only a back-reference, so
 * the Studio can offer to push a later edit here and the set can offer to open
 * the project; losing the project loses neither the page nor its place.
 */
export function addProjectEntry(
  blob: SetListsBlob,
  setListId: string,
  input: {
    projectId?: string;
    title: string;
    chart: StoredChart;
    semitones?: number;
    notes?: string;
  },
  atIndex?: number,
  now = 0,
): { blob: SetListsBlob; entryId: string } {
  const list = blob.setLists[setListId];
  if (!list || list.entries.length >= LIMITS.entriesPerList)
    return { blob, entryId: '' };
  const entry: SetListProjectEntry = {
    kind: 'project',
    id: uid('e'),
    ...(input.projectId ? { projectId: input.projectId } : {}),
    title: clamp(input.title, LIMITS.title) || 'Untitled lead sheet',
    chart: trimChart(input.chart),
    semitones: mod12(input.semitones ?? 0),
    ...(input.notes ? { notes: clamp(input.notes, LIMITS.notes) } : {}),
    createdAt: now,
    copiedAt: now,
  };
  const entries = [...list.entries];
  entries.splice(atIndex ?? entries.length, 0, entry);
  return {
    entryId: entry.id,
    blob: withEntries(blob, setListId, entries, now),
  };
}

/** No entry may carry an unbounded chart into the one-document store. */
function trimChart(chart: StoredChart): StoredChart {
  let left = LIMITS.chartBars;
  const sections: StoredChart['sections'] = [];
  for (const section of chart.sections) {
    if (left <= 0) break;
    sections.push(
      section.bars.length <= left
        ? section
        : { ...section, bars: section.bars.slice(0, left) },
    );
    left -= section.bars.length;
  }
  return { ...chart, sections };
}

/** The player took the Studio's offer: this page becomes the current chart. */
export const replaceProjectChart = (
  blob: SetListsBlob,
  setListId: string,
  entryId: string,
  chart: StoredChart,
  title: string | undefined,
  now = 0,
) =>
  patchEntry(
    blob,
    setListId,
    entryId,
    (e) =>
      e.kind === 'project'
        ? {
            ...e,
            chart: trimChart(chart),
            ...(title ? { title: clamp(title, LIMITS.title) } : {}),
            copiedAt: now,
          }
        : e,
    now,
  );

/** Every set that carries a page printed from this project. */
export function projectEntries(
  blob: SetListsBlob,
  projectId: string,
): { setListId: string; setListTitle: string; entry: SetListProjectEntry }[] {
  const found: {
    setListId: string;
    setListTitle: string;
    entry: SetListProjectEntry;
  }[] = [];
  for (const list of Object.values(blob.setLists)) {
    for (const entry of list.entries) {
      if (entry.kind === 'project' && entry.projectId === projectId)
        found.push({
          setListId: list.id,
          setListTitle: list.title,
          entry,
        });
    }
  }
  return found;
}

/**
 * The project is gone. Cut the back-reference and keep the page — the one
 * promise a set list has to make.
 */
export function unlinkProject(
  blob: SetListsBlob,
  projectId: string,
  now = 0,
): SetListsBlob {
  let any = false;
  const setLists: SetListsBlob['setLists'] = {};
  for (const [id, list] of Object.entries(blob.setLists)) {
    let touched = false;
    const entries = list.entries.map((entry) => {
      if (entry.kind !== 'project' || entry.projectId !== projectId)
        return entry;
      touched = true;
      const next: SetListProjectEntry = { ...entry };
      delete next.projectId;
      return next;
    });
    any = any || touched;
    setLists[id] = touched ? { ...list, entries, updatedAt: now } : list;
  }
  return any ? touch({ ...blob, setLists }, now) : blob;
}

export const removeEntry = (
  blob: SetListsBlob,
  setListId: string,
  entryId: string,
  now = 0,
) =>
  withEntries(
    blob,
    setListId,
    (blob.setLists[setListId]?.entries ?? []).filter((e) => e.id !== entryId),
    now,
  );

export function duplicateEntry(
  blob: SetListsBlob,
  setListId: string,
  entryId: string,
  now = 0,
): SetListsBlob {
  const entries = blob.setLists[setListId]?.entries ?? [];
  const at = entries.findIndex((e) => e.id === entryId);
  if (at < 0) return blob;
  const copy = { ...entries[at], id: uid('e'), createdAt: now };
  const next = [...entries];
  next.splice(at + 1, 0, copy);
  return withEntries(blob, setListId, next, now);
}

/** Move the entry at `from` so it sits at `to`. */
export function reorder<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  if (from < 0 || from >= next.length) return next;
  const target = Math.max(0, Math.min(next.length - 1, to));
  if (target === from) return next;
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved);
  return next;
}

export const moveEntry = (
  blob: SetListsBlob,
  setListId: string,
  from: number,
  to: number,
  now = 0,
) =>
  withEntries(
    blob,
    setListId,
    reorder(blob.setLists[setListId]?.entries ?? [], from, to),
    now,
  );

const patchEntry = (
  blob: SetListsBlob,
  setListId: string,
  entryId: string,
  patch: (entry: SetListEntry) => SetListEntry,
  now: number,
) =>
  withEntries(
    blob,
    setListId,
    (blob.setLists[setListId]?.entries ?? []).map((e) =>
      e.id === entryId ? patch(e) : e,
    ),
    now,
  );

export const setEntryTranspose = (
  blob: SetListsBlob,
  setListId: string,
  entryId: string,
  semitones: number,
  now = 0,
) =>
  patchEntry(
    blob,
    setListId,
    entryId,
    (e) => (e.kind === 'text' ? e : { ...e, semitones: mod12(semitones) }),
    now,
  );

export const setEntryNotes = (
  blob: SetListsBlob,
  setListId: string,
  entryId: string,
  notes: string,
  now = 0,
) =>
  patchEntry(
    blob,
    setListId,
    entryId,
    (e) =>
      e.kind === 'text' ? e : { ...e, notes: clamp(notes, LIMITS.notes) },
    now,
  );

export const setEntryTitle = (
  blob: SetListsBlob,
  setListId: string,
  entryId: string,
  title: string,
  now = 0,
) =>
  patchEntry(
    blob,
    setListId,
    entryId,
    (e) =>
      e.kind === 'text' ? e : { ...e, title: clamp(title, LIMITS.title) },
    now,
  );

/** The player has looked at the corrected chart: stop flagging it. */
export const acceptChartUpdate = (
  blob: SetListsBlob,
  setListId: string,
  entryId: string,
  fingerprint: string,
  now = 0,
) =>
  patchEntry(
    blob,
    setListId,
    entryId,
    (e) => (e.kind === 'song' ? { ...e, chartFingerprint: fingerprint } : e),
    now,
  );

export const setEntryText = (
  blob: SetListsBlob,
  setListId: string,
  entryId: string,
  text: string,
  now = 0,
) =>
  patchEntry(
    blob,
    setListId,
    entryId,
    (e) => (e.kind === 'text' ? { ...e, text: text.slice(0, LIMITS.text) } : e),
    now,
  );

/* ── Favourites ───────────────────────────────────────────────────────── */

export const isFavorite = (blob: SetListsBlob, songId: string): boolean =>
  (roleList(blob, 'favorites')?.entries ?? []).some(
    (e) => e.kind === 'song' && e.songId === songId,
  );

/** The star: adds to My Favorites on top of whatever else the song is in. */
export function toggleFavorite(
  blob: SetListsBlob,
  songId: string,
  now = 0,
): SetListsBlob {
  const next = ensureDefaults(blob, now);
  const favorites = roleList(next, 'favorites')!;
  if (isFavorite(next, songId))
    return withEntries(
      next,
      favorites.id,
      favorites.entries.filter(
        (e) => !(e.kind === 'song' && e.songId === songId),
      ),
      now,
    );
  return addSongEntry(next, favorites.id, { songId }, undefined, now).blob;
}

/** One-time import of the device-only saved songs into My Favorites. */
export function migrateSavedSongs(
  blob: SetListsBlob,
  savedIds: Record<string, true>,
  now = 0,
): SetListsBlob {
  const ids = Object.keys(savedIds ?? {});
  if (ids.length === 0) return blob;
  let next = ensureDefaults(blob, now);
  for (const songId of ids)
    if (!isFavorite(next, songId)) next = toggleFavorite(next, songId, now);
  return next;
}

/* ── Save this version as… ────────────────────────────────────────────── */

/**
 * Send a Studio chart to a set list, creating the set list if that is the
 * chosen destination — one edit, like saveVersionAs. Two calls in a row would
 * each read the document as it was before, and the second would lose the first.
 */
export function sendProjectChart(
  blob: SetListsBlob,
  input: {
    destination: SaveDestination;
    projectId?: string;
    title: string;
    chart: StoredChart;
    semitones?: number;
    notes?: string;
  },
  now = 0,
): { blob: SetListsBlob; setListId: string; entryId: string } {
  let next = ensureDefaults(blob, now);
  let setListId: string;
  if (input.destination.kind === 'new') {
    const created = createSetList(
      next,
      { title: input.destination.title },
      now,
    );
    next = created.blob;
    setListId = created.setListId;
  } else {
    setListId = input.destination.setListId;
    if (!next.setLists[setListId]) setListId = roleList(next, 'inbox')!.id;
  }
  const added = addProjectEntry(
    next,
    setListId,
    {
      ...(input.projectId ? { projectId: input.projectId } : {}),
      title: input.title,
      chart: input.chart,
      semitones: input.semitones,
      notes: input.notes,
    },
    undefined,
    now,
  );
  return { blob: added.blob, setListId, entryId: added.entryId };
}

export function saveVersionAs(
  blob: SetListsBlob,
  input: {
    songId: string;
    name?: string;
    semitones?: number;
    notes?: string;
    chartFingerprint?: string;
    destination: SaveDestination;
  },
  now = 0,
): { blob: SetListsBlob; setListId: string; entryId: string } {
  let next = ensureDefaults(blob, now);
  let setListId: string;
  if (input.destination.kind === 'new') {
    const created = createSetList(
      next,
      { title: input.destination.title },
      now,
    );
    next = created.blob;
    setListId = created.setListId;
  } else {
    setListId = input.destination.setListId;
    if (!next.setLists[setListId]) setListId = roleList(next, 'inbox')!.id;
  }
  const added = addSongEntry(
    next,
    setListId,
    {
      songId: input.songId,
      title: input.name,
      semitones: input.semitones,
      notes: input.notes,
      chartFingerprint: input.chartFingerprint,
    },
    undefined,
    now,
  );
  return { blob: added.blob, setListId, entryId: added.entryId };
}

/* ── Reading ──────────────────────────────────────────────────────────── */

/** A show as the organiser draws it: its name, and what is filed under it. */
export interface ShowNode {
  show: Show;
  setLists: SetList[];
}

export interface ArtistNode {
  artist: Artist;
  shows: ShowNode[];
  /** Filed under the band itself rather than under one of its shows. */
  setLists: SetList[];
}

/**
 * The organiser: every band with its shows, then the shows that belong to no
 * band. A set list filed nowhere appears in neither — it is in the flat list,
 * which holds everything regardless.
 */
export interface SetListOrganiser {
  artists: ArtistNode[];
  /** Shows standing on their own: a one-off, a festival, a dep gig. */
  looseShows: ShowNode[];
}

export function organiser(blob: SetListsBlob): SetListOrganiser {
  const filedUnder = (kind: 'artist' | 'show', id: string): SetList[] =>
    blob.order.setLists
      .map((listId) => blob.setLists[listId])
      .filter(
        (list): list is SetList =>
          !!list && list.parent?.kind === kind && list.parent.id === id,
      );

  const showsOf = (artistId?: string): ShowNode[] =>
    blob.order.shows
      .map((id) => blob.shows[id])
      .filter((show): show is Show => !!show && show.artistId === artistId)
      .map((show) => ({ show, setLists: filedUnder('show', show.id) }));

  return {
    artists: blob.order.artists
      .map((id) => blob.artists[id])
      .filter((artist): artist is Artist => !!artist)
      .map((artist) => ({
        artist,
        shows: showsOf(artist.id),
        setLists: filedUnder('artist', artist.id),
      })),
    looseShows: showsOf(undefined),
  };
}

/**
 * Every set list as a destination, with the path it is filed under, for the
 * pickers that ask "where should this go?".
 */
export function setListOptions(
  blob: SetListsBlob,
): { id: string; label: string }[] {
  const pathOf = (list: SetList): string => {
    if (list.role) return list.title;
    const parent = list.parent;
    if (!parent) return list.title;
    if (parent.kind === 'artist')
      return `${blob.artists[parent.id]?.title ?? '?'} ▸ ${list.title}`;
    const show = blob.shows[parent.id];
    if (!show) return list.title;
    const band = show.artistId ? blob.artists[show.artistId]?.title : undefined;
    return `${band ? `${band} ▸ ` : ''}${show.title} ▸ ${list.title}`;
  };
  return blob.order.setLists
    .map((id) => blob.setLists[id])
    .filter((list): list is SetList => !!list)
    .map((list) => ({ id: list.id, label: pathOf(list) }));
}

/** Every set list, in order — the flat library, role lists excluded. */
export const flatSetLists = (blob: SetListsBlob): SetList[] =>
  blob.order.setLists
    .map((id) => blob.setLists[id])
    .filter((list): list is SetList => !!list && !list.role);

export const estimateBlobBytes = (blob: SetListsBlob): number =>
  JSON.stringify(blob).length;
