import { afterEach, describe, expect, it } from 'vitest';
import {
  deleteLibraryAudio,
  getLibraryAudio,
  listLibraryAudio,
  resetLibraryAudioForTests,
  saveLibraryAudio,
  setLibraryAudioFavorite,
} from '../audioLibrary';

// No IndexedDB under jsdom: the library keeps its items in memory, through
// the same API the Studio uses.

const stem = (name: string) => ({
  kind: 'stem' as const,
  name,
  tag: 'Synth',
  project: 'Midnight Groove',
  color: 'rgb(1, 2, 3)',
  contentType: 'audio/wav',
  size: 4,
  durationSec: 12,
  blob: new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/wav' }),
});

afterEach(resetLibraryAudioForTests);

describe('the Studio Library audio', () => {
  it('keeps stems and uploads, newest first, without their bytes', async () => {
    await saveLibraryAudio(stem('Midnight Groove (Keys)'));
    await new Promise((r) => setTimeout(r, 2));
    await saveLibraryAudio({
      ...stem('loop'),
      kind: 'upload',
      tag: 'WAV',
    });
    const items = await listLibraryAudio();
    expect(items.map((i) => [i.kind, i.name])).toEqual([
      ['upload', 'loop'],
      ['stem', 'Midnight Groove (Keys)'],
    ]);
    expect(items[0]).not.toHaveProperty('blob');
    expect(items[0]).toMatchObject({ favorite: false, durationSec: 12 });
  });

  it('gives an item back with its audio, favourites and deletes it', async () => {
    await saveLibraryAudio(stem('Midnight Groove (Drums)'));
    const [item] = await listLibraryAudio();
    expect((await getLibraryAudio(item.id))?.blob.size).toBe(4);

    await setLibraryAudioFavorite(item.id, true);
    expect((await listLibraryAudio())[0].favorite).toBe(true);

    await deleteLibraryAudio(item.id);
    expect(await listLibraryAudio()).toEqual([]);
  });
});
