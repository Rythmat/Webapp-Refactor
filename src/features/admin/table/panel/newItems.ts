import { artistSlug, normalizeArtistName, toSlug } from '@/content/graph/slugs';
import { PROGRESSION_ID_HIGH_WATER } from '@/curriculum/data/progressionIdMark';
import { normalizeChordSpelling } from '@/curriculum/engine/openingTree';
import {
  chordFieldsOf,
  chordSequenceKey,
  COMPLEXITY_LEVELS,
  isKnownChord,
  nextProgressionIdFrom,
  type ProgressionIssue,
  splitChordList,
  validateProgression,
} from '@/curriculum/engine/progressionValidation';
import type { ContentKind } from '@/hooks/data/admin/useAdminContent';
import { boundedDistance } from '../../content/entities/rankEntities';
import { makeEmptySong, slugify } from '../../content/songEditor/songDefaults';
import type { TableModel, TableRow } from '../model/types';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  A new row: its first body, its id, and what to look at before making it
 * ══════════════════════════════════════════════════════════════════════════
 *
 * The toolbar's "New …" opens the row panel on a new item (NewItemPanel).
 * Pure, so the rules can be read and tested apart from the panel:
 *
 *  - the body each kind starts from — what its schema needs and nothing
 *    chosen for the author (a record's format, a place's region, an
 *    event's year, a song's key, a progression's complexity wait to be
 *    picked, as `CreateEntityDialog` asks for them);
 *  - its id, from its name, as each kind spells ids (`artistSlug` for an
 *    artist, `<artist>-<title>` for a record, `evt-…` for an event,
 *    underscores for a song, the next number above the high-water mark for
 *    a progression) — kept in step with the name, since the panel never
 *    asks for one;
 *  - what is missing before it can be made;
 *  - look before writing (CreateEntityDialog's rule): a row the id would
 *    take is opened, not made again; rows with the same folded name, or one
 *    or two letters off, are listed as a warning ("Stevie Ray Vaughn").
 */

type Body = Record<string, unknown>;

/** Where a kind's name lives, and what the panel calls it. */
export const NAME_OF: Readonly<
  Partial<Record<ContentKind, { field: string; label: string }>>
> = {
  artist: { field: 'name', label: 'Name' },
  release: { field: 'title', label: 'Title' },
  studio: { field: 'name', label: 'Name' },
  label: { field: 'name', label: 'Name' },
  globe_city: { field: 'name', label: 'Name' },
  song: { field: 'title', label: 'Title' },
  globe_event: { field: 'title', label: 'Title' },
};

const text = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string' && v !== '')
    : [];

/**
 * The next progression id: one above the high-water mark, the highest id
 * ever handed out (progressionIdMark.ts), or above the highest the table
 * has if that is higher. Never "one past the highest the table has": once
 * the top progression is deleted that would hand its id out again, and
 * UNISON stores ids.
 */
export function nextProgressionId(
  model: TableModel,
  highWater = PROGRESSION_ID_HIGH_WATER,
): number {
  return nextProgressionIdFrom(
    model.rows.map((row) => Number(row.body?.id ?? row.key)),
    highWater,
  );
}

/**
 * A progression's chords as typed or handed over in the URL, one per step:
 * "1 major7 - 4 major7", an opening's id ("1 major7|4 major7"), arrows or
 * commas.
 */
export const parseChords = splitChordList;

/**
 * The chords a new progression starts from: the ones `?new=` names, in the
 * library's spelling, when every one is a chord Prism knows. A search that
 * was a song's title ("Dreams") starts it with none.
 */
export function chordsFrom(typed: string): string[] {
  const chords = parseChords(typed).map(normalizeChordSpelling);
  return chords.every(isKnownChord) ? chords : [];
}

/** The fields a progression derives from its chords. */
export const chordFields = (chords: readonly string[]): Body => ({
  ...chordFieldsOf(chords),
});

/**
 * The library's rules a progression body breaks, checked against the
 * table's other progressions (progressionValidation.ts): what the New
 * panel holds the save on, and what the server would refuse.
 */
export function progressionIssues(
  model: TableModel,
  body: Body,
  { highWater }: { highWater?: number } = {},
): ProgressionIssue[] {
  return validateProgression(body, {
    others: model.rows.flatMap((row) =>
      row.body ? [{ id: row.body.id, chords: row.body.chords }] : [],
    ),
    ...(highWater === undefined ? {} : { highWater }),
  });
}

/** The complexities a progression can be (its editor's levels). */
const COMPLEXITIES: ReadonlySet<string> = new Set(COMPLEXITY_LEVELS);

/** The body a new item of a kind starts from, named `name`. */
export function newBodyFor(
  kind: ContentKind,
  name: string,
  { nextId = 1 } = {},
): Body {
  const typed = name.trim();
  switch (kind) {
    case 'artist':
    case 'studio':
    case 'label':
      return { slug: '', name: typed };
    case 'release':
      return { slug: '', title: typed, artistIds: [] };
    case 'globe_city':
      return {
        id: '',
        name: typed,
        country: '',
        subdivision: '',
        genres: [],
        description: '',
        activeDecades: [],
      };
    case 'song': {
      // The page editor's starter chart, with no key chosen for it.
      const song: Body = { ...(makeEmptySong() as unknown as Body) };
      delete song.key;
      delete song.keyRoot;
      delete song.mode;
      return { ...song, title: typed };
    }
    case 'globe_event':
      return {
        id: '',
        location: { lat: 0, lng: 0, city: '', country: '' },
        genre: [],
        title: typed,
        description: '',
        tags: [],
      };
    case 'chord_progression':
      return {
        id: nextId,
        ...chordFields(chordsFrom(typed)),
        vibes: [],
        styles: [],
        artist: '',
        song: '',
      };
    default:
      return {};
  }
}

/** The id a new item takes, from its body as it stands. */
export function idFor(kind: ContentKind, body: Body): string {
  const name = text(body[NAME_OF[kind]?.field ?? 'name']);
  switch (kind) {
    case 'artist':
      return artistSlug(name);
    case 'release': {
      const artist = strings(body.artistIds)[0];
      return artist && name ? `${artist}-${toSlug(name)}` : toSlug(name);
    }
    case 'song':
      return slugify(name);
    case 'globe_event': {
      const slug = toSlug(name);
      return slug ? `evt-${slug}` : '';
    }
    case 'chord_progression':
      return String(body.id ?? '');
    default:
      return toSlug(name);
  }
}

/**
 * The body with its id in step with its name. A progression's id is a
 * number, fixed when it starts; everything else follows the name.
 */
export function withId(
  kind: ContentKind,
  body: Body,
  identity: 'id' | 'slug',
): Body {
  if (kind === 'chord_progression') return body;
  const id = idFor(kind, body);
  return body[identity] === id ? body : { ...body, [identity]: id };
}

/** What a new item still needs before it can be made, in words. */
export function missingFor(kind: ContentKind, body: Body): string[] {
  const missing: string[] = [];
  const name = NAME_OF[kind];
  if (name && !text(body[name.field]))
    missing.push(name.field === 'title' ? 'a title' : 'a name');
  switch (kind) {
    case 'release':
      if (strings(body.artistIds).length === 0)
        missing.push('the billed artist');
      if (!text(body.format)) missing.push('a format');
      break;
    case 'studio':
      if (!text(body.placeId)) missing.push('where it is');
      break;
    case 'globe_city': {
      if (!text(body.country)) missing.push('the country');
      if (!text(body.region)) missing.push('the region');
      const at = body.coordinates;
      if (
        !Array.isArray(at) ||
        at.length !== 2 ||
        !at.every((n) => typeof n === 'number' && Number.isFinite(n))
      )
        missing.push('coordinates');
      break;
    }
    case 'song':
      if (!text(body.artist)) missing.push('the artist it is by');
      if (!text(body.key)) missing.push('the key');
      break;
    case 'globe_event': {
      // No year 0: clearing the card's year writes 0.
      if (typeof body.year !== 'number' || !body.year) missing.push('the year');
      const location = (body.location ?? {}) as Record<string, unknown>;
      if (location.lat === 0 && location.lng === 0)
        missing.push('where it happened');
      break;
    }
    case 'chord_progression':
      if (strings(body.chords).length === 0) missing.push('its chords');
      if (!COMPLEXITIES.has(text(body.complexity)))
        missing.push('a complexity');
      break;
    default:
      break;
  }
  return missing;
}

/** What the table already has that a new item would clash with, or near it. */
export interface LookFirst {
  /** A row with this id: open it rather than make it again. */
  same?: TableRow;
  /**
   * A node something names that nothing defines, with this id: making the
   * item fills it.
   */
  named?: TableRow;
  /** Rows with the same folded name, or one or two letters off. */
  near: TableRow[];
}

const spellings = (row: TableRow): string[] => [
  row.label,
  ...strings(row.body?.aliases),
];

export function lookFirst(
  kind: ContentKind,
  model: TableModel,
  id: string,
  body: Body,
): LookFirst {
  const index = id ? model.byKey.get(id) : undefined;
  const hit = index === undefined ? undefined : model.rows[index];
  const out: LookFirst = { near: [] };
  if (hit?.status === 'missing') out.named = hit;
  else if (hit) out.same = hit;

  if (kind === 'chord_progression') {
    // A progression is its chords: the same chords are the same progression.
    const chords = strings(body.chords);
    if (chords.length) {
      const key = chordSequenceKey(chords);
      out.near = model.rows
        .filter((row) => {
          const theirs = strings(row.body?.chords);
          return theirs.length > 0 && chordSequenceKey(theirs) === key;
        })
        .slice(0, 5);
    }
    return out;
  }
  const folded = normalizeArtistName(
    text(body[NAME_OF[kind]?.field ?? 'name']),
  );
  if (folded.length < 3) return out;
  out.near = model.rows
    .filter((row) => row !== hit && row.status !== 'missing')
    .filter((row) =>
      spellings(row).some((spelling) => {
        const other = normalizeArtistName(spelling);
        return other === folded || boundedDistance(other, folded, 2) <= 2;
      }),
    )
    .slice(0, 5);
  return out;
}
