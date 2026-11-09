import { describe, expect, it } from 'vitest';
import type { Interaction } from '@/features/classroom/types';
import { describeResponse } from '../describeResponse';

describe('describeResponse', () => {
  const choice = {
    choice: { options: [{ en: 'Swing' }, { en: 'Straight' }], multi: true },
  } as unknown as Interaction;

  it('names the choices picked', () => {
    expect(describeResponse({ kind: 'choice', choices: [1, 0] }, choice)).toBe(
      'Straight, Swing',
    );
    expect(describeResponse({ kind: 'choice', choices: [3] }, choice)).toBe(
      'Option 4',
    );
  });

  it('says the rest plainly', () => {
    expect(describeResponse({ kind: 'text', text: '  ' })).toBe('(left blank)');
    expect(describeResponse({ kind: 'number', value: 120 })).toBe('120');
    expect(describeResponse({ kind: 'draw', strokes: [{}] })).toBe(
      'A drawing (1 stroke)',
    );
    expect(
      describeResponse({
        kind: 'echo',
        slideId: 's',
        rounds: [{ passed: true }, { passed: false }] as never,
        bestStreak: 1,
      }),
    ).toBe('1 of 2 echoes good · best streak 1');
  });
});
