// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const flag = vi.hoisted(() => ({ on: true }));
vi.mock('@/features/learn/useInstrumentStore', () => ({
  isGuitarLearnEnabled: () => flag.on,
}));

const { useAssistantMatcher } = await import('../useAssistantMatcher');

describe('assistant: guitar', () => {
  it('offers the guitar lessons while the rollout flag is on, and not after', () => {
    const { result } = renderHook(() => useAssistantMatcher());
    const labels = () =>
      result.current.match('guitar chords').map((r) => r.entry.label);
    expect(labels()).toContain('Guitar: Applied Theory Fundamentals');
    flag.on = false;
    expect(labels()).not.toContain('Guitar: Applied Theory Fundamentals');
  });
});
