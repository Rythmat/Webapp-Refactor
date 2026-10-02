import { planProgressionSongs } from '@/content/linking/progressionSongs';
import { sameJson, stableJson } from '@/content/suggestions/keys';
import {
  decisionsBySuggestion,
  decisionState,
  makeDecision,
} from '@/content/suggestions/status';
import type { SuggestionDecision } from '@/content/suggestions/types';
import type { Song } from '@/curriculum/types/songLibrary';
import { CHORDS } from '@/daw/prism-engine/data/chords';
import { KNOWN_WRONG, type KnownWrong, knownWrongFor } from './importRules';
import type { XlsxSheet } from './xlsx';

/**
 * The progression sheet, read and lined up with the library (Amendment 8,
 * phase 8.2). Pure: the import (`importProgressionSheet.ts`) hands in the
 * workbook's cells, the library's entries, the songs and the decisions
 * log, and gets back every change it would make and everything the owner
 * should read first.
 *
 * The sheet ("Every Chord Progression") is where the chord progression
 * library came from. It is imported once more and then retired: from then
 * on progressions are edited in Cortex. What this import does, and only
 * this:
 *
 *  1. Reads every tab that has chord columns. Columns are found by their
 *     header (`1st`, `2nd` … for chords, `VIBE`, `STYLE`, `ARTIST`, `SONG`
 *     or `SONGS:`), because the tabs differ: one tab has an artist column,
 *     two write their songs in a column with no header at all. A row is a
 *     progression when its first chord cell holds a chord; it is keyed by
 *     its chords, not by its tab, because three rows sit in the wrong tab.
 *  2. Corrects misspelled chords, from an explicit list
 *     (`CHORD_SPELLING_FIXES`), in the sheet's rows and in the library. A
 *     library entry whose chords change gets its four derived fields
 *     (`progression`, `chordCount`, `startingChord`, `startingDegree`)
 *     worked out again with them.
 *  3. Pairs each sheet row with a library entry by its chords. Repeated
 *     sequences pair in order: the first row with the lowest id, and so
 *     on. A row whose chords match exactly pairs first; the rest pair once
 *     the spelling is corrected. A row left over once its sequence's
 *     entries are taken is a second copy the library holds once, and is
 *     skipped. No entry is ever made.
 *  4. Fills an empty song or artist text from the sheet. Where both have
 *     text and it differs, the library's stays and the difference is
 *     listed.
 *  5. Links songs: the app's own linker (`progressionSongs.ts`) reads the
 *     text, and only its sure matches are added to `songIds`. A match the
 *     import rules know is wrong (the "Hallelujah" one), or one a person
 *     already rejected or took out by hand, is held back.
 *  6. Compares vibes, styles and complexity, and reports the differences.
 *     The sheet's tags never overwrite the library's.
 *  7. NOT YET BUILT: the owner's decisions of 1 October 2026 on the
 *     dry-run report, to apply in the real run once the retired-id
 *     redirects are wired into every lookup (UNISON included):
 *     - Q7: the two cut-off copies (ids 428 and 451) stay, and their vibes
 *       and styles are copied onto the full versions (693 and 696).
 *     - Q8: each of the eight duplicate pairs is merged into its lower id,
 *       which keeps the union of both entries' vibes, styles and song
 *       links; the higher id is retired, removed from the library and
 *       never reused (`src/curriculum/data/retiredProgressionIds.ts`).
 *     - Q9: the 19 paths Prism's progression graph has and the library
 *       lacks are added as progressions of their own, with new ids above
 *       the high-water mark, no tags, and their complexity worked out from
 *       their chords.
 *
 * Doing it twice changes nothing the second time: the spellings are
 * correct by then, the text is filled and the songs linked (and, once
 * step 7 is built, the tags copied, the pairs merged and the paths added).
 */

type Body = Record<string, unknown>;

/* ── Spelling ──────────────────────────────────────────────────────── */

/**
 * Chords the sheet or the library misspells, as they are written, and how
 * they are spelled everywhere else. Whole chords only: nothing is guessed.
 *
 * | Written | Where |
 * |---|---|
 * | `b7dominant7#11` | the sheet, `1 maj7` row 16 (the library's id 12 is spelled right) |
 * | `1 maj/5` | the sheet, and library id 82 |
 * | `2 maj` | the sheet, and library id 461 |
 * | `2 minor 7` | the sheet, and library ids 444 and 462 |
 * | `1major/ 3` | the sheet only, `2 min` row 12 (library id 483 is spelled right) |
 * | `2minor` | the sheet only, `6 min` row 7 (library id 585 is spelled right) |
 *
 * The first four are the research brief's. The last two are stray spaces
 * in the workbook's own cells, which the brief's reading of the sheet had
 * already tidied away.
 */
export const CHORD_SPELLING_FIXES: Readonly<Record<string, string>> = {
  'b7dominant7#11': 'b7 dominant7#11',
  '1 maj/5': '1 major/5',
  '2 maj': '2 major',
  '2 minor 7': '2 minor7',
  '1major/ 3': '1 major/3',
  '2minor': '2 minor',
};

export const fixChord = (chord: string): string =>
  CHORD_SPELLING_FIXES[chord] ?? chord;

export const fixChords = (chords: readonly string[]): string[] =>
  chords.map(fixChord);

/**
 * The fields a progression derives from its chords, as the library writes
 * them and as the console's New flow does (`chordFields` in
 * `table/panel/newItems.ts`).
 */
export const derivedFields = (chords: readonly string[]) => ({
  progression: chords.join(' - '),
  chordCount: chords.length,
  startingChord: chords[0] ?? '',
  startingDegree: chords[0]?.split(/\s+/)[0] ?? '',
});

/** A chord's degree and type: `b7 dominant7#11` → `b7`, `dominant7#11`. */
export function splitChord(
  chord: string,
): { degree: string; type: string } | null {
  const match = /^([b#]?[1-7]) (\S+)$/.exec(chord);
  return match ? { degree: match[1], type: match[2] } : null;
}

/** Why a chord is not one Prism can play; null when it is. */
export function chordProblem(chord: string): string | null {
  const parts = splitChord(chord);
  if (!parts) return 'it is not a degree and a chord type';
  if (!Object.prototype.hasOwnProperty.call(CHORDS, parts.type))
    return `"${parts.type}" is not a chord type Prism knows`;
  return null;
}

/* ── Reading the workbook ──────────────────────────────────────────── */

export type ColumnRole = 'chord' | 'vibe' | 'style' | 'artist' | 'song';

/** A header cell's meaning; null for one this reader does not know. */
export function columnRole(header: string): ColumnRole | null {
  const text = header.trim();
  if (/^\d+\s*(?:st|nd|rd|th)$/i.test(text)) return 'chord';
  if (/^vibes?:?$/i.test(text)) return 'vibe';
  if (/^styles?:?$/i.test(text)) return 'style';
  if (/^artists?:?$/i.test(text)) return 'artist';
  if (/^songs?:?$/i.test(text)) return 'song';
  return null;
}

/** A tab that holds progressions, as its header lays it out. */
export interface SheetTab {
  name: string;
  /** Column letter → what its header names it. */
  columns: Record<string, ColumnRole>;
  /** Header cells this reader does not know, by column. */
  unknownHeaders: Record<string, string>;
  /** Progression rows read from it. */
  progressions: number;
}

/** One progression row of the sheet. */
export interface SheetRow {
  tab: string;
  /** The row number, as the sheet shows it. */
  row: number;
  /** The chords as the sheet spells them, trimmed. */
  written: string[];
  /** The chords with `CHORD_SPELLING_FIXES` applied. */
  chords: string[];
  vibe: string;
  style: string;
  artist: string;
  song: string;
}

export interface SheetRead {
  tabs: SheetTab[];
  /** Tabs with no chord columns (the Algorithms tab). */
  otherTabs: string[];
  rows: SheetRow[];
  /** Rows whose first chord is not the one the tab is named after. */
  wrongTab: {
    tab: string;
    row: number;
    first: string;
    /** The tab named after the row's first chord; null when there is none. */
    belongsIn: string | null;
  }[];
  /** Text in a column with no header, read as the row's song. */
  unlabelled: { tab: string; row: number; column: string; text: string }[];
  /** Rows with text that are not progressions ("Starting on the 1"). */
  labels: { tab: string; row: number; text: string }[];
  /** What could not be read; the import refuses to write while any is listed. */
  problems: string[];
}

/** The tab names' short chord types. */
const TAB_TYPES: Readonly<Record<string, string>> = {
  maj7: 'major7',
  maj: 'major',
  min7: 'minor7',
  min: 'minor',
  dom7: 'dominant7',
  dim7: 'diminished7',
};

/** The chord a tab is named after: `1 maj7` → `1 major7`; null for another name. */
export function tabChord(name: string): string | null {
  const match = /^([b#]?[1-7])\s+(\w+)$/.exec(name.trim());
  const type = match ? TAB_TYPES[match[2].toLowerCase()] : undefined;
  return match && type ? `${match[1]} ${type}` : null;
}

/** A cell that starts like a chord: a degree, then a type. */
const looksLikeChord = (text: string) => /^[b#]?[1-7]\s*[a-z]/i.test(text);

/** Columns in sheet order: `A` < `B` < … < `Z` < `AA`. */
const byColumn = (a: string, b: string) =>
  a.length - b.length || (a < b ? -1 : a > b ? 1 : 0);

/** A chord in its tab's family: its degree and its type before any bass. */
const familyOf = (chord: string) => {
  const parts = splitChord(chord);
  return parts ? `${parts.degree} ${parts.type.split('/')[0]}` : chord;
};

/** Reads every progression tab of the workbook. */
export function readProgressionSheet(sheets: readonly XlsxSheet[]): SheetRead {
  const read: SheetRead = {
    tabs: [],
    otherTabs: [],
    rows: [],
    wrongTab: [],
    unlabelled: [],
    labels: [],
    problems: [],
  };
  const tabOfChord = new Map<string, string>();
  for (const sheet of sheets) {
    const chord = tabChord(sheet.name);
    if (chord) tabOfChord.set(chord, sheet.name);
  }

  for (const sheet of sheets) {
    // The header is the first row with chord columns.
    const headerRow = [...sheet.rows.keys()]
      .sort((a, b) => a - b)
      .slice(0, 5)
      .find(
        (number) =>
          [...sheet.rows.get(number)!.values()].filter(
            (text) => columnRole(text) === 'chord',
          ).length >= 2,
      );
    if (headerRow === undefined) {
      read.otherTabs.push(sheet.name);
      continue;
    }
    const tab: SheetTab = {
      name: sheet.name,
      columns: {},
      unknownHeaders: {},
      progressions: 0,
    };
    for (const [column, text] of sheet.rows.get(headerRow)!) {
      const role = columnRole(text);
      if (role) tab.columns[column] = role;
      else tab.unknownHeaders[column] = text.trim();
    }
    const columnsOf = (role: ColumnRole) =>
      Object.keys(tab.columns)
        .filter((column) => tab.columns[column] === role)
        .sort(byColumn);
    const chordColumns = columnsOf('chord');
    const lastChord = chordColumns[chordColumns.length - 1];
    const own = tabChord(sheet.name);

    const rowNumbers = [...sheet.rows.keys()]
      .filter((number) => number > headerRow)
      .sort((a, b) => a - b);
    for (const number of rowNumbers) {
      const cells = sheet.rows.get(number)!;
      const cell = (column: string) => (cells.get(column) ?? '').trim();
      const first = cell(chordColumns[0]);
      if (!looksLikeChord(first)) {
        const text = [...cells.values()]
          .map((value) => value.trim())
          .filter(Boolean)
          .join(' · ');
        if (text) read.labels.push({ tab: sheet.name, row: number, text });
        continue;
      }
      const values = chordColumns.map(cell);
      const length =
        values.indexOf('') === -1 ? values.length : values.indexOf('');
      if (values.slice(length).some(Boolean))
        read.problems.push(
          `${sheet.name} row ${number} has an empty chord cell between chords`,
        );
      const written = values.slice(0, length);
      const joined = (role: ColumnRole) =>
        columnsOf(role).map(cell).filter(Boolean).join(', ');
      // Text right of the chords in a column with no header: two tabs write
      // their songs there.
      const loose = [...cells.keys()]
        .filter(
          (column) =>
            !(column in tab.columns) &&
            !(column in tab.unknownHeaders) &&
            byColumn(column, lastChord) > 0 &&
            cell(column),
        )
        .sort(byColumn);
      for (const column of loose)
        read.unlabelled.push({
          tab: sheet.name,
          row: number,
          column,
          text: cell(column),
        });
      const song = [joined('song'), ...loose.map(cell)]
        .filter(Boolean)
        .join(', ');
      const row: SheetRow = {
        tab: sheet.name,
        row: number,
        written,
        chords: fixChords(written),
        vibe: joined('vibe'),
        style: joined('style'),
        artist: joined('artist'),
        song,
      };
      read.rows.push(row);
      tab.progressions += 1;
      if (own && familyOf(row.chords[0]) !== own)
        read.wrongTab.push({
          tab: sheet.name,
          row: number,
          first: row.chords[0],
          belongsIn: tabOfChord.get(familyOf(row.chords[0])) ?? null,
        });
    }
    read.tabs.push(tab);
  }
  return read;
}

/* ── Pairing ───────────────────────────────────────────────────────── */

/** A library entry as the import reads it. */
export interface LibraryEntry {
  id: number;
  body: Body;
  /** The chords as the library spells them now. */
  written: string[];
  /** The chords with `CHORD_SPELLING_FIXES` applied. */
  chords: string[];
}

const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];

const text = (value: unknown): string =>
  typeof value === 'string' ? value : '';

/** The library's entries, by id, with their chords read. */
export function libraryEntries(bodies: readonly Body[]): LibraryEntry[] {
  return bodies
    .filter((body) => typeof body.id === 'number')
    .map((body) => {
      const written = strings(body.chords);
      return {
        id: body.id as number,
        body,
        written,
        chords: fixChords(written),
      };
    })
    .sort((a, b) => a.id - b.id);
}

const sequenceKey = (chords: readonly string[]) => chords.join('|');

export interface Pair {
  row: SheetRow;
  entry: LibraryEntry;
  /** `exact` when the spellings already match; `corrected` once fixed. */
  how: 'exact' | 'corrected';
}

export interface Pairing {
  pairs: Pair[];
  /** Rows whose sequence the library holds fewer times than the sheet. */
  secondCopies: { row: SheetRow; of: number }[];
  /** Rows whose sequence the library does not hold at all. */
  notInLibrary: SheetRow[];
  /** Entries no row pairs with. */
  unpaired: LibraryEntry[];
}

/**
 * Pairs sheet rows with library entries by their chords (see the file
 * comment, step 3): exact spellings first, then corrected ones, each pass
 * in sheet order taking the lowest id left.
 */
export function pairRows(
  rows: readonly SheetRow[],
  entries: readonly LibraryEntry[],
): Pairing {
  const pool = new Map<string, LibraryEntry[]>();
  for (const entry of [...entries].sort((a, b) => a.id - b.id)) {
    const key = sequenceKey(entry.chords);
    pool.set(key, [...(pool.get(key) ?? []), entry]);
  }
  const taken = new Set<number>();
  const paired = new Map<SheetRow, Pair>();
  const pass = (how: Pair['how']) => {
    for (const row of rows) {
      if (paired.has(row)) continue;
      const entry = (pool.get(sequenceKey(row.chords)) ?? []).find(
        (candidate) =>
          !taken.has(candidate.id) &&
          (how === 'corrected' ||
            sequenceKey(candidate.written) === sequenceKey(row.written)),
      );
      if (!entry) continue;
      taken.add(entry.id);
      paired.set(row, { row, entry, how });
    }
  };
  pass('exact');
  pass('corrected');
  const pairing: Pairing = {
    pairs: [],
    secondCopies: [],
    notInLibrary: [],
    unpaired: entries.filter((entry) => !taken.has(entry.id)),
  };
  for (const row of rows) {
    const pair = paired.get(row);
    if (pair) pairing.pairs.push(pair);
    else {
      const same = pool.get(sequenceKey(row.chords));
      if (same?.length) pairing.secondCopies.push({ row, of: same[0].id });
      else pairing.notInLibrary.push(row);
    }
  }
  return pairing;
}

/* ── Comparing tags and complexity ─────────────────────────────────── */

/** A sheet cell's tags: comma-separated, trimmed, lower-case, each once. */
export const sheetTags = (cell: string): string[] => [
  ...new Set(
    cell
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean),
  ),
];

export interface TagComparison {
  /** Pairs where the sheet has tags in this column. */
  sheetHas: number;
  same: number;
  /** The library has every sheet tag and more. */
  libraryHasMore: number;
  /** The library has none of this kind. */
  libraryEmpty: number;
  /** Anything else: the sheet has a tag the library lacks. */
  differ: number;
  /** Tag → pairs where the sheet has it and the library does not. */
  onlyInSheet: Record<string, number>;
  /** Tag → pairs where the library has it and the sheet does not. */
  onlyInLibrary: Record<string, number>;
  /** Every pair that is not the same, by id. */
  rows: {
    id: number;
    tab: string;
    row: number;
    sheet: string[];
    library: string[];
  }[];
}

const bump = (tally: Record<string, number>, key: string) => {
  tally[key] = (tally[key] ?? 0) + 1;
};

function compareTags(
  pairs: readonly Pair[],
  field: 'vibes' | 'styles',
  column: 'vibe' | 'style',
): TagComparison {
  const out: TagComparison = {
    sheetHas: 0,
    same: 0,
    libraryHasMore: 0,
    libraryEmpty: 0,
    differ: 0,
    onlyInSheet: {},
    onlyInLibrary: {},
    rows: [],
  };
  for (const { row, entry } of pairs) {
    const sheet = sheetTags(row[column]);
    if (!sheet.length) continue;
    out.sheetHas += 1;
    const library = strings(entry.body[field]).map((tag) => tag.toLowerCase());
    const missing = sheet.filter((tag) => !library.includes(tag));
    const extra = library.filter((tag) => !sheet.includes(tag));
    for (const tag of missing) bump(out.onlyInSheet, tag);
    for (const tag of extra) bump(out.onlyInLibrary, tag);
    if (!missing.length && !extra.length) {
      out.same += 1;
      continue;
    }
    if (!library.length) out.libraryEmpty += 1;
    else if (!missing.length) out.libraryHasMore += 1;
    else out.differ += 1;
    out.rows.push({
      id: entry.id,
      tab: row.tab,
      row: row.row,
      sheet,
      library: strings(entry.body[field]),
    });
  }
  out.rows.sort((a, b) => a.id - b.id);
  return out;
}

export const COMPLEXITIES = ['triad', '7th', 'extended'] as const;
export type Complexity = (typeof COMPLEXITIES)[number];

const levelOf = (notes: number): Complexity =>
  notes <= 3 ? 'triad' : notes === 4 ? '7th' : 'extended';

/**
 * A progression's complexity as its chords' names give it: each chord's
 * type before any bass note (`major` in `major/7`), by how many notes
 * Prism's chord of that name has (3 a triad, 4 a 7th or 6th chord, 5 or
 * more extended), and the richest chord decides. Null when a chord is not
 * one Prism knows.
 */
export function complexityByName(chords: readonly string[]): Complexity | null {
  let level = 0;
  for (const chord of chords) {
    const type = splitChord(chord)?.type.split('/')[0];
    const notes = type ? CHORDS[type] : undefined;
    if (!notes) return null;
    level = Math.max(level, COMPLEXITIES.indexOf(levelOf(notes.length)));
  }
  return COMPLEXITIES[level];
}

/**
 * The same, as Prism plays the chords: the different notes each one
 * sounds, the bass included. A slash chord can then be richer than its
 * name (`5 major/7` sounds G, B, D over F#, a major 7th), which is why the
 * two readings can disagree; how the bass of a slash chord is meant to be
 * read is still the owner's question (brief Q6).
 */
export function complexityBySound(
  chords: readonly string[],
): Complexity | null {
  let level = 0;
  for (const chord of chords) {
    const type = splitChord(chord)?.type;
    const notes = type ? CHORDS[type] : undefined;
    if (!notes) return null;
    const pitches = new Set(notes.map((step) => ((step % 12) + 12) % 12));
    level = Math.max(level, COMPLEXITIES.indexOf(levelOf(pitches.size)));
  }
  return COMPLEXITIES[level];
}

export interface ComplexityRow {
  id: number;
  chords: string[];
  stored: string;
  byName: Complexity | null;
  bySound: Complexity | null;
  /**
   * `clear`: both readings agree with each other and not with the stored
   * value. `slash`: the readings disagree (a slash chord), and the stored
   * value matches at most one of them.
   */
  kind: 'clear' | 'slash';
}

/* ── The plan ──────────────────────────────────────────────────────── */

/** The fields the import may change on a progression; nothing else moves. */
export const SHEET_IMPORT_FIELDS: readonly string[] = [
  'chords',
  'progression',
  'chordCount',
  'startingChord',
  'startingDegree',
  'song',
  'artist',
  'songIds',
];

/** Who the import's decisions are logged as. */
export const SHEET_IMPORT_BY = 'sheet-import';

export interface SheetImportInput {
  read: SheetRead;
  /** The library's entries as the store holds them. */
  bodies: readonly Body[];
  songs: readonly Song[];
  /** The committed decisions log. */
  decisions: readonly SuggestionDecision[];
  knownWrong?: readonly KnownWrong[];
  /** When the decisions it logs are dated. */
  at: string;
}

export interface SongLink {
  id: number;
  songId: string;
  title: string;
  artist: string;
  /** How sure the linker is: only `sure` is linked. */
  tier: string;
  why: string;
}

export interface SheetImportPlan {
  pairing: Pairing;
  /** Every entry the import changes, as it is and as it would be. */
  changes: { id: number; before: Body; after: Body }[];
  /** Library entries whose chords are corrected. */
  chordFixes: { id: number; before: string[]; after: string[] }[];
  /** Sheet rows whose chords are corrected before pairing. */
  sheetFixes: { tab: string; row: number; before: string[]; after: string[] }[];
  /** Empty text the sheet fills. */
  textMerges: {
    id: number;
    field: 'song' | 'artist';
    value: string;
    tab: string;
    row: number;
  }[];
  /** Text both have, written differently: the library's stays. */
  textDiffers: {
    id: number;
    field: 'song' | 'artist';
    library: string;
    sheet: string;
    tab: string;
    row: number;
  }[];
  /** Songs it links. */
  songLinks: SongLink[];
  /**
   * Matches it does not link and nobody needs to look at again: ones the
   * import rules know are wrong, and ones a person already decided.
   */
  songLinksHeld: (SongLink & { reason: string })[];
  /** The linker's likely matches, still open: a person checks these in the Table. */
  likelyLinks: SongLink[];
  /** One accept per song linked, for the decisions log. */
  decisions: SuggestionDecision[];
  vibes: TagComparison;
  styles: TagComparison;
  complexity: ComplexityRow[];
  /** Entries that share one chord sequence (after the spelling fixes). */
  duplicates: { chords: string[]; ids: number[] }[];
  /** Entries no sheet row pairs with, and the longer entries they begin. */
  cutOffs: { id: number; chords: string[]; continuedBy: number[] }[];
  /** Chords Prism cannot read, after the fixes, by entry or row. */
  chordProblems: { where: string; chord: string; why: string }[];
}

/** Plans the import (see the file comment). */
export function planSheetImport(input: SheetImportInput): SheetImportPlan {
  const entries = libraryEntries(input.bodies);
  const pairing = pairRows(input.read.rows, entries);
  const after = new Map<number, Body>(
    entries.map((entry) => [entry.id, { ...entry.body }]),
  );

  const plan: SheetImportPlan = {
    pairing,
    changes: [],
    chordFixes: [],
    sheetFixes: [],
    textMerges: [],
    textDiffers: [],
    songLinks: [],
    songLinksHeld: [],
    likelyLinks: [],
    decisions: [],
    vibes: compareTags(pairing.pairs, 'vibes', 'vibe'),
    styles: compareTags(pairing.pairs, 'styles', 'style'),
    complexity: [],
    duplicates: [],
    cutOffs: [],
    chordProblems: [],
  };

  // Spelling, in the sheet and in the library.
  for (const row of input.read.rows) {
    if (sequenceKey(row.written) !== sequenceKey(row.chords))
      plan.sheetFixes.push({
        tab: row.tab,
        row: row.row,
        before: row.written,
        after: row.chords,
      });
    for (const chord of row.chords) {
      const why = chordProblem(chord);
      if (why)
        plan.chordProblems.push({
          where: `${row.tab} row ${row.row}`,
          chord,
          why,
        });
    }
  }
  for (const entry of entries) {
    for (const chord of entry.chords) {
      const why = chordProblem(chord);
      if (why) plan.chordProblems.push({ where: `id ${entry.id}`, chord, why });
    }
    if (sequenceKey(entry.written) === sequenceKey(entry.chords)) continue;
    plan.chordFixes.push({
      id: entry.id,
      before: entry.written,
      after: entry.chords,
    });
    Object.assign(after.get(entry.id)!, {
      chords: [...entry.chords],
      ...derivedFields(entry.chords),
    });
  }

  // Text: an empty field takes the sheet's.
  for (const { row, entry } of pairing.pairs) {
    for (const field of ['song', 'artist'] as const) {
      const sheet = row[field].trim();
      const library = text(entry.body[field]);
      if (!sheet) continue;
      if (!library.trim()) {
        after.get(entry.id)![field] = sheet;
        plan.textMerges.push({
          id: entry.id,
          field,
          value: sheet,
          tab: row.tab,
          row: row.row,
        });
      } else if (library.trim() !== sheet)
        plan.textDiffers.push({
          id: entry.id,
          field,
          library,
          sheet,
          tab: row.tab,
          row: row.row,
        });
    }
  }

  // Songs, from the text as it would be.
  const songById = new Map(input.songs.map((song) => [song.id, song]));
  const linker = planProgressionSongs({
    songs: input.songs,
    progressions: entries.map((entry) => {
      const body = after.get(entry.id)!;
      return {
        id: entry.id,
        songIds: strings(body.songIds),
        song: text(body.song),
        artist: text(body.artist),
      };
    }),
  });
  const decided = decisionsBySuggestion(input.decisions);
  const knownWrong = input.knownWrong ?? KNOWN_WRONG;
  const added = new Set<string>();
  for (const { suggestion } of linker.planned) {
    const id = Number(suggestion.target.slug);
    const songId = String(suggestion.value);
    const song = songById.get(songId);
    const link: SongLink = {
      id,
      songId,
      title: song?.title ?? songId,
      artist: song?.artist ?? '',
      tier: suggestion.tier,
      why: suggestion.evidence?.[0] ?? '',
    };
    const wrong = knownWrongFor(suggestion, knownWrong);
    const state = decisionState(suggestion, decided).state;
    const reason = wrong
      ? `the import rules know it is wrong (${wrong.name})`
      : state === 'rejected' || state === 'dropped'
        ? `a person ${state} it`
        : state === 'accepted'
          ? 'it was linked once and taken out by hand since'
          : null;
    if (reason) {
      plan.songLinksHeld.push({ ...link, reason });
      continue;
    }
    if (suggestion.tier !== 'sure') {
      plan.likelyLinks.push(link);
      continue;
    }
    const key = `${id}|${songId}`;
    if (added.has(key)) continue;
    added.add(key);
    const body = after.get(id)!;
    body.songIds = [...strings(body.songIds), songId];
    plan.songLinks.push(link);
    plan.decisions.push(
      makeDecision(suggestion, 'accept', {
        by: SHEET_IMPORT_BY,
        at: input.at,
        method: 'import',
      }),
    );
  }

  // What changed.
  for (const entry of entries) {
    const next = after.get(entry.id)!;
    if (stableJson(next) !== stableJson(entry.body))
      plan.changes.push({ id: entry.id, before: entry.body, after: next });
  }

  // Complexity, reported only.
  for (const entry of entries) {
    const stored = text(entry.body.complexity);
    const byName = complexityByName(entry.chords);
    const bySound = complexityBySound(entry.chords);
    if (stored === byName && stored === bySound) continue;
    plan.complexity.push({
      id: entry.id,
      chords: entry.chords,
      stored,
      byName,
      bySound,
      kind: byName === bySound ? 'clear' : 'slash',
    });
  }

  // Duplicates and cut-off copies.
  const bySequence = new Map<string, number[]>();
  for (const entry of entries) {
    const key = sequenceKey(entry.chords);
    bySequence.set(key, [...(bySequence.get(key) ?? []), entry.id]);
  }
  for (const [key, ids] of bySequence)
    if (ids.length > 1) plan.duplicates.push({ chords: key.split('|'), ids });
  for (const entry of pairing.unpaired)
    plan.cutOffs.push({
      id: entry.id,
      chords: entry.chords,
      continuedBy: entries
        .filter(
          (other) =>
            other.chords.length > entry.chords.length &&
            sameJson(other.chords.slice(0, entry.chords.length), entry.chords),
        )
        .map((other) => other.id),
    });
  return plan;
}

/* ── The gate ──────────────────────────────────────────────────────── */

/**
 * What a planned change does that the import may not, on one entry; empty
 * when it is within the rules: only `SHEET_IMPORT_FIELDS` move, chords
 * only by `CHORD_SPELLING_FIXES` (and the derived fields with them), text
 * only where it was empty, and `songIds` only by additions.
 */
export function gateProblems(before: Body, after: Body): string[] {
  const problems: string[] = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys)
    if (
      !SHEET_IMPORT_FIELDS.includes(key) &&
      !sameJson(before[key], after[key])
    )
      problems.push(`${key} changes, and the import never changes it`);
  const chords = strings(before.chords);
  if (!sameJson(after.chords, fixChords(chords)))
    problems.push('the chords change beyond the spelling fixes');
  const derived = sameJson(after.chords, chords)
    ? {
        progression: before.progression,
        chordCount: before.chordCount,
        startingChord: before.startingChord,
        startingDegree: before.startingDegree,
      }
    : derivedFields(strings(after.chords));
  for (const [key, value] of Object.entries(derived))
    if (!sameJson(after[key], value))
      problems.push(`${key} does not follow from the chords`);
  for (const field of ['song', 'artist'])
    if (
      !sameJson(before[field], after[field]) &&
      text(before[field]).trim() !== ''
    )
      problems.push(`${field} had text, and it would be written over`);
  const had = strings(before.songIds);
  const has = strings(after.songIds);
  if (!sameJson(has.slice(0, had.length), had))
    problems.push('songIds would lose or reorder a song it had');
  if (new Set(has).size !== has.length)
    problems.push('songIds would name a song twice');
  return problems;
}
