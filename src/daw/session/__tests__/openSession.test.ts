// @vitest-environment jsdom
/**
 * openSession, the one machine every Studio open goes through, driven with
 * fake ports (fakes.ts) over the real editor store: nothing changes before
 * keeping; the work an open replaces is kept once and comes back; the room
 * is left before the reset (no write reaches the shared document); a newer
 * open supersedes an older one; a failure after the switch reopens the kept
 * work under the panel; ?project= follows the E11 rule; a return to the
 * editor rejoins only its own room; recordings and saves finish first.
 *
 * Run: npx vitest run src/daw/session/__tests__/openSession.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setBridge } from '@/daw/collab/collabMiddleware';
import {
  INITIAL_CLOUD_SAVE_STATE,
  useCloudSaveStore,
} from '@/daw/commands/cloudSaveStore';
import { TUTORIALS } from '@/daw/components/Tutorial/tutorials';
import {
  loadJamSession,
  saveJamSession,
  type JamSession,
} from '@/daw/jam-import/jamSession';
import {
  forgetLiveSession,
  serializeSession,
} from '@/daw/persistence/SessionSerializer';
import {
  isDocumentDirty,
  markDocumentBaseline,
} from '@/daw/persistence/saveStatusStore';
import { useStore } from '@/daw/store';
import { canUndo, resetUndoHistory } from '@/daw/store/undoMiddleware';
import { studioProjectsApi } from '@/lib/studio-projects/projectsClient';
import { StudioApiError } from '@/lib/studio-projects/studioApiError';
import { DraftStorageError } from '@/lib/studio-projects/drafts/types';
import { showError, showNotice } from '@/util/toast';
import {
  backToMyWork,
  cancelOpen,
  openSession,
  resetOpenSessionForTests,
  retryOpen,
} from '../openSession';
import { notifySessionDepsChanged, registerSessionDeps } from '../sessionDeps';
import { getSessionGeneration } from '../sessionGeneration';
import { resetSessionNoticesForTests } from '../sessionNotices';
import { INITIAL_SESSION_STATE, useSessionStore } from '../sessionStore';
import { beginTake } from '../takesInFlight';
import type { OpenOutcome } from '../types';
import {
  installFakeDeps,
  installStubBridge,
  makeMeta,
  setEditorUrl,
  type FakeEnv,
} from './fakes';

vi.mock('@/util/toast', () => ({
  showNotice: vi.fn(() => 1),
  showError: vi.fn(),
  showSuccess: vi.fn(),
  showLoading: vi.fn(),
  dismissToast: vi.fn(),
}));

vi.mock('@/lib/studio-projects/projectsClient', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@/lib/studio-projects/projectsClient')
    >();
  return {
    ...actual,
    studioProjectsApi: { ...actual.studioProjectsApi, get: vi.fn() },
  };
});

vi.mock('@/daw/midi/loadGrooveEvents', () => ({
  loadGrooveEvents: vi.fn(async () => [
    { pitch: 36, startTick: 0, durationTicks: 120, velocity: 100 },
  ]),
}));

const getProject = vi.mocked(studioProjectsApi.get);
const notice = vi.mocked(showNotice);
const errorToast = vi.mocked(showError);

let env: FakeEnv;

function freshPage(): void {
  resetOpenSessionForTests();
  resetSessionNoticesForTests();
  useStore.setState(useStore.getInitialState(), true);
  forgetLiveSession();
  resetUndoHistory();
  markDocumentBaseline();
  setBridge(null);
  useSessionStore.setState({ ...INITIAL_SESSION_STATE });
  useCloudSaveStore.setState({ ...INITIAL_CLOUD_SAVE_STATE });
  localStorage.clear();
  sessionStorage.clear();
  setEditorUrl('');
}

beforeEach(() => {
  freshPage();
  env = installFakeDeps();
});

afterEach(() => {
  env.unregister();
  vi.clearAllMocks();
  vi.useRealTimers();
});

const s = () => useStore.getState();
/** The live session's content, without the serializer's timestamp. */
const liveData = () => JSON.stringify(serializeSession().data);
const trackNames = () => s().tracks.map((t) => t.name);

/** A live session holding work (a track the student added). */
async function liveWork(name = 'Mine'): Promise<string> {
  const opened = await openSession({ kind: 'new' }, { source: 'menu' });
  if (opened.status !== 'ready') throw new Error('no live session');
  s().addTrack('midi', 'piano-sampler', name);
  s().setProjectName(`${name} project`);
  notice.mockClear();
  errorToast.mockClear();
  env.drafts.log.length = 0;
  return opened.draftId;
}

/** Session text holding one track named `name`; the store is left as it was. */
function draftText(name: string): string {
  const saved = useStore.getState();
  useStore.setState(useStore.getInitialState(), true);
  s().addTrack('midi', 'piano-sampler', name);
  const text = JSON.stringify(serializeSession());
  useStore.setState(saved, true);
  return text;
}

function cloudProject(
  name: string,
  updatedAt = '2026-10-01T10:00:00.000Z',
): Awaited<ReturnType<typeof studioProjectsApi.get>> {
  return {
    id: 'p1',
    name: `${name} project`,
    composerName: null,
    bpm: 100,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date(updatedAt),
    libraryGenre: null,
    libraryStatus: null,
    libraryInstruments: [],
    collaborators: [],
    prism: { rootNote: 0, rhythmName: 'Quarters', genre: 'pop', swing: 0 },
    tracks: [
      {
        id: 't-row',
        ordinal: 0,
        name,
        type: 'midi',
        instrument: 'piano-sampler',
        color: '#ffffff',
        mute: false,
        solo: false,
        volume: 0.8,
        pan: 0,
        activeEffects: [],
        midiClips: [],
        audioClips: [],
      },
    ],
  } as unknown as Awaited<ReturnType<typeof studioProjectsApi.get>>;
}

/** A GET that hangs until its signal aborts. */
function hangingGet(): void {
  getProject.mockImplementation(
    (_token, _id, opts) =>
      new Promise((_resolve, reject) => {
        opts?.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        );
      }),
  );
}

const indexOf = (prefix: string) =>
  env.drafts.log.findIndex((entry) => entry.startsWith(prefix));

describe('resume', () => {
  it('opens an empty project on a cold page with no drafts', async () => {
    const outcome = await openSession({ kind: 'resume' }, { source: 'boot' });
    expect(outcome).toMatchObject({
      status: 'ready',
      kept: null,
      forked: false,
    });
    expect(env.drafts.begun).toHaveLength(1);
    expect(env.drafts.begun[0][1]).toMatchObject({
      source: 'empty',
      reopenable: true,
    });
    expect(useSessionStore.getState()).toMatchObject({
      phase: 'ready',
      overlay: 'none',
      draftId: outcome.status === 'ready' ? outcome.draftId : null,
      error: null,
    });
    expect(env.drafts.log).not.toContain('flush:open:resume');
  });

  it('reopens the last draft with its own baseline, its media and the old tab note', async () => {
    const text = draftText('From last time');
    const meta = makeMeta({
      draftId: 'd1',
      name: 'Last',
      baseline: {
        source: 'template',
        ref: 'x',
        reopenable: true,
        fingerprint: 'h1:b',
      },
    });
    env.drafts.put(meta, text);
    sessionStorage.setItem(
      'musicAtlas:daw:keptNotice',
      JSON.stringify({ projectName: 'Old work' }),
    );

    const outcome = await openSession({ kind: 'resume' }, { source: 'boot' });

    expect(outcome).toMatchObject({ status: 'ready', draftId: 'd1' });
    expect(trackNames()).toEqual(['From last time']);
    expect(env.drafts.begun[0][1]).toEqual(meta.baseline);
    expect(env.drafts.restored).toEqual([['d1', getSessionGeneration()]]);
    expect(isDocumentDirty()).toBe(false);
    expect(canUndo()).toBe(false);
    expect(notice).toHaveBeenCalledWith(
      'Your previous work was kept',
      expect.objectContaining({ description: 'Old work' }),
    );
    expect(sessionStorage.getItem('musicAtlas:daw:keptNotice')).toBeNull();
  });

  it('opens a copy of a draft another tab holds, with a pristine baseline', async () => {
    env.drafts.put(
      makeMeta({ draftId: 'd1', name: 'Shared' }),
      draftText('Tab A'),
    );
    env.drafts.lockedElsewhere.add('d1');

    const outcome = await openSession({ kind: 'resume' }, { source: 'boot' });

    expect(outcome).toMatchObject({ status: 'ready', forked: true });
    expect(s().projectName).toBe('Shared (copy)');
    expect(s().projectId).toBeNull();
    expect(env.drafts.begun[0][1]).toMatchObject({ reopenable: true });
    expect(env.drafts.begun[0][1].fingerprint).toMatch(/^h1:/);
    expect(notice).toHaveBeenCalledWith(
      'This project is open in another tab — this tab has a copy',
    );
  });

  it('carries on with the live session on a return to the editor', async () => {
    await liveWork();
    const before = liveData();
    const outcome = await openSession({ kind: 'resume' }, { source: 'boot' });
    expect(outcome.status).toBe('ready');
    expect(liveData()).toBe(before);
    expect(env.drafts.log).toEqual([]);
  });

  it('keeps the live work under its owner when another user returns', async () => {
    await liveWork();
    env.user = { userId: 'student-b', userKey: 'student-b' };
    const outcome = await openSession({ kind: 'resume' }, { source: 'boot' });
    expect(outcome.status).toBe('ready');
    expect(indexOf('retire:auto')).toBeGreaterThan(-1);
    expect(env.drafts.prepareUser).toHaveBeenLastCalledWith(
      env.user,
      expect.anything(),
    );
    expect(useSessionStore.getState().userKey).toBe('student-b');
  });

  it('opens an empty project when the last draft cannot be read', async () => {
    env.drafts.put(makeMeta({ draftId: 'd1' }), 'not json');
    env.drafts.readError = new DraftStorageError('corrupt', 'bad');
    const outcome = await openSession({ kind: 'resume' }, { source: 'boot' });
    expect(outcome).toMatchObject({ status: 'ready' });
    expect(env.drafts.released).toContain('d1');
    expect(env.drafts.begun[0][1].source).toBe('empty');
  });
});

describe('a link that replaces the session', () => {
  it('keeps the work once, resets, applies, and strips only its own keys', async () => {
    const liveId = await liveWork();
    setEditorUrl('?template=project-pop&msp=1&utm_source=mail');

    const outcome = await openSession(
      { kind: 'template', templateId: 'project-pop' },
      { source: 'link' },
    );

    expect(outcome).toMatchObject({ status: 'ready' });
    if (outcome.status !== 'ready') return;
    expect(outcome.kept?.draftId).toBe(liveId);
    expect(indexOf('flush:')).toBeLessThan(indexOf('retire:auto'));
    expect(indexOf('retire:auto')).toBeLessThan(indexOf('activate:'));
    expect(indexOf('activate:')).toBeLessThan(indexOf('begin:'));
    expect(trackNames()).not.toContain('Mine');
    expect(s().tracks.length).toBeGreaterThan(0);
    expect(s().projectId).toBeNull();
    expect(canUndo()).toBe(false);
    expect(isDocumentDirty()).toBe(false);
    expect(env.drafts.begun.at(-1)?.[1]).toMatchObject({
      source: 'template',
      ref: 'project-pop',
      reopenable: true,
    });
    expect(window.location.search).toBe('?msp=1&utm_source=mail');
    expect(env.navigate).toHaveBeenCalledWith('?msp=1&utm_source=mail', {
      replace: true,
    });
    const kept = notice.mock.calls.find(
      ([message]) => message === 'Your previous work was kept',
    );
    expect(kept?.[1]).toMatchObject({
      description: 'Mine project',
      action: { label: 'Restore' },
      secondaryAction: { label: 'View' },
    });
  });

  it("brings the kept work back from the toast's Restore", async () => {
    const liveId = await liveWork();
    await openSession({ kind: 'new' }, { source: 'menu' });
    const kept = notice.mock.calls.find(
      ([message]) => message === 'Your previous work was kept',
    );
    expect(trackNames()).toEqual([]);

    kept?.[1]?.action?.onClick();
    await vi.waitFor(() =>
      expect(useSessionStore.getState().draftId).toBe(liveId),
    );
    await vi.waitFor(() =>
      expect(useSessionStore.getState().phase).toBe('ready'),
    );
    expect(trackNames()).toEqual(['Mine']);

    kept?.[1]?.secondaryAction?.onClick();
    expect(env.openProjectsDialog).toHaveBeenCalledWith({
      focusDraftId: liveId,
    });
  });

  it('drops an untouched session instead of keeping it', async () => {
    await openSession({ kind: 'new' }, { source: 'menu' });
    const outcome = await openSession(
      { kind: 'template', templateId: 'project-pop' },
      { source: 'library' },
    );
    expect(outcome).toMatchObject({ status: 'ready', kept: null });
    expect(notice).not.toHaveBeenCalledWith(
      'Your previous work was kept',
      expect.anything(),
    );
  });

  it('opens a jam with its tempo as work, and clears the hand-off once ready', async () => {
    const jam: JamSession = {
      version: 1,
      roomId: 'room-1',
      recordedAt: 1,
      bpm: 96,
      localUserId: 'u-a',
      participants: [{ userId: 'u-a', userName: 'Ada', color: '#ff0000' }],
      notes: [
        {
          userId: 'u-a',
          color: '#ff0000',
          instrument: 'piano',
          gmProgram: 0,
          midi: 60,
          velocity: 90,
          startMs: 0,
          endMs: 400,
        },
      ],
    };
    saveJamSession(jam);
    await liveWork();
    const outcome = await openSession({ kind: 'jam' }, { source: 'link' });
    expect(outcome.status).toBe('ready');
    expect(s().bpm).toBe(96);
    expect(loadJamSession()).toBeNull();
    expect(env.drafts.begun.at(-1)?.[1]).toMatchObject({
      source: 'jam',
      reopenable: false,
    });
  });

  it('opens a song transposed', async () => {
    const outcome = await openSession(
      { kind: 'song', songId: 'africa', transpose: 2 },
      { source: 'link' },
    );
    expect(outcome.status).toBe('ready');
    expect(s().projectName.length).toBeGreaterThan(0);
    expect(env.drafts.begun.at(-1)?.[1]).toMatchObject({
      source: 'song',
      ref: 'africa@2',
    });
  });

  it('starts a lesson', async () => {
    const lesson = TUTORIALS[0];
    const outcome = await openSession(
      { kind: 'tutorial', tutorialId: lesson.id },
      { source: 'link' },
    );
    expect(outcome.status).toBe('ready');
    expect(s().activeTutorialId).toBe(lesson.id);
  });

  it('builds a Theory practice track on its practice screen', async () => {
    const outcome = await openSession(
      {
        kind: 'practiceMode',
        mode: 'dorian',
        rootParam: 'd',
        openTrack: 'melody',
        level: 1,
      },
      { source: 'link' },
    );
    expect(outcome.status).toBe('ready');
    expect(s().currentView).toBe('practice');
    expect(s().practiceSession).toMatchObject({
      kind: 'theory',
      mode: 'dorian',
    });
    expect(s().loopEnabled).toBe(true);
  });
});

describe('nothing changes before keeping', () => {
  it('refuses an id that names nothing: same session, drafts and room', async () => {
    await liveWork();
    const before = liveData();
    setEditorUrl('?template=nope&msp=1');

    const outcome = await openSession(
      { kind: 'template', templateId: 'nope' },
      { source: 'link' },
    );

    expect(outcome).toMatchObject({
      status: 'refused',
      error: { kind: 'not-found', surface: 'toast' },
    });
    expect(errorToast).toHaveBeenCalledWith(
      'That template could not be found.',
    );
    expect(liveData()).toBe(before);
    expect(env.drafts.log.filter((e) => !e.startsWith('prepareUser'))).toEqual(
      [],
    );
    expect(s().roomId).toBeNull();
    // The link is consumed, its other keys kept.
    expect(window.location.search).toBe('?msp=1');
  });

  it('carries on with the last session on a cold page', async () => {
    env.drafts.put(makeMeta({ draftId: 'd1' }), draftText('Kept here'));
    const outcome = await openSession(
      { kind: 'demo', demoId: 'nope' },
      { source: 'boot' },
    );
    expect(outcome.status).toBe('refused');
    expect(useSessionStore.getState().draftId).toBe('d1');
    expect(trackNames()).toEqual(['Kept here']);
  });

  it('asks a free student to upgrade for a Premium lesson', async () => {
    await liveWork();
    const before = liveData();
    env.access = 'upgrade';
    const lesson = TUTORIALS[0];
    const outcome = await openSession(
      { kind: 'tutorial', tutorialId: lesson.id },
      { source: 'link' },
    );
    expect(outcome).toEqual({ status: 'upgrade', lessonId: lesson.id });
    expect(useSessionStore.getState().upgradeLessonId).toBe(lesson.id);
    expect(liveData()).toBe(before);
  });

  it('refuses when the outgoing work cannot be kept', async () => {
    await liveWork();
    const before = liveData();
    env.drafts.flushError = new DraftStorageError('quota', 'full');
    const outcome = await openSession({ kind: 'new' }, { source: 'menu' });
    expect(outcome).toMatchObject({
      status: 'refused',
      error: { kind: 'storage' },
    });
    expect(errorToast).toHaveBeenCalledWith(
      "Your current work couldn't be set aside on this device, so it's still open. Save it, then try again.",
    );
    expect(liveData()).toBe(before);
    expect(indexOf('activate:')).toBe(-1);
    expect(env.drafts.released.length).toBe(1);
  });

  it('refuses a link while the tab is in a room', async () => {
    await liveWork();
    s()._setRoomInfo('room1', 'editor', 'room1');
    s()._setConnectionStatus('connected');
    const outcome = await openSession(
      { kind: 'template', templateId: 'project-pop' },
      { source: 'link' },
    );
    expect(outcome).toMatchObject({
      status: 'refused',
      error: { kind: 'in-room' },
    });
    expect(errorToast).toHaveBeenCalledWith('Leave the shared session first');
    expect(s().roomId).toBe('room1');
    expect(trackNames()).toEqual(['Mine']);
  });

  it('carries on in the room a link names when the tab is in it', async () => {
    await liveWork();
    s()._setRoomInfo('room1', 'editor', 'room1');
    s()._setConnectionStatus('connected');
    const outcome = await openSession(
      {
        kind: 'collab',
        code: 'ROOM1',
        host: false,
        jamImport: false,
        awaitHost: true,
      },
      { source: 'link' },
    );
    expect(outcome.status).toBe('ready');
    expect(env.collab.joinRoomAwaitingHost).not.toHaveBeenCalled();
  });
});

describe('waiting', () => {
  it('waits for the sign-in token, then opens the project', async () => {
    await liveWork();
    env.token = null;
    getProject.mockResolvedValue(cloudProject('Cloud'));
    const pending = openSession(
      { kind: 'project', projectId: 'p1' },
      { source: 'link' },
    );
    await vi.waitFor(() =>
      expect(useSessionStore.getState().waitingFor).toBe('token'),
    );
    expect(useSessionStore.getState().label).toBe('Signing you in…');
    env.token = 'token-2';
    notifySessionDepsChanged();
    const outcome = await pending;
    expect(outcome.status).toBe('ready');
    expect(trackNames()).toEqual(['Cloud']);
    expect(useCloudSaveStore.getState().lastSaved).toMatchObject({
      projectId: 'p1',
    });
  });

  it('gives up after 15 s with the panel and a Retry', async () => {
    await liveWork();
    vi.useFakeTimers();
    env.token = null;
    const pending = openSession(
      { kind: 'project', projectId: 'p1' },
      { source: 'link' },
    );
    await vi.advanceTimersByTimeAsync(15_100);
    const outcome = await pending;
    expect(outcome).toMatchObject({
      status: 'refused',
      error: { kind: 'timeout', surface: 'panel', retryable: true },
    });
    expect(useSessionStore.getState()).toMatchObject({
      error: { kind: 'timeout' },
      retryIntent: { kind: 'project', projectId: 'p1' },
      overlay: 'none',
    });
    vi.useRealTimers();
    env.token = 'token-3';
    getProject.mockResolvedValue(cloudProject('Cloud'));
    const retried = await retryOpen();
    expect(retried?.status).toBe('ready');
    expect(useSessionStore.getState().error).toBeNull();
  });

  it('shows the overlay after 250 ms, and Cancel after 3 s', async () => {
    await liveWork();
    vi.useFakeTimers();
    hangingGet();
    const pending = openSession(
      { kind: 'project', projectId: 'p1' },
      { source: 'link' },
    );
    await vi.advanceTimersByTimeAsync(10);
    expect(useSessionStore.getState().overlay).toBe('none');
    await vi.advanceTimersByTimeAsync(300);
    expect(useSessionStore.getState().overlay).toBe('full');
    expect(useSessionStore.getState().cancellable).toBe(false);
    await vi.advanceTimersByTimeAsync(3_000);
    expect(useSessionStore.getState().cancellable).toBe(true);
    cancelOpen();
    const outcome = await pending;
    expect(outcome).toEqual({ status: 'cancelled' });
    expect(useSessionStore.getState()).toMatchObject({
      overlay: 'none',
      phase: 'ready',
    });
    expect(trackNames()).toEqual(['Mine']);
  });

  it('dims at once on the first cold boot', async () => {
    hangingGet();
    const pending = openSession(
      { kind: 'project', projectId: 'p1' },
      { source: 'boot' },
    );
    await vi.waitFor(() => expect(getProject).toHaveBeenCalled());
    expect(useSessionStore.getState().overlay).toBe('dim');
    cancelOpen();
    expect((await pending).status).toBe('cancelled');
    // A cold page carries on with its last session.
    expect(useSessionStore.getState().draftId).not.toBeNull();
  });
});

describe('supersede', () => {
  it('a newer open aborts one still preparing and releases its claim', async () => {
    await liveWork();
    let signal: AbortSignal | undefined;
    getProject.mockImplementation((_t, _id, opts) => {
      signal = opts?.signal;
      return new Promise((_resolve, reject) => {
        opts?.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        );
      });
    });
    const first = openSession(
      { kind: 'project', projectId: 'p1' },
      { source: 'link' },
    );
    await vi.waitFor(() => expect(getProject).toHaveBeenCalled());
    const second = openSession(
      { kind: 'template', templateId: 'project-pop' },
      { source: 'menu' },
    );
    const [a, b] = await Promise.all([first, second]);
    expect(a).toEqual({ status: 'superseded' });
    expect(b.status).toBe('ready');
    expect(signal?.aborted).toBe(true);
    // Kept once, by the open that switched.
    expect(env.drafts.log.filter((e) => e === 'retire:auto')).toHaveLength(1);
  });

  it('a newer open queues behind one that is keeping', async () => {
    await liveWork();
    useCloudSaveStore.setState({ inFlight: 1 });
    const first = openSession({ kind: 'new' }, { source: 'menu' });
    await vi.waitFor(() =>
      expect(useSessionStore.getState().waitingFor).toBe('save'),
    );
    const finishSave = () => useCloudSaveStore.setState({ inFlight: 0 });
    const second = openSession(
      { kind: 'template', templateId: 'project-pop' },
      { source: 'library' },
    );
    finishSave();
    const [a, b] = await Promise.all([first, second]);
    expect(a.status).toBe('ready');
    expect(b.status).toBe('ready');
    expect(
      env.drafts.log.filter((e) => e.startsWith('activate:')),
    ).toHaveLength(2);
  });
});

describe('collab', () => {
  it('leaves the room before the reset: nothing reaches the shared document', async () => {
    await liveWork();
    s()._setRoomInfo('room1', 'editor', 'room1');
    s()._setConnectionStatus('connected');
    const bridge = installStubBridge();
    try {
      const outcome = await openSession(
        { kind: 'new' },
        { source: 'leave-collab', keep: 'auto' },
      );
      expect(outcome.status).toBe('ready');
      expect(bridge.writes()).toBe(0);
    } finally {
      bridge.detach();
    }
    // Left while the project was still the room's.
    expect(env.drafts.log).toContain('leaveRoom:tracks=1');
    expect(indexOf('leaveRoom')).toBeLessThan(indexOf('activate:'));
    expect(s().roomId).toBeNull();
    expect(trackNames()).toEqual([]);
  });

  it('a joiner waits for the first sync, then begins its draft in the room', async () => {
    await liveWork();
    const pending = openSession(
      {
        kind: 'collab',
        code: 'Room42',
        host: false,
        jamImport: false,
        awaitHost: true,
      },
      { source: 'link' },
    );
    await vi.waitFor(() =>
      expect(env.collab.joinRoomAwaitingHost).toHaveBeenCalledWith('Room42'),
    );
    expect(useSessionStore.getState().waitingFor).toBe('host');
    expect(useSessionStore.getState().phase).toBe('loading');
    env.collab.connect();
    const outcome = await pending;
    expect(outcome.status).toBe('ready');
    expect(env.drafts.begun.at(-1)?.[2]).toEqual({ roomId: 'room42' });
    expect(useSessionStore.getState().roomId).toBe('room42');
    // In a room, the kept toast offers no Restore.
    const kept = notice.mock.calls.find(
      ([m]) => m === 'Your previous work was kept',
    );
    expect(kept?.[1]?.action?.label).toBe('View');
    expect(kept?.[1]?.secondaryAction).toBeUndefined();
  });

  it('a joiner whose room is gone gets the kept work back under the panel', async () => {
    await liveWork();
    const pending = openSession(
      {
        kind: 'collab',
        code: 'room42',
        host: false,
        jamImport: false,
        awaitHost: false,
      },
      { source: 'toolbar' },
    );
    await vi.waitFor(() => expect(env.collab.joinRoomById).toHaveBeenCalled());
    env.collab.fail(
      'That room is not active. Check the room id and try again.',
    );
    const outcome = await pending;
    expect(outcome).toMatchObject({
      status: 'failed',
      restored: 'kept',
      error: { kind: 'session-ended', surface: 'panel' },
    });
    expect(trackNames()).toEqual(['Mine']);
    expect(env.drafts.log).toContain(
      `unkeep:${outcome.status === 'failed' ? useSessionStore.getState().draftId : ''}`,
    );
    expect(useSessionStore.getState().error?.kind).toBe('session-ended');
  });

  it("'Back to my work' during the host wait reopens the kept work", async () => {
    const liveId = await liveWork();
    const pending = openSession(
      {
        kind: 'collab',
        code: 'room42',
        host: false,
        jamImport: false,
        awaitHost: true,
      },
      { source: 'link' },
    );
    await vi.waitFor(() =>
      expect(useSessionStore.getState().waitingFor).toBe('host'),
    );
    await backToMyWork();
    const outcome = await pending;
    expect(outcome).toEqual({ status: 'cancelled' });
    expect(useSessionStore.getState().draftId).toBe(liveId);
    expect(useSessionStore.getState().error).toBeNull();
    expect(trackNames()).toEqual(['Mine']);
    expect(s().roomId).toBeNull();
  });

  it('a newer open ends a collab load: the room is left, the older superseded', async () => {
    await liveWork();
    const first = openSession(
      {
        kind: 'collab',
        code: 'room42',
        host: false,
        jamImport: false,
        awaitHost: true,
      },
      { source: 'link' },
    );
    await vi.waitFor(() =>
      expect(useSessionStore.getState().waitingFor).toBe('host'),
    );
    const second = openSession(
      { kind: 'template', templateId: 'project-pop' },
      { source: 'menu' },
    );
    const [a, b] = await Promise.all([first, second]);
    expect(a).toEqual({ status: 'superseded' });
    expect(b.status).toBe('ready');
    expect(s().roomId).toBeNull();
    // The work kept before the join is still announced.
    expect(notice).toHaveBeenCalledWith(
      'Your previous work was kept',
      expect.objectContaining({ description: 'Mine project' }),
    );
  });

  it('starts a new room and asks for the Invite modal', async () => {
    const outcome = await openSession(
      {
        kind: 'collab',
        code: 'new',
        host: false,
        jamImport: false,
        awaitHost: false,
      },
      { source: 'link' },
    );
    expect(outcome.status).toBe('ready');
    expect(env.collab.createAndJoinRoom).toHaveBeenCalled();
    expect(s().inviteRequested).toBe(true);
    expect(env.drafts.begun.at(-1)?.[2]).toEqual({ roomId: 'abcd1234' });
  });

  it('a return clears a room identity that is not the live session’s', async () => {
    await liveWork();
    s()._setRoomInfo('room1', 'editor', 'room1');
    s()._setConnectionStatus('disconnected');
    const outcome = await openSession({ kind: 'resume' }, { source: 'boot' });
    expect(outcome.status).toBe('ready');
    expect(env.collab.leaveRoom).toHaveBeenCalled();
    expect(env.collab.joinRoomById).not.toHaveBeenCalled();
    expect(s().roomId).toBeNull();
    expect(trackNames()).toEqual(['Mine']);
  });

  it('a return rejoins the room the live session was opened in', async () => {
    await liveWork();
    s()._setRoomInfo('room1', 'editor', 'room1');
    s()._setConnectionStatus('disconnected');
    useSessionStore.setState({ roomId: 'room1' });
    const pending = openSession({ kind: 'resume' }, { source: 'boot' });
    await vi.waitFor(() =>
      expect(env.collab.joinRoomById).toHaveBeenCalledWith('room1', 'editor'),
    );
    env.collab.connect();
    const outcome = await pending;
    expect(outcome.status).toBe('ready');
    expect(env.drafts.log).not.toContain('retire:auto');
    expect(trackNames()).toEqual(['Mine']);
  });

  it('a host never rejoins a room it left', async () => {
    await liveWork();
    s()._setRoomInfo('room1', 'owner', 'room1');
    s()._setConnectionStatus('disconnected');
    useSessionStore.setState({ roomId: 'room1' });
    await openSession({ kind: 'resume' }, { source: 'boot' });
    expect(env.collab.joinRoomById).not.toHaveBeenCalled();
    expect(s().roomId).toBeNull();
  });
});

describe('a failure after the switch', () => {
  it('reopens the kept work under the panel', async () => {
    await liveWork();
    getProject.mockResolvedValue({
      ...cloudProject('Broken'),
      tracks: null,
    } as unknown as Awaited<ReturnType<typeof studioProjectsApi.get>>);
    const outcome = await openSession(
      { kind: 'project', projectId: 'p1' },
      { source: 'menu' },
    );
    expect(outcome).toMatchObject({
      status: 'failed',
      restored: 'kept',
      error: { surface: 'panel' },
    });
    expect(trackNames()).toEqual(['Mine']);
    expect(useSessionStore.getState().phase).toBe('failed');
    expect(useSessionStore.getState().overlay).toBe('none');
  });

  it('starts an empty project when there was no work to keep', async () => {
    await openSession({ kind: 'new' }, { source: 'menu' });
    getProject.mockResolvedValue({
      ...cloudProject('Broken'),
      tracks: null,
    } as unknown as Awaited<ReturnType<typeof studioProjectsApi.get>>);
    const outcome = await openSession(
      { kind: 'project', projectId: 'p1' },
      { source: 'menu' },
    );
    expect(outcome).toMatchObject({ status: 'failed', restored: 'empty' });
    expect(trackNames()).toEqual([]);
    expect(env.drafts.begun.at(-1)?.[1].source).toBe('empty');
  });
});

describe('?project= with unsaved changes on this device (E11)', () => {
  const localDraft = (updatedAt: string) =>
    makeMeta({
      draftId: 'local-1',
      projectId: 'p1',
      name: 'Local',
      cloud: {
        projectId: 'p1',
        updatedAt,
        savedFingerprint: 'h1:saved',
        savedComplete: true,
        savedAt: 1,
      },
    });

  it('opens the draft when the server copy is unchanged since', async () => {
    await liveWork();
    const meta = localDraft('2026-10-01T10:00:00Z');
    env.drafts.put(meta, draftText('Local edits'));
    env.drafts.projectDraft = meta;
    getProject.mockResolvedValue(cloudProject('Cloud'));

    const outcome = await openSession(
      { kind: 'project', projectId: 'p1' },
      { source: 'link' },
    );
    expect(outcome).toMatchObject({ status: 'ready', draftId: 'local-1' });
    expect(trackNames()).toEqual(['Local edits']);
    const opened = notice.mock.calls.find(
      ([m]) => m === 'Opened your unsaved changes',
    );
    expect(opened?.[1]?.action?.label).toBe('Open saved version');

    // 'Open saved version' opens the cloud copy, keeping the draft.
    opened?.[1]?.action?.onClick();
    await vi.waitFor(() => expect(trackNames()).toEqual(['Cloud']));
    expect(env.drafts.findProjectDraft).toHaveBeenCalledTimes(1);
  });

  it('opens the cloud copy when the server moved on, and keeps the draft', async () => {
    await liveWork();
    const meta = localDraft('2026-09-01T00:00:00Z');
    env.drafts.put(meta, draftText('Local edits'));
    env.drafts.projectDraft = meta;
    getProject.mockResolvedValue(cloudProject('Cloud'));

    const outcome = await openSession(
      { kind: 'project', projectId: 'p1' },
      { source: 'link' },
    );
    expect(outcome.status).toBe('ready');
    expect(trackNames()).toEqual(['Cloud']);
    expect(env.drafts.drafts.has('local-1')).toBe(true);
    const kept = notice.mock.calls.find(
      ([m]) => m === 'Changes on this device weren’t saved — kept',
    );
    kept?.[1]?.action?.onClick();
    expect(env.openProjectsDialog).toHaveBeenCalledWith({
      focusDraftId: 'local-1',
    });
  });

  it('opens the draft when offline', async () => {
    await liveWork();
    const meta = localDraft('2026-09-01T00:00:00Z');
    env.drafts.put(meta, draftText('Local edits'));
    env.drafts.projectDraft = meta;
    getProject.mockRejectedValue(
      new StudioApiError({
        status: 0,
        method: 'GET',
        path: '/p1',
        message: 'network',
      }),
    );
    const outcome = await openSession(
      { kind: 'project', projectId: 'p1' },
      { source: 'link' },
    );
    expect(outcome).toMatchObject({ status: 'ready', draftId: 'local-1' });
    expect(trackNames()).toEqual(['Local edits']);
  });

  it('offline with no draft: the panel, nothing changed', async () => {
    await liveWork();
    getProject.mockRejectedValue(
      new StudioApiError({
        status: 0,
        method: 'GET',
        path: '/p1',
        message: 'x',
      }),
    );
    const outcome = await openSession(
      { kind: 'project', projectId: 'p1' },
      { source: 'link' },
    );
    expect(outcome).toMatchObject({
      status: 'refused',
      error: { kind: 'offline', surface: 'panel' },
    });
    expect(useSessionStore.getState().error?.kind).toBe('offline');
    expect(trackNames()).toEqual(['Mine']);
  });

  it('a project that is gone is a toast', async () => {
    await liveWork();
    getProject.mockRejectedValue(
      new StudioApiError({
        status: 404,
        method: 'GET',
        path: '/p1',
        message: 'x',
      }),
    );
    const outcome = await openSession(
      { kind: 'project', projectId: 'p1' },
      { source: 'link' },
    );
    expect(outcome).toMatchObject({
      status: 'refused',
      error: { kind: 'not-found', surface: 'toast' },
    });
    expect(errorToast).toHaveBeenCalledWith('That project could not be found.');
  });

  it('does nothing when the live session already is the project, unchanged', async () => {
    getProject.mockResolvedValue(cloudProject('Cloud'));
    await openSession({ kind: 'project', projectId: 'p1' }, { source: 'link' });
    env.drafts.log.length = 0;
    vi.mocked(env.drafts.findProjectDraft).mockClear();
    const outcome = await openSession(
      { kind: 'project', projectId: 'p1' },
      { source: 'link' },
    );
    expect(outcome.status).toBe('ready');
    expect(env.drafts.log).not.toContain('retire:auto');
    expect(env.drafts.findProjectDraft).not.toHaveBeenCalled();
  });
});

describe('recordings and saves finish first', () => {
  it('stops a take and waits for it to be committed', async () => {
    await liveWork();
    useStore.setState({ isRecording: true, isPlaying: true });
    const settle = beginTake('midi');
    const stop = vi.spyOn(useStore.getState(), 'stop');
    const pending = openSession({ kind: 'new' }, { source: 'menu' });
    await vi.waitFor(() =>
      expect(useSessionStore.getState().waitingFor).toBe('take'),
    );
    expect(useSessionStore.getState().label).toBe('Finishing your recording…');
    expect(stop).toHaveBeenCalled();
    settle();
    expect((await pending).status).toBe('ready');
  });

  it("refuses as 'busy' when the take doesn't finish in 10 s", async () => {
    await liveWork();
    vi.useFakeTimers();
    const settle = beginTake('audio');
    const pending = openSession({ kind: 'new' }, { source: 'menu' });
    await vi.advanceTimersByTimeAsync(10_200);
    const outcome = await pending;
    settle();
    expect(outcome).toMatchObject({
      status: 'refused',
      error: { kind: 'busy' },
    });
    expect(errorToast).toHaveBeenCalledWith(
      'Finishing your recording, try again',
    );
    expect(trackNames()).toEqual(['Mine']);
  });

  it('waits for a save in flight', async () => {
    await liveWork();
    useCloudSaveStore.setState({ inFlight: 1 });
    const pending = openSession({ kind: 'new' }, { source: 'menu' });
    await vi.waitFor(() =>
      expect(useSessionStore.getState().label).toBe('Finishing your save…'),
    );
    expect(indexOf('flush:')).toBe(-1);
    useCloudSaveStore.setState({ inFlight: 0 });
    expect((await pending).status).toBe('ready');
  });
});

describe('the editor closing mid-open', () => {
  it('cancels an open still preparing and releases its claim', async () => {
    await liveWork();
    let resolveGet!: (
      v: Awaited<ReturnType<typeof studioProjectsApi.get>>,
    ) => void;
    getProject.mockImplementation(
      () => new Promise((resolve) => (resolveGet = resolve)),
    );
    const pending = openSession(
      { kind: 'project', projectId: 'p1' },
      { source: 'menu' },
    );
    await vi.waitFor(() => expect(getProject).toHaveBeenCalled());
    env.unregister();
    resolveGet(cloudProject('Cloud'));
    const outcome: OpenOutcome = await pending;
    expect(outcome).toEqual({ status: 'cancelled' });
    expect(env.drafts.released).toHaveLength(1);
    expect(trackNames()).toEqual(['Mine']);
  });

  it('finishes a load already switched without URL changes or toasts', async () => {
    await liveWork();
    setEditorUrl('?template=project-pop');
    const pending = openSession(
      {
        kind: 'collab',
        code: 'room42',
        host: false,
        jamImport: false,
        awaitHost: true,
      },
      { source: 'link' },
    );
    await vi.waitFor(() =>
      expect(useSessionStore.getState().waitingFor).toBe('host'),
    );
    env.unregister();
    notice.mockClear();
    env.collab.connect();
    expect((await pending).status).toBe('ready');
    expect(env.navigate).not.toHaveBeenCalled();
    expect(notice).not.toHaveBeenCalled();
  });
});

describe('notices', () => {
  it('tells the cold boot’s notices once per user', async () => {
    env.drafts.notices = [{ kind: 'quarantined', count: 2 }];
    await openSession({ kind: 'resume' }, { source: 'boot' });
    expect(notice).toHaveBeenCalledWith(
      "2 drafts couldn't be opened",
      expect.anything(),
    );
    notice.mockClear();
    await openSession({ kind: 'new' }, { source: 'menu' });
    expect(notice).not.toHaveBeenCalledWith(
      "2 drafts couldn't be opened",
      expect.anything(),
    );
  });

  it('tells of unsaved work in another draft after a cold link, once per tab', async () => {
    env.drafts.put(
      makeMeta({ draftId: 'older', name: 'Older work', updatedAt: Date.now() }),
      draftText('Older'),
    );
    await openSession(
      { kind: 'template', templateId: 'project-pop' },
      { source: 'boot' },
    );
    await vi.waitFor(() =>
      expect(notice).toHaveBeenCalledWith(
        expect.stringMatching(/^Unsaved work from .+ is in Projects$/),
        expect.objectContaining({ description: 'Older work' }),
      ),
    );
    expect(
      JSON.parse(
        sessionStorage.getItem('musicAtlas:daw:noticedDrafts') ?? '[]',
      ),
    ).toEqual(['older']);
  });
});

describe('the session always has a draft', () => {
  it('a retire that fails after the flush still switches, keeping the flushed work', async () => {
    const liveId = await liveWork();
    vi.mocked(env.drafts.retireOutgoing).mockRejectedValueOnce(
      new DraftStorageError('quota', 'full'),
    );
    const outcome = await openSession({ kind: 'new' }, { source: 'menu' });
    expect(outcome).toMatchObject({
      status: 'ready',
      kept: { draftId: liveId },
    });
    expect(useSessionStore.getState().draftId).not.toBe(liveId);
    // The fake's flushed meta has the default name; Restore reopens it.
    const kept = notice.mock.calls.find(
      ([m]) => m === 'Your previous work was kept',
    );
    expect(kept?.[1]?.action?.label).toBe('Restore');
    expect(errorToast).not.toHaveBeenCalled();
  });

  it('a cold page whose sign-in timed out resumes from Back to my work', async () => {
    vi.useFakeTimers();
    env.user = null;
    const pending = openSession(
      { kind: 'project', projectId: 'p1' },
      { source: 'boot' },
    );
    await vi.advanceTimersByTimeAsync(15_100);
    expect((await pending).status).toBe('refused');
    expect(useSessionStore.getState()).toMatchObject({
      draftId: null,
      error: { kind: 'timeout' },
    });
    vi.useRealTimers();
    env.user = { userId: 'student-a', userKey: 'student-a' };
    const back = await backToMyWork();
    expect(back?.status).toBe('ready');
    expect(useSessionStore.getState().draftId).not.toBeNull();
    expect(useSessionStore.getState().error).toBeNull();
    expect(env.drafts.begun).toHaveLength(1);
  });

  it('a resume is never cancellable', async () => {
    vi.useFakeTimers();
    env.user = null;
    const pending = openSession({ kind: 'resume' }, { source: 'boot' });
    await vi.advanceTimersByTimeAsync(3_200);
    expect(useSessionStore.getState().cancellable).toBe(false);
    cancelOpen();
    env.user = { userId: 'student-a', userKey: 'student-a' };
    notifySessionDepsChanged();
    await vi.advanceTimersByTimeAsync(10);
    vi.useRealTimers();
    expect((await pending).status).toBe('ready');
  });

  it('a failed reopen whose fallback claim fails never empties the draft', async () => {
    const text = 'not a session';
    env.drafts.put(makeMeta({ draftId: 'd1', name: 'Stored' }), text);
    const claim = env.drafts.claim;
    const real = vi.mocked(claim).getMockImplementation()!;
    vi.mocked(claim).mockImplementation(async (user, target, signal) => {
      if (!target.draftId) throw new DraftStorageError('unavailable', 'x');
      return real(user, target, signal);
    });
    const outcome = await openSession(
      { kind: 'draft', draftId: 'd1' },
      { source: 'dialog' },
    );
    expect(outcome).toMatchObject({ status: 'failed', restored: 'empty' });
    expect(env.drafts.begun).toEqual([]);
    expect(env.drafts.drafts.get('d1')?.text).toBe(text);
    expect(useSessionStore.getState()).toMatchObject({
      draftId: null,
      error: { surface: 'panel' },
    });
  });
});

describe('review fixes: collab loads, users, deps', () => {
  const joinerLink = {
    kind: 'collab',
    code: 'room42',
    host: false,
    jamImport: false,
    awaitHost: true,
  } as const;

  it('an invalid link during a host wait does not end the join', async () => {
    await liveWork();
    const first = openSession(joinerLink, { source: 'link' });
    await vi.waitFor(() =>
      expect(useSessionStore.getState().waitingFor).toBe('host'),
    );
    const second = openSession(
      { kind: 'template', templateId: 'no-such-template' },
      { source: 'link' },
    );
    env.collab.connect();
    const [a, b] = await Promise.all([first, second]);
    expect(a.status).toBe('ready');
    expect(b.status).toBe('refused');
    expect(s().roomId).toBe('room42');
  });

  it('a return to the editor during a host wait does not end the join', async () => {
    await liveWork();
    const first = openSession(joinerLink, { source: 'link' });
    await vi.waitFor(() =>
      expect(useSessionStore.getState().waitingFor).toBe('host'),
    );
    const second = openSession({ kind: 'resume' }, { source: 'boot' });
    env.collab.connect();
    const [a, b] = await Promise.all([first, second]);
    expect(a.status).toBe('ready');
    expect(b.status).toBe('ready');
    expect(s().roomId).toBe('room42');
  });

  it('kept work a collab load carried is told even when the newer open is refused', async () => {
    await liveWork();
    getProject.mockRejectedValue(
      new StudioApiError({
        status: 404,
        method: 'GET',
        path: '/p1',
        message: 'x',
      }),
    );
    const first = openSession(joinerLink, { source: 'link' });
    await vi.waitFor(() =>
      expect(useSessionStore.getState().waitingFor).toBe('host'),
    );
    const second = openSession(
      { kind: 'project', projectId: 'p1' },
      { source: 'menu' },
    );
    const [a, b] = await Promise.all([first, second]);
    expect(a).toEqual({ status: 'superseded' });
    expect(b.status).toBe('refused');
    expect(notice).toHaveBeenCalledWith(
      'Your previous work was kept',
      expect.objectContaining({ description: 'Mine project' }),
    );
  });

  it("another user never hears of the previous user's kept work", async () => {
    await liveWork('Alice');
    env.drafts.notices = [{ kind: 'quarantined', count: 1 }];
    env.user = { userId: 'student-b', userKey: 'student-b' };
    const outcome = await openSession({ kind: 'resume' }, { source: 'boot' });
    expect(outcome.status).toBe('ready');
    const told = notice.mock.calls.map(([m, o]) => [m, o?.description]);
    expect(told).not.toContainEqual([
      'Your previous work was kept',
      'Alice project',
    ]);
    expect(notice).toHaveBeenCalledWith(
      "1 draft couldn't be opened",
      expect.anything(),
    );
  });

  it('deps registered again during the token wait: the open still finishes', async () => {
    await liveWork();
    setEditorUrl('?collab=new');
    env.token = null;
    const pending = openSession(
      {
        kind: 'collab',
        code: 'new',
        host: false,
        jamImport: false,
        awaitHost: false,
      },
      { source: 'link' },
    );
    await vi.waitFor(() =>
      expect(useSessionStore.getState().waitingFor).toBe('token'),
    );
    // DawApp's effect re-runs: cleanup then setup, a new deps object.
    env.unregister();
    env.unregister = registerSessionDeps({ ...env.deps });
    env.token = 'token-9';
    notifySessionDepsChanged();
    const outcome = await pending;
    expect(outcome.status).toBe('ready');
    expect(s().inviteRequested).toBe(true);
    expect(window.location.search).toBe('');
  });

  it("refuses a link while the live session's room reconnects", async () => {
    await liveWork();
    s()._setRoomInfo('room1', 'editor', 'room1');
    s()._setConnectionStatus('disconnected');
    useSessionStore.setState({ roomId: 'room1' });
    const outcome = await openSession(
      { kind: 'template', templateId: 'project-pop' },
      { source: 'link' },
    );
    expect(outcome).toMatchObject({
      status: 'refused',
      error: { kind: 'in-room' },
    });
    expect(s().roomId).toBe('room1');
    expect(env.collab.leaveRoom).not.toHaveBeenCalled();
  });

  it('an editor gone before keeping cancels a room join: nothing changed', async () => {
    await liveWork();
    useCloudSaveStore.setState({ inFlight: 1 });
    const pending = openSession(joinerLink, { source: 'link' });
    await vi.waitFor(() =>
      expect(useSessionStore.getState().waitingFor).toBe('save'),
    );
    env.unregister();
    useCloudSaveStore.setState({ inFlight: 0 });
    expect(await pending).toEqual({ status: 'cancelled' });
    expect(env.drafts.log).not.toContain('retire:auto');
    expect(env.collab.joinRoomAwaitingHost).not.toHaveBeenCalled();
    expect(trackNames()).toEqual(['Mine']);
  });

  it("a superseded link's keys go when the open that replaced it ends", async () => {
    await liveWork();
    setEditorUrl('?project=p1&msp=1');
    hangingGet();
    const first = openSession(
      { kind: 'project', projectId: 'p1' },
      { source: 'link' },
    );
    await vi.waitFor(() => expect(getProject).toHaveBeenCalled());
    const second = openSession(
      { kind: 'template', templateId: 'project-pop' },
      { source: 'menu' },
    );
    const [a, b] = await Promise.all([first, second]);
    expect(a).toEqual({ status: 'superseded' });
    expect(b.status).toBe('ready');
    expect(window.location.search).toBe('?msp=1');
  });
});
