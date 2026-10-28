import { describe, expect, it } from 'vitest';
import { midiToHz } from '@/lib/guitar/harmonics';
import {
  checkReducer,
  classify,
  initialCheck,
  type CheckEvent,
  type CheckState,
} from '../harmonicCheck';

const A2 = 45;

/** Hold a pitch for `ms` (readings every 40 ms), then fall silent. */
function hold(state: CheckState, hz: number, ms = 400, from = 0): CheckState {
  let s = state;
  for (let t = from; t <= from + ms; t += 40) {
    s = checkReducer(s, { type: 'reading', hz, t });
  }
  return checkReducer(s, { type: 'silence' });
}

const run = (state: CheckState, ...events: CheckEvent[]) =>
  events.reduce(checkReducer, state);

describe('harmonicCheck', () => {
  it('tunes to the open string as measured, then asks for the 12th fret', () => {
    // A guitar 20 cents flat.
    const f0 = midiToHz(A2) * 2 ** (-20 / 1200);
    const s = hold(initialCheck(A2), f0);
    expect(s.phase).toBe('play');
    expect(s.f0).toBeCloseTo(f0, 6);
    expect(s.feedback).toEqual({
      kind: 'tuned',
      cents: expect.closeTo(-20, 3),
    });
    // Its harmonics are then judged against that f0, not standard.
    const after = hold(s, f0 * 2);
    expect(after.passed).toEqual([2]);
    expect(after.feedback).toEqual({ kind: 'match', partial: 2 });
  });

  it('says when the string is out of tune, and lets tuning be skipped', () => {
    const sharp = hold(initialCheck(A2), midiToHz(A2) * 2 ** (80 / 1200));
    expect(sharp.phase).toBe('tune');
    expect(sharp.feedback?.kind).toBe('outOfTune');
    expect(run(sharp, { type: 'skipTuning' }).phase).toBe('play');
  });

  it('needs the pitch held for 300 ms', () => {
    const s = run(initialCheck(A2), { type: 'skipTuning' });
    const brief = run(
      s,
      { type: 'reading', hz: 220, t: 0 },
      { type: 'reading', hz: 220, t: 200 },
      { type: 'silence' },
    );
    expect(brief.passed).toEqual([]);
    const held = run(
      s,
      { type: 'reading', hz: 220, t: 0 },
      { type: 'reading', hz: 220, t: 320 },
    );
    expect(held.passed).toEqual([2]);
  });

  it('accepts within 25 cents of the true harmonic', () => {
    const s = run(initialCheck(A2), { type: 'skipTuning' }, { type: 'skip' });
    // Partial 3 of A: 330 Hz (E4 + 2 cents).
    expect(classify(s, 330 * 2 ** (20 / 1200))).toBe('match');
    expect(classify(s, 330 * 2 ** (30 / 1200))).toBeNull();
  });

  it('tells a pressed note from the harmonic at the 7th fret', () => {
    const s = run(initialCheck(A2), { type: 'skipTuning' }, { type: 'skip' });
    const pressed7 = midiToHz(A2 + 7);
    expect(classify(s, pressed7)).toBe('pressed:7');
    const after = hold(s, pressed7);
    expect(after.feedback).toEqual({ kind: 'pressed', partial: 3, fret: 7 });
    expect(after.passed).toEqual([]);
  });

  it('names another partial, and the open string', () => {
    const s = run(initialCheck(A2), { type: 'skipTuning' }, { type: 'skip' });
    expect(hold(s, 440).feedback).toEqual({
      kind: 'otherPartial',
      partial: 3,
      heard: 4,
    });
    expect(hold(s, 110).feedback).toEqual({ kind: 'open', partial: 3 });
  });

  it('waits for silence after a verdict', () => {
    const s = run(initialCheck(A2), { type: 'skipTuning' });
    const passed = run(
      s,
      { type: 'reading', hz: 220, t: 0 },
      { type: 'reading', hz: 220, t: 320 },
    );
    expect(passed.passed).toEqual([2]);
    // Still ringing: no "that's partial 2" against the next target.
    const ringing = run(
      passed,
      { type: 'reading', hz: 220, t: 400 },
      { type: 'reading', hz: 220, t: 800 },
    );
    expect(ringing.feedback).toEqual({ kind: 'match', partial: 2 });
  });

  it('finishes after the five targets', () => {
    let s = run(initialCheck(A2), { type: 'skipTuning' });
    for (const n of [2, 3, 4, 5, 6]) s = hold(s, 110 * n);
    expect(s.phase).toBe('done');
    expect(s.passed).toEqual([2, 3, 4, 5, 6]);
  });
});
