import { describe, expect, it } from 'vitest';
import { CHORDS, abbreviateSequence } from '@prism/engine';
import { formatQuality } from '@/daw/components/Library/insightConstants';
import { formatChord } from '@/lib/chordNotation';
import { displayChordLabel } from './displayChordLabel';

/** A lower-case b standing for a flat, or a # for a sharp. */
const ASCII_ACCIDENTAL = /b(?=\d)|[A-G]b(?![a-z])|#/;

describe('the guard itself', () => {
  it('catches what the chord lane used to show', () => {
    for (const bad of ['A min7b5', 'F susb2/A♭', 'Bb maj', 'G dom7(#9)']) {
      expect(ASCII_ACCIDENTAL.test(bad)).toBe(true);
    }
    for (const good of [
      'A min7(♭5)',
      'F sus(♭2)/A♭',
      'B♭ maj',
      'G7(♯9)',
      'C dim',
    ]) {
      expect(ASCII_ACCIDENTAL.test(good)).toBe(false);
    }
  });
});

describe('displayChordLabel', () => {
  it('writes the quality as hybrid does, with real signs', () => {
    // From the chord lane: "A min7b5" and "F susb2/A♭" read with a b.
    expect(displayChordLabel('A min7b5')).toBe('A min7(♭5)');
    expect(displayChordLabel('F susb2/Ab')).toBe('F sus(♭2)/A♭');
    expect(displayChordLabel('Ab dom13')).toBe('A♭ dom13');
    expect(displayChordLabel('G dom7#9')).toBe('G dom7(♯9)');
  });

  it('reads every dialect a region label comes in', () => {
    expect(displayChordLabel('b3 maj')).toBe('♭3 maj');
    expect(displayChordLabel('#4 min7b5')).toBe('♯4 min7(♭5)');
    expect(displayChordLabel('Dminor7')).toBe('D min7');
    expect(displayChordLabel('Bbm7b5')).toBe('B♭ min7(♭5)');
    expect(displayChordLabel('2 maj/1')).toBe('2 maj/1');
    expect(displayChordLabel('Bb/D')).toBe('B♭/D');
    expect(displayChordLabel('C')).toBe('C');
  });

  it('gives a label it cannot read real signs and nothing else', () => {
    expect(displayChordLabel('N.C.')).toBe('N.C.');
    expect(displayChordLabel('Afunk9')).toBe('A funk9');
  });
});

describe('no lower-case b or # for an accidental, anywhere chords are written', () => {
  const qualities = Object.keys(CHORDS).filter((q) => !q.includes('/'));

  it('in every quality hybrid writes', () => {
    const offenders = qualities
      .map((q) => [q, formatQuality(q)] as const)
      .filter(([, text]) => ASCII_ACCIDENTAL.test(text));
    expect(offenders).toEqual([]);
  });

  it('in every chord the formatter writes, in every notation', () => {
    const offenders: string[] = [];
    for (const quality of qualities) {
      for (const notation of ['hybrid', 'jazz', 'roman'] as const) {
        const text = formatChord({ root: 'Bb', quality }, notation, {
          keyRootPc: 3,
          mode: 'ionian',
        });
        if (ASCII_ACCIDENTAL.test(text)) offenders.push(`${quality}: ${text}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('in every label the chord lane makes, as the Studio shows it', () => {
    const offenders = qualities
      .flatMap((q) => [
        abbreviateSequence(`Eb ${q}`),
        abbreviateSequence(`b6 ${q}`),
      ])
      .map(displayChordLabel)
      .filter((text) => ASCII_ACCIDENTAL.test(text));
    expect(offenders).toEqual([]);
  });
});
