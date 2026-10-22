import { describe, expect, it } from 'vitest';
import {
  parseChart,
  PROGRESSIONS,
  QUALITIES,
  chordSymbol,
  type Quality,
} from '@/curriculum/engine/bassLines/harmony';
import { chordSymbolTones } from '@/curriculum/engine/genreGeneration/chordSymbolTones';
import {
  chosenChart,
  formatPartChords,
  OWN_CHORDS,
  parsePartChords,
  soundedSymbol,
  takeChordSymbols,
} from '../chartChoice';

const bars = (chart: string) => parseChart(chart).bars;

describe('chosenChart', () => {
  it('plays a preset in the key picked, or a typed chart over it', () => {
    const preset = chosenChart({ progression: 'two-five-one', key: 7 }, [4, 4]);
    expect(preset.own).toBe(false);
    expect(preset.bars).toHaveLength(4);
    expect(preset.key).toEqual({ tonic: 7, mode: 'ionian' });
    const typed = chosenChart(
      { progression: 'two-five-one', key: 7, chart: '| Cm7 | F7 |' },
      [4, 4],
    );
    expect(typed.bars).toHaveLength(2);
    expect(typed.key).toEqual({ tonic: 0, mode: 'dorian' });
  });

  it('takes a typed chart’s key as set, else as its first chord suggests', () => {
    const chart = '| Am | F | C | G |';
    expect(chosenChart({ chart }, [4, 4]).key).toEqual({
      tonic: 9,
      mode: 'aeolian',
    });
    const set = chosenChart(
      { chart, chartKey: { tonic: 0, minor: false } },
      [4, 4],
    );
    expect(set.key).toEqual({ tonic: 0, mode: 'ionian' });
    expect(set.keySet).toBe(true);
    // Set as a minor key, the mode is the one its chords fit: C dorian.
    expect(
      chosenChart(
        { chart: '| Cm7 | F7 |', chartKey: { tonic: 0, minor: true } },
        [4, 4],
      ).key,
    ).toEqual({ tonic: 0, mode: 'dorian' });
  });

  it('is a part’s own chords only until a chart is typed', () => {
    expect(chosenChart({ progression: OWN_CHORDS }, [4, 4]).own).toBe(true);
    expect(
      chosenChart({ progression: OWN_CHORDS, chart: '| Am |' }, [4, 4]).own,
    ).toBe(false);
  });

  it('opens on the meter’s default progression', () => {
    expect(chosenChart({}, [4, 4]).progression.id).toBe(PROGRESSIONS[0].id);
    expect(chosenChart({}, [3, 4]).progression.id).toBe('turnaround');
  });
});

describe('takeChordSymbols', () => {
  it('writes each bar’s chords as a chart writes them', () => {
    expect(takeChordSymbols(bars('| Dm7 G7 | Cmaj7 |'), [4, 4], 2)).toEqual([
      'Dm7 G7',
      'Cmaj7',
    ]);
    expect(takeChordSymbols(bars('| C . . G7 |'), [4, 4], 1)).toEqual([
      'C . . G7',
    ]);
    // Three chords split a bar in three.
    expect(takeChordSymbols(bars('| C F G |'), [4, 4], 1)).toEqual(['C F G']);
  });

  it('loops the chart over a longer take, and keeps the writer’s spelling', () => {
    expect(takeChordSymbols(bars('| Am9 | D13 |'), [4, 4], 4)).toEqual([
      'Am9',
      'D13',
      'Am9',
      'D13',
    ]);
  });

  it('spreads a chart bar over two bars of 2/4, as the band plays it', () => {
    expect(takeChordSymbols(bars('| Am | E7 |'), [2, 4], 4)).toEqual([
      'Am',
      'Am',
      'E7',
      'E7',
    ]);
  });

  it('writes chords a part can follow, whatever their quality', () => {
    for (const quality of Object.keys(QUALITIES) as Quality[]) {
      const symbol = chordSymbol({ root: 2, quality, bass: null });
      expect(chordSymbolTones(symbol), `${quality}: ${symbol}`).not.toBeNull();
    }
  });
});

describe('a part’s chords in the Parts editor', () => {
  it('reads bars between |, a bar’s chords splitting it', () => {
    expect(parsePartChords('Dm7 G7 | Cmaj7')).toEqual(['Dm7 G7', 'Cmaj7']);
    expect(parsePartChords('| C . . G7 |  Am |')).toEqual(['C . . G7', 'Am']);
  });

  it('reads a chord a bar without |, as it always has', () => {
    expect(parsePartChords('Dm9 G13')).toEqual(['Dm9', 'G13']);
    expect(parsePartChords('  ')).toBeUndefined();
  });

  it('writes them back as it reads them', () => {
    const chords = ['Dm7 G7', 'Cmaj7'];
    expect(parsePartChords(formatPartChords(chords))).toEqual(chords);
    expect(formatPartChords(undefined)).toBe('');
  });
});

describe('a copy’s chords, named for what it plays', () => {
  const pcs = (...names: string[]) =>
    new Set(
      names.map((n) => 'C C# D Eb E F F# G Ab A Bb B'.split(' ').indexOf(n)),
    );

  it('is a sus chord where the hand never plays the third', () => {
    expect(soundedSymbol('G7', pcs('G', 'C', 'D'))).toBe('Gsus4');
    expect(soundedSymbol('G7', pcs('G', 'C', 'D', 'F'))).toBe('G7sus4');
    expect(soundedSymbol('Am', pcs('A', 'B', 'E'))).toBe('Asus2');
    expect(soundedSymbol('Cmin', pcs('C', 'D', 'G'))).toBe('Csus2');
  });

  it('is the chart’s chord wherever the third is played, or nothing tells', () => {
    expect(soundedSymbol('G7', pcs('G', 'B', 'D', 'C'))).toBe('G7');
    expect(soundedSymbol('Cm', pcs('C', 'Eb', 'G'))).toBe('Cm');
    expect(soundedSymbol('G7', pcs('G', 'D'))).toBe('G7');
    expect(soundedSymbol('Gsus4', pcs('G', 'C', 'D'))).toBe('Gsus4');
    expect(soundedSymbol('G7', new Set())).toBe('G7');
  });

  it('writes each bar’s chord as the copy plays it', () => {
    const played = [
      // Bar 1: C E♭ G over Cm. Bar 2: G C D over G7.
      ...[48, 63, 67].map((midi) => ({ tick: 0, midi })),
      ...[43, 60, 62, 67].map((midi) => ({ tick: 1920, midi })),
    ];
    expect(
      takeChordSymbols(bars('| Cm | G7 |'), [4, 4], 2, true, played),
    ).toEqual(['Cm', 'Gsus4']);
    // A sus voicing resolving halfway, as Hip Hop's sus2/sus4 triads do.
    const resolving = [
      ...[60, 62, 67].map((midi) => ({ tick: 0, midi, duration: 900 })),
      ...[60, 63, 67].map((midi) => ({ tick: 960, midi, duration: 900 })),
      ...[60, 62, 67].map((midi) => ({ tick: 1920, midi, duration: 900 })),
      ...[59, 62, 67].map((midi) => ({ tick: 2880, midi, duration: 900 })),
    ];
    expect(
      takeChordSymbols(bars('| Cm | G7 |'), [4, 4], 2, true, resolving),
    ).toEqual(['Csus2 Cm', 'Gsus4 G7']);
    // A held Cm under a passing D is still Cm.
    const held = [
      ...[60, 63, 67].map((midi) => ({ tick: 0, midi, duration: 1900 })),
      { tick: 480, midi: 74, duration: 240 },
    ];
    expect(takeChordSymbols(bars('| Cm |'), [4, 4], 1, true, held)).toEqual([
      'Cm',
    ]);
    // Without what it plays, the chart's own.
    expect(takeChordSymbols(bars('| Cm | G7 |'), [4, 4], 2)).toEqual([
      'Cm',
      'G7',
    ]);
  });
});
