import { describe, expect, it } from 'vitest';
import { detectChordWithInversion } from '@prism/engine';
import {
  formatChord,
  formatSecondaryLabel,
  type ChordNotation,
} from '@/lib/chordNotation';
import { buildChordInsights } from './buildChordInsights';
import { getEnrichedDescription } from './insightConstants';
import {
  analyzedChordSpec,
  chordCardLabels,
  chordLabelSymbol,
  keyContext,
  letterName,
  liveChordLabels,
} from './insightNotation';

const NOTATIONS: ChordNotation[] = ['hybrid', 'jazz', 'roman'];
const C = keyContext(0, 'ionian');
// Midnight Groove, read in C: Dm9 G13 Cmaj9 Am7.
const MIDNIGHT_GROOVE = ['2 minor9', '5 dominant13', '1 major9', '6 minor7'];

describe('letterName', () => {
  it('turns displayed accidentals back into letters', () => {
    expect(letterName('B♭')).toBe('Bb');
    expect(letterName('F♯')).toBe('F#');
    expect(letterName('E\u{1D12B}')).toBe('Ebb');
    expect(letterName('C')).toBe('C');
  });
});

describe('chord cards', () => {
  const cards = buildChordInsights(MIDNIGHT_GROOVE, 0, 'ionian', new Map());
  const labels = (notation: ChordNotation) =>
    cards.map((card) => chordCardLabels(card, notation, C));

  it('keeps the hybrid number and the letter name in hybrid', () => {
    expect(labels('hybrid')).toEqual(
      cards.map((card) => ({ title: card.hybrid, detail: card.chordLabel })),
    );
    expect(labels('hybrid').map((l) => `${l.title} | ${l.detail}`)).toEqual([
      '2 min9 | D min9',
      '5 dom13 | G dom13',
      '1 maj9 | C maj9',
      '6 min7 | A min7',
    ]);
  });

  it('shows one symbol in jazz and Roman', () => {
    expect(labels('jazz')).toEqual(
      ['D−9', 'G13', 'CΔ9', 'A−7'].map((title) => ({ title, detail: null })),
    );
    expect(labels('roman').map((l) => l.title)).toEqual([
      'ii9',
      'V13',
      'IΔ9',
      'vi7',
    ]);
  });

  it('numbers from the mode tonic', () => {
    // Degree keys are relative to the parent major scale: D dorian's i is "2".
    const [card] = buildChordInsights(['2 minor7'], 2, 'dorian', new Map());
    const D = keyContext(2, 'dorian');
    expect(chordCardLabels(card, 'jazz', D).title).toBe('D−7');
    expect(chordCardLabels(card, 'roman', D).title).toBe('i7');
  });

  it('writes a secondary-dominant description in the notation', () => {
    const [card] = buildChordInsights(['2 dominant7'], 0, 'ionian', new Map());
    const secondary = {
      ...card,
      isDiatonic: false,
      modalInterchange: {
        type: 'secondary-dominant' as const,
        secondaryTarget: '5 of 5',
        confidence: 1,
      },
    };
    expect(getEnrichedDescription(secondary)).toBe(
      'Secondary dominant: 5 of 5',
    );
    expect(
      NOTATIONS.map((n) =>
        getEnrichedDescription(secondary, (t) => formatSecondaryLabel(t, n, C)),
      ),
    ).toEqual([
      'Secondary dominant: 5 of 5',
      'Secondary dominant: 5 of G',
      'Secondary dominant: V/V',
    ]);
  });
});

describe('Now Playing', () => {
  const live = (midis: number[], rootNote: number | null) => {
    const match = detectChordWithInversion(midis)!;
    return {
      rootLetter: 'D',
      quality: match.quality,
      inversion: match.inversion,
      chordLabel: 'today’s label',
      hybrid: rootNote === null ? null : 'today’s hybrid',
    };
  };

  it('keeps today’s label and hybrid number in hybrid', () => {
    expect(liveChordLabels(live([62, 65, 69, 72], 0), 'hybrid', C)).toEqual({
      title: 'today’s label',
      detail: 'today’s hybrid',
    });
  });

  it('shows one symbol, keeping the inversion text', () => {
    const rootPosition = live([62, 65, 69, 72], 0);
    expect(liveChordLabels(rootPosition, 'jazz', C)).toEqual({
      title: 'D−7',
      detail: null,
    });
    expect(liveChordLabels(rootPosition, 'roman', C).title).toBe('ii7');
    const firstInversion = live([53, 57, 62], 0); // F A D
    expect(firstInversion.inversion).toBe(1);
    expect(liveChordLabels(firstInversion, 'jazz', C).title).toBe(
      'D− (1st Inversion)',
    );
    expect(liveChordLabels(firstInversion, 'roman', C).title).toBe(
      'ii (1st Inversion)',
    );
  });

  it('writes jazz without a key; Roman falls back to the letter name', () => {
    const noKey = keyContext(null, 'ionian');
    const chord = live([62, 65, 69, 72], null);
    expect(liveChordLabels(chord, 'jazz', noKey).title).toBe('D−7');
    expect(liveChordLabels(chord, 'roman', noKey).title).toBe('D min7');
  });
});

describe('chips', () => {
  it('shows the letter label as today in hybrid', () => {
    expect(chordLabelSymbol('Bb maj7', 'hybrid', C)).toBe('B♭ maj7');
    expect(chordLabelSymbol('D min9', 'hybrid', C)).toBe('D min9');
  });

  it('writes the chord symbol in jazz and Roman', () => {
    const chips = ['D min9', 'G dom13', 'C maj9', 'A min7'];
    expect(chips.map((c) => chordLabelSymbol(c, 'jazz', C))).toEqual([
      'D−9',
      'G13',
      'CΔ9',
      'A−7',
    ]);
    expect(chips.map((c) => chordLabelSymbol(c, 'roman', C))).toEqual([
      'ii9',
      'V13',
      'IΔ9',
      'vi7',
    ]);
    expect(chordLabelSymbol('C maj7/E', 'jazz', C)).toBe('CΔ7/E');
  });

  it('leaves a label that isn’t a chord as it is', () => {
    expect(chordLabelSymbol('N.C.', 'jazz', C)).toBe('N.C.');
  });
});

describe('analyzedChordSpec', () => {
  it('spells the root and slash bass from the letter name', () => {
    const spec = analyzedChordSpec({
      rootPc: 10,
      quality: 'major',
      noteName: 'Bb maj/D',
    });
    expect(spec).toEqual({ root: 'Bb', quality: 'major', bass: 'D' });
    expect(formatChord(spec, 'jazz', keyContext(5, 'ionian'))).toBe('B♭/D');
    expect(formatChord(spec, 'roman', keyContext(5, 'ionian'))).toBe('IV/6');
  });

  it('uses the root pitch class when the name disagrees', () => {
    expect(
      analyzedChordSpec({ rootPc: 2, quality: 'minor9', noteName: 'F maj7' }),
    ).toEqual({ root: 2, quality: 'minor9' });
  });

  it('writes Midnight Groove’s harmony line', () => {
    const chords = [
      { rootPc: 2, quality: 'minor9', noteName: 'D min9' },
      { rootPc: 7, quality: 'dominant13', noteName: 'G dom13' },
      { rootPc: 0, quality: 'major9', noteName: 'C maj9' },
      { rootPc: 9, quality: 'minor7', noteName: 'A min7' },
    ];
    const line = (n: ChordNotation) =>
      chords.map((c) => formatChord(analyzedChordSpec(c), n, C)).join(' → ');
    expect(line('jazz')).toBe('D−9 → G13 → CΔ9 → A−7');
    expect(line('roman')).toBe('ii9 → V13 → IΔ9 → vi7');
  });
});
