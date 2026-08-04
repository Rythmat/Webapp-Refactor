import { describe, expect, it } from 'vitest';
import { duplicateDayIds } from './dedupeDays';

describe('duplicateDayIds', () => {
  it('flags a later Day with the same date + label as a duplicate', () => {
    const dupes = duplicateDayIds([
      { id: 'a', scheduledDate: '2025-09-03', label: 'Day 1' },
      { id: 'b', scheduledDate: '2025-09-03', label: 'Day 1' }, // dup of a
      { id: 'c', scheduledDate: '2025-09-03', label: 'Day 2' }, // different label
    ]);
    expect(dupes.has('a')).toBe(false);
    expect(dupes.has('b')).toBe(true);
    expect(dupes.has('c')).toBe(false);
    expect(dupes.size).toBe(1);
  });

  it('keeps the first occurrence per (date, label) and flags the rest', () => {
    const dupes = duplicateDayIds([
      { id: 'first', scheduledDate: '2025-10-06', label: 'Blues' },
      { id: 'second', scheduledDate: '2025-10-06', label: 'Blues' },
      { id: 'third', scheduledDate: '2025-10-06', label: 'Blues' },
    ]);
    expect([...dupes]).toEqual(['second', 'third']);
  });

  it('does not flag the same label on different dates', () => {
    const dupes = duplicateDayIds([
      { id: 'a', scheduledDate: '2025-09-03', label: 'Day 1' },
      { id: 'b', scheduledDate: '2025-09-04', label: 'Day 1' },
    ]);
    expect(dupes.size).toBe(0);
  });

  it('ignores unscheduled Days (no scheduledDate)', () => {
    const dupes = duplicateDayIds([
      { id: 'a', scheduledDate: null, label: 'Day 1' },
      { id: 'b', scheduledDate: undefined, label: 'Day 1' },
      { id: 'c', label: 'Day 1' },
    ]);
    expect(dupes.size).toBe(0);
  });

  it('returns an empty set for no entries', () => {
    expect(duplicateDayIds([]).size).toBe(0);
  });
});
