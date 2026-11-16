import { describe, expect, it } from 'vitest';
import { differingKeys, storeOverFile } from '../StoreCopyBar';

/**
 * Bringing the content store's copy of a song into the repo's file (owner,
 * 2026-11-15): the store's edits win; what its schema cannot hold yet stays.
 */

const file = {
  id: 'dont_stop_believin',
  title: "Don't Stop Believin'",
  tempo: 118,
  sections: [{ id: 'v', label: 'Verse', bars: [] }],
  credits: [{ name: 'Steve Perry', role: 'vocals' }],
  comingSoon: true,
};

describe('the content store’s copy', () => {
  it('names the fields it changed', () => {
    const store = {
      id: 'dont_stop_believin',
      title: "Don't Stop Believin'",
      tempo: 119,
      sections: [{ id: 'v', label: 'Verse 1', bars: [] }],
    };
    expect(differingKeys(file, store)).toEqual(['tempo', 'sections']);
    expect(differingKeys(file, { ...file })).toEqual([]);
  });

  it('wins on its own fields, and keeps the file’s others', () => {
    const merged = storeOverFile(file, { id: file.id, tempo: 119 });
    expect(merged.tempo).toBe(119);
    expect(merged.credits).toEqual(file.credits);
    expect(merged.comingSoon).toBe(true);
  });
});
