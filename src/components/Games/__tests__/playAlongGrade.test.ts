import { describe, expect, it } from 'vitest';
import { gradePlayAlong } from '../playAlongGrade';

const eight = Array.from({ length: 8 }, (_, i) => ({ id: `n${i}` }));
const played = (...ids: string[]) =>
  Object.fromEntries(ids.map((id) => [id, { startTick: 0 }]));

describe('gradePlayAlong', () => {
  it('fails an empty performance', () => {
    expect(gradePlayAlong(eight, {})).toEqual({
      hits: 0,
      total: 8,
      required: 7,
      wrongNotes: 0,
      passed: false,
    });
  });

  it('needs 80% of the notes, rounded up', () => {
    const six = played('n0', 'n1', 'n2', 'n3', 'n4', 'n5');
    expect(gradePlayAlong(eight, six).passed).toBe(false);
    const seven = played('n0', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6');
    expect(gradePlayAlong(eight, seven).passed).toBe(true);
  });

  it('counts only notes pressed in their window', () => {
    // A released-but-never-struck record (startTick null) is not a hit.
    const result = gradePlayAlong(eight, {
      ...played('n0'),
      n1: { startTick: null },
    });
    expect(result.hits).toBe(1);
  });

  it('reports wrong notes without scoring them', () => {
    const all = played('n0', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7');
    expect(gradePlayAlong(eight, all, 12)).toMatchObject({
      wrongNotes: 12,
      passed: true,
    });
  });

  it('never passes an activity with no notes', () => {
    expect(gradePlayAlong([], {}).passed).toBe(false);
  });
});
