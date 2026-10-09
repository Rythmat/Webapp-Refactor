// @vitest-environment jsdom
/**
 * A demo opens in two steps (milestone 1.4). prepareDemo finds it and
 * fetches its drum groove, changing nothing; applyDemo writes the bundle and
 * the Drums track in one synchronous block after openSession's reset. The
 * drums are part of opening the demo, so the opener's one baseline covers
 * them: the first Cmd+Z can't take them away and an untouched demo holds no
 * work to keep. This replaces applyDemoDrums' late, generation-checked drums
 * (demoDrums.test.ts covers those until editor-wiring deletes them).
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
import { getDemoProject } from '@/daw/data/demoProjects';
import { GROOVES } from '@/daw/data/groovesLibrary';
import { loadGrooveEvents } from '@/daw/midi/loadGrooveEvents';
import {
  forgetLiveSession,
  resetSessionToEmpty,
} from '@/daw/persistence/SessionSerializer';
import { resetProjectState } from '@/daw/persistence/projectDocument/initialState';
import {
  hasWorkToKeep,
  isDocumentDirty,
  markDocumentBaseline,
} from '@/daw/persistence/saveStatusStore';
import { getSessionGeneration } from '@/daw/session/sessionGeneration';
import { useStore } from '@/daw/store';
import {
  canUndo,
  initUndoTracking,
  resetUndoHistory,
  undo,
} from '@/daw/store/undoMiddleware';
import { applyDemo, prepareDemo, type PreparedDemo } from '../demoSeed';

vi.mock('@/daw/midi/loadGrooveEvents', () => ({
  loadGrooveEvents: vi.fn(),
}));

/** The groove: two hits a bar apart, and one far past any demo's loop. */
const HITS = [
  { note: 36, velocity: 100, startTick: 0, durationTicks: 120, channel: 9 },
  { note: 38, velocity: 100, startTick: 960, durationTicks: 120, channel: 9 },
  {
    note: 42,
    velocity: 100,
    startTick: 1_000_000,
    durationTicks: 120,
    channel: 9,
  },
];

const SUNSET = 'demo-sunset-keys';
const s = () => useStore.getState();
const settle = () => vi.advanceTimersByTime(1000);
const drumTracks = () => s().tracks.filter((t) => t.name === 'Drums');
const grooves = vi.mocked(loadGrooveEvents);

/** Open a prepared demo as openSession does: reset, apply, one baseline. */
function open(prepared: PreparedDemo): void {
  resetProjectState('open:demo');
  resetUndoHistory();
  applyDemo(prepared);
  markDocumentBaseline({ savedComplete: true });
  resetUndoHistory();
}

beforeAll(() => {
  initUndoTracking();
});

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  grooves.mockReset();
  useStore.setState(useStore.getInitialState(), true);
  forgetLiveSession();
  resetSessionToEmpty();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('prepareDemo', () => {
  it('fetches the groove and changes nothing', async () => {
    grooves.mockResolvedValue(HITS);
    s().addTrack('midi', 'piano-sampler', 'Mine');
    const generation = getSessionGeneration();
    const demo = getDemoProject(SUNSET)!;

    const prepared = await prepareDemo(SUNSET);

    expect(grooves).toHaveBeenCalledWith(demo.drumGrooveId);
    expect(prepared?.demo).toBe(demo);
    expect(prepared?.drums).toEqual(HITS);
    expect(prepared?.grooveName).toBe(
      GROOVES.find((g) => g.id === demo.drumGrooveId)!.name,
    );
    expect(s().tracks.map((t) => t.name)).toEqual(['Mine']);
    expect(getSessionGeneration()).toBe(generation);
  });

  it('is null for an id with no demo', async () => {
    expect(await prepareDemo('no-such-demo')).toBeNull();
    expect(grooves).not.toHaveBeenCalled();
  });

  it('gives no drums when the groove can’t be fetched', async () => {
    grooves.mockResolvedValue(null);
    expect((await prepareDemo(SUNSET))?.drums).toBeNull();
    grooves.mockRejectedValue(new Error('offline'));
    expect((await prepareDemo(SUNSET))?.drums).toBeNull();
  });
});

describe('applyDemo', () => {
  it('opens the demo as a nameless-in-the-cloud copy with a chord lane', async () => {
    grooves.mockResolvedValue(HITS);
    const demo = getDemoProject(SUNSET)!;
    s().setProjectId('someone-elses');
    open((await prepareDemo(SUNSET))!);

    expect(s().projectId).toBeNull();
    expect(s().projectName).toBe(demo.label);
    expect(s().tracks.map((t) => t.name)).toEqual([
      ...demo.bundle.tracks.map((t) => t.name),
      'Drums',
    ]);
    expect(s().chordRegions.length).toBeGreaterThan(0);
  });

  it('cuts the drums to the demo’s loop', async () => {
    grooves.mockResolvedValue(HITS);
    open((await prepareDemo(SUNSET))!);

    const [drums] = drumTracks();
    const clip = drums.midiClips[0];
    const others = s().tracks.filter((t) => t.name !== 'Drums');
    const loop = Math.max(
      ...others.flatMap((t) =>
        t.midiClips.flatMap((c) =>
          c.events.map((e) => c.startTick + e.startTick + e.durationTicks),
        ),
      ),
    );
    expect(clip.durationTicks).toBe(loop);
    expect(clip.events.map((e) => e.note)).toEqual([36, 38]);
    expect(
      clip.events.every((e) => e.startTick + e.durationTicks <= loop),
    ).toBe(true);
    expect(clip.name).toBe(
      GROOVES.find((g) => g.id === getDemoProject(SUNSET)!.drumGrooveId)!.name,
    );
  });

  it('opens without drums when the groove didn’t arrive', async () => {
    grooves.mockResolvedValue(null);
    const demo = getDemoProject(SUNSET)!;
    open((await prepareDemo(SUNSET))!);

    expect(drumTracks()).toHaveLength(0);
    expect(s().tracks.map((t) => t.name)).toEqual(
      demo.bundle.tracks.map((t) => t.name),
    );
  });

  it('opens in one piece: one baseline, and Cmd+Z can’t take the drums', async () => {
    grooves.mockResolvedValue(HITS);
    open((await prepareDemo(SUNSET))!);
    settle();

    expect(drumTracks()).toHaveLength(1);
    expect(canUndo()).toBe(false);
    expect(undo()).toBe(false);
    expect(drumTracks()).toHaveLength(1);
    expect(isDocumentDirty()).toBe(false);
    expect(hasWorkToKeep()).toBe(false);
  });

  it('makes the student’s first change an ordinary undo step', async () => {
    grooves.mockResolvedValue(HITS);
    open((await prepareDemo(SUNSET))!);
    settle();
    s().updateTrack(s().tracks[0].id, { volume: 0.3 });
    settle();

    expect(isDocumentDirty()).toBe(true);
    expect(undo()).toBe(true);
    expect(s().tracks[0].volume).not.toBe(0.3);
    expect(drumTracks()).toHaveLength(1);
  });

  it('does no reset, baseline or undo reset of its own', async () => {
    grooves.mockResolvedValue(HITS);
    const prepared = (await prepareDemo(SUNSET))!;
    resetProjectState('open:demo');
    const generation = getSessionGeneration();
    applyDemo(prepared);
    // deserializeCloudProject is itself a load and moves the generation on;
    // the drums go into that same generation, in the same synchronous block.
    const loaded = getSessionGeneration();
    expect(loaded).toBeGreaterThanOrEqual(generation);
    expect(drumTracks()).toHaveLength(1);
    settle();
    expect(getSessionGeneration()).toBe(loaded);
  });
});
