/**
 * useLiveResponses — session-scoped counterpart to useAssignmentProgress.
 * Reads store.responses[sessionId] and delegates to buildResponseAggregate so
 * the teacher dashboard uses the same discriminated aggregate as the async
 * assignment path — no new selector logic.
 */
import { useCallback } from 'react';
import { useMe } from '@/hooks/data';
import {
  buildResponseAggregate,
  type ResponseAggregate,
} from '../assignments/buildResponseAggregate';
import type { Interaction, InteractionResponsePayload } from '../types';
import { readSessionsStoreForUser } from './sessionsStore';
import { useLocalSessionStore } from './useLocalSessionStore';

export interface DisplayNameLookup {
  (enrollmentId: string): string | undefined;
}

export interface UseLiveResponses {
  responsesByEnrollment: Record<
    string,
    Record<string, InteractionResponsePayload>
  >;
  aggregate: (
    interactions: Interaction[],
    getDisplayName?: DisplayNameLookup,
  ) => ResponseAggregate[];
  countResponses: () => number;
}

export const useLiveResponses = (sessionId: string): UseLiveResponses => {
  const { data: me } = useMe();
  const userId = me?.id ?? null;
  const { store } = useLocalSessionStore();
  const source =
    store.responses[sessionId] ??
    readSessionsStoreForUser(userId).responses[sessionId] ??
    {};

  const responsesByEnrollment = source;

  const aggregate = useCallback(
    (interactions: Interaction[], getDisplayName?: DisplayNameLookup) =>
      buildResponseAggregate({
        responsesByEnrollment,
        interactions,
        getDisplayName,
      }),
    [responsesByEnrollment],
  );

  const countResponses = useCallback(() => {
    let count = 0;
    for (const bag of Object.values(responsesByEnrollment)) {
      count += Object.keys(bag).length;
    }
    return count;
  }, [responsesByEnrollment]);

  return { responsesByEnrollment, aggregate, countResponses };
};
