import { describe, expect, it } from 'vitest';
import type { ContentKind } from '@/hooks/data/admin/useAdminContent';
import {
  nodeIdForRow,
  TABLE_FOR_CONTENT_KIND,
  TABLE_IDS,
  tableForAppPage,
  tableRowForItem,
  tableRowForNode,
} from '../tableIds';
import * as paths from '../tablePaths';

/**
 * Which table and row a content kind, a graph node or an app page belongs
 * to — the ids the pure model and the eager console chrome share.
 */

describe('the content kinds', () => {
  it('each open the table that holds them', () => {
    // The plan's `records/:kind` redirects (§3.5): the three kinds left out
    // stay under "Other records".
    expect(TABLE_FOR_CONTENT_KIND).toEqual({
      song: 'songs',
      globe_event: 'events',
      globe_city: 'locations',
      artist: 'artists',
      release: 'records',
      studio: 'studios',
      label: 'labels',
      chord_progression: 'progressions',
    });
  });
});

describe('a node’s row', () => {
  it.each([
    ['artist:toto', 'artists', 'toto'],
    ['song:africa', 'songs', 'africa'],
    ['event:evt-woodstock', 'events', 'evt-woodstock'],
    ['place:detroit', 'locations', 'detroit'],
    ['release:toto-toto-iv', 'records', 'toto-toto-iv'],
    ['studio:hitsville-u-s-a', 'studios', 'hitsville-u-s-a'],
    ['label:motown', 'labels', 'motown'],
    ['genre:rock', 'genres', 'rock'],
    ['subgenre:acid-rock', 'genres', 'acid-rock'],
    ['instrument:electric-bass', 'instruments', 'electric-bass'],
    ['key:e-flat', 'keys', 'e-flat'],
    ['progression:12', 'progressions', '12'],
    ['year:1982', 'years', '1982'],
    ['decade:1980s', 'decades', '1980s'],
  ])('%s is %s/%s', (id, table, row) => {
    expect(tableRowForNode(id)).toEqual({ table, row });
  });

  it('is its song for a song’s own globe event', () => {
    // The graph folds `event:song-x` onto `song:x`; so does the Table.
    expect(tableRowForNode('event:song-africa')).toEqual({
      table: 'songs',
      row: 'africa',
    });
    expect(tableRowForNode('event:song-')).toBeNull();
  });

  it('is nothing for a kind no table holds, or no id at all', () => {
    for (const id of [
      'vibe:dreamy',
      'mode:dorian',
      'era:digital',
      'pathway:blues-to-rock',
      'teach_day:aug-day-1',
      'artist:',
      ':toto',
      'toto',
      'song:africa:chart',
    ]) {
      expect(tableRowForNode(id), id).toBeNull();
    }
  });

  it('links to the row', () => {
    expect(paths.tableHrefForNode('artist:toto')).toBe(
      '/console/table/artists/toto',
    );
    expect(paths.tableHrefForNode('event:song-africa')).toBe(
      '/console/table/songs/africa',
    );
    expect(paths.tableHrefForNode('vibe:dreamy')).toBeNull();
  });
});

describe('an item’s row', () => {
  it('is in the table that holds its kind, for every kind a table holds', () => {
    for (const [kind, table] of Object.entries(TABLE_FOR_CONTENT_KIND)) {
      expect(tableRowForItem(kind as ContentKind, 'x')?.table, kind).toBe(
        table,
      );
    }
  });

  it.each([
    ['artist', 'toto', 'artists', 'toto'],
    ['globe_event', 'evt-woodstock', 'events', 'evt-woodstock'],
    ['globe_city', 'detroit', 'locations', 'detroit'],
    ['release', 'toto-toto-iv', 'records', 'toto-toto-iv'],
    ['chord_progression', '12', 'progressions', '12'],
    // A song's own globe event is the song, as its node is.
    ['globe_event', 'song-africa', 'songs', 'africa'],
  ] as const)('%s %s is %s/%s', (kind, slug, table, row) => {
    expect(tableRowForItem(kind, slug)).toEqual({ table, row });
  });

  it('is nothing for the other records, or a kind that is no kind', () => {
    for (const kind of [
      'activity_flow',
      'fundamentals_flow',
      'artist_location',
      'constructor',
    ]) {
      expect(tableRowForItem(kind as ContentKind, 'x'), kind).toBeNull();
    }
  });

  it('links to the row', () => {
    expect(paths.tableHrefForItem('globe_event', 'evt-woodstock')).toBe(
      '/console/table/events/evt-woodstock',
    );
    expect(paths.tableHrefForItem('artist_location', 'marvin gaye')).toBeNull();
  });
});

describe('a row’s node', () => {
  it('reads the node back from the URL', () => {
    expect(nodeIdForRow('artists', 'toto')).toBe('artist:toto');
    expect(nodeIdForRow('events', 'evt-woodstock')).toBe('event:evt-woodstock');
    expect(nodeIdForRow('records', 'toto-toto-iv')).toBe(
      'release:toto-toto-iv',
    );
    expect(nodeIdForRow('decades', '1980s')).toBe('decade:1980s');
    expect(nodeIdForRow('keys', 'c')).toBe('key:c');
  });

  it('leaves a genres row to the model: it may be a subgenre', () => {
    expect(nodeIdForRow('genres', 'rock')).toBeNull();
    expect(nodeIdForRow('artists', '')).toBeNull();
  });

  it('round-trips every table but genres', () => {
    for (const table of TABLE_IDS) {
      const node = nodeIdForRow(table, 'x1');
      if (table === 'genres') continue;
      expect(node && tableRowForNode(node), table).toEqual({
        table,
        row: 'x1',
      });
    }
  });
});

describe('an app page’s table', () => {
  it.each([
    ['/songs/africa', '', { table: 'songs', row: 'africa' }],
    ['/songs', '', { table: 'songs' }],
    ['/songs/setlists', '', { table: 'songs' }],
    ['/learn', '?tab=Songs', { table: 'songs' }],
    [
      '/atlas/globe',
      '?event=evt-woodstock',
      { table: 'events', row: 'evt-woodstock' },
    ],
    ['/atlas/globe', '?event=song-africa', { table: 'songs', row: 'africa' }],
    ['/atlas/globe', '?artist=Toto', { table: 'artists', row: 'toto' }],
    [
      '/atlas/globe',
      '?artist=Hall%20%26%20Oates',
      { table: 'artists', row: 'hall-and-oates' },
    ],
    [
      '/atlas/globe',
      '?place=city:detroit',
      { table: 'locations', row: 'detroit' },
    ],
    ['/atlas/globe', '?pathway=blues-to-rock', { table: 'events' }],
    ['/atlas/globe', '', { table: 'events' }],
    ['/atlas', '', { table: 'events' }],
  ])('%s%s → %o', (path, search, target) => {
    expect(tableForAppPage(path, search)).toEqual(target);
    expect(tableForAppPage(path, new URLSearchParams(search))).toEqual(target);
  });

  it('is none for a page no table holds', () => {
    // Lessons are not a category: they stay under "Other records".
    expect(tableForAppPage('/curriculum')).toBeNull();
    expect(tableForAppPage('/curriculum/rock/2')).toBeNull();
    expect(tableForAppPage('/office', '?day=aug-day-1')).toBeNull();
    expect(tableForAppPage('/')).toBeNull();
    expect(tableForAppPage('/learners')).toBeNull();
  });
});

describe('tablePaths', () => {
  it('re-exports the ids, so the pages and the bar keep one import', () => {
    expect(paths.TABLE_IDS).toBe(TABLE_IDS);
    expect(paths.tableRowForNode).toBe(tableRowForNode);
    expect(paths.tableRowForItem).toBe(tableRowForItem);
    expect(paths.tableForAppPage).toBe(tableForAppPage);
  });
});
