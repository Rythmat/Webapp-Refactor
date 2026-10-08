// @vitest-environment jsdom
/**
 * A demo's drums arrive after the demo opens: they are a fetched .mid, so
 * they can't ride in the synchronous bundle (applyDemoDrums).
 *
 * Into an untouched demo they are part of opening it, so the first Cmd+Z
 * must not take them away, and the demo still holds no work for the next
 * link to keep. Once the student has changed it, the drums are an ordinary
 * undo step and the student's own history stays (audit state-reload-21).
 *
 * Undo auto-capture runs as in the editor (initUndoTracking), under fake
 * timers; the groove fetch is replaced with a fixed two-hit pattern.
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
import { applyDemoDrums } from '@/daw/data/applyDemoDrums';
import { useStore } from '@/daw/store';
import {
  canUndo,
  initUndoTracking,
  resetUndoHistory,
  undo,
} from '@/daw/store/undoMiddleware';
import {
  forgetLiveSession,
  isPristineSession,
  markSessionPristine,
  resetSessionToEmpty,
} from '../SessionSerializer';

vi.mock('@/daw/midi/loadGrooveEvents', () => ({
  loadGrooveEvents: vi.fn(async () => [
    { note: 36, velocity: 100, startTick: 0, durationTicks: 120, channel: 9 },
    { note: 38, velocity: 100, startTick: 960, durationTicks: 120, channel: 9 },
  ]),
}));

const DEMO = 'Sunset Keys';
const s = () => useStore.getState();
const trackNames = () => s().tracks.map((t) => t.name);
/** Long enough for undo's debounced auto-capture to have run. */
const settle = () => vi.advanceTimersByTime(1000);

/** The demo as its boot leaves it: retitled, no cloud id, baselined. */
function openDemo(): string {
  resetSessionToEmpty();
  const keys = s().addTrack('midi', 'piano-sampler', 'Keys');
  s().addMidiClip(keys, {
    id: 'clip-1',
    startTick: 0,
    events: [
      { note: 60, velocity: 90, startTick: 0, durationTicks: 1920, channel: 0 },
    ],
  });
  s().setProjectId(null);
  s().setProjectName(DEMO);
  resetUndoHistory();
  markSessionPristine();
  return keys;
}

beforeAll(() => {
  initUndoTracking();
});

beforeEach(() => {
  vi.useFakeTimers();
  useStore.setState(useStore.getInitialState(), true);
  forgetLiveSession();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('a demo’s drums', () => {
  it('belong to an untouched demo’s opening', async () => {
    openDemo();
    await applyDemoDrums('groove-neosoul-1', DEMO);
    settle();

    expect(trackNames()).toEqual(['Keys', 'Drums']);
    expect(canUndo()).toBe(false);
    expect(isPristineSession()).toBe(true);
  });

  it('are an undo step once the student has changed the demo', async () => {
    const keys = openDemo();
    s().updateTrack(keys, { volume: 0.3 });
    settle();
    await applyDemoDrums('groove-neosoul-1', DEMO);
    settle();

    expect(isPristineSession()).toBe(false);
    expect(undo()).toBe(true);
    expect(trackNames()).toEqual(['Keys']);
    // The student's own edit is still there, and still undoable.
    expect(s().tracks[0].volume).toBe(0.3);
    expect(canUndo()).toBe(true);
  });

  it('never land in a project opened while they loaded', async () => {
    openDemo();
    s().setProjectName('Something Else');
    await applyDemoDrums('groove-neosoul-1', DEMO);

    expect(trackNames()).toEqual(['Keys']);
  });
});
