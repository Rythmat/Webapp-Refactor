import { useSyncExternalStore } from 'react';

/**
 * Whether the offline mock's changes are reaching the browser's storage:
 * IndexedDB, or localStorage where IndexedDB is refused (persist.ts).
 *
 * Kept apart from persist.ts so a banner can read it with a static import:
 * this module holds no storage key, no database name and no mock code, so
 * importing it from the console costs nothing in a build where the mock is
 * off (the status simply stays `ok`).
 *
 * IndexedDB saves land a moment after the change, so a failure shows up a
 * moment later too; the status always describes the latest save.
 *
 * The states a banner should show:
 * - `full`: a save hit the storage quota. The last good save is untouched and
 *   the mock keeps working in memory, but changes since then will not survive
 *   a reload. Reset clears it.
 * - `unreadable`: what was stored could not be read back. The mock started
 *   from the seed and will not overwrite the stored copy until Reset, so
 *   nothing is thrown away without asking.
 * - `unavailable`: the browser refused both IndexedDB and localStorage
 *   (blocked site data), a save failed for another reason, or the database
 *   was still opening when the mock started (`detail` says to reload). Changes
 *   live in memory only.
 * - `stale`: some saved changes were made against a different copy of the
 *   repo's content than the one the mock now seeds from (a song or event was
 *   edited in code since). Replaying them would land on the wrong fields, so
 *   they were left out; `detail` names them, and the next save drops them.
 *   Everything else was restored and saving carries on.
 */
export type MockStorageStatus =
  | { state: 'ok' }
  | { state: 'full'; detail: string }
  | { state: 'unreadable'; detail: string }
  | { state: 'unavailable'; detail: string }
  | { state: 'stale'; detail: string };

let status: MockStorageStatus = { state: 'ok' };
const listeners = new Set<() => void>();

export const getMockStorageStatus = (): MockStorageStatus => status;

const detailOf = (value: MockStorageStatus) =>
  'detail' in value ? value.detail : undefined;

export const setMockStorageStatus = (next: MockStorageStatus): void => {
  // Every save reports its outcome; only a change is worth a re-render.
  if (next.state === status.state && detailOf(next) === detailOf(status))
    return;
  status = next;
  for (const listener of listeners) listener();
};

export const subscribeMockStorageStatus = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** For a "Mock storage full — Reset" banner. */
export const useMockStorageStatus = (): MockStorageStatus =>
  useSyncExternalStore(
    subscribeMockStorageStatus,
    getMockStorageStatus,
    getMockStorageStatus,
  );
