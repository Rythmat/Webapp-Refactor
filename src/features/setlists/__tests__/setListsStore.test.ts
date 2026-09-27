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

  it('refuses to delete the role lists', () => {
    const blob = start();
    const id = inbox(blob).id;
    expect(Object.keys(deleteSetList(blob, id, 4).setLists)).toHaveLength(2);
    expect(
      Object.keys(
        deleteSetList(blob, roleList(blob, 'favorites')!.id, 4).setLists,
      ),
    ).toHaveLength(2);
  });

  it('will not rename the repertoire or the favourites', () => {
    const blob = start();
    const id = inbox(blob).id;
    expect(renameSetList(blob, id, 'Gig Book', 2)).toBe(blob);
  });

  it('turns a renamed repertoire into the band it was reaching for', () => {
    // The repertoire has a fixed name now. Anyone who renamed it did so
    // before there were bands, and "My Band 1" is not what a master list of
    // charts is called — so the name becomes a band rather than being lost.
    // A document stored before the repertoire's name was fixed.
    const before = start();
    const id = inbox(before).id;
    let blob = {
      ...before,
      setLists: {
        ...before.setLists,
        [id]: { ...before.setLists[id], title: 'My Band 1' },
      },
    };
    blob = ensureDefaults(blob, 3);

    expect(roleList(blob, 'inbox')?.title).toBe(INBOX_TITLE);
    expect(organiser(blob).artists.map((n) => n.artist.title)).toEqual([
      'My Band 1',
    ]);
    // Still two set lists: a band was made, not a third list.
    expect(Object.keys(blob.setLists)).toHaveLength(2);
  });

  it('does not mint a second band on every edit', () => {
    const first = start();
    const id = inbox(first).id;
    let blob: typeof first = {
      ...first,
      setLists: {
        ...first.setLists,
        [id]: { ...first.setLists[id], title: 'My Band 1' },
      },
    };
    blob = ensureDefaults(blob, 3);
    blob = ensureDefaults(blob, 4);
    blob = ensureDefaults(blob, 5);
    expect(organiser(blob).artists).toHaveLength(1);
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

/**
 * The fingerprint exactly as it shipped: the key, the section labels and the
 * chord names, and nothing else. Every set list stored before the fingerprint
 * was widened holds a value from this function, so a chart that carries none of
 * the newer fields has to keep hashing to what this returns — otherwise the
 * widening itself announces a correction to every set at once.
 */
function legacyFingerprint(song: {
  key: string;
  sections: { label: string; bars: { chords: { chordName: string }[] }[] }[];
}): string {
  const text =
    song.key +
    '|' +
    song.sections
      .map(
        (s) =>
          s.label +
          ':' +
          s.bars
            .map((b) => b.chords.map((c) => c.chordName).join(' '))
            .join('|'),
      )
      .join('//');
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

describe('the chart fingerprint', () => {
  /**
   * A chart in the shape the library writes: 4/4, bars that divide evenly, and
   * not a mark on it. The patches go in ahead of `label` and `chords` so a test
   * cannot accidentally replace the music it is meant to be leaving alone.
   */
  const chart = (
    opts: {
      key?: string;
      timeSignature?: number[];
      section?: Record<string, unknown>;
      bar?: Record<string, unknown>;
      chords?: { chordName: string; beat?: number; duration?: number }[];
    } = {},
  ) => ({
    key: opts.key ?? 'G major',
    timeSignature: opts.timeSignature ?? [4, 4],
    sections: [
      {
        ...opts.section,
        label: 'Verse',
        bars: [
          { chords: [{ chordName: 'G', beat: 1, duration: 4 }] },
          {
            ...opts.bar,
            chords: opts.chords ?? [
              { chordName: 'C', beat: 1, duration: 2 },
              { chordName: 'D', beat: 3, duration: 2 },
            ],
          },
        ],
      },
    ],
  });

  const base = () => chartFingerprint(chart());

  it('hashes the same chart the same way every time', () => {
    expect(chartFingerprint(chart())).toBe(chartFingerprint(chart()));
    const marks = { bar: { repeatEnd: true, ending: [1, 2], cue: 'Break' } };
    expect(chartFingerprint(chart(marks))).toBe(chartFingerprint(chart(marks)));
  });

  it('leaves a chart carrying none of it hashing as it did before', () => {
    // The value already stored in every set list that holds this chart.
    expect(chartFingerprint(chart())).toBe(legacyFingerprint(chart()));
    expect(chartFingerprint(chart())).toBe('1pk63ch');
  });

  it('was blind to all of it, which was the bug', () => {
    const marked = chart({
      section: { repeatCount: 4 },
      bar: { repeatEnd: true, cue: 'Repeat and Fade' },
    });
    expect(legacyFingerprint(marked)).toBe(legacyFingerprint(chart()));
    expect(chartFingerprint(marked)).not.toBe(base());
  });

  it('sees a corrected chord, and the key it is written in', () => {
    expect(
      chartFingerprint(
        chart({
          chords: [
            { chordName: 'C', beat: 1, duration: 2 },
            { chordName: 'D7', beat: 3, duration: 2 },
          ],
        }),
      ),
    ).not.toBe(base());
    expect(chartFingerprint(chart({ key: 'A♭ major' }))).not.toBe(base());
  });

  it('sees every mark a bar can carry, and tells them apart', () => {
    const marks: Record<string, unknown>[] = [
      { repeatStart: true },
      { repeatEnd: true },
      { repeatTimes: 3 },
      { ending: [1] },
      { segno: true },
      { coda: true },
      { toCoda: true },
      { jump: 'D.S. al Coda' },
      { fine: true },
      { cue: 'Piano Solo' },
      { keyChange: 'A♭ major' },
      { restBars: 4 },
      { fermata: true },
      // Not in the schema yet — read optionally, so it counts the day it lands.
      { timeSignature: [3, 4] },
    ];
    const seen = new Set([base()]);
    for (const bar of marks) {
      const fingerprint = chartFingerprint(chart({ bar }));
      expect(fingerprint, JSON.stringify(bar)).not.toBe(base());
      seen.add(fingerprint);
    }
    expect(seen.size).toBe(marks.length + 1);
  });

  it('sees a repeat mark change, not just appear', () => {
    const twice = chartFingerprint(chart({ bar: { repeatEnd: true } }));
    const thrice = chartFingerprint(
      chart({ bar: { repeatEnd: true, repeatTimes: 3 } }),
    );
    const ending = chartFingerprint(
      chart({ bar: { repeatEnd: true, ending: [2] } }),
    );
    expect(new Set([twice, thrice, ending]).size).toBe(3);
  });

  it('sees a metre change, on the song and on the bar', () => {
    expect(chartFingerprint(chart({ timeSignature: [3, 4] }))).not.toBe(base());
    expect(chartFingerprint(chart({ timeSignature: [6, 8] }))).not.toBe(
      chartFingerprint(chart({ timeSignature: [3, 4] })),
    );
    expect(
      chartFingerprint(chart({ bar: { timeSignature: [2, 4] } })),
    ).not.toBe(base());
  });

  it('sees a cue change', () => {
    const one = chartFingerprint(chart({ bar: { cue: 'Break' } }));
    const two = chartFingerprint(chart({ bar: { cue: 'Piano Solo' } }));
    expect(one).not.toBe(two);
    expect(one).not.toBe(base());
  });

  it('sees the marks on a section', () => {
    const marks: Record<string, unknown>[] = [
      { repeatCount: 4 },
      { measuresPerRow: 2 },
      { instrumental: true },
      { instrumental: 'first-time' },
    ];
    const seen = new Set([base()]);
    for (const section of marks) {
      const fingerprint = chartFingerprint(chart({ section }));
      expect(fingerprint, JSON.stringify(section)).not.toBe(base());
      seen.add(fingerprint);
    }
    expect(seen.size).toBe(marks.length + 1);
  });

  it('sees rhythm the chord names cannot show', () => {
    // The same two chords, the first held three beats instead of two.
    expect(
      chartFingerprint(
        chart({
          chords: [
            { chordName: 'C', beat: 1, duration: 3 },
            { chordName: 'D', beat: 4, duration: 1 },
          ],
        }),
      ),
    ).not.toBe(base());
  });

  it('treats an absent mark as though the field had never existed', () => {
    for (const bar of [
      {},
      { fermata: false },
      { fermata: undefined },
      { restBars: 0 },
      { cue: '' },
      { ending: undefined },
    ])
      expect(chartFingerprint(chart({ bar })), JSON.stringify(bar)).toBe(
        base(),
      );

    for (const section of [
      { instrumental: false },
      { repeatCount: undefined },
      { measuresPerRow: undefined },
    ])
      expect(
        chartFingerprint(chart({ section })),
        JSON.stringify(section),
      ).toBe(base());

    // Writing down the metre the fingerprint already assumed, and the rhythm a
    // bar of two chords already read as, both say nothing.
    expect(chartFingerprint(chart({ timeSignature: [4, 4] }))).toBe(base());
    expect(
      chartFingerprint(
        chart({ chords: [{ chordName: 'C' }, { chordName: 'D' }] }),
      ),
    ).toBe(base());
  });

  it('does not depend on the order the fields were authored in', () => {
    const first = {
      key: 'G major',
      sections: [
        {
          label: 'Verse',
          repeatCount: 2,
          bars: [{ fermata: true, restBars: 2, chords: [] }],
        },
      ],
    };
    const second = {
      key: 'G major',
      sections: [
        {
          bars: [{ chords: [], restBars: 2, fermata: true }],
          repeatCount: 2,
          label: 'Verse',
        },
      ],
    };
    expect(chartFingerprint(first)).toBe(chartFingerprint(second));
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
