import { describe, expect, it } from 'vitest';
import { CONTENT_KINDS, KIND_ORDER } from '../../kinds';
import { kindLabel } from '../kindLabels';

describe('the kind names Publishing shows', () => {
  it('match the kind specs for every kind that has one', () => {
    for (const kind of KIND_ORDER) {
      expect(kindLabel(kind), kind).toBe(CONTENT_KINDS[kind].label);
    }
  });
});
