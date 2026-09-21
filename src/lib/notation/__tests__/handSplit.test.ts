import { describe, expect, it } from 'vitest';
import { isHandSplit, resolveStaves } from '../handSplit';

const rh = (midi: number) => ({ midi, hand: 'rh' as const });
const lh = (midi: number) => ({ midi, hand: 'lh' as const });
// A note that could name its hand but doesn't.
const untagged = (midi: number): { midi: number; hand?: 'lh' | 'rh' } => ({
  midi,
});

describe('isHandSplit', () => {
  it('sees a part whose notes name their hand', () => {
    // Pop B2.1: LH bass under RH chords.
    expect(isHandSplit([lh(46), rh(70), rh(74)])).toBe(true);
  });

  it('counts a part tagged for one hand only', () => {
    // Still an authored hand assignment, so still a two-hand layout.
    expect(isHandSplit([rh(70), rh(74)])).toBe(true);
  });

  it('is false for untagged notes', () => {
    expect(isHandSplit([untagged(60), untagged(64)])).toBe(false);
    expect(isHandSplit([])).toBe(false);
  });
});

describe('resolveStaves', () => {
  it('forces a grand staff on a hand-split part', () => {
    // THE RULE: the roll is split, so the staff is too — the caller's clef
    // preference does not get to collapse it onto one stave.
    expect(resolveStaves([lh(46), rh(70)], 'treble')).toBe('grand');
    expect(resolveStaves([lh(46), rh(70)], 'bass')).toBe('grand');
  });

  it('honours the preferred clef for a single-hand part', () => {
    // Either clef is a legitimate reading of a one-hand chord voicing.
    expect(resolveStaves([untagged(60), untagged(64)], 'treble')).toBe(
      'treble',
    );
    expect(resolveStaves([untagged(48), untagged(52)], 'bass')).toBe('bass');
  });

  it('passes through an explicit grand staff', () => {
    expect(resolveStaves([untagged(60)], 'grand')).toBe('grand');
  });

  it('leaves the choice open when nothing was asked for', () => {
    expect(resolveStaves([untagged(60)])).toBeUndefined();
    // …unless the notes themselves settle it.
    expect(resolveStaves([rh(60)])).toBe('grand');
  });
});
