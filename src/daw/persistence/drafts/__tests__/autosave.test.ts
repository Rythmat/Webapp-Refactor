// @vitest-environment jsdom
/**
 * The draft autosave (milestone 1.4, E5 and E7): when the live session is
 * written to its draft, and what reaches it.
 *
 * The first two blocks port src/daw/hooks/__tests__/autosaveStarvation.test.ts
 * (milestones 1.1 and 1.3) from the localStorage autosave to the draft
 * controller, finding by finding: playback alone never writes, an edit made
 * while playing is written within maxWait, a synth-only edit is written,
 * every Oracle patch field counts, unmount, pagehide and hidden flush, view
 * changes ride the next write or a flush, and the registry decides what
 * reaches the draft. The rest pins the controller's own contract: paused
 * writes, the session generation, identical bodies, the mirror on hide and
 * its writeSeq, a write stalled when the page dies, quota, conflicts, the
 * persist() call and the cloud record.
 *
 * The real editor store, save status and codec; the draft store is the real
 * one over its localStorage adapter (an in-memory Storage), wrapped so each
 * test sees the writes it makes. "A write was made" counts snapshots of the
 * live session (snapshotLiveSession), the analogue of the old suite's spy
 * on writeLocalSession: a write that starts and turns out unchanged still
 * counts as one. Fake timers for setTimeout only.
 *
 * Run: npx vitest run src/daw/persistence/drafts/__tests__/autosave.test.ts
 */
import { Blob as NodeBlob } from 'node:buffer';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { cleanup, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { setAudioBuffer, setOriginalAudio } from '@/daw/audio/AudioBufferStore';
import { useCloudSaveStore } from '@/daw/commands/cloudSaveStore';
import { useStoreBridge } from '@/daw/hooks/useStoreBridge';
import { useSynthStore } from '@/daw/oracle-synth/store';
import { captureSynthState } from '@/daw/oracle-synth/synthTrackState';
import {
  DOC_KEYS,
  LOCAL_KEYS,
  PREF_KEYS,
  SESSION_KEYS,
  STORE_FIELDS,
  TRACK_DOC_FIELDS,
  TRACK_PER_USER_FIELDS,
  VIEW_KEYS,
  type StoreDataKey,
} from '@/daw/persistence/projectDocument/fields';
import {
  documentFingerprint,
  isDocumentDirty,
  markDocumentBaseline,
  useSaveStatusStore,
} from '@/daw/persistence/saveStatusStore';
import type { SessionData } from '@/daw/persistence/SessionSerializer';
import {
  bumpSessionGeneration,
  getSessionGeneration,
} from '@/daw/session/sessionGeneration';
import {
  INITIAL_SESSION_STATE,
  useSessionStore,
} from '@/daw/session/sessionStore';
import type { SessionUser } from '@/daw/session/types';
import { useStore, type AllSlices, type Track } from '@/daw/store';
import { ACTIVE_DRAFT_KEY } from '@/lib/studio-projects/drafts/activeDraft';
import { setDefaultLockManager } from '@/lib/studio-projects/drafts/draftLock';
import {
  mirrorKey,
  readMirrors,
  reconcileMirror,
} from '@/lib/studio-projects/drafts/draftMirror';
import {
  createDraftStore,
  WRITER_DOC,
  type DraftStore,
} from '@/lib/studio-projects/drafts/draftStore';
import { hashFingerprint } from '@/lib/studio-projects/drafts/fingerprintHash';
import {
  DraftStorageError,
  type DraftMeta,
  type DraftWrite,
} from '@/lib/studio-projects/drafts/types';
import { MemoryStorage } from '@/lib/studio-projects/drafts/__tests__/draftTestUtils';
import { showNotice } from '@/util/toast';
import { runBeforeSignOut } from '@/auth/beforeSignOut';
import {
  DRAFT_CHAIN_STALL_MS,
  DRAFT_DEBOUNCE_MS,
  DRAFT_FLUSH_TIMEOUT_MS,
  DRAFT_MAX_WAIT_MS,
  DRAFT_RETIRE_TIMEOUT_MS,
  flushDraftNow,
  resetDraftAutosaveForTests,
  setDraftStoreForTests,
  startDraftAutosave,
  useDraftAutosave,
  whenDraftWritesSettled,
} from '../autosave';
import {
  getDraftSessionPort,
  resetDraftSessionPortForTests,
} from '../draftSessionPort';
import { useDraftStatusStore } from '../draftStatusStore';
import { resetPendingMediaForTests } from '../pendingMedia';
import { snapshotLiveSession } from '../snapshot';

vi.mock('@/util/toast', () => ({
  showNotice: vi.fn(() => 1),
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock('../snapshot', async (importOriginal) => {
  const real = await importOriginal<typeof import('../snapshot')>();
  return { ...real, snapshotLiveSession: vi.fn(real.snapshotLiveSession) };
});

const s = () => useStore.getState();
const snapshots = vi.mocked(snapshotLiveSession);
const notices = vi.mocked(showNotice);

const USER: SessionUser = { userId: 'student-1', userKey: 'student-1' };
const CLIP_ID = 'clip-1';
const FRAME_MS = 33;
const TICKS_PER_MS = (120 / 60) * (480 / 1000);

let memory: MemoryStorage;
let real: DraftStore;
let store: DraftStore;
let writes: ReturnType<
  typeof vi.fn<(w: DraftWrite) => ReturnType<DraftStore['write']>>
>;
let keysId = '';
let draftId = '';
/** The IndexedDB factory of the adapter under test (null: localStorage). */
let idbFactory: IDBFactory | null = null;

beforeAll(() => {
  (globalThis as { IDBKeyRange?: unknown }).IDBKeyRange = IDBKeyRange;
});

/** A store over `storage` whose writes the test can see and fail. */
function wrap(inner: DraftStore): DraftStore {
  writes = vi.fn((w: DraftWrite) => inner.write(w));
  return Object.assign(Object.create(inner) as DraftStore, {
    write: writes,
  });
}

/** Let every queued draft write and patch finish. */
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await whenDraftWritesSettled();
    await Promise.resolve();
  }
}

async function advance(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
  await settle();
}

/** Open a new session the way openSession does: claim, activate, begin. */
async function openNewSession(): Promise<void> {
  const port = getDraftSessionPort();
  const claim = await port.claim(USER, { boot: false });
  port.activate(claim);
  markDocumentBaseline();
  await port.begin({ source: 'new', reopenable: true, fingerprint: null });
  draftId = claim.draftId;
  await settle();
}

function lastSession(): SessionData | null {
  const call = writes.mock.calls.at(-1);
  return call ? (JSON.parse(call[0].text) as SessionData) : null;
}

function drawNote(): void {
  s().updateMidiClipEvents(keysId, CLIP_ID, [
    { note: 60, velocity: 100, startTick: 0, durationTicks: 480, channel: 0 },
  ]);
}

/** A playhead write every frame, as useTransport does while playing. */
async function play(ms: number): Promise<void> {
  for (let elapsed = FRAME_MS; elapsed <= ms; elapsed += FRAME_MS) {
    await vi.advanceTimersByTimeAsync(FRAME_MS);
    s().setPosition(Math.round(elapsed * TICKS_PER_MS));
  }
  await settle();
}

function hideTab(): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => 'hidden',
  });
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => true,
  });
  document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
}

function savedPitches(): number[] {
  return lastSession()?.data.tracks[0]?.midiClips[0]?.events.notes ?? [];
}

function savedView(): Record<string, unknown> | undefined {
  return lastSession()?.data.view as Record<string, unknown> | undefined;
}

function savedLeadCutoff(): number | undefined {
  const lead = lastSession()?.data.tracks.find((t) => t.name === 'Lead');
  return lead?.settings?.oracleSynth?.filters[0].cutoff;
}

function clearCounts(): void {
  snapshots.mockClear();
  writes.mockClear();
  notices.mockClear();
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  localStorage.clear();
  sessionStorage.clear();
  setDefaultLockManager(() => null);
  resetDraftAutosaveForTests();
  resetDraftSessionPortForTests();
  resetPendingMediaForTests();
  useDraftStatusStore.setState(useDraftStatusStore.getInitialState(), true);
  useSessionStore.setState({ ...INITIAL_SESSION_STATE }, true);
  useCloudSaveStore.setState(useCloudSaveStore.getInitialState(), true);
  useSynthStore.setState(useSynthStore.getInitialState(), true);
  useStore.setState(useStore.getInitialState(), true);
  keysId = s().addTrack('midi', 'piano-sampler', 'Keys');
  s().addMidiClip(keysId, { id: CLIP_ID, startTick: 0, events: [] });
  memory = new MemoryStorage();
  real = createDraftStore({
    indexedDB: null,
    storage: memory,
    now: () => Date.now(),
  });
  store = wrap(real);
  setDraftStoreForTests(store);
  await openNewSession();
  clearCounts();
});

afterEach(() => {
  cleanup();
  resetDraftAutosaveForTests();
  setDraftStoreForTests(null);
  setDefaultLockManager(null);
  Reflect.deleteProperty(document, 'visibilityState');
  Reflect.deleteProperty(document, 'hidden');
  vi.useRealTimers();
});

// ── Starvation (ported from autosaveStarvation.test.ts) ──────────────────

describe('the draft autosave', () => {
  it('writes an edit made while the transport is stopped within 1 s', async () => {
    renderHook(() => useDraftAutosave());
    drawNote();
    await advance(DRAFT_DEBOUNCE_MS);

    expect(writes).toHaveBeenCalled();
    expect(savedPitches()).toEqual([60]);
  });

  // shell-07 / bundle-load-01: the ~30 Hz playhead writes never starve it.
  it('writes an edit made while the transport plays', async () => {
    renderHook(() => useDraftAutosave());
    s().play();
    await play(1000);
    drawNote();
    await play(DRAFT_MAX_WAIT_MS + 1000);

    expect(writes).toHaveBeenCalled();
    expect(savedPitches()).toEqual([60]);
  });

  // synth-store-01: a knob turned on the synth writes only useSynthStore.
  it('writes a synth-only edit', async () => {
    const leadId = s().addTrack('midi', 'oracle-synth', 'Lead');
    renderHook(() => useStoreBridge(null, leadId));
    renderHook(() => useDraftAutosave());
    await advance(2000);
    clearCounts();

    useSynthStore.getState().setFilterParam(0, 'cutoff', 800);
    await advance(10_000);

    expect(writes).toHaveBeenCalled();
    expect(savedLeadCutoff()).toBe(800);
  });

  it('writes a change to any field of the synth patch', async () => {
    renderHook(() => useDraftAutosave());
    await advance(2000);
    const changed = (value: unknown) =>
      typeof value === 'number'
        ? value + 1
        : typeof value === 'string'
          ? `${value} 2`
          : typeof value === 'boolean'
            ? !value
            : value == null
              ? {}
              : structuredClone(value);

    const unsaved: string[] = [];
    for (const [field, value] of Object.entries(captureSynthState())) {
      snapshots.mockClear();
      useSynthStore.setState({ [field]: changed(value) });
      await advance(DRAFT_DEBOUNCE_MS + 100);
      if (snapshots.mock.calls.length === 0) unsaved.push(field);
    }

    expect(unsaved).toEqual([]);
  });

  // bundle-load-01: leaving the editor flushes the pending write.
  it('flushes a pending edit when the editor unmounts', async () => {
    const { unmount } = renderHook(() => useDraftAutosave());
    drawNote();
    await vi.advanceTimersByTimeAsync(500);
    unmount();
    await settle();

    expect(writes).toHaveBeenCalled();
    expect(savedPitches()).toEqual([60]);
  });

  // shell-07: closing or refreshing the tab inside the debounce.
  it('flushes a pending edit on pagehide', async () => {
    renderHook(() => useDraftAutosave());
    drawNote();
    window.dispatchEvent(new Event('pagehide'));
    await settle();

    expect(writes).toHaveBeenCalled();
    expect(writes.mock.calls.at(-1)?.[0].durability).toBe('strict');
    expect(savedPitches()).toEqual([60]);
  });

  it('flushes a pending edit when the tab is hidden', async () => {
    renderHook(() => useDraftAutosave());
    drawNote();
    hideTab();
    await settle();

    expect(writes).toHaveBeenCalled();
    expect(savedPitches()).toEqual([60]);
  });

  it('flushes a pending edit when the page is frozen', async () => {
    renderHook(() => useDraftAutosave());
    drawNote();
    document.dispatchEvent(new Event('freeze'));
    await settle();

    expect(savedPitches()).toEqual([60]);
  });

  it('writes within 5 s while edits keep coming', async () => {
    renderHook(() => useDraftAutosave());
    const start = Date.now();
    for (let i = 0; i < 20 && writes.mock.calls.length === 0; i++) {
      s().updateTrack(keysId, { volume: 0.5 - i * 0.01 });
      await vi.advanceTimersByTimeAsync(500);
      await settle();
    }

    expect(writes).toHaveBeenCalledTimes(1);
    expect(Date.now() - start).toBeLessThanOrEqual(DRAFT_MAX_WAIT_MS);
    expect(lastSession()?.data.tracks[0]?.volume).toBeLessThan(0.5);
  });

  // state-reload-29: no whole-session write per frame of playback.
  it('never starts a write while only the playhead moves', async () => {
    renderHook(() => useDraftAutosave());
    s().play();
    await play(10_000);
    await advance(10_000);

    expect(snapshots).not.toHaveBeenCalled();
  });

  it('leaves selection, zoom and scroll to the flush, never a write per frame', async () => {
    renderHook(() => useDraftAutosave());
    s().setSelectedTrackId(keysId);
    for (let frame = 1; frame <= 60; frame++) {
      s().setTimelineZoom(1 + frame / 60);
      s().setTimelineScrollLeft(frame * 10);
      await vi.advanceTimersByTimeAsync(16);
    }
    await advance(10_000);
    expect(snapshots).not.toHaveBeenCalled();

    window.dispatchEvent(new Event('pagehide'));
    await settle();
    expect(writes).toHaveBeenCalledTimes(1);
    expect(savedView()).toMatchObject({
      timelineZoom: 2,
      timelineScrollLeft: 600,
      selectedTrackId: keysId,
    });
  });

  it('takes a change to the view along with the next write', async () => {
    renderHook(() => useDraftAutosave());
    s().setTimelineZoom(3);
    drawNote();
    await advance(DRAFT_DEBOUNCE_MS);

    expect(writes).toHaveBeenCalledTimes(1);
    expect(savedPitches()).toEqual([60]);
    expect(savedView()?.timelineZoom).toBe(3);
    // Written: the flush has nothing left to write.
    window.dispatchEvent(new Event('pagehide'));
    await settle();
    expect(writes).toHaveBeenCalledTimes(1);
  });

  // engine-hooks-01: a refused write is tried again by the page's last chance.
  it('tries a write that did not land again when the page is hidden', async () => {
    renderHook(() => useDraftAutosave());
    writes.mockImplementationOnce(() =>
      Promise.reject(new DraftStorageError('unavailable', 'closing')),
    );
    drawNote();
    await advance(DRAFT_DEBOUNCE_MS);
    expect(writes).toHaveBeenCalledTimes(1);
    expect(useDraftStatusStore.getState().error).toBe('unavailable');

    hideTab();
    await settle();
    expect(writes).toHaveBeenCalledTimes(2);
    expect(savedPitches()).toEqual([60]);
    expect(useDraftStatusStore.getState().error).toBeNull();
  });

  it('writes where the playhead stopped when the tab is hidden', async () => {
    renderHook(() => useDraftAutosave());
    s().play();
    await play(2000);
    s().stop();
    s().setPosition(1920);
    hideTab();
    await settle();

    expect(writes).toHaveBeenCalledTimes(1);
    expect(lastSession()?.data.transport.position).toBe(1920);
  });

  // Arming is this person's, on this device: in the draft, not the project.
  it('writes a track being armed, which is no change to the project', async () => {
    renderHook(() => useDraftAutosave());
    s().toggleRecordArm(keysId);
    await advance(DRAFT_DEBOUNCE_MS);

    expect(writes).toHaveBeenCalledTimes(1);
    expect(lastSession()?.data.tracks[0]?.recordArmed).toBe(
      s().tracks[0].recordArmed,
    );
    expect(isDocumentDirty()).toBe(false);
  });

  it('tells the save status about a synth-only edit', async () => {
    const leadId = s().addTrack('midi', 'oracle-synth', 'Lead');
    renderHook(() => useStoreBridge(null, leadId));
    renderHook(() => useDraftAutosave());
    await advance(2000);
    markDocumentBaseline();
    const before = useSaveStatusStore.getState().documentVersion;

    useSynthStore.getState().setFilterParam(0, 'cutoff', 640);

    expect(useSaveStatusStore.getState().documentVersion).toBeGreaterThan(
      before,
    );
    expect(isDocumentDirty()).toBe(true);
  });

  // The old 'nothing before the page holds a session': no draft is active
  // until an open activates one, and an open pauses writes until begin.
  it('writes nothing while no draft is active or an open is switching', async () => {
    resetDraftAutosaveForTests();
    renderHook(() => useDraftAutosave());
    drawNote();
    await advance(10_000);
    window.dispatchEvent(new Event('pagehide'));
    await settle();
    expect(snapshots).not.toHaveBeenCalled();

    const port = getDraftSessionPort();
    port.activate(await port.claim(USER, { boot: false }));
    s().updateTrack(keysId, { volume: 0.2 });
    await advance(10_000);
    window.dispatchEvent(new Event('pagehide'));
    await settle();
    expect(snapshots).not.toHaveBeenCalled();
    expect(useDraftStatusStore.getState().paused).toBe(true);
  });

  // The old 'nothing written back after File ▸ New dropped it': a write
  // scheduled for a session that has since been replaced is dropped.
  it('drops a scheduled write once the session generation moves', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderHook(() => useDraftAutosave());
    drawNote();
    bumpSessionGeneration('test');
    await advance(10_000);
    window.dispatchEvent(new Event('pagehide'));
    await settle();

    expect(writes).not.toHaveBeenCalled();
    // No open moved it (the session is idle): said once, not silently.
    s().updateTrack(keysId, { volume: 0.2 });
    await advance(10_000);
    expect(
      warn.mock.calls.filter(([m]) =>
        String(m).includes('generation moved without an open'),
      ),
    ).toHaveLength(1);
    warn.mockRestore();
  });
});

// ── By the registry ───────────────────────────────────────────────────────

function different(value: unknown): unknown {
  if (typeof value === 'number') return value + 1;
  if (typeof value === 'boolean') return !value;
  if (typeof value === 'string') return `${value}-changed`;
  if (value === null || value === undefined) return 1;
  if (value instanceof Map) return new Map([...value, ['changed', 1]]);
  if (value instanceof Set) return new Set([...value, -1]);
  if (Array.isArray(value)) {
    const first: unknown = value[0];
    if (first !== null && typeof first === 'object' && 'id' in first) {
      return [
        ...value,
        { ...structuredClone(first), id: `${String(first.id)}-copy` },
      ];
    }
    return [...value, 1];
  }
  return { ...(value as object), changed: 1 };
}

const writeKey = (key: StoreDataKey) =>
  useStore.setState({ [key]: different(s()[key]) } as Partial<AllSlices>);

const writeTrackField = (field: keyof Track) =>
  useStore.setState({
    tracks: s().tracks.map((track, i) =>
      i === 0 ? { ...track, [field]: different(track[field]) } : track,
    ),
  });

/** A write the change schedules, one only a flush makes, or none. */
async function autosaveOf(
  change: () => void,
): Promise<'scheduled' | 'flush' | 'never'> {
  snapshots.mockClear();
  change();
  await advance(10_000);
  if (snapshots.mock.calls.length > 0) return 'scheduled';
  window.dispatchEvent(new Event('pagehide'));
  await settle();
  return snapshots.mock.calls.length > 0 ? 'flush' : 'never';
}

async function notTreatedAs<K extends string>(
  want: Awaited<ReturnType<typeof autosaveOf>>,
  keys: readonly K[],
  write: (key: K) => void,
): Promise<string[]> {
  renderHook(() => useDraftAutosave());
  const wrong: string[] = [];
  for (const key of keys) {
    if ((await autosaveOf(() => write(key))) !== want) wrong.push(key);
  }
  return wrong;
}

describe('what reaches the draft, by the registry', () => {
  it('a doc key starts a write', async () => {
    const keys = DOC_KEYS.filter((key) => key !== 'tracks');
    expect(await notTreatedAs('scheduled', keys, writeKey)).toEqual([]);
  });

  it('a track field starts a write, a per-user one included', async () => {
    const fields = [...TRACK_DOC_FIELDS, ...TRACK_PER_USER_FIELDS];
    expect(await notTreatedAs('scheduled', fields, writeTrackField)).toEqual(
      [],
    );
  });

  it('a view key waits for the next write or the flush', async () => {
    expect(await notTreatedAs('flush', VIEW_KEYS, writeKey)).toEqual([]);
  });

  it('a pref or session key never reaches the draft', async () => {
    const keys = [...PREF_KEYS, ...SESSION_KEYS];
    expect(await notTreatedAs('never', keys, writeKey)).toEqual([]);
  });

  it('reaches the draft for exactly the keys the draft holds (LOCAL_KEYS)', async () => {
    const keys = (Object.keys(STORE_FIELDS) as StoreDataKey[]).filter(
      (key) => key !== 'tracks',
    );
    const local = new Set(LOCAL_KEYS);
    renderHook(() => useDraftAutosave());
    const wrong: string[] = [];
    for (const key of keys) {
      const reached = (await autosaveOf(() => writeKey(key))) !== 'never';
      if (reached !== local.has(key)) wrong.push(key);
    }
    expect(wrong).toEqual([]);
  });
});

// ── The controller ─────────────────────────────────────────────────────────

// The write path over both adapters: the localStorage adapter (the default
// here) and IndexedDB (fake-indexeddb), whose transactions and error
// mapping the controller's chain runs over in the browser.
describe.each([{ adapter: 'localstorage' }, { adapter: 'indexeddb' }])(
  'the draft controller over $adapter',
  ({ adapter }) => {
    beforeEach(async () => {
      if (adapter !== 'indexeddb') return;
      resetDraftAutosaveForTests();
      idbFactory = new IDBFactory();
      real = createDraftStore({
        indexedDB: idbFactory,
        storage: memory,
        now: () => Date.now(),
      });
      store = wrap(real);
      setDraftStoreForTests(store);
      await openNewSession();
      clearCounts();
    });

    afterEach(() => {
      idbFactory = null;
    });

    it('on hide writes the mirror and an IndexedDB write with the same writeSeq', async () => {
      renderHook(() => useDraftAutosave());
      const before = (await real.getMeta(draftId))!.writeSeq;
      drawNote();
      window.dispatchEvent(new Event('pagehide'));

      // Synchronously, before the write lands: the mirror, one seq ahead.
      const [mirror] = readMirrors(USER.userKey);
      expect(mirror?.entry).toMatchObject({
        draftId,
        baseSeq: before,
        writeSeq: before + 1,
        writerDoc: WRITER_DOC,
      });
      expect(useDraftStatusStore.getState().mirror).toBe('written');

      await settle();
      const stored = await real.getMeta(draftId);
      expect(stored?.writeSeq).toBe(before + 1);
      expect(stored?.contentHash).toBe(mirror?.entry?.contentHash);
      // IndexedDB holds it: the mirror is gone.
      expect(localStorage.getItem(mirrorKey(USER.userKey, draftId))).toBeNull();
      expect(useDraftStatusStore.getState().mirror).toBe('none');
    });

    // Critique: a debounced write W1 still in flight when the page dies must
    // not leave the mirror at the same writeSeq with other content.
    it('keeps the newest edit when the page dies with a write stalled', async () => {
      renderHook(() => useDraftAutosave());
      const base = (await real.getMeta(draftId))!.writeSeq;
      let releaseW1: () => void = () => {};
      const w1Gate = new Promise<void>((resolve) => (releaseW1 = resolve));
      writes.mockImplementationOnce(async (w) => {
        await w1Gate;
        return real.write(w);
      });
      // W2 (the hide flush's) never runs: the page is gone.
      writes.mockImplementationOnce(() => new Promise(() => {}));

      s().updateTrack(keysId, { volume: 0.31 }); // S1
      await vi.advanceTimersByTimeAsync(DRAFT_DEBOUNCE_MS); // W1 starts, stalls
      drawNote(); // S2
      window.dispatchEvent(new Event('pagehide'));

      const [mirror] = readMirrors(USER.userKey);
      expect(mirror?.entry?.baseSeq).toBe(base + 1);
      expect(mirror?.entry?.writeSeq).toBe(base + 2);

      // W1 lands (S1); then the page dies before W2.
      releaseW1();
      for (let i = 0; i < 5; i++) await Promise.resolve();
      await vi.waitFor(async () =>
        expect((await real.getMeta(draftId))?.writeSeq).toBe(base + 1),
      );

      // The next boot reconciles the mirror: it wins, nothing forks.
      const result = await reconcileMirror(real, USER.userKey, draftId);
      expect(result.outcome).toBe('applied');
      const body = JSON.parse(
        (await real.readBody(draftId))!.text,
      ) as SessionData;
      expect(body.data.tracks[0].midiClips[0].events.notes).toEqual([60]);
      expect(body.data.tracks[0].volume).toBe(0.31);
      const all = await real.list(USER.userKey);
      expect(all.map((m) => m.origin)).toEqual(['session']);
    });

    it('keeps the newest edit when a stalled write never lands', async () => {
      renderHook(() => useDraftAutosave());
      writes.mockImplementationOnce(() => new Promise(() => {}));
      writes.mockImplementationOnce(() => new Promise(() => {}));
      s().updateTrack(keysId, { volume: 0.31 });
      await vi.advanceTimersByTimeAsync(DRAFT_DEBOUNCE_MS);
      drawNote();
      window.dispatchEvent(new Event('pagehide'));

      const result = await reconcileMirror(real, USER.userKey, draftId);
      expect(result.outcome).toBe('applied');
      const body = JSON.parse(
        (await real.readBody(draftId))!.text,
      ) as SessionData;
      expect(body.data.tracks[0].midiClips[0].events.notes).toEqual([60]);
    });

    it('frees space and retries on quota, then shows one error', async () => {
      renderHook(() => useDraftAutosave());
      writes.mockImplementation(() =>
        Promise.reject(new DraftStorageError('quota', 'full')),
      );
      const prune = vi
        .spyOn(store, 'prune')
        .mockResolvedValueOnce({
          deletedDrafts: ['old'],
          deletedMedia: 0,
          freedChars: 10,
        })
        .mockResolvedValue({
          deletedDrafts: [],
          deletedMedia: 0,
          freedChars: 0,
        });

      drawNote();
      await advance(DRAFT_DEBOUNCE_MS);

      expect(prune).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'quota', userKey: USER.userKey }),
      );
      // The write, the retry after the step that freed something, then the
      // step that freed nothing ends it.
      expect(writes).toHaveBeenCalledTimes(2);
      expect(useDraftStatusStore.getState().error).toBe('quota');
      expect(useDraftStatusStore.getState().retry).toBeTypeOf('function');
      expect(notices).toHaveBeenCalledTimes(1);
      expect(notices.mock.calls[0][0]).toBe(
        'Storage on this device is full, so your latest changes aren’t saved here.',
      );
      expect(notices.mock.calls[0][1]?.action?.label).toBe('Manage');

      // The same episode: no second toast.
      s().updateTrack(keysId, { volume: 0.2 });
      await advance(DRAFT_DEBOUNCE_MS);
      expect(notices).toHaveBeenCalledTimes(1);

      // Space came back: Retry writes, and the error clears.
      writes.mockImplementation((w) => real.write(w));
      useDraftStatusStore.getState().retry?.();
      await settle();
      expect(useDraftStatusStore.getState().error).toBeNull();
      expect(savedPitches()).toEqual([60]);
    });

    it('forks the session into a copy when another tab wrote the draft', async () => {
      renderHook(() => useDraftAutosave());
      s().setProjectName('Blue Hour');
      s().setProjectId('project-1');
      await advance(DRAFT_DEBOUNCE_MS);
      // Another tab (another writer document) writes the same draft.
      await rewrite(draftId, 'other-tab');

      drawNote();
      await advance(DRAFT_DEBOUNCE_MS);

      const forkId = useDraftStatusStore.getState().draftId;
      expect(forkId).not.toBe(draftId);
      const fork = await real.getMeta(forkId!);
      expect(fork).toMatchObject({ origin: 'fork', forkedFrom: draftId });
      expect(fork?.projectId).toBeUndefined();
      expect(s().projectName).toBe('Blue Hour (copy)');
      expect(s().projectId).toBeNull();
      // The session, the pointer and the status all moved.
      expect(useSessionStore.getState().draftId).toBe(forkId);
      expect(JSON.parse(sessionStorage.getItem(ACTIVE_DRAFT_KEY)!)).toEqual({
        draftId: forkId,
        userKey: USER.userKey,
      });
      expect(notices).toHaveBeenCalledWith(
        'This project was changed in another tab — your changes here were saved as a copy',
      );
      // The other tab's draft is untouched by this page.
      expect((await real.getMeta(draftId))?.writer.doc).toBe('other-tab');
    });

    it('carries on over its own earlier write instead of forking', async () => {
      renderHook(() => useDraftAutosave());
      const { writeSeq } = (await real.getMeta(draftId))!;
      // A write of this page the controller lost track of.
      await rewrite(draftId, WRITER_DOC);
      drawNote();
      await advance(DRAFT_DEBOUNCE_MS);

      expect(useDraftStatusStore.getState().draftId).toBe(draftId);
      expect((await real.getMeta(draftId))?.writeSeq).toBe(writeSeq + 2);
      expect(savedPitches()).toEqual([60]);
      expect(notices).not.toHaveBeenCalled();
    });

    it('makes the draft again when it was removed under it', async () => {
      renderHook(() => useDraftAutosave());
      const before = (await real.getMeta(draftId))!;
      await real.remove(draftId);
      drawNote();
      await advance(DRAFT_DEBOUNCE_MS);

      const again = await real.getMeta(draftId);
      expect(again).toMatchObject({
        origin: before.origin,
        baseline: before.baseline,
        writeSeq: 1,
      });
      expect(useDraftStatusStore.getState().draftId).toBe(draftId);
    });
  },
);

describe('the draft controller', () => {
  it('skips a write whose body and meta are unchanged', async () => {
    renderHook(() => useDraftAutosave());
    const volume = s().tracks[0].volume;
    s().updateTrack(keysId, { volume: 0.3 });
    s().updateTrack(keysId, { volume });
    await advance(DRAFT_DEBOUNCE_MS);

    expect(snapshots).toHaveBeenCalled();
    expect(writes).not.toHaveBeenCalled();
    const st = useDraftStatusStore.getState();
    expect(st.committedSeq).toBe(st.pendingSeq);
  });

  it('records a cloud save on the draft without moving its writeSeq', async () => {
    renderHook(() => useDraftAutosave());
    s().setProjectId('project-9');
    await advance(DRAFT_DEBOUNCE_MS);
    const seq = (await real.getMeta(draftId))!.writeSeq;
    const fingerprint = hashFingerprint(documentFingerprint());
    useCloudSaveStore.setState({
      lastSaved: {
        projectId: 'project-9',
        fingerprint,
        version: useSaveStatusStore.getState().documentVersion,
        complete: true,
        updatedAt: '2026-10-08T10:00:00.000Z',
        at: Date.now(),
        generation: getSessionGeneration(),
      },
    });
    await settle();

    const patched = await real.getMeta(draftId);
    expect(patched?.writeSeq).toBe(seq);
    expect(patched?.cloud).toMatchObject({
      projectId: 'project-9',
      savedFingerprint: fingerprint,
      savedComplete: true,
      updatedAt: '2026-10-08T10:00:00.000Z',
    });
    // The record holds what a write would: no write for the patch alone,
    // although the patch added keys a write puts elsewhere in the meta.
    writes.mockClear();
    await flushDraftNow();
    await settle();
    expect(writes).not.toHaveBeenCalled();

    // The next write keeps it (a write replaces the whole meta).
    drawNote();
    await advance(DRAFT_DEBOUNCE_MS);
    expect((await real.getMeta(draftId))?.cloud?.projectId).toBe('project-9');
    expect(useDraftStatusStore.getState().draftId).toBe(draftId);
  });

  it('ignores a cloud save of another session or project', async () => {
    renderHook(() => useDraftAutosave());
    s().setProjectId('project-9');
    await advance(DRAFT_DEBOUNCE_MS);
    useCloudSaveStore.setState({
      lastSaved: {
        projectId: 'project-other',
        fingerprint: 'h1:x',
        version: 1,
        complete: true,
        updatedAt: null,
        at: 1,
        generation: getSessionGeneration(),
      },
    });
    await settle();
    expect((await real.getMeta(draftId))?.cloud).toBeUndefined();
  });

  it('asks for persistent storage once, on Chromium, after the first work', async () => {
    const persist = vi.fn(async () => true);
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: { persist },
    });
    const ua = vi
      .spyOn(navigator, 'userAgent', 'get')
      .mockReturnValue(
        'Mozilla/5.0 (X11; CrOS x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
      );
    try {
      const idb = createDraftStore({
        indexedDB: new IDBFactory(),
        storage: new MemoryStorage(),
      });
      resetDraftAutosaveForTests();
      store = wrap(idb);
      real = idb;
      setDraftStoreForTests(store);
      vi.useRealTimers();
      await openNewSession();
      renderHook(() => useDraftAutosave());
      expect(persist).not.toHaveBeenCalled(); // pristine: no work yet

      drawNote();
      await vi.waitFor(() => expect(writes).toHaveBeenCalledTimes(2), {
        timeout: 3000,
      });
      await vi.waitFor(async () =>
        expect(await idb.getMetaValue('persist')).toMatchObject({
          granted: true,
        }),
      );
      s().updateTrack(keysId, { volume: 0.4 });
      await vi.waitFor(() => expect(writes).toHaveBeenCalledTimes(3), {
        timeout: 3000,
      });
      expect(persist).toHaveBeenCalledTimes(1);
    } finally {
      ua.mockRestore();
      Reflect.deleteProperty(navigator, 'storage');
    }
  });

  it('is started once however many editors start it', async () => {
    const stopA = startDraftAutosave();
    const stopB = startDraftAutosave();
    drawNote();
    await advance(DRAFT_DEBOUNCE_MS);
    expect(writes).toHaveBeenCalledTimes(1);
    stopA();
    s().updateTrack(keysId, { volume: 0.22 });
    await advance(DRAFT_DEBOUNCE_MS);
    expect(writes).toHaveBeenCalledTimes(2);
    stopB();
    await settle();
    s().updateTrack(keysId, { volume: 0.12 });
    await advance(10_000);
    expect(writes).toHaveBeenCalledTimes(2);
  });
});

// ── Keeping, stalls and leaving (reviews of the draft-autosave track) ──────

describe('keeping the outgoing draft', () => {
  const port = () => getDraftSessionPort();
  const volumeIn = async (id: string) =>
    (JSON.parse((await real.readBody(id))!.text) as SessionData).data.tracks[0]
      .volume;

  it('keeps writing the session when retireOutgoing fails', async () => {
    renderHook(() => useDraftAutosave());
    drawNote();
    await advance(DRAFT_DEBOUNCE_MS);
    await port().flushOutgoing('open:new');
    const patch = vi
      .spyOn(store, 'patchMeta')
      .mockRejectedValue(new DraftStorageError('unavailable', 'boom'));
    await expect(port().retireOutgoing('auto')).rejects.toMatchObject({
      kind: 'unavailable',
    });
    patch.mockRestore();

    // openSession refuses ("nothing changed"); the student carries on.
    expect(useDraftStatusStore.getState()).toMatchObject({
      draftId,
      paused: false,
    });
    s().updateTrack(keysId, { volume: 0.41 });
    await advance(DRAFT_MAX_WAIT_MS);
    expect(await volumeIn(draftId)).toBe(0.41);
    s().updateTrack(keysId, { volume: 0.42 });
    window.dispatchEvent(new Event('pagehide'));
    expect(readMirrors(USER.userKey)).toHaveLength(1);
  });

  it('writes an edit made after flushOutgoing into the kept draft', async () => {
    renderHook(() => useDraftAutosave());
    drawNote();
    await advance(DRAFT_DEBOUNCE_MS);
    await port().flushOutgoing('open:new');
    s().updateTrack(keysId, { volume: 0.123 });
    const kept = await port().retireOutgoing('auto');

    expect(kept?.draftId).toBe(draftId);
    expect(kept?.origin).toBe('kept');
    expect(await volumeIn(draftId)).toBe(0.123);
  });

  it('mirrors an edit when the page dies while keeping', async () => {
    renderHook(() => useDraftAutosave());
    drawNote();
    await advance(DRAFT_DEBOUNCE_MS);
    await port().flushOutgoing('open:new');
    writes.mockImplementation(() => new Promise(() => {}));
    s().updateTrack(keysId, { volume: 0.77 });
    window.dispatchEvent(new Event('pagehide'));

    const [mirror] = readMirrors(USER.userKey);
    expect(mirror?.entry?.draftId).toBe(draftId);
    expect(
      (JSON.parse(mirror!.entry!.text) as SessionData).data.tracks[0].volume,
    ).toBe(0.77);
  });

  it('finishes keeping when the store stalls: the mirror holds the work', async () => {
    renderHook(() => useDraftAutosave());
    drawNote();
    await advance(DRAFT_DEBOUNCE_MS);
    writes.mockImplementation(() => new Promise(() => {}));
    vi.spyOn(store, 'getMeta').mockImplementation(() => new Promise(() => {}));
    s().updateTrack(keysId, { volume: 0.55 });

    let flushed = false;
    const flush = port()
      .flushOutgoing('open:new')
      .then(() => (flushed = true));
    await vi.advanceTimersByTimeAsync(DRAFT_FLUSH_TIMEOUT_MS + 10);
    await flush;
    expect(flushed).toBe(true);
    const [mirror] = readMirrors(USER.userKey);
    expect(
      (JSON.parse(mirror!.entry!.text) as SessionData).data.tracks[0].volume,
    ).toBe(0.55);

    let retired: unknown = 'pending';
    const retire = port()
      .retireOutgoing('auto')
      .then((kept) => (retired = kept));
    await vi.advanceTimersByTimeAsync(
      DRAFT_RETIRE_TIMEOUT_MS + DRAFT_CHAIN_STALL_MS,
    );
    await retire;
    expect(retired).toBeNull();
    expect(useDraftStatusStore.getState().draftId).toBeNull();

    // The next session isn't stuck behind the stalled transaction.
    vi.mocked(store.getMeta).mockRestore();
    writes.mockImplementation((w) => real.write(w));
    const opening = openNewSession();
    await vi.advanceTimersByTimeAsync(DRAFT_CHAIN_STALL_MS * 3);
    await opening;
    expect(await real.getMeta(draftId)).toMatchObject({ origin: 'session' });

    // The mirror reconciles into the old draft at the next boot.
    const old = mirror!.entry!.draftId;
    expect((await reconcileMirror(real, USER.userKey, old)).outcome).toBe(
      'applied',
    );
    expect(await volumeIn(old)).toBe(0.55);
  });

  it('makes the retired draft live again when the open stops before switching', async () => {
    renderHook(() => useDraftAutosave());
    drawNote();
    await advance(DRAFT_DEBOUNCE_MS);
    const claim = await port().claim(USER, { boot: false });
    await port().flushOutgoing('open:new');
    const kept = await port().retireOutgoing('auto');
    expect(kept?.origin).toBe('kept');
    expect(await port().deleteDraft(draftId)).toBe('refused');

    // openSession's editor-gone path: unkeep, then release the claim.
    await port().unkeep(kept!.draftId);
    port().release(claim);
    await settle();

    expect(port().activeDraftId()).toBe(draftId);
    expect(useDraftStatusStore.getState().paused).toBe(false);
    expect(await real.getMeta(draftId)).toMatchObject({ origin: 'session' });
    s().updateTrack(keysId, { volume: 0.61 });
    await advance(DRAFT_DEBOUNCE_MS);
    expect(await volumeIn(draftId)).toBe(0.61);
  });

  it('makes a removed draft again when the open stops before switching', async () => {
    renderHook(() => useDraftAutosave());
    const claim = await port().claim(USER, { boot: false });
    await port().flushOutgoing('open:new');
    expect(await port().retireOutgoing('auto')).toBeNull(); // pristine
    expect(await real.getMeta(draftId)).toBeNull();

    port().release(claim);
    drawNote();
    await advance(DRAFT_DEBOUNCE_MS);
    expect(port().activeDraftId()).toBe(draftId);
    expect(savedPitches()).toEqual([60]);
    expect(await real.getMeta(draftId)).not.toBeNull();
  });
});

describe('a conflict fork', () => {
  it('keeps the edit in a mirror when the copy can’t be stored', async () => {
    renderHook(() => useDraftAutosave());
    await rewrite(draftId, 'other-tab');
    writes.mockImplementation(async (w) => {
      if (w.expectedSeq === null) throw new DraftStorageError('quota', 'full');
      return real.write(w);
    });
    vi.spyOn(store, 'prune').mockResolvedValue({
      deletedDrafts: [],
      deletedMedia: 0,
      freedChars: 0,
    });
    drawNote();
    window.dispatchEvent(new Event('pagehide'));
    await settle();

    const mirrors = readMirrors(USER.userKey);
    expect(mirrors.length).toBeGreaterThan(0);
    expect(
      mirrors.some(
        ({ entry }) =>
          (JSON.parse(entry!.text) as SessionData).data.tracks[0].midiClips[0]
            .events.notes[0] === 60,
      ),
    ).toBe(true);
  });

  it('in a room leaves the shared name and project alone', async () => {
    renderHook(() => useDraftAutosave());
    s().setProjectName('Class Jam');
    s().setProjectId('room-project');
    useStore.setState({ roomId: 'room-1' });
    await advance(DRAFT_DEBOUNCE_MS);
    await rewrite(draftId, 'other-tab');
    drawNote();
    await advance(DRAFT_DEBOUNCE_MS);

    const forkId = useDraftStatusStore.getState().draftId!;
    expect(forkId).not.toBe(draftId);
    expect(s().projectName).toBe('Class Jam');
    expect(s().projectId).toBe('room-project');
    const fork = await real.getMeta(forkId);
    expect(fork?.name).toBe('Class Jam (copy)');
    expect(fork?.projectId).toBeUndefined();
  });
});

describe('signing out', () => {
  it('removes the open draft when it is a complete cloud copy, and mirrors no scroll after', async () => {
    renderHook(() => useDraftAutosave());
    s().setProjectId('project-5');
    await advance(DRAFT_DEBOUNCE_MS);
    useCloudSaveStore.setState({
      lastSaved: {
        projectId: 'project-5',
        fingerprint: hashFingerprint(documentFingerprint()),
        version: useSaveStatusStore.getState().documentVersion,
        complete: true,
        updatedAt: '2026-10-08T10:00:00.000Z',
        at: Date.now(),
        generation: getSessionGeneration(),
      },
    });
    await settle();

    const done = runBeforeSignOut(1000);
    await vi.advanceTimersByTimeAsync(0);
    await settle();
    await done;
    expect(await real.getMeta(draftId)).toBeNull();

    s().setTimelineZoom(4);
    window.dispatchEvent(new Event('pagehide'));
    expect(readMirrors(USER.userKey)).toHaveLength(0);
  });

  it('keeps an unsaved draft', async () => {
    renderHook(() => useDraftAutosave());
    drawNote();
    const done = runBeforeSignOut(1000);
    await vi.advanceTimersByTimeAsync(0);
    await settle();
    await done;
    expect(savedPitches()).toEqual([60]);
    expect(await real.getMeta(draftId)).not.toBeNull();
  });
});

// Critique: a take's bytes usually land after the edit's own write; the
// manifest change must write them into the meta, or gcMedia deletes them.
describe('a take’s bytes in the draft', () => {
  const realBlob = globalThis.Blob;
  let releasePut: () => void = () => {};

  beforeEach(async () => {
    vi.useRealTimers();
    // fake-indexeddb clones with Node's structuredClone (Node's Blob only).
    (globalThis as { Blob?: unknown }).Blob = NodeBlob;
    resetDraftAutosaveForTests();
    resetPendingMediaForTests();
    idbFactory = new IDBFactory();
    real = createDraftStore({ indexedDB: idbFactory, storage: memory });
    store = wrap(real);
    setDraftStoreForTests(store);
    await openNewSession();
    clearCounts();
    const gate = new Promise<void>((resolve) => (releasePut = resolve));
    vi.spyOn(store, 'putMedia').mockImplementation(async (record) => {
      await gate;
      return real.putMedia(record);
    });
  });

  afterEach(() => {
    globalThis.Blob = realBlob;
    idbFactory = null;
  });

  function recordTake(): void {
    const guitar = s().addTrack('audio', 'guitar-fx', 'Guitar');
    s().addAudioClip(guitar, {
      id: 'take-1',
      startTick: 0,
      duration: 1920,
      fadeInTicks: 0,
      fadeOutTicks: 0,
      assetId: null,
    });
    const bytes = new Uint8Array(4096).map((_, i) => i % 251).buffer;
    setAudioBuffer('take-1', {
      duration: 4096 / 48_000,
      sampleRate: 48_000,
      numberOfChannels: 1,
      length: 4096,
      getChannelData: () => new Float32Array(4096),
    } as unknown as AudioBuffer);
    setOriginalAudio('take-1', bytes, 'audio/wav');
  }

  const takeRef = (meta: DraftMeta | null) =>
    meta?.media.find((ref) => ref.clipIds.includes('take-1'));

  it('writes the media ref when the bytes land after the edit’s write', async () => {
    renderHook(() => useDraftAutosave());
    recordTake();
    // The edit's own write lands first, without the bytes.
    await vi.waitFor(
      async () => expect((await real.getMeta(draftId))?.trackCount).toBe(2),
      { timeout: 3000 },
    );
    expect(takeRef(await real.getMeta(draftId))).toBeUndefined();
    expect((await real.getMeta(draftId))?.mediaMissing).toBe(1);

    // The put lands with no further edit: a write records it.
    releasePut();
    await vi.waitFor(
      async () =>
        expect(takeRef(await real.getMeta(draftId))).toMatchObject({
          contentType: 'audio/wav',
          size: 4096,
        }),
      { timeout: 4000 },
    );
    expect((await real.getMeta(draftId))?.mediaMissing).toBe(0);
  });

  it('records the bytes when the editor unmounts right after a take', async () => {
    const { unmount } = renderHook(() => useDraftAutosave());
    recordTake();
    unmount();
    await new Promise((resolve) => setTimeout(resolve, 100));
    releasePut();
    await vi.waitFor(
      async () =>
        expect(takeRef(await real.getMeta(draftId))).toMatchObject({
          size: 4096,
        }),
      { timeout: 4000 },
    );
  });
});

/** Write a stored draft again as `writerDoc` (another tab, or this page). */
async function rewrite(id: string, writerDoc: string): Promise<void> {
  const writer = createDraftStore({
    indexedDB: idbFactory,
    storage: memory,
    writerDoc,
  });
  const meta: Partial<DraftMeta> = { ...(await writer.getMeta(id))! };
  const expectedSeq = meta.writeSeq!;
  delete meta.v;
  delete meta.writeSeq;
  delete meta.updatedAt;
  delete meta.writer;
  delete meta.contentHash;
  await writer.write({
    meta: meta as DraftWrite['meta'],
    text: (await writer.readBody(id))!.text,
    expectedSeq,
  });
}
