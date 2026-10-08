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
 * A save since the demo opened leaves it touched too, edited or not: the
 * cloud copy lacks the drums, so they arrive as an unsaved change, and a
 * partial (legacy) save stays partial (D7). Before, the drums re-marked the
 * baseline as saved and complete, and the next link dropped the session.
 *
 * They belong to the demo they were fetched for: by the time they arrive
 * another project may be open, the same demo opened again (a new session
 * generation), or a room joined, and then they land nowhere.
 *
 * The demo opens as the editor's boot opens it (replaceSession, seedDemo).
 * Undo auto-capture runs as in the editor (initUndoTracking), under fake
 * timers; the groove fetch is held until the test lets it arrive.
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
import { getDemoProject } from '@/daw/data/demoProjects';
import { seedDemo, seedTemplate } from '@/daw/session/linkSeeds';
import { getSessionGeneration } from '@/daw/session/sessionGeneration';
import { useStore } from '@/daw/store';
import {
  canUndo,
  initUndoTracking,
  resetUndoHistory,
  undo,
} from '@/daw/store/undoMiddleware';
import { replaceSession } from '@/lib/studio-projects/localSession';
import { forgetLiveSession } from '../SessionSerializer';
import {
  cloudSaveGaps,
  documentSnapshot,
  hasWorkToKeep,
  isDocumentDirty,
  markDocumentBaseline,
  useSaveStatusStore,
  type DocumentSnapshot,
} from '../saveStatusStore';

const groove = vi.hoisted(() => ({
  /** Fetches still on their way, in the order they were made. */
  waiting: [] as Array<(events: unknown) => void>,
}));

vi.mock('@/daw/midi/loadGrooveEvents', () => ({
  loadGrooveEvents: vi.fn(
    () =>
      new Promise((resolve) => {
        groove.waiting.push(resolve);
      }),
  ),
}));

/** The groove: two hits a bar apart. */
const HITS = [
  { note: 36, velocity: 100, startTick: 0, durationTicks: 120, channel: 9 },
  { note: 38, velocity: 100, startTick: 960, durationTicks: 120, channel: 9 },
];

const SUNSET_KEYS = getDemoProject('demo-sunset-keys')!;
const s = () => useStore.getState();
const trackNames = () => s().tracks.map((t) => t.name);
const drumTracks = () => s().tracks.filter((t) => t.name === 'Drums');
/** Long enough for undo's debounced auto-capture to have run. */
const settle = () => vi.advanceTimersByTime(1000);

/**
 * A Save of the open demo, as the cloud save runs it (api.ts saveNow): the
 * first save links the session to a new cloud project (ensureProjectId),
 * then captures what it sends. `finish` marks the save's baseline when the
 * request returns, saved in full only when today's payload holds it all.
 */
function startSave(): { finish: () => void } {
  s().setProjectId('cloud-1');
  const sent: DocumentSnapshot = documentSnapshot();
  const complete = cloudSaveGaps(s(), 'legacy').length === 0;
  return {
    finish: () =>
      markDocumentBaseline({ snapshot: sent, savedComplete: complete }),
  };
}

const savedComplete = () => useSaveStatusStore.getState().savedComplete;

/** Let every groove fetch still on its way arrive, and wait for it to land. */
async function grooveArrives(drums: Promise<void>[]): Promise<void> {
  groove.waiting.splice(0).forEach((resolve) => resolve(HITS));
  await Promise.all(drums);
  settle();
}

/**
 * Open the demo as the editor's boot does, and start its drums the way the
 * boot does: for the generation the demo opened in. (The drums come back in
 * an object: an async function's result would wait for them to land.)
 */
async function openDemo(): Promise<{ drums: Promise<void> }> {
  let generation = 0;
  const outcome = await replaceSession(
    'student',
    () => {
      seedDemo(SUNSET_KEYS);
      generation = getSessionGeneration();
    },
    { reopenable: true },
  );
  expect(outcome.status).toBe('opened');
  settle();
  return { drums: applyDemoDrums(SUNSET_KEYS.drumGrooveId!, generation) };
}

beforeAll(() => {
  initUndoTracking();
});

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  groove.waiting.length = 0;
  useStore.setState(useStore.getInitialState(), true);
  forgetLiveSession();
  resetUndoHistory();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('a demo’s drums', () => {
  it('belong to an untouched demo’s opening', async () => {
    const { drums } = await openDemo();
    const before = trackNames();
    await grooveArrives([drums]);

    expect(trackNames()).toEqual([...before, 'Drums']);
    expect(canUndo()).toBe(false);
    expect(isDocumentDirty()).toBe(false);
    expect(hasWorkToKeep()).toBe(false);
  });

  it('are an undo step once the student has changed the demo', async () => {
    const { drums } = await openDemo();
    const before = trackNames();
    s().updateTrack(s().tracks[0].id, { volume: 0.3 });
    settle();
    await grooveArrives([drums]);

    expect(trackNames()).toEqual([...before, 'Drums']);
    expect(isDocumentDirty()).toBe(true);
    expect(undo()).toBe(true);
    expect(trackNames()).toEqual(before);
    // The student's own edit is still there, and still undoable.
    expect(s().tracks[0].volume).toBe(0.3);
    expect(canUndo()).toBe(true);
  });

  it('still arrive after the student renames the demo', async () => {
    // Before session generations, a rename looked like another project.
    const { drums } = await openDemo();
    s().setProjectName('My Sunset');
    settle();
    await grooveArrives([drums]);

    expect(drumTracks()).toHaveLength(1);
    expect(s().projectName).toBe('My Sunset');
  });

  it('are an unsaved change once a save has linked the demo', async () => {
    const { drums } = await openDemo();
    startSave().finish();
    // Today's payload has no place for the demo's chord lane: the save holds
    // the demo only in part, so it is still work to keep.
    expect(savedComplete()).toBe(false);
    await grooveArrives([drums]);

    expect(drumTracks()).toHaveLength(1);
    expect(isDocumentDirty()).toBe(true);
    expect(savedComplete()).toBe(false);
    expect(hasWorkToKeep()).toBe(true);
    // An ordinary step, as after any change.
    expect(canUndo()).toBe(true);
  });

  it('are an unsaved change when they land while a save is under way', async () => {
    const { drums } = await openDemo();
    const save = startSave();
    await grooveArrives([drums]);
    save.finish();

    // The save sent the demo without its drums.
    expect(drumTracks()).toHaveLength(1);
    expect(isDocumentDirty()).toBe(true);
    expect(savedComplete()).toBe(false);
    expect(hasWorkToKeep()).toBe(true);
  });

  it('never make a saved copy that was let go of complete again', async () => {
    const { drums } = await openDemo();
    startSave().finish();
    // File ▸ Delete: the cloud copy is gone, the session the only one.
    s().setProjectId(null);
    await grooveArrives([drums]);

    expect(drumTracks()).toHaveLength(1);
    expect(savedComplete()).toBe(false);
    expect(hasWorkToKeep()).toBe(true);
  });

  it('never land in a room joined while they loaded', async () => {
    const { drums } = await openDemo();
    const before = trackNames();
    // A guest's Join: the room's project comes in without a load.
    useStore.setState({ roomId: 'room-1', collabRole: 'editor' });
    await grooveArrives([drums]);

    expect(trackNames()).toEqual(before);
  });

  it('never land in a project opened while they loaded', async () => {
    const { drums } = await openDemo();
    await replaceSession('student', () => seedTemplate('project-rock'), {
      reopenable: true,
    });
    settle();
    const template = trackNames();
    await grooveArrives([drums]);

    expect(trackNames()).toEqual(template);
    // The template is untouched: nothing landed in it, nothing to undo.
    expect(isDocumentDirty()).toBe(false);
    expect(canUndo()).toBe(false);
  });

  it('land once when the same demo opens again while they load', async () => {
    const { drums: first } = await openDemo();
    const { drums: second } = await openDemo();
    await grooveArrives([first, second]);

    expect(drumTracks()).toHaveLength(1);
    expect(isDocumentDirty()).toBe(false);
  });

  it('belong to the open project when called as it opens', async () => {
    await replaceSession('student', () => seedDemo(SUNSET_KEYS), {
      reopenable: true,
    });
    const drums = applyDemoDrums(SUNSET_KEYS.drumGrooveId!);
    await grooveArrives([drums]);

    expect(drumTracks()).toHaveLength(1);
  });
});
