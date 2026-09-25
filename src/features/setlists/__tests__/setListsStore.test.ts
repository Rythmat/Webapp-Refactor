import { describe, expect, it } from 'vitest';
import {
  acceptChartUpdate,
  addProjectEntry,
  addSongEntry,
  chartFingerprint,
  addTextEntry,
  createSetList,
  deleteSetList,
  duplicateEntry,
  emptyBlob,
  ensureDefaults,
  estimateBlobBytes,
  isFavorite,
  flatSetLists,
  organiser,
  migrateSavedSongs,
  moveEntry,
  normalizeBlob,
  projectEntries,
  removeEntry,
  replaceProjectChart,
  renameSetList,
  reorder,
  roleList,
  saveVersionAs,
  setEntryNotes,
  setEntryTranspose,
  toggleFavorite,
  unlinkProject,
} from '../setListsStore';
import {
  FAVORITES_TITLE,
  INBOX_TITLE,
  LIMITS,
  type StoredChart,
} from '../types';

const start = () => ensureDefaults(emptyBlob(1), 1);
const inbox = (b: ReturnType<typeof start>) => roleList(b, 'inbox')!;

describe('defaults', () => {
  it('creates only the repertoire and the favourites, and no hierarchy', () => {
    const blob = start();
    expect(roleList(blob, 'inbox')?.title).toBe(INBOX_TITLE);
    expect(roleList(blob, 'favorites')?.title).toBe(FAVORITES_TITLE);
    // No band and no show until someone makes one: a player should never be
    // shown two levels of filing for a system with one folder.
    expect(organiser(blob).artists).toEqual([]);
    expect(organiser(blob).looseShows).toEqual([]);
    // Neither role list is in the flat grid — the repertoire is not a set.
    expect(flatSetLists(blob)).toEqual([]);
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

describe('a new set list', () => {
  it('is filed nowhere, and shows in the flat list', () => {
    const created = createSetList(emptyBlob(1), { title: 'Saturday' }, 1);
    const list = created.blob.setLists[created.setListId];
    expect(list.parent).toBeUndefined();
    expect(flatSetLists(created.blob).map((l) => l.title)).toEqual([
      'Saturday',
    ]);
    expect(organiser(created.blob).artists).toEqual([]);
  });
});

describe('chart corrections', () => {
  const chart = (chordName: string) => ({
    key: 'G major',
    sections: [{ label: 'Verse', bars: [{ chords: [{ chordName }] }] }],
  });

  it('fingerprints the music, not the object', () => {
    expect(chartFingerprint(chart('Cadd2'))).toBe(
      chartFingerprint(chart('Cadd2')),
    );
    expect(chartFingerprint(chart('Cadd2'))).not.toBe(
      chartFingerprint(chart('C')),
    );
  });

  it('remembers which chart the player added, without copying it', () => {
    let blob = start();
    const list = inbox(blob).id;
    const added = addSongEntry(
      blob,
      list,
      { songId: 'africa', chartFingerprint: 'abc' },
      undefined,
      2,
    );
    blob = added.blob;
    const entry = blob.setLists[list].entries[0];
    expect(entry).toMatchObject({ songId: 'africa', chartFingerprint: 'abc' });
    // The chords themselves are NOT in the set list: a correction to the
    // published chart reaches every set that plays it.
    expect(JSON.stringify(entry)).not.toContain('bars');

    blob = acceptChartUpdate(blob, list, added.entryId, 'def', 3);
    expect(blob.setLists[list].entries[0]).toMatchObject({
      chartFingerprint: 'def',
    });
  });

  /* ── Charts printed from the Studio ─────────────────────────────────── */

  const studioChart = (chordName = 'G', bars = 4): StoredChart => ({
    title: 'Blues in G',
    key: 'G major',
    keyRoot: 7,
    mode: 'major',
    tempo: 96,
    timeSignature: [4, 4],
    sections: [
      {
        id: 'studio_1',
        label: '',
        bars: Array.from({ length: bars }, () => ({
          chords: [{ degree: '1 maj', chordName, beat: 1, duration: 4 }],
        })),
      },
    ],
  });

  it('carries the chart itself, because a project may not keep one', () => {
    let blob = start();
    const list = inbox(blob).id;
    const added = addProjectEntry(
      blob,
      list,
      { projectId: 'p1', title: 'Blues in G', chart: studioChart() },
      undefined,
      2,
    );
    blob = added.blob;
    const entry = blob.setLists[list].entries[0];
    expect(entry).toMatchObject({
      kind: 'project',
      projectId: 'p1',
      title: 'Blues in G',
      semitones: 0,
      copiedAt: 2,
    });
    // Unlike a library song, the chords ARE here.
    expect(JSON.stringify(entry)).toContain('bars');
  });

  it('keeps the page when the project it came from is deleted', () => {
    let blob = start();
    const list = inbox(blob).id;
    blob = addProjectEntry(
      blob,
      list,
      { projectId: 'p1', title: 'Blues in G', chart: studioChart() },
      undefined,
      2,
    ).blob;
    blob = addProjectEntry(
      blob,
      list,
      { projectId: 'p2', title: 'Other', chart: studioChart('D') },
      undefined,
      2,
    ).blob;

    blob = unlinkProject(blob, 'p1', 3);
    const [gone, kept] = blob.setLists[list].entries;
    // The link is severed; the chart is untouched. This is the promise.
    expect(gone).toMatchObject({ kind: 'project', title: 'Blues in G' });
    expect('projectId' in gone).toBe(false);
    expect(gone.kind === 'project' && gone.chart.sections[0].bars).toHaveLength(
      4,
    );
    // Another project's page is not disturbed.
    expect(kept).toMatchObject({ projectId: 'p2' });
    expect(projectEntries(blob, 'p1')).toEqual([]);
    expect(projectEntries(blob, 'p2')).toHaveLength(1);
  });

  it('finds every set carrying a project, and replaces only those pages', () => {
    let blob = start();
    const a = inbox(blob).id;
    const created = createSetList(blob, { title: 'Friday' }, 2);
    blob = created.blob;
    const b = created.setListId;
    for (const list of [a, b]) {
      blob = addProjectEntry(
        blob,
        list,
        { projectId: 'p1', title: 'Blues in G', chart: studioChart() },
        undefined,
        2,
      ).blob;
    }

    const carrying = projectEntries(blob, 'p1');
    expect(carrying.map((c) => c.setListId).sort()).toEqual([a, b].sort());

    // The Studio pushes a corrected chart into one of them.
    const target = carrying.find((c) => c.setListId === a)!;
    blob = replaceProjectChart(
      blob,
      a,
      target.entry.id,
      studioChart('G7'),
      'Blues in G (fixed)',
      9,
    );
    const updated = blob.setLists[a].entries[0];
    expect(updated).toMatchObject({
      title: 'Blues in G (fixed)',
      copiedAt: 9,
    });
    expect(
      updated.kind === 'project' &&
        updated.chart.sections[0].bars[0].chords[0].chordName,
    ).toBe('G7');
    // The other set still holds the page it was given.
    expect(
      blob.setLists[b].entries[0].kind === 'project' &&
        blob.setLists[b].entries[0].chart.sections[0].bars[0].chords[0]
          .chordName,
    ).toBe('G');
  });

  it('gives a printed chart its own key and notes in each set', () => {
    let blob = start();
    const list = inbox(blob).id;
    const added = addProjectEntry(
      blob,
      list,
      { title: 'Blues in G', chart: studioChart() },
      undefined,
      2,
    );
    blob = setEntryTranspose(added.blob, list, added.entryId, 3, 3);
    blob = setEntryNotes(blob, list, added.entryId, 'count in 4', 4);
    expect(blob.setLists[list].entries[0]).toMatchObject({
      semitones: 3,
      notes: 'count in 4',
    });
  });

  it('will not let one chart grow the document without limit', () => {
    const blob = start();
    const list = inbox(blob).id;
    const huge = addProjectEntry(
      blob,
      list,
      { title: 'Long', chart: studioChart('G', LIMITS.chartBars + 50) },
      undefined,
      2,
    ).blob;
    const entry = huge.setLists[list].entries[0];
    expect(
      entry.kind === 'project' && entry.chart.sections[0].bars.length,
    ).toBe(LIMITS.chartBars);
  });
});
