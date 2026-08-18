import { describe, expect, it } from 'vitest';
import { keyLabelToUrlParam, urlParamToSemitone } from '../musicKeyUrl';

describe('practice track key round-trip', () => {
  // Regression test: the Practice Track hand-off writes `practiceRoot` via
  // `keyLabelToUrlParam` (a letter, e.g. "d", "dsharp") and DawApp used to
  // decode it with `Number(...)`, which is NaN for a letter param and always
  // fell back to C. `urlParamToSemitone` must decode every key label back to
  // its correct semitone offset, not just 0.
  const cases: [string, number][] = [
    ['C', 0],
    ['D♭', 1],
    ['D', 2],
    ['E♭', 3],
    ['E', 4],
    ['F', 5],
    ['F♯', 6],
    ['G', 7],
    ['A♭', 8],
    ['A', 9],
    ['B♭', 10],
    ['B', 11],
  ];

  it.each(cases)(
    'round-trips %s through the URL param to semitone %i',
    (label, semitone) => {
      const urlParam = keyLabelToUrlParam(label);
      expect(urlParamToSemitone(urlParam)).toBe(semitone);
    },
  );
});
