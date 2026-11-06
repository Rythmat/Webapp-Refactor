import { describe, expect, it } from 'vitest';
import type { ChordContext } from '@/lib/chordNotation';
import {
  chordsPerBar,
  chordsTwoABar,
  formatChordsInText,
  placeLessonChords,
  formatLessonChord,
  lessonChordSymbols,
} from '../lessonChordSymbols';

/** D dorian — the key from the report that started this. */
const D_DORIAN: ChordContext = { keyRootPc: 2, mode: 'dorian' };
/** B♭ major — Pop L3. */
const BB_MAJOR: ChordContext = { keyRootPc: 10, mode: 'ionian' };

const texts = (chords: { label: string; startTick: number }[], n = 'hybrid') =>
  lessonChordSymbols(chords, n as 'hybrid', D_DORIAN).map((s) => s.text);

/** A minor (dorian) — Funk L2. */
const A_DORIAN: ChordContext = { keyRootPc: 9, mode: 'dorian' };

describe('formatChordsInText', () => {
  const B15 = 'Am9 → Ddom13 Voice Leading';

  it('names a title’s chords as the staff does, in either notation', () => {
    // One step used to read three ways: "Am9 → Ddom13" (title), "Am9 → D13"
    // (beside it) and "A min9 / D dom13" (over the staff).
    expect(formatChordsInText(B15, 'hybrid', A_DORIAN)).toBe(
      'A min9 → D dom13 Voice Leading',
    );
    expect(formatChordsInText(B15, 'jazz', A_DORIAN)).toBe(
      'A−9 → D13 Voice Leading',
    );
  });

  it('reads chords joined by hyphens and slash chords', () => {
    expect(
      formatChordsInText('A♭13-G7alt-Cm9-F13 Full Progression', 'hybrid', {}, [
        'Ab13',
        'G7alt',
        'Cm9',
        'F13',
      ]),
    ).toBe('A♭ dom13-G dom7alt-C min9-F dom13 Full Progression');
    expect(formatChordsInText('1maj/3 over Bb/D', 'hybrid', {})).toBe(
      '1maj/3 over B♭ maj/D',
    );
  });

  it('reads a root and an abbreviated quality written apart', () => {
    expect(formatChordsInText('A Funk9 → D Funk9', 'hybrid', {})).toBe(
      'A funk9 → D funk9',
    );
    expect(formatChordsInText('F Dom13 7-3-13 Voicing', 'jazz', {})).toBe(
      'F13 7-3-13 Voicing',
    );
  });

  it('leaves words, keys, notes and section codes alone', () => {
    for (const text of [
      'C Major Pentatonic Ascending',
      'Dorian Bass Groove',
      'Drop the Sizzle',
      'LH: D3-F3-C4, RH: Ab4→G4→F4→D4',
      'B1.5 · A1 · D2',
      'Register: C3-C5',
    ]) {
      expect(formatChordsInText(text, 'hybrid', {})).toBe(text);
    }
  });

  it('takes a bare number for a chord only when the step plays it', () => {
    // "G7" is a chord here; "D5" is a note, not a power chord.
    expect(
      formatChordsInText('switch to G7 as RH hits D5', 'hybrid', {}, [
        'Dm7',
        'G7',
      ]),
    ).toBe('switch to G dom7 as RH hits D5');
  });
});

describe('formatLessonChord', () => {
  it('writes a letter-named chord in each notation', () => {
    expect(formatLessonChord('Dm7', 'hybrid', D_DORIAN)).toBe('D min7');
    expect(formatLessonChord('Dm7', 'jazz', D_DORIAN)).toBe('D−7');
    expect(formatLessonChord('Dm7', 'roman', D_DORIAN)).toBe('i7');
  });

  it('turns a degree-named chord into a letter, as a lead sheet writes it', () => {
    // The theory activities name chords by degree; the key turns them into
    // letters so the staff reads like a lead sheet rather than an analysis.
    expect(formatLessonChord('6 min', 'hybrid', D_DORIAN)).toBe('B min');
    expect(formatLessonChord('1 maj', 'hybrid', BB_MAJOR)).toBe('B♭ maj');
    expect(formatLessonChord('4 maj7', 'hybrid', BB_MAJOR)).toBe('E♭ maj7');
    expect(formatLessonChord('6 min', 'jazz', D_DORIAN)).toBe('B−');
  });

  it('keeps a slash chord', () => {
    expect(formatLessonChord('Bb/D', 'jazz', BB_MAJOR)).toBe('B♭/D');
  });

  it('writes funk9, the curriculum’s own symbol for the ♭7-9-5 shape', () => {
    // Registered as a quality, so it survives every notation rather than
    // falling through as unparsed text.
    expect(formatLessonChord('Afunk9', 'hybrid', D_DORIAN)).toBe('A funk9');
    expect(formatLessonChord('Afunk9', 'jazz', D_DORIAN)).toBe('Afunk9');
    expect(formatLessonChord('Afunk9', 'roman', D_DORIAN)).toBe('Vfunk9');
  });

  it('writes minor add2, which the engine has no quality for', () => {
    // Pop L3 writes "Gmadd2"; without a minor add2 quality the jazz symbol
    // fell back to the hybrid text ("6 madd2").
    expect(formatLessonChord('Gmadd2', 'jazz', BB_MAJOR)).toBe('G\u2212add2');
    expect(formatLessonChord('Gmadd2', 'hybrid', BB_MAJOR)).toBe('G minadd2');
  });

  it('shows an unparseable label exactly as written', () => {
    expect(formatLessonChord('???', 'jazz', D_DORIAN)).toBe('???');
  });
});

describe('lessonChordSymbols', () => {
  it('collapses a chord restruck through the bar into one symbol', () => {
    // The quarter-note activity strikes the same chord four times.
    expect(
      texts([
        { label: 'Dm7', startTick: 0 },
        { label: 'Dm7', startTick: 480 },
        { label: 'Dm7', startTick: 960 },
        { label: 'Dm7', startTick: 1440 },
        { label: 'G7', startTick: 1920 },
      ]),
    ).toEqual(['D min7', 'G dom7']);
  });

  it('restates a chord that returns after a different one', () => {
    expect(
      texts([
        { label: 'Dm7', startTick: 0 },
        { label: 'G7', startTick: 1920 },
        { label: 'Dm7', startTick: 3840 },
      ]),
    ).toEqual(['D min7', 'G dom7', 'D min7']);
  });

  it('keeps the tick each symbol belongs to', () => {
    const symbols = lessonChordSymbols(
      [
        { label: 'Dm7', startTick: 960 },
        { label: 'G7', startTick: 1920 },
      ],
      'hybrid',
      D_DORIAN,
    );
    expect(symbols.map((s) => s.startTick)).toEqual([960, 1920]);
    expect(new Set(symbols.map((s) => s.id)).size).toBe(2);
  });

  it('sorts out-of-order input before thinning', () => {
    expect(
      texts([
        { label: 'G7', startTick: 1920 },
        { label: 'Dm7', startTick: 0 },
      ]),
    ).toEqual(['D min7', 'G dom7']);
  });

  it('returns nothing for no chords', () => {
    expect(lessonChordSymbols([], 'hybrid', D_DORIAN)).toEqual([]);
  });
});

describe('chordsPerBar', () => {
  it('lays one symbol per bar', () => {
    expect(chordsPerBar(['Bb', 'Ebmaj7'], 2, 1920)).toEqual([
      { label: 'Bb', startTick: 0 },
      { label: 'Ebmaj7', startTick: 1920 },
    ]);
  });

  it('loops a short list, the way the backing engine reads chordSymbols', () => {
    expect(chordsPerBar(['Bb', 'Eb'], 4, 1920).map((c) => c.label)).toEqual([
      'Bb',
      'Eb',
      'Bb',
      'Eb',
    ]);
  });

  it('offsets every bar by the count-in', () => {
    expect(chordsPerBar(['Bb'], 2, 1920, 1920).map((c) => c.startTick)).toEqual(
      [1920, 3840],
    );
  });

  it('returns nothing without labels or bars', () => {
    expect(chordsPerBar([], 4, 1920)).toEqual([]);
    expect(chordsPerBar(['Bb'], 0, 1920)).toEqual([]);
  });
});

describe('placeLessonChords', () => {
  const BAR = 1920;

  it('keeps one symbol per bar when the labels fit the bars', () => {
    expect(
      placeLessonChords(['Am9', 'D13'], { bars: 2, ticksPerBar: BAR }),
    ).toEqual([
      { label: 'Am9', startTick: 0 },
      { label: 'D13', startTick: BAR },
    ]);
  });

  it('still loops a short list across the bars', () => {
    // Two chords over four bars are heard twice — not squeezed into bar 1-2.
    expect(
      placeLessonChords(['Am9', 'D13'], { bars: 4, ticksPerBar: BAR }).map(
        (c) => c.startTick,
      ),
    ).toEqual([0, 1920, 3840, 5760]);
  });

  it('puts one chord a bar over a single line, however its notes fall', () => {
    // Jazz L3 Four-Bar Line 1: a pickup in bar 1, eighths in bar 2, a whole
    // note in bar 3 and a bar of rest. Gm7 | C7 | Fmaj7, each on its bar.
    const line = [
      1440,
      1680,
      ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => 1920 + i * 240),
    ]
      .map((onset) => ({ onset, duration: 220, midi: 67 }))
      .concat({ onset: 3840, duration: 1860, midi: 69 });
    expect(
      placeLessonChords(['Gm7', 'C7', 'Fmaj7', 'Fmaj7'], {
        bars: 5,
        ticksPerBar: BAR,
        notes: line,
      }),
    ).toEqual([
      { label: 'Gm7', startTick: 0 },
      { label: 'C7', startTick: BAR },
      { label: 'Fmaj7', startTick: 2 * BAR },
    ]);
  });

  it('keeps a bar’s first chord in time, as the band plays it', () => {
    // A one-bar phrase over Em | F: the band plays F in bar 2.
    expect(
      placeLessonChords(['Em', 'F'], {
        bars: 2,
        ticksPerBar: BAR,
        notes: [{ onset: 0, duration: 1900, midi: 64 }],
      }),
    ).toEqual([{ label: 'Em', startTick: 0 }]);
  });

  it('puts a bar’s first chord on its downbeat when it is struck later', () => {
    // A bolero comps on the "and": Em on 240, Am on 2160.
    const triad = (onset: number, midis: number[]) =>
      midis.map((midi) => ({ onset, duration: 200, midi }));
    expect(
      placeLessonChords(['Em', 'Am'], {
        bars: 2,
        ticksPerBar: BAR,
        notes: [...triad(240, [55, 59, 64]), ...triad(2160, [57, 60, 64])],
      }),
    ).toEqual([
      { label: 'Em', startTick: 0 },
      { label: 'Am', startTick: BAR },
    ]);
  });

  it('keeps a change inside a bar on its own strike', () => {
    // Funk L2 B1.5: Am9 on beat 1, D13 on beat 3 of one bar.
    const chord = (onset: number, midis: number[]) =>
      midis.map((midi) => ({ onset, duration: 900, midi }));
    expect(
      placeLessonChords(['Am9', 'D13'], {
        bars: 1,
        ticksPerBar: BAR,
        notes: [...chord(0, [55, 60, 64, 71]), ...chord(960, [54, 59, 60, 64])],
      }).map((c) => c.startTick),
    ).toEqual([0, 960]);
  });

  it('shares an out-of-time exercise’s chords across its beats', () => {
    // Two chords in one bar: beats 1 and 3.
    expect(
      placeLessonChords(['Am9', 'D13'], {
        bars: 1,
        ticksPerBar: BAR,
        contentEndTick: 1920,
        outOfTime: true,
      }),
    ).toEqual([
      { label: 'Am9', startTick: 0 },
      { label: 'D13', startTick: 960 },
    ]);
  });

  it('lands on a beat, not an exact division', () => {
    // An exercise ending at 1880 divides at 940: the chord goes on beat 3.
    expect(
      placeLessonChords(['Cm9', 'F13'], {
        bars: 1,
        ticksPerBar: BAR,
        contentEndTick: 1880,
        outOfTime: true,
      }).map((c) => c.startTick),
    ).toEqual([0, 960]);
  });

  it('keeps two chords on two beats of a short exercise', () => {
    // 700 ticks: the second chord can't wait for beat 3.
    expect(
      placeLessonChords(['Bfunk9', 'Cfunk9'], {
        bars: 1,
        ticksPerBar: BAR,
        contentEndTick: 700,
        outOfTime: true,
      }).map((c) => c.startTick),
    ).toEqual([0, 480]);
  });

  it('shares four chords across the half bars of a longer exercise', () => {
    expect(
      placeLessonChords(['C', 'F', 'G', 'C'], {
        bars: 3,
        ticksPerBar: BAR,
        contentEndTick: 3960,
        outOfTime: true,
      }).map((c) => c.startTick),
    ).toEqual([0, 960, 1920, 2880]);
  });

  it('carries the count-in offset like the notes do', () => {
    expect(
      placeLessonChords(['Am9', 'D13'], {
        bars: 1,
        ticksPerBar: BAR,
        contentEndTick: 1920,
        startTick: 1920,
        outOfTime: true,
      }).map((c) => c.startTick),
    ).toEqual([1920, 2880]);
  });
});

describe('chordsTwoABar', () => {
  it('labels each half bar, a chord held across halves once', () => {
    expect(chordsTwoABar(['Gm7', 'C7', 'Fmaj7', 'Fmaj7'], 1920, 960)).toEqual([
      { label: 'Gm7', startTick: 960 },
      { label: 'C7', startTick: 1920 },
      { label: 'Fmaj7', startTick: 2880 },
    ]);
  });
});
