/**
 * The chord ruler's names never overlap: zoomed far out they go, and above
 * that a name shows only where it fits its own chord.
 */
import { describe, expect, it } from 'vitest';
import {
  CHORD_LABEL_INSET_PX,
  chordLabelFits,
  chordLabelsShown,
  chordRulerLabel,
} from '../chordLabels';

describe('the chord ruler’s names', () => {
  it('show at 100% and at a fitted song, and go once zoomed far out', () => {
    expect(chordLabelsShown(1)).toBe(true);
    expect(chordLabelsShown(0.62)).toBe(true);
    // 12 px a beat is the last zoom with names.
    expect(chordLabelsShown(0.3)).toBe(true);
    expect(chordLabelsShown(0.29)).toBe(false);
    expect(chordLabelsShown(0.1)).toBe(false);
  });

  it('show a name only where it fits its chord, with room either side', () => {
    expect(chordLabelFits(40, 40 + 2 * CHORD_LABEL_INSET_PX)).toBe(true);
    expect(chordLabelFits(40, 40 + 2 * CHORD_LABEL_INSET_PX - 1)).toBe(false);
    expect(chordLabelFits(40, 20)).toBe(false);
  });
});

describe('“Chords read as”', () => {
  const region = { name: '2 min7', noteName: 'D min7' };

  it('Numbers shows the degree, Names the note name', () => {
    // chordRulerShowNotes: off is Numbers, on is Names (both menus).
    expect(chordRulerLabel(region, false)).toBe('2 min7');
    expect(chordRulerLabel(region, true)).toBe('D min7');
  });
});
