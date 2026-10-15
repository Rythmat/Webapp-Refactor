// ── Note ids ─────────────────────────────────────────────────────────────
// Every note a Studio project holds carries an id of its own, so a mark, a
// collaborator or (later) a selection can name the note itself rather than
// where it sits: an edit changes the track, clip, tick and pitch a note sits
// at, never its id.
//
// An id is 12 characters of the base64url alphabet. Short, because a
// note-heavy session holds thousands of them in localStorage; and never a ':'
// or a '|', which the Score's note keys and the stored marks use as
// separators. There are two shapes:
//
// - minted: random, from crypto.getRandomValues, for a note created now. The
//   first character is a letter or a digit.
// - derived: '_' and a hash, for a note that arrived without an id (a v1 or
//   v2 draft, a cloud project, an older collaborator's doc). The same input
//   always derives the same id, so opening a draft twice gives the same ids,
//   and every peer reading one collab doc agrees on them.
//
// The leading '_' keeps the two shapes apart, so a derived id can never meet
// a minted one.
//
// Ids are minted when a note is created and when an id-less note is loaded,
// never when a project is serialised. The pristine and kept-work checks
// compare two serialisations, and an id minted on the way out would make
// every untouched project look like new work. A serialiser may still settle
// ids with ensureProjectNoteIds, which derives rather than mints: the same
// project always comes out with the same ids, so two serialisations agree.

export type NoteId = string;

const ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
/** ALPHABET's first 62 characters are the letters and digits. */
const ALPHANUMERIC_COUNT = 62;
const ID_LENGTH = 12;
/** The first character of a derived id, and of no minted one. */
const DERIVED_PREFIX = '_';
/** crypto.getRandomValues fills at most this many bytes per call. */
const MAX_RANDOM_BYTES = 65536;

const IN_ALPHABET = new Uint8Array(128);
for (let i = 0; i < ALPHABET.length; i++) {
  IN_ALPHABET[ALPHABET.charCodeAt(i)] = 1;
}

/** Twelve base64url characters: either shape of note id. */
export function isNoteId(v: unknown): v is NoteId {
  if (typeof v !== 'string' || v.length !== ID_LENGTH) return false;
  for (let i = 0; i < ID_LENGTH; i++) {
    const code = v.charCodeAt(i);
    if (code >= 128 || IN_ALPHABET[code] === 0) return false;
  }
  return true;
}

function idFromBytes(bytes: Uint8Array, offset: number): NoteId {
  // The first character comes from the letters and digits only, so a minted
  // id never starts the way a derived one does.
  let id = ALPHABET[bytes[offset] % ALPHANUMERIC_COUNT];
  for (let i = 1; i < ID_LENGTH; i++) id += ALPHABET[bytes[offset + i] & 63];
  return id;
}

/** `n` fresh random ids (about 72 bits each), from one call per 5,461. */
export function mintNoteIds(n: number): NoteId[] {
  const count = Math.max(0, Math.floor(n));
  const ids: NoteId[] = new Array(count);
  const perCall = Math.floor(MAX_RANDOM_BYTES / ID_LENGTH);
  for (let start = 0; start < count; start += perCall) {
    const size = Math.min(perCall, count - start);
    const bytes = crypto.getRandomValues(new Uint8Array(size * ID_LENGTH));
    for (let k = 0; k < size; k++) {
      ids[start + k] = idFromBytes(bytes, k * ID_LENGTH);
    }
  }
  return ids;
}

/** A fresh random id, for a note created now. */
export function mintNoteId(): NoteId {
  return idFromBytes(crypto.getRandomValues(new Uint8Array(ID_LENGTH)), 0);
}

// ── Derived ids ─────────────────────────────────────────────────────────
// A small non-cryptographic hash: three 32-bit lanes, each a multiply-xor
// over the seed, crossed and finished with murmur3's fmix32. 66 of its bits
// make the 11 characters after the prefix, so within one project (up to
// hundreds of thousands of notes) two seeds landing on one id is a
// one-in-billions event, and the ensure functions below resolve even that.
//
// Never change this function: a draft that is opened by two builds would
// otherwise give its legacy notes different ids in each.

function fmix32(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return h ^ (h >>> 16);
}

function derivedNoteId(seed: string): NoteId {
  let a = 0x9e3779b9 ^ seed.length;
  let b = 0x85ebca6b;
  let c = 0xc2b2ae35;
  for (let i = 0; i < seed.length; i++) {
    const code = seed.charCodeAt(i);
    a = Math.imul(a ^ code, 0x01000193);
    b = Math.imul(b ^ code, 0x5bd1e995);
    c = Math.imul(c ^ code, 0x27d4eb2d);
  }
  a = fmix32(a ^ c);
  b = fmix32(b ^ a);
  c = fmix32(c ^ b);
  let id = DERIVED_PREFIX;
  // Characters 0-2 read bits 0-5 of lanes a, b and c, characters 3-5 bits
  // 6-11, and so on: 11 characters, 66 bits.
  for (let i = 0; i < ID_LENGTH - 1; i++) {
    const lane = i % 3 === 0 ? a : i % 3 === 1 ? b : c;
    id += ALPHABET[(lane >>> (Math.floor(i / 3) * 6)) & 63];
  }
  return id;
}

/**
 * The id of a note loaded without one: the `index`-th note of clip `clipId`,
 * counted in (startTick, note) order (the order the columnar codec stores
 * notes in). Deterministic, so loading the same draft twice never changes a
 * note's identity.
 */
export function legacyNoteId(clipId: string, index: number): NoteId {
  // The length prefix keeps `clipId` and `index` from running together.
  return derivedNoteId(`note:${clipId.length}:${clipId}:${index}`);
}

/**
 * The id for a note an older collaborator wrote with a `_cid` that is not a
 * note id (a UUID). Derived from that `_cid`, so it stays put for as long as
 * the `_cid` does, and every peer reading the doc agrees on it.
 */
export function noteIdFromCid(cid: string): NoteId {
  return derivedNoteId(`cid:${cid}`);
}

// ── Making ids whole ────────────────────────────────────────────────────

// The clean check runs on every PianoRoll drag frame (about 60 a second, via
// the store's event normaliser), so it must not allocate. Instead of a fresh
// Set per call, each id it has seen keeps an entry in one shared map, stamped
// with the number of the check that last saw it: an entry already stamped
// with this check's number is a repeat. A drag rebuilds the array every frame
// with the same ids, so after the first frame every lookup finds its entry
// and only rewrites the stamp: one hash lookup per note and no allocation
// (5 to 9 µs for a 600-note clip, the more ids the map holds the slower,
// against 30 µs for a Set per call). Only valid ids get an entry, so a known
// id needs no re-validation.
//
// The map also keeps the ids of notes long deleted, so it is emptied once it
// holds more than twice as many ids as the biggest check since it was last
// emptied (and never below SCRATCH_LIMIT), and before the stamp wraps. Sizing
// the limit by the checks keeps a project of more than SCRATCH_LIMIT notes
// allocation-free too: with a fixed limit, every project-wide check of one
// would empty the map and refill it, an object per note.
const lastCheck = new Map<string, { check: number }>();
let checkNumber = 0;
/** The ids the current check has stamped (counted on its clean paths). */
let stamped = 0;
/** The most ids one check has stamped since the map was last emptied. */
let largestCheck = 0;
const SCRATCH_LIMIT = 1 << 14;

/** The number for a new check: ids it stamps count as seen within it. */
function newCheck(): number {
  if (stamped > largestCheck) largestCheck = stamped;
  stamped = 0;
  if (
    checkNumber >= 0x3fffffff ||
    lastCheck.size > Math.max(SCRATCH_LIMIT, 2 * largestCheck)
  ) {
    lastCheck.clear();
    checkNumber = 0;
    largestCheck = 0;
  }
  return ++checkNumber;
}

/**
 * True when every note in `events` has a valid id that no note before it in
 * this check, and nothing in `taken`, has. One check can span several arrays
 * (a whole project): pass each the same `check`.
 */
function idsAreClean(
  events: readonly { id?: string }[],
  taken: ReadonlySet<string> | undefined,
  check = newCheck(),
): boolean {
  for (let i = 0; i < events.length; i++) {
    const id = events[i].id;
    if (typeof id !== 'string') return false;
    const entry = lastCheck.get(id);
    if (entry !== undefined) {
      if (entry.check === check) return false;
      entry.check = check;
    } else {
      if (!isNoteId(id)) return false;
      lastCheck.set(id, { check });
    }
    if (taken !== undefined && taken.has(id)) return false;
  }
  stamped += events.length;
  return true;
}

/** A fresh id from `mint` that nothing in `inUse` has. */
function freshId(inUse: ReadonlySet<string>, mint: () => NoteId): NoteId {
  for (let attempt = 0; attempt < 8; attempt++) {
    const id = mint();
    if (isNoteId(id) && !inUse.has(id)) return id;
  }
  // A minter that keeps colliding, or returns something that isn't an id, is
  // not asked again.
  let id = mintNoteId();
  while (inUse.has(id)) id = mintNoteId();
  return id;
}

/**
 * The same `events` array when every note has a valid id that no other note
 * here, and nothing in `taken`, has. Otherwise a copy where each note that
 * lacks one (no id, a malformed one, or a repeat: the first occurrence keeps
 * it) gets a fresh id from `mint`. Either way every id of the result is added
 * to `taken`, so a caller can walk several clips with one set.
 *
 * Returning the same array matters: collab diffs, undo and the engine's
 * reconciler all compare by reference. The clean path allocates nothing.
 */
export function withNoteIds<E extends { id?: string }>(
  events: E[],
  taken?: Set<string>,
  mint: () => NoteId = mintNoteId,
): E[] {
  if (idsAreClean(events, taken)) {
    if (taken) for (const event of events) taken.add(event.id as NoteId);
    return events;
  }
  // First pass: the ids that stay, so a fresh id can't take one of them.
  const inUse = taken ?? new Set<string>();
  const keeps = new Array<boolean>(events.length);
  for (let i = 0; i < events.length; i++) {
    const id = events[i].id;
    keeps[i] = isNoteId(id) && !inUse.has(id);
    if (keeps[i]) inUse.add(id as NoteId);
  }
  // Second pass: a fresh id for every other note.
  const out = events.slice();
  for (let i = 0; i < events.length; i++) {
    if (keeps[i]) continue;
    const id = freshId(inUse, mint);
    inUse.add(id);
    out[i] = { ...events[i], id };
  }
  return out;
}

/** What the legacy order reads off a note: where it sits, when it says. */
interface PlacedNote {
  id?: string;
  startTick?: unknown;
  note?: unknown;
}

/** A note's (startTick, note), for the legacy order. */
function orderKey({ startTick, note }: PlacedNote): [number, number] {
  return [
    typeof startTick === 'number' ? startTick : 0,
    typeof note === 'number' ? note : 0,
  ];
}

/** Each note's place in its clip's (startTick, note) order; ties keep order. */
function legacyRanks(events: readonly PlacedNote[]): number[] {
  const keys = events.map(orderKey);
  const order = events.map((_, i) => i);
  order.sort(
    (x, y) => keys[x][0] - keys[y][0] || keys[x][1] - keys[y][1] || x - y,
  );
  const ranks = new Array<number>(events.length);
  order.forEach((index, rank) => {
    ranks[index] = rank;
  });
  return ranks;
}

/**
 * The same `tracks` array when every note in the project has a valid id and
 * no two share one. Otherwise a copy, sharing every untouched track and clip,
 * where each note lacking an id of its own (none, a malformed one, or one an
 * earlier note already has: the first in track → clip → note order keeps it)
 * gets its legacy id, `legacyNoteId(clip id, its place in the clip's
 * (startTick, note) order)`. Deterministic: the same project always comes out
 * with the same ids, which is what a loader and a collab rebuild need.
 */
export function ensureProjectNoteIds<
  T extends { midiClips: { events: { id?: string }[] }[] },
>(tracks: T[]): T[] {
  // The clean scan is one check over every clip, so it allocates nothing
  // either: a collab rebuild runs it on every remote edit.
  const check = newCheck();
  let clean = true;
  for (let t = 0; clean && t < tracks.length; t++) {
    const clips = tracks[t].midiClips;
    for (let c = 0; clean && c < clips.length; c++) {
      clean = idsAreClean(clips[c].events, undefined, check);
    }
  }
  if (clean) return tracks;

  // First pass: every id that stays, so no legacy id can take one of them.
  // A clip whose notes all keep their ids plans nothing (null).
  const inUse = new Set<string>();
  const plans = tracks.map((track) =>
    track.midiClips.map((clip) => {
      let keeps: boolean[] | null = null;
      for (let i = 0; i < clip.events.length; i++) {
        const id = clip.events[i].id;
        if (isNoteId(id) && !inUse.has(id)) {
          inUse.add(id);
          continue;
        }
        if (keeps === null) keeps = clip.events.map(() => true);
        keeps[i] = false;
      }
      return keeps;
    }),
  );

  // Second pass: legacy ids for the rest, clear of all of those.
  return tracks.map((track, t) => {
    if (plans[t].every((keeps) => keeps === null)) return track;
    const midiClips = track.midiClips.map((clip, c) => {
      const keeps = plans[t][c];
      if (!keeps) return clip;
      const rawId = (clip as { id?: unknown }).id;
      const clipId = typeof rawId === 'string' ? rawId : `${t}.${c}`;
      const ranks = legacyRanks(clip.events);
      const events = clip.events.map((event, i) => {
        if (keeps[i]) return event;
        let id = legacyNoteId(clipId, ranks[i]);
        // Two clips sharing an id, or an id a note already holds: walk on
        // deterministically until one is free.
        for (let n = 1; inUse.has(id); n++) {
          id = legacyNoteId(`${clipId}#${n}`, ranks[i]);
        }
        inUse.add(id);
        return { ...event, id };
      });
      return { ...clip, events };
    });
    return { ...track, midiClips };
  });
}

// ── Checks ──────────────────────────────────────────────────────────────

/**
 * Every note without a valid id, or with an id an earlier note already has,
 * described one per line. Empty when the project's ids are whole. For tests,
 * and for the DEV watch below: tsc can't see an id-less note coming out of a
 * loader that casts its result.
 */
export function assertNoteIds(
  tracks: readonly { midiClips: { id: string; events: { id?: string }[] }[] }[],
): string[] {
  const problems: string[] = [];
  const firstAt = new Map<string, string>();
  tracks.forEach((track, t) => {
    const rawTrackId = (track as { id?: unknown }).id;
    const trackName = typeof rawTrackId === 'string' ? rawTrackId : `#${t}`;
    track.midiClips.forEach((clip) => {
      clip.events.forEach((event, i) => {
        const at = `track ${trackName} clip ${clip.id} note ${i}`;
        const id = event.id;
        if (id === undefined) {
          problems.push(`${at}: no id`);
        } else if (!isNoteId(id)) {
          problems.push(`${at}: malformed id ${JSON.stringify(id)}`);
        } else if (firstAt.has(id)) {
          problems.push(`${at}: id ${id} repeats ${firstAt.get(id)}`);
        } else {
          firstAt.set(id, at);
        }
      });
    });
  });
  return problems;
}

/**
 * DEV: warn when the tracks hold a note without a whole id. It checks a
 * moment after the tracks change (at most once per `delayMs`), so a drag
 * costs one walk over the project, not one per frame, and each distinct
 * report is logged once. Returns the unsubscribe.
 */
export function watchNoteIds(
  subscribe: (listener: () => void) => () => void,
  getTracks: () => readonly {
    midiClips: { id: string; events: { id?: string }[] }[];
  }[],
  report: (problems: string[]) => void = (problems) =>
    console.warn(
      `[noteIds] ${problems.length} note(s) without a whole id:`,
      problems.slice(0, 10),
    ),
  delayMs = 500,
): () => void {
  let lastTracks = getTracks();
  let lastReport = '';
  let timer: ReturnType<typeof setTimeout> | null = null;
  const check = () => {
    timer = null;
    const problems = assertNoteIds(getTracks());
    const summary = problems.join('\n');
    if (problems.length > 0 && summary !== lastReport) report(problems);
    lastReport = summary;
  };
  const unsubscribe = subscribe(() => {
    const tracks = getTracks();
    if (tracks === lastTracks) return;
    lastTracks = tracks;
    timer ??= setTimeout(check, delayMs);
  });
  return () => {
    unsubscribe();
    if (timer !== null) clearTimeout(timer);
  };
}
