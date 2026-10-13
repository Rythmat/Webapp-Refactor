// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runRetiredCurriculumPurge } from './retiredCurriculum';

const MARKER = 'test:retired-curriculum-purged';

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('runRetiredCurriculumPurge', () => {
  it('purges once, then never again on this device', () => {
    const purge = vi.fn();
    runRetiredCurriculumPurge(MARKER, purge);
    runRetiredCurriculumPurge(MARKER, purge);
    expect(purge).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(MARKER)).not.toBeNull();
  });

  it('skips the purge when the marker cannot be saved', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const purge = vi.fn();
    runRetiredCurriculumPurge(MARKER, purge);
    expect(purge).not.toHaveBeenCalled();
  });
});
