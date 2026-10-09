/**
 * Fakes for openSession's ports (SessionDeps): an in-memory DraftSessionPort
 * that keeps real session text (serializeSession / deserializeSession), and
 * a CollabPort that moves the editor store's room keys the way
 * CollabProvider does. Every call lands in `log`, in order, so a test can
 * assert what happened before what.
 */
import { vi } from 'vitest';
import { hasWorkToKeep } from '@/daw/persistence/saveStatusStore';
import {
  deserializeSession,
  serializeSession,
} from '@/daw/persistence/SessionSerializer';
import { getBridge, setBridge } from '@/daw/collab/collabMiddleware';
import type { ZustandYjsBridge } from '@/daw/collab/ZustandYjsBridge';
import { useStore } from '@/daw/store';
import { userKeyOf, type UserKey } from '@/lib/local-store/userScope';
import {
  DraftStorageError,
  type DraftBaseline,
  type DraftMeta,
  type QuarantineRecord,
} from '@/lib/studio-projects/drafts/types';
import { registerSessionDeps, type SessionDeps } from '../sessionDeps';
import type {
  BootNotice,
  CollabPort,
  DraftClaim,
  DraftSessionPort,
  PreparedDraft,
  SessionUser,
} from '../types';

export const TEST_USER: SessionUser = {
  userId: 'student-a',
  userKey: userKeyOf('student-a'),
};

export function makeMeta(
  partial: Partial<DraftMeta> & { draftId: string },
): DraftMeta {
  return {
    v: 1,
    userKey: TEST_USER.userKey,
    origin: 'session',
    createdAt: 1,
    updatedAt: 1,
    writeSeq: 1,
    writer: { build: 'test', doc: 'other-page' },
    schema: 3,
    name: 'Untitled Project',
    trackCount: 0,
    chars: 0,
    contentHash: 'h1:0',
    docFingerprint: 'h1:work',
    hasContent: true,
    baseline: {
      source: 'new',
      reopenable: true,
      fingerprint: 'h1:base',
    },
    media: [],
    mediaMissing: 0,
    ...partial,
  };
}

/** The live store as session text (what a draft body holds). */
export function currentSessionText(): string {
  return JSON.stringify(serializeSession());
}

interface StoredDraft {
  meta: DraftMeta;
  text: string;
}

export interface FakeDrafts extends DraftSessionPort {
  readonly log: string[];
  readonly drafts: Map<string, StoredDraft>;
  /** Drafts another tab holds the lock of. */
  readonly lockedElsewhere: Set<string>;
  /** The draft the port treats as the live session's. */
  active: string | null;
  notices: BootNotice[];
  /** What chooseResume answers (undefined: the newest draft). */
  resumeId: string | null | undefined;
  projectDraft: DraftMeta | null;
  flushError: unknown;
  readError: unknown;
  /** Begins in order: [draftId, baseline, extras]. */
  readonly begun: Array<
    [string, DraftBaseline, { roomId?: string } | undefined]
  >;
  readonly released: string[];
  readonly restored: Array<[string, number]>;
  put(meta: DraftMeta, text: string): void;
}

export function createFakeDrafts(): FakeDrafts {
  const log: string[] = [];
  const drafts = new Map<string, StoredDraft>();
  const lockedElsewhere = new Set<string>();
  const begun: FakeDrafts['begun'] = [];
  const released: string[] = [];
  const restored: Array<[string, number]> = [];
  let seq = 0;
  let pendingClaim: DraftClaim | null = null;

  const fake: FakeDrafts = {
    log,
    drafts,
    lockedElsewhere,
    active: null,
    notices: [],
    resumeId: undefined,
    projectDraft: null,
    flushError: null,
    readError: null,
    begun,
    released,
    restored,
    put(meta, text) {
      drafts.set(meta.draftId, { meta, text });
    },

    activeDraftId: () => fake.active,
    prepareUser: vi.fn(async (user: SessionUser) => {
      log.push(`prepareUser:${user.userKey}`);
      return fake.notices;
    }),
    chooseResume: vi.fn(async () => {
      log.push('chooseResume');
      if (fake.resumeId !== undefined) return fake.resumeId;
      const newest = [...drafts.values()].sort(
        (a, b) => b.meta.updatedAt - a.meta.updatedAt,
      )[0];
      return newest?.meta.draftId ?? null;
    }),
    findProjectDraft: vi.fn(async (_user: SessionUser, projectId: string) => {
      log.push(`findProjectDraft:${projectId}`);
      return fake.projectDraft;
    }),
    claim: vi.fn(
      async (
        user: SessionUser,
        target: { draftId?: string; boot: boolean },
      ): Promise<DraftClaim> => {
        log.push(`claim:${target.draftId ?? 'new'}`);
        if (target.draftId && lockedElsewhere.has(target.draftId)) {
          return {
            draftId: `fork-${++seq}`,
            userKey: user.userKey,
            mode: 'fork',
            sourceDraftId: target.draftId,
            lock: null,
          };
        }
        if (target.draftId) {
          return {
            draftId: target.draftId,
            userKey: user.userKey,
            mode: 'existing',
            lock: null,
          };
        }
        return {
          draftId: `new-${++seq}`,
          userKey: user.userKey,
          mode: 'new',
          lock: null,
        };
      },
    ),
    read: vi.fn(async (claim: DraftClaim): Promise<PreparedDraft> => {
      log.push(`read:${claim.draftId}`);
      if (fake.readError) throw fake.readError;
      const id = claim.mode === 'fork' ? claim.sourceDraftId! : claim.draftId;
      const stored = drafts.get(id);
      if (!stored) throw new DraftStorageError('not-found', 'no such draft');
      return {
        claim,
        meta: stored.meta,
        body: {
          draftId: id,
          writeSeq: stored.meta.writeSeq,
          text: stored.text,
        },
      };
    }),
    release: vi.fn((claim: DraftClaim) => {
      log.push(`release:${claim.draftId}`);
      released.push(claim.draftId);
    }),
    flushOutgoing: vi.fn(async (reason: string) => {
      log.push(`flush:${reason}`);
      if (fake.flushError) throw fake.flushError;
      if (fake.active === null) return null;
      const stored = drafts.get(fake.active);
      if (stored) stored.text = currentSessionText();
      return stored?.meta ?? null;
    }),
    retireOutgoing: vi.fn(async (policy: 'auto' | 'discard') => {
      log.push(`retire:${policy}`);
      const id = fake.active;
      if (id === null) return null;
      const work = policy === 'auto' && hasWorkToKeep();
      if (!work) {
        drafts.delete(id);
        return null;
      }
      const name = useStore.getState().projectName;
      const meta = makeMeta({
        ...(drafts.get(id)?.meta ?? {}),
        draftId: id,
        origin: 'kept',
        keptAt: Date.now(),
        name,
      });
      drafts.set(id, { meta, text: currentSessionText() });
      return meta;
    }),
    activate: vi.fn((claim: DraftClaim) => {
      log.push(`activate:${claim.draftId}`);
      fake.active = claim.draftId;
      pendingClaim = claim;
    }),
    apply: vi.fn((prepared: PreparedDraft) => {
      log.push(`apply:${prepared.claim.draftId}`);
      if (!deserializeSession(prepared.body.text)) {
        throw new Error('the draft did not decode');
      }
      if (prepared.meta.projectId) {
        useStore.getState().setProjectId(prepared.meta.projectId);
      }
      if (prepared.claim.mode === 'fork') {
        const store = useStore.getState();
        store.setProjectName(`${prepared.meta.name} (copy)`);
        store.setProjectId(null);
      }
    }),
    begin: vi.fn(
      async (baseline: DraftBaseline, extras?: { roomId?: string }) => {
        const id = fake.active ?? pendingClaim?.draftId ?? 'none';
        log.push(`begin:${id}:${baseline.source}`);
        begun.push([id, baseline, extras]);
        const existing = drafts.get(id);
        const meta = makeMeta({
          ...(existing?.meta ?? {}),
          draftId: id,
          origin: 'session',
          baseline,
          ...(extras?.roomId ? { roomId: extras.roomId } : {}),
        });
        drafts.set(id, { meta, text: currentSessionText() });
        return meta;
      },
    ),
    restoreMedia: vi.fn(async (meta: DraftMeta, generation: number) => {
      log.push(`restoreMedia:${meta.draftId}`);
      restored.push([meta.draftId, generation]);
    }),
    unkeep: vi.fn(async (draftId: string) => {
      log.push(`unkeep:${draftId}`);
      const stored = drafts.get(draftId);
      if (stored) stored.meta = { ...stored.meta, origin: 'session' };
    }),
    patchCloud: vi.fn(async () => {}),
    listDrafts: vi.fn(async (user: SessionUser) => {
      log.push('listDrafts');
      const mine = [...drafts.values()]
        .map((d) => d.meta)
        .filter((m) => m.userKey === user.userKey);
      return {
        mine,
        device: [] as DraftMeta[],
        quarantined: [] as QuarantineRecord[],
        locked: new Set(lockedElsewhere),
      };
    }),
    deleteDraft: vi.fn(async () => 'deleted' as const),
    claimDeviceDraft: vi.fn(async (_user: SessionUser, draftId: string) => {
      log.push(`claimDevice:${draftId}`);
      return drafts.get(draftId)?.meta ?? null;
    }),
  };
  return fake;
}

export interface FakeCollab extends CollabPort {
  readonly log: string[];
  /** The room's first sync: connected, as CollabProvider reports it. */
  connect(): void;
  /** The provider gives up: the room cleared, then why. */
  fail(message: string): void;
}

/** A CollabPort that moves the store's room keys as CollabProvider does. */
export function createFakeCollab(log: string[] = []): FakeCollab {
  const join = (roomId: string, role: 'owner' | 'editor' | 'viewer') => {
    const store = useStore.getState();
    store._setRoomInfo(roomId, role, roomId);
    store._setConnectionStatus('connecting');
  };
  return {
    log,
    leaveRoom: vi.fn(() => {
      log.push(`leaveRoom:tracks=${useStore.getState().tracks.length}`);
      setBridge(null);
      useStore.getState()._clearCollab();
    }),
    createAndJoinRoom: vi.fn(() => {
      log.push('createAndJoinRoom');
      join('abcd1234', 'owner');
    }),
    joinRoom: vi.fn((roomId: string, role = 'editor') => {
      log.push(`joinRoom:${roomId}:${role}`);
      join(roomId, role as 'owner' | 'editor');
    }),
    joinRoomById: vi.fn((roomId: string, role = 'editor') => {
      log.push(`joinRoomById:${roomId}`);
      join(roomId.trim().toLowerCase(), role as 'owner' | 'editor');
    }),
    joinRoomAwaitingHost: vi.fn((roomId: string) => {
      log.push(`joinRoomAwaitingHost:${roomId}`);
      join(roomId.trim().toLowerCase(), 'editor');
    }),
    connect() {
      useStore.getState()._setConnectionStatus('connected');
    },
    fail(message: string) {
      const store = useStore.getState();
      store._clearCollab();
      store._setRoomError(message);
    },
  } as FakeCollab;
}

/**
 * A stand-in for the room's Yjs bridge: it counts every store write it would
 * forward to the shared document (the middleware's syncToYjs, and any store
 * change while it is attached, as the real bridge observes the store).
 */
export function installStubBridge(): {
  syncToYjs: ReturnType<typeof vi.fn>;
  writes: () => number;
  detach: () => void;
} {
  const syncToYjs = vi.fn();
  const stub = {
    suppressStoreToYjs: false,
    syncToYjs,
  } as unknown as ZustandYjsBridge;
  let storeWrites = 0;
  // Counted only while the stub is the live bridge (leaveRoom detaches it).
  const unsubscribe = useStore.subscribe(() => {
    if (getBridge() === stub) storeWrites += 1;
  });
  setBridge(stub);
  const detach = () => {
    unsubscribe();
    if (getBridge() === stub) setBridge(null);
  };
  return {
    syncToYjs,
    writes: () => storeWrites + syncToYjs.mock.calls.length,
    detach,
  };
}

export interface FakeEnv {
  deps: SessionDeps;
  drafts: FakeDrafts;
  collab: FakeCollab;
  navigate: ReturnType<typeof vi.fn>;
  openProjectsDialog: ReturnType<typeof vi.fn>;
  user: SessionUser | null;
  token: string | null;
  access: 'open' | 'wait' | 'upgrade';
  unregister: () => void;
}

/** Register fake deps; the editor's URL is /studio/editor`search`. */
export function installFakeDeps(
  opts: {
    user?: SessionUser | null;
    token?: string | null;
    userKey?: UserKey;
  } = {},
): FakeEnv {
  const drafts = createFakeDrafts();
  const collab = createFakeCollab(drafts.log);
  const navigate = vi.fn((search: string, opts?: { replace: boolean }) => {
    if (opts?.replace === false) {
      window.history.pushState(null, '', `/studio/editor${search}`);
    } else {
      window.history.replaceState(null, '', `/studio/editor${search}`);
    }
  });
  const openProjectsDialog = vi.fn();
  const env = {
    drafts,
    collab,
    navigate,
    openProjectsDialog,
    user: opts.user === undefined ? TEST_USER : opts.user,
    token: opts.token === undefined ? 'token-1' : opts.token,
    access: 'open',
  } as FakeEnv;
  env.deps = {
    user: () => env.user,
    token: () => env.token,
    lessonAccess: () => env.access,
    collab,
    drafts,
    navigate: (search, o) => navigate(search, o),
    openProjectsDialog: (o) => openProjectsDialog(o),
  };
  env.unregister = registerSessionDeps(env.deps);
  return env;
}

/** Put the page on `/studio/editor` + `search`. */
export function setEditorUrl(search: string): void {
  window.history.replaceState(null, '', `/studio/editor${search}`);
}
