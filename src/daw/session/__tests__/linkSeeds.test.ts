// @vitest-environment jsdom
/**
 * Every editor link opens its project as a new one (linkSeeds.ts and the
 * seeds it runs): nothing of the project open before carries into it, and
 * the project as it opened is the baseline.
 *
 * Each path runs twice, as the editor's boot runs it (inside replaceSession):
 * once on a fresh page, and once over a project that left a sentinel in every
 * store key (projectLeftBehind.ts). With randomness made repeatable, every
 * key a new project starts over with (the registry's resetOnNew keys) must
 * come out exactly as on the fresh page: a key lock, a loop, a metre, a
 * Score mark, a lesson or a selected track the last project left would show
 * as a difference. Every other key (the student's prefs, the collaboration
 * room, devices, the clipboard, panel layout) must come out exactly as the
 * project before left it. A spy can't see the calls a module makes to its own
 * exports, so the test looks at what the store holds instead.
 *
 * Audit: state-reload-16, ia-flows-06, score-03, insight-05, prism-ui-03,
 * state-reload-15 (the seeds' part).
 *
 * Run: npx vitest run src/daw/session/__tests__/linkSeeds.test.ts
 */
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { funkL2 } from '@/curriculum/data/activityFlows/funk_v2';
import type { Song, SongMode } from '@/curriculum/types/songLibrary';
import { getDemoProject } from '@/daw/data/demoProjects';
import {
  loadJamSession,
  saveJamSession,
  type JamSession,
} from '@/daw/jam-import/jamSession';
import { getTrackSynthState } from '@/daw/oracle-synth/synthTrackState';
import { forgetLiveSession } from '@/daw/persistence/SessionSerializer';
import {
  RESET_ON_NEW_KEYS,
  fieldDefault,
  type StoreDataKey,
} from '@/daw/persistence/projectDocument/fields';
import {
  leaveAProjectBehind,
  same,
  storeData,
} from '@/daw/persistence/projectDocument/__tests__/projectLeftBehind';
import {
  hasWorkToKeep,
  isDocumentDirty,
  useSaveStatusStore,
} from '@/daw/persistence/saveStatusStore';
import { useStore } from '@/daw/store';
import {
  canUndo,
  initUndoTracking,
  resetUndoHistory,
} from '@/daw/store/undoMiddleware';
import {
  generatePracticeTrack,
  type PracticeTrackResult,
} from '@/features/practiceTracks/generatePracticeTrack';
import { buildGenrePracticeTrack } from '@/features/practiceTracks/genre/buildGenrePracticeTrack';
import type { ResolvedPracticeTrack } from '@/features/practiceTracks/genre/openGenrePracticeTrack';
import { seedStudioFromSong } from '@/features/songs/seedStudioFromSong';
import { replaceSession } from '@/lib/studio-projects/localSession';
import { getSessionGeneration } from '../sessionGeneration';
import {
  seedDemo,
  seedGenrePractice,
  seedJam,
  seedTemplate,
  seedTheoryPractice,
  seedTutorial,
  type TheoryPracticeLink,
} from '../linkSeeds';

// The Theory Practice Track's groove is a fetched .mid: a fixed two-hit
// pattern stands in, and the demos' drums never arrive in these tests.
vi.mock('@/daw/midi/loadGrooveEvents', () => ({
  loadGrooveEvents: vi.fn(async () => [
    { note: 36, velocity: 100, startTick: 0, durationTicks: 120, channel: 9 },
    { note: 38, velocity: 100, startTick: 960, durationTicks: 120, channel: 9 },
  ]),
}));

const s = () => useStore.getState();
/** Long enough for undo's debounced auto-capture to have run. */
const settle = () => vi.advanceTimersByTime(1000);

// ── Repeatable randomness ──────────────────────────────────────────────────
//
// Track, clip and chord ids, note ids and a template's rhythm are random. The
// same sequence on both runs of a path gives both the same ids, so the
// projects can be compared whole.

let seed = 1;
function nextRandom(): number {
  // xorshift32: a long period, so ids never repeat within a test.
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return seed >>> 0;
}
let uuids = 0;
function restartRandomness(): void {
  seed = 0x2545f491;
  uuids = 0;
}

beforeEach(() => {
  restartRandomness();
  vi.spyOn(crypto, 'randomUUID').mockImplementation(
    () =>
      `00000000-0000-4000-8000-${(++uuids).toString(16).padStart(12, '0')}` as ReturnType<
        typeof crypto.randomUUID
      >,
  );
  vi.spyOn(crypto, 'getRandomValues').mockImplementation(
    <T extends ArrayBufferView | null>(array: T): T => {
      if (array === null) return array;
      const bytes = new Uint8Array(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      for (let i = 0; i < bytes.length; i++) bytes[i] = nextRandom() & 0xff;
      return array;
    },
  );
  vi.spyOn(Math, 'random').mockImplementation(() => nextRandom() / 2 ** 32);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── The links ──────────────────────────────────────────────────────────────

const SONG = {
  id: 'link-song',
  title: 'Link Song',
  artist: 'Link Artist',
  key: 'G major',
  keyRoot: 67,
  mode: 'major' as SongMode,
  tempo: 104,
  timeSignature: [3, 4],
  difficulty: 1,
  genreTags: [],
  techniques: [],
  sections: [
    {
      id: 's0',
      label: 'Verse',
      bars: ['G', 'C', 'D', 'G'].map((chordName) => ({
        chords: [{ degree: '1 maj', chordName, beat: 1, duration: 3 }],
      })),
    },
  ],
  audioSources: [],
  artistImageSource: 'none',
} as unknown as Song;

const THEORY_LINK: TheoryPracticeLink = {
  kind: 'practiceMode',
  mode: 'dorian',
  rootParam: 'd',
  openTrack: 'melody',
  level: 2,
};

/** A recorded jam at 96 BPM: two players on piano, one on the drums. */
const JAM: JamSession = {
  version: 1,
  roomId: 'room-1',
  recordedAt: 1,
  bpm: 96,
  localUserId: 'u-a',
  participants: [
    { userId: 'u-a', userName: 'Ada', color: '#ff0000' },
    { userId: 'u-b', userName: 'Bo', color: '#00ff00' },
  ],
  notes: [
    {
      userId: 'u-a',
      color: '#ff0000',
      instrument: 'piano',
      gmProgram: 0,
      midi: 60,
      velocity: 90,
      startMs: 0,
      endMs: 600,
    },
    {
      userId: 'u-b',
      color: '#00ff00',
      instrument: 'piano',
      gmProgram: 33,
      midi: 40,
      velocity: 100,
      startMs: 625,
      endMs: 1250,
    },
    {
      userId: 'u-a',
      color: '#ff0000',
      instrument: 'drums',
      gmProgram: 0,
      midi: 36,
      velocity: 110,
      startMs: 0,
      endMs: 100,
    },
  ],
};

// Built once, before any run: the generators are random, and a link opens
// what was built (the genre track arrives built through its hand-off box).
let theoryPractice: PracticeTrackResult;
let genrePractice: ResolvedPracticeTrack;

interface LinkPath {
  name: string;
  /** What the link runs inside replaceSession. */
  open: () => void;
  /** Whether the link can open the same project again. */
  reopenable: boolean;
  /** A hand-off the link reads, left again before each run. */
  handOff?: () => void;
}

const demo = (id: string): LinkPath => ({
  name: `demo ${id}`,
  open: () => seedDemo(getDemoProject(id)!),
  reopenable: true,
});

const PATHS: LinkPath[] = [
  { name: 'new project', open: () => {}, reopenable: true },
  {
    name: 'template',
    open: () => seedTemplate('project-pop'),
    reopenable: true,
  },
  demo('demo-sunset-keys'),
  demo('demo-midnight-groove'),
  demo('demo-first-light'),
  {
    name: 'lesson',
    open: () => seedTutorial('make-first-track'),
    reopenable: true,
  },
  { name: 'song', open: () => seedStudioFromSong(SONG), reopenable: true },
  {
    name: 'Theory practice track',
    open: () =>
      seedTheoryPractice(structuredClone(theoryPractice), THEORY_LINK),
    reopenable: true,
  },
  {
    name: 'genre practice track',
    open: () => seedGenrePractice(structuredClone(genrePractice)),
    reopenable: true,
  },
  {
    name: 'jam',
    open: seedJam,
    reopenable: false,
    handOff: () => saveJamSession(JAM),
  },
];

// ── Running a path ─────────────────────────────────────────────────────────

/** A fresh page's store: no project, no live session, nothing to undo. */
function freshPage(): void {
  useStore.setState(useStore.getInitialState(), true);
  forgetLiveSession();
  resetUndoHistory();
  localStorage.clear();
}

/** Open `path` as the editor's boot does: inside replaceSession. */
async function follow(path: LinkPath): Promise<Record<string, unknown>> {
  path.handOff?.();
  restartRandomness();
  const outcome = await replaceSession('student', path.open, {
    reopenable: path.reopenable,
  });
  expect(outcome.status).toBe('opened');
  settle();
  return storeData();
}

/**
 * Leave a project behind (projectLeftBehind.ts), as its host: every key off
 * its default. A collaborator who isn't the host can't rename the room's
 * project (setProjectName), and leaving a room before a link opens is
 * milestone 1.4's, so here the room is the student's own.
 */
function leaveTheProjectBehind(): Record<string, unknown> {
  const keys = Object.keys(storeData()).filter((key) => key !== 'collabRole');
  leaveAProjectBehind(keys);
  useStore.setState({ collabRole: 'owner' });
  return storeData();
}

/** The keys among `keys` whose values differ between two stores. */
function differing(
  keys: readonly string[],
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): string[] {
  return keys.filter((key) => !same(a[key], b[key]));
}

const RESET_KEYS = RESET_ON_NEW_KEYS as readonly string[];

beforeAll(async () => {
  initUndoTracking();
  theoryPractice = await generatePracticeTrack('dorian', 2, 'melody', 2);
  genrePractice = {
    track: buildGenrePracticeTrack(funkL2, 'A')!,
    genreLabel: 'Funk',
    returnTo: '/curriculum/funk/2?section=A',
  };
});

beforeEach(() => {
  vi.useFakeTimers();
  freshPage();
});

afterEach(() => {
  vi.useRealTimers();
});

describe.each(PATHS)('the $name link', (path) => {
  it('opens the same project over any other as on a fresh page', async () => {
    const fresh = await follow(path);

    freshPage();
    const before = leaveTheProjectBehind();
    // Every reset key the link leaves at its default really was off it, or
    // the check below would prove nothing. (A key the link sets itself, such
    // as a practice track's loop, may happen to match what was left.)
    expect(
      RESET_KEYS.filter(
        (key) =>
          same(fresh[key], fieldDefault(key as StoreDataKey)) &&
          same(before[key], fresh[key]),
      ),
    ).toEqual([]);
    const after = await follow(path);

    expect(differing(RESET_KEYS, after, fresh)).toEqual([]);
  });

  it('leaves the student’s prefs, the room, devices and the clipboard alone', async () => {
    const before = leaveTheProjectBehind();
    const after = await follow(path);

    const kept = Object.keys(before).filter((key) => !RESET_KEYS.includes(key));
    expect(kept).toEqual(
      expect.arrayContaining([
        'metronomeEnabled',
        'countInBars',
        'timelineGridSize',
        'chordRulerShowNotes',
        'roomId',
        'remoteUsers',
        'inputs',
        'clipboardClips',
        'userListOpen',
      ]),
    );
    expect(kept.filter((key) => !Object.is(after[key], before[key]))).toEqual(
      [],
    );
  });

  it('is the project’s baseline: nothing to undo, nothing unsaved', async () => {
    const generation = getSessionGeneration();
    await follow(path);

    expect(getSessionGeneration()).toBeGreaterThan(generation);
    expect(canUndo()).toBe(false);
    expect(isDocumentDirty()).toBe(false);
    const status = useSaveStatusStore.getState();
    expect(status.documentVersion).toBe(status.baselineVersion);
    // A link that opens it again leaves no work for the next link to keep.
    // A jam import is the only copy of the jam, and stays work to keep.
    expect(hasWorkToKeep()).toBe(path.name === 'jam');
  });
});

// ── What the seeds start from ──────────────────────────────────────────────
//
// Each seed starts a new project itself, so even one run without
// replaceSession's reset never lands on the project before.

const SEEDS = PATHS.filter((path) => path.name !== 'new project');

describe.each(SEEDS)('the $name seed on its own', (path) => {
  it('opens a new project rather than adding to the open one', async () => {
    const fresh = await follow(path);

    freshPage();
    leaveTheProjectBehind();
    path.handOff?.();
    restartRandomness();
    path.open();
    settle();

    expect(differing(RESET_KEYS, storeData(), fresh)).toEqual([]);
  });

  it('ends as the project’s baseline itself', () => {
    leaveTheProjectBehind();
    path.handOff?.();
    path.open();
    settle();

    expect(canUndo()).toBe(false);
    expect(isDocumentDirty()).toBe(false);
    expect(hasWorkToKeep()).toBe(path.name === 'jam');
  });
});

describe('a link after a project that locked its key', () => {
  /** The key picked in the transport, which locks it as the popover closes. */
  function lockKey(): void {
    s().setRootNote(2);
    s().toggleRootLock();
    expect(s().rootLocked).toBe(true);
  }

  it('opens a song in its own key (state-reload-15, prism-ui-03)', async () => {
    lockKey();
    await follow(PATHS.find((p) => p.name === 'song')!);
    expect(s().rootNote).toBe(7);
    expect(s().rootLocked).toBe(false);
  });

  it('opens a Theory practice track in its own key', async () => {
    lockKey();
    await follow(PATHS.find((p) => p.name === 'Theory practice track')!);
    expect(s().rootNote).toBe(theoryPractice.rootNote);
  });

  it('opens a genre practice track in its own key', async () => {
    lockKey();
    await follow(PATHS.find((p) => p.name === 'genre practice track')!);
    expect(s().rootNote).toBe(genrePractice.track.keyRootPc);
  });

  it('lets a lesson set the key itself', async () => {
    lockKey();
    await follow(PATHS.find((p) => p.name === 'lesson')!);
    s().setRootNote(7); // the lesson's "Click G on the Circle of Fifths"
    expect(s().rootNote).toBe(7);
  });
});

describe('the detected key (insight-05)', () => {
  it('starts over with each link, so auto-tune follows the new project', async () => {
    s().setDetectedKey(7, 'mixolydian', 0.9, 'unison-offline');
    await follow(PATHS.find((p) => p.name === 'song')!);
    expect([s().detectedKeyRootPc, s().detectedMode, s().keySource]).toEqual([
      null,
      null,
      null,
    ]);
  });
});

describe('the Theory practice track', () => {
  it('lands on its practice screen, looped, with the open track armed', async () => {
    await follow(PATHS.find((p) => p.name === 'Theory practice track')!);
    expect(s().currentView).toBe('practice');
    expect(s().loopEnabled).toBe(true);
    expect(s().practiceSession).toEqual({
      kind: 'theory',
      mode: 'dorian',
      rootParam: 'd',
      level: 2,
      openTrack: 'melody',
    });
    const open = s().tracks.find((t) => t.id === s().selectedTrackId)!;
    expect(open.name).toMatch(/^Melody/);
    expect(open.recordArmed).toBe(true);
    expect(s().projectName).toMatch(/Practice Track — Level 2$/);
  });
});

describe('the genre practice track', () => {
  it('lands on its practice screen, its own groove looped, the student’s track armed', async () => {
    await follow(PATHS.find((p) => p.name === 'genre practice track')!);
    expect(s().currentView).toBe('practice');
    expect(s().loopEnabled).toBe(true);
    expect(s().practiceSession).toMatchObject({
      kind: 'genre',
      genreLabel: 'Funk',
      section: 'A',
      returnTo: '/curriculum/funk/2?section=A',
    });
    const student = s().tracks.find((t) => t.id === s().selectedTrackId)!;
    expect(student.midiClips).toEqual([]);
    expect(student.recordArmed).toBe(true);
  });
});

describe('the jam', () => {
  it('opens at the tempo it was played at', async () => {
    await follow(PATHS.find((p) => p.name === 'jam')!);
    expect(s().bpm).toBe(96);
    // A beat lasts 625 ms at 96 BPM, so the note Bo played 625 ms in is on
    // the second beat (480 ticks), where the project's grid shows it. Counted
    // at 120 BPM it would sit a sixteenth late (600).
    const bass = s().tracks.find((t) => t.name.startsWith('Bo'))!;
    expect(bass.midiClips[0].events[0].startTick).toBe(480);
  });

  it('is consumed only once it is in the project', async () => {
    saveJamSession(JAM);
    // An import that fails part way: the store refuses the clips. (The next
    // test's fresh page puts the store's own action back.)
    useStore.setState({
      addMidiClip: () => {
        throw new Error('no room');
      },
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const outcome = await replaceSession('student', seedJam);
    expect(outcome.status).toBe('failed');
    // The jam is still waiting, to be opened again.
    expect(loadJamSession()?.notes).toHaveLength(JAM.notes.length);
  });
});

describe('a demo with an Oracle synth', () => {
  it('gives the synth the demo’s patch', async () => {
    const midnight = getDemoProject('demo-midnight-groove')!;
    await follow(PATHS.find((p) => p.name === 'demo demo-midnight-groove')!);
    const lead = s().tracks.find((t) => t.name === 'Lead')!;
    expect(midnight.synthPresets?.Lead).toBe('DRIFT');
    expect(getTrackSynthState(lead.id)?.presetName).toBe('DRIFT');
  });
});
