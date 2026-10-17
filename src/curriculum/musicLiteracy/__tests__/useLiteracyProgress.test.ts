// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  literacyProgressKey,
  readLiteracyProgress,
  useLiteracyProgress,
  withTry,
} from '../useLiteracyProgress';

describe('Music Literacy progress', () => {
  beforeEach(() => localStorage.clear());

  it('keeps the best score and never takes a pass back', () => {
    let progress = withTry({}, 'add-the-3', 54, false);
    expect(progress['add-the-3']).toEqual({
      best: 54,
      passed: false,
      attempts: 1,
    });
    progress = withTry(progress, 'add-the-3', 92, true);
    progress = withTry(progress, 'add-the-3', 30, false);
    expect(progress['add-the-3']).toEqual({
      best: 92,
      passed: true,
      attempts: 3,
    });
  });

  it('remembers each step by the lesson’s id and the step’s tag', () => {
    const { result } = renderHook(() =>
      useLiteracyProgress('music-literacy-part-1'),
    );
    act(() => result.current.record('note-called-c', 86, true));
    expect(result.current.progress['note-called-c']).toMatchObject({
      best: 86,
      passed: true,
    });
    expect(
      JSON.parse(
        localStorage.getItem(literacyProgressKey('music-literacy-part-1'))!,
      ),
    ).toEqual({ 'note-called-c': { best: 86, passed: true, attempts: 1 } });
    expect(readLiteracyProgress('another-lesson')).toEqual({});
  });

  it('starts fresh on unreadable storage', () => {
    localStorage.setItem(literacyProgressKey('x'), '{not json');
    expect(readLiteracyProgress('x')).toEqual({});
  });
});
