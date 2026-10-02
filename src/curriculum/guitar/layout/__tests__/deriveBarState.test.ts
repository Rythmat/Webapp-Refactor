import { describe, expect, it } from 'vitest';
import { deriveBarState, type BarStateInput } from '../deriveBarState';
import type { BarState, RunState } from '../types';

const RUN_STATES: RunState[] = [
  'preview',
  'practice',
  'performance',
  'complete',
];

function state(input: Partial<BarStateInput>): BarState {
  return deriveBarState({
    state: 'preview',
    restartingPass: false,
    hasResult: false,
    hasOffer: false,
    ...input,
  });
}

describe('deriveBarState', () => {
  it.each([
    // [run state, restartingPass, result, offer] → bar
    ['preview', false, false, false, 'preview'],
    ['practice', false, false, false, 'practice'],
    ['preview', true, false, false, 'practice'],
    ['performance', false, false, false, 'performance'],
    ['complete', false, true, false, 'result'],
    ['complete', false, true, true, 'sectionComplete'],
    ['complete', false, false, true, 'sectionComplete'],
    ['preview', false, false, true, 'sectionComplete'],
    ['complete', false, false, false, 'preview'],
  ] as const)(
    '%s, restarting %s, result %s, offer %s → %s',
    (run, restartingPass, hasResult, hasOffer, expected) => {
      expect(
        deriveBarState({ state: run, restartingPass, hasResult, hasOffer }),
      ).toBe(expected);
    },
  );

  it('the section-complete offer wins over everything', () => {
    for (const run of RUN_STATES) {
      for (const restartingPass of [false, true]) {
        for (const hasResult of [false, true]) {
          expect(
            state({ state: run, restartingPass, hasResult, hasOffer: true }),
          ).toBe('sectionComplete');
        }
      }
    }
  });

  it('a result wins over a take, practice and the preview', () => {
    for (const run of RUN_STATES) {
      for (const restartingPass of [false, true]) {
        expect(state({ state: run, restartingPass, hasResult: true })).toBe(
          'result',
        );
      }
    }
  });

  it('a take wins over a practice pass restarting', () => {
    expect(state({ state: 'performance', restartingPass: true })).toBe(
      'performance',
    );
  });

  it('a practice loop between passes stays practice, not preview', () => {
    expect(state({ state: 'preview', restartingPass: true })).toBe('practice');
  });
});
