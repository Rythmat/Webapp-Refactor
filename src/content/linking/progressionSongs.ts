import { normalizeArtistName as normalize } from '../graph/slugs';
import { appSource, createCollector, makeSuggestion } from './plan';
import {
  CONFIDENCE,
  type LinkingInput,
  type Plan,
  type PlanOptions,
} from './types';

/**
 * Progression songs: the song a progression's source sheet names ('Dreams-
 * Fleetwood Mac', 'Love on Top (Beyonce)'), offered as one of its
 * `songIds`.
 *
 * The library's own link was made from exact titles only, and only from the
 * `song` field: fuzzy matching once linked Leonard Cohen's 'Hallelujah' to
 * Ray Charles's 'Hallelujah I Love Her So' (`chordProgressionLibrary.ts`).
 * So here:
 *  - `sure` needs the title and the artist the sheet names both to agree
 *    with one library song — the artist as billed, without its "The", within
 *    two letters of a misspelling ('Erykah Badhu'), as its initials ('JT'),
 *    or the song's writer;
 *  - a title with no artist named, or a title the sheet shortens ('Ain't No
 *    Mountain'), is `likely`: a person decides, and 'Hallelujah' is exactly
 *    such a row;
 *  - an artist the sheet names that the song is not by rules it out: it is
 *    most likely another song of that name (Tupac's 'Changes'), listed in
 *    the report rather than offered.
 *
 * A sheet that names several songs ('Saturday in the Park (Chicago), Isn't
 * She Lovely (Stevie Wonder), …') is read one song at a time. The songs are
 * added to the progression's list, which says nothing by being empty.
 */

export interface ProgressionSongsReport {
  /** Progressions whose sheet names a song. */
  withText: number;
  /** Songs named, one per song a sheet names. */
  named: number;
  /** Progressions that already link a song (`songIds`). */
  linked: number;
  /** Songs offered, by tier; a song a progression links is not offered. */
  sure: number;
  likely: number;
  /**
   * Named songs whose title the library has, but by another artist than the
   * sheet names: not offered, since they are most likely another song.
   */
  disagree: {
    progression: number;
    text: string;
    songId: string;
    /** The artist as the sheet names them (folded). */
    named: string;
  }[];
  /** Named songs the library does not have, as written: they stay text. */
  unmatched: { progression: number; text: string }[];
  unreachable: { id: string; reason: string }[];
}

/** The part of a song the sheet may name besides it: never an artist. */
const SECTION_WORDS = new Set([
  'intro',
  'verse',
  'pre',
  'chorus',
  'prechorus',
  'bridge',
  'outro',
  'hook',
  'half',
  '2nd',
  '1',
  '2',
  '3',
]);

/** Levenshtein distance, or Infinity once it must exceed `max`. */
function within(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return Infinity;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row.push(Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost));
    }
    if (Math.min(...row) > max) return Infinity;
    prev = row;
  }
  return prev[b.length];
}

const withoutThe = (name: string) => name.replace(/^the /, '');

/** Joint billings, as the song library writes them. */
const JOINT = /\s(?:&|and|feat\.?|featuring|ft\.|with|x)\s|\s*\/\s*|,\s/i;

/**
 * Whether the artist the sheet names (folded) is the song's: its performer,
 * one of a joint billing, or its writer (`composer`).
 */
function sameArtist(
  named: string,
  song: { artist: string; composer?: string },
): string | null {
  const bare = withoutThe(named);
  const people = [song.artist, song.composer].filter(
    (who): who is string => typeof who === 'string' && !!who.trim(),
  );
  for (const part of people.flatMap((who) => [who, ...who.split(JOINT)])) {
    const artist = withoutThe(normalize(part));
    if (!artist) continue;
    if (artist === bare) return `the sheet's artist is ${part.trim()}`;
    if (bare.length >= 6 && within(bare, artist, 2) <= 2)
      return `the sheet's "${named}" is within two letters of ${part.trim()}`;
    const initials = artist
      .split(' ')
      .map((word) => word[0])
      .join('');
    if (initials.length > 1 && bare.replace(/ /g, '') === initials)
      return `the sheet's "${named.toUpperCase()}" is ${part.trim()}'s initials`;
  }
  return null;
}

/** One song a sheet names: 'Saturday in the Park (Chicago)'. */
function segmentsOf(text: string): string[] {
  return text
    .replace(/\)\s*,\s*/g, ')\n')
    .split('\n')
    .map((part) => part.trim())
    .filter(Boolean);
}

/** The title as the sheet writes it: before its first '(', '- ' or '?'. */
const headOf = (segment: string) =>
  normalize(segment.split(/\(|-\s|-\(|\?/)[0] ?? '');

interface Candidate {
  songId: string;
  title: string;
  tier: 'sure' | 'likely';
  why: string;
}

/** A sheet's song the library has, but by another artist than it names. */
interface Disagreement {
  songId: string;
  named: string;
}

/** A library song, with its title folded once. */
interface LibrarySong {
  id: string;
  title: string;
  artist: string;
  composer?: string;
  folded: string;
}

/**
 * The library songs one sheet's song can be.
 *
 * The title first: the sheet's title part ('As it Was' in 'As it Was- Harry
 * Styles') must be the whole title, or be followed only by the artist
 * ('Juice Lizzo') — else 'As' by Stevie Wonder would be read out of 'As it
 * Was'. A sheet that shortens a title ('Ain't No Mountain') is a guess. An
 * artist the sheet names and the song is not by rules the song out: 'Stay-
 * Rihanna' is not Sam Smith's 'Stay With Me', and Tupac's 'Changes' is not
 * Bowie's.
 */
function candidatesFor(
  segment: string,
  songs: readonly LibrarySong[],
): { found: Candidate[]; disagree: Disagreement[] } {
  const folded = normalize(segment);
  const head = headOf(segment);
  const found: Candidate[] = [];
  const disagree: Disagreement[] = [];
  for (const song of songs) {
    const title = song.folded;
    if (!title) continue;
    const exact = folded === title || folded.startsWith(`${title} `);
    const shortened =
      !exact && head.length >= 4 && title.startsWith(`${head} `);
    if (!exact && !shortened) continue;
    // What the sheet says besides the title: sections ('bridge') and the
    // artist.
    const rest = exact ? folded.slice(title.length) : folded.slice(head.length);
    const named = rest
      .split(' ')
      .filter((word) => word && !SECTION_WORDS.has(word))
      .join(' ');
    const agrees = named ? sameArtist(named, song) : null;
    if (named && !agrees) {
      // Only the whole title, as the sheet writes it, can be another
      // artist's song of that name; a title that merely starts the
      // sheet's is not the song at all.
      if (exact && head === title) disagree.push({ songId: song.id, named });
      continue;
    }
    found.push(
      exact && agrees
        ? {
            songId: song.id,
            title: song.title,
            tier: 'sure',
            why: `the sheet names the title "${song.title}", and ${agrees}`,
          }
        : {
            songId: song.id,
            title: song.title,
            tier: 'likely',
            why: exact
              ? `the sheet names the title "${song.title}" and no artist: a person checks it is ${song.artist}'s`
              : `the sheet's "${segment}" is how "${song.title}" (${song.artist}) begins${
                  agrees ? `, and ${agrees}` : ''
                }: a person checks it is that song`,
          },
    );
  }
  // Of several, the surest; of sure ones, the longest title ('Into the
  // Mystic' over a song called 'Into').
  const sure = found.filter((c) => c.tier === 'sure');
  if (!sure.length) return { found, disagree };
  const longest = Math.max(...sure.map((c) => c.title.length));
  return {
    found: sure.filter((c) => c.title.length === longest),
    disagree: [],
  };
}

export function planProgressionSongs(
  input: LinkingInput,
  options: PlanOptions = {},
): Plan<ProgressionSongsReport> {
  const out = createCollector();
  const report: ProgressionSongsReport = {
    withText: 0,
    named: 0,
    linked: 0,
    sure: 0,
    likely: 0,
    disagree: [],
    unmatched: [],
    unreachable: out.unreachable,
  };
  const songs: LibrarySong[] = (input.songs ?? [])
    .filter((s) => typeof s?.id === 'string' && typeof s.title === 'string')
    .map((s) => ({
      id: s.id,
      title: s.title,
      artist: typeof s.artist === 'string' ? s.artist : '',
      ...(typeof s.composer === 'string' ? { composer: s.composer } : {}),
      folded: normalize(s.title),
    }));
  const byId = new Map(songs.map((song) => [song.id, song]));

  for (const progression of input.progressions ?? []) {
    if (!Number.isFinite(progression?.id)) continue;
    const linked = Array.isArray(progression.songIds)
      ? progression.songIds
      : [];
    if (linked.length) report.linked++;
    const fields = (['song', 'artist'] as const).filter(
      (field) =>
        typeof progression[field] === 'string' && progression[field]!.trim(),
    );
    if (!fields.length) continue;
    report.withText++;
    for (const field of fields) {
      for (const segment of segmentsOf(progression[field]!)) {
        report.named++;
        const { found, disagree } = candidatesFor(segment, songs);
        if (!found.length) {
          // A song linked already was someone's call; it is not listed.
          const others = disagree.filter((d) => !linked.includes(d.songId));
          if (others.length)
            report.disagree.push(
              ...others.map((d) => ({
                progression: progression.id,
                text: segment,
                ...d,
              })),
            );
          else if (!disagree.length)
            report.unmatched.push({
              progression: progression.id,
              text: segment,
            });
          continue;
        }
        for (const candidate of found) {
          // Linked already: nothing to add.
          if (linked.includes(candidate.songId)) continue;
          out.add(
            makeSuggestion(
              {
                target: {
                  kind: 'chord_progression',
                  slug: String(progression.id),
                },
                path: 'songIds[]',
                op: 'add',
                value: candidate.songId,
                display: `Used in "${candidate.title}" (${byId.get(candidate.songId)!.artist})`,
                sources: [
                  appSource(`chord_progression ${progression.id} ${field}`),
                ],
                evidence: [candidate.why],
                confidence:
                  candidate.tier === 'sure'
                    ? CONFIDENCE.sure
                    : CONFIDENCE.likely,
                tier: candidate.tier,
              },
              options,
            ),
            progression,
          );
        }
      }
    }
  }
  // Counted once each: two sheets of one progression naming one song are
  // one suggestion.
  for (const { suggestion } of out.planned)
    report[suggestion.tier === 'sure' ? 'sure' : 'likely']++;
  return { planned: out.planned, report };
}
