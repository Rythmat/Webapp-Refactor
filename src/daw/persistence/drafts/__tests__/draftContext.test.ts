// @vitest-environment jsdom
/**
 * A draft's lesson and practice context (milestone 1.15): the lesson at its
 * step, the practice session (its student track inside), the practice
 * keyboard and the practice screen ride in the draft's meta, come back only
 * when that same draft opens again, and never with any other open.
 *
 * Opens are driven through the real DraftSessionPort the way openSession
 * drives it (as draftSessionPort.test.ts does): claim and read, keep,
 * reset and activate, apply or seed, baseline and begin. The real editor
 * store, codec and draft store (fake-indexeddb); a "reload" forgets the
 * page and keeps storage.
 *
 * Run: npx vitest run src/daw/persistence/drafts/__tests__/draftContext.test.ts
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
import { getTutorial } from '@/daw/components/Tutorial/tutorials';
import { useCloudSaveStore } from '@/daw/commands/cloudSaveStore';
import { useSynthStore } from '@/daw/oracle-synth/store';
import { resetProjectState } from '@/daw/persistence/projectDocument/initialState';
import { markDocumentBaseline } from '@/daw/persistence/saveStatusStore';
import {
  registerSessionDeps,
  type SessionDeps,
} from '@/daw/session/sessionDeps';
import {
  INITIAL_SESSION_STATE,
  useSessionStore,
} from '@/daw/session/sessionStore';
import type { DraftClaim, SessionUser } from '@/daw/session/types';
import { useStore, type AllSlices } from '@/daw/store';
import type {
  GenrePracticeSession,
  TheoryPracticeSession,
} from '@/daw/store/uiSlice';
import { setDefaultLockManager } from '@/lib/studio-projects/drafts/draftLock';
import {
  createDraftStore,
  type DraftStore,
} from '@/lib/studio-projects/drafts/draftStore';
import type { DraftBaseline } from '@/lib/studio-projects/drafts/types';
import { MemoryStorage } from '@/lib/studio-projects/drafts/__tests__/draftTestUtils';
import { createFakeLockManager } from '@/lib/studio-projects/drafts/__tests__/fakeLocks';
import {
  flushDraftNow,
  resetDraftAutosaveForTests,
  setDraftStoreForTests,
  startDraftAutosave,
  whenDraftWritesSettled,
} from '../autosave';
import {
  draftContextChanged,
  draftContextOf,
  practiceSessionOf,
  restoreDraftContext,
} from '../draftContext';
import {
  getDraftSessionPort,
  resetDraftSessionPortForTests,
} from '../draftSessionPort';
import { useDraftStatusStore } from '../draftStatusStore';
import { resetPendingMediaForTests } from '../pendingMedia';

vi.mock('@/util/toast', () => ({
  showNotice: vi.fn(() => 1),
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

const USER: SessionUser = { userId: 'student-1', userKey: 'student-1' };
const port = getDraftSessionPort();
const s = () => useStore.getState();

let store: DraftStore;
let stopController: (() => void) | null = null;
let access: Record<string, 'open' | 'wait' | 'upgrade'> = {};
let unregister: (() => void) | null = null;

beforeAll(() => {
  (globalThis as { IDBKeyRange?: unknown }).IDBKeyRange = IDBKeyRange;
});

function resetStores(): void {
  useDraftStatusStore.setState(useDraftStatusStore.getInitialState(), true);
  useSessionStore.setState({ ...INITIAL_SESSION_STATE }, true);
  useCloudSaveStore.setState(useCloudSaveStore.getInitialState(), true);
  useSynthStore.setState(useSynthStore.getInitialState(), true);
  useStore.setState(useStore.getInitialState(), true);
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  const locks = createFakeLockManager();
  setDefaultLockManager(() => locks);
  resetDraftAutosaveForTests();
  resetDraftSessionPortForTests();
  resetPendingMediaForTests();
  resetStores();
  store = createDraftStore({
    indexedDB: new IDBFactory(),
    storage: new MemoryStorage(),
  });
  setDraftStoreForTests(store);
  stopController = startDraftAutosave();
  access = {};
  unregister = registerSessionDeps({
    lessonAccess: (id: string) => access[id] ?? 'open',
  } as unknown as SessionDeps);
});

afterEach(async () => {
  unregister?.();
  stopController?.();
  stopController = null;
  await whenDraftWritesSettled();
  resetDraftAutosaveForTests();
  setDraftStoreForTests(null);
  setDefaultLockManager(null);
});

// ── Driving opens the way openSession does ─────────────────────────────────

const SEEDED: DraftBaseline = {
  source: 'template',
  ref: 'project-pop',
  reopenable: true,
  fingerprint: null,
};

async function switchTo(claim: DraftClaim, load: () => void): Promise<string> {
  await port.flushOutgoing('test');
  await port.retireOutgoing('auto');
  resetProjectState('open:test');
  port.activate(claim);
  load();
  markDocumentBaseline({ savedComplete: true });
  await port.begin(SEEDED);
  return claim.draftId;
}

/** A new session seeded by `seed` (a lesson link, a practice track, New). */
async function openNew(seed: () => void): Promise<string> {
  return switchTo(await port.claim(USER, { boot: false }), seed);
}

/** Open a stored draft (a resume, Projects, Restore). */
async function openDraft(draftId: string): Promise<string> {
  const claim = await port.claim(USER, { draftId, boot: false });
  const prepared = await port.read(claim);
  return switchTo(claim, () => port.apply(prepared));
}

async function flush(): Promise<void> {
  await flushDraftNow();
  await whenDraftWritesSettled();
}

/** Forget this page; storage stays, as after a refresh. */
function reload(): void {
  stopController?.();
  resetDraftAutosaveForTests();
  resetDraftSessionPortForTests();
  resetPendingMediaForTests();
  resetStores();
  stopController = startDraftAutosave();
}

const lessonNow = () => ({
  id: s().activeTutorialId,
  step: s().tutorialStepIndex,
});

const LESSON = 'make-first-track';
const OTHER_LESSON = 'jazz-color-your-chords';

const seedLesson = (id: string) => () => {
  s().addTrack('midi', 'soundfont', 'Keys');
  s().startTutorial(id);
};

/** An edit: work to keep. A lesson nobody has touched is dropped when
 *  another session opens, as any untouched session is (milestone 1.4). */
const edit = () => s().setBpm(97);

const theorySession = (studentTrackId?: string): TheoryPracticeSession => ({
  kind: 'theory',
  mode: 'dorian',
  rootParam: 'd',
  level: 2,
  openTrack: 'melody',
  ...(studentTrackId ? { studentTrackId } : {}),
});

const seedPractice = () => {
  s().addTrack('midi', 'soundfont', 'Bass');
  const melody = s().addTrack('midi', 'soundfont', 'Melody');
  s().setPracticeSession(theorySession(melody));
  s().setCurrentView('practice');
};

// ── The lesson ─────────────────────────────────────────────────────────────

describe('a lesson travels with its draft', () => {
  it('a refresh resumes the lesson at its step, its view as the draft kept it', async () => {
    const draftId = await openNew(seedLesson(LESSON));
    s().goToTutorialStep(3);
    // The student's own panel since the step set its up.
    s().setChannelStripTab('fx');
    await flush();
    const meta = await store.getMeta(draftId);
    expect(meta?.context?.tutorial).toEqual({ id: LESSON, stepIndex: 3 });

    reload();
    await openDraft(draftId);
    expect(lessonNow()).toEqual({ id: LESSON, step: 3 });
    // Resumed with its preconditions in place: the layer leaves the tab.
    expect(s().tutorialStepPrepared).toBe(true);
    expect(s().tutorialStepStatus).toBe('waiting');
    expect(s().channelStripTab).toBe('fx');
  });

  it('any other open starts without the lesson, and the draft keeps it', async () => {
    const lessonDraft = await openNew(seedLesson(LESSON));
    s().goToTutorialStep(2);
    edit();
    await flush();

    const other = await openNew(() => s().setProjectName('Something else'));
    expect(lessonNow()).toEqual({ id: null, step: 0 });
    await flush();
    expect((await store.getMeta(other))?.context).toBeUndefined();
    // The lesson draft, kept, still holds its lesson for a Restore.
    expect((await store.getMeta(lessonDraft))?.context?.tutorial).toEqual({
      id: LESSON,
      stepIndex: 2,
    });

    await openDraft(lessonDraft);
    expect(lessonNow()).toEqual({ id: LESSON, step: 2 });
  });

  it('two drafts with different lessons each come back with their own', async () => {
    const first = await openNew(seedLesson(LESSON));
    s().goToTutorialStep(1);
    edit();
    await flush();
    const second = await openNew(seedLesson(OTHER_LESSON));
    s().goToTutorialStep(4);
    edit();
    await flush();

    reload();
    await openDraft(first);
    expect(lessonNow()).toEqual({ id: LESSON, step: 1 });
    await openDraft(second);
    expect(lessonNow()).toEqual({ id: OTHER_LESSON, step: 4 });
  });

  it('Quit takes the lesson out of the draft', async () => {
    const draftId = await openNew(seedLesson(LESSON));
    await flush();
    s().quitTutorial();
    await flush();
    expect((await store.getMeta(draftId))?.context).toBeUndefined();
    reload();
    await openDraft(draftId);
    expect(lessonNow()).toEqual({ id: null, step: 0 });
  });

  it('a step reached is written without counting as an edit', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const draftId = await openNew(seedLesson(LESSON));
      await flush();
      const before = useDraftStatusStore.getState().pendingSeq;
      s().goToTutorialStep(5);
      expect(useDraftStatusStore.getState().pendingSeq).toBe(before);
      await vi.advanceTimersByTimeAsync(2000);
      await whenDraftWritesSettled();
      expect((await store.getMeta(draftId))?.context?.tutorial).toEqual({
        id: LESSON,
        stepIndex: 5,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('leaves out a lesson this build lacks, or one the plan no longer opens', async () => {
    const draftId = await openNew(seedLesson(LESSON));
    await flush();
    const meta = (await store.getMeta(draftId))!;
    await store.write({
      meta: {
        ...meta,
        context: { tutorial: { id: 'a-lesson-from-later', stepIndex: 2 } },
      },
      text: (await store.readBody(draftId))!.text,
      expectedSeq: meta.writeSeq,
    });
    reload();
    await openDraft(draftId);
    expect(lessonNow()).toEqual({ id: null, step: 0 });

    const premium = await openNew(seedLesson(LESSON));
    await flush();
    reload();
    access = { [LESSON]: 'upgrade' };
    await openDraft(premium);
    expect(lessonNow()).toEqual({ id: null, step: 0 });
  });

  it('a step past the lesson’s end resumes at its last step', () => {
    const steps = getTutorial(LESSON)!.steps.length;
    restoreDraftContext({ tutorial: { id: LESSON, stepIndex: 999 } });
    expect(lessonNow()).toEqual({ id: LESSON, step: steps - 1 });
  });
});

// ── The practice screen ────────────────────────────────────────────────────

describe('a practice screen travels with its draft', () => {
  it('a refresh comes back to the practice screen, its session and keyboard', async () => {
    const draftId = await openNew(seedPractice);
    s().setPracticeKeyboard({ scaleId: 'dorian' });
    const session = s().practiceSession;
    await flush();

    reload();
    await openDraft(draftId);
    expect(s().practiceSession).toEqual(session);
    expect(s().practiceKeyboard).toEqual({ view: null, scaleId: 'dorian' });
    expect(s().currentView).toBe('practice');
    expect(s().libraryOpen).toBe(false);
  });

  it('comes back in the Studio when the student had taken it there', async () => {
    const draftId = await openNew(seedPractice);
    s().setCurrentView('score');
    await flush();
    reload();
    await openDraft(draftId);
    expect(s().practiceSession).not.toBeNull();
    expect(s().currentView).toBe('score');
  });

  it('Back to lesson (no session) leaves the practice screen out of the draft', async () => {
    const draftId = await openNew(seedPractice);
    s().setPracticeSession(null);
    s().setCurrentView('arrange');
    await flush();
    expect((await store.getMeta(draftId))?.context).toBeUndefined();
    reload();
    await openDraft(draftId);
    expect(s().practiceSession).toBeNull();
    expect(s().currentView).toBe('arrange');
  });
});

// ── The pieces ─────────────────────────────────────────────────────────────

describe('draftContextOf and draftContextChanged', () => {
  it('records nothing for a session with neither', () => {
    expect(draftContextOf()).toBeUndefined();
  });

  it('records the practice view only with a practice session', () => {
    s().setCurrentView('practice');
    expect(draftContextOf()).toBeUndefined();
    s().setPracticeSession(theorySession());
    expect(draftContextOf()).toEqual({
      practiceSession: theorySession(),
      view: 'practice',
    });
  });

  it('a view change moves the context only with a practice session', () => {
    const prev = s();
    s().setCurrentView('score');
    expect(draftContextChanged(s(), prev)).toBe(false);
    s().setPracticeSession(theorySession());
    const withSession = s();
    s().setCurrentView('arrange');
    expect(draftContextChanged(s(), withSession)).toBe(true);
  });
});

describe('practiceSessionOf', () => {
  const tracks = (ids: string[]) =>
    ids.map(
      (id) => ({ id, type: 'midi' }) as unknown as AllSlices['tracks'][0],
    );

  const genre = (): GenrePracticeSession => ({
    kind: 'genre',
    genre: 'funk',
    genreLabel: 'Funk',
    level: 2,
    section: 'A',
    sectionName: 'Melody',
    keyLabel: 'A',
    scales: [
      {
        id: 'dorian',
        title: 'Dorian',
        intervals: [0, 2, 3, 5, 7, 9, 10],
        degrees: ['1', '2', '♭3', '4', '5', '6', '♭7'],
        names: ['A', 'B', 'C', 'D', 'E', 'F♯', 'G'],
      },
    ],
    chordCycle: ['Am7', 'D7'],
    voicingSets: null,
    defaultVoicing: null,
    bassFloor: null,
    studentParts: ['melody'],
    keyboard: { startC: 4, endC: 6 },
    scaleTonic: 57,
    prompts: ['Play over the groove.'],
    returnTo: '/curriculum/funk/2?section=A',
    studentTrackId: 't-student',
  });

  it('copies a session of the right shape, its student track kept', () => {
    const value = genre();
    const got = practiceSessionOf(value, tracks(['t-student']));
    expect(got).toEqual(value);
    expect(got).not.toBe(value);
  });

  it('drops a student track the project no longer has', () => {
    const got = practiceSessionOf(genre(), tracks(['t-other']));
    expect(got).not.toBeNull();
    expect(got && 'studentTrackId' in got).toBe(false);
  });

  it('refuses a "Back to lesson" that leaves the app', () => {
    for (const returnTo of [
      'https://example.com/',
      '//example.com/x',
      'javascript:alert(1)',
      '/\\example.com',
    ]) {
      expect(practiceSessionOf({ ...genre(), returnTo }, [])).toBeNull();
    }
  });

  it('refuses any other shape', () => {
    expect(practiceSessionOf(null, [])).toBeNull();
    expect(practiceSessionOf({ kind: 'theory' }, [])).toBeNull();
    expect(practiceSessionOf({ ...theorySession(), level: 7 }, [])).toBeNull();
    expect(practiceSessionOf({ ...genre(), studentParts: [] }, [])).toBeNull();
    expect(
      practiceSessionOf({ ...genre(), scales: [{ id: 'x' }] }, []),
    ).toBeNull();
  });
});
