import { useEffect, useRef } from 'react';
import { useChallenges, useCompleteChallenge } from '@/hooks/data/challenges';
import { challengeEventBus } from '@/lib/challenges/eventBus';
import { eventMatchesCriteria } from '@/lib/challenges/matchCriteria';
import type { Challenge } from '@/lib/challenges/types';
import { trackChallengeStarted } from '@/telemetry/hooks/useTelemetryProduct';

export function useChallengeWatcher() {
  const { data } = useChallenges();
  const completeChallenge = useCompleteChallenge();

  const challenges = data?.challenges ?? [];

  const challengesRef = useRef<Challenge[]>([]);
  challengesRef.current = challenges;

  const inFlightRef = useRef<Set<string>>(new Set());
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    challenges.forEach((c) => {
      if (c.status === 'active' && !seenRef.current.has(c.id)) {
        seenRef.current.add(c.id);
        trackChallengeStarted(c.id, {
          name: c.name,
          xpReward: c.xpReward,
          criteriaKind: c.criteria?.kind,
        });
      }
    });
  }, [challenges]);

  useEffect(() => {
    return challengeEventBus.subscribe((event) => {
      const matches = challengesRef.current.filter(
        (c) => c.status === 'active' && eventMatchesCriteria(event, c),
      );

      matches.forEach((challenge) => {
        if (inFlightRef.current.has(challenge.id)) return;
        inFlightRef.current.add(challenge.id);

        completeChallenge.mutate(
          { id: challenge.id, evidence: { event } },
          {
            onSettled: () => {
              inFlightRef.current.delete(challenge.id);
            },
          },
        );
      });
    });
  }, [completeChallenge]);
}
