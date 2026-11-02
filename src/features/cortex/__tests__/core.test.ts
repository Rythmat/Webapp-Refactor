// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { Song } from '@/curriculum/types/songLibrary';
import { backfillRecords } from '../backfill';
import { buildWeb, SEED_BELOW, type WebActivity } from '../buildWeb';
import { cortexIdForLesson, genreLessonId, theoryId } from '../ids';
import { placeLabels } from '../labels';
import { fitCentre, fitView, layoutIsCurrent, layoutWeb } from '../layout';
import { activityForLocation } from '../routeTable';
import {
  keyConcept,
  modeConcept,
  songConcepts,
  type ConceptRef,
} from '../songConcepts';

const at = (pathname: string, search = '') =>
  activityForLocation(pathname, search);

describe('which activity an address is', () => {
  it('reads songs, and not the set lists beside them', () => {
    expect(at('/songs/africa')).toBe('song:africa');
    expect(at('/songs')).toBeNull();
    expect(at('/songs/setlists')).toBeNull();
    expect(at('/songs/setlists/abc')).toBeNull();
  });

  it('reads Theory lessons on every instrument, keeping the accidental', () => {
    expect(at('/learn/keyboard/dorian/dflat')).toBe(
      'theory:piano.dorian.d-flat',
    );
    expect(at('/learn/guitar/lydian/fsharp')).toBe(
      'theory:guitar.lydian.f-sharp',
    );
    expect(at('/learn/bass/dorian/c')).toBe('theory:bass.dorian.c');
    expect(at('/learn/ukulele/ionian/g')).toBe('theory:ukulele.ionian.g');
  });

  it('never takes a page of Learn for a lesson', () => {
    for (const path of [
      '/learn',
      '/learn/keyboard',
      '/learn/keyboard/dorian',
      '/learn/keyboard/songs',
      '/learn/keyboard/genre',
      '/learn/keyboard/genre/pop',
      '/learn/keyboard/relative/c',
      '/learn/keyboard/parallel/c',
      '/learn/keyboard/start-here/x',
      '/learn/keyboard/world-harmony/x',
      '/learn/guitar/relative/c',
      '/learn/audio',
    ]) {
      expect(at(path), path).toBeNull();
    }
  });

  it('reads genre levels, Audio, Anatomy and Technique', () => {
    expect(at('/learn/keyboard/genre/hip-hop/1')).toBe('lesson:hiphop-l1');
    expect(at('/learn/audio/hearing/pitch')).toBe('audio:hearing.pitch');
    expect(at('/learn/audio/anatomy/piano')).toBe('anatomy:piano');
    expect(at('/learn/guitar/technique/harmonics')).toBe('technique:harmonics');
    expect(at('/learn/keyboard/technique/linus-and-lucy')).toBe(
      'technique:linus-and-lucy',
    );
  });

  it('folds a course’s pages to one node', () => {
    expect(at('/curriculum/piano-fundamentals')).toBe(
      'technique:piano-fundamentals',
    );
    expect(at('/curriculum/piano-fundamentals/x')).toBe(
      'technique:piano-fundamentals',
    );
    expect(at('/curriculum/applied-theory-fundamentals/c')).toBe(
      'technique:applied-theory',
    );
    expect(at('/curriculum/guitar/applied-theory-fundamentals/c')).toBe(
      'technique:guitar-applied-theory',
    );
    expect(at('/curriculum/music-literacy/music-literacy-part-1')).toBe(
      'literacy:music-literacy-part-1',
    );
    expect(at('/curriculum/music-literacy')).toBeNull();
  });

  it('reads the arcade from its routes, with every jam address one game', () => {
    expect(at('/arcade/chroma')).toBe('game:chroma');
    expect(at('/arcade/major-arcanum')).toBe('game:majorArcanum');
    expect(at('/arcade/jam')).toBe('game:jamLobby');
    expect(at('/arcade/jam/room-1')).toBe('game:jamLobby');
    expect(at('/arcade')).toBeNull();
  });

  it('reads the Studio and the Globe from their query', () => {
    expect(at('/studio', '?project=p1')).toBe('project:p1');
    expect(at('/studio', '?tutorial=make-first-track')).toBe(
      'tutorial:make-first-track',
    );
    expect(at('/studio')).toBeNull();
    expect(at('/studio/production')).toBeNull();
    expect(at('/globe', '?artist=Hall%20%26%20Oates')).toBe(
      'artist:hall-and-oates',
    );
    expect(at('/globe', '?place=city:detroit')).toBe('place:detroit');
    expect(at('/globe', '?event=evt-1')).toBe('event:evt-1');
    expect(at('/globe', '?event=song-africa')).toBe('song:africa');
    expect(at('/globe')).toBeNull();
  });

  it('leaves a guided Globe tour out: its stops aren’t the student’s', () => {
    expect(at('/globe', '?tour=t1&artist=Toto')).toBeNull();
    expect(at('/globe', '?pathway=p1&event=evt-1')).toBeNull();
  });

  it('ignores the rest of the app, the console’s mirror included', () => {
    expect(at('/')).toBeNull();
    expect(at('/console/content/learn/keyboard/dorian/c')).toBeNull();
  });
});

describe('progress ids as Cortex ids', () => {
  it('converts each kind of lesson id', () => {
    expect(cortexIdForLesson('mode-lesson-flow__dflat__dorian')).toBe(
      'theory:piano.dorian.d-flat',
    );
    expect(cortexIdForLesson('audio:hearing:pitch')).toBe(
      'audio:hearing.pitch',
    );
    expect(cortexIdForLesson('curriculum:JAZZ:L2')).toBe('lesson:jazz-l2');
    expect(cortexIdForLesson('curriculum:HIP HOP:L1')).toBe('lesson:hiphop-l1');
    expect(cortexIdForLesson('curriculum:R&B:L1')).toBe('lesson:rnb-l1');
    expect(cortexIdForLesson('slides:deck')).toBeNull();
    expect(cortexIdForLesson('mode-lesson-flow')).toBeNull();
  });

  it('gives the genre route and the old rows one id', () => {
    expect(genreLessonId('rnb', '1')).toBe(
      cortexIdForLesson('curriculum:R&B:L1'),
    );
    expect(genreLessonId('neo-soul', '2')).toBe(
      cortexIdForLesson('curriculum:NEO SOUL:L2'),
    );
    expect(theoryId('piano', 'Dorian', 'c')).toBe('theory:piano.dorian.c');
  });
});

const genre = (tag: string): ConceptRef => ({
  id: `genre:${tag}`,
  kind: 'genre',
  label: tag,
});

const song = (over: Partial<Song>): Song =>
  ({
    id: 's',
    title: 'S',
    artist: 'A',
    key: 'C',
    mode: 'major',
    genreTags: [],
    ...over,
  }) as Song;

describe('what a song shares', () => {
  it('keeps the billed artist even with no primary credit', () => {
    const ids = songConcepts(song({ artist: 'Talking Heads' }), genre).map(
      (c) => c.id,
    );
    expect(ids).toContain('artist:talking-heads');
  });

  it('keeps linked producers and writers, and no other credit', () => {
    const ids = songConcepts(
      song({
        credits: [
          { name: 'Brian Eno', role: 'producer', artistGlobeId: 'brian-eno' },
          { name: 'Writer', role: 'songwriter', artistGlobeId: 'writer' },
          { name: 'Unlinked', role: 'producer' },
          {
            name: 'Guess',
            role: 'producer',
            artistGlobeId: 'guess',
            unverified: true,
          },
          { name: 'Engineer', role: 'engineer', artistGlobeId: 'engineer' },
          {
            name: 'Sideman',
            role: 'performer',
            artistGlobeId: 'sideman',
            instrument: 'drums',
          },
        ],
      }),
      genre,
    ).map((c) => c.id);
    expect(ids).toEqual(
      expect.arrayContaining(['artist:brian-eno', 'artist:writer']),
    );
    for (const id of [
      'artist:unlinked',
      'artist:guess',
      'artist:engineer',
      'artist:sideman',
    ])
      expect(ids).not.toContain(id);
  });

  it('speaks the lessons’ mode names, and only modal modes stand alone', () => {
    const major = songConcepts(song({ mode: 'major' }), genre);
    expect(major.find((c) => c.id === 'mode:ionian')?.needsTheory).toBe(true);
    const minor = songConcepts(song({ mode: 'minor' }), genre);
    expect(minor.find((c) => c.id === 'mode:aeolian')?.needsTheory).toBe(true);
    const dorian = songConcepts(song({ mode: 'dorian' }), genre);
    expect(dorian.find((c) => c.id === 'mode:dorian')?.needsTheory).toBe(false);
  });

  it('reads the tonic with its accidental', () => {
    const ids = songConcepts(song({ key: 'E♭ major' }), genre).map((c) => c.id);
    expect(ids).toContain('key:e-flat');
  });
});

const activity = (
  id: string,
  concepts: readonly ConceptRef[],
  over: Partial<WebActivity> = {},
): WebActivity => ({
  id,
  kind: (id.split(':')[0] as WebActivity['kind']) ?? 'song',
  label: id,
  done: false,
  lastAt: 0,
  doneAt: 0,
  concepts,
  ...over,
});

const funk = genre('funk');
const concepts = (web: ReturnType<typeof buildWeb>) =>
  web.nodes.filter((n) => n.role === 'concept' && !n.hollow).map((n) => n.id);

describe('the web', () => {
  it('shows a concept once two activities share it, and not before', () => {
    const one = buildWeb([activity('song:a', [funk])]);
    expect(concepts(one)).toEqual([]);
    expect(one.connectionCount).toBe(0);
    const two = buildWeb([
      activity('song:a', [funk]),
      activity('song:b', [funk]),
    ]);
    expect(concepts(two)).toEqual(['genre:funk']);
    expect(two.connectionCount).toBe(2);
    expect(two.links.map((l) => l.target)).toEqual([
      'genre:funk',
      'genre:funk',
    ]);
  });

  it('seeds a hollow concept beside a lone activity while the map is young', () => {
    const web = buildWeb([activity('song:a', [funk])]);
    expect(web.nodes.find((n) => n.id === 'genre:funk')?.hollow).toBe(true);
    expect(web.links[0].hollow).toBe(true);
  });

  it('prefers the seed most likely to meet another activity', () => {
    const web = buildWeb([
      activity('song:a', [
        { id: 'release:x', kind: 'release', label: 'X' },
        { id: 'artist:y', kind: 'artist', label: 'Y' },
        funk,
      ]),
    ]);
    expect(web.nodes.find((n) => n.hollow)?.id).toBe('genre:funk');
  });

  it('stops seeding once the map has grown', () => {
    const many = Array.from({ length: SEED_BELOW }, (_, i) =>
      activity(`song:${i}`, [
        { id: `genre:${i}`, kind: 'genre', label: `${i}` },
      ]),
    );
    expect(buildWeb(many).nodes.filter((n) => n.hollow)).toEqual([]);
    expect(buildWeb(many.slice(1)).nodes.filter((n) => n.hollow)).toHaveLength(
      SEED_BELOW - 1,
    );
  });

  it('keeps key and major out until a Theory lesson meets them', () => {
    const c = keyConcept('c');
    const ionian = modeConcept('ionian');
    const songs = [
      activity('song:a', [c, ionian]),
      activity('song:b', [c, ionian]),
    ];
    expect(concepts(buildWeb(songs))).toEqual([]);
    const withLesson = buildWeb([
      ...songs,
      activity('theory:piano.ionian.c', [c, ionian]),
    ]);
    expect(concepts(withLesson).length).toBeGreaterThan(0);
  });

  it('lets a modal mode connect songs on its own', () => {
    const dorian = modeConcept('dorian');
    const web = buildWeb([
      activity('song:a', [dorian]),
      activity('song:b', [dorian]),
    ]);
    expect(concepts(web)).toEqual(['mode:dorian']);
  });

  it('shows only the most specific of concepts with the same members', () => {
    const record = { id: 'release:r', kind: 'release', label: 'R' } as const;
    const artist = { id: 'artist:a', kind: 'artist', label: 'A' } as const;
    const web = buildWeb([
      activity('song:a', [record, artist, funk]),
      activity('song:b', [record, artist, funk]),
    ]);
    expect(concepts(web)).toEqual(['release:r']);
  });

  it('keeps a broader concept when it reaches further', () => {
    const record = { id: 'release:r', kind: 'release', label: 'R' } as const;
    const web = buildWeb([
      activity('song:a', [record, funk]),
      activity('song:b', [record, funk]),
      activity('song:c', [funk]),
    ]);
    expect(concepts(web).sort()).toEqual(['genre:funk', 'release:r']);
  });

  it('makes a visited artist one node, both activity and concept', () => {
    const toto = { id: 'artist:toto', kind: 'artist', label: 'Toto' } as const;
    const web = buildWeb([
      activity('artist:toto', [toto]),
      activity('song:africa', [toto]),
    ]);
    expect(web.nodes.filter((n) => n.id === 'artist:toto')).toHaveLength(1);
    expect(web.nodes.find((n) => n.id === 'artist:toto')?.role).toBe(
      'activity',
    );
    expect(web.links.map((l) => l.id)).toEqual(['song:africa|artist:toto']);
    expect(web.links.some((l) => l.source === l.target)).toBe(false);
  });
});

describe('what the account already knows', () => {
  const lesson = (over: object) =>
    ({
      lessonId: 'x',
      lessonVersion: 2,
      currentActivityInstanceId: null,
      completedCount: 1,
      totalCount: 3,
      updatedAt: '2026-01-01T00:00:00.000Z',
      ...over,
    }) as never;

  it('reads Theory rows from their columns or their id', () => {
    const out = backfillRecords({
      lessons: [
        lesson({ lessonId: 'mode-lesson-flow', mode: 'dorian', root: 'D' }),
        lesson({ lessonId: 'mode-lesson-flow__eflat__lydian' }),
      ],
    });
    expect(Object.keys(out).sort()).toEqual([
      'theory:piano.dorian.d',
      'theory:piano.lydian.e-flat',
    ]);
  });

  it('is bright only when the lesson is finished, and skips what wasn’t begun', () => {
    const out = backfillRecords({
      lessons: [
        lesson({ lessonId: 'audio:m:one', completedCount: 3, totalCount: 3 }),
        lesson({ lessonId: 'audio:m:two', completedCount: 1, totalCount: 3 }),
        lesson({ lessonId: 'audio:m:three', completedCount: 0, totalCount: 3 }),
        lesson({ lessonId: 'slides:deck' }),
      ],
    });
    expect(out['audio:m.one'][2]).toBeGreaterThan(0);
    expect(out['audio:m.two'][2]).toBe(0);
    expect(out['audio:m.three']).toBeUndefined();
    expect(Object.keys(out)).toHaveLength(2);
  });

  it('counts a game only past its starting point', () => {
    const out = backfillRecords({
      options: {
        signalFlow: { progress: { cleared: ['a'] } },
        majorArcanum: { progress: { cleared: [] } },
        grooveLab: { progress: { open: { grid: 1, pads: 1 } } },
        foli: { progress: { two: 1, four: 0 }, bindings: {} },
      },
    });
    expect(Object.keys(out)).toEqual(['game:signalFlow']);
  });

  it('finds set-list songs and starts them bright', () => {
    const out = backfillRecords({
      options: {
        setlists: {
          setLists: {
            a: {
              entries: [{ songId: 'africa', createdAt: 1_700_000_000_000 }],
            },
          },
        },
      },
    });
    expect(out['song:africa'][2]).toBeGreaterThan(0);
  });

  it('never touches a source that isn’t on the account', () => {
    localStorage.setItem(
      'music-atlas-viewed-songs',
      JSON.stringify({ state: { viewedAt: { africa: 1 } } }),
    );
    expect(backfillRecords({})).toEqual({});
    localStorage.removeItem('music-atlas-viewed-songs');
  });
});

describe('the layout', () => {
  const web = buildWeb([
    activity('song:a', [funk]),
    activity('song:b', [funk]),
    activity('song:c', [funk]),
  ]);

  it('draws one web the same way every time, whatever order it came in', () => {
    const reordered = buildWeb([
      activity('song:c', [funk]),
      activity('song:a', [funk]),
      activity('song:b', [funk]),
    ]);
    expect(layoutWeb(web)).toEqual(layoutWeb(reordered));
  });

  it('moves nothing when nothing is new', () => {
    const saved = layoutWeb(web);
    expect(layoutIsCurrent(web, saved)).toBe(true);
    expect(layoutWeb(web, saved)).toBe(saved);
  });

  it('keeps old nodes close when a new one arrives', () => {
    const saved = layoutWeb(web);
    const grown = buildWeb([
      activity('song:a', [funk]),
      activity('song:b', [funk]),
      activity('song:c', [funk]),
      activity('song:d', [funk]),
    ]);
    const next = layoutWeb(grown, saved);
    expect(next['song:d']).toBeDefined();
    for (const id of ['song:a', 'song:b', 'song:c']) {
      const moved = Math.hypot(
        next[id].x - saved[id].x,
        next[id].y - saved[id].y,
      );
      expect(moved, id).toBeLessThan(60);
    }
  });

  it('holds the middle open for the core, which is never on the web', () => {
    const big = buildWeb(
      Array.from({ length: 40 }, (_, i) =>
        activity(`song:${i}`, i % 2 ? [funk] : []),
      ),
    );
    const placed = layoutWeb(big);
    expect(Object.keys(placed).sort()).toEqual(
      big.nodes.map((n) => n.id).sort(),
    );
    for (const [id, p] of Object.entries(placed)) {
      expect(Math.hypot(p.x, p.y), id).toBeGreaterThan(50);
    }
    expect(layoutIsCurrent(big, placed)).toBe(true);
  });

  it('keeps a chosen point at the middle of the box', () => {
    const lopsided = { a: { x: 10, y: 0 }, b: { x: 300, y: 40 } };
    const view = fitView(lopsided, 800, 400, { x: 0, y: 0 });
    const centre = fitCentre(800, 400);
    expect(view.x).toBeCloseTo(centre.x);
    expect(view.y).toBeCloseTo(centre.y);
    // Everything still fits, measured out from that point.
    expect(view.x + 300 * view.k).toBeLessThanOrEqual(800);
    expect(view.k).toBeLessThanOrEqual(1.15);
  });

  it('fits the web in its box, without blowing up a small one', () => {
    const view = fitView({ a: { x: 0, y: 0 }, b: { x: 10, y: 0 } }, 800, 400);
    expect(view.k).toBeLessThanOrEqual(1.15);
    expect(view.x + 5 * view.k).toBeCloseTo(400);
  });
});

describe('the names', () => {
  const nodes = buildWeb([
    activity('song:a', [funk]),
    activity('song:b', [funk]),
  ]).nodes;
  const degrees = new Map([['genre:funk', 2]]);
  const view = { x: 0, y: 0, k: 1 };

  it('leaves out a name with nowhere to go', () => {
    const positions = {
      'song:a': { x: 30, y: 8 },
      'song:b': { x: 30, y: 8 },
      'genre:funk': { x: 300, y: 8 },
    };
    const placed = placeLabels(nodes, positions, degrees, view, 600, 16);
    expect(placed.filter((l) => l.id.startsWith('song:')).length).toBeLessThan(
      2,
    );
  });

  it('names what’s hovered even where there’s no room, and only that', () => {
    const crowded = buildWeb([
      activity('song:a', [funk]),
      activity('song:b', [funk]),
      activity('song:c', [funk]),
    ]).nodes;
    const positions = {
      'song:a': { x: 10, y: 8 },
      'song:b': { x: 10, y: 8 },
      'song:c': { x: 10, y: 8 },
      'genre:funk': { x: 10, y: 8 },
    };
    const lit = new Set(['song:a', 'song:b', 'song:c']);
    const ids = (forced: string | null) =>
      placeLabels(crowded, positions, degrees, view, 30, 16, lit, forced).map(
        (l) => l.id,
      );
    expect(ids(null)).toEqual([]);
    expect(ids('song:b')).toEqual(['song:b']);
  });

  it('tries beside the dot before giving a name up', () => {
    const positions = {
      'song:a': { x: 100, y: 100 },
      'song:b': { x: 102, y: 100 },
      'genre:funk': { x: 300, y: 100 },
    };
    const placed = placeLabels(nodes, positions, degrees, view, 600, 400);
    expect(placed.filter((l) => l.id.startsWith('song:'))).toHaveLength(2);
    const [a, b] = placed.filter((l) => l.id.startsWith('song:'));
    expect(Math.abs(a.y - b.y)).toBeGreaterThanOrEqual(16);
  });

  it('keeps names inside the box, and skips what’s out of view', () => {
    const positions = {
      'song:a': { x: 2, y: 100 },
      'song:b': { x: 900, y: 100 },
      'genre:funk': { x: 300, y: 100 },
    };
    const placed = placeLabels(nodes, positions, degrees, view, 600, 400);
    expect(placed.find((l) => l.id === 'song:b')).toBeUndefined();
    expect(placed.find((l) => l.id === 'song:a')!.x).toBeGreaterThan(2);
  });
});
