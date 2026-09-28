import { describe, expect, it } from 'vitest';
import { theoryString } from '@/curriculum/data/guitar/theoryNotes';
import {
  diagnoseChord,
  type ChordDiagnosis,
  type DiagnosticTarget,
} from '../diagnostics';

/** A getLastChroma()-style frame: the listed pitch classes at their levels. */
function chroma(levels: Record<number, number>): Float64Array {
  const c = new Float64Array(12);
  for (const [pc, level] of Object.entries(levels)) c[Number(pc)] = level;
  return c;
}

const CMAJ7: DiagnosticTarget = {
  rootName: 'C',
  quality: 'maj7',
  frets: 'X-3-5-4-5-X',
};
const AM7_DROP3: DiagnosticTarget = {
  rootName: 'A',
  quality: 'min7',
  frets: '5-X-5-5-5-X',
};
const C_OPEN: DiagnosticTarget = {
  rootName: 'C',
  quality: 'maj',
  frets: 'X-3-2-0-1-0',
};

/** The hint as the student reads it. */
function hint(d: ChordDiagnosis): string | null {
  if (!d.hintId) return null;
  const text = theoryString(d.hintId, d.tokens);
  expect(text).not.toContain('{');
  return text;
}

describe('chord-tone diagnostics', () => {
  it('D1: pitch-class twins are hits', () => {
    const am7 = diagnoseChord({
      target: { rootName: 'A', quality: 'min7', frets: 'X-12-14-12-13-X' },
      label: { rootPc: 0, quality: 'major6' }, // C6
    });
    expect(am7).toMatchObject({ rule: 'D1', status: 'hit', hintId: null });
    const bm7b5 = diagnoseChord({
      target: { rootName: 'B', quality: 'min7b5', frets: 'X-14-15-14-15-X' },
      label: { rootPc: 2, quality: 'minor6' }, // Dm6
    });
    expect(bm7b5).toMatchObject({ rule: 'D1', status: 'hit' });
  });

  it('D2: a 7th heard as its triad asks the chroma about the 7th', () => {
    const label = { rootPc: 0, quality: 'major' };
    const withB = diagnoseChord({
      target: CMAJ7,
      label,
      chroma: chroma({ 0: 0.5, 4: 0.5, 7: 0.5, 11: 0.4 }),
    });
    expect(withB).toMatchObject({ rule: 'D2', status: 'hit', hintId: null });

    const withoutB = diagnoseChord({
      target: CMAJ7,
      label,
      chroma: chroma({ 0: 0.6, 4: 0.5, 7: 0.6, 11: 0.05 }),
    });
    expect(withoutB).toMatchObject({
      rule: 'D2',
      status: 'wrong',
      hintId: 'det.missing7',
      ringStrings: [3],
    });
    expect(hint(withoutB)).toBe(
      'We heard the chord, but not the 7 (B). It is on string 3 in this shape.',
    );

    // Never blame the 7th on the label alone.
    expect(diagnoseChord({ target: CMAJ7, label }).status).toBe('unclear');
    expect(
      diagnoseChord({ target: CMAJ7, label, chroma: chroma({ 2: 1 }) }).status,
    ).toBe('unclear');
  });

  it('D3: the rest of the chord without its root is unclear', () => {
    const em = diagnoseChord({
      target: CMAJ7,
      label: { rootPc: 4, quality: 'minor' },
    });
    expect(em).toMatchObject({
      rule: 'D3',
      status: 'unclear',
      hintId: 'det.missingRoot',
      tokens: { string: 5 },
      ringStrings: [5],
    });
    const am7 = diagnoseChord({
      target: AM7_DROP3,
      label: { rootPc: 0, quality: 'major' },
    });
    expect(am7).toMatchObject({ rule: 'D3', tokens: { string: 6 } });
    expect(hint(am7)).toContain('let string 6 ring');

    // A triad: E minor for C major is rootless while its B is weak …
    const target = C_OPEN;
    const label = { rootPc: 4, quality: 'minor' };
    const weakB = chroma({ 0: 0.1, 4: 0.6, 7: 0.6, 11: 0.05 });
    expect(diagnoseChord({ target, label, chroma: weakB }).rule).toBe('D3');
    // … and simply wrong when the B rang.
    const strongB = chroma({ 4: 0.6, 7: 0.6, 11: 0.5 });
    expect(diagnoseChord({ target, label, chroma: strongB })).toMatchObject({
      rule: 'D6',
      status: 'wrong',
    });
  });

  it('D4: no third means the quality is unclear', () => {
    const power = diagnoseChord({
      target: C_OPEN,
      label: { rootPc: 0, quality: '5' },
    });
    expect(power).toMatchObject({
      rule: 'D4',
      status: 'unclear',
      hintId: 'det.unclearQuality',
      tokens: { string: 4 },
      ringStrings: [4, 1],
    });
    const heardRootAndFifth = diagnoseChord({
      target: C_OPEN,
      label: { rootPc: 0, quality: 'sus4' },
      chroma: chroma({ 0: 0.7, 7: 0.6, 5: 0.3 }),
    });
    expect(heardRootAndFifth).toMatchObject({
      rule: 'D4',
      hintId: 'det.missing3',
    });

    // Heard as C minor, but the chroma holds neither third: unclear.
    const label = { rootPc: 0, quality: 'minor' };
    const noThird = diagnoseChord({
      target: C_OPEN,
      label,
      chroma: chroma({ 0: 0.7, 7: 0.6, 3: 0.05, 4: 0.05 }),
    });
    expect(noThird).toMatchObject({
      rule: 'D4',
      status: 'unclear',
      hintId: 'det.missing3',
      ringStrings: [4, 1],
    });
    // A clear ♭3 means minor was played: wrong, naming the 3 on both strings.
    const minor = diagnoseChord({
      target: C_OPEN,
      label,
      chroma: chroma({ 0: 0.6, 7: 0.6, 3: 0.5, 4: 0.02 }),
    });
    expect(minor).toMatchObject({
      rule: 'D6',
      status: 'wrong',
      hintId: 'det.missingToneDoubled',
      tokens: { tone: '3', note: 'E' },
      ringStrings: [4, 1],
    });
  });

  it('D5: an open X string names the string and keeps the status', () => {
    const g7 = diagnoseChord({
      target: { rootName: 'G', quality: 'dom7', frets: '3-X-3-4-3-X' },
      label: { rootPc: 7, quality: 'dominant9' }, // G7 + open A
    });
    expect(g7).toMatchObject({
      rule: 'D5',
      status: null,
      hintId: 'det.muteX',
      tokens: { string: 5 },
      ringStrings: [5],
    });
    expect(hint(g7)).toBe(
      'We also heard open string 5. Mute it, or skip it when you strum.',
    );
    // Open E under Dm7: both E strings are X, so both markers ring.
    const dm7 = diagnoseChord({
      target: { rootName: 'D', quality: 'min7', frets: 'X-5-7-5-6-X' },
      label: { rootPc: 4, quality: 'minor7' },
    });
    expect(dm7).toMatchObject({ rule: 'D5', ringStrings: [6, 1] });

    // The label need not name the open string: the chroma can show it.
    const target: DiagnosticTarget = {
      rootName: 'G',
      quality: 'dom7',
      frets: '3-X-3-4-3-X',
    };
    const bMinor = { rootPc: 11, quality: 'minor' };
    expect(
      diagnoseChord({
        target,
        label: bMinor,
        chroma: chroma({ 7: 0.6, 11: 0.6, 2: 0.6, 5: 0.5, 9: 0.4 }),
      }),
    ).toMatchObject({ rule: 'D5', status: null, ringStrings: [5] });
    expect(diagnoseChord({ target, label: bMinor }).rule).toBe('D6');
  });

  it('D6: names the most telling missing tone', () => {
    // C major heard as F major: the 3 (E) outranks the 5 (G).
    const barre = diagnoseChord({
      target: { rootName: 'C', quality: 'maj', frets: 'X-3-5-5-5-X' },
      label: { rootPc: 5, quality: 'major' },
    });
    // E is on one string of this shape, so the hint names it.
    expect(barre).toMatchObject({
      rule: 'D6',
      status: 'wrong',
      hintId: 'det.missingToneOneString',
      tokens: { tone: '3', note: 'E', string: 2 },
      ringStrings: [2],
    });
    // Open E heard as C# minor: the missing 5 (B) is on two strings.
    const openE = diagnoseChord({
      target: { rootName: 'E', quality: 'maj', frets: '0-2-2-1-0-0' },
      label: { rootPc: 1, quality: 'minor' },
    });
    expect(openE).toMatchObject({
      hintId: 'det.missingToneDoubled',
      tokens: { tone: '5', note: 'B' },
    });
    expect([...openE.ringStrings].sort()).toEqual([2, 5]);
    // Cmaj7 heard as A minor: the 7 (B) outranks the 5; one string each.
    const seventh = diagnoseChord({
      target: CMAJ7,
      label: { rootPc: 9, quality: 'minor' },
    });
    expect(seventh).toMatchObject({
      hintId: 'det.missingToneOneString',
      tokens: { tone: '7', note: 'B', string: 3 },
      ringStrings: [3],
    });
    expect(hint(seventh)).toBe(
      'Missing the 7 (B). In this shape it is on string 3. Check that nothing is touching that string.',
    );
  });

  it('spells hint notes in the key: E# in F#', () => {
    const missing7 = diagnoseChord({
      target: { rootName: 'F#', quality: 'maj7', frets: '2-X-3-3-2-X' },
      label: { rootPc: 6, quality: 'major' },
      chroma: chroma({ 6: 0.6, 10: 0.5, 1: 0.5, 5: 0.02 }),
    });
    expect(missing7).toMatchObject({
      hintId: 'det.missing7',
      tokens: { note: 'E#', string: 4 },
    });
    const missing3 = diagnoseChord({
      target: { rootName: 'F#', quality: 'maj', frets: '2-4-4-3-X-X' },
      label: { rootPc: 2, quality: 'major' }, // D: D F# A
    });
    expect(missing3.tokens).toMatchObject({ tone: '3', note: 'A#' });
  });

  it('D7: a low note under a hit adds a hint, never a new status', () => {
    const hit = diagnoseChord({
      target: CMAJ7,
      label: { rootPc: 0, quality: 'major7' },
      bassMidi: 40,
    });
    expect(hit).toMatchObject({
      status: 'hit',
      hintId: 'det.bass',
      tokens: { string: 5 },
    });
    expect(hint(hit)).toBe(
      'Nice chord! We also heard a low note under it. Start your strum on string 5.',
    );
    const inRange = diagnoseChord({
      target: CMAJ7,
      label: { rootPc: 0, quality: 'major7' },
      bassMidi: 48,
    });
    expect(inRange).toMatchObject({ status: 'hit', hintId: null });

    for (const label of [
      { rootPc: 9, quality: 'minor' },
      { rootPc: 4, quality: 'minor' },
    ]) {
      const without = diagnoseChord({ target: CMAJ7, label });
      const withBass = diagnoseChord({ target: CMAJ7, label, bassMidi: 30 });
      expect(withBass).toEqual(without);
    }
  });

  it('keeps the evaluator status when nothing was detected', () => {
    expect(diagnoseChord({ target: CMAJ7, label: null })).toEqual({
      rule: null,
      status: null,
      hintId: null,
      tokens: {},
      ringStrings: [],
    });
  });
});
