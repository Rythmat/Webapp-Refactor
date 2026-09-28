import { describe, expect, it } from 'vitest';
import type { InstrumentConfig } from '../../../types/activity.v2';
import {
  applyRegisterRules,
  bassOctaveShift,
  chordCeilingShift,
  chordOctaveShift,
  classifyNote,
  handCrossingShift,
  type RegisterContext,
} from '../registerRules';

const lhBassRhChords: InstrumentConfig = {
  instrument: 'piano',
  hand_config: 'lh_bass_rh_chords',
  lh_role: 'bass',
  rh_role: 'chords',
  style_ref: 'l3a',
};

const midis = (notes: readonly { midi: number }[]) => notes.map((n) => n.midi);

describe('chordOctaveShift', () => {
  it('leaves a chord whose lowest note is exactly C5 alone', () => {
    // The rule is "above C5", so C5 itself is in range.
    expect(chordOctaveShift([72, 76, 79])).toBe(0);
  });

  it('shifts a chord whose lowest note is above C5 down an octave', () => {
    expect(chordOctaveShift([74, 79, 82])).toBe(-12);
  });

  it('repeats the shift until the chord is in range', () => {
    // Lowest note D6 — one octave down is still above C5.
    expect(chordOctaveShift([86, 91, 94])).toBe(-24);
  });

  it('ignores notes above C5 as long as the lowest note is in range', () => {
    expect(chordOctaveShift([70, 86, 94])).toBe(0);
  });

  it('returns no shift for an empty set', () => {
    expect(chordOctaveShift([])).toBe(0);
  });
});

describe('bassOctaveShift', () => {
  it('leaves a bass line whose highest note is exactly C4 alone', () => {
    expect(bassOctaveShift([48, 55, 60])).toBe(0);
  });

  it('shifts a bass line whose highest note is above C4 down an octave', () => {
    expect(bassOctaveShift([58, 62])).toBe(-12);
  });

  it('shifts a single bass note above C4', () => {
    expect(bassOctaveShift([67])).toBe(-12);
  });

  it('repeats the shift until the line is in range', () => {
    expect(bassOctaveShift([79])).toBe(-24);
  });
});

describe('classifyNote', () => {
  it('reads roles from instrument_config when a step declares one', () => {
    const ctx: RegisterContext = {
      section: 'B',
      instrument_config: lhBassRhChords,
    };
    expect(classifyNote({ midi: 58, hand: 'lh' }, ctx)).toBe('bass');
    expect(classifyNote({ midi: 74, hand: 'rh' }, ctx)).toBe('chord');
  });

  it('treats a melody hand as ungoverned even in a performance step', () => {
    const ctx: RegisterContext = {
      section: 'D',
      instrument_config: { ...lhBassRhChords, rh_role: 'melody' },
    };
    expect(classifyNote({ midi: 88, hand: 'rh' }, ctx)).toBe('other');
  });

  it('falls back to the section for untagged notes', () => {
    expect(classifyNote({ midi: 46 }, { section: 'C' })).toBe('bass');
    expect(classifyNote({ midi: 74 }, { section: 'B' })).toBe('chord');
    expect(classifyNote({ midi: 74 }, { section: 'D' })).toBe('chord');
    expect(classifyNote({ midi: 88 }, { section: 'A' })).toBe('other');
  });
});

describe('applyRegisterRules', () => {
  it('moves an arpeggio as one unit rather than only its high notes', () => {
    // Pop L3 B1.2 — Ebmaj7 arpeggiated, lowest note Eb5.
    const notes = [75, 79, 82, 86].map((midi, i) => ({
      midi,
      onset: i * 480,
      duration: 460,
    }));
    const out = applyRegisterRules(notes, { section: 'B' });
    expect(midis(out)).toEqual([63, 67, 70, 74]);
  });

  it('keeps a progression intact when only some of its chords sit high', () => {
    // Lowest chord is in range and nothing reaches past C6, so nothing moves
    // and the voice leading survives.
    const notes = [
      { midi: 70, onset: 0, duration: 1900 },
      { midi: 74, onset: 0, duration: 1900 },
      { midi: 79, onset: 1920, duration: 1900 },
      { midi: 82, onset: 1920, duration: 1900 },
    ];
    expect(applyRegisterRules(notes, { section: 'B' })).toBe(notes);
  });

  it('shifts chords and bass independently within one step', () => {
    // Pop L3 B2.3 — Gm7 in 7-3-5 over a G3 bass. Both are too high, and each
    // rule has its own threshold, so they move by their own amounts.
    const notes = [
      { midi: 67, onset: 0, duration: 1920, hand: 'lh' as const },
      { midi: 77, onset: 0, duration: 480, hand: 'rh' as const },
      { midi: 82, onset: 0, duration: 480, hand: 'rh' as const },
      { midi: 86, onset: 0, duration: 480, hand: 'rh' as const },
    ];
    const out = applyRegisterRules(notes, {
      section: 'B',
      instrument_config: lhBassRhChords,
    });
    expect(midis(out)).toEqual([55, 65, 70, 74]);
  });

  it('never touches a melody', () => {
    const notes = [82, 84, 86].map((midi, i) => ({
      midi,
      onset: i * 480,
      duration: 460,
    }));
    expect(applyRegisterRules(notes, { section: 'A' })).toBe(notes);
  });

  it('returns the same array instance when nothing moves', () => {
    const notes = [{ midi: 60, onset: 0, duration: 480 }];
    expect(applyRegisterRules(notes, { section: 'C' })).toBe(notes);
  });

  it('preserves onset, duration and hand on shifted notes', () => {
    const notes = [
      { midi: 74, onset: 960, duration: 460, hand: 'rh' as const },
    ];
    const [out] = applyRegisterRules(notes, {
      section: 'B',
      instrument_config: lhBassRhChords,
    });
    expect(out).toEqual({ midi: 62, onset: 960, duration: 460, hand: 'rh' });
  });
});

const lhChordsRhMelody: InstrumentConfig = {
  instrument: 'piano',
  hand_config: 'lh_chords_rh_melody',
  lh_role: 'chords',
  rh_role: 'melody',
  style_ref: 'l2a',
};

const ctx: RegisterContext = {
  section: 'D',
  instrument_config: lhChordsRhMelody,
};

const lh = (midis: number[], onset = 0) =>
  midis.map((midi) => ({ midi, onset, duration: 240, hand: 'lh' as const }));
const rh = (midis: number[], onset = 960) =>
  midis.map((midi, i) => ({
    midi,
    onset: onset + i * 240,
    duration: 240,
    hand: 'rh' as const,
  }));

describe('handCrossingShift', () => {
  it('drops the LH when its top note reaches the melody (funk L2 D2.1)', () => {
    // LH tops at E5, and the melody's lowest note is also E5 — touching counts.
    const notes = [
      ...lh([66, 70, 75], 0),
      ...lh([67, 71, 76], 240),
      ...rh([79, 78, 76, 78, 76]),
    ];
    expect(handCrossingShift(notes, ctx)).toBe(-12);
  });

  it('leaves the hands alone when they are already clear', () => {
    // funk L3 D2.1: LH tops at D4, melody bottoms at F4.
    const notes = [...lh([51, 55, 58, 62], 0), ...rh([67, 70, 69])];
    expect(handCrossingShift(notes, ctx)).toBe(0);
  });

  it('refuses the drop when a chord would put three notes below C3', () => {
    // [C3 E3 G3 B3] -> [C2 E2 G2 B2]: three below C3, so the step stays put.
    const notes = [...lh([48, 52, 55, 59], 0), ...rh([55, 57])];
    expect(handCrossingShift(notes, ctx)).toBe(0);
  });

  it('allows exactly two notes below C3', () => {
    // [D3 F3 C5 E5] -> [D2 F2 C4 E4]: two below C3, which is the limit.
    const notes = [...lh([50, 53, 72, 76], 0), ...rh([76])];
    expect(handCrossingShift(notes, ctx)).toBe(-12);
  });

  it('refuses at three below C3, one past the limit', () => {
    // [D3 F3 A3 E5] -> [D2 F2 A2 E4]: three below C3.
    const notes = [...lh([50, 53, 57, 76], 0), ...rh([76])];
    expect(handCrossingShift(notes, ctx)).toBe(0);
  });

  it('moves the whole part or none of it', () => {
    // One chord can drop, the next cannot — so neither does.
    const notes = [
      ...lh([67, 71, 76], 0),
      ...lh([48, 52, 55, 59], 480),
      ...rh([76]),
    ];
    expect(handCrossingShift(notes, ctx)).toBe(0);
  });

  it('only governs LH chords under an RH melody', () => {
    const bassUnderMelody: RegisterContext = {
      section: 'D',
      instrument_config: { ...lhChordsRhMelody, lh_role: 'bass' },
    };
    const notes = [...lh([67, 71, 76], 0), ...rh([76])];
    expect(handCrossingShift(notes, bassUnderMelody)).toBe(0);

    const twoHandChords: RegisterContext = {
      section: 'D',
      instrument_config: { ...lhChordsRhMelody, rh_role: 'chords' },
    };
    expect(handCrossingShift(notes, twoHandChords)).toBe(0);
  });

  it('drops one octave only, even if the hands still overlap', () => {
    // [C5 E5 G5] over a C4 melody: one drop lands on [C4 E4 G4], which still
    // reaches the melody. It stays there rather than being pushed lower.
    const notes = [...lh([72, 76, 79], 0), ...rh([60])];
    expect(handCrossingShift(notes, ctx)).toBe(-12);
    const dropped = applyRegisterRules(notes, ctx).filter(
      (n) => n.hand === 'lh',
    );
    expect(dropped.map((n) => n.midi)).toEqual([60, 64, 67]);
  });

  it('composes with the chord register rule — each applies once', () => {
    // [C6 E6 G6] is above C5, so the register rule drops it to [C5 E5 G5];
    // that still crosses the C4 melody, so the crossing rule drops it again.
    // Two different rules, one octave each — not the crossing rule repeating.
    const notes = [...lh([84, 88, 91], 0), ...rh([72])];
    const out = applyRegisterRules(notes, ctx).filter((n) => n.hand === 'lh');
    expect(out.map((n) => n.midi)).toEqual([60, 64, 67]);
  });
});

describe('applyRegisterRules with crossed hands', () => {
  it('moves only the LH chords, leaving the melody where it was', () => {
    const notes = [...lh([67, 71, 76], 0), ...rh([79, 76])];
    const out = applyRegisterRules(notes, ctx);
    expect(out.filter((n) => n.hand === 'lh').map((n) => n.midi)).toEqual([
      55, 59, 64,
    ]);
    expect(out.filter((n) => n.hand === 'rh').map((n) => n.midi)).toEqual([
      79, 76,
    ]);
  });
});

describe('chordCeilingShift', () => {
  it('leaves a chord whose highest note is exactly C6 alone', () => {
    // The rule is "above C6", so C6 itself is in range.
    expect(chordCeilingShift([72, 76, 79, 84])).toBe(0);
  });

  it('shifts a chord reaching above C6 down an octave', () => {
    expect(chordCeilingShift([75, 79, 82, 86])).toBe(-12);
  });

  it('repeats the shift until the chord is in range', () => {
    expect(chordCeilingShift([96, 100])).toBe(-24);
  });

  it('ignores how low the chord starts', () => {
    // Rule 1 has nothing to say about this chord; rule 2 does.
    expect(chordCeilingShift([60, 88])).toBe(-12);
  });

  it('returns no shift for an empty set', () => {
    expect(chordCeilingShift([])).toBe(0);
  });
});

describe('a chord too high at the top rather than the bottom', () => {
  /**
   * Pop L3 D1.1 as authored: LH root bass under RH voicings of
   * Bb–Ebmaj7–Gm7–F7. The first chord bottoms out on Bb4, inside rule 1's
   * limit, which let the whole figure through an octave high — the bug this
   * rule exists to catch. The step climbs to F6.
   */
  const popL3D11 = [
    ...[46].map((midi) => ({ midi, onset: 0, hand: 'lh' as const })),
    ...[70, 74, 77].map((midi) => ({ midi, onset: 0, hand: 'rh' as const })),
    ...[51].map((midi) => ({ midi, onset: 1920, hand: 'lh' as const })),
    ...[75, 79, 82, 86].map((midi) => ({
      midi,
      onset: 1920,
      hand: 'rh' as const,
    })),
    ...[55].map((midi) => ({ midi, onset: 3840, hand: 'lh' as const })),
    ...[79, 82, 86, 89].map((midi) => ({
      midi,
      onset: 3840,
      hand: 'rh' as const,
    })),
    ...[53].map((midi) => ({ midi, onset: 5760, hand: 'lh' as const })),
    ...[77, 81, 84, 87].map((midi) => ({
      midi,
      onset: 5760,
      hand: 'rh' as const,
    })),
  ];

  const played = (notes: readonly { midi: number; hand?: string }[]) => ({
    rh: notes.filter((n) => n.hand === 'rh').map((n) => n.midi),
    lh: notes.filter((n) => n.hand === 'lh').map((n) => n.midi),
  });

  it('drops the whole chord part an octave, bass untouched', () => {
    const out = played(
      applyRegisterRules(popL3D11, {
        section: 'D',
        instrument_config: lhBassRhChords,
      }),
    );
    expect(out.rh).toEqual([
      58, 62, 65, 63, 67, 70, 74, 67, 70, 74, 77, 65, 69, 72, 75,
    ]);
    // The bass was already in range and has no business following the chords.
    expect(out.lh).toEqual([46, 51, 55, 53]);
  });

  it('leaves the voicings and the voice leading as they were written', () => {
    const out = applyRegisterRules(popL3D11, {
      section: 'D',
      instrument_config: lhBassRhChords,
    });
    // Every chord moved by the same octave: the shapes are intact, and no
    // octave break opened up in the middle of the progression.
    for (const [i, note] of out.entries()) {
      const shift = note.midi - popL3D11[i].midi;
      expect(shift).toBe(note.hand === 'rh' ? -12 : 0);
    }
  });

  it('lands the chords above the bass, where they were written', () => {
    const out = played(
      applyRegisterRules(popL3D11, {
        section: 'D',
        instrument_config: lhBassRhChords,
      }),
    );
    expect(Math.min(...out.rh)).toBeGreaterThan(Math.max(...out.lh));
  });
});

describe('two hands comping, one of them too high', () => {
  const twoHandChords: InstrumentConfig = {
    instrument: 'piano',
    hand_config: 'two_hand_comping',
    lh_role: 'chords',
    rh_role: 'chords',
    style_ref: 'l3a',
  };

  const step = (lhMidis: number[], rhMidis: number[]) => [
    ...lhMidis.map((midi) => ({ midi, onset: 0, hand: 'lh' as const })),
    ...rhMidis.map((midi) => ({ midi, onset: 0, hand: 'rh' as const })),
  ];

  it('drops only the hand that reaches too high', () => {
    // The jazz case: LH holding the middle, RH up past C6. The LH is where the
    // texture sits and must not follow the RH down.
    const out = applyRegisterRules(step([55, 59, 62], [81, 86, 89]), {
      section: 'D',
      instrument_config: twoHandChords,
    });
    expect(midis(out)).toEqual([55, 59, 62, 69, 74, 77]);
  });

  it('refuses a drop that would cross under the other hand', () => {
    // Dropping the RH would put it at 67–73, below the LH's top at 74. The
    // step stays as authored rather than turning inside out.
    const notes = step([67, 70, 74], [79, 83, 85]);
    expect(
      applyRegisterRules(notes, {
        section: 'D',
        instrument_config: twoHandChords,
      }),
    ).toBe(notes);
  });

  it('still moves both hands together when rule 1 catches the figure', () => {
    // Nothing is above C6 here; the whole comp is simply too high, and rule 1
    // moves it as one unit, hands and all.
    const out = applyRegisterRules(step([74, 77], [79, 83]), {
      section: 'D',
      instrument_config: twoHandChords,
    });
    expect(midis(out)).toEqual([62, 65, 67, 71]);
  });
});

describe('the ceiling and the melody', () => {
  it('never lifts or drops a melody, however high it sits', () => {
    const notes = [88, 91, 93].map((midi, i) => ({
      midi,
      onset: i * 480,
      hand: 'rh' as const,
    }));
    const ctx: RegisterContext = {
      section: 'A',
      instrument_config: {
        instrument: 'piano',
        hand_config: 'lh_bass_rh_melody',
        lh_role: 'bass',
        rh_role: 'melody',
        style_ref: 'l3a',
      },
    };
    expect(applyRegisterRules(notes, ctx)).toBe(notes);
  });
});
