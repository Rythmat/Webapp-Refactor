import { describe, expect, it } from 'vitest';
import {
  createArtist,
  createSetList,
  createShow,
  deleteArtist,
  deleteShow,
  duplicateArtist,
  duplicateSetList,
  duplicateShow,
  emptyBlob,
  ensureDefaults,
  fileSetList,
  flatSetLists,
  normalizeBlob,
  organiser,
  roleList,
  setListOptions,
} from '../setListsStore';
import type { SetListsBlob } from '../types';

/**
 * Bands, shows and what is filed under them.
 *
 * The rules, in the owner's words: a band does not need a show and a show does
 * not need a band, but once a show is under a band it stays there — you
 * duplicate rather than move it. Filing a set list is an annotation, never a
 * move: the flat list always holds everything.
 */

const start = () => ensureDefaults(emptyBlob(1), 1);
const titles = (lists: { title: string }[]) => lists.map((l) => l.title);

describe('bands and shows', () => {
  it('lets a band exist with no shows', () => {
    const { blob, artistId } = createArtist(start(), 'The Quartet', 2);
    const tree = organiser(blob);
    expect(tree.artists).toHaveLength(1);
    expect(tree.artists[0].artist.title).toBe('The Quartet');
    expect(tree.artists[0].shows).toEqual([]);
    expect(artistId).toBeTruthy();
  });

  it('lets a show stand on its own, with no band', () => {
    const { blob } = createShow(start(), undefined, 'Jazz Fest', 2);
    const tree = organiser(blob);
    expect(tree.artists).toEqual([]);
    expect(tree.looseShows.map((s) => s.show.title)).toEqual(['Jazz Fest']);
    expect(tree.looseShows[0].show.artistId).toBeUndefined();
  });

  it('puts a show under the band it was made in', () => {
    const a = createArtist(start(), 'The Quartet', 2);
    const { blob } = createShow(a.blob, a.artistId, 'Summer Tour', 2);
    const tree = organiser(blob);
    expect(tree.artists[0].shows.map((s) => s.show.title)).toEqual([
      'Summer Tour',
    ]);
    // It is that band's show and nobody else's.
    expect(tree.looseShows).toEqual([]);
  });

  it('refuses a show under a band that does not exist', () => {
    const before = start();
    const { blob, showId } = createShow(before, 'nope', 'Ghost', 2);
    expect(showId).toBe('');
    expect(blob).toBe(before);
  });
});

describe('filing a set list', () => {
  const build = () => {
    const a = createArtist(start(), 'The Quartet', 2);
    const sh = createShow(a.blob, a.artistId, 'Summer Tour', 2);
    const sl = createSetList(sh.blob, { title: 'Night 1' }, 2);
    return {
      blob: sl.blob,
      artistId: a.artistId,
      showId: sh.showId,
      listId: sl.setListId,
    };
  };

  it('keeps it in the flat list wherever it is filed', () => {
    const { blob, showId, listId } = build();
    expect(titles(flatSetLists(blob))).toEqual(['Night 1']);
    const filed = fileSetList(blob, listId, { kind: 'show', id: showId }, 3);
    // Still in the grid — filing is a second place to find it, not a move.
    expect(titles(flatSetLists(filed))).toEqual(['Night 1']);
    expect(titles(organiser(filed).artists[0].shows[0].setLists)).toEqual([
      'Night 1',
    ]);
  });

  it('files under a band directly, not only under a show', () => {
    const { blob, artistId, listId } = build();
    const filed = fileSetList(
      blob,
      listId,
      { kind: 'artist', id: artistId },
      3,
    );
    expect(titles(organiser(filed).artists[0].setLists)).toEqual(['Night 1']);
    expect(organiser(filed).artists[0].shows[0].setLists).toEqual([]);
  });

  it('unfiles with undefined', () => {
    const { blob, showId, listId } = build();
    let next = fileSetList(blob, listId, { kind: 'show', id: showId }, 3);
    next = fileSetList(next, listId, undefined, 4);
    expect(next.setLists[listId].parent).toBeUndefined();
    expect(organiser(next).artists[0].shows[0].setLists).toEqual([]);
    expect(titles(flatSetLists(next))).toEqual(['Night 1']);
  });

  it('refuses to file into something that is not there', () => {
    const { blob, listId } = build();
    expect(fileSetList(blob, listId, { kind: 'show', id: 'gone' }, 3)).toBe(
      blob,
    );
  });

  it('will not file the repertoire or the favourites', () => {
    const { blob, showId } = build();
    const repertoire = roleList(blob, 'inbox')!;
    expect(
      fileSetList(blob, repertoire.id, { kind: 'show', id: showId }, 3),
    ).toBe(blob);
  });

  it('forgets a parent that has been deleted', () => {
    const { blob, showId, listId } = build();
    const filed = fileSetList(blob, listId, { kind: 'show', id: showId }, 3);
    // Round-trip through storage with the show torn out behind its back.
    const wounded = { ...filed, shows: {} } as SetListsBlob;
    const read = normalizeBlob(JSON.parse(JSON.stringify(wounded)), 9);
    expect(read.setLists[listId].parent).toBeUndefined();
    expect(titles(flatSetLists(read))).toEqual(['Night 1']);
  });
});

describe('deleting a container', () => {
  it('keeps the set lists and unfiles them', () => {
    const a = createArtist(start(), 'The Quartet', 2);
    const sh = createShow(a.blob, a.artistId, 'Summer Tour', 2);
    const sl = createSetList(sh.blob, { title: 'Night 1' }, 2);
    const filed = fileSetList(
      sl.blob,
      sl.setListId,
      { kind: 'show', id: sh.showId },
      3,
    );

    const gone = deleteShow(filed, sh.showId, 4);
    expect(gone.shows[sh.showId]).toBeUndefined();
    // The set survives its show — losing a gig does not lose the music.
    expect(titles(flatSetLists(gone))).toEqual(['Night 1']);
    expect(gone.setLists[sl.setListId].parent).toBeUndefined();
  });

  it('takes a band shows with it, and still keeps every set', () => {
    const a = createArtist(start(), 'The Quartet', 2);
    const sh = createShow(a.blob, a.artistId, 'Summer Tour', 2);
    const one = createSetList(sh.blob, { title: 'Night 1' }, 2);
    const two = createSetList(one.blob, { title: 'Rehearsal' }, 2);
    let blob = fileSetList(
      two.blob,
      one.setListId,
      { kind: 'show', id: sh.showId },
      3,
    );
    blob = fileSetList(
      blob,
      two.setListId,
      { kind: 'artist', id: a.artistId },
      3,
    );

    const gone = deleteArtist(blob, a.artistId, 4);
    expect(organiser(gone).artists).toEqual([]);
    expect(organiser(gone).looseShows).toEqual([]);
    expect(titles(flatSetLists(gone)).sort()).toEqual(['Night 1', 'Rehearsal']);
    expect(gone.setLists[one.setListId].parent).toBeUndefined();
    expect(gone.setLists[two.setListId].parent).toBeUndefined();
  });
});

describe('duplicating', () => {
  it('copies a set list with its entries, filed the same way', () => {
    const sl = createSetList(start(), { title: 'Night 1' }, 2);
    const copy = duplicateSetList(sl.blob, sl.setListId, undefined, 3);
    expect(copy.blob.setLists[copy.setListId].title).toBe('Night 1 copy');
    expect(titles(flatSetLists(copy.blob))).toEqual([
      'Night 1',
      'Night 1 copy',
    ]);
  });

  it('copies a show and the sets filed under it', () => {
    const a = createArtist(start(), 'The Quartet', 2);
    const sh = createShow(a.blob, a.artistId, 'Summer Tour', 2);
    const sl = createSetList(sh.blob, { title: 'Night 1' }, 2);
    const blob = fileSetList(
      sl.blob,
      sl.setListId,
      { kind: 'show', id: sh.showId },
      3,
    );

    const copy = duplicateShow(blob, sh.showId, 4);
    const tree = organiser(copy.blob);
    expect(tree.artists[0].shows.map((s) => s.show.title)).toEqual([
      'Summer Tour',
      'Summer Tour copy',
    ]);
    // The copy stays with the same band — a show is never reparented.
    expect(copy.blob.shows[copy.showId].artistId).toBe(a.artistId);
    expect(titles(tree.artists[0].shows[1].setLists)).toEqual(['Night 1 copy']);
  });

  it('copies a band, its shows and everything filed under either', () => {
    const a = createArtist(start(), 'The Quartet', 2);
    const sh = createShow(a.blob, a.artistId, 'Summer Tour', 2);
    const night = createSetList(sh.blob, { title: 'Night 1' }, 2);
    const reh = createSetList(night.blob, { title: 'Rehearsal' }, 2);
    let blob = fileSetList(
      reh.blob,
      night.setListId,
      { kind: 'show', id: sh.showId },
      3,
    );
    blob = fileSetList(
      blob,
      reh.setListId,
      { kind: 'artist', id: a.artistId },
      3,
    );

    const copy = duplicateArtist(blob, a.artistId, 4);
    const made = organiser(copy.blob).artists.find(
      (n) => n.artist.id === copy.artistId,
    )!;
    expect(made.artist.title).toBe('The Quartet copy');
    expect(made.shows.map((s) => s.show.title)).toEqual(['Summer Tour']);
    expect(titles(made.shows[0].setLists)).toEqual(['Night 1 copy']);
    expect(titles(made.setLists)).toEqual(['Rehearsal copy']);
    // The original is untouched.
    expect(titles(organiser(blob).artists[0].shows[0].setLists)).toEqual([
      'Night 1',
    ]);
  });
});

describe('destinations offered to a picker', () => {
  it('names each set list by the path it is filed under', () => {
    const a = createArtist(start(), 'The Quartet', 2);
    const sh = createShow(a.blob, a.artistId, 'Summer Tour', 2);
    const loose = createSetList(sh.blob, { title: 'Tuesday' }, 2);
    const night = createSetList(loose.blob, { title: 'Night 1' }, 2);
    const blob = fileSetList(
      night.blob,
      night.setListId,
      { kind: 'show', id: sh.showId },
      3,
    );
    const labels = setListOptions(blob).map((o) => o.label);
    expect(labels).toContain('My Lead Sheets');
    expect(labels).toContain('Tuesday');
    expect(labels).toContain('The Quartet ▸ Summer Tour ▸ Night 1');
  });
});

describe('reading a version 1 document', () => {
  const v1 = (over: Record<string, unknown> = {}) => ({
    schemaVersion: 1,
    updatedAt: 1,
    artists: {
      art1: { id: 'art1', title: 'My Music', createdAt: 1, updatedAt: 1 },
    },
    shows: {
      sh1: {
        id: 'sh1',
        artistId: 'art1',
        title: 'Unfiled',
        createdAt: 1,
        updatedAt: 1,
      },
    },
    setLists: {
      sl1: {
        id: 'sl1',
        showId: 'sh1',
        title: 'Tuesday',
        entries: [],
        createdAt: 1,
        updatedAt: 1,
      },
    },
    order: {
      artists: ['art1'],
      showsByArtist: { art1: ['sh1'] },
      setListsByShow: { sh1: ['sl1'] },
    },
    ...over,
  });

  it('throws away the band and show version 1 gave everyone', () => {
    const read = normalizeBlob(v1(), 9);
    expect(read.schemaVersion).toBe(2);
    expect(organiser(read).artists).toEqual([]);
    expect(organiser(read).looseShows).toEqual([]);
    // The set list itself is kept, and unfiled.
    expect(titles(flatSetLists(read))).toEqual(['Tuesday']);
    expect(read.setLists.sl1.parent).toBeUndefined();
  });

  it('keeps a band and show the player named themselves', () => {
    const read = normalizeBlob(
      v1({
        artists: {
          art1: {
            id: 'art1',
            title: 'The Quartet',
            createdAt: 1,
            updatedAt: 1,
          },
        },
        shows: {
          sh1: {
            id: 'sh1',
            artistId: 'art1',
            title: 'Summer Tour',
            createdAt: 1,
            updatedAt: 1,
          },
        },
      }),
      9,
    );
    const tree = organiser(read);
    expect(tree.artists.map((n) => n.artist.title)).toEqual(['The Quartet']);
    expect(titles(tree.artists[0].shows[0].setLists)).toEqual(['Tuesday']);
    // And it is still in the flat grid too.
    expect(titles(flatSetLists(read))).toEqual(['Tuesday']);
  });

  it('keeps the role lists, and leaves them out of the grid', () => {
    const read = normalizeBlob(
      v1({
        setLists: {
          sl1: {
            id: 'sl1',
            showId: 'sh1',
            title: 'My Lead Sheets',
            role: 'inbox',
            entries: [],
            createdAt: 1,
            updatedAt: 1,
          },
        },
        order: {
          artists: ['art1'],
          showsByArtist: { art1: ['sh1'] },
          setListsByShow: { sh1: ['sl1'] },
        },
      }),
      9,
    );
    expect(roleList(read, 'inbox')?.title).toBe('My Lead Sheets');
    expect(flatSetLists(read)).toEqual([]);
  });
});
