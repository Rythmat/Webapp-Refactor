import { describe, expect, it } from 'vitest';
import { buildScore, inferKeyFifths, keyFifthsForTonic } from '..';
import type { NotationNoteInput, NotationScore, StaffId } from '../types';

const Q = 480;
let nextId = 0;
const n = (
  name: string,
  midi: number,
  startTick: number,
  durationTicks: number,
  extra: Partial<NotationNoteInput> = {},
): NotationNoteInput => ({
  id: `n${nextId++}`,
  name,
  midi,
  startTick,
  durationTicks,
  ...extra,
});

/** "q:C4 8:D4~ 8r h.:F#4(#)" for one staff voice, bar by bar ("|"). */
function show(score: NotationScore, staff: StaffId = 'treble', voice = 0) {
  return score.measures
    .map((m) =>
      (m.staves[staff][voice]?.items ?? [])
        .map((item) => {
          const value = `${item.value}${item.dots ? '.' : ''}${item.tupletStart !== undefined ? 't' : ''}`;
          if (item.kind === 'rest') {
            return item.wholeMeasure
              ? 'W'
              : `${value}r${item.hidden ? '?' : ''}`;
          }
          const keys = item.keys
            .map((k) => {
              const acc = k.accidental ? `(${k.accidental})` : '';
              const spelled = { [-2]: 'bb', [-1]: 'b', 0: '', 1: '#', 2: '##' }[
                k.alteration
              ];
              return `${k.letter.toUpperCase()}${spelled}${k.octave}${acc}`;
            })
            .join('+');
          return `${value}:${keys}${item.tieToNext ? '~' : ''}`;
        })
        .join(' '),
    )
    .join(' | ');
}

describe('buildScore — rhythm', () => {
  it('writes plain quarters', () => {
    const score = buildScore([
      n('C4', 60, 0, Q),
      n('D4', 62, Q, Q),
      n('E4', 64, 2 * Q, Q),
      n('F4', 65, 3 * Q, Q),
    ]);
    expect(show(score)).toBe('q:C4 q:D4 q:E4 q:F4');
    expect(show(score, 'bass')).toBe('W');
  });

  it('rounds gated lesson durations up to the written value', () => {
    const score = buildScore([
      n('C4', 60, 0, 460),
      n('D4', 62, Q, 220),
      n('E4', 64, Q + 240, 220),
      n('F4', 65, 2 * Q, 900),
    ]);
    expect(show(score)).toBe('q:C4 8:D4 8:E4 h:F4');
  });

  it('writes swung off-beats as straight eighths', () => {
    // Lesson swing pushes the "and" up to 80 ticks late and shortens it.
    const score = buildScore([
      n('C4', 60, 0, 220),
      n('D4', 62, 320, 160),
      n('E4', 64, Q, 220),
      n('F4', 65, Q + 300, 180),
      n('G4', 67, 2 * Q, 2 * Q),
    ]);
    expect(show(score)).toBe('8:C4 8:D4 8:E4 8:F4 h:G4');
  });

  it('keeps 8th–quarter–8th syncopation whole', () => {
    const score = buildScore([
      n('C4', 60, 0, 240),
      n('D4', 62, 240, Q),
      n('E4', 64, 720, 240),
      n('F4', 65, 2 * Q, 2 * Q),
    ]);
    expect(show(score)).toBe('8:C4 q:D4 8:E4 h:F4');
  });

  it('splits a quarter across the middle of the bar', () => {
    const score = buildScore([n('C4', 60, 720, Q)]);
    expect(show(score)).toBe('qr 8r 8:C4~ 8:C4 8r qr');
  });

  it('shows the beat in rests', () => {
    const score = buildScore([n('C4', 60, Q, Q)]);
    expect(show(score)).toBe('qr q:C4 hr');
  });

  it('ties notes over the barline', () => {
    const score = buildScore([n('C4', 60, 3 * Q, 2 * Q)]);
    expect(show(score)).toBe('hr qr q:C4~ | q:C4 qr hr');
  });

  it('writes eighth triplets', () => {
    const score = buildScore([
      n('C4', 60, 0, 160),
      n('D4', 62, 160, 160),
      n('E4', 64, 320, 160),
      n('F4', 65, Q, 3 * Q),
    ]);
    expect(show(score)).toBe('8t:C4 8t:D4 8t:E4 h.:F4');
  });

  it('renders at least minMeasures bars', () => {
    const score = buildScore([n('C4', 60, 0, Q)], { minMeasures: 2 });
    expect(show(score)).toBe('q:C4 qr hr | W');
  });

  it('writes 6/8 in dotted-quarter beats', () => {
    const score = buildScore(
      [n('C4', 60, 0, 720), n('D4', 62, 720, 240), n('E4', 64, 960, 480)],
      { timeSignature: [6, 8] },
    );
    expect(show(score)).toBe('q.:C4 8:D4 q:E4');
  });

  it('snaps an unquantized performance', () => {
    const score = buildScore([
      n('C4', 60, 12, 450),
      n('D4', 62, 470, 250),
      n('E4', 64, 735, 200),
      n('F4', 65, 955, 940),
    ]);
    expect(show(score)).toBe('q:C4 8:D4 8:E4 h:F4');
  });
});

describe('buildScore — staves and voices', () => {
  it("follows a lesson's hand tags", () => {
    const score = buildScore([
      n('C4', 60, 0, 4 * Q, { staff: 'treble' }),
      n('B3', 59, 0, 4 * Q, { staff: 'bass' }),
      n('G4', 67, 0, 4 * Q, { staff: 'bass' }),
    ]);
    expect(show(score)).toBe('w:C4');
    expect(show(score, 'bass')).toBe('w:B3+G4');
  });

  it('writes a one-hand chord in a single clef, never straddling', () => {
    const lowChord = buildScore([
      n('C3', 48, 0, 4 * Q),
      n('E3', 52, 0, 4 * Q),
      n('G3', 55, 0, 4 * Q),
      n('B3', 59, 0, 4 * Q),
    ]);
    expect(show(lowChord, 'bass')).toBe('w:C3+E3+G3+B3');
    expect(show(lowChord, 'treble')).toBe('W');

    const highChord = buildScore([
      n('G4', 67, 0, 4 * Q),
      n('B4', 71, 0, 4 * Q),
      n('D5', 74, 0, 4 * Q),
      n('F5', 77, 0, 4 * Q),
    ]);
    expect(show(highChord)).toBe('w:G4+B4+D5+F5');
    expect(show(highChord, 'bass')).toBe('W');

    // Straddling middle C: either clef is defensible, but all four go together.
    const straddling = buildScore([
      n('G3', 55, 0, 4 * Q),
      n('B3', 59, 0, 4 * Q),
      n('D4', 62, 0, 4 * Q),
      n('F4', 65, 0, 4 * Q),
    ]);
    const written = [show(straddling), show(straddling, 'bass')];
    expect(written).toContain('w:G3+B3+D4+F4');
    expect(written).toContain('W');
  });

  it('splits a two-hand voicing at the gap, bass notes to the bass clef', () => {
    const score = buildScore([
      n('C2', 36, 0, 4 * Q),
      n('G2', 43, 0, 4 * Q),
      n('E4', 64, 0, 4 * Q),
      n('G4', 67, 0, 4 * Q),
      n('C5', 72, 0, 4 * Q),
    ]);
    expect(show(score, 'bass')).toBe('w:C2+G2');
    expect(show(score)).toBe('w:E4+G4+C5');
  });

  it('splits a held bass note from a short melody note struck with it', () => {
    const score = buildScore([
      n('C3', 48, 0, 4 * Q),
      n('C4', 60, 0, Q),
      n('D4', 62, Q, Q),
    ]);
    expect(show(score, 'bass')).toBe('w:C3');
    expect(show(score)).toBe('q:C4 q:D4 hr');
  });

  it('splits a melody sounding over a bass note', () => {
    const score = buildScore([n('C3', 48, 0, 4 * Q), n('E5', 76, 0, 4 * Q)]);
    expect(show(score, 'bass')).toBe('w:C3');
    expect(show(score)).toBe('w:E5');
  });

  it('keeps a melody around middle C on one staff', () => {
    const score = buildScore([
      n('E4', 64, 0, Q),
      n('C4', 60, Q, Q),
      n('B3', 59, 2 * Q, Q),
      n('C4', 60, 3 * Q, Q),
    ]);
    expect(show(score)).toBe('q:E4 q:C4 q:B3 q:C4');
    expect(show(score, 'bass')).toBe('W');
  });

  it('puts a note held under moving notes in a second voice', () => {
    const score = buildScore([
      n('C3', 48, 0, 4 * Q),
      n('E3', 52, 0, Q),
      n('F3', 53, Q, Q),
      n('G3', 55, 2 * Q, Q),
      n('A3', 57, 3 * Q, Q),
    ]);
    expect(show(score, 'bass', 0)).toBe('q:E3 q:F3 q:G3 q:A3');
    expect(show(score, 'bass', 1)).toBe('w:C3');
  });

  it('trims small legato overlaps instead of adding a voice', () => {
    const score = buildScore([n('C4', 60, 0, Q + 100), n('D4', 62, Q, Q)]);
    expect(show(score)).toBe('q:C4 q:D4 hr');
    expect(score.measures[0].staves.treble).toHaveLength(1);
  });
});

describe('buildScore — spelling and accidentals', () => {
  it('keeps the lesson spelling and prints accidentals once per bar', () => {
    const score = buildScore(
      [
        n('B♭4', 70, 0, Q),
        n('B4', 71, Q, Q),
        n('B4', 71, 2 * Q, Q),
        n('B♭4', 70, 3 * Q, Q),
        n('B♭4', 70, 4 * Q, 4 * Q),
      ],
      { keyFifths: -1 },
    );
    expect(show(score)).toBe('q:Bb4 q:B4(n) q:B4 q:Bb4(b) | w:Bb4');
  });

  it('writes the octave of the letter (C♭5 is MIDI 71)', () => {
    const score = buildScore([n('Cb5', 71, 0, 4 * Q)], { keyFifths: -7 });
    expect(show(score)).toBe('w:Cb5');
  });

  it('drops a name that disagrees with the pitch', () => {
    const score = buildScore([n('D4', 61, 0, 4 * Q)], {
      keyFifths: 0,
      spell: () => 'C#4',
    });
    expect(show(score)).toBe('w:C#4(#)');
  });

  it('does not repeat an accidental on a tied note', () => {
    const score = buildScore(
      [n('F#4', 66, 3 * Q, 2 * Q), n('F#4', 66, 6 * Q, Q)],
      { keyFifths: 0 },
    );
    expect(show(score)).toBe('hr qr q:F#4(#)~ | q:F#4 qr q:F#4(#) qr');
  });
});

describe('key signatures', () => {
  it('infers the signature needing the fewest accidentals', () => {
    // D dorian: all naturals → no sharps or flats
    const dorian = [1, 2, 3, 4, 5, 6, 0].map((letterIndex) => ({
      letterIndex,
      alteration: 0,
    }));
    expect(inferKeyFifths(dorian, 2)).toBe(0);
    // E♭ major scale
    const eFlat = [
      { letterIndex: 2, alteration: -1 },
      { letterIndex: 3, alteration: 0 },
      { letterIndex: 4, alteration: 0 },
      { letterIndex: 5, alteration: -1 },
      { letterIndex: 6, alteration: -1 },
    ];
    expect(inferKeyFifths(eFlat, 3)).toBe(-3);
  });

  it('gives modes their parent major signature', () => {
    expect(keyFifthsForTonic(1, 0, 'dorian')).toBe(0); // D dorian
    expect(keyFifthsForTonic(5, 0, 'aeolian')).toBe(0); // A minor
    expect(keyFifthsForTonic(4, 0, 'mixolydian')).toBe(0); // G mixolydian
    expect(keyFifthsForTonic(2, -1, 'ionian')).toBe(-3); // E♭ major
    expect(keyFifthsForTonic(3, 1, 'aeolian')).toBe(3); // F♯ minor
  });
});

describe('a melody stays in one clef', () => {
  // Learn writes melodies with `staves: 'treble'` rather than letting the
  // grand-staff split read the clef off the pitch — a phrase that dips under
  // middle C is still the same melody and should not change clef mid-line.
  // The split has hysteresis, so it tolerates a brief dip; a phrase reaching
  // a fourth below the split point is the one that breaks.
  const dipsWellBelowMiddleC = [
    n('G4', 67, 0, 480),
    n('E4', 64, 480, 480),
    n('C4', 60, 960, 480),
    n('F3', 53, 1440, 480),
  ];

  it('keeps a low phrase on the treble staff when the clef is named', () => {
    const score = buildScore(dipsWellBelowMiddleC, { staves: 'treble' });
    expect(score.staves).toEqual(['treble']);
    expect(show(score, 'treble')).toBe('q:G4 q:E4 q:C4 q:F3');
  });

  it('would otherwise drop the low note into the bass clef', () => {
    // The behaviour being avoided, stated so the fix cannot quietly regress.
    const score = buildScore(dipsWellBelowMiddleC);
    expect(score.staves).toEqual(['treble', 'bass']);
    expect(show(score, 'treble')).not.toContain('F3');
    expect(show(score, 'bass')).toContain('F3');
  });

  it('tolerates a shallow dip either way — hysteresis holds the clef', () => {
    const shallow = [n('G4', 67, 0, 480), n('A3', 57, 480, 480)];
    expect(show(buildScore(shallow), 'treble')).toContain('A3');
  });
});

describe('chords follow the hand that plays them', () => {
  // Picking a hand changes the clef and nothing else — same pitches either
  // way, so the clef reads as "play these keys with that hand".
  const chord = [
    n('C4', 60, 0, 1920),
    n('E4', 64, 0, 1920),
    n('G4', 67, 0, 1920),
  ];

  it('writes a right-hand chord in the treble clef', () => {
    const score = buildScore(chord, { staves: 'treble' });
    expect(score.staves).toEqual(['treble']);
    expect(show(score, 'treble')).toBe('w:C4+E4+G4');
  });

  it('writes the same chord in the bass clef for the left hand', () => {
    const score = buildScore(chord, { staves: 'bass' });
    expect(score.staves).toEqual(['bass']);
    expect(show(score, 'bass')).toBe('w:C4+E4+G4');
  });

  it('keeps the pitches identical between the two', () => {
    const keysOf = (staff: 'treble' | 'bass') =>
      buildScore(chord, { staves: staff })
        .measures[0].staves[staff][0].items.flatMap((i) => i.keys)
        .map((k) => k.midi);
    expect(keysOf('treble')).toEqual(keysOf('bass'));
  });
});

describe('a bass line stays in the bass clef', () => {
  // Section C names the clef for the same reason melodies do: a walking line
  // that reaches up past middle C is still the bass part, and should climb
  // onto ledger lines rather than flip to the treble staff mid-phrase.
  const climbsAboveMiddleC = [
    n('G2', 43, 0, 480),
    n('C3', 48, 480, 480),
    n('G3', 55, 960, 480),
    n('E4', 64, 1440, 480), // well above the C4 split point
  ];

  it('keeps a high note on the bass staff when the clef is named', () => {
    const score = buildScore(climbsAboveMiddleC, { staves: 'bass' });
    expect(score.staves).toEqual(['bass']);
    expect(show(score, 'bass')).toBe('q:G2 q:C3 q:G3 q:E4');
  });

  it('would otherwise lift the high note into the treble clef', () => {
    const score = buildScore(climbsAboveMiddleC);
    expect(score.staves).toEqual(['treble', 'bass']);
    expect(show(score, 'bass')).not.toContain('E4');
    expect(show(score, 'treble')).toContain('E4');
  });
});
