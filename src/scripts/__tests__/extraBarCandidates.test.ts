import { describe, expect, it } from 'vitest';
import type { ChordBar, SongSection } from '@/curriculum/types/songLibrary';
import { classifySection, labelFamily } from '@/scripts/extraBarCandidates';

/**
 * The classifier, on sections small enough to read. The corpus run lives in
 * `extraBarCandidates.run.test.ts`; nothing here touches a song file.
 */

const bar = (...names: string[]): ChordBar => ({
  chords: names.map((chordName, i) => ({
    degree: '1 maj',
    chordName,
    beat: 1 + i * 2,
    duration: names.length === 1 ? 4 : 2,
  })),
});

const song = { id: 'x', title: 'X' };
const section = (bars: ChordBar[]): SongSection => ({
  id: 's',
  label: 'Verse',
  bars,
});
const classify = (bars: ChordBar[]) => classifySection(song, section(bars));

describe('4k+1 sections and the extra bar', () => {
  it('looks only at sections written 4k+1 bars long, k at least one', () => {
    expect(classify([bar('C'), bar('F'), bar('G'), bar('C')])).toBeNull();
    // 6 bars is an odd length but not one bar past a phrase, and a lone bar is
    // not a phrase at all.
    expect(classify(Array.from({ length: 6 }, () => bar('C')))).toBeNull();
    expect(classify([bar('C')])).toBeNull();
    expect(classify(Array.from({ length: 9 }, () => bar('C')))).not.toBeNull();
  });

  it('reads a repeated last bar as a duplicate of the bar before it', () => {
    const row = classify([bar('C'), bar('F'), bar('G'), bar('C'), bar('C')])!;
    expect([row.cls, row.bar, row.neighbour, row.choices, row.tier]).toEqual([
      'duplicate of the bar before it',
      5,
      4,
      1,
      1,
    ]);
  });

  it('reads a repeated first bar as a duplicate of the bar after it', () => {
    const row = classify([bar('C'), bar('C'), bar('F'), bar('G'), bar('A')])!;
    expect([row.cls, row.bar, row.neighbour, row.position, row.tier]).toEqual([
      'duplicate of the bar after it',
      1,
      2,
      'head',
      2,
    ]);
  });

  it('tells two bars apart on beats and durations, not just chord names', () => {
    // Bar 5 is two beats of C and two of G; bar 4 is a whole bar of C. Same
    // letters in the section, different bars.
    const split: ChordBar = bar('C', 'G');
    const row = classify([bar('F'), bar('G'), bar('A'), bar('C'), split])!;
    expect(row.cls).toBe('distinct');
  });

  it('counts a run of three identical bars as one choice, not three', () => {
    const row = classify([bar('C'), bar('C'), bar('C'), bar('F'), bar('G')])!;
    expect([row.run, row.choices, row.tier]).toEqual([3, 1, 2]);
  });

  it('finds an empty bar', () => {
    const row = classify([
      bar('C'),
      bar('F'),
      { chords: [] },
      bar('G'),
      bar('A'),
    ])!;
    expect([row.cls, row.bar, row.neighbour, row.position, row.tier]).toEqual([
      'empty',
      3,
      2,
      'inside',
      4,
    ]);
  });

  it('counts three empty bars in a row as one choice', () => {
    // Jack & Diane's choruses and I Wish's bridge both end this way: deleting
    // any of the empty bars leaves the same section, so it is one question.
    const row = classify([
      bar('C'),
      bar('F'),
      { chords: [] },
      { chords: [] },
      { chords: [] },
    ])!;
    expect([row.cls, row.bar, row.run, row.choices, row.tier]).toEqual([
      'empty',
      5,
      3,
      1,
      4,
    ]);
  });

  it('calls a section with two readings ambiguous', () => {
    const row = classify([bar('C'), bar('C'), bar('F'), bar('G'), bar('G')])!;
    expect([row.choices, row.position, row.tier]).toEqual([2, 'end', 5]);
  });

  it('leaves a section with distinct bars alone', () => {
    const row = classify([bar('C'), bar('F'), bar('G'), bar('A'), bar('D')])!;
    expect([row.cls, row.bar, row.tier]).toEqual(['distinct', 0, 6]);
  });

  it('never nominates a bar carrying a roadmap mark', () => {
    // Two bars of C, the second closing a repeat. Deleting it would delete the
    // barline, so the pair is not a run at all — but the pair is still there,
    // so the section is reported as held back rather than as a five-bar phrase.
    const marked: ChordBar = { ...bar('C'), repeatEnd: true };
    const row = classify([bar('F'), bar('G'), bar('A'), bar('C'), marked])!;
    expect([row.cls, row.bar, row.blockedAt]).toEqual(['distinct', 0, 5]);
  });

  it('does not call a genuinely distinct section held back', () => {
    const marked: ChordBar = { ...bar('D'), repeatEnd: true };
    const row = classify([bar('F'), bar('G'), bar('A'), bar('C'), marked])!;
    expect([row.cls, row.blockedAt]).toEqual(['distinct', 0]);
  });

  it('does not count a section a multi-bar rest already squares', () => {
    const row = classify([
      { chords: [], restBars: 4 },
      bar('C'),
      bar('F'),
      bar('G'),
      bar('C'),
    ])!;
    // Written 5 bars, played 8.
    expect([row.cls, row.bar, row.tier]).toEqual([
      'no extra bar to find',
      0,
      7,
    ]);
  });

  it('strips a trailing number to get a section name family', () => {
    expect(labelFamily('Verse 12')).toBe('Verse');
    expect(labelFamily('Pre-Chorus')).toBe('Pre-Chorus');
  });
});
