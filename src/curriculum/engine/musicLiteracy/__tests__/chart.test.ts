import { describe, expect, it } from 'vitest';
import { chordSymbolTones } from '@/curriculum/engine/genreGeneration/chordSymbolTones';
import {
  chartColors,
  chartId,
  chartKeyColor,
  chartKeyName,
  chartLabels,
  chartLine,
  chartSymbols,
  chordSymbol,
  degreeNoteName,
  parseChart,
  sameChart,
  STARTER_PROGRESSION,
  type LiteracyChart,
} from '../chart';
import { circleOfFifths } from '../choices';

/**
 * Part 3's chart: a progression Part 2 saved, as the chord symbols a Band
 * plays and the hybrid labels the app names chords by.
 */

const chart = (
  tonic: LiteracyChart['tonic'],
  mode: LiteracyChart['mode'],
  chords: string,
  harmony: LiteracyChart['harmony'] = 'triads',
): LiteracyChart => ({
  tonic,
  mode,
  harmony,
  chords: chords.split(' ') as LiteracyChart['chords'],
});

describe('a chart’s chord symbols', () => {
  it('spells D minor’s 1 4 5 6 as Dm Gm Am Bb, and with 7ths', () => {
    expect(chartSymbols(chart('D', 'minor', '1 4 5 6'))).toEqual([
      'Dm',
      'Gm',
      'Am',
      'Bb',
    ]);
    expect(chartSymbols(chart('D', 'minor', '1 4 5 6', 'sevenths'))).toEqual([
      'Dm7',
      'Gm7',
      'Am7',
      'Bbmaj7',
    ]);
  });

  it('spells C major’s 1 6 4 5 as C Am F G, and with 7ths', () => {
    expect(chartSymbols(chart('C', 'major', '1 6 4 5'))).toEqual([
      'C',
      'Am',
      'F',
      'G',
    ]);
    expect(chartSymbols(chart('C', 'major', '1 6 4 5', 'sevenths'))).toEqual([
      'Cmaj7',
      'Am7',
      'Fmaj7',
      'G7',
    ]);
  });

  it('spells each degree on its own letter, flats and sharps the key’s way', () => {
    // E♭ major: the 4 is A♭, never G♯.
    expect(chartSymbols(chart('Eb', 'major', '1 4 5 2'))).toEqual([
      'Eb',
      'Ab',
      'Bb',
      'Fm',
    ]);
    // F♯ major: the 3 is A♯ minor, the 6 D♯ minor.
    expect(chartSymbols(chart('F#', 'major', '1 3 6 4', 'sevenths'))).toEqual([
      'F#maj7',
      'A#m7',
      'D#m7',
      'Bmaj7',
    ]);
    // A minor's ♭3, ♭6 and ♭7: C, F and G, its 5 minor.
    expect(chartSymbols(chart('A', 'minor', '1 3 6 7 5'))).toEqual([
      'Am',
      'C',
      'F',
      'G',
      'Em',
    ]);
    // B♭ minor's ♭7 dom7: A♭7.
    expect(chordSymbol({ tonic: 'Bb', mode: 'minor' }, '7', 'sevenths')).toBe(
      'Ab7',
    );
  });

  it('writes a double flat where the key needs one, and it still parses', () => {
    // D♭ minor: D♭ E♭ F♭ G♭ A♭ B𝄫 C♭.
    expect(degreeNoteName('Db', 'minor', '6')).toBe('Bbb');
    expect(degreeNoteName('Db', 'minor', '3')).toBe('Fb');
    const symbols = chartSymbols(chart('Db', 'minor', '1 3 6 7', 'sevenths'));
    expect(symbols).toEqual(['Dbm7', 'Fbmaj7', 'Bbbmaj7', 'Cb7']);
    expect(symbols.map((s) => chordSymbolTones(s)?.rootPc)).toEqual([
      1, 4, 9, 11,
    ]);
  });

  it('plays the 1 for the diminished chord the mode leaves out', () => {
    expect(chordSymbol({ tonic: 'C', mode: 'major' }, '7')).toBe('C');
    expect(chordSymbol({ tonic: 'A', mode: 'minor' }, '2')).toBe('Am');
  });

  it('gives symbols chordSymbolTones reads as the chords they name', () => {
    const tones = chartSymbols(chart('G', 'major', '1 5 6 4', 'sevenths')).map(
      (s) => chordSymbolTones(s),
    );
    expect(tones.map((t) => t?.rootPc)).toEqual([7, 2, 4, 0]);
    expect(tones.map((t) => t?.intervals)).toEqual([
      [0, 4, 7, 11],
      [0, 4, 7, 10],
      [0, 3, 7, 10],
      [0, 4, 7, 11],
    ]);
  });
});

describe('a chart’s labels', () => {
  it('names the chords the hybrid way, never in Roman numerals', () => {
    expect(chartLabels(chart('D', 'minor', '1 4 5 6'))).toEqual([
      '1 min',
      '4 min',
      '5 min',
      '♭6 maj',
    ]);
    expect(chartLine(chart('D', 'minor', '1 4 5 6'))).toBe(
      '1 min · 4 min · 5 min · ♭6 maj',
    );
    expect(chartLabels(chart('D', 'minor', '1 4 5 6', 'sevenths'))).toEqual([
      '1 min7',
      '4 min7',
      '5 min7',
      '♭6 maj7',
    ]);
    expect(chartLine(chart('C', 'major', '1 6 4 5', 'sevenths'), ' – ')).toBe(
      '1 maj7 – 6 min7 – 4 maj7 – 5 dom7',
    );
    expect(chartLabels(chart('E', 'minor', '1 3 7'))).toEqual([
      '1 min',
      '♭3 maj',
      '♭7 maj',
    ]);
  });

  it('names the key as Part 2 does, in its color', () => {
    expect(chartKeyName(chart('Bb', 'major', '1'))).toBe('B♭ Major');
    expect(chartKeyName(chart('F#', 'minor', '1'))).toBe('F♯ Minor');
    expect(chartKeyColor(chart('C', 'major', '1'))).toBe('#D2404A');
  });

  it('colors each chord as Part 2’s palette does: its root’s key', () => {
    const ring = circleOfFifths('minor');
    const colorOf = (tonic: string) =>
      ring.find((k) => k.tonic === tonic)?.color;
    expect(chartColors(chart('D', 'minor', '1 4 5 6'))).toEqual([
      colorOf('D'),
      colorOf('G'),
      colorOf('A'),
      colorOf('Bb'),
    ]);
  });
});

describe('a chart in a link', () => {
  it('reads back what it wrote', () => {
    const c = chart('F#', 'minor', '1 4 5 6', 'sevenths');
    expect(chartId(c)).toBe('F#.minor.sevenths.1-4-5-6');
    const back = parseChart({
      tonic: 'F#',
      mode: 'minor',
      harmony: 'sevenths',
      chords: '1-4-5-6',
    });
    expect(back && sameChart(back, c)).toBe(true);
  });

  it('reads triads when the harmony is left out', () => {
    expect(
      parseChart({ tonic: 'C', mode: 'major', chords: '1-6-4-5' }),
    ).toEqual({
      tonic: 'C',
      mode: 'major',
      harmony: 'triads',
      chords: ['1', '6', '4', '5'],
    });
  });

  it('refuses what Part 2 could never have saved', () => {
    const read = (parts: Partial<Record<string, string>>) =>
      parseChart({
        tonic: 'D',
        mode: 'minor',
        chords: '1-4-5-6',
        ...parts,
      });
    expect(read({ tonic: 'H' })).toBeNull();
    expect(read({ tonic: 'Cb' })).toBeNull();
    expect(read({ mode: 'dorian' })).toBeNull();
    expect(read({ harmony: 'ninths' })).toBeNull();
    expect(read({ chords: '' })).toBeNull();
    expect(read({ chords: '1-b6' })).toBeNull();
    // Minor's 2 is diminished: left out of Part 2.
    expect(read({ chords: '1-2-5' })).toBeNull();
    expect(read({ chords: '1-1-1-1-1-1-1-1-1' })).toBeNull();
    expect(read({})).not.toBeNull();
  });

  it('starts on C major’s 1 6 4 5 when nothing is saved', () => {
    expect(chartSymbols(STARTER_PROGRESSION)).toEqual(['C', 'Am', 'F', 'G']);
    expect(chartLine(STARTER_PROGRESSION)).toBe(
      '1 maj · 6 min · 4 maj · 5 maj',
    );
  });
});
