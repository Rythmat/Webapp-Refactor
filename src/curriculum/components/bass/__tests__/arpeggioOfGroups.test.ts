import { describe, expect, it } from 'vitest';
import { getBassCenter } from '@/curriculum/data/bass';
import { arpeggioOfGroups } from '../BassLessonVisuals';

const groupsOf = (positions: { string: 1 | 2 | 3 | 4; fret: number }[]) =>
  positions.map((position) => ({ notes: [{ position }] }));

describe('which arpeggio a bass note belongs to', () => {
  const c = getBassCenter('C');
  const [cMaj, , , fMaj] = c.triads;

  it('follows the chords in order, and round again for a repeat', () => {
    // C: A3 D5, F: A8 D10, then the map's second pass.
    const groups = groupsOf([
      { string: 3, fret: 3 },
      { string: 2, fret: 5 },
      { string: 3, fret: 8 },
      { string: 2, fret: 10 },
      { string: 3, fret: 3 },
      { string: 2, fret: 5 },
    ]);
    expect(arpeggioOfGroups(groups, [cMaj, fMaj])).toEqual([0, 0, 1, 1, 0, 0]);
  });

  it('keeps one arpeggio for a single-chord step', () => {
    expect(
      arpeggioOfGroups(groupsOf([{ string: 3, fret: 3 }]), [cMaj]),
    ).toEqual([0]);
  });
});
