/**
 * mspResponseInbox — pure store for module → parent MSP responses. The
 * canonical write path is `recordMspResponseForUser`, called from two
 * places:
 *   1. The classroom-session PartyKit socket (`useSessionSync`) on
 *      incoming `{ type: 'response', ... }` messages.
 *   2. The `postMessage` handler in `useMspReport` for embedded modules.
 *
 * Both routes dispatch the same `INBOX_EVENT` (`msp:inbox`) window
 * CustomEvent so `useMspReport` subscribers receive the entry regardless
 * of which channel delivered it.
 */
import type { ArtifactRef } from '../assignments/useAssignmentProgress';
import type { AtlasModule } from './capabilities';

export const STORAGE_KEY = 'ma-teacher:msp-inbox:v1';
export const SCHEMA_VERSION = 1;
export const INBOX_EVENT = 'msp:inbox';

export type MspResultPayload =
  | { kind: 'completion'; completed: true }
  | { kind: 'score'; score: number; max: number }
  | { kind: 'artifact'; artifactRef: ArtifactRef };

export interface MspParticipant {
  enrollmentId: string;
  accountId?: string;
}

export interface MspResponseEntry {
  token: string;
  interactionId: string;
  participant: MspParticipant;
  /** Optional: real-backend socket messages don't carry these; local writers
   * (MockLearn dev harness, cached-mint-scoped fanout) still populate them. */
  module?: AtlasModule;
  activityRef?: string;
  payload: MspResultPayload;
  createdAt: string;
}

export interface MspInboxStore {
  schemaVersion: number;
  entries: Record<string, MspResponseEntry>;
}

const EMPTY_STORE: MspInboxStore = {
  schemaVersion: SCHEMA_VERSION,
  entries: {},
};

const isBrowser = typeof window !== 'undefined';

const keyFor = (userId: string | null | undefined): string =>
  `${STORAGE_KEY}:${userId || 'anon'}`;

/**
 * The localStorage key holding a user's inbox — exported so cross-tab `storage`
 * listeners (new-tab module launches) can filter on it.
 */
export const mspInboxStorageKey = (userId: string | null | undefined): string =>
  keyFor(userId);

const readStore = (userId: string | null | undefined): MspInboxStore => {
  if (!isBrowser) return EMPTY_STORE;
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    if (!raw) return EMPTY_STORE;
    const parsed = JSON.parse(raw) as MspInboxStore;
    if (parsed?.schemaVersion !== SCHEMA_VERSION) {
      window.localStorage.setItem(`${keyFor(userId)}.bak`, raw);
      return EMPTY_STORE;
    }
    return {
      schemaVersion: SCHEMA_VERSION,
      entries: parsed.entries ?? {},
    };
  } catch {
    return EMPTY_STORE;
  }
};

const writeStore = (
  userId: string | null | undefined,
  store: MspInboxStore,
  broadcast?: MspResponseEntry,
): void => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(store));
    window.dispatchEvent(new Event(`${keyFor(userId)}:changed`));
    if (broadcast) {
      window.dispatchEvent(
        new CustomEvent<MspResponseEntry>(INBOX_EVENT, { detail: broadcast }),
      );
    }
  } catch {
    // No-op on quota / privacy mode.
  }
};

export interface RecordMspResponseInput {
  token: string;
  interactionId: string;
  participant: MspParticipant;
  /** Optional: real-backend socket messages omit these; local writers
   * (MockLearn dev harness, cached-mint-scoped fanout) still populate them. */
  module?: AtlasModule;
  activityRef?: string;
  payload: MspResultPayload;
}

export const recordMspResponseForUser = (
  userId: string | null,
  input: RecordMspResponseInput,
): MspResponseEntry => {
  const entry: MspResponseEntry = {
    token: input.token,
    interactionId: input.interactionId,
    participant: input.participant,
    module: input.module,
    activityRef: input.activityRef,
    payload: input.payload,
    createdAt: new Date().toISOString(),
  };
  const current = readStore(userId);
  const next: MspInboxStore = {
    ...current,
    entries: { ...current.entries, [input.token]: entry },
  };
  writeStore(userId, next, entry);
  return entry;
};

export const readMspInboxForUser = (userId: string | null): MspInboxStore =>
  readStore(userId);

export const consumeMspEntryForUser = (
  userId: string | null,
  token: string,
): void => {
  const current = readStore(userId);
  if (!(token in current.entries)) return;
  const nextEntries = { ...current.entries };
  delete nextEntries[token];
  writeStore(userId, { ...current, entries: nextEntries });
};
