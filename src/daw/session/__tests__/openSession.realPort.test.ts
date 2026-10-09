// @vitest-environment jsdom
/**
 * openSession over the REAL DraftSessionPort (autosave.ts) and draft store
 * (fake-indexeddb), where the order of openSession's calls matters in ways
 * the fake port in fakes.ts can't show:
 * - a ?project= open stores the server's cloud record on its draft (set
 *   after begin, so E11 can later find "unchanged since");
 * - a keep whose retire fails after the flush still leaves the session
 *   with a live draft whose edits are written.
 *
 * Run: npx vitest run src/daw/session/__tests__/openSession.realPort.test.ts
 */
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { useCloudSaveStore } from '@/daw/commands/cloudSaveStore';
import { useSynthStore } from '@/daw/oracle-synth/store';
import {
  flushDraftNow,
  resetDraftAutosaveForTests,
  setDraftStoreForTests,
  startDraftAutosave,
  whenDraftWritesSettled,
} from '@/daw/persistence/drafts/autosave';
import {
  getDraftSessionPort,
  resetDraftSessionPortForTests,
} from '@/daw/persistence/drafts/draftSessionPort';
import { useDraftStatusStore } from '@/daw/persistence/drafts/draftStatusStore';
import { resetPendingMediaForTests } from '@/daw/persistence/drafts/pendingMedia';
import { useStore } from '@/daw/store';
import { setDefaultLockManager } from '@/lib/studio-projects/drafts/draftLock';
import {
  createDraftStore,
  type DraftStore,
} from '@/lib/studio-projects/drafts/draftStore';
import { DraftStorageError } from '@/lib/studio-projects/drafts/types';
import { MemoryStorage } from '@/lib/studio-projects/drafts/__tests__/draftTestUtils';
import { createFakeLockManager } from '@/lib/studio-projects/drafts/__tests__/fakeLocks';
import { studioProjectsApi } from '@/lib/studio-projects/projectsClient';
import { showNotice } from '@/util/toast';
import { openSession, resetOpenSessionForTests } from '../openSession';
import { registerSessionDeps } from '../sessionDeps';
import { resetSessionNoticesForTests } from '../sessionNotices';
import { INITIAL_SESSION_STATE, useSessionStore } from '../sessionStore';
import type { SessionUser } from '../types';
import { createFakeCollab, setEditorUrl } from './fakes';

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

const USER: SessionUser = { userId: 'student-1', userKey: 'student-1' };
const port = getDraftSessionPort();
const s = () => useStore.getState();
const getProject = vi.mocked(studioProjectsApi.get);

let store: DraftStore;
let stopController: (() => void) | null = null;
let unregister: () => void = () => {};

beforeAll(() => {
  (globalThis as { IDBKeyRange?: unknown }).IDBKeyRange = IDBKeyRange;
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  const locks = createFakeLockManager();
  setDefaultLockManager(() => locks);
  resetOpenSessionForTests();
  resetSessionNoticesForTests();
  resetDraftAutosaveForTests();
  resetDraftSessionPortForTests();
  resetPendingMediaForTests();
  useDraftStatusStore.setState(useDraftStatusStore.getInitialState(), true);
  useSessionStore.setState({ ...INITIAL_SESSION_STATE }, true);
  useCloudSaveStore.setState(useCloudSaveStore.getInitialState(), true);
  useSynthStore.setState(useSynthStore.getInitialState(), true);
  useStore.setState(useStore.getInitialState(), true);
  store = createDraftStore({
    indexedDB: new IDBFactory(),
    storage: new MemoryStorage(),
  });
  setDraftStoreForTests(store);
  stopController = startDraftAutosave();
  setEditorUrl('');
  unregister = registerSessionDeps({
    user: () => USER,
    token: () => 'token-1',
    lessonAccess: () => 'open',
    collab: createFakeCollab(),
    drafts: port,
    navigate: (search) =>
      window.history.replaceState(null, '', `/studio/editor${search}`),
    openProjectsDialog: () => {},
  });
});

afterEach(async () => {
  unregister();
  stopController?.();
  stopController = null;
  await whenDraftWritesSettled();
  resetDraftAutosaveForTests();
  setDraftStoreForTests(null);
  setDefaultLockManager(null);
  vi.clearAllMocks();
});

function cloudProject(updatedAt: string) {
  return {
    id: 'p1',
    name: 'Cloud project',
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
        name: 'Cloud',
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

describe('openSession over the real draft port', () => {
  it("a ?project= open stores the server's cloud record on its draft", async () => {
    getProject.mockResolvedValue(cloudProject('2026-10-01T10:00:00.000Z'));
    const outcome = await openSession(
      { kind: 'project', projectId: 'p1' },
      { source: 'boot' },
    );
    expect(outcome.status).toBe('ready');
    await whenDraftWritesSettled();
    const draftId = useSessionStore.getState().draftId!;
    const meta = await store.getMeta(draftId);
    expect(meta?.projectId).toBe('p1');
    expect(meta?.cloud).toMatchObject({ projectId: 'p1' });
    expect(Date.parse(meta!.cloud!.updatedAt!)).toBe(
      Date.parse('2026-10-01T10:00:00.000Z'),
    );
  });

  it('a retire that fails after the flush leaves a live draft that keeps writing', async () => {
    const first = await openSession({ kind: 'new' }, { source: 'boot' });
    expect(first.status).toBe('ready');
    const firstId = useSessionStore.getState().draftId!;
    s().addTrack('midi', 'piano-sampler', 'Mine');
    await flushDraftNow();
    await whenDraftWritesSettled();

    const patchMeta = store.patchMeta.bind(store);
    let failed = false;
    store.patchMeta = async (...args) => {
      if (!failed) {
        failed = true;
        throw new DraftStorageError('quota', 'full');
      }
      return patchMeta(...args);
    };
    const second = await openSession(
      { kind: 'template', templateId: 'project-pop' },
      { source: 'menu' },
    );
    store.patchMeta = patchMeta;
    expect(failed).toBe(true);
    expect(second).toMatchObject({
      status: 'ready',
      kept: { draftId: firstId },
    });
    // The session and the port agree on the live draft, and it writes.
    const liveId = useSessionStore.getState().draftId;
    expect(port.activeDraftId()).toBe(liveId);
    expect(liveId).not.toBe(firstId);
    s().setBpm(133);
    await flushDraftNow();
    await whenDraftWritesSettled();
    expect((await store.readBody(liveId!))?.text).toContain('133');
    // The outgoing work is still on the device, with its track.
    expect((await store.readBody(firstId))?.text).toContain('Mine');
    expect(vi.mocked(showNotice)).toHaveBeenCalledWith(
      'Your previous work was kept',
      expect.anything(),
    );
  });
});
