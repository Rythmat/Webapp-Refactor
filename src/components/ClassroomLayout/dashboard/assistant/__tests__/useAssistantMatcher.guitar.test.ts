// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const flag = vi.hoisted(() => ({ on: true }));
vi.mock('@/features/learn/useInstrumentStore', () => ({
  isGuitarLearnEnabled: () => flag.on,
}));

const { useAssistantMatcher } = await import('../useAssistantMatcher');

describe('assistant: guitar', () => {
  it('offers guitar Ionian (Major) in Theory while the rollout flag is on, and not after', () => {
    flag.on = true;
    const { result } = renderHook(() => useAssistantMatcher());
    const guitar = () =>
      result.current
        .match('guitar chords')
        .map((r) => r.entry)
        .find((e) => e.label === 'Guitar: Ionian (Major)');
    expect(guitar()).toMatchObject({
      description: 'Theory · The Guitar Atlas',
      route: '/learn/guitar/ionian',
    });
    flag.on = false;
    expect(guitar()).toBeUndefined();
  });

  it('no longer offers the old Technique lessons', () => {
    flag.on = true;
    const { result } = renderHook(() => useAssistantMatcher());
    const labels = result.current
      .match('guitar atlas tab')
      .map((r) => r.entry.label);
    expect(labels).toContain('Guitar: Ionian (Major)');
    expect(labels).not.toContain('Guitar: Applied Theory Fundamentals');
  });

  it('offers the other guitar Theory tiles by name', () => {
    flag.on = true;
    const { result } = renderHook(() => useAssistantMatcher());
    const routes = result.current
      .match('guitar dorian')
      .map((r) => r.entry.route);
    expect(routes).toContain('/learn/guitar/dorian');
  });
});
