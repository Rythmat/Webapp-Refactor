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
  order: { artists: [], showsByArtist: {}, setListsByShow: {} },
});

/** A document read back from storage, made safe to use whatever it contains. */
export function normalizeBlob(raw: unknown, now = 0): SetListsBlob {
  const blob = raw as Partial<SetListsBlob> | null | undefined;
  if (
    !blob ||
    typeof blob !== 'object' ||
    blob.schemaVersion !== SETLIST_SCHEMA_VERSION ||
    !blob.setLists ||
    !blob.order
  )
    return emptyBlob(now);

  const artists = blob.artists ?? {};
  const shows = blob.shows ?? {};
  const setLists: Record<string, SetList> = {};
  for (const [id, list] of Object.entries(blob.setLists)) {
    if (!list || typeof list !== 'object') continue;
    setLists[id] = {
      ...list,
      id,
      entries: (list.entries ?? []).filter(
        (e): e is SetListEntry =>
          !!e && (e.kind === 'song' || e.kind === 'text'),
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
      artists: blob.order.artists ?? [],
      showsByArtist: blob.order.showsByArtist ?? {},
      setListsByShow: blob.order.setListsByShow ?? {},
    },
  };
}

const touch = (blob: SetListsBlob, now: number): SetListsBlob => ({
  ...blob,
  updatedAt: now,
});

/* ── The two lists everyone starts with ───────────────────────────────── */

/**
 * The default Artist, Show and the two role lists, created on the first edit
 * so a user who never opens the feature never gets a document written.
 */
export function ensureDefaults(blob: SetListsBlob, now = 0): SetListsBlob {
  const hasRole = (role: 'inbox' | 'favorites') =>
    Object.values(blob.setLists).some((l) => l.role === role);
  if (blob.order.artists.length > 0 && hasRole('inbox') && hasRole('favorites'))
    return blob;

  let next = blob;
  let artistId = next.order.artists[0];
  if (!artistId) {
    const created = createArtist(next, DEFAULT_ARTIST_TITLE, now);
    next = created.blob;
    artistId = created.artistId;
  }
  let showId = next.order.showsByArtist[artistId]?.[0];
  if (!showId) {
    const created = createShow(next, artistId, DEFAULT_SHOW_TITLE, now);
    next = created.blob;
    showId = created.showId;
  }
  for (const [role, title] of [
    ['inbox', INBOX_TITLE],
    ['favorites', FAVORITES_TITLE],
  ] as const) {
    if (hasRoleIn(next, role)) continue;
    const created = createSetList(next, { title, showId, role }, now);
    next = created.blob;
  }
  return next;
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
        order: {
          ...blob.order,
          artists: [...blob.order.artists, artist.id],
          showsByArtist: { ...blob.order.showsByArtist, [artist.id]: [] },
        },
      },
      now,
    ),
  };
}

export function createShow(
  blob: SetListsBlob,
  artistId: string,
  title = DEFAULT_SHOW_TITLE,
  now = 0,
): { blob: SetListsBlob; showId: string } {
  const show: Show = {
    id: uid('show'),
    artistId,
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
        order: {
          ...blob.order,
          showsByArtist: {
            ...blob.order.showsByArtist,
            [artistId]: [
              ...(blob.order.showsByArtist[artistId] ?? []),
              show.id,
            ],
          },
          setListsByShow: { ...blob.order.setListsByShow, [show.id]: [] },
        },
      },
      now,
    ),
  };
}

export function createSetList(
  blob: SetListsBlob,
  opts: { title?: string; showId?: string; role?: 'inbox' | 'favorites' } = {},
  now = 0,
): { blob: SetListsBlob; setListId: string } {
  let next = blob;
  let showId = opts.showId;
  if (!showId) {
    // Auto-file: a new set list never makes the user fill in a form first.
    next = ensureDefaults(next, now);
    const artistId = next.order.artists[0];
    showId = next.order.showsByArtist[artistId]?.[0];
  }
  if (Object.keys(next.setLists).length >= LIMITS.lists)
    return { blob, setListId: '' };

  const list: SetList = {
    id: uid('sl'),
    showId: showId!,
    title: clamp(opts.title ?? 'New Set List', LIMITS.title) || 'New Set List',
    entries: [],
    ...(opts.role ? { role: opts.role } : {}),
    createdAt: now,
    updatedAt: now,
  };
  return {
    setListId: list.id,
    blob: touch(
      {
        ...next,
        setLists: { ...next.setLists, [list.id]: list },
        order: {
          ...next.order,
          setListsByShow: {
            ...next.order.setListsByShow,
            [showId!]: [...(next.order.setListsByShow[showId!] ?? []), list.id],
          },
        },
      },
      now,
    ),
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

export const renameSetList = (
  blob: SetListsBlob,
  id: string,
  title: string,
  now = 0,
) =>
  blob.setLists[id]
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
        setListsByShow: {
          ...blob.order.setListsByShow,
          [list.showId]: (blob.order.setListsByShow[list.showId] ?? []).filter(
            (x) => x !== id,
          ),
        },
      },
    },
    now,
  );
}

/** Move a set list under another show. */
export function moveSetList(
  blob: SetListsBlob,
  id: string,
  toShowId: string,
  now = 0,
): SetListsBlob {
  const list = blob.setLists[id];
  if (!list || !blob.shows[toShowId] || list.showId === toShowId) return blob;
  return touch(
    {
      ...blob,
      setLists: {
        ...blob.setLists,
        [id]: { ...list, showId: toShowId, updatedAt: now },
      },
      order: {
        ...blob.order,
        setListsByShow: {
          ...blob.order.setListsByShow,
          [list.showId]: (blob.order.setListsByShow[list.showId] ?? []).filter(
            (x) => x !== id,
          ),
          [toShowId]: [...(blob.order.setListsByShow[toShowId] ?? []), id],
        },
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

export interface SetListTree {
  artist: Artist;
  shows: { show: Show; setLists: SetList[] }[];
}

/** The whole tree in display order, skipping anything dangling. */
export function listTree(blob: SetListsBlob): SetListTree[] {
  return blob.order.artists
    .map((artistId) => blob.artists[artistId])
    .filter(Boolean)
    .map((artist) => ({
      artist,
      shows: (blob.order.showsByArtist[artist.id] ?? [])
        .map((showId) => blob.shows[showId])
        .filter(Boolean)
        .map((show) => ({
          show,
          setLists: (blob.order.setListsByShow[show.id] ?? [])
            .map((id) => blob.setLists[id])
            .filter(Boolean),
        })),
    }));
}

export const estimateBlobBytes = (blob: SetListsBlob): number =>
  JSON.stringify(blob).length;
