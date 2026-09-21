import { describe, expect, it } from 'vitest';
import type { ChordContext } from '@/lib/chordNotation';
import {
  chordsPerBar,
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

  it('places two chords inside one bar over their own notes', () => {
    // B1.5 as written: Am9 on beat 1, D13 on beat 3, both in a single bar.
    // Per-bar placement walked D13 onto the empty bar after the music.
    expect(
      placeLessonChords(['Am9', 'D13'], {
        bars: 1,
        ticksPerBar: BAR,
        onsets: [0, 960],
        contentEndTick: 1920,
      }),
    ).toEqual([
      { label: 'Am9', startTick: 0 },
      { label: 'D13', startTick: 960 },
    ]);
  });

  it('snaps to a real note rather than an exact division', () => {
    // B1.7 ends at 1880, so an even split lands on 940 — between the chords.
    expect(
      placeLessonChords(['Cm9', 'F13'], {
        bars: 1,
        ticksPerBar: BAR,
        onsets: [0, 960],
        contentEndTick: 1880,
      }).map((c) => c.startTick),
    ).toEqual([0, 960]);
  });

  it('reaches past a nearer note to the one the division means', () => {
    // B2.7: chords at 0 and 240 in a 700-tick exercise. The split is 350,
    // whose nearest onset is 240 — the second chord, not the first.
    expect(
      placeLessonChords(['Bfunk9', 'Cfunk9'], {
        bars: 1,
        ticksPerBar: BAR,
        onsets: [0, 240],
        contentEndTick: 700,
      }).map((c) => c.startTick),
    ).toEqual([0, 240]);
  });

  it('spreads a four-chord comp across two bars of quarter-note strikes', () => {
    // B4.3: strikes every 480, chords change every 960.
    expect(
      placeLessonChords(['C', 'F', 'G', 'C'], {
        bars: 3,
        ticksPerBar: BAR,
        onsets: [0, 480, 960, 1440, 1920, 2400, 2880, 3360, 3840],
        contentEndTick: 3960,
      }).map((c) => c.startTick),
    ).toEqual([0, 960, 1920, 2880]);
  });

  it('carries the count-in offset like the notes do', () => {
    expect(
      placeLessonChords(['Am9', 'D13'], {
        bars: 1,
        ticksPerBar: BAR,
        onsets: [0, 960],
        contentEndTick: 1920,
        startTick: 1920,
      }).map((c) => c.startTick),
    ).toEqual([1920, 2880]);
  });

  it('falls back to the division when the step has no notes', () => {
    expect(
      placeLessonChords(['Am9', 'D13'], {
        bars: 1,
        ticksPerBar: BAR,
        onsets: [],
        contentEndTick: 1920,
      }).map((c) => c.startTick),
    ).toEqual([0, 960]);
  });
});
