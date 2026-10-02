import { sameJson } from '@/content/suggestions/keys';
import {
  dependencyStands,
  identityTaken,
  isExternalIdPath,
  type SuggestionStatus,
} from '@/content/suggestions/status';
import type {
  Suggestion,
  SuggestionProvider,
  SuggestionTier,
} from '@/content/suggestions/types';

/**
 * The bulk import's rules (design E.2): which suggestions go into the repo
 * files, and why every other one does not.
 *
 * The owner asked for everything at once ("bulk import everything now",
 * 30 September 2026), so the import takes every sure and likely suggestion
 * the importer's artifacts and the app's Stage-1 planners offer, and writes
 * each as plain data, exactly as a value typed in by hand. What it holds
 * back is what no person would want written without looking:
 *
 *  1. Ambiguous rows, and every row resting on one (`dependsOn`). An
 *     app row that links an artist it found by name is ambiguous too when
 *     another artist goes by that name (`NAME_MATCHED`): the credits make
 *     namesakes, such as The Clash's Mick Jones and Foreigner's.
 *  2. External ids. The site keeps no outside catalogue's ids, so an
 *     identity row is never written; it is trusted as the identity the
 *     item's other rows rest on (`identityTaken`), unless someone rejected
 *     it.
 *  3. Two values for one field. The rows offering a value for the same
 *     path of the same item are ranked, by tier, then confidence, then the
 *     number of providers who agree; a strict winner goes in and the rest
 *     "lost". A tie at the top writes nothing: the sources disagree, and a
 *     person picks. Rows adding to a list (`add`) all go.
 *  4. Anything already stated. A value is written only where the path is
 *     empty; a different value there is a conflict, left for a person.
 *  5. Student-visible fields beyond the two `STUDENT_VISIBLE` names: song
 *     credits only on a song that had none when the run started, and a
 *     song's year only where it has none. `--hold-student-visible` holds
 *     both back. Nothing else the import writes reaches a student.
 *  6. `KNOWN_WRONG`: rows the design already found wrong.
 *  7. Rows out of the `--only` groups asked for.
 *
 * Records a row needs are made first by `decide` (the importer's releases,
 * labels, studios, places and credited people); a record that would not be
 * taken refuses the rows needing it, and the run lists them. Every row gets
 * a verdict, and the run's report lists each one.
 *
 * Pure: the caller hands in the suggestions, the bodies and the statuses,
 * so tests drive it with made-up rows and the run (`importAll.ts`) with the
 * store's. The rule text here is for the developer report only; nothing
 * here is shown on the site.
 */

type Body = Record<string, unknown>;

/* ── Groups (`--only`) ─────────────────────────────────────────────── */

/**
 * What `--only` picks from: one group per kind of thing a row is about.
 * A run takes the groups in this order, each to its end before the next
 * (the plan's artists, then songs, then events, then progressions), so one
 * run over all of them gives what four runs, one group each, would: an
 * event's subjects are planned knowing every person the songs' credits
 * made, whichever way the owner runs it.
 */
export const IMPORT_GROUPS = [
  'artists',
  'songs',
  'events',
  'progressions',
] as const;
export type ImportGroup = (typeof IMPORT_GROUPS)[number];

/**
 * The content kinds each group's rows target. A release is a song's: its
 * Label row rests on the song's Album row, which made it. A row about any
 * other kind (none is offered today) belongs to no group, and goes in only
 * when `--only` is left out.
 */
export const GROUP_KINDS: Readonly<Record<ImportGroup, readonly string[]>> = {
  artists: ['artist'],
  songs: ['song', 'release'],
  events: ['globe_event'],
  progressions: ['chord_progression'],
};

/** The group a row about `kind` is in; null for a kind in none. */
export function groupOf(kind: string): ImportGroup | null {
  for (const group of IMPORT_GROUPS)
    if (GROUP_KINDS[group].includes(kind)) return group;
  return null;
}

/** Reads `--only artists,songs`; throws naming a group it does not know. */
export function parseGroups(text: string): Set<ImportGroup> {
  const groups = new Set<ImportGroup>();
  for (const part of text.split(',')) {
    const name = part.trim();
    if (!name) continue;
    if (!(IMPORT_GROUPS as readonly string[]).includes(name))
      throw new Error(
        `--only takes ${IMPORT_GROUPS.join(', ')}, comma-separated; got "${name}"`,
      );
    groups.add(name as ImportGroup);
  }
  if (!groups.size) throw new Error('--only needs at least one group');
  return groups;
}

/* ── Known wrong ───────────────────────────────────────────────────── */

/**
 * A row the design found wrong, matched by what it is about rather than
 * by id, so it stays matched when the importer emits it again. Every field
 * given must match: `target` and `path` exactly, `value` as JSON,
 * `provider` among the row's sources, and `names` anywhere in the row's
 * target, value or required records (a registry slug no row may use).
 */
export interface KnownWrong {
  /** A short handle, for the report. */
  name: string;
  /** Why it is wrong, for the report. */
  why: string;
  target?: { kind: string; slug: string };
  path?: string;
  value?: unknown;
  provider?: SuggestionProvider;
  names?: string;
}

export const KNOWN_WRONG: readonly KnownWrong[] = [
  {
    name: 'hallelujah-progression',
    why: 'Sheet 578 is "Hallelujah"; the planner read it as the start of Ray Charles\'s "Hallelujah I Love Her So", which it is not (graph design, Progression songs)',
    target: { kind: 'chord_progression', slug: '578' },
    path: 'songIds[]',
    value: 'hallelujah_i_love_her_so',
  },
  {
    name: 'sweet-dreams-compilation',
    why: 'The importer matched sweet_dreams to a 1987 "Sweet Dreams" found only on compilations, not "Sweet Dreams (Are Made of This)" (graph design, F2 oddities)',
    target: { kind: 'song', slug: 'sweet_dreams' },
    provider: 'musicbrainz',
  },
  {
    name: 'portland-maine',
    why: '"Portland, Maine" is a place the registry holds as an artist; it waits on the owner\'s decision to take it out (graph design, open item 8)',
    names: 'portland-maine',
  },
  {
    name: 'manila-sound',
    why: '"Manila Sound" is a scene the registry holds as an artist; it waits on the owner\'s decision to take it out (graph design, open item 8)',
    names: 'manila-sound',
  },
  // Found after the import of 30 September 2026, taken out by hand and
  // rejected in the decisions log (design doc, Amendment 6).
  {
    name: 'dock-of-the-bay-film-producers',
    why: 'The merged recording carried a film soundtrack\'s producers: Jerry Bruckheimer did not produce "(Sittin\' On) The Dock Of The Bay"',
    target: { kind: 'song', slug: 'sittin_on_the_dock_of_the_bay' },
    path: 'credits[]',
    names: 'jerry-bruckheimer',
  },
  {
    name: 'dock-of-the-bay-film-producers',
    why: 'The merged recording carried a film soundtrack\'s producers: Don Simpson did not produce "(Sittin\' On) The Dock Of The Bay"',
    target: { kind: 'song', slug: 'sittin_on_the_dock_of_the_bay' },
    path: 'credits[]',
    names: 'don-simpson',
  },
  {
    name: 'dock-of-the-bay-1964-album',
    why: '"Pain in My Heart" (1964) predates the 1968 song; the match dated the recording by its earliest take',
    target: { kind: 'song', slug: 'sittin_on_the_dock_of_the_bay' },
    path: 'releases[]',
    names: 'otis-redding-pain-in-my-heart',
  },
  {
    name: 'eric-clapton-still-active',
    why: 'Eric Clapton still tours; a work-period end of 2023 is not the end of his career',
    target: { kind: 'artist', slug: 'eric-clapton' },
    path: 'activeTo',
  },
];

/* ── Doubtful rows ─────────────────────────────────────────────────── */

/** "… says the group has not ended": one source has the group still going. */
const NOT_ENDED = /\bhas not ended\b/i;
/** "our year 1968 and <catalogue>'s 1964 differ": the recording is dated otherwise. */
const YEARS_DIFFER = /^our year \d{4} and .+ \d{4} differ$/i;
/** "the album came out in 2013, 35 years after the recording". */
const ALBUM_LATER =
  /^the album came out in \d{4}, (\d+) years? after the recording$/i;
/** How many years after the recording an album may come out and still be its own. */
export const ALBUM_LATER_LIMIT = 5;

/**
 * Why a row's own evidence doubts it, or null when it does not. Found in
 * the import of 30 September 2026, each of these let a wrong value in:
 *
 *  - an `activeTo` that another source contradicts by saying the group has
 *    not ended (Kraftwerk read as ending in 2003);
 *  - a song row read from a recording dated other than the song: a merged
 *    or earlier take, whose credits and album may be another session's
 *    (film producers on "Dock of the Bay");
 *  - an album that came out `ALBUM_LATER_LIMIT` or more years after the
 *    recording: a compilation or a soundtrack, not the song's own album.
 *
 * The bulk import leaves such a row for a person in the Table.
 */
export function doubtOf(
  suggestion: Pick<Suggestion, 'path' | 'evidence'>,
): string | null {
  const evidence = suggestion.evidence ?? [];
  if (
    suggestion.path === 'activeTo' &&
    evidence.some((line) => NOT_ENDED.test(line))
  )
    return 'another source says the group has not ended';
  if (evidence.some((line) => YEARS_DIFFER.test(line.trim())))
    return 'the recording it was read from is dated other than the song';
  for (const line of evidence) {
    const later = ALBUM_LATER.exec(line.trim());
    if (later && Number(later[1]) >= ALBUM_LATER_LIMIT)
      return `the album came out ${later[1]} years after the recording`;
  }
  return null;
}

/** Whether a value holds this string anywhere: as itself, in a list, in an object. */
const mentions = (value: unknown, text: string): boolean =>
  value === text ||
  (Array.isArray(value) && value.some((item) => mentions(item, text))) ||
  (!!value &&
    typeof value === 'object' &&
    Object.values(value).some((field) => mentions(field, text)));

/** The `KNOWN_WRONG` entry a row matches; null when none does. */
export function knownWrongFor(
  suggestion: Suggestion,
  list: readonly KnownWrong[] = KNOWN_WRONG,
): KnownWrong | null {
  for (const entry of list) {
    if (
      entry.target &&
      (entry.target.kind !== suggestion.target.kind ||
        entry.target.slug !== suggestion.target.slug)
    )
      continue;
    if (entry.path !== undefined && entry.path !== suggestion.path) continue;
    if (entry.value !== undefined && !sameJson(entry.value, suggestion.value))
      continue;
    if (
      entry.provider &&
      !suggestion.sources.some((source) => source.provider === entry.provider)
    )
      continue;
    if (
      entry.names !== undefined &&
      suggestion.target.slug !== entry.names &&
      !mentions(suggestion.value, entry.names) &&
      !(suggestion.requires ?? []).some(
        (record) =>
          record.slug === entry.names || mentions(record.body, entry.names!),
      )
    )
      continue;
    return entry;
  }
  return null;
}

/* ── Student-visible fields ────────────────────────────────────────── */

/**
 * A field students read that the import may fill, and when. Everything
 * else the import writes is read only by the console: an artist's record
 * fields (artists.json), releases, studios, labels and `pin: false`
 * places, a song's releases and session ids (a session holding only ids
 * shows students nothing), and the id fields of globe events and
 * progressions. No song-to-event derivation runs, and the globe's roster,
 * cities, song events, song pins and `bundled.ts` are never written.
 */
export interface StudentVisibleField {
  name: 'song-credits' | 'song-year';
  kind: 'song';
  /** Where students see it. */
  shows: string;
  /** When the import may fill it, in words. */
  when: string;
  /** Whether a row's path is this field (a credit's own fields included). */
  covers(path: string): boolean;
  /** Whether the song, as the run found it, lets the import fill it. */
  open(start: Body | undefined): boolean;
}

export const STUDENT_VISIBLE: readonly StudentVisibleField[] = [
  {
    name: 'song-credits',
    kind: 'song',
    shows: 'the Credits list on the song page (SongCredits)',
    when: 'only on a song that had no credits when the run started',
    covers: (path) => path === 'credits' || path.startsWith('credits['),
    open: (start) =>
      !(Array.isArray(start?.credits) && start.credits.length > 0),
  },
  {
    name: 'song-year',
    kind: 'song',
    shows: 'the year beside the title on the song page (SongDetailView)',
    when: 'only on a song with no year',
    covers: (path) => path === 'year',
    open: (start) => start?.year === undefined || start.year === null,
  },
];

/** The student-visible field a row writes; null for any other row. */
export function studentVisibleField(
  suggestion: Pick<Suggestion, 'target' | 'path'>,
): StudentVisibleField | null {
  return (
    STUDENT_VISIBLE.find(
      (field) =>
        field.kind === suggestion.target.kind && field.covers(suggestion.path),
    ) ?? null
  );
}

/* ── Ranking one field's values ────────────────────────────────────── */

const TIER_RANK: Record<SuggestionTier, number> = {
  sure: 2,
  likely: 1,
  ambiguous: 0,
};

/** How many providers offer a row: two who agree are one row with both. */
export const providerCount = (suggestion: Pick<Suggestion, 'sources'>) =>
  new Set(suggestion.sources.map((source) => source.provider)).size;

/**
 * Orders two rows for one field, the better first: the surer tier, then
 * the higher confidence, then more providers agreeing. 0 means neither is
 * better, which at the top of a field is a tie.
 */
export function compareRows(
  a: Pick<Suggestion, 'tier' | 'confidence' | 'sources'>,
  b: Pick<Suggestion, 'tier' | 'confidence' | 'sources'>,
): number {
  return (
    TIER_RANK[b.tier] - TIER_RANK[a.tier] ||
    b.confidence - a.confidence ||
    providerCount(b) - providerCount(a)
  );
}

/** One field's rows ranked: the winner, or none when the top two tie. */
export interface Ranked {
  winner: Suggestion | null;
  /** Every row that did not win, best first. */
  others: Suggestion[];
}

export function rankField(rows: readonly Suggestion[]): Ranked {
  const ordered = [...rows].sort(
    (a, b) => compareRows(a, b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  if (ordered.length > 1 && compareRows(ordered[0], ordered[1]) === 0)
    return { winner: null, others: ordered };
  return { winner: ordered[0] ?? null, others: ordered.slice(1) };
}

/** The field a `set` row fills: its item and path. */
const fieldKey = (suggestion: Suggestion) =>
  `${suggestion.target.kind}\u0000${suggestion.target.slug}\u0000${suggestion.path}`;

/* ── Verdicts ──────────────────────────────────────────────────────── */

/**
 * Why a row is left out, one word each, as the report groups them.
 *
 *  - `out-of-scope`: its group was not asked for (`--only`), or its
 *    group's turn has not come (the run goes group by group).
 *  - `identity`: an external id, never written; trusted as the identity
 *    the item's other rows rest on.
 *  - `ambiguous`: its sources point at more than one thing.
 *  - `known-wrong`: on the `KNOWN_WRONG` list.
 *  - `doubtful`: its own evidence doubts it (`doubtOf`), so a person
 *    looks at it in the Table.
 *  - `held`: a student-visible field, and the run holds those back.
 *  - `student-visible-filled`: a student-visible field the song already
 *    had when the run started (credits on a song that had some).
 *  - `already`: the item says it already.
 *  - `conflict`: the item says something else there; never written over.
 *  - `decided`: someone rejected or dropped it, or accepted it and took it
 *    out by hand since.
 *  - `unreachable`: it cannot be written where it points.
 *  - `sources-disagree`: another row offers a different value for the same
 *    field, and neither ranks higher.
 *  - `lost`: another row for the same field ranks higher.
 *  - `rests-on-skipped`: the row it rests on is left out.
 *  - `refused`: a save refused it in an earlier wave (a record it needs
 *    would not be taken, say); the run lists it with the refusals.
 */
export type SkipReason =
  | 'out-of-scope'
  | 'identity'
  | 'ambiguous'
  | 'known-wrong'
  | 'doubtful'
  | 'held'
  | 'student-visible-filled'
  | 'already'
  | 'conflict'
  | 'decided'
  | 'unreachable'
  | 'sources-disagree'
  | 'lost'
  | 'rests-on-skipped'
  | 'refused';

export const SKIP_REASONS: readonly SkipReason[] = [
  'out-of-scope',
  'identity',
  'ambiguous',
  'known-wrong',
  'doubtful',
  'held',
  'student-visible-filled',
  'already',
  'conflict',
  'decided',
  'unreachable',
  'sources-disagree',
  'lost',
  'rests-on-skipped',
  'refused',
];

export type Verdict =
  /** Goes in this wave. */
  | { state: 'take' }
  /** Waits for the row it rests on, which goes in this wave or a later one. */
  | { state: 'wait'; on: string }
  | {
      state: 'skip';
      reason: SkipReason;
      /** In words, for the report. */
      detail: string;
      /** For a conflict: what the item holds now. */
      current?: unknown;
      /** For `lost`, `sources-disagree` and `rests-on-skipped`: the other rows. */
      rows?: string[];
    };

type Skip = Extract<Verdict, { state: 'skip' }>;

const skip = (
  reason: SkipReason,
  detail: string,
  extra: Partial<Pick<Skip, 'current' | 'rows'>> = {},
): Skip => ({ state: 'skip', reason, detail, ...extra });

/** What a status other than open means for the import. */
function notOpen(
  status: Exclude<SuggestionStatus, 'open'>,
  current: () => unknown,
): Skip {
  switch (status) {
    case 'applied':
      return skip('already', 'the item says it already');
    case 'conflict':
      return skip('conflict', 'the item says something else there', {
        current: current(),
      });
    case 'unreachable':
      return skip('unreachable', 'it cannot be written where it points');
    case 'rejected':
      return skip('decided', 'it was rejected');
    case 'dropped':
      return skip('decided', 'it was dropped');
    case 'accepted':
      return skip('decided', 'it is accepted already');
    case 'removed':
      return skip(
        'decided',
        'it was accepted once and taken out by hand since',
      );
  }
}

/**
 * Where the app's planners link a record they found by its name in text
 * (an event's title and tags name its artists), by the kind of record the
 * value's slugs are. The importer links by the outside catalogue's own
 * ids, so its rows are never read this way.
 */
export const NAME_MATCHED: readonly {
  kind: string;
  path: string;
  names: string;
}[] = [
  { kind: 'globe_event', path: 'artistIds', names: 'artist' },
  { kind: 'globe_event', path: 'artistIds[]', names: 'artist' },
];

/**
 * Why a row only the app offers is ambiguous, or null: it links a record
 * it found by name, under `NAME_MATCHED`, and another record of that kind
 * goes by the same name, so the text does not say which is meant.
 */
function namesakeIn(
  suggestion: Suggestion,
  namesakes: JudgeInput['namesakes'],
): string | null {
  if (!namesakes) return null;
  if (suggestion.sources.some((source) => source.provider !== 'app'))
    return null;
  const matched = NAME_MATCHED.find(
    (entry) =>
      entry.kind === suggestion.target.kind && entry.path === suggestion.path,
  );
  if (!matched) return null;
  const slugs = Array.isArray(suggestion.value)
    ? suggestion.value
    : [suggestion.value];
  for (const slug of slugs) {
    if (typeof slug !== 'string') continue;
    const others = namesakes(matched.names, slug);
    if (others.length)
      return `it links ${slug} by name, and ${others.join(', ')} ${others.length === 1 ? 'goes' : 'go'} by the same name: a person picks which is meant`;
  }
  return null;
}

/** A name as records are compared by it: case, spacing and forms aside. */
const foldName = (name: unknown): string =>
  typeof name === 'string'
    ? name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
    : '';

/**
 * `JudgeInput.namesakes` over some items: for an item, the others of its
 * kind with the same `name`.
 */
export function namesakesOf(
  items: Iterable<{ kind: string; slug: string; body: Body }>,
): (kind: string, slug: string) => string[] {
  const byName = new Map<string, string[]>();
  const nameOf = new Map<string, string>();
  for (const { kind, slug, body } of items) {
    const name = foldName(body.name);
    if (!name) continue;
    const key = `${kind}\u0000${name}`;
    byName.set(key, [...(byName.get(key) ?? []), slug]);
    nameOf.set(`${kind}\u0000${slug}`, key);
  }
  return (kind, slug) => {
    const key = nameOf.get(`${kind}\u0000${slug}`);
    return key ? byName.get(key)!.filter((other) => other !== slug) : [];
  };
}

export interface JudgeInput {
  /** Every suggestion on offer now: the importer's and the app's, merged. */
  suggestions: readonly Suggestion[];
  /** An item's body now; undefined when there is no such item (yet). */
  live(kind: string, slug: string): Body | undefined;
  /** An item's body as the run found it, for `STUDENT_VISIBLE`. */
  start(kind: string, slug: string): Body | undefined;
  /** A row's status against its item's body now and the decisions log. */
  status(suggestion: Suggestion): SuggestionStatus;
  /** What the path holds now, for a conflict's report. */
  current?(suggestion: Suggestion): unknown;
  /**
   * Whether rows about this kind are in scope: the groups `--only` asks
   * for, or the group whose turn it is. Every row is when left out.
   */
  inScope?(kind: string): boolean;
  holdStudentVisible: boolean;
  /** `KNOWN_WRONG` by default. */
  knownWrong?: readonly KnownWrong[];
  /**
   * Rows a save refused in an earlier wave. They are not offered again,
   * and the rows resting on them are left out with them.
   */
  refused?: ReadonlySet<string>;
  /**
   * The other items of a kind that go by the same name as the one under
   * `slug` (artists, today), for `NAME_MATCHED`; none when left out.
   */
  namesakes?(kind: string, slug: string): readonly string[];
}

/**
 * A verdict for every row on offer: goes in now, waits for the row it
 * rests on, or is left out and why.
 *
 * In three steps. First, what a row is on its own: its group, whether it
 * is an external id, ambiguous, known wrong or a student-visible field the
 * run may not fill, and its status against its item (only open rows go).
 * Then what it rests on: a row whose dependency stands (its item says it,
 * or it is an identity the import trusts, as `decide` reads it) goes; one
 * whose dependency goes in this wave waits for the next; one whose
 * dependency is left out is left out too. Last, the rows still going that
 * offer a value for the same field of the same item are ranked
 * (`rankField`), and the rows resting on a loser are left out with it.
 * Rows waiting on a dependency take part in the ranking, so a value that
 * arrives a wave later cannot be beaten merely by being late.
 */
export function judge(input: JudgeInput): Map<string, Verdict> {
  const byId = new Map(input.suggestions.map((s) => [s.id, s]));
  const known = input.knownWrong ?? KNOWN_WRONG;
  const statuses = new Map<string, SuggestionStatus>();
  const statusOf = (suggestion: Suggestion) => {
    let status = statuses.get(suggestion.id);
    if (status === undefined) {
      status = input.status(suggestion);
      statuses.set(suggestion.id, status);
    }
    return status;
  };

  /** What a row is on its own, before what it rests on. */
  const own = (suggestion: Suggestion): Verdict => {
    if (input.refused?.has(suggestion.id))
      return skip('refused', 'a save refused it in an earlier wave');
    const status = statusOf(suggestion);
    if (isExternalIdPath(suggestion.path)) {
      if (identityTaken(suggestion, status))
        return skip(
          'identity',
          'an external id: never written, trusted as the identity the rows about this item rest on',
        );
      if (suggestion.tier === 'ambiguous')
        return skip(
          'ambiguous',
          'an external id pointing at more than one thing',
        );
      return status === 'open'
        ? skip('identity', 'an external id: never written')
        : notOpen(status, () => input.current?.(suggestion));
    }
    if (input.inScope && !input.inScope(suggestion.target.kind))
      return skip(
        'out-of-scope',
        `about a ${suggestion.target.kind}, outside the groups asked for`,
      );
    if (suggestion.tier === 'ambiguous')
      return skip('ambiguous', 'its sources point at more than one thing');
    const wrong = knownWrongFor(suggestion, known);
    if (wrong) return skip('known-wrong', `${wrong.name}: ${wrong.why}`);
    const namesake = namesakeIn(suggestion, input.namesakes);
    if (namesake) return skip('ambiguous', namesake);
    // What the item says comes before the student-visible rules, so a value
    // already there reads as already there, and another as a conflict.
    if (status !== 'open')
      return notOpen(status, () => input.current?.(suggestion));
    const doubt = doubtOf(suggestion);
    if (doubt) return skip('doubtful', doubt);
    const field = studentVisibleField(suggestion);
    if (field && input.holdStudentVisible)
      return skip(
        'held',
        `students read ${field.name}, and the run holds those back`,
      );
    if (
      field &&
      !field.open(input.start(suggestion.target.kind, suggestion.target.slug))
    )
      return skip(
        'student-visible-filled',
        `students read ${field.name}, which the import fills ${field.when}`,
      );
    return { state: 'take' };
  };

  // Whether a dependency stands, as `decide` reads it for the import: its
  // item says it, or it is an identity the import trusts and what that in
  // turn rests on stands.
  const standing = new Map<string, boolean>();
  const stands = (id: string): boolean => {
    const before = standing.get(id);
    if (before !== undefined) return before;
    standing.set(id, false);
    const dependency = byId.get(id);
    let result = false;
    if (dependency) {
      result =
        dependencyStands(
          dependency,
          input.live(dependency.target.kind, dependency.target.slug),
        ) ||
        (identityTaken(dependency, statusOf(dependency)) &&
          (!dependency.dependsOn || stands(dependency.dependsOn)));
    }
    standing.set(id, result);
    return result;
  };

  const verdicts = new Map<string, Verdict>();
  for (const suggestion of input.suggestions)
    verdicts.set(suggestion.id, own(suggestion));

  /** What a row resting on `on`, which does not stand, is. */
  const restingOn = (on: string): Verdict => {
    const dependency = verdicts.get(on);
    if (!dependency)
      return skip(
        'rests-on-skipped',
        'the row it rests on is not offered any more',
        { rows: [on] },
      );
    if (dependency.state !== 'skip') return { state: 'wait', on };
    // Out of scope with it: judged again when its group's turn comes, and
    // left out only if that never does.
    if (dependency.reason === 'out-of-scope')
      return skip(
        'out-of-scope',
        'the row it rests on is outside the groups asked for',
        { rows: [on] },
      );
    return skip(
      'rests-on-skipped',
      `the row it rests on is left out (${dependency.reason})`,
      { rows: [on] },
    );
  };

  /**
   * Settles what each row rests on against the verdicts as they are:
   * a dependency left out leaves its dependants out, one going makes them
   * wait. Repeats until nothing moves, since a chain settles a link a turn.
   */
  const settle = () => {
    let moved = true;
    while (moved) {
      moved = false;
      for (const suggestion of input.suggestions) {
        const verdict = verdicts.get(suggestion.id)!;
        if (verdict.state === 'skip' || !suggestion.dependsOn) continue;
        const on = suggestion.dependsOn;
        if (stands(on)) {
          if (verdict.state !== 'take') {
            verdicts.set(suggestion.id, { state: 'take' });
            moved = true;
          }
          continue;
        }
        const next = restingOn(on);
        // A skip is final (passed over above), and a wait names the same
        // row each time, so a change of state is the only change there is.
        if (next.state !== verdict.state) {
          verdicts.set(suggestion.id, next);
          moved = true;
        }
      }
    }
  };
  settle();

  // One value per field: the `set` rows still going, ranked by field.
  const fields = new Map<string, Suggestion[]>();
  for (const suggestion of input.suggestions) {
    if (suggestion.op !== 'set') continue;
    if (verdicts.get(suggestion.id)!.state === 'skip') continue;
    const key = fieldKey(suggestion);
    fields.set(key, [...(fields.get(key) ?? []), suggestion]);
  }
  for (const rows of fields.values()) {
    if (rows.length < 2) continue;
    const { winner, others } = rankField(rows);
    const values = (list: readonly Suggestion[]) =>
      list.map((row) => JSON.stringify(row.value)).join(' or ');
    if (!winner) {
      const top = others.filter((row) => compareRows(row, others[0]) === 0);
      for (const row of others)
        verdicts.set(
          row.id,
          skip(
            'sources-disagree',
            `${top.length} sources offer ${values(top)} for ${row.path}, and none ranks higher`,
            { rows: others.filter((o) => o !== row).map((o) => o.id) },
          ),
        );
      continue;
    }
    for (const row of others)
      verdicts.set(
        row.id,
        skip(
          'lost',
          `${JSON.stringify(winner.value)} (${winner.tier}, ${winner.confidence}) ranks higher for ${row.path}`,
          { rows: [winner.id] },
        ),
      );
  }
  settle();
  return verdicts;
}

/* ── The gate: what the planned files may not do ───────────────────── */

const isPlainObject = (value: unknown): value is Body =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/**
 * Every place `after` no longer says what `before` said: a key taken out,
 * a value changed, a list shortened or an element changed. Adding is
 * fine (a key where there was none, elements after a list's last), and is
 * all the import may do to an item it found. Paths are spelled as the
 * suggestions spell them (`born.date`, `credits[2].role`).
 */
export function overwrittenPaths(
  before: unknown,
  after: unknown,
  at = '',
): string[] {
  const here = at || '(the body)';
  if (Array.isArray(before)) {
    if (!Array.isArray(after)) return [here];
    if (after.length < before.length) return [`${here} (shortened)`];
    return before.flatMap((element, index) =>
      overwrittenPaths(element, after[index], `${at}[${index}]`),
    );
  }
  if (isPlainObject(before)) {
    if (!isPlainObject(after)) return [here];
    return Object.keys(before).flatMap((key) =>
      key in after
        ? overwrittenPaths(before[key], after[key], at ? `${at}.${key}` : key)
        : [`${at ? `${at}.${key}` : key} (taken out)`],
    );
  }
  return sameJson(before, after) ? [] : [here];
}

/**
 * The fields of each kind the import may change on an item it found, by
 * top-level key; any other change is refused by the gate. What students
 * read of these is checked beside it (`studentVisibleChanges`).
 */
const MAY_CHANGE: Readonly<Record<string, readonly string[] | 'any'>> = {
  // Credits and the year are STUDENT_VISIBLE's; releases and the session's
  // ids reach no student.
  song: ['credits', 'year', 'releases', 'session'],
  // The v2 id fields; no student code reads them.
  globe_event: [
    'artistIds',
    'songIds',
    'placeId',
    'releaseIds',
    'studioIds',
    'labelIds',
  ],
  chord_progression: ['songIds'],
  // Record fields, in artists.json; the roster's own fields never change.
  artist: 'any',
  release: 'any',
  studio: 'any',
  label: 'any',
  // A city the globe pins never changes: the import only makes places.
  globe_city: [],
  artist_location: [],
};

/** The artist fields the globe's roster (artistRegistry.ts) holds. */
const ROSTER_FIELDS = ['slug', 'name', 'aliases'];

/** What of a song's session a student reads (SongCredits `recorded`). */
const SESSION_SHOWN = ['studio', 'city', 'label', 'recordedYear'];

/**
 * What the import would change that it may not, on one item: for an item
 * the run found (`start`), a field outside `MAY_CHANGE`, a roster field,
 * a session's shown text, or a student-visible field `STUDENT_VISIBLE`
 * does not open (or `hold` holds back); for a record it makes, a place
 * the globe would pin. Empty when the change is one the rules allow.
 * `after` null is a removal, which the import never makes.
 */
export function studentVisibleChanges(
  kind: string,
  start: Body | undefined,
  after: Body | null,
  options: { hold: boolean },
): string[] {
  if (after === null) return ['removed'];
  if (!start) {
    // A record the import makes. A place goes in places.json only with
    // `pin: false`; anything else would be a new pin on the globe.
    if (kind === 'globe_city' && after.pin !== false)
      return ['a new place the globe would pin (pin is not false)'];
    return MAY_CHANGE[kind] === undefined
      ? [`a new ${kind}, which the import never makes`]
      : [];
  }
  const allowed = MAY_CHANGE[kind];
  if (allowed === undefined) return [`a ${kind}, which the import never edits`];
  const problems: string[] = [];
  const keys = new Set([...Object.keys(start), ...Object.keys(after)]);
  for (const key of keys) {
    if (sameJson(start[key], after[key])) continue;
    if (kind === 'artist' && ROSTER_FIELDS.includes(key)) {
      problems.push(`${key} (a roster field the globe reads)`);
      continue;
    }
    if (allowed !== 'any' && !allowed.includes(key)) {
      problems.push(
        `${key} (not a field the import writes on a ${kind.replace(/_/g, ' ')})`,
      );
      continue;
    }
    if (kind !== 'song') continue;
    if (key === 'session') {
      const was = isPlainObject(start.session) ? start.session : {};
      const now = isPlainObject(after.session) ? after.session : {};
      for (const shown of SESSION_SHOWN)
        if (!sameJson(was[shown], now[shown]))
          problems.push(`session.${shown} (students read it)`);
      continue;
    }
    const field = studentVisibleField({
      target: { kind, slug: '' },
      path: key,
    });
    if (!field) continue;
    if (options.hold) problems.push(`${key} (held back, and changed)`);
    else if (!field.open(start))
      problems.push(`${key} (students read it, and it was filled)`);
  }
  return problems;
}

/* ── What the site may not say ─────────────────────────────────────── */

/**
 * What names an outside catalogue in a text the site reads. The owner
 * decided on 30 September 2026 that neither catalogue the importer reads is
 * mentioned anywhere on the site, so this matches:
 *
 *  - the catalogue's name, or a link to its pages;
 *  - its parent foundation's name;
 *  - the word for its ids, or an id shaped like one (a UUID);
 *  - the marks a guessed value carries (`externalIds`, `unverified`).
 *
 * The import writes values and records bare (`withoutProvenance` in the
 * mock's import policy), so a file it plans never holds more of these than
 * it did before. The gate checks that, as a last guard against a field the
 * stripping does not know about, such as a record's description quoting a
 * catalogue.
 *
 * A bare Wikidata item id (a Q and digits) is left to the stripping. As
 * text it cannot be told apart from a name such as the band Q65.
 */
export const SOURCE_MENTION =
  /musicbrainz|wikidata|metabrainz|\bmbids?\b|\bexternalIds\b|\bunverified\b|\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

/** Every match of `SOURCE_MENTION` in a text, in order; none for no text. */
export const sourceMentions = (text: string | null): string[] =>
  text === null ? [] : (text.match(SOURCE_MENTION) ?? []);

/**
 * What names an outside catalogue in any save to the site's data, whoever
 * makes it: `SOURCE_MENTION` less the `unverified` mark, which a person's
 * own guessed value may carry. The repo store refuses a save that adds one
 * (`LiveRepoStore`), so no console path can write a catalogue's name, link
 * or id into a data file.
 */
export const CATALOGUE_MENTION =
  /musicbrainz|wikidata|metabrainz|\bmbids?\b|\bexternalIds\b|\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

/**
 * The mentions `after` has beyond those `before` had, counted as a
 * multiset: a file that already named a catalogue once (a code comment,
 * say) may keep that one, and only what a write adds is reported.
 * `pattern` is `SOURCE_MENTION` unless given.
 */
export function addedSourceMentions(
  before: string | null,
  after: string | null,
  pattern: RegExp = SOURCE_MENTION,
): string[] {
  const find = (text: string | null) =>
    text === null ? [] : (text.match(pattern) ?? []);
  const had = new Map<string, number>();
  for (const mention of find(before)) {
    const key = mention.toLowerCase();
    had.set(key, (had.get(key) ?? 0) + 1);
  }
  const added: string[] = [];
  for (const mention of find(after)) {
    const key = mention.toLowerCase();
    const left = had.get(key) ?? 0;
    if (left > 0) had.set(key, left - 1);
    else added.push(mention);
  }
  return added;
}

/* ── Counting ──────────────────────────────────────────────────────── */

/**
 * A row's path with its indexes folded (`credits[3].artistGlobeId` is
 * `credits[].artistGlobeId`), so the report counts by field.
 */
export const fieldOf = (path: string): string => path.replace(/\[\d+\]/g, '[]');

/** `kind path tier`, the key the report counts by. */
export const tallyKey = (
  suggestion: Pick<Suggestion, 'target' | 'path' | 'tier'>,
): string =>
  `${suggestion.target.kind} ${fieldOf(suggestion.path)} ${suggestion.tier}`;

/** Adds one to `key`. */
export const bump = (tally: Record<string, number>, key: string, by = 1) => {
  tally[key] = (tally[key] ?? 0) + by;
};
