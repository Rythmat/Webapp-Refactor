import { describe, expect, it } from 'vitest';
import { hipHopL3 } from '@/curriculum/data/activityFlows/hipHop_v2';
import { colorForKeyMode } from '@/lib/modeColorShift';
import { scaleColorMode, stepMode } from '../flowKey';

describe('stepMode', () => {
  it('reads a step in another scale of its level’s key from the scale it names', () => {
    // Hip Hop L3 is in E Phrygian; its Dorian and harmonic minor steps name theirs.
    expect(stepMode(hipHopL3, {})).toBe('phrygian');
    expect(stepMode(hipHopL3, { scaleId: 'dorian' })).toBe('dorian');
    expect(stepMode(hipHopL3, { scaleId: 'harmonic_minor' })).toBe('aeolian');
  });

  it('reads a step in a key of its own from the key, when it names no scale', () => {
    expect(stepMode(hipHopL3, { key: 'G major' })).toBe('ionian');
    expect(stepMode(hipHopL3, { key: 'G major', scaleId: 'mixolydian' })).toBe(
      'mixolydian',
    );
  });
});

describe('scaleColorMode', () => {
  it('colors E Phrygian, E Dorian and E harmonic minor three ways', () => {
    const colors = ['phrygian', 'dorian', 'harmonic_minor'].map((id) =>
      colorForKeyMode(
        'E',
        scaleColorMode(id) as Parameters<typeof colorForKeyMode>[1],
      ),
    );
    expect(new Set(colors).size).toBe(3);
    // The harmonic minor in its own family's color, not E Aeolian's.
    expect(colors[2]).toBe(colorForKeyMode('E', 'harmonicMinor' as never));
    expect(colors[2]).not.toBe(colorForKeyMode('E', 'aeolian'));
  });

  it('colors a pentatonic or blues scale as the mode it borrows', () => {
    expect(scaleColorMode('minor_pentatonic')).toBe('dorian');
    expect(scaleColorMode('minor_blues')).toBe('dorian');
    expect(scaleColorMode('major_pentatonic')).toBe('ionian');
  });
});
