import { normalizeArtistName } from '@/content/graph/slugs';
import type { EdgeVia } from '@/content/graph/types';
import type {
  GenreRecord,
  SubgenreRecord,
  VocabularyKind,
  VocabularyRecordOf,
  VocabularyRecords,
} from './schemas';

/**
 * The rules a vocabulary save is held to, as pure functions over records.
 *
 * The schemas (`schemas.ts`) check each record's shape: kebab ids, a known
 * section, no blank names or padded tags. These check what one record cannot
 * see on its own — the other records, the globe's instrument list, the artist
 * registry, and everything that refers to a record. The caller passes all of
 * that in, so the same rules run in the dev content server, in tests, and
 * over the repo's own files.
 *
 * Errors refuse the save. Warnings are shown and saved anyway:
 *
 *  - IMMUTABLE_ID: an id never changes, and neither does `taught` (the
 *    curriculum's coverage is set in code; a new genre is not taught).
 *  - DUPLICATE_ID: an id used twice in a kind, or by a genre and a subgenre
 *    at once, which would make an artist's `genreIds` ambiguous.
 *  - INVALID_REFERENCE: a subgenre's `parent` that is not a genre, or an
 *    instrument's `typicalIn` naming neither level.
 *  - DUPLICATE_TAG: a globe tag on two records (it could resolve to only
 *    one), or one on the instrument or ignored lists, which say it is not a
 *    genre. A tag on the unplaced list is fine: adding it is placing it.
 *  - UNKNOWN_CODE_ID: a `worldInstrumentId` the globe's Instruments of the
 *    World does not have.
 *  - REFERENCED: a delete while anything still names the record
 *    (`references`). Rename and merge are deferred, as in the contract.
 *  - NAME_COLLISION (warning): a genre's id, name or tag that folds to a
 *    registered artist's name. The globe's matcher refuses a tag that names
 *    a genre, so that artist stops matching on it, and the registry's guard
 *    test (artistRegistry.test.ts) fails.
 *  - TAG_FOLDS_TOGETHER (warning): two records' tags that the importer reads
 *    as one name ('Rock and Roll', 'Rock & Roll'); it maps that name to
 *    whichever comes first.
 *  - ALIAS_TAG_REMOVED (warning): a tag the importer's aliases lead to was
 *    taken off, so the names aliased to it now map to nothing.
 */

export type VocabularyProblemCode =
  | 'IMMUTABLE_ID'
  | 'DUPLICATE_ID'
  | 'INVALID_REFERENCE'
  | 'DUPLICATE_TAG'
  | 'UNKNOWN_CODE_ID'
  | 'REFERENCED'
  | 'NAME_COLLISION'
  | 'TAG_FOLDS_TOGETHER'
  | 'ALIAS_TAG_REMOVED';

/** Shaped like the content API's `ValidationProblem`, plus the record's kind. */
export interface VocabularyProblem {
  code: VocabularyProblemCode;
  severity: 'error' | 'warning';
  kind: VocabularyKind;
  /** The record's id. */
  slug: string;
  detail: string;
  /** The field, with its index: 'tags[1]', 'typicalIn[0]'. */
  path?: string;
  /** What the value names, as '<kind>:<slug>'. */
  target?: string;
}

/** What the rules check against beyond the vocabulary files. */
export interface VocabularyContext {
  /** The globe's `WORLD_INSTRUMENTS` ids: what `worldInstrumentId` may name. */
  worldInstrumentIds: Iterable<string>;
  /** The artist registry: names a genre's id, name or tags must not fold to. */
  artists: Iterable<{ slug: string; name: string }>;
  /** The tags the importer's genre aliases lead to (genreMap.ts `ALIASES`). */
  aliasTags: Iterable<string>;
}

/** A create (no `before`) or an update of one record. */
export type VocabularyWrite = {
  [K in VocabularyKind]: {
    kind: K;
    before?: VocabularyRecordOf[K];
    after: VocabularyRecordOf[K];
  };
}[VocabularyKind];

type Tagged = {
  kind: 'genre' | 'subgenre';
  record: GenreRecord | SubgenreRecord;
};

const error = (
  problem: Omit<VocabularyProblem, 'severity'>,
): VocabularyProblem => ({ ...problem, severity: 'error' });
const warning = (
  problem: Omit<VocabularyProblem, 'severity'>,
): VocabularyProblem => ({ ...problem, severity: 'warning' });

/**
 * How the importer reads a genre name (genreMap.ts): case, accents and
 * punctuation folded, '&' read as 'and', a trailing ' music' dropped.
 */
const importerKey = (text: string) =>
  normalizeArtistName(text)
    .replace(/ music$/, '')
    .trim();

/** Genres, then subgenres: the order the resolver consults them in. */
const taggedRecords = (records: VocabularyRecords): Tagged[] => [
  ...records.genres.map((record) => ({ kind: 'genre' as const, record })),
  ...records.subgenres.map((record) => ({ kind: 'subgenre' as const, record })),
];

/** DUPLICATE_ID: within each kind, and across the two genre levels. */
function idProblems(records: VocabularyRecords): VocabularyProblem[] {
  const problems: VocabularyProblem[] = [];
  const seen = (kind: VocabularyKind, list: readonly { id: string }[]) => {
    const out = new Set<string>();
    for (const { id } of list) {
      if (out.has(id)) {
        problems.push(
          error({
            code: 'DUPLICATE_ID',
            kind,
            slug: id,
            path: 'id',
            target: `${kind}:${id}`,
            detail: `Two ${kind} records have the id '${id}'.`,
          }),
        );
      }
      out.add(id);
    }
    return out;
  };
  const genreIds = seen('genre', records.genres);
  seen('subgenre', records.subgenres);
  seen('instrument', records.instruments);
  for (const subgenre of records.subgenres) {
    if (genreIds.has(subgenre.id)) {
      problems.push(
        error({
          code: 'DUPLICATE_ID',
          kind: 'subgenre',
          slug: subgenre.id,
          path: 'id',
          target: `genre:${subgenre.id}`,
          detail: `'${subgenre.id}' is a genre's id too, so a genreIds value naming it would be ambiguous.`,
        }),
      );
    }
  }
  return problems;
}

/** INVALID_REFERENCE: `parent` and `typicalIn`. */
function referenceProblems(records: VocabularyRecords): VocabularyProblem[] {
  const problems: VocabularyProblem[] = [];
  const genreIds = new Set(records.genres.map((g) => g.id));
  const subgenreIds = new Set(records.subgenres.map((s) => s.id));
  for (const subgenre of records.subgenres) {
    if (!genreIds.has(subgenre.parent)) {
      problems.push(
        error({
          code: 'INVALID_REFERENCE',
          kind: 'subgenre',
          slug: subgenre.id,
          path: 'parent',
          target: `genre:${subgenre.parent}`,
          detail: `The parent '${subgenre.parent}' is not a genre.`,
        }),
      );
    }
  }
  for (const instrument of records.instruments) {
    instrument.typicalIn.forEach((id, index) => {
      if (genreIds.has(id) || subgenreIds.has(id)) return;
      problems.push(
        error({
          code: 'INVALID_REFERENCE',
          kind: 'instrument',
          slug: instrument.id,
          path: `typicalIn[${index}]`,
          target: `genre:${id}`,
          detail: `'${id}' is neither a genre nor a subgenre.`,
        }),
      );
    });
  }
  return problems;
}

/** DUPLICATE_TAG, and TAG_FOLDS_TOGETHER across records. */
function tagProblems(records: VocabularyRecords): VocabularyProblem[] {
  const problems: VocabularyProblem[] = [];
  const listed = new Map<string, string>([
    ...records.tagLists.ignoredTags.map(
      (tag) => [tag, 'the ignored list (reach or format, not music)'] as const,
    ),
    ...records.tagLists.instrumentTags.map(
      (tag) => [tag, 'the instrument tags list'] as const,
    ),
  ]);
  const holder = new Map<string, string>();
  const folded = new Map<string, { ref: string; tag: string }>();
  for (const { kind, record } of taggedRecords(records)) {
    const ref = `${kind}:${record.id}`;
    record.tags.forEach((tag, index) => {
      const at = { kind, slug: record.id, path: `tags[${index}]` };
      const list = listed.get(tag);
      const first = holder.get(tag);
      if (list) {
        problems.push(
          error({
            ...at,
            code: 'DUPLICATE_TAG',
            detail: `'${tag}' is on ${list}, so it cannot name a genre.`,
          }),
        );
      } else if (first) {
        problems.push(
          error({
            ...at,
            code: 'DUPLICATE_TAG',
            target: first,
            detail:
              first === ref
                ? `'${tag}' is listed twice.`
                : `'${tag}' is already a tag of ${first}; a tag resolves to one record.`,
          }),
        );
      } else {
        holder.set(tag, ref);
      }

      const key = importerKey(tag);
      const other = folded.get(key);
      if (!other) folded.set(key, { ref, tag });
      else if (other.ref !== ref && other.tag !== tag) {
        problems.push(
          warning({
            ...at,
            code: 'TAG_FOLDS_TOGETHER',
            target: other.ref,
            detail: `The importer reads '${tag}' as '${other.tag}' (${other.ref}) and maps both there.`,
          }),
        );
      }
    });
  }
  return problems;
}

/** UNKNOWN_CODE_ID: `worldInstrumentId`. */
function worldInstrumentProblems(
  records: VocabularyRecords,
  context: VocabularyContext,
): VocabularyProblem[] {
  const known = new Set(context.worldInstrumentIds);
  return records.instruments
    .filter(
      (i) =>
        i.worldInstrumentId !== undefined && !known.has(i.worldInstrumentId),
    )
    .map((i) =>
      error({
        code: 'UNKNOWN_CODE_ID',
        kind: 'instrument',
        slug: i.id,
        path: 'worldInstrumentId',
        detail: `'${i.worldInstrumentId}' is not in the globe's Instruments of the World.`,
      }),
    );
}

/** NAME_COLLISION: one warning per record and artist, on the first field that collides. */
function nameProblems(
  records: VocabularyRecords,
  context: VocabularyContext,
): VocabularyProblem[] {
  const artists = new Map<string, { slug: string; name: string }>();
  for (const artist of context.artists) {
    const key = normalizeArtistName(artist.name);
    if (key && !artists.has(key)) artists.set(key, artist);
  }
  const problems: VocabularyProblem[] = [];
  for (const { kind, record } of taggedRecords(records)) {
    const fields: [string, string][] = [
      ['id', record.id],
      ['name', record.name],
      ...record.tags.map((tag, i): [string, string] => [`tags[${i}]`, tag]),
    ];
    const reported = new Set<string>();
    for (const [path, value] of fields) {
      const artist = artists.get(normalizeArtistName(value));
      if (!artist || reported.has(artist.slug)) continue;
      reported.add(artist.slug);
      problems.push(
        warning({
          code: 'NAME_COLLISION',
          kind,
          slug: record.id,
          path,
          target: `artist:${artist.slug}`,
          detail: `'${value}' reads as the artist ${artist.name}; the globe stops matching that artist on a tag of this name.`,
        }),
      );
    }
  }
  return problems;
}

/** Every problem in a whole set of records. */
export function validateVocabulary(
  records: VocabularyRecords,
  context: VocabularyContext,
): VocabularyProblem[] {
  return [
    ...idProblems(records),
    ...referenceProblems(records),
    ...tagProblems(records),
    ...worldInstrumentProblems(records, context),
    ...nameProblems(records, context),
  ];
}

/**
 * The records with one write applied: an update replaces its record where it
 * stands, a create is appended. That is the file edit too, so a save changes
 * one line or adds one.
 */
export function applyWrite(
  current: VocabularyRecords,
  write: VocabularyWrite,
): VocabularyRecords {
  const put = <T extends { id: string }>(list: readonly T[], record: T) => {
    const index = write.before
      ? list.findIndex((r) => r.id === write.before?.id)
      : -1;
    return index === -1
      ? [...list, record]
      : list.map((r, i) => (i === index ? record : r));
  };
  switch (write.kind) {
    case 'genre':
      return { ...current, genres: put(current.genres, write.after) };
    case 'subgenre':
      return { ...current, subgenres: put(current.subgenres, write.after) };
    case 'instrument':
      return { ...current, instruments: put(current.instruments, write.after) };
  }
}

const problemKey = (p: VocabularyProblem) =>
  JSON.stringify([p.code, p.kind, p.slug, p.path, p.target, p.detail]);

/**
 * What a create or update would add: the write's own rules (IMMUTABLE_ID,
 * ALIAS_TAG_REMOVED), then every whole-set problem the saved set would have
 * that the current one does not. A problem the files already had is not the
 * write's to fix, so it never blocks an unrelated save.
 */
export function validateWrite(
  write: VocabularyWrite,
  current: VocabularyRecords,
  context: VocabularyContext,
): VocabularyProblem[] {
  const { kind, before, after } = write;
  const slug = before?.id ?? after.id;
  const problems: VocabularyProblem[] = [];

  if (before && before.id !== after.id) {
    // Nothing else is worth saying about a record that cannot be saved.
    return [
      error({
        code: 'IMMUTABLE_ID',
        kind,
        slug,
        path: 'id',
        detail: `An id never changes: '${before.id}' stays '${before.id}'. Create a new ${kind} instead.`,
      }),
    ];
  }

  if (write.kind === 'genre') {
    const changed = write.before
      ? write.before.taught !== write.after.taught
      : write.after.taught;
    if (changed) {
      problems.push(
        error({
          code: 'IMMUTABLE_ID',
          kind,
          slug,
          path: 'taught',
          detail: write.before
            ? 'Whether the curriculum teaches a genre is set in code, not here.'
            : 'A new genre is not taught; the curriculum covers a genre in code.',
        }),
      );
    }
  }

  if (write.kind !== 'instrument' && write.before) {
    const aliases = new Set(context.aliasTags);
    const kept = new Set(write.after.tags);
    for (const tag of write.before.tags) {
      if (!aliases.has(tag) || kept.has(tag)) continue;
      problems.push(
        warning({
          code: 'ALIAS_TAG_REMOVED',
          kind,
          slug,
          path: 'tags',
          detail: `The importer maps other spellings to '${tag}' (genreMap.ts ALIASES); without the tag they map to nothing.`,
        }),
      );
    }
  }

  const known = new Set(validateVocabulary(current, context).map(problemKey));
  const added = validateVocabulary(applyWrite(current, write), context).filter(
    (p) => !known.has(problemKey(p)),
  );
  return [...problems, ...added];
}

/* ── References ─────────────────────────────────────────────────────────── */

/**
 * A code table mapping another vocabulary onto these: `SONG_TAG_TO_GENRE`,
 * `PROGRESSION_STYLE_TO_GENRE`, the importer's instrument aliases.
 */
export interface CodeTable {
  /** How the owner finds it: its export name. */
  name: string;
  /** The kinds its values name. */
  names: readonly VocabularyKind[];
  table: Readonly<Record<string, string>>;
}

/** An edge as the graph derives it (`Edge`) or merges it (`GraphEdge`). */
export interface ReferenceEdge {
  from: string;
  kind: string;
  to: string;
  via?: EdgeVia | readonly EdgeVia[];
}

/** Everything that can name a vocabulary record. */
export interface ReferenceSources {
  records: VocabularyRecords;
  /** The repo graph's edges, stored bodies included. */
  edges: Iterable<ReferenceEdge>;
  codeTables: readonly CodeTable[];
}

export interface VocabularyReference {
  /** What names it: a graph id (`song:superstition`) or a code table's name. */
  by: string;
  /** Where: the field (`genreIds[]`, `parent`, `tags[0]`) or the table's key. */
  path: string;
}

/**
 * Everything that names a record, so a delete can say what is in its way.
 *
 * The record's own tags count: while it has one, a globe string resolves to
 * it. What the vocabulary files state (a subgenre's parent, an instrument's
 * `typicalIn`) is read from the records, which are current even when the
 * graph is not; the graph's copies of those edges are skipped.
 */
export function references(
  kind: VocabularyKind,
  id: string,
  sources: ReferenceSources,
): VocabularyReference[] {
  const self = `${kind}:${id}`;
  const out: VocabularyReference[] = [];
  const seen = new Set<string>();
  const add = (by: string, path: string) => {
    const key = `${by}\n${path}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ by, path });
  };
  const { genres, subgenres, instruments } = sources.records;

  if (kind !== 'instrument') {
    const own =
      kind === 'genre'
        ? genres.find((g) => g.id === id)
        : subgenres.find((s) => s.id === id);
    own?.tags.forEach((_, index) => add(self, `tags[${index}]`));
    if (kind === 'genre') {
      for (const s of subgenres)
        if (s.parent === id) add(`subgenre:${s.id}`, 'parent');
    }
    for (const instrument of instruments) {
      instrument.typicalIn.forEach((value, index) => {
        if (value === id)
          add(`instrument:${instrument.id}`, `typicalIn[${index}]`);
      });
    }
  }

  for (const code of sources.codeTables) {
    if (!code.names.includes(kind)) continue;
    for (const [key, value] of Object.entries(code.table)) {
      if (value === id) add(code.name, key);
    }
  }

  for (const edge of sources.edges) {
    if (edge.from !== self && edge.to !== self) continue;
    const statedByVocabulary =
      edge.kind === 'typical_in' ||
      (edge.kind === 'in_genre' && edge.from.startsWith('subgenre:'));
    if (statedByVocabulary) continue;
    const other = edge.from === self ? edge.to : edge.from;
    const vias: readonly EdgeVia[] =
      edge.via === undefined
        ? []
        : Array.isArray(edge.via)
          ? edge.via
          : [edge.via as EdgeVia];
    if (vias.length === 0) add(other, edge.kind);
    for (const via of vias) {
      add(via.item !== self ? via.item : (via.code ?? other), via.path);
    }
  }
  return out;
}

/** REFERENCED, when anything still names the record; nothing when it is free to go. */
export function validateDelete(
  kind: VocabularyKind,
  id: string,
  sources: ReferenceSources,
): VocabularyProblem[] {
  const found = references(kind, id, sources);
  if (found.length === 0) return [];
  const shown = found
    .slice(0, 5)
    .map((r) => `${r.by} (${r.path})`)
    .join(', ');
  const more = found.length > 5 ? ` and ${found.length - 5} more` : '';
  return [
    error({
      code: 'REFERENCED',
      kind,
      slug: id,
      target: found[0].by,
      detail: `Still named by ${found.length}: ${shown}${more}. Remove those first.`,
    }),
  ];
}
