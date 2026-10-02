import { describe, expect, it } from 'vitest';
import { changedPaths, rebaseDraft, sameValue } from '../rebase';

/**
 * A draft laid onto a newer version of its item: every field the draft
 * changed goes over theirs, everything else is theirs, and a field both
 * changed differently is an overlap, laid on only when the author says so.
 */

const BASE = {
  id: 'evt-motown-detroit-1966',
  title: 'Motown',
  session: { studioId: 'hitsville' },
  tags: ['motown'],
};

describe('rebasing a draft', () => {
  it('keeps what the other version changed, under the draft’s own changes', () => {
    const mine = { ...BASE, songIds: [] };
    const theirs = { ...BASE, placeId: 'detroit' };
    expect(rebaseDraft(BASE, mine, theirs)).toEqual({
      body: { ...BASE, placeId: 'detroit', songIds: [] },
      theirs: ['placeId'],
      overlap: [],
    });
  });

  it('goes down through objects: two fields of one object are two paths', () => {
    const mine = {
      ...BASE,
      session: { studioId: 'hitsville', labelId: 'tamla' },
    };
    const theirs = { ...BASE, session: { studioId: 'studio-a' } };
    expect(rebaseDraft(BASE, mine, theirs)).toEqual({
      body: { ...BASE, session: { studioId: 'studio-a', labelId: 'tamla' } },
      theirs: ['session.studioId'],
      overlap: [],
    });
  });

  it('takes a list whole: a list both changed is an overlap', () => {
    const mine = { ...BASE, tags: ['motown', 'soul'] };
    const theirs = { ...BASE, tags: ['motown', 'detroit'] };
    const held = rebaseDraft(BASE, mine, theirs);
    expect(held.overlap).toEqual(['tags']);
    // Theirs stands until the author says otherwise.
    expect(held.body.tags).toEqual(['motown', 'detroit']);
    expect(
      rebaseDraft(BASE, mine, theirs, { mineWins: true }).body.tags,
    ).toEqual(['motown', 'soul']);
  });

  it('is no overlap when both made the same change', () => {
    const mine = { ...BASE, placeId: 'detroit' };
    expect(rebaseDraft(BASE, mine, { ...mine }).overlap).toEqual([]);
  });

  it('removes what the draft removed, and merges two new objects field by field', () => {
    const base = { id: 'a', year: 1981 };
    const mine = { id: 'a', session: { labelId: 'tamla' } };
    const theirs = { id: 'a', year: 1981, session: { studioId: 'hitsville' } };
    expect(rebaseDraft(base, mine, theirs)).toEqual({
      body: { id: 'a', session: { studioId: 'hitsville', labelId: 'tamla' } },
      theirs: ['session'],
      overlap: [],
    });
  });

  it('compares values by content, not key order', () => {
    expect(
      sameValue({ a: 1, b: [{ x: 1, y: 2 }] }, { b: [{ y: 2, x: 1 }], a: 1 }),
    ).toBe(true);
    expect(changedPaths({ a: { b: 1, c: 2 } }, { a: { c: 2, b: 3 } })).toEqual([
      ['a', 'b'],
    ]);
  });
});
