import type { ChallengeEvent } from './types';

type Listener = (event: ChallengeEvent) => void;

const listeners = new Set<Listener>();

export const challengeEventBus = {
  emit(event: ChallengeEvent) {
    listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('[challengeEventBus] listener threw', err);
      }
    });
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function reportChallengeEvent(event: ChallengeEvent) {
  challengeEventBus.emit(event);
}
