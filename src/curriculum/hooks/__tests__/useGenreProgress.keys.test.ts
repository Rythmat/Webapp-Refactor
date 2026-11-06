// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  readGenreKeyProgress,
  readGenreSections,
  useGenreProgress,
} from '../useGenreProgress';

const passed = { passed: true, overallScore: 1, xpEarned: 10 } as never;
const failed = { passed: false, overallScore: 0.1, xpEarned: 0 } as never;
const context = (key: string, section: 'A' | 'B' = 'A', stepsTotal = 2) => ({
  section,
  key,
  styleRef: 'x',
  stepsTotal,
  skillTags: [],
});

afterEach(() => localStorage.clear());

const hook = () => renderHook(() => useGenreProgress('guitar-mode-x', 1));

describe('a step counts once', () => {
  it('doesn’t move its section on when passed again', () => {
    const { result } = hook();
    act(() => result.current.recordResult('a', passed, context('C')));
    act(() => result.current.recordResult('a', passed, context('C')));
    const { sections } = readGenreSections('guitar-mode-x', 1);
    expect(sections.A?.stepsCompleted).toBe(1);
    expect(sections.A?.completed).toBe(false);
  });

  it('nor after failing in between', () => {
    const { result } = hook();
    act(() => result.current.recordResult('a', passed, context('C')));
    act(() => result.current.recordResult('a', failed, context('C')));
    act(() => result.current.recordResult('a', passed, context('C')));
    expect(
      readGenreSections('guitar-mode-x', 1).sections.A?.stepsCompleted,
    ).toBe(1);
  });

  it('still completes a section when every step has passed', () => {
    const { result } = hook();
    act(() => result.current.recordResult('a', passed, context('C')));
    act(() => result.current.recordResult('b', passed, context('C')));
    expect(readGenreSections('guitar-mode-x', 1).sections.A?.completed).toBe(
      true,
    );
  });
});

describe('progress in one key', () => {
  it('keeps each key apart, however the lesson writes its key', () => {
    const { result } = hook();
    act(() =>
      result.current.recordResult('a', passed, context('F# Dorian', 'A', 4)),
    );
    expect(readGenreKeyProgress('guitar-mode-x', 1, 'F♯').sections.A).toEqual({
      passed: 1,
      total: 4,
    });
    expect(readGenreKeyProgress('guitar-mode-x', 1, 'C').started).toBe(false);
  });

  it('counts a step once in a key, but again in another', () => {
    const { result } = hook();
    act(() =>
      result.current.recordResult('a', passed, context('C Major (Ionian)')),
    );
    act(() =>
      result.current.recordResult('a', passed, context('C Major (Ionian)')),
    );
    act(() =>
      result.current.recordResult('a', passed, context('Bb Major (Ionian)')),
    );
    expect(
      readGenreKeyProgress('guitar-mode-x', 1, 'C').sections.A?.passed,
    ).toBe(1);
    expect(
      readGenreKeyProgress('guitar-mode-x', 1, 'B♭').sections.A?.passed,
    ).toBe(1);
  });

  it('doesn’t count a failed try', () => {
    const { result } = hook();
    act(() => result.current.recordResult('a', failed, context('C')));
    expect(readGenreKeyProgress('guitar-mode-x', 1, 'C').started).toBe(false);
  });

  it('knows a key was started before keys were kept', () => {
    localStorage.setItem(
      'genre_progress_guitar-mode-old_1',
      JSON.stringify({
        completedSteps: {
          a: { score: { passed: true }, keyUsed: 'D Dorian' },
          b: { score: { passed: false }, keyUsed: 'E Dorian' },
        },
        sections: {},
      }),
    );
    expect(readGenreKeyProgress('guitar-mode-old', 1, 'D').started).toBe(true);
    expect(readGenreKeyProgress('guitar-mode-old', 1, 'E').started).toBe(false);
    expect(readGenreKeyProgress('guitar-mode-old', 1, 'D').sections).toEqual(
      {},
    );
  });
});
