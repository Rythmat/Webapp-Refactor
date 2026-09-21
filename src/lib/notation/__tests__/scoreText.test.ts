import { describe, expect, it } from 'vitest';
import {
  MARK_STYLES,
  isGlyphMark,
  markLabel,
  marksAt,
  marksBarEnd,
  withMark,
  withMarkText,
  withoutMark,
  type ScoreMarkKind,
  type ScoreTextMark,
} from '@/daw/components/Score/scoreText';

const KINDS: ScoreMarkKind[] = [
  'text',
  'segno',
  'coda',
  'dc',
  'ds',
  'dcAlCoda',
  'dsAlCoda',
];

describe('how each mark is written', () => {
  it('has a style for every kind', () => {
    for (const kind of KINDS) expect(MARK_STYLES[kind].name).toBeTruthy();
  });

  it('draws the segno and the coda from the music font', () => {
    expect(MARK_STYLES.segno.glyph?.codePointAt(0)).toBe(0xe047);
    expect(MARK_STYLES.coda.glyph?.codePointAt(0)).toBe(0xe048);
    expect(isGlyphMark('segno')).toBe(true);
    expect(isGlyphMark('coda')).toBe(true);
  });

  it('writes the jumps as words, not glyphs', () => {
    expect(MARK_STYLES.dc.words).toBe('D.C.');
    expect(MARK_STYLES.ds.words).toBe('D.S.');
    expect(MARK_STYLES.dcAlCoda.words).toBe('D.C. al Coda');
    expect(MARK_STYLES.dsAlCoda.words).toBe('D.S. al Coda');
    for (const kind of ['dc', 'ds', 'dcAlCoda', 'dsAlCoda'] as const) {
      expect(isGlyphMark(kind)).toBe(false);
    }
  });

  it('reads a free text mark as whatever was typed', () => {
    const mark: ScoreTextMark = {
      id: 'a',
      measureIdx: 0,
      kind: 'text',
      text: 'poco rit.',
    };
    expect(markLabel(mark)).toBe('poco rit.');
  });

  it('puts a jump at the end of its bar and everything else at the start', () => {
    expect(marksBarEnd('dsAlCoda')).toBe(true);
    expect(marksBarEnd('dc')).toBe(true);
    expect(marksBarEnd('segno')).toBe(false);
    expect(marksBarEnd('text')).toBe(false);
  });
});

describe('writing marks onto bars', () => {
  it('adds a sign to a bar', () => {
    const marks = withMark([], 4, 'segno');
    expect(marks).toHaveLength(1);
    expect(marks[0]).toMatchObject({ measureIdx: 4, kind: 'segno' });
  });

  it('takes the same sign off when it is written again', () => {
    const on = withMark([], 4, 'coda');
    expect(withMark(on, 4, 'coda')).toEqual([]);
  });

  it('keeps the same sign on a different bar', () => {
    const marks = withMark(withMark([], 4, 'segno'), 9, 'segno');
    expect(marks.map((m) => m.measureIdx)).toEqual([4, 9]);
  });

  it('lets several text marks share a bar', () => {
    const marks = withMark(
      withMark([], 2, 'text', 'rit.'),
      2,
      'text',
      'a tempo',
    );
    expect(marks).toHaveLength(2);
  });

  it('gives every mark its own id', () => {
    const marks = withMark(withMark([], 2, 'text', 'one'), 2, 'text', 'two');
    expect(new Set(marks.map((m) => m.id)).size).toBe(2);
  });

  it('removes one mark by id', () => {
    const marks = withMark([], 1, 'segno');
    expect(withoutMark(marks, marks[0].id)).toEqual([]);
  });

  it('rewrites a text mark', () => {
    const marks = withMark([], 1, 'text', 'rit.');
    const next = withMarkText(marks, marks[0].id, 'accel.');
    expect(next[0].text).toBe('accel.');
  });

  it('removes a text mark that is emptied', () => {
    const marks = withMark([], 1, 'text', 'rit.');
    expect(withMarkText(marks, marks[0].id, '   ')).toEqual([]);
  });

  it('lists what stands over one bar', () => {
    const marks = withMark(withMark([], 1, 'segno'), 5, 'coda');
    expect(marksAt(marks, 1).map((m) => m.kind)).toEqual(['segno']);
    expect(marksAt(marks, 7)).toEqual([]);
  });
});
