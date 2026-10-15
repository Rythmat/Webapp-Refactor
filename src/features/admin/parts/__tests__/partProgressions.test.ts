import { describe, expect, it } from 'vitest';
import { blankPart } from '@/curriculum/engine/parts/part';
import { partProgressions } from '../partProgressions';

/** A chord part is found under the progressions its chords loop. */

const part = (
  id: string,
  instrument: 'piano' | 'bass',
  chords: string[],
  key: { tonic: number; mode: string },
) => ({ ...blankPart(id, id, instrument), key, chordSymbols: chords });

describe('the progressions a chord part plays', () => {
  const library = [
    { id: 1, chords: ['1 minor', '5 major'] },
    // C minor's Cm–G is E♭ major's 6–3: read from the relative major.
    { id: 2, chords: ['6 minor', '3 major'] },
    { id: 3, chords: ['1 major', '4 major'] },
  ];

  it('reads a part’s loop in its own key, and from its parent major', () => {
    const found = partProgressions(
      [
        part('two-chord-jam', 'piano', ['Cm', 'G', 'Cm', 'G'], {
          tonic: 0,
          mode: 'aeolian',
        }),
      ],
      library,
    );
    expect(
      (found.get('two-chord-jam') ?? []).map((m) => [
        m.progressionId,
        Boolean(m.relative),
      ]),
    ).toEqual([
      [1, false],
      [2, true],
    ]);
  });

  it('leaves out bass parts, which name no progression', () => {
    const found = partProgressions(
      [part('trap-bass', 'bass', ['C', 'F'], { tonic: 0, mode: 'ionian' })],
      library,
    );
    expect(found.size).toBe(0);
  });
});
