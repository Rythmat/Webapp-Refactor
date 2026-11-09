// @vitest-environment jsdom
/**
 * A draft an older build wrote, resumed by this one over the REAL
 * DraftSessionPort (autosave.ts) and draft store (fake-indexeddb). The
 * document fingerprint names every content key, so 2.13's rename of
 * leadSheetSections to sections (schema 6 → 7) gives the same content
 * another fingerprint. Resumed with no edit, such a draft must still read
 * as saved to the account, and stay a cache (pristine, cloud-equal) the
 * prune may take; one with unsaved edits must still read as unsaved.
 *
 * Run: npx vitest run src/daw/session/__tests__/openSession.oldSchemaDraft.test.ts
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
import { SESSION_SCHEMA_VERSION } from '@/daw/persistence/projectDocument/codec';
import {
  liveDocumentFingerprint,
  useSaveStatusStore,
} from '@/daw/persistence/saveStatusStore';
import { deriveSaveChip } from '@/daw/shell/topbar/saveChipModel';
import { useStore } from '@/daw/store';
import { setDefaultLockManager } from '@/lib/studio-projects/drafts/draftLock';
import {
  createDraftStore,
  type DraftStore,
} from '@/lib/studio-projects/drafts/draftStore';
import { hashFingerprint } from '@/lib/studio-projects/drafts/fingerprintHash';
import {
  draftHasWork,
  draftIsCloudEqual,
  draftIsPristine,
} from '@/lib/studio-projects/drafts/predicates';
import { MemoryStorage } from '@/lib/studio-projects/drafts/__tests__/draftTestUtils';
import { createFakeLockManager } from '@/lib/studio-projects/drafts/__tests__/fakeLocks';
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

const USER: SessionUser = { userId: 'student-1', userKey: 'student-1' };
const PROJECT_ID = 'project-all-fields';
const DRAFT_ID = 'draft-v6';
/** The v6 fixture's fingerprint as the 2.12 build (schema 6) computed it. */
const V6_FINGERPRINT = 'h1:86b4a3b04711dea3';
/** A fingerprint of the same project before its last, unsaved edit. */
const V6_BEFORE_EDIT = 'h1:0123456789abcdef';
const V6_BODY = readFileSync(
  resolve(
    process.cwd(),
    'src/daw/persistence/__tests__/fixtures/v6-all-fields/all-fields.json',
  ),
  'utf8',
);

const port = getDraftSessionPort();
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
      window.history.replaceState(null, '', `/studio${search}`),
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

/**
 * The record the 2.12 build left: the v6 body, its fingerprint `doc`, opened
 * from a template whose fingerprint is `baseline`, last saved whole to the
 * account as `saved`.
 */
async function storeV6Draft(fingerprints: {
  doc: string;
  baseline: string;
  saved: string;
}): Promise<void> {
  await store.write({
    meta: {
      draftId: DRAFT_ID,
      userKey: USER.userKey,
      origin: 'session',
      createdAt: 0,
      schema: 6,
      projectId: PROJECT_ID,
      name: 'All Fields',
      trackCount: 1,
      chars: V6_BODY.length,
      docFingerprint: fingerprints.doc,
      hasContent: true,
      baseline: {
        source: 'template',
        ref: 'project-pop',
        reopenable: true,
        fingerprint: fingerprints.baseline,
      },
      cloud: {
        projectId: PROJECT_ID,
        updatedAt: '2026-10-01T00:00:00.000Z',
        savedFingerprint: fingerprints.saved,
        savedComplete: true,
        savedAt: 1,
      },
      media: [],
      mediaMissing: 0,
    },
    text: V6_BODY,
    expectedSeq: null,
  });
}

async function resume() {
  const outcome = await openSession(
    { kind: 'draft', draftId: DRAFT_ID },
    { source: 'boot' },
  );
  expect(outcome.status).toBe('ready');
  await whenDraftWritesSettled();
  expect(useSessionStore.getState().draftId).toBe(DRAFT_ID);
}

/** The top bar's save chip as it reads the live session now. */
function chip() {
  const cloud = useCloudSaveStore.getState();
  const draft = useDraftStatusStore.getState();
  const saved = cloud.lastSaved;
  return deriveSaveChip({
    opening: false,
    cloud: { phase: cloud.phase, error: cloud.error, lastSaved: saved },
    draft: {
      draftId: draft.draftId,
      pendingSeq: draft.pendingSeq,
      committedSeq: draft.committedSeq,
      error: draft.error,
    },
    media: { pendingInMemory: 0, missing: draft.media.missing },
    projectId: useStore.getState().projectId,
    documentVersion: useSaveStatusStore.getState().documentVersion,
    matchesLastSaved:
      saved !== null &&
      hashFingerprint(liveDocumentFingerprint()) === saved.fingerprint,
  });
}

describe('a draft an older schema wrote, resumed', () => {
  it('reads as saved to the account and stays a cache when nothing changed', async () => {
    await storeV6Draft({
      doc: V6_FINGERPRINT,
      baseline: V6_FINGERPRINT,
      saved: V6_FINGERPRINT,
    });
    await resume();
    const live = hashFingerprint(liveDocumentFingerprint());
    // The rename really does change the fingerprint of the same content.
    expect(live).not.toBe(V6_FINGERPRINT);

    expect(useCloudSaveStore.getState().lastSaved?.fingerprint).toBe(live);
    expect(chip().state).toBe('saved');

    const meta = (await store.getMeta(DRAFT_ID))!;
    expect(meta.schema).toBe(SESSION_SCHEMA_VERSION);
    expect(meta.docFingerprint).toBe(live);
    expect(meta.baseline.fingerprint).toBe(live);
    expect(meta.cloud?.savedFingerprint).toBe(live);
    expect(draftIsPristine(meta)).toBe(true);
    expect(draftIsCloudEqual(meta)).toBe(true);
    expect(draftHasWork(meta)).toBe(false);

    // An edit after the resume is unsaved work again.
    useStore.getState().setBpm(141);
    await flushDraftNow();
    await whenDraftWritesSettled();
    expect(chip().state).not.toBe('saved');
    expect(draftHasWork((await store.getMeta(DRAFT_ID))!)).toBe(true);
  });

  it('still reads as unsaved when it held edits the cloud and its source lack', async () => {
    await storeV6Draft({
      doc: V6_FINGERPRINT,
      baseline: V6_BEFORE_EDIT,
      saved: V6_BEFORE_EDIT,
    });
    await resume();
    expect(chip().state).not.toBe('saved');

    const meta = (await store.getMeta(DRAFT_ID))!;
    expect(meta.baseline.fingerprint).toBe(V6_BEFORE_EDIT);
    expect(meta.cloud?.savedFingerprint).toBe(V6_BEFORE_EDIT);
    expect(draftIsPristine(meta)).toBe(false);
    expect(draftIsCloudEqual(meta)).toBe(false);
    expect(draftHasWork(meta)).toBe(true);
  });
});
