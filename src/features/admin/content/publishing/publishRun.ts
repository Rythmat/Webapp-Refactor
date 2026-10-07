import { useSyncExternalStore } from 'react';
import {
  type ContentKind,
  type ContentOverviewRow,
  usePublishContent,
} from '@/hooks/data/admin/useAdminContent';

/**
 * The console's one publish, wherever it was started.
 *
 * Publishing a kind is a client-driven loop — open a release, build every
 * shard, activate — so it used to live and die with the Publishing page: leave
 * the page and the progress vanished while the requests carried on unseen, and
 * a second Publish could start beside the first. This store holds the run
 * instead. One at a time, from the Publishing page or the edit bar; the
 * progress survives navigation; the tab warns before closing mid-run.
 *
 * "Publish everything that changed" runs kind by kind in the contract's
 * dependency order — places, labels, studios, artists, records, songs, then
 * the rest — so nothing ships pointing at something not yet live, and it
 * stops at the first failure rather than shipping around it.
 */

/**
 * Referenced kinds first (docs/console-content-api-contract.md, publish
 * order): the vocabularies the records name, then places, labels, studios,
 * artists, records and songs, then the globe events derived from songs and
 * artists' places (docs/console-backend-integration.md, cascades).
 */
export const PUBLISH_ORDER: readonly ContentKind[] = [
  'genre',
  'subgenre',
  'instrument',
  'globe_city',
  'label',
  'studio',
  'artist',
  'release',
  'song',
  'globe_event',
];

export interface PublishRunState {
  status: 'idle' | 'running' | 'done' | 'failed';
  /** The run's kinds, in the order they publish. */
  kinds: ContentKind[];
  current: ContentKind | null;
  published: ContentKind[];
  progress: { done: number; total: number } | null;
  error: string | null;
}

const IDLE: PublishRunState = {
  status: 'idle',
  kinds: [],
  current: null,
  published: [],
  progress: null,
  error: null,
};

let state: PublishRunState = IDLE;
const listeners = new Set<() => void>();

const set = (next: Partial<PublishRunState>) => {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const warnBeforeUnload = (event: BeforeUnloadEvent) => {
  event.preventDefault();
  event.returnValue = '';
};

/** Kinds that changed since their last publish, in publish order. */
export function kindsToPublish(
  rows: readonly ContentOverviewRow[],
): ContentKind[] {
  const changed = rows
    .filter((row) => row.changedSincePublish > 0 && row.published > 0)
    .map((row) => row.kind);
  const rank = (kind: ContentKind) => {
    const i = PUBLISH_ORDER.indexOf(kind);
    return i === -1 ? PUBLISH_ORDER.length : i;
  };
  // Stable: kinds outside the order keep the overview's order.
  return changed
    .map((kind, i) => ({ kind, i }))
    .sort((a, b) => rank(a.kind) - rank(b.kind) || a.i - b.i)
    .map(({ kind }) => kind);
}

/**
 * Publish `kinds` one after another. Resolves when the run ends, however it
 * ends; a second call while one is running is refused (returns false).
 */
export async function runPublish(
  kinds: readonly ContentKind[],
  publishOne: (kind: ContentKind) => Promise<unknown>,
): Promise<boolean> {
  if (state.status === 'running' || kinds.length === 0) return false;
  set({ ...IDLE, status: 'running', kinds: [...kinds] });
  window.addEventListener('beforeunload', warnBeforeUnload);
  try {
    for (const kind of kinds) {
      set({ current: kind, progress: null });
      await publishOne(kind);
      set({ published: [...state.published, kind] });
    }
    set({ status: 'done', current: null, progress: null });
  } catch (error) {
    set({
      status: 'failed',
      progress: null,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    window.removeEventListener('beforeunload', warnBeforeUnload);
  }
  return true;
}

/** Shard progress for the kind publishing now. */
export const reportPublishProgress = (done: number, total: number) =>
  set({ progress: { done, total } });

/** Clear a finished or failed run's summary. */
export const dismissPublishRun = () => {
  if (state.status !== 'running') set(IDLE);
};

export const usePublishRun = (): PublishRunState =>
  useSyncExternalStore(subscribe, () => state);

/** Start a publish of one kind, or of several in order. */
export function usePublishActions() {
  const publish = usePublishContent(reportPublishProgress);
  return {
    publish: (kinds: readonly ContentKind[]) =>
      runPublish(kinds, (kind) => publish.mutateAsync(kind)),
  };
}

/** Tests only: forget any run. */
export const resetPublishRunForTests = () => {
  state = IDLE;
  listeners.clear();
};
