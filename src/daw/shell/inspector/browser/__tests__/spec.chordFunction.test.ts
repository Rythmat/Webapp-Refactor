/**
 * A part's row in the library browser names what its chords do, not which
 * chords they are (milestone 2.14): "I–V–vi–IV", so a student can see that a
 * pop part and a funk vamp in another key share a shape. These tests are
 * written from the 15c contract, not from the module.
 *
 * The numerals are formatChordLabel's Roman spelling in the part's own key,
 * so every quality glyph is asserted through formatChordLabel itself rather
 * than typed here. Repeats of the same chord collapse, a sequence that only
 * repeats a shorter cycle shows the cycle once, the numerals are joined with
 * an en dash, and a part with no chord symbols has no function line.
 * The answer may be remembered by part id, so one id is one answer.
 */
import { describe, expect, it } from 'vitest';
import type { InstrumentPart, PartKey } from '@/curriculum/engine/parts/part';
import { listLiveParts } from '@/curriculum/engine/parts/registry';
import { formatChordLabel } from '@/lib/chordNotation';
import { chordFunction } from '../chordFunction';

// The part's id is in the signature so the line can be remembered per part;
// every call here is a different made-up part, so each gets its own id.
let made = 0;
const of = (key: PartKey, chordSymbols?: string[]) =>
  chordFunction({ id: `spec-part-${++made}`, key, chordSymbols });

const roman = (symbol: string, key: PartKey) =>
  formatChordLabel(symbol, 'roman', { keyRootPc: key.tonic, mode: key.mode });

const C_IONIAN: PartKey = { tonic: 0, mode: 'ionian' };
const D_DORIAN: PartKey = { tonic: 2, mode: 'dorian' };
const E_PHRYGIAN: PartKey = { tonic: 4, mode: 'phrygian' };
const C_AEOLIAN: PartKey = { tonic: 0, mode: 'aeolian' };

describe('chordFunction', () => {
  it('names the four-chord pop progression in C', () => {
    expect(of(C_IONIAN, ['C', 'G', 'Am', 'F'])).toBe('I–V–vi–IV');
  });

  it('keeps the chords’ extensions (Dm7 G9 in D dorian)', () => {
    expect(of(D_DORIAN, ['Dm7', 'G9'])).toBe('i7–IV9');
  });

  it('spells the phrygian flat two (Em F in E phrygian)', () => {
    expect(of(E_PHRYGIAN, ['Em', 'F'])).toBe('i–♭II');
  });

  it('reads the numerals in the part’s own key, not in C', () => {
    // The same pop shape in G.
    expect(of({ tonic: 7, mode: 'ionian' }, ['G', 'D', 'Em', 'C'])).toBe(
      'I–V–vi–IV',
    );
    // Am in A dorian is the tonic; in C ionian it is vi.
    expect(of({ tonic: 9, mode: 'dorian' }, ['Am'])).toBe('i');
    expect(of(C_IONIAN, ['Am'])).toBe('vi');
  });

  it('cuts a repeated cycle to one pass (Cm G Cm G → i–V)', () => {
    expect(of(C_AEOLIAN, ['Cm', 'G', 'Cm', 'G'])).toBe('i–V');
    expect(of(C_IONIAN, ['C', 'G', 'Am', 'F', 'C', 'G', 'Am', 'F'])).toBe(
      'I–V–vi–IV',
    );
    expect(of(E_PHRYGIAN, ['Em', 'F', 'Em', 'F', 'Em', 'F'])).toBe('i–♭II');
  });

  it('collapses consecutive repeats (C C G G → I–V)', () => {
    expect(of(C_IONIAN, ['C', 'C', 'G', 'G'])).toBe('I–V');
    expect(of(C_AEOLIAN, ['Cm', 'Cm', 'Cm'])).toBe('i');
  });

  it('collapses repeats before finding the cycle (C C G G C C G G → I–V)', () => {
    expect(of(C_IONIAN, ['C', 'C', 'G', 'G', 'C', 'C', 'G', 'G'])).toBe('I–V');
  });

  it('keeps a progression that does not repeat, a return to the first chord included', () => {
    expect(of(C_IONIAN, ['C', 'F', 'G', 'C'])).toBe('I–IV–V–I');
  });

  it('takes the quality spellings from formatChordLabel', () => {
    const symbols = ['Cmaj7', 'Am7', 'Dm7', 'G7'];
    expect(of(C_IONIAN, symbols)).toBe(
      symbols.map((s) => roman(s, C_IONIAN)).join('–'),
    );
    const funk = ['Cm9', 'F13', 'Ab13', 'G7alt', 'Cm9'];
    const cDorian: PartKey = { tonic: 0, mode: 'dorian' };
    expect(of(cDorian, funk)).toBe(
      funk.map((s) => roman(s, cDorian)).join('–'),
    );
  });

  it('joins with an en dash and nothing else', () => {
    const line = of(C_IONIAN, ['C', 'G', 'Am', 'F'])!;
    expect(line.split('–')).toHaveLength(4);
    expect(line).not.toMatch(/[ \-—]/);
  });

  it('gives the same answer for the same part id', () => {
    const p = { id: 'spec-same', key: C_IONIAN, chordSymbols: ['C', 'G'] };
    expect(chordFunction(p)).toBe('I–V');
    expect(chordFunction({ ...p })).toBe('I–V');
  });

  it('is null with no chord symbols', () => {
    expect(of(C_IONIAN, [])).toBeNull();
    expect(of(C_IONIAN, undefined)).toBeNull();
    expect(chordFunction({ id: 'bare', key: C_IONIAN })).toBeNull();
  });

  it('gives every live part with chords a line with no two equal neighbours', () => {
    const live = listLiveParts().filter(
      (p): p is InstrumentPart & { chordSymbols: string[] } =>
        (p.chordSymbols?.length ?? 0) > 0,
    );
    expect(live.length).toBeGreaterThan(0);
    for (const p of live) {
      const line = chordFunction(p);
      expect(line, p.id).not.toBeNull();
      const numerals = line!.split('–');
      expect(
        numerals.every((n) => n.length > 0),
        p.id,
      ).toBe(true);
      for (let i = 1; i < numerals.length; i++) {
        expect(numerals[i], `${p.id} at ${i}`).not.toBe(numerals[i - 1]);
      }
      // Every numeral is one of the part's own chords, spelled in its key.
      const spelled = new Set(p.chordSymbols.map((s) => roman(s, p.key)));
      for (const n of numerals)
        expect(spelled.has(n), `${p.id}: ${n}`).toBe(true);
      // Never longer than the chords it came from.
      expect(numerals.length).toBeLessThanOrEqual(p.chordSymbols.length);
    }
  });

  it('gives live parts with no chords no line', () => {
    for (const p of listLiveParts()) {
      if ((p.chordSymbols?.length ?? 0) === 0) {
        expect(chordFunction(p), p.id).toBeNull();
      }
    }
  });
});
