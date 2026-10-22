import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GrooveLabAudio } from '../GrooveLab/GrooveLabAudio';

// ── Groove Lab's hi-hat: the next hat closes an open one ───────────────────
// A hi-hat is one instrument (Peter, 2026-10-22): an open hat rings until
// the next hat after it, closed, pedal or open again, and then dies away
// quickly, as the Studio's drum machine chokes it. Hits are booked a pass
// ahead, lane by lane, so the hat that closes it may be booked first.
// Run: npx vitest run src/components/Games/__tests__/grooveLabAudio.test.ts

interface FakeSource {
  note?: number;
  started: number | null;
  stoppedAt: number | null;
  start(when: number): void;
  stop(when?: number): void;
  connect(): void;
  disconnect(): void;
  onended: (() => void) | null;
  buffer: unknown;
}

const h = vi.hoisted(() => ({
  now: 0,
  sources: [] as unknown[],
  /** When each fade to silence begins. */
  fades: [] as number[],
}));

vi.mock('@/audio/AudioEngine', () => {
  const gainNode = () => ({
    gain: {
      value: 1,
      cancelScheduledValues() {},
      setValueAtTime() {},
      setTargetAtTime(_value: number, at: number) {
        h.fades.push(at);
      },
    },
    connect() {},
    disconnect() {},
  });
  const context = {
    get currentTime() {
      return h.now;
    },
    createGain: gainNode,
    createBufferSource: () => {
      const source: FakeSource = {
        started: null,
        stoppedAt: null,
        buffer: null,
        onended: null,
        connect() {},
        disconnect() {},
        start(when: number) {
          source.started = when;
        },
        stop(when = 0) {
          // As a browser does: a source can't be stopped before it starts.
          if (source.started === null) throw new Error('InvalidStateError');
          source.stoppedAt = when;
        },
      };
      h.sources.push(source);
      return source;
    },
  };
  return {
    audioEngine: {
      context,
      channel: () => gainNode(),
      resume() {},
      samples: { load: async () => ({ duration: 2 }) },
      metronome: { preload: async () => {}, setVolume() {} },
    },
  };
});

const CLOSED = 42;
const PEDAL = 44;
const OPEN = 46;
const RIDE = 51;

let audio: GrooveLabAudio;
/** Plays `note` at `when` and returns its source. */
const hit = (note: number, when: number) => {
  audio.play('natural', note, 100, when);
  return h.sources.at(-1) as FakeSource;
};
/** When an open hat's source stops: shortly after the hat that closed it. */
const closedAt = (source: FakeSource) =>
  source.stoppedAt === null ? null : Math.round(source.stoppedAt * 100) / 100;

beforeEach(async () => {
  h.now = 0;
  h.sources = [];
  h.fades = [];
  audio = new GrooveLabAudio();
  await audio.load('natural', [CLOSED, PEDAL, OPEN, RIDE]);
});

describe('an open hi-hat', () => {
  it('closes at the next closed hat, dying away from it', () => {
    const open = hit(OPEN, 1);
    hit(CLOSED, 1.5);
    expect(open.started).toBe(1);
    // It fades from 1.5 and stops just after.
    expect(h.fades).toEqual([1.5]);
    expect(closedAt(open)).toBe(1.56);
  });

  it('closes at a hat booked before it, as a lane booked first', () => {
    hit(CLOSED, 1.5);
    const open = hit(OPEN, 1);
    expect(closedAt(open)).toBe(1.56);
  });

  it('closes at the next pass’s first hat', () => {
    const open = hit(OPEN, 1.75);
    hit(CLOSED, 2);
    expect(closedAt(open)).toBe(2.06);
  });

  it('closes at a pedal hat, or another open hat, whichever comes first', () => {
    const first = hit(OPEN, 1);
    hit(PEDAL, 2);
    const second = hit(OPEN, 1.5);
    expect(closedAt(first)).toBe(1.56);
    expect(closedAt(second)).toBe(2.06);
  });

  it('rings on past a ride, a hat with it, or a hat before it', () => {
    hit(CLOSED, 0.5);
    const open = hit(OPEN, 1);
    hit(CLOSED, 1);
    hit(RIDE, 1.25);
    expect(open.stoppedAt).toBeNull();
  });

  it('closes on a pad played live, now', () => {
    const open = hit(OPEN, 0);
    h.now = 0.4;
    hit(CLOSED, 0);
    expect(closedAt(open)).toBe(0.46);
  });

  it('isn’t closed by a hat a stop took back', () => {
    h.now = 0.5;
    hit(CLOSED, 2);
    audio.cancelScheduled();
    const open = hit(OPEN, 1);
    expect(open.stoppedAt).toBeNull();
  });
});
