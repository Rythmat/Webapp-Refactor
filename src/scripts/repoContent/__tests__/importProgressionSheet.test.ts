import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { planProgressionSongs } from '@/content/linking/progressionSongs';
import { makeDecision } from '@/content/suggestions/status';
import type { SuggestionDecision } from '@/content/suggestions/types';
import type { Song } from '@/curriculum/types/songLibrary';
import { parseDecisionsFile } from '@/features/admin/content/mock/decisions';
import { acquireRunLock } from '@/scripts/enrichment/import/runLock';
import type { GitRunner } from '../gitStatus';
import {
  parseCliArgs,
  readWorkbook,
  reportMarkdown,
  runSheetImport,
} from '../importProgressionSheet';
import {
  CHORD_SPELLING_FIXES,
  complexityByName,
  complexityBySound,
  derivedFields,
  fixChords,
  gateProblems,
  libraryEntries,
  pairRows,
  planSheetImport,
  readProgressionSheet,
  SHEET_IMPORT_BY,
  type SheetRead,
  type SheetRow,
} from '../progressionSheet';
import {
  DECISIONS_PATH,
  IMPORT_LOCK_FILE,
  loadRepoStore,
  REPO_ROOT,
} from '../repoStore';
import { sha256 } from '../sources/common';
import { LIBRARY_FILE } from '../sources/progressions';
import { readXlsx, type XlsxSheet } from '../xlsx';
import { scratchCopy } from './scratchCopy';

/**
 * The progression sheet import (Amendment 8, phase 8.2). The reading, the
 * pairing, the fixes and the plan are tested on made-up rows; the runs, dry
 * and real, on a copy of the repo's data files in a temp directory, with
 * sheet rows made from that copy's own library. The repo's own files are
 * only read, and the last test checks their hashes.
 *
 * The owner's workbook itself is not in the repo. Point
 * `PROGRESSION_SHEET_XLSX` at it (the sheet, downloaded as .xlsx) to also
 * pin what the real sheet reads as and pairs to.
 */

type Body = Record<string, unknown>;

/* ── Helpers ───────────────────────────────────────────────────────── */

/** A zip of text files, each stored (method 0) or deflated (method 8). */
function zip(files: Record<string, string>, method: 0 | 8): Buffer {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const data = Buffer.from(text, 'utf8');
    const body = method === 8 ? deflateRawSync(data) : data;
    const nameBytes = Buffer.from(name, 'utf8');
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    parts.push(local, nameBytes, body);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(method, 10);
    entry.writeUInt32LE(body.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(nameBytes.length, 28);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, nameBytes);
    offset += 30 + nameBytes.length + body.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, directory, end]);
}

/** A tab as the reader hands it on: row number → column → text. */
const tab = (
  name: string,
  rows: Record<number, Record<string, string>>,
): XlsxSheet => ({
  name,
  rows: new Map(
    Object.entries(rows).map(([number, cells]) => [
      Number(number),
      new Map(Object.entries(cells)),
    ]),
  ),
});

/** A library entry, as the library writes one. */
const entry = (
  id: number,
  chords: string[],
  extra: Partial<Body> = {},
): Body => ({
  id,
  ...derivedFields(chords),
  chords,
  complexity: 'triad',
  vibes: [],
  styles: [],
  artist: '',
  song: '',
  ...extra,
});

/** A sheet row, spelled as `written`. */
const row = (
  number: number,
  written: string[],
  extra: Partial<SheetRow> = {},
): SheetRow => ({
  tab: 't',
  row: number,
  written,
  chords: fixChords(written),
  vibe: '',
  style: '',
  artist: '',
  song: '',
  ...extra,
});

/** Rows read already, as `readProgressionSheet` would hand them on. */
const sheetOf = (rows: SheetRow[]): SheetRead => ({
  tabs: [{ name: 't', columns: {}, unknownHeaders: {}, progressions: 0 }],
  otherTabs: [],
  rows,
  wrongTab: [],
  unlabelled: [],
  labels: [],
  problems: [],
});

const SONGS = [
  { id: 'love_on_top', title: 'Love on Top', artist: 'Beyoncé' },
  { id: 'dreams', title: 'Dreams', artist: 'Fleetwood Mac' },
  {
    id: 'hallelujah_i_love_her_so',
    title: 'Hallelujah I Love Her So',
    artist: 'Ray Charles',
  },
] as unknown as Song[];

/** The linker's suggestion for one progression's song text. */
function linkFor(id: number, song: string) {
  const plan = planProgressionSongs({
    songs: SONGS,
    progressions: [{ id, song }],
  });
  expect(plan.planned).toHaveLength(1);
  return plan.planned[0].suggestion;
}

/** Every file under a root, with its hash. */
function hashes(root: string): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (dir: string) => {
    for (const item of readdirSync(join(root, dir), { withFileTypes: true })) {
      const path = dir ? `${dir}/${item.name}` : item.name;
      if (item.isDirectory()) walk(path);
      else out.set(path, sha256(readFileSync(join(root, path))));
    }
  };
  walk('');
  return out;
}

const changedBetween = (
  before: Map<string, string>,
  after: Map<string, string>,
): string[] =>
  [...new Set([...before.keys(), ...after.keys()])]
    .filter((path) => before.get(path) !== after.get(path))
    .sort();

/* ── The workbook reader ───────────────────────────────────────────── */

describe('readXlsx', () => {
  const NS =
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const files = {
    'xl/workbook.xml': `<?xml version="1.0"?><workbook ${NS}><sheets><sheet state="visible" name="Rules &amp; such" sheetId="1" r:id="rId9"/><sheet name="1 maj7" sheetId="2" r:id="rId2"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<Relationships><Relationship Id="rId2" Type="worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId9" Type="worksheet" Target="/xl/worksheets/sheet1.xml"/></Relationships>`,
    'xl/sharedStrings.xml': `<sst count="3" uniqueCount="3"><si><t>1st</t></si><si><r><t>Rock &amp; </t></r><r><rPr><b/></rPr><t xml:space="preserve">Roll </t></r><rPh><t>ignored</t></rPh></si><si><t>b7dominant7#11</t></si></sst>`,
    'xl/worksheets/sheet1.xml': `<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>1</v></c></row></sheetData></worksheet>`,
    'xl/worksheets/sheet2.xml': `<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="inlineStr"><is><t>2nd</t></is></c><c r="C1"><v>42</v></c><c r="D1" t="b"><v>1</v></c><c r="E1" s="3"/></row><row r="7"><c r="AA7" t="s"><v>2</v></c><c r="B7" t="str"><v>&#x266d;7</v></c></row></sheetData></worksheet>`,
  };

  it.each([0, 8] as const)(
    'reads tabs in tab order and cells as text (zip method %i)',
    (method) => {
      const sheets = readXlsx(zip(files, method));
      expect(sheets.map((sheet) => sheet.name)).toEqual([
        'Rules & such',
        '1 maj7',
      ]);
      expect([...sheets[0].rows.get(1)!]).toEqual([['A', 'Rock & Roll ']]);
      const second = sheets[1].rows;
      expect([...second.keys()]).toEqual([1, 7]);
      expect(Object.fromEntries(second.get(1)!)).toEqual({
        A: '1st',
        B: '2nd',
        C: '42',
        D: 'TRUE',
      });
      expect(Object.fromEntries(second.get(7)!)).toEqual({
        AA: 'b7dominant7#11',
        B: '♭7',
      });
    },
  );

  it('refuses a file that is not a workbook', () => {
    expect(() => readXlsx(Buffer.from('not a zip at all, just text'))).toThrow(
      /not a zip/,
    );
    expect(() => readXlsx(zip({ 'a.txt': 'hello' }, 8))).toThrow(
      /not an Excel workbook/,
    );
  });
});

/* ── Reading the tabs ──────────────────────────────────────────────── */

describe('readProgressionSheet', () => {
  const read = readProgressionSheet([
    tab('Algorithms', {
      1: { A: 'VIBE NAME', D: 'IF', F: 'AND/OR' },
      2: { A: 'Cool', D: '1st Chord =', E: 'major7' },
    }),
    tab('1 maj7', {
      1: {
        A: '1st',
        B: '2nd',
        C: '3rd',
        D: '4th',
        G: 'VIBE',
        H: 'STYLE',
        I: 'ARTIST',
        J: 'SONG',
      },
      2: { A: 'Starting on the 1' },
      3: {
        A: '1 major7 ',
        B: '2 minor7',
        C: 'b7dominant7#11',
        G: 'cool, Sexy',
        H: 'jazz',
        I: 'Do I Do- Stevie Wonder',
      },
      4: { A: '1 major', B: '4 major', J: 'Song A' },
      5: { A: '3 dominant7#5', B: '6 minor7' },
    }),
    tab('1 maj', {
      1: { A: '1 st', B: '2nd', C: '3rd', G: 'VIBE' },
      2: { A: '1 major', B: '5 major', H: 'Unlabelled Song (Someone)' },
      3: { A: '1 major', C: '4 major' },
    }),
  ]);

  it('finds progression tabs and their columns by header', () => {
    expect(read.otherTabs).toEqual(['Algorithms']);
    expect(read.tabs.map((t) => [t.name, t.progressions])).toEqual([
      ['1 maj7', 3],
      ['1 maj', 2],
    ]);
    expect(read.tabs[0].columns).toEqual({
      A: 'chord',
      B: 'chord',
      C: 'chord',
      D: 'chord',
      G: 'vibe',
      H: 'style',
      I: 'artist',
      J: 'song',
    });
    expect(read.labels).toEqual([
      { tab: '1 maj7', row: 2, text: 'Starting on the 1' },
    ]);
  });

  it('reads a row by its chords, trimmed and with the spellings fixed', () => {
    expect(read.rows[0]).toEqual({
      tab: '1 maj7',
      row: 3,
      written: ['1 major7', '2 minor7', 'b7dominant7#11'],
      chords: ['1 major7', '2 minor7', 'b7 dominant7#11'],
      vibe: 'cool, Sexy',
      style: 'jazz',
      artist: 'Do I Do- Stevie Wonder',
      song: '',
    });
  });

  it('notes rows in the wrong tab, song text with no header, and gaps', () => {
    expect(read.wrongTab).toEqual([
      { tab: '1 maj7', row: 4, first: '1 major', belongsIn: '1 maj' },
      { tab: '1 maj7', row: 5, first: '3 dominant7#5', belongsIn: null },
    ]);
    expect(read.unlabelled).toEqual([
      { tab: '1 maj', row: 2, column: 'H', text: 'Unlabelled Song (Someone)' },
    ]);
    expect(read.rows.find((r) => r.tab === '1 maj' && r.row === 2)?.song).toBe(
      'Unlabelled Song (Someone)',
    );
    expect(read.problems).toEqual([
      '1 maj row 3 has an empty chord cell between chords',
    ]);
  });
});

/* ── Spelling, pairing, complexity ─────────────────────────────────── */

describe('spelling fixes', () => {
  it('fixes whole chords from the explicit list, and nothing else', () => {
    expect(CHORD_SPELLING_FIXES).toEqual({
      'b7dominant7#11': 'b7 dominant7#11',
      '1 maj/5': '1 major/5',
      '2 maj': '2 major',
      '2 minor 7': '2 minor7',
      '1major/ 3': '1 major/3',
      '2minor': '2 minor',
    });
    expect(
      fixChords(['2 maj', '2 major', '2 maj7', ' 2 maj', '1 maj/5', '2minor']),
    ).toEqual([
      '2 major',
      '2 major',
      '2 maj7',
      ' 2 maj',
      '1 major/5',
      '2 minor',
    ]);
  });

  it('works out the derived fields as the New flow does', () => {
    expect(derivedFields(['b7 dominant7#11', '1 major'])).toEqual({
      progression: 'b7 dominant7#11 - 1 major',
      chordCount: 2,
      startingChord: 'b7 dominant7#11',
      startingDegree: 'b7',
    });
  });
});

describe('pairRows', () => {
  const A = ['1 major', '4 major'];
  const entries = libraryEntries([
    entry(5, A),
    entry(3, A),
    entry(9, ['6 minor7', '2 maj']),
    entry(7, ['5 major', '1 major']),
  ]);

  it('pairs repeats in id order, corrects spellings, and skips second copies', () => {
    const rows = [
      row(1, A),
      row(2, ['6 minor7', '2 major']),
      row(3, A),
      row(4, A),
      row(5, ['3 minor', '6 minor']),
    ];
    const pairing = pairRows(rows, entries);
    expect(pairing.pairs.map((p) => [p.row.row, p.entry.id, p.how])).toEqual([
      [1, 3, 'exact'],
      [2, 9, 'corrected'],
      [3, 5, 'exact'],
    ]);
    expect(pairing.secondCopies.map((c) => [c.row.row, c.of])).toEqual([
      [4, 3],
    ]);
    expect(pairing.notInLibrary.map((r) => r.row)).toEqual([5]);
    expect(pairing.unpaired.map((e) => e.id)).toEqual([7]);
  });

  it('pairs exact spellings before corrected ones', () => {
    const both = libraryEntries([
      entry(1, ['1 major', '2 maj']),
      entry(2, ['1 major', '2 major']),
    ]);
    const pairing = pairRows(
      [row(1, ['1 major', '2 major']), row(2, ['1 major', '2 maj'])],
      both,
    );
    expect(pairing.pairs.map((p) => [p.row.row, p.entry.id, p.how])).toEqual([
      [1, 2, 'exact'],
      [2, 1, 'exact'],
    ]);
  });
});

describe('complexity readings', () => {
  it('reads by name and by sound, which differ only for slash chords', () => {
    expect(complexityByName(['1 major', '4 major'])).toBe('triad');
    expect(complexityBySound(['1 major', '4 major'])).toBe('triad');
    expect(complexityByName(['1 major7', 'b7 dominant7#11'])).toBe('extended');
    expect(complexityByName(['6 minor7', '2 minor7'])).toBe('7th');
    // G over F#: a triad by name, a major 7th as Prism plays it.
    expect(complexityByName(['5 major', '5 major/7', '1 major'])).toBe('triad');
    expect(complexityBySound(['5 major', '5 major/7', '1 major'])).toBe('7th');
    // C over its own fifth adds no note.
    expect(complexityBySound(['1 major/5'])).toBe('triad');
    expect(complexityByName(['1 nonsense'])).toBeNull();
  });
});

/* ── The plan ──────────────────────────────────────────────────────── */

describe('planSheetImport', () => {
  const lovedSuggestion = (id: number) => linkFor(id, 'Love on Top (Beyonce)');
  const decisions: SuggestionDecision[] = [
    makeDecision(lovedSuggestion(3), 'reject', {
      by: 'owner',
      at: '2026-09-30T10:00:00.000Z',
      method: 'single',
    }),
    makeDecision(lovedSuggestion(4), 'accept', {
      by: 'repo-import',
      at: '2026-09-30T10:00:00.000Z',
      method: 'import',
    }),
  ];
  const bodies: Body[] = [
    entry(1, ['1 major', '4 major']),
    entry(2, ['1 major', '5 major'], { song: 'Dreams- Fleetwood Mac' }),
    entry(3, ['1 major', '6 minor'], { song: 'Love on Top (Beyonce)' }),
    entry(4, ['1 major', '3 minor'], { song: 'Love on Top (Beyonce)' }),
    entry(5, ['1 major', '2 minor'], {
      complexity: '7th',
      vibes: ['cool'],
      styles: ['jazz'],
    }),
    entry(578, ['1 major', 'b7 major']),
    entry(900, ['2 minor 7', '5 dominant7'], { complexity: '7th' }),
  ];
  const read = sheetOf([
    row(1, ['1 major', '4 major'], { song: 'Love on Top (Beyonce)' }),
    row(2, ['1 major', '5 major'], { song: 'Dreams (Fleetwood Mac)' }),
    row(3, ['1 major', '6 minor']),
    row(4, ['1 major', '3 minor']),
    row(5, ['1 major', '2 minor'], { vibe: 'Happy, cool', style: 'pop' }),
    row(578, ['1 major', 'b7 major'], {
      song: 'Hallelujah I Love Her So- Ray Charles',
    }),
    row(900, ['2 minor7', '5 dominant7']),
  ]);
  const at = '2026-10-01T12:00:00.000Z';
  const plan = planSheetImport({ read, bodies, songs: SONGS, decisions, at });
  const after = (id: number) =>
    plan.changes.find((change) => change.id === id)?.after;

  it('fixes the chords and the fields that follow from them', () => {
    expect(plan.chordFixes).toEqual([
      {
        id: 900,
        before: ['2 minor 7', '5 dominant7'],
        after: ['2 minor7', '5 dominant7'],
      },
    ]);
    expect(after(900)).toMatchObject({
      chords: ['2 minor7', '5 dominant7'],
      progression: '2 minor7 - 5 dominant7',
      chordCount: 2,
      startingChord: '2 minor7',
      startingDegree: '2',
      complexity: '7th',
    });
    expect(plan.pairing.pairs.find((p) => p.entry.id === 900)?.how).toBe(
      'corrected',
    );
  });

  it('fills empty text from the sheet and keeps text the library has', () => {
    expect(plan.textMerges).toEqual([
      {
        id: 1,
        field: 'song',
        value: 'Love on Top (Beyonce)',
        tab: 't',
        row: 1,
      },
      {
        id: 578,
        field: 'song',
        value: 'Hallelujah I Love Her So- Ray Charles',
        tab: 't',
        row: 578,
      },
    ]);
    expect(plan.textDiffers).toEqual([
      {
        id: 2,
        field: 'song',
        library: 'Dreams- Fleetwood Mac',
        sheet: 'Dreams (Fleetwood Mac)',
        tab: 't',
        row: 2,
      },
    ]);
    expect(after(2)?.song).toBe('Dreams- Fleetwood Mac');
  });

  it('links sure songs only, and holds back the known-wrong and the decided', () => {
    expect(plan.songLinks.map((l) => [l.id, l.songId])).toEqual([
      [1, 'love_on_top'],
      [2, 'dreams'],
    ]);
    expect(after(1)?.songIds).toEqual(['love_on_top']);
    expect(after(2)?.songIds).toEqual(['dreams']);
    expect(after(578)?.songIds).toBeUndefined();
    expect(plan.songLinksHeld.map((l) => [l.id, l.songId, l.reason])).toEqual([
      [3, 'love_on_top', 'a person rejected it'],
      [4, 'love_on_top', 'it was linked once and taken out by hand since'],
      [
        578,
        'hallelujah_i_love_her_so',
        'the import rules know it is wrong (hallelujah-progression)',
      ],
    ]);
    expect(plan.decisions).toHaveLength(2);
    expect(plan.decisions[0]).toMatchObject({
      op: 'accept',
      method: 'import',
      by: SHEET_IMPORT_BY,
      at,
      target: { kind: 'chord_progression', slug: '1' },
      path: 'songIds[]',
      value: 'love_on_top',
    });
  });

  it('reports vibes, styles and complexity, and changes none of them', () => {
    expect(plan.changes.map((c) => c.id)).toEqual([1, 2, 578, 900]);
    for (const change of plan.changes)
      for (const field of ['vibes', 'styles', 'complexity'])
        expect(change.after[field]).toEqual(change.before[field]);
    expect(plan.vibes).toMatchObject({
      sheetHas: 1,
      differ: 1,
      onlyInSheet: { happy: 1 },
      rows: [{ id: 5, sheet: ['happy', 'cool'], library: ['cool'] }],
    });
    expect(plan.styles.rows).toEqual([
      { id: 5, tab: 't', row: 5, sheet: ['pop'], library: ['jazz'] },
    ]);
    expect(
      plan.complexity.map((c) => [c.id, c.stored, c.byName, c.kind]),
    ).toEqual([[5, '7th', 'triad', 'clear']]);
  });

  it('passes its own gate, and changes nothing when run again', () => {
    for (const change of plan.changes)
      expect(gateProblems(change.before, change.after)).toEqual([]);
    const again = planSheetImport({
      read,
      bodies: bodies.map((body) => after(body.id as number) ?? body),
      songs: SONGS,
      decisions: [...decisions, ...plan.decisions],
      at,
    });
    expect(again.changes).toEqual([]);
    expect(again.decisions).toEqual([]);
    expect(again.chordFixes).toEqual([]);
  });

  it('lists duplicates and cut-off copies', () => {
    const more = planSheetImport({
      read: sheetOf([row(1, ['1 major', '4 major', '5 major'])]),
      bodies: [
        entry(10, ['1 major', '4 major']),
        entry(11, ['1 major', '4 major', '5 major']),
        entry(12, ['6 minor', '4 major']),
        entry(13, ['6 minor', '4 major']),
      ],
      songs: [],
      decisions: [],
      at,
    });
    expect(more.duplicates).toEqual([
      { chords: ['6 minor', '4 major'], ids: [12, 13] },
    ]);
    expect(more.cutOffs).toEqual([
      { id: 10, chords: ['1 major', '4 major'], continuedBy: [11] },
      { id: 12, chords: ['6 minor', '4 major'], continuedBy: [] },
      { id: 13, chords: ['6 minor', '4 major'], continuedBy: [] },
    ]);
  });
});

describe('gateProblems', () => {
  const before = entry(1, ['1 major', '2 maj'], {
    song: 'Dreams',
    songIds: ['a', 'b'],
  });
  it('allows the fixes, empty text and added songs', () => {
    expect(
      gateProblems(entry(1, ['1 major', '2 maj']), {
        ...entry(1, ['1 major', '2 major']),
        song: 'x',
        artist: 'y',
        songIds: ['a'],
      }),
    ).toEqual([]);
  });
  it('refuses everything else', () => {
    expect(
      gateProblems(before, {
        ...before,
        vibes: ['cool'],
        chords: ['1 major', '2 minor'],
        song: 'Other',
        songIds: ['b', 'a'],
      }),
    ).toEqual([
      'vibes changes, and the import never changes it',
      'the chords change beyond the spelling fixes',
      'progression does not follow from the chords',
      'song had text, and it would be written over',
      'songIds would lose or reorder a song it had',
    ]);
  });
});

describe('parseCliArgs', () => {
  it('takes the workbook as an argument or --sheet', () => {
    expect(parseCliArgs(['--dry-run', 'a.xlsx'])).toMatchObject({
      dryRun: true,
      sheet: 'a.xlsx',
    });
    expect(
      parseCliArgs(['--sheet=b.xlsx', '--report', 'r.md', '--json', 'r.json']),
    ).toMatchObject({
      dryRun: false,
      sheet: 'b.xlsx',
      report: 'r.md',
      json: 'r.json',
    });
    expect(() => parseCliArgs(['a.xlsx', 'b.xlsx'])).toThrow(
      /unknown argument/,
    );
    expect(() => parseCliArgs(['--report'])).toThrow(/needs a value/);
  });
});

/* ── Runs, on a copy of the repo ───────────────────────────────────── */

describe('runSheetImport on a copy of the repo', () => {
  let root: string;
  let read: SheetRead;
  let bodies: Body[];
  const repoBefore = new Map<string, string>();
  const quiet = {
    git: false as const,
    now: () => new Date('2026-10-01T12:00:00.000Z'),
  };

  beforeAll(async () => {
    for (const path of [LIBRARY_FILE, DECISIONS_PATH])
      repoBefore.set(path, sha256(readFileSync(join(REPO_ROOT, path))));
    root = await scratchCopy('sheet-import-');
    const store = await loadRepoStore({ root });
    bodies = store
      .items('chord_progression')
      .map((item) => item.body as Body)
      .sort((a, b) => (a.id as number) - (b.id as number));
    // The sheet, made from the library itself: id 12 misspelled as the
    // sheet spells it, and id 1 naming a song the library has.
    read = sheetOf(
      bodies.map((body) => {
        const id = body.id as number;
        const written = (body.chords as string[]).map((chord) =>
          id === 12 && chord === 'b7 dominant7#11' ? 'b7dominant7#11' : chord,
        );
        return row(
          id,
          written,
          id === 1 ? { song: 'Love on Top (Beyonce)' } : {},
        );
      }),
    );
  }, 60_000);

  afterAll(() => {
    if (root) rmSync(root, { recursive: true, force: true });
  });

  it('writes nothing on a dry run', async () => {
    const before = hashes(root);
    const report = await runSheetImport({ dryRun: true, read, root, ...quiet });
    expect(changedBetween(before, hashes(root))).toEqual([]);
    expect(report.wrote).toBe(false);
    expect(report.hashes.moved).toEqual([]);
    expect(report.hashes.files).toBeGreaterThan(600);
    expect(report.gate).toEqual({ ok: true, problems: [] });
    expect(report.secondRun).toEqual({ changes: 0, decisions: 0 });
    expect(report.plan.pairing.pairs).toHaveLength(bodies.length);
    expect(report.plan.pairing.pairs.find((p) => p.entry.id === 12)?.how).toBe(
      'corrected',
    );
    expect(report.plan.changes.map((c) => c.id)).toEqual([
      1, 82, 444, 461, 462,
    ]);
    expect(report.files.map((file) => file.path)).toEqual([
      LIBRARY_FILE,
      DECISIONS_PATH,
    ]);
    const markdown = reportMarkdown(report);
    expect(markdown).toMatch(/nothing was written/);
    expect(markdown).toMatch(/Q7\. The two cut-off copies/);
    // The report ends on the two questions the owner answers.
    const q7 = markdown.indexOf('### Q7.');
    const q8 = markdown.indexOf('### Q8.');
    expect(q7).toBeGreaterThan(markdown.indexOf('## Running it'));
    expect(q8).toBeGreaterThan(q7);
    expect(markdown.slice(q8)).not.toMatch(/^## /m);
    expect(markdown).not.toMatch(/musicbrainz|wikidata|mind map|atlas graph/i);
  }, 60_000);

  it('refuses while another import holds the lock', async () => {
    const lock = acquireRunLock(join(root, IMPORT_LOCK_FILE));
    try {
      await expect(
        runSheetImport({ dryRun: true, read, root, ...quiet }),
      ).rejects.toThrow(/another import is running/);
    } finally {
      lock.release();
    }
  });

  it('refuses a real run the gate or git would not let through', async () => {
    const before = hashes(root);
    await expect(
      runSheetImport({
        dryRun: false,
        read: { ...read, problems: ['row 9 is odd'] },
        root,
        ...quiet,
      }),
    ).rejects.toThrow(/the gate refused the plan/);
    const git: GitRunner = async (args) =>
      args[0] !== 'status' ? 'main\n' : ` M ${LIBRARY_FILE}\0`;
    await expect(
      runSheetImport({ dryRun: false, read, root, ...quiet, git }),
    ).rejects.toThrow(/commit them first, or pass --allow-uncommitted/);
    expect(changedBetween(before, hashes(root))).toEqual([]);
  }, 60_000);

  it('writes the library and the decisions log, and nothing else', async () => {
    const before = hashes(root);
    const decisionsBefore = parseDecisionsFile(
      readFileSync(join(root, DECISIONS_PATH), 'utf8'),
    ).decisions;
    const report = await runSheetImport({
      dryRun: false,
      read,
      root,
      ...quiet,
    });
    expect(report.wrote).toBe(true);
    expect(changedBetween(before, hashes(root))).toEqual(
      [DECISIONS_PATH, LIBRARY_FILE].sort(),
    );

    const store = await loadRepoStore({ root });
    const now = new Map(
      store
        .items('chord_progression')
        .map((item) => [item.slug, item.body as Body]),
    );
    expect(now.get('82')).toMatchObject({
      chords: [
        '1 major7',
        '2 minor7',
        '3 dominant7#5',
        '4 major7',
        '#4 diminished7',
        '1 major/5',
      ],
      progression:
        '1 major7 - 2 minor7 - 3 dominant7#5 - 4 major7 - #4 diminished7 - 1 major/5',
    });
    for (const id of ['444', '462'])
      expect(now.get(id)?.chords).toContain('2 minor7');
    expect(now.get('461')?.chords).toContain('2 major');
    expect(now.get('1')).toMatchObject({
      song: 'Love on Top (Beyonce)',
      songIds: ['love_on_top'],
    });
    for (const body of bodies) {
      const id = body.id as number;
      if ([1, 82, 444, 461, 462].includes(id)) continue;
      expect(now.get(String(id))).toEqual(body);
    }
    const decisionsAfter = parseDecisionsFile(
      readFileSync(join(root, DECISIONS_PATH), 'utf8'),
    );
    expect(decisionsAfter.refused).toEqual([]);
    expect(decisionsAfter.decisions.slice(0, decisionsBefore.length)).toEqual(
      decisionsBefore,
    );
    expect(decisionsAfter.decisions.slice(decisionsBefore.length)).toEqual([
      expect.objectContaining({
        op: 'accept',
        method: 'import',
        by: SHEET_IMPORT_BY,
        target: { kind: 'chord_progression', slug: '1' },
        value: 'love_on_top',
      }),
    ]);
  }, 60_000);

  it('changes nothing when run again', async () => {
    const before = hashes(root);
    const report = await runSheetImport({
      dryRun: false,
      read,
      root,
      ...quiet,
    });
    expect(report.wrote).toBe(false);
    expect(report.plan.changes).toEqual([]);
    expect(report.plan.decisions).toEqual([]);
    expect(changedBetween(before, hashes(root))).toEqual([]);
  }, 60_000);

  it("leaves the repo's own files alone", () => {
    for (const [path, sha] of repoBefore)
      expect(sha256(readFileSync(join(REPO_ROOT, path)))).toBe(sha);
  });
});

/* ── The owner's workbook, when it is at hand ──────────────────────── */

const WORKBOOK = process.env.PROGRESSION_SHEET_XLSX;

describe.skipIf(!WORKBOOK)('the real sheet (PROGRESSION_SHEET_XLSX)', () => {
  it('reads 697 rows, three of them in the wrong tab', () => {
    const read = readWorkbook(WORKBOOK!);
    expect(read.problems).toEqual([]);
    expect(read.rows).toHaveLength(697);
    expect(read.tabs).toHaveLength(17);
    expect(read.otherTabs).toEqual(['Algorithms']);
    expect(read.wrongTab.map((r) => [r.tab, r.row])).toEqual([
      ['1 maj7', 255],
      ['3 dom7', 6],
      ['4 maj', 22],
    ]);
    expect(read.unlabelled.map((c) => [c.tab, `${c.column}${c.row}`])).toEqual([
      ['3 min', 'H12'],
      ['3 min', 'H13'],
      ['4 maj', 'H22'],
    ]);
  });

  it('pairs 693 rows with the library: 690 exactly, 3 once corrected', async () => {
    const store = await loadRepoStore({ root: REPO_ROOT });
    const plan = planSheetImport({
      read: readWorkbook(WORKBOOK!),
      bodies: store.items('chord_progression').map((item) => item.body as Body),
      songs: store.items('song').map((item) => item.body as unknown as Song),
      decisions: parseDecisionsFile(
        readFileSync(join(REPO_ROOT, DECISIONS_PATH), 'utf8'),
      ).decisions,
      at: '2026-10-01T12:00:00.000Z',
    });
    const { pairing } = plan;
    expect(pairing.pairs).toHaveLength(693);
    expect(pairing.pairs.filter((p) => p.how === 'exact')).toHaveLength(690);
    expect(
      pairing.pairs.filter((p) => p.how === 'corrected').map((p) => p.entry.id),
    ).toEqual([12, 483, 585]);
    expect(pairing.secondCopies.map((c) => [c.row.tab, c.row.row])).toEqual([
      ['1 maj', 48],
      ['1 maj', 69],
      ['1 maj', 79],
      ['1 maj', 84],
    ]);
    expect(pairing.notInLibrary).toEqual([]);
    expect(pairing.unpaired.map((e) => e.id)).toEqual([428, 451]);
    expect(plan.chordFixes.map((f) => f.id)).toEqual([82, 444, 461, 462]);
    expect(plan.chordProblems).toEqual([]);
    expect(plan.duplicates.map((d) => d.ids)).toEqual([
      [151, 152],
      [475, 481],
      [485, 494],
      [486, 495],
      [487, 496],
      [488, 497],
      [489, 498],
      [510, 515],
    ]);
    expect(plan.cutOffs).toEqual([
      expect.objectContaining({ id: 428, continuedBy: [693] }),
      expect.objectContaining({ id: 451, continuedBy: [696] }),
    ]);
    expect(plan.vibes).toMatchObject({ sheetHas: 299, same: 21 });
  }, 60_000);
});
