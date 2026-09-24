import { describe, expect, it } from 'vitest';
import {
  addSongEntry,
  addTextEntry,
  createSetList,
  deleteSetList,
  duplicateEntry,
  emptyBlob,
  ensureDefaults,
  estimateBlobBytes,
  isFavorite,
  listTree,
  migrateSavedSongs,
  moveEntry,
  normalizeBlob,
  removeEntry,
  renameSetList,
  reorder,
  roleList,
  saveVersionAs,
  setEntryNotes,
  setEntryTranspose,
  toggleFavorite,
} from '../setListsStore';
import { FAVORITES_TITLE, INBOX_TITLE } from '../types';

const start = () => ensureDefaults(emptyBlob(1), 1);
const inbox = (b: ReturnType<typeof start>) => roleList(b, 'inbox')!;

describe('defaults', () => {
  it('creates My Lead Sheets and My Favorites under a default artist and show', () => {
    const blob = start();
    expect(roleList(blob, 'inbox')?.title).toBe(INBOX_TITLE);
    expect(roleList(blob, 'favorites')?.title).toBe(FAVORITES_TITLE);
    const tree = listTree(blob);
    expect(tree).toHaveLength(1);
    expect(tree[0].shows[0].setLists).toHaveLength(2);
  });

  it('is idempotent', () => {
    const once = start();
    expect(Object.keys(ensureDefaults(once, 2).setLists)).toHaveLength(2);
  });

  it('keeps the role lists when they are renamed, and refuses to delete them', () => {
    let blob = start();
    const id = inbox(blob).id;
    blob = renameSetList(blob, id, 'Gig Book', 2);
    blob = ensureDefaults(blob, 3);
    expect(Object.keys(blob.setLists)).toHaveLength(2);
    expect(roleList(blob, 'inbox')?.title).toBe('Gig Book');
    expect(Object.keys(deleteSetList(blob, id, 4).setLists)).toHaveLength(2);
  });
});

describe('entries', () => {
  it('holds the same song twice with its own key and notes each time', () => {
    let blob = start();
    const list = inbox(blob).id;
    const first = addSongEntry(blob, list, { songId: 'africa' }, undefined, 2);
    blob = first.blob;
    const second = addSongEntry(blob, list, { songId: 'africa' }, undefined, 2);
    blob = second.blob;
    blob = setEntryTranspose(blob, list, second.entryId, 3, 3);
    blob = setEntryNotes(blob, list, second.entryId, 'encore, drums only', 3);

    const entries = blob.setLists[list].entries;
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.kind === 'song' && e.songId)).toEqual([
      'africa',
      'africa',
    ]);
    expect(entries[0].id).not.toBe(entries[1].id);
    expect(entries[0]).toMatchObject({ semitones: 0 });
    expect(entries[1]).toMatchObject({
      semitones: 3,
      notes: 'encore, drums only',
    });
  });

  it('keeps a transposition inside one octave', () => {
    let blob = start();
    const list = inbox(blob).id;
    const { blob: b2, entryId } = addSongEntry(
      blob,
      list,
      { songId: 'africa' },
      undefined,
      2,
    );
    blob = setEntryTranspose(b2, list, entryId, -1, 3);
    expect(blob.setLists[list].entries[0]).toMatchObject({ semitones: 11 });
  });

  it('adds text pages, duplicates and removes entries', () => {
    let blob = start();
    const list = inbox(blob).id;
    blob = addSongEntry(blob, list, { songId: 'africa' }, undefined, 2).blob;
    const text = addTextEntry(
      blob,
      list,
      'Talk to the crowd here',
      undefined,
      2,
    );
    blob = text.blob;
    blob = duplicateEntry(blob, list, text.entryId, 3);
    expect(blob.setLists[list].entries).toHaveLength(3);
    blob = removeEntry(blob, list, text.entryId, 4);
    expect(blob.setLists[list].entries.map((e) => e.kind)).toEqual([
      'song',
      'text',
    ]);
  });

  it('reorders by drag', () => {
    expect(reorder(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(reorder(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c']);
    expect(reorder(['a', 'b'], 0, 0)).toEqual(['a', 'b']);
    expect(reorder(['a', 'b'], 5, 0)).toEqual(['a', 'b']);
    expect(reorder(['a', 'b'], 0, 99)).toEqual(['b', 'a']);

    let blob = start();
    const list = inbox(blob).id;
    for (const songId of ['one', 'two', 'three'])
      blob = addSongEntry(blob, list, { songId }, undefined, 2).blob;
    blob = moveEntry(blob, list, 2, 0, 3);
    expect(
      blob.setLists[list].entries.map((e) => e.kind === 'song' && e.songId),
    ).toEqual(['three', 'one', 'two']);
  });
});

describe('favorites', () => {
  it('stars and unstars a song', () => {
    let blob = start();
    expect(isFavorite(blob, 'africa')).toBe(false);
    blob = toggleFavorite(blob, 'africa', 2);
    expect(isFavorite(blob, 'africa')).toBe(true);
    blob = toggleFavorite(blob, 'africa', 3);
    expect(isFavorite(blob, 'africa')).toBe(false);
  });

  it('leaves the song in other set lists when unstarred', () => {
    let blob = start();
    const list = inbox(blob).id;
    blob = addSongEntry(blob, list, { songId: 'africa' }, undefined, 2).blob;
    blob = toggleFavorite(blob, 'africa', 2);
    blob = toggleFavorite(blob, 'africa', 3);
    expect(blob.setLists[list].entries).toHaveLength(1);
  });

  it('imports the device-only saved songs once', () => {
    const saved = { africa: true as const, respect: true as const };
    const once = migrateSavedSongs(start(), saved, 2);
    const twice = migrateSavedSongs(once, saved, 3);
    expect(roleList(twice, 'favorites')!.entries).toHaveLength(2);
  });
});

describe('save this version as', () => {
  it('files a named, transposed version into My Lead Sheets by default', () => {
    const blob = start();
    const saved = saveVersionAs(
      blob,
      {
        songId: 'they_long_to_be_close_to_you',
        name: 'Close To You (horn key)',
        semitones: 2,
        destination: { kind: 'existing', setListId: inbox(blob).id },
      },
      2,
    );
    const entry = saved.blob.setLists[saved.setListId].entries[0];
    expect(saved.setListId).toBe(inbox(blob).id);
    expect(entry).toMatchObject({
      kind: 'song',
      songId: 'they_long_to_be_close_to_you',
      title: 'Close To You (horn key)',
      semitones: 2,
    });
  });

  it('creates a new set list when asked', () => {
    const saved = saveVersionAs(
      start(),
      {
        songId: 'africa',
        destination: { kind: 'new', title: 'Friday at the Mercury' },
      },
      2,
    );
    expect(saved.blob.setLists[saved.setListId].title).toBe(
      'Friday at the Mercury',
    );
    expect(saved.blob.setLists[saved.setListId].entries).toHaveLength(1);
  });

  it('falls back to My Lead Sheets when the destination is gone', () => {
    const blob = start();
    const saved = saveVersionAs(
      blob,
      {
        songId: 'africa',
        destination: { kind: 'existing', setListId: 'deleted' },
      },
      2,
    );
    expect(saved.setListId).toBe(inbox(blob).id);
  });
});

describe('reading a stored document', () => {
  it('survives garbage', () => {
    expect(normalizeBlob(null).setLists).toEqual({});
    expect(normalizeBlob('nonsense').setLists).toEqual({});
    expect(
      normalizeBlob({ schemaVersion: 99, setLists: {}, order: {} }).setLists,
    ).toEqual({});
    const partial = normalizeBlob({
      schemaVersion: 1,
      setLists: {
        a: {
          id: 'a',
          title: 'x',
          showId: 's',
          entries: [
            null,
            {
              kind: 'song',
              id: 'e',
              songId: 'africa',
              semitones: 0,
              createdAt: 0,
            },
            { kind: 'bogus' },
          ],
        },
      },
      order: {},
    });
    expect(partial.setLists.a.entries).toHaveLength(1);
  });

  it('round-trips a real document', () => {
    let blob = start();
    const list = inbox(blob).id;
    blob = addSongEntry(
      blob,
      list,
      { songId: 'africa', notes: 'capo 2' },
      undefined,
      2,
    ).blob;
    expect(normalizeBlob(JSON.parse(JSON.stringify(blob)))).toEqual(blob);
  });

  it('stays small', () => {
    let blob = start();
    const list = inbox(blob).id;
    for (let i = 0; i < 50; i++)
      blob = addSongEntry(
        blob,
        list,
        { songId: `song_${i}` },
        undefined,
        2,
      ).blob;
    expect(estimateBlobBytes(blob)).toBeLessThan(20_000);
  });
});

describe('auto-filing', () => {
  it('puts a new set list under the default artist and show without being asked', () => {
    const created = createSetList(emptyBlob(1), { title: 'Saturday' }, 1);
    const tree = listTree(created.blob);
    expect(tree[0].artist.title).toBe('My Music');
    expect(tree[0].shows[0].setLists.map((l) => l.title)).toContain('Saturday');
  });
});
