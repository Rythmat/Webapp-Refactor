import { describe, expect, it } from 'vitest';
import { createEchoClassBus } from '../dev/echoClassBus';
import { DEFAULT_ECHO_CLASS_SETTINGS, type SessionEcho } from '../types';

/**
 * The dev class page's bus (dev/echoClassBus.ts) carries the session's own
 * message shapes through the store's own gate and reducer: only the
 * teacher publishes the round, a student's answer is upserted under the
 * student who sent it.
 */

const round: SessionEcho = {
  slideId: 's1',
  run: 1,
  section: 'melodyEcho',
  leader: 'atlas',
  level: 1,
  key: { tonic: 'C', mode: 'major' },
  tempo: 80,
  startsAt: 1,
  call: null,
  paused: false,
  settings: DEFAULT_ECHO_CLASS_SETTINGS,
};

describe('the dev class bus', () => {
  it('takes the round from the teacher only', () => {
    const bus = createEchoClassBus({ sessionId: 's', classroomId: 'c' });
    expect(bus.send('student', { kind: 'echo', echo: round }, 'a')).toBe(false);
    expect(bus.send('projector', { kind: 'echo', echo: round })).toBe(false);
    expect(bus.snapshot().state.echo).toBeUndefined();
    expect(bus.send('teacher', { kind: 'echo', echo: round })).toBe(true);
    expect(bus.snapshot().state.echo).toEqual(round);
  });

  it('upserts a student’s answer under the student who sent it', () => {
    const bus = createEchoClassBus({ sessionId: 's', classroomId: 'c' });
    const payload = {
      kind: 'echo' as const,
      slideId: 's1',
      rounds: [],
      bestStreak: 0,
    };
    bus.send(
      'student',
      { kind: 'response', interactionId: 'ix', enrollmentId: 'b', payload },
      'a',
    );
    expect(Object.keys(bus.snapshot().responses)).toEqual(['a']);
    expect(
      bus.send('teacher', {
        kind: 'response',
        interactionId: 'ix',
        enrollmentId: 'a',
        payload,
      }),
    ).toBe(false);
  });
});
