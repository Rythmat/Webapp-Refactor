import { describe, expect, it } from 'vitest';
import { newestBuild } from './protomapsDevTiles';

describe('the newest Protomaps build', () => {
  it('is the latest dated file, whatever order the list is in', () => {
    expect(
      newestBuild([
        { key: '20261012.pmtiles' },
        { key: '20261013.pmtiles' },
        { key: '20261011.pmtiles' },
      ]),
    ).toBe('20261013.pmtiles');
  });

  it('ignores anything that is not a daily build', () => {
    expect(
      newestBuild([
        { key: '20261011.pmtiles' },
        { key: 'v4-test.pmtiles' },
        { key: 42 },
        {},
      ]),
    ).toBe('20261011.pmtiles');
  });

  it('fails plainly on an empty list', () => {
    expect(() => newestBuild([])).toThrow(/no daily build/);
  });
});
