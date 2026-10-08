// @vitest-environment jsdom
/**
 * How an editor link replaces the session. DawApp's boot opens every kind of
 * link (template, demo, lesson, song, practice track, cloud project, jam,
 * collab, new) through replaceSession, so these are the boot's steps:
 *
 * - the outgoing work is kept before anything is cleared, and a link that
 *   can't keep it changes nothing (audit state-reload-03, ia-flows-02);
 * - the seed is the new baseline, not an undo step and not an unsaved
 *   change, and a link that can open it again leaves nothing for the next
 *   link to keep, while a jam import, its only copy, stays keepable
 *   (state-reload-21);
 * - a seed that fails, such as a practice track whose groove won't load,
 *   puts the kept work back (practice-tutorial-07).
 *
 * Undo auto-capture runs as in the editor (initUndoTracking), under fake
 * timers, so a seed left as an undo step would show up in canUndo().
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
import {
  forgetLiveSession,
  resetSessionToEmpty,
} from '@/daw/persistence/SessionSerializer';
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
  undo,
} from '@/daw/store/undoMiddleware';
import {
  keepOutgoingSession,
  listKeptSessions,
  readLocalSession,
  replaceSession,
  writeLocalSession,
} from '../localSession';

const s = () => useStore.getState();
const names = (user: string) =>
  listKeptSessions(user).map((k) => k.projectName);
const trackNames = () => s().tracks.map((t) => t.name);
/** Long enough for undo's debounced auto-capture to have run. */
const settle = () => vi.advanceTimersByTime(1000);

/** A session the student has worked on. */
function workInProgress(name = 'Blue Hour'): void {
  resetSessionToEmpty();
  s().setProjectName(name);
  const keys = s().addTrack('midi', 'piano-sampler', 'Keys');
  s().addMidiClip(keys, {
    id: 'clip-1',
    startTick: 0,
    events: [
      { note: 60, velocity: 90, startTick: 0, durationTicks: 480, channel: 0 },
    ],
  });
  settle();
}

const openTemplate = () => s().loadProjectTemplate('project-pop');

beforeAll(() => {
  initUndoTracking();
});

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  useStore.setState(useStore.getInitialState(), true);
  forgetLiveSession();
  resetUndoHistory();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('a link replacing the session', () => {
  it('keeps the outgoing work before it clears anything', async () => {
    workInProgress('Blue Hour');
    let atSeed: { tracks: string[]; kept: string[] } | null = null;

    const outcome = await replaceSession(
      'u1',
      () => {
        atSeed = { tracks: trackNames(), kept: names('u1') };
        openTemplate();
      },
      { reopenable: true },
    );

    expect(atSeed).toEqual({ tracks: [], kept: ['Blue Hour'] });
    expect(outcome).toEqual({
      status: 'opened',
      kept: expect.objectContaining({ projectName: 'Blue Hour' }),
    });
    expect(s().tracks.length).toBeGreaterThan(0);
  });

  it('changes nothing when the outgoing work cannot be kept', async () => {
    workInProgress('Blue Hour');
    const seed = vi.fn(openTemplate);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });

    const outcome = await replaceSession('u1', seed, { reopenable: true });
    vi.restoreAllMocks();

    expect(outcome).toEqual({ status: 'refused' });
    expect(seed).not.toHaveBeenCalled();
    expect(s().projectName).toBe('Blue Hour');
    expect(trackNames()).toEqual(['Keys']);
  });

  it('opens with nothing to keep when the session held no work', async () => {
    resetSessionToEmpty();
    const outcome = await replaceSession('u1', openTemplate, {
      reopenable: true,
    });
    expect(outcome).toEqual({ status: 'opened', kept: null });
  });

  it('on a fresh page, keeps both the autosave and what the student added while it loaded', async () => {
    // A link waits for its fetch with the editor already on screen; the
    // last session's only copy is the autosave.
    workInProgress('Yesterday');
    expect(writeLocalSession('u1')).toBe(true);
    forgetLiveSession();
    useStore.setState(useStore.getInitialState(), true);
    s().addTrack('midi', 'piano-sampler', 'Doodle');

    const outcome = await replaceSession('u1', openTemplate, {
      reopenable: true,
    });

    expect(outcome).toEqual({
      status: 'opened',
      kept: expect.objectContaining({ projectName: 'Yesterday' }),
      also: expect.objectContaining({ projectName: 'Untitled Project' }),
    });
    expect(names('u1')).toEqual(['Untitled Project', 'Yesterday']);
  });
});

describe('the seed', () => {
  it('is the new baseline, not an undo step', async () => {
    workInProgress();
    await replaceSession('u1', openTemplate, { reopenable: true });
    settle();
    expect(canUndo()).toBe(false);

    s().updateTrack(s().tracks[0].id, { volume: 0.2 });
    settle();
    expect(canUndo()).toBe(true);
  });

  it('is the baseline before replaceSession returns, when it returns at once', () => {
    // Nothing may catch the session between seed and baseline: in dev,
    // React's StrictMode runs the autosave's unmount flush right after the
    // boot effect, before any awaited step.
    workInProgress();
    void replaceSession('u1', openTemplate, { reopenable: true });
    expect(isDocumentDirty()).toBe(false);
    expect(hasWorkToKeep()).toBe(false);
  });

  it('is the baseline once an async seed finishes, and not before', async () => {
    workInProgress();
    let finish = () => {};
    const opening = replaceSession(
      'u1',
      async () => {
        openTemplate();
        await new Promise<void>((resolve) => (finish = resolve));
        s().setBpm(88); // the rest of the seed, after its fetch
      },
      { reopenable: true },
    );
    finish();
    await opening;

    expect(s().bpm).toBe(88);
    expect(isDocumentDirty()).toBe(false);
    expect(useSaveStatusStore.getState().savedComplete).toBe(true);
  });

  it('holds no work for the next link while it is as the link opened it', async () => {
    await replaceSession('u1', openTemplate, { reopenable: true });
    s().setPosition(1920); // playing it is not work
    expect(keepOutgoingSession('u1')).toEqual({ status: 'nothing' });

    s().updateTrack(s().tracks[0].id, { volume: 0.2 });
    expect(keepOutgoingSession('u1').status).toBe('kept');
  });

  it('holds no work again once an edit is undone', async () => {
    await replaceSession('u1', openTemplate, { reopenable: true });
    s().updateTrack(s().tracks[0].id, { volume: 0.2 });
    settle();
    expect(hasWorkToKeep()).toBe(true);

    expect(undo()).toBe(true);
    expect(hasWorkToKeep()).toBe(false);
    expect(keepOutgoingSession('u1')).toEqual({ status: 'nothing' });
  });

  it('holds no work for arming a track or turning the metronome on', async () => {
    await replaceSession('u1', openTemplate, { reopenable: true });
    s().toggleRecordArm(s().tracks[0].id);
    s().toggleMetronome();
    expect(keepOutgoingSession('u1')).toEqual({ status: 'nothing' });
  });

  it('stays keepable when it is the only copy (a jam import)', async () => {
    await replaceSession('u1', () => {
      s().addTrack('midi', 'soundfont', 'Ana');
      s().addTrack('midi', 'soundfont', 'Ben');
    });
    expect(useSaveStatusStore.getState().savedComplete).toBe(false);
    expect(keepOutgoingSession('u1').status).toBe('kept');
  });

  it('holds no work while a shared session opens empty', async () => {
    // A collab link seeds nothing until the room's project arrives.
    await replaceSession('u1', () => {});
    expect(keepOutgoingSession('u1')).toEqual({ status: 'nothing' });
  });
});

describe('a seed that fails', () => {
  it('brings the kept work back, in the autosave too', async () => {
    workInProgress('Blue Hour');

    const outcome = await replaceSession(
      'u1',
      async () => {
        // Half a practice track, then its groove fails to load.
        s().addTrack('midi', 'drum-machine', 'Drums');
        await Promise.resolve();
        throw new Error('groove fetch failed');
      },
      { reopenable: true },
    );

    expect(outcome).toMatchObject({ status: 'failed', restored: true });
    expect(s().projectName).toBe('Blue Hour');
    expect(trackNames()).toEqual(['Keys']);
    expect(readLocalSession()?.data.projectName).toBe('Blue Hour');
    // The kept copy is the live session again.
    expect(names('u1')).toEqual([]);
  });

  it('with nothing kept, leaves an empty project rather than half a seed', async () => {
    resetSessionToEmpty();
    const outcome = await replaceSession('u1', () => {
      s().addTrack('midi', 'drum-machine', 'Drums');
      throw new Error('groove fetch failed');
    });
    expect(outcome).toMatchObject({ status: 'failed', restored: false });
    expect(s().tracks).toEqual([]);
  });
});
