import { useMemo } from 'react';
import type { EventConnection } from '@/components/atlas/data/eventConnections';
import { connectionsData } from '@/components/atlas/data/loaders';
import {
  getTimelineIndex,
  type TimelineEvent,
} from '@/components/atlas/data/timelineIndex';
import { useLazyResource } from '@/components/atlas/hooks/useLazyResource';
import { buildNetworkIndex, type NetworkIndex } from './networkIndex';

let cached: {
  events: readonly TimelineEvent[];
  connections: readonly EventConnection[];
  index: NetworkIndex;
} | null = null;

/**
 * The network over the loaded content, built once per content load (the
 * timeline index is rebuilt when content changes, and so is this).
 */
export function getNetworkIndex(
  connections: readonly EventConnection[],
): NetworkIndex {
  const events = getTimelineIndex();
  if (cached?.events === events && cached.connections === connections) {
    return cached.index;
  }
  const index = buildNetworkIndex(events, connections);
  cached = { events, connections, index };
  return index;
}

export interface NetworkState {
  status: 'loading' | 'ready' | 'error';
  index: NetworkIndex | null;
  retry: () => void;
}

/**
 * The network, once the influence links have loaded (their own chunk,
 * data/loaders.ts), starting the load while `enabled`.
 */
export function useNetwork(enabled = true): NetworkState {
  const links = useLazyResource(connectionsData, enabled);
  const connections =
    links.status === 'ready' ? links.data.allConnections() : null;
  const events = getTimelineIndex();
  const index = useMemo(
    () => (connections ? getNetworkIndex(connections) : null),
    // The timeline index's identity changes with the content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connections, events],
  );
  return {
    status: links.status === 'error' ? 'error' : index ? 'ready' : 'loading',
    index,
    retry: links.retry,
  };
}

/** Start loading the links before they are needed (a tab's hover). */
export function prefetchNetwork(): void {
  connectionsData.load().catch(() => undefined);
}
