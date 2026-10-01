import { describe, it, expect } from 'vitest';
import { funkL1, funkL2 } from '@/curriculum/data/activityFlows/funk_v2';
import { popL1, popL3 } from '@/curriculum/data/activityFlows/pop_v2';
import {
  chordTones,
  rootPositionVoicing,
  spellVoicing,
  stylisticVoicings,
} from '../chordVoicings';
import { buildGenrePracticeTrack } from '../genre/buildGenrePracticeTrack';

const labels = (root: number, pcs: number[]) => {
  const tones = chordTones(pcs);
  return rootPositionVoicing(root, pcs).map(
    (midi) => tones.get((((midi - root) % 12) + 12) % 12)?.label,
  );
};

describe('rootPositionVoicing', () => {
  it('stacks a ninth 1-3-5-7-9, never 1-9-3-5-7', () => {
    // Am9 as chordSymbolTones gives it: sorted by semitone, 9 folded under the 3rd.
    expect(labels(57, [0, 2, 3, 7, 10])).toEqual(['1', '♭3', '5', '♭7', '9']);
    expect(rootPositionVoicing(57, [0, 2, 3, 7, 10])).toEqual([
      57, 60, 64, 67, 71,
    ]);
  });

  it('stacks a thirteenth with every tone above the last', () => {
    const notes = rootPositionVoicing(50, [0, 2, 4, 7, 9, 10]);
    expect(labels(50, [0, 2, 4, 7, 9, 10])).toEqual([
      '1',
      '3',
      '5',
      '♭7',
      '9',
      '13',
    ]);
    for (let i = 1; i < notes.length; i++)
      expect(notes[i]).toBeGreaterThan(notes[i - 1]);
  });

  it('names sus, add, sixth and dim7 tones by what they are', () => {
    expect(labels(55, [0, 5, 7])).toEqual(['1', '4', '5']);
    expect(labels(55, [0, 2, 7])).toEqual(['1', '2', '5']);
    expect(labels(58, [0, 2, 4, 7])).toEqual(['1', '3', '5', '9']);
    expect(labels(63, [0, 3, 7, 9])).toEqual(['1', '♭3', '5', '6']);
    expect(labels(54, [0, 3, 6, 9])).toEqual(['1', '♭3', '♭5', '𝄫7']);
  });

  it('sits between C3 and C5, as high as the chord fits', () => {
    for (let pc = 0; pc < 12; pc++) {
      for (const pcs of [
        [0, 4, 7],
        [0, 3, 7, 10],
        [0, 2, 3, 7, 10],
      ]) {
        const notes = rootPositionVoicing(60 + pc, pcs);
        const outside = notes.filter((n) => n < 48 || n > 72);
        // Only a ninth on B can't fit; it pokes one note over.
        expect(outside.length).toBeLessThanOrEqual(1);
        if (outside.length === 0)
          expect(notes[notes.length - 1] + 12).toBeGreaterThan(72);
      }
    }
  });

  it('puts a chord too tall to fit where the fewest notes fall outside', () => {
    // B9: B3 up to C♯5 (one over) beats B2 up to C♯4 (one under) on the tie.
    expect(rootPositionVoicing(59, [0, 2, 4, 7, 10])[0]).toBe(59);
    // B13 from B3 would put three notes over C5; from B2 only B2 is out.
    expect(rootPositionVoicing(59, [0, 2, 4, 7, 9, 10])).toEqual([
      47, 51, 54, 57, 61, 68,
    ]);
  });
});

describe('stylisticVoicings', () => {
  it('takes each chord from the fullest moment of its first bar', () => {
    const notes = [
      { midi: 45, onset: 0, duration: 1900 }, // LH root, held
      { midi: 60, onset: 480, duration: 400 },
      { midi: 64, onset: 480, duration: 400 },
      { midi: 62, onset: 1920, duration: 400 },
      { midi: 65, onset: 1920, duration: 400 },
    ];
    expect(
      stylisticVoicings(
        ['Am', 'Dm', 'Em'],
        [{ notes, chordSymbols: ['Am', 'Dm'] }],
      ),
    ).toEqual([[45, 60, 64], [62, 65], null]);
  });

  it('skips a last-bar landing on notes that aren’t that bar’s chord', () => {
    const notes = [
      { midi: 50, onset: 0, duration: 120 },
      { midi: 53, onset: 0, duration: 120 },
      { midi: 60, onset: 0, duration: 120 },
      { midi: 50, onset: 1920, duration: 120 },
      { midi: 53, onset: 1920, duration: 120 },
      { midi: 60, onset: 1920, duration: 120 }, // D-F-C: Dm7, not G7
    ];
    expect(
      stylisticVoicings(
        ['Dm7', 'G7'],
        [{ notes, chordSymbols: ['Dm7', 'G7'] }],
      ),
    ).toEqual([[50, 53, 60], null]);
  });

  it('prefers the final activity and fills gaps from earlier ones', () => {
    const final = {
      notes: [
        { midi: 60, onset: 0, duration: 100 },
        { midi: 64, onset: 0, duration: 100 },
      ],
      chordSymbols: ['C'],
    };
    const earlier = {
      notes: [
        { midi: 48, onset: 0, duration: 100 },
        { midi: 52, onset: 0, duration: 100 },
        { midi: 53, onset: 1920, duration: 100 },
        { midi: 57, onset: 1920, duration: 100 },
      ],
      chordSymbols: ['C', 'F'],
    };
    expect(stylisticVoicings(['C', 'F'], [final, earlier])).toEqual([
      [60, 64],
      [53, 57],
    ]);
  });
});

describe('Chords Practice Tracks carry the lesson’s voicings', () => {
  const sets = (track: ReturnType<typeof buildGenrePracticeTrack>) =>
    Object.fromEntries(
      (track?.voicingSets ?? []).map((set) => [set.id, set.voicings]),
    );

  it('Funk L2: 3-7-9 and 7-3-13 shells, from its last activity', () => {
    const track = buildGenrePracticeTrack(funkL2, 'B')!;
    expect(track.chordCycle).toEqual(['Am9', 'D13', 'Am9', 'E7#5']);
    expect(track.voicingSets?.map((set) => set.label)).toEqual([
      'Stylistic Voicings',
    ]);
    expect(sets(track).stylistic).toEqual([
      [60, 67, 71], // C G B
      [60, 66, 71], // C F♯ B
      [60, 67, 71],
      [62, 68, 72], // D G♯ C
    ]);
  });

  it('Pop L3: the left-hand root comes with the right-hand chord', () => {
    const track = buildGenrePracticeTrack(popL3, 'B')!;
    expect(sets(track).stylistic?.[0]).toEqual([46, 58, 62, 65]); // B♭2 | B♭3 D4 F4
  });

  it('Pop L1: Power Chords and Triads, opening on Triads', () => {
    const track = buildGenrePracticeTrack(popL1, 'B')!;
    expect(track.chordCycle).toEqual(['C', 'G', 'Am', 'F']);
    expect(track.voicingSets?.map((set) => set.label)).toEqual([
      'Power Chords',
      'Triads',
    ]);
    expect(track.defaultVoicing).toBe('triads');
    expect(sets(track).power?.[1]).toEqual([43, 60, 67]); // G2 | C4 G4
    expect(sets(track).triads).toEqual([
      [60, 64, 67], // C E G
      [67, 71, 74], // G B D
      [69, 72, 76], // A C E
      [65, 69, 72], // F A C
    ]);
  });

  it('Performance: only the chord hand, whichever hand that is', () => {
    // Funk L1 D2.3: LH Dm7 shell D3-F3-C4 under a RH blues melody.
    const funk = buildGenrePracticeTrack(funkL1, 'D')!;
    expect(funk.voicingSets?.[0].voicings[0]).toEqual([50, 53, 60]);
    // Its landing back on Dm7 is not a G7 voicing.
    expect(funk.voicingSets?.[0].voicings[1]).not.toEqual([50, 53, 60]);
    // Pop L3 D1.6: LH bass D3 under a RH B♭-D-F — the chord is the RH alone,
    // an octave down from where it's written because the register rules
    // drop a RH reaching E♭6, as the lesson itself plays it.
    const pop = buildGenrePracticeTrack(popL3, 'D')!;
    expect(pop.chordCycle[0]).toBe('Bb/D');
    expect(pop.voicingSets?.[0].voicings[0]).toEqual([58, 62, 65]);
  });

  it('Melody and Bass tracks carry none', () => {
    for (const section of ['A', 'C'] as const)
      expect(buildGenrePracticeTrack(funkL2, section)?.voicingSets).toBeNull();
  });
});

describe('bassFloor', () => {
  it('is where the student’s own bass writing starts', () => {
    expect(buildGenrePracticeTrack(funkL2, 'C')?.bassFloor).toBe(31); // G1
    expect(buildGenrePracticeTrack(popL3, 'D')?.bassFloor).toBe(46); // LH B♭2
  });

  it('is null where the student plays no bass', () => {
    expect(buildGenrePracticeTrack(funkL1, 'D')?.bassFloor).toBeNull(); // LH chords
    expect(buildGenrePracticeTrack(funkL2, 'B')?.bassFloor).toBeNull();
  });
});

describe('spellVoicing', () => {
  it('spells from the chord root, not the key', () => {
    // E7♯5's 7-3-♯5 shell: G♯, never A♭ — and the ♯5 is named C, not B♯.
    expect(
      spellVoicing('E7♯5', 'E', 64, [64, 68, 72, 74], [62, 68, 72]),
    ).toEqual(['D', 'G♯', 'C']);
    // D7 in B♭: F♯, never G♭.
    expect(
      spellVoicing('D7', 'D', 62, [62, 66, 69, 72], [62, 66, 69, 72]),
    ).toEqual(['D', 'F♯', 'A', 'C']);
  });
});
