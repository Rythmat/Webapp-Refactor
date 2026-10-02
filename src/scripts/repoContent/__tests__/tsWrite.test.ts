import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
import {
  CITIES_DECLARATION,
  EVENTS_DECLARATION,
  type Json,
  PROGRESSION_LIBRARY_DECLARATION,
  readDeclaration,
  RepoUnwritableError,
  RESERVED_BINDING_NAMES,
  SONG_DECLARATION,
} from '../literal';
import {
  applySplices,
  isPrettierClean,
  newDeclarationFile,
  orderKeys,
  SONG_KEY_ORDER,
  SONG_RULES,
  songIdentifier,
  TS_FILE_KINDS,
  verifyRoundTrip,
  writeTsDeclaration,
  writeTsElements,
  type WriteRules,
} from '../tsWrite';
import { moduleErrors } from './moduleErrors';

/**
 * The surgical writer on fixtures shaped like the repo's data files. Each
 * expected text is the fixture with exactly the edit a person would make,
 * so a test failing here means the writer touched something it should not
 * have. The fixtures are prettier-clean, as the real files are; the first
 * test checks that, since everything else depends on it.
 */

const FILE = 'fixtures/song.ts';

const SONG = `import type { Song } from '@/curriculum/types/songLibrary';

export const _1999: Song = {
  id: '1999',
  title: '1999',
  artist: 'Prince',
  year: undefined,
  // The billing as the record prints it.
  origin: { artistGlobeId: 'prince' },

  historicalDescription: 'Prince releases it.',
  key: 'F major',
  keyRoot: 65,
  mode: 'major',
  tempo: 120,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk', 'pop', 'rock'],
  techniques: [],

  relatedRecordings: [
    // Recorded first by the band, then by Prince.
    { artist: 'The Family', year: 1985, relation: 'original' },
    { artist: 'Prince', year: 1984, relation: 'original' }, // his demo
    { artist: 'Sinead', year: 1990, relation: 'cover' },
  ],
  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [{ provider: 'youtube', uri: 'https://youtube.com/watch?v=x' }],
  artistImageSource: 'manual',
  popularity: 50, // from the chart
  artistImageRef: '/artists/svg/prince.webp',
};
`;

const EVENTS = `import type { HistoricalEvent } from '@/components/atlas/types';

export const JAZZ_EVENTS: HistoricalEvent[] = [
  {
    id: 'evt-a',
    year: 1923,
    location: {
      lat: 29.9511,
      lng: -90.0715,
      city: 'New Orleans',
      country: 'US',
    },
    genre: ['Jazz'],
    title: 'King Oliver records',
    description: 'The first sides.',
    tags: ['king oliver'],
  },

  // ── Bebop ──────────────────────────────────────────────────────────
  {
    id: 'evt-b',
    year: 1945,
    location: {
      lat: 40.7128,
      lng: -74.006,
      city: 'New York City',
      country: 'US',
    },
    genre: ['Jazz', 'Bebop'],
    title: 'Bebop on 52nd Street',
    description: 'Parker and Gillespie.',
    tags: ['charlie parker'],
    videoId: 'XIwhV-xGFAg',
  },
  {
    id: 'evt-c',
    year: 1959,
    location: {
      lat: 40.7128,
      lng: -74.006,
      city: 'New York City',
      country: 'US',
    },
    genre: ['Jazz'],
    title: 'Kind of Blue',
    description: 'Modal jazz.',
    tags: ['miles davis'],
  },
];
`;

const LIBRARY = `/**
 * Phase 7 — Chord Progression Library.
 */

const CHORD_PROGRESSION_LIBRARY: ChordProgressionEntry[] = [
  {
    id: 1,
    progression: '1 major - 4 major',
    chords: ['1 major', '4 major'],
    song: '',
  },

  {
    id: 2,
    progression: '2 minor - 5 major',
    chords: ['2 minor', '5 major'],
    song: 'Dreams- Fleetwood Mac',
  },
];

export default CHORD_PROGRESSION_LIBRARY;
`;

type Body = Record<string, any>;

/** Evaluates the fixture, lets `edit` change a copy, and writes it back. */
async function editSong(
  edit: (song: Body) => void,
  rules: WriteRules = SONG_RULES,
  text = SONG,
) {
  const read = readDeclaration(text, FILE, SONG_DECLARATION);
  const next = structuredClone(read.value) as Body;
  edit(next);
  return writeTsDeclaration({
    text,
    fileName: FILE,
    locator: SONG_DECLARATION,
    rules,
    next,
  });
}

async function editEvents(edit: (events: Body[]) => void | Body[]) {
  const read = readDeclaration(EVENTS, 'fixtures/jazz.ts', EVENTS_DECLARATION);
  const events = structuredClone(read.value) as Body[];
  const next = edit(events) ?? events;
  return writeTsDeclaration({
    text: EVENTS,
    fileName: 'fixtures/jazz.ts',
    locator: EVENTS_DECLARATION,
    rules: TS_FILE_KINDS.events.rules,
    next,
  });
}

/** `text` with one exact substring replaced, failing if it is not there once. */
function swap(text: string, from: string, to: string): string {
  expect(text.split(from).length - 1).toBe(1);
  return text.replace(from, to);
}

/** The refusal a write rejects with. */
async function refusal(
  promise: Promise<unknown>,
): Promise<RepoUnwritableError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof RepoUnwritableError) return error;
    throw error;
  }
  throw new Error('expected a refusal');
}

describe('the fixtures', () => {
  it('are prettier-clean with the repo config, as the data files are', async () => {
    for (const text of [SONG, EVENTS, LIBRARY]) {
      expect(await isPrettierClean(text)).toBe(true);
    }
  });
});

describe('equal values', () => {
  it('are skipped: the same body writes back the same string, unformatted', async () => {
    const out = await editSong(() => {});
    expect(out).toEqual({
      text: SONG,
      changed: false,
      splices: 0,
      wasClean: null,
    });
    expect(out.text).toBe(SONG);
  });

  it('keep `year: undefined` where it is', async () => {
    const out = await editSong((song) => {
      delete song.year;
    });
    expect(out.text).toBe(SONG);
  });

  it('with force, still come out byte-identical through prettier and the round trip', async () => {
    const out = await writeTsDeclaration({
      text: SONG,
      fileName: FILE,
      locator: SONG_DECLARATION,
      next: readDeclaration(SONG, FILE, SONG_DECLARATION).value,
      force: true,
    });
    expect(out).toEqual({
      text: SONG,
      changed: false,
      splices: 0,
      wasClean: true,
    });
  });

  it('skip a large equal subtree without looking inside it for splices', async () => {
    const out = await editSong((song) => {
      song.sections = structuredClone(song.sections);
      song.title = 'Nineteen Ninety-Nine';
    });
    expect(out.splices).toBe(1);
  });
});

describe('objects', () => {
  it('replace a changed value where it stands', async () => {
    const out = await editSong((song) => {
      song.title = "Party Like It's 1999";
      song.tempo = 119.5;
    });
    expect(out.text).toBe(
      swap(
        swap(SONG, "title: '1999'", `title: "Party Like It's 1999"`),
        'tempo: 120',
        'tempo: 119.5',
      ),
    );
    expect(out).toMatchObject({ changed: true, splices: 2, wasClean: true });
  });

  it('write a `year: undefined` in place instead of adding a second year', async () => {
    const out = await editSong((song) => {
      song.year = 1982;
    });
    expect(out.text).toBe(swap(SONG, 'year: undefined', 'year: 1982'));
  });

  it('insert a new key after the nearest key before it in the song order', async () => {
    const out = await editSong((song) => {
      song.composer = 'Prince';
    });
    // composer follows artist in SONG_KEY_ORDER; year (a remembered
    // undefined) comes after it, so it goes between them.
    expect(out.text).toBe(
      swap(
        SONG,
        "  artist: 'Prince',\n",
        "  artist: 'Prince',\n  composer: 'Prince',\n",
      ),
    );
  });

  it('put session and credits after techniques, in the song order, as the pilot songs have them', async () => {
    const out = await editSong((song) => {
      // Built in the "wrong" order on purpose: the key order decides.
      song.credits = [{ name: 'Prince', role: 'songwriter' }];
      song.session = { studio: 'Sunset Sound', recordedYear: 1982 };
    });
    expect(out.text).toBe(
      swap(
        SONG,
        '  techniques: [],\n',
        "  techniques: [],\n  session: { studio: 'Sunset Sound', recordedYear: 1982 },\n  credits: [{ name: 'Prince', role: 'songwriter' }],\n",
      ),
    );
  });

  it('skip keys the file lacks when looking for the one before', async () => {
    const out = await editSong((song) => {
      // releases → relatedRecordings (present); contentRefs → releases (new) → relatedRecordings.
      song.releases = [{ title: '1999', year: 1982 }];
      song.contentRefs = [{ kind: 'lesson', id: 'funk-1' }];
    });
    const lines = out.text.split('\n');
    const at = lines.indexOf('  sections: [');
    expect(lines.slice(at - 3, at)).toEqual([
      '  ],',
      "  releases: [{ title: '1999', year: 1982 }],",
      "  contentRefs: [{ kind: 'lesson', id: 'funk-1' }],",
    ]);
  });

  it('insert at the start when the order puts the key before every key the file has', async () => {
    const out = await editSong(
      (song) => {
        song.schemaVersion = 2;
      },
      {
        keyOrder: (path) =>
          path.length ? undefined : ['schemaVersion', ...SONG_KEY_ORDER],
      },
    );
    expect(out.text).toBe(
      swap(
        SONG,
        'export const _1999: Song = {\n',
        'export const _1999: Song = {\n  schemaVersion: 2,\n',
      ),
    );
  });

  it('append a key the order does not know after the last key', async () => {
    const out = await editSong((song) => {
      song.notes = 'unknown to the order';
    });
    expect(out.text).toBe(
      swap(
        SONG,
        "  artistImageRef: '/artists/svg/prince.webp',\n",
        "  artistImageRef: '/artists/svg/prince.webp',\n  notes: 'unknown to the order',\n",
      ),
    );
  });

  it("place a nested object's new key by the new value's own order when the kind gives none", async () => {
    const out = await editSong((song) => {
      song.origin = {
        region: 'Minneapolis',
        artistGlobeId: 'prince',
        country: 'US',
      };
    });
    expect(out.text).toBe(
      swap(
        SONG,
        "origin: { artistGlobeId: 'prince' }",
        "origin: { region: 'Minneapolis', artistGlobeId: 'prince', country: 'US' }",
      ),
    );
  });

  it('insert after a trailing comment rather than in front of it', async () => {
    const out = await editSong(
      (song) => {
        song.late = true;
      },
      {
        keyOrder: (path) =>
          path.length
            ? undefined
            : [...SONG_KEY_ORDER.slice(0, -1), 'popularity', 'late'],
      },
    );
    expect(out.text).toBe(
      swap(
        SONG,
        '  popularity: 50, // from the chart\n',
        '  popularity: 50, // from the chart\n  late: true,\n',
      ),
    );
  });

  it('remove a key with its comma and line', async () => {
    const out = await editSong((song) => {
      delete song.historicalDescription;
      delete song.artistImageRef;
    });
    expect(out.text).toBe(
      swap(
        swap(SONG, "  historicalDescription: 'Prince releases it.',\n", ''),
        "  artistImageRef: '/artists/svg/prince.webp',\n",
        '',
      ),
    );
  });

  it('refuse to remove a key with a comment above it, which is about that key', async () => {
    const error = await refusal(
      editSong((song) => {
        delete song.origin;
      }),
    );
    expect(error).toMatchObject({
      code: 'REPO_UNWRITABLE',
      status: 422,
      file: FILE,
      line: 8,
    });
    expect(error.reason).toMatch(
      /removing `origin` would orphan the comment above it/,
    );
  });

  it('refuse to remove a key with a comment after it on its line', async () => {
    const error = await refusal(
      editSong((song) => {
        delete song.popularity;
      }),
    );
    expect(error.line).toBe(40);
    expect(error.reason).toMatch(/orphan the comment after it/);
  });

  it('read a cast through, and keep it', async () => {
    const text = "export const CITIES = [{ id: 'a', name: 'A' }] as const;\n";
    const out = await writeTsDeclaration({
      text,
      fileName: FILE,
      locator: CITIES_DECLARATION,
      rules: TS_FILE_KINDS.cities.rules,
      next: [{ id: 'a', name: 'Alpha' }],
    });
    expect(out.text).toBe(
      "export const CITIES = [{ id: 'a', name: 'Alpha' }] as const;\n",
    );
  });
});

describe('arrays', () => {
  it('go element by element when the length is the same', async () => {
    const out = await editSong((song) => {
      song.sections[0].bars[1].chords[0].chordName = 'G';
      song.genreTags[2] = 'soul';
    });
    expect(out.text).toBe(
      swap(
        swap(SONG, "chordName: 'C'", "chordName: 'G'"),
        "genreTags: ['funk', 'pop', 'rock']",
        "genreTags: ['funk', 'pop', 'soul']",
      ),
    );
    expect(out.splices).toBe(2);
  });

  it('append after the last element when an array only grew at the end', async () => {
    const out = await editSong((song) => {
      song.sections[0].bars.push({
        chords: [{ degree: '4 maj', chordName: 'Bb', beat: 1, duration: 4 }],
      });
    });
    const last =
      "        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },\n";
    expect(out.text).toBe(
      swap(
        SONG,
        last,
        `${last}        {\n          chords: [{ degree: '4 maj', chordName: 'Bb', beat: 1, duration: 4 }],\n        },\n`,
      ),
    );
  });

  it('fill an empty array', async () => {
    const out = await editSong((song) => {
      song.techniques = ['sixteenth_note_funk'];
    });
    expect(out.text).toBe(
      swap(SONG, 'techniques: []', "techniques: ['sixteenth_note_funk']"),
    );
  });

  it('cut an element out of the middle, keeping the rest as written', async () => {
    const out = await editSong((song) => {
      song.genreTags = ['funk', 'rock'];
    });
    expect(out.text).toBe(
      swap(
        SONG,
        "genreTags: ['funk', 'pop', 'rock']",
        "genreTags: ['funk', 'rock']",
      ),
    );
  });

  it('delete an element but keep the comment above it', async () => {
    const out = await editSong((song) => {
      song.relatedRecordings.shift();
    });
    expect(out.text).toBe(
      swap(
        SONG,
        "    { artist: 'The Family', year: 1985, relation: 'original' },\n",
        '',
      ),
    );
    expect(out.text).toContain(
      "    // Recorded first by the band, then by Prince.\n    { artist: 'Prince'",
    );
  });

  it('refuse to delete an element with a comment after it on its line', async () => {
    const error = await refusal(
      editSong((song) => {
        song.relatedRecordings.splice(1, 1);
      }),
    );
    expect([error.line, error.code]).toEqual([25, 'REPO_UNWRITABLE']);
  });

  it('pair edits in the middle and add what is left after the last pair', async () => {
    const out = await editSong((song) => {
      song.relatedRecordings[2] = {
        artist: "Sinéad O'Connor",
        year: 1990,
        relation: 'cover',
      };
      song.relatedRecordings.push({
        artist: 'Chris Cornell',
        year: 2015,
        relation: 'cover',
      });
    });
    expect(out.text).toBe(
      swap(
        SONG,
        "    { artist: 'Sinead', year: 1990, relation: 'cover' },\n",
        `    { artist: "Sinéad O'Connor", year: 1990, relation: 'cover' },\n    { artist: 'Chris Cornell', year: 2015, relation: 'cover' },\n`,
      ),
    );
  });

  it('refuse a replace whose span holds a comment, naming the file and line', async () => {
    const error = await refusal(
      editSong((song) => {
        song.relatedRecordings = 'none';
      }),
    );
    expect(error).toMatchObject({
      code: 'REPO_UNWRITABLE',
      status: 422,
      file: FILE,
      line: 23,
    });
    expect(error.reason).toMatch(
      /replacing `relatedRecordings` would delete the comment/,
    );
    expect(error.message).toMatch(/^fixtures\/song\.ts:23:\d+: /);
  });

  it('replace a node of another shape when no comment is in the way', async () => {
    const out = await editSong((song) => {
      song.timeSignature = { beats: 6, unit: 8 };
    });
    expect(out.text).toBe(
      swap(
        SONG,
        'timeSignature: [4, 4]',
        'timeSignature: { beats: 6, unit: 8 }',
      ),
    );
  });
});

describe('record arrays, matched by identity', () => {
  it('edit one record and leave the others byte for byte', async () => {
    const out = await writeTsElements({
      text: EVENTS,
      fileName: 'fixtures/jazz.ts',
      locator: EVENTS_DECLARATION,
      rules: TS_FILE_KINDS.events.rules,
      identity: 'id',
      upsert: [
        {
          ...(
            readDeclaration(EVENTS, 'x.ts', EVENTS_DECLARATION).value as Body[]
          )[1],
          year: 1944,
          videoId: undefined,
          artistIds: ['charlie-parker', 'dizzy-gillespie'],
        },
      ],
    });
    expect(out.text).toBe(
      swap(
        swap(EVENTS, '    year: 1945,\n', '    year: 1944,\n'),
        "    videoId: 'XIwhV-xGFAg',\n",
        "    artistIds: ['charlie-parker', 'dizzy-gillespie'],\n",
      ),
    );
  });

  it("put a new v2 key after the event's last known key", async () => {
    const out = await editEvents((events) => {
      events[0].placeId = 'new-orleans';
    });
    expect(out.text).toBe(
      swap(
        EVENTS,
        "    tags: ['king oliver'],\n",
        "    tags: ['king oliver'],\n    placeId: 'new-orleans',\n",
      ),
    );
  });

  it('append a new record laid out like its neighbours', async () => {
    const out = await writeTsElements({
      text: EVENTS,
      fileName: 'fixtures/jazz.ts',
      locator: EVENTS_DECLARATION,
      rules: TS_FILE_KINDS.events.rules,
      identity: 'id',
      upsert: [
        {
          id: 'evt-d',
          year: 1964,
          location: {
            lat: 40.7,
            lng: -74,
            city: 'New York City',
            country: 'US',
          },
          genre: ['Jazz'],
          title: 'A Love Supreme',
          description: "Coltrane's suite.",
          tags: ['john coltrane'],
        },
      ],
    });
    expect(out.text).toBe(
      swap(
        EVENTS,
        "    tags: ['miles davis'],\n  },\n];",
        `    tags: ['miles davis'],
  },
  {
    id: 'evt-d',
    year: 1964,
    location: {
      lat: 40.7,
      lng: -74,
      city: 'New York City',
      country: 'US',
    },
    genre: ['Jazz'],
    title: 'A Love Supreme',
    description: "Coltrane's suite.",
    tags: ['john coltrane'],
  },
];`,
      ),
    );
  });

  it('insert a new record after the one it follows, ahead of the next section heading', async () => {
    const out = await editEvents((events) => [
      events[0],
      { ...events[0], id: 'evt-a2', title: 'Second sides' },
      ...events.slice(1),
    ]);
    const lines = out.text.split('\n');
    const heading = lines.findIndex((l) => l.includes('── Bebop'));
    expect(lines[heading - 2]).toBe('  },');
    expect(lines.slice(0, heading).join('\n')).toContain("id: 'evt-a2'");
    expect(out.text.indexOf("id: 'evt-a2'")).toBeGreaterThan(
      out.text.indexOf("id: 'evt-a'"),
    );
  });

  it('delete a record and keep the section heading above it', async () => {
    const out = await writeTsElements({
      text: EVENTS,
      fileName: 'fixtures/jazz.ts',
      locator: EVENTS_DECLARATION,
      rules: TS_FILE_KINDS.events.rules,
      identity: 'id',
      remove: ['evt-b'],
    });
    const b = EVENTS.slice(
      EVENTS.indexOf("  {\n    id: 'evt-b'"),
      EVENTS.indexOf("  {\n    id: 'evt-c'"),
    );
    expect(out.text).toBe(swap(EVENTS, b, ''));
    expect(out.text).toContain(
      "// ── Bebop ──────────────────────────────────────────────────────────\n  {\n    id: 'evt-c'",
    );
  });

  it('refuse to delete a record that is not there', async () => {
    const error = await refusal(
      writeTsElements({
        text: EVENTS,
        fileName: 'fixtures/jazz.ts',
        locator: EVENTS_DECLARATION,
        identity: 'id',
        remove: ['evt-z'],
      }),
    );
    expect(error.reason).toMatch(/no element with id "evt-z"/);
  });

  it('refuse a reordering, which only a person should do', async () => {
    const error = await refusal(
      editEvents((events) => [events[1], events[0], events[2]]),
    );
    expect(error.reason).toMatch(/was reordered \(id "evt-a" moved\)/);
    expect(error.line).toBe(4);
  });

  it('refuse two records with the same identity', async () => {
    const error = await refusal(
      editEvents((events) => [...events, { ...events[0] }]),
    );
    expect(error.reason).toMatch(/"evt-a" would appear twice/);
  });

  it('copy the blank line between elements when the array has one there', async () => {
    const read = readDeclaration(
      LIBRARY,
      'fixtures/library.ts',
      PROGRESSION_LIBRARY_DECLARATION,
    );
    const next = [
      ...(read.value as Body[]),
      {
        id: 3,
        progression: '1 minor',
        chords: ['1 minor'],
        song: '',
        songIds: ['africa'],
      },
    ];
    const out = await writeTsDeclaration({
      text: LIBRARY,
      fileName: 'fixtures/library.ts',
      locator: PROGRESSION_LIBRARY_DECLARATION,
      rules: TS_FILE_KINDS.progressions.rules,
      next,
    });
    expect(out.text).toBe(
      swap(
        LIBRARY,
        "    song: 'Dreams- Fleetwood Mac',\n  },\n];",
        `    song: 'Dreams- Fleetwood Mac',
  },

  {
    id: 3,
    progression: '1 minor',
    chords: ['1 minor'],
    song: '',
    songIds: ['africa'],
  },
];`,
      ),
    );
  });

  it('put the blank line after a record inserted at the very start', async () => {
    const read = readDeclaration(
      LIBRARY,
      'fixtures/library.ts',
      PROGRESSION_LIBRARY_DECLARATION,
    );
    const out = await writeTsDeclaration({
      text: LIBRARY,
      fileName: 'fixtures/library.ts',
      locator: PROGRESSION_LIBRARY_DECLARATION,
      rules: TS_FILE_KINDS.progressions.rules,
      next: [
        { id: 0, progression: '1 major', chords: ['1 major'], song: '' },
        ...(read.value as Body[]),
      ],
    });
    expect(out.text).toBe(
      swap(
        LIBRARY,
        'const CHORD_PROGRESSION_LIBRARY: ChordProgressionEntry[] = [\n',
        // Laid out like the record it now precedes, blank line and all.
        `const CHORD_PROGRESSION_LIBRARY: ChordProgressionEntry[] = [
  {
    id: 0,
    progression: '1 major',
    chords: ['1 major'],
    song: '',
  },

`,
      ),
    );
  });

  it('treat keys named like Object.prototype members as ordinary keys', async () => {
    const out = await editEvents((events) => {
      Object.assign(events[2], {
        constructor: 'a key like any other',
        toString: 'another',
      });
    });
    expect(out.text).toBe(
      swap(
        EVENTS,
        "    tags: ['miles davis'],\n",
        "    tags: ['miles davis'],\n    constructor: 'a key like any other',\n    toString: 'another',\n",
      ),
    );
  });
});

describe('formatting', () => {
  it("prints new values in the repo's style: single quotes, bare keys, long lines broken", async () => {
    const out = await editSong((song) => {
      song.credits = [
        { name: "D'Angelo", role: 'vocals', 'odd-key': 1 },
        { name: 'A "quoted" name', role: 'producer', note: 'x'.repeat(60) },
      ];
    });
    expect(out.text).toContain(
      `  credits: [
    { name: "D'Angelo", role: 'vocals', 'odd-key': 1 },
    {
      name: 'A "quoted" name',
      role: 'producer',
      note: '${'x'.repeat(60)}',
    },
  ],
`,
    );
    expect(await isPrettierClean(out.text)).toBe(true);
  });

  it('spells an edited string with \\u escapes when the string it replaces was, so undoing it restores the bytes', async () => {
    const text = `export const CITIES = [
  {
    id: 'bogota',
    name: 'Bogot\\u00E1',
    description: 'Caf\\u00e9 \\u2014 cumbia',
  },
  { id: 'lima', name: 'Lima', description: 'Criolla — vals' },
];
`;
    expect(await isPrettierClean(text)).toBe(true);
    const write = (next: Json) =>
      writeTsDeclaration({
        text,
        fileName: FILE,
        locator: CITIES_DECLARATION,
        rules: TS_FILE_KINDS.cities.rules,
        next,
      });
    const original = readDeclaration(text, FILE, CITIES_DECLARATION)
      .value as Body[];
    expect(original[0].name).toBe('Bogotá');
    const edited = await write([
      { ...original[0], name: 'Bogotá D.C.', description: 'Café — salsa' },
      { ...original[1], description: 'Criolla — vals, marinera' },
    ]);
    // Upper-case hex where the file wrote upper case, lower where lower,
    // and literal characters where the string had no escapes.
    expect(edited.text).toContain("name: 'Bogot\\u00E1 D.C.'");
    expect(edited.text).toContain("description: 'Caf\\u00e9 \\u2014 salsa'");
    expect(edited.text).toContain("description: 'Criolla — vals, marinera'");
    const undone = await writeTsDeclaration({
      text: edited.text,
      fileName: FILE,
      locator: CITIES_DECLARATION,
      rules: TS_FILE_KINDS.cities.rules,
      next: original,
    });
    expect(undone.text).toBe(text);
  });

  it('uses the repo .prettierrc even for a scratch copy outside the repo', async () => {
    const scratch = join(tmpdir(), 'repo-content-scratch', 'song.ts');
    const read = readDeclaration(SONG, scratch, SONG_DECLARATION);
    const out = await writeTsDeclaration({
      text: SONG,
      fileName: scratch,
      locator: SONG_DECLARATION,
      rules: SONG_RULES,
      next: { ...(read.value as Body), composer: 'Prince' },
    });
    expect(out.text).toContain("  composer: 'Prince',\n");
    expect(out.text).not.toContain('"');
  });

  it('reports a file that was not prettier-clean before the edit, and cleans it', async () => {
    const messy = SONG.replace("title: '1999'", 'title:   "1999"');
    const onUnclean = vi.fn();
    const out = await writeTsDeclaration({
      text: messy,
      fileName: FILE,
      locator: SONG_DECLARATION,
      rules: SONG_RULES,
      next: {
        ...(readDeclaration(messy, FILE, SONG_DECLARATION).value as Body),
        tempo: 118,
      },
      onUnclean,
    });
    expect(onUnclean).toHaveBeenCalledWith(FILE);
    expect(out.wasClean).toBe(false);
    expect(out.text).toBe(swap(SONG, 'tempo: 120', 'tempo: 118'));
  });
});

describe('verifyRoundTrip', () => {
  it('returns the read-back declaration when the text holds the intended value', () => {
    const intended = readDeclaration(SONG, FILE, SONG_DECLARATION).value;
    const read = verifyRoundTrip(SONG, FILE, SONG_DECLARATION, intended);
    expect(read.name).toBe('_1999');
  });

  it('ignores key order and undefined in the intended value, as JSON does', () => {
    const intended = readDeclaration(SONG, FILE, SONG_DECLARATION)
      .value as Body;
    const reordered = Object.fromEntries(Object.entries(intended).reverse());
    expect(() =>
      verifyRoundTrip(SONG, FILE, SONG_DECLARATION, {
        ...reordered,
        year: undefined,
      }),
    ).not.toThrow();
  });

  it('refuses a text that does not hold it, naming the value and its line', () => {
    const intended = readDeclaration(SONG, FILE, SONG_DECLARATION)
      .value as Body;
    const expected = structuredClone(intended);
    expected.sections[0].bars[1].chords[0].beat = 3;
    let error: RepoUnwritableError | undefined;
    try {
      verifyRoundTrip(SONG, FILE, SONG_DECLARATION, expected);
    } catch (e) {
      error = e as RepoUnwritableError;
    }
    expect(error).toBeInstanceOf(RepoUnwritableError);
    expect(error?.reason).toMatch(
      /does not read back as intended at `sections\[0\]\.bars\[1\]\.chords\[0\]\.beat`/,
    );
    expect(error?.line).toBe(34);
  });

  it('refuses a text that no longer parses', () => {
    expect(() =>
      verifyRoundTrip(
        SONG.replace("title: '1999',", "title: '1999'"),
        FILE,
        SONG_DECLARATION,
        {},
      ),
    ).toThrow(/syntax error/);
  });

  it('refuses a text whose declaration went missing', () => {
    expect(() =>
      verifyRoundTrip(
        SONG.replace(': Song =', ' ='),
        FILE,
        SONG_DECLARATION,
        {},
      ),
    ).toThrow(/no declaration of a song/);
  });
});

describe('a new value JSON would change', () => {
  const lineOf = (text: string, line: string) =>
    text.split('\n').indexOf(line) + 1;

  it('is refused before anything is written, naming the value and the line that holds it now', async () => {
    const sparse: string[] = [];
    sparse[2] = 'rock';
    const cases: [(song: Body) => void, string, RegExp, number][] = [
      [
        (song) => (song.tempo = NaN),
        'tempo',
        /is NaN, which JSON would write as null/,
        lineOf(SONG, '  tempo: 120,'),
      ],
      [
        (song) => (song.tempo = Infinity),
        'tempo',
        /is Infinity/,
        lineOf(SONG, '  tempo: 120,'),
      ],
      [
        (song) => (song.genreTags = ['funk', undefined, 'rock']),
        'genreTags[1]',
        /is missing or undefined/,
        lineOf(SONG, "  genreTags: ['funk', 'pop', 'rock'],"),
      ],
      [
        (song) => (song.genreTags = sparse),
        'genreTags[0]',
        /is missing or undefined/,
        lineOf(SONG, "  genreTags: ['funk', 'pop', 'rock'],"),
      ],
      [
        (song) => (song.year = new Date(0)),
        'year',
        /is a Date, not a plain object/,
        lineOf(SONG, '  year: undefined,'),
      ],
      [
        (song) => (song.composer = new Date(0)),
        'composer',
        /is a Date/,
        lineOf(SONG, 'export const _1999: Song = {'),
      ],
    ];
    for (const [edit, path, reason, line] of cases) {
      const error = await refusal(editSong(edit));
      expect(error.reason).toMatch(
        new RegExp(
          `^the new value cannot be written: \`${path.replace(/[[\]]/g, '\\$&')}\` `,
        ),
      );
      expect(error.reason).toMatch(reason);
      expect({ path, line: error.line }).toEqual({ path, line });
    }
  });

  it('is refused in a record of a record array, naming the record', async () => {
    const error = await refusal(
      writeTsElements({
        text: EVENTS,
        fileName: 'fixtures/jazz.ts',
        ...TS_FILE_KINDS.events,
        upsert: [{ id: 'evt-new', year: NaN, title: 'x' }],
      }),
    );
    expect(error.reason).toMatch(
      /record 1 to write \(id "evt-new"\): `year` is NaN/,
    );
  });

  it('is refused for a new file, and by the round-trip check', async () => {
    const error = await refusal(
      newDeclarationFile({
        fileName: 'src/curriculum/data/songs/x.ts',
        header: "import type { Song } from '@/curriculum/types/songLibrary';",
        name: 'x',
        type: 'Song',
        value: { id: 'x', tempo: NaN },
        locator: SONG_DECLARATION,
      }),
    );
    expect(error.reason).toMatch(/`tempo` is NaN/);
    const intended = readDeclaration(SONG, FILE, SONG_DECLARATION)
      .value as Body;
    expect(() =>
      verifyRoundTrip(SONG, FILE, SONG_DECLARATION, {
        ...intended,
        popularity: NaN,
      }),
    ).toThrow(/`popularity` is NaN/);
  });
});

describe('new files', () => {
  it("names a song's export after its id, prefixed when the id starts with a digit", () => {
    expect(songIdentifier('1999')).toBe('_1999');
    expect(songIdentifier('24k_magic')).toBe('_24k_magic');
    expect(songIdentifier('a_go_go')).toBe('a_go_go');
  });

  it('prefixes an id no module can declare, and leaves contextual keywords alone', () => {
    for (const id of ['static', 'true', 'if', 'await', 'eval', 'let']) {
      expect(songIdentifier(id)).toBe(`_${id}`);
    }
    for (const id of ['type', 'of', 'get', 'from', 'undefined']) {
      expect(songIdentifier(id)).toBe(id);
    }
  });

  it('gives every keyword-named song a name a module can declare and bundled.ts can import', () => {
    const ids = new Set<string>([...RESERVED_BINDING_NAMES, '1999', 'a_go_go']);
    for (
      let kind = ts.SyntaxKind.FirstKeyword;
      kind <= ts.SyntaxKind.LastKeyword;
      kind++
    ) {
      const text = ts.tokenToString(kind);
      if (text && /^[a-z]+$/.test(text)) ids.add(text);
    }
    const files: Record<string, string> = {};
    for (const id of ids) {
      files[`/songs/${id}.ts`] =
        `export const ${songIdentifier(id)}: { id: string } = { id: '${id}' };\n`;
    }
    const key = (id: string) => (/^[a-z_]\w*$/.test(id) ? id : `'${id}'`);
    files['/songs/bundled.ts'] = [
      ...[...ids].map(
        (id) => `import { ${songIdentifier(id)} } from './${id}';`,
      ),
      '',
      'export const BUNDLED_SONGS = {',
      ...[...ids].map((id) => `  ${key(id)}: ${songIdentifier(id)},`),
      '};',
      '',
    ].join('\n');
    expect(moduleErrors(files)).toEqual([]);
  });

  it('writes a song called "Static" or "True" as `_static` or `_true`, and refuses the bare word', async () => {
    for (const id of ['static', 'true']) {
      const text = await newDeclarationFile({
        fileName: `src/curriculum/data/songs/${id}.ts`,
        header: "import type { Song } from '@/curriculum/types/songLibrary';",
        name: songIdentifier(id),
        type: 'Song',
        value: { id, title: id },
        locator: SONG_DECLARATION,
        keyOrder: SONG_KEY_ORDER,
      });
      expect(text).toContain(`export const _${id}: Song = {`);
      expect(moduleErrors({ [`/${id}.ts`]: text }, [2307])).toEqual([]);
      const bare = await refusal(
        newDeclarationFile({
          fileName: `src/curriculum/data/songs/${id}.ts`,
          header: "import type { Song } from '@/curriculum/types/songLibrary';",
          name: id,
          type: 'Song',
          value: { id, title: id },
          locator: SONG_DECLARATION,
        }),
      );
      expect(bare.reason).toMatch(/cannot name a declaration in a module/);
    }
  });

  it('writes a new song file with its keys in the song order, and reads it back', async () => {
    const body: Json = {
      popularity: 10,
      sections: [],
      id: '2112',
      artistImageSource: 'manual',
      title: '2112',
      audioSources: [],
      artist: 'Rush',
      year: 1976,
    };
    const text = await newDeclarationFile({
      fileName: 'src/curriculum/data/songs/2112.ts',
      header: "import type { Song } from '@/curriculum/types/songLibrary';",
      name: songIdentifier('2112'),
      type: 'Song',
      value: body,
      locator: SONG_DECLARATION,
      keyOrder: SONG_KEY_ORDER,
    });
    expect(text)
      .toBe(`import type { Song } from '@/curriculum/types/songLibrary';

export const _2112: Song = {
  id: '2112',
  title: '2112',
  artist: 'Rush',
  year: 1976,
  sections: [],
  audioSources: [],
  artistImageSource: 'manual',
  popularity: 10,
};
`);
    expect(readDeclaration(text, 'x.ts', SONG_DECLARATION).value).toEqual(body);
  });

  it('orders known keys first, the rest after in their own order', () => {
    expect(
      Object.keys(
        orderKeys(
          { z: 1, title: 'a', id: 'b', y: 2 },
          SONG_KEY_ORDER,
        ) as object,
      ),
    ).toEqual(['id', 'title', 'z', 'y']);
  });
});

describe('applySplices', () => {
  it('applies from the end back, with insertions and cuts at the same place', () => {
    expect(
      applySplices('abcdef', [
        { start: 1, end: 1, text: 'X' },
        { start: 1, end: 3, text: '' },
        { start: 5, end: 6, text: 'Z' },
      ]),
    ).toBe('aXdeZ');
  });

  it('refuses overlapping splices', () => {
    expect(() =>
      applySplices('abcdef', [
        { start: 1, end: 4, text: '' },
        { start: 3, end: 5, text: '' },
      ]),
    ).toThrow(/overlapping/);
  });
});
