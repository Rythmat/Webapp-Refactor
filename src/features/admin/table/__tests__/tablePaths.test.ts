import { describe, expect, it } from 'vitest';
import { AdminRoutes } from '@/constants/routes';
import {
  CATEGORY_NAV,
  categoryOf,
  firstTableHref,
  isCortexGraphPath,
  isCortexSectionPath,
  isTableId,
  TABLE_IDS,
  tableHref,
} from '../tablePaths';

/**
 * The Table's addresses. The pills are the owner's words, in his order
 * (29 Sep 2026); a rename or a reorder is his call, so it fails here first.
 */

describe('the tables', () => {
  it('are the thirteen the design names', () => {
    expect([...TABLE_IDS]).toEqual([
      'artists',
      'songs',
      'genres',
      'locations',
      'instruments',
      'events',
      'records',
      'studios',
      'labels',
      'keys',
      'progressions',
      'years',
      'decades',
    ]);
  });

  it('knows a table id from anything else', () => {
    for (const id of TABLE_IDS) expect(isTableId(id), id).toBe(true);
    expect(isTableId('recording')).toBe(false);
    expect(isTableId('artist')).toBe(false);
    expect(isTableId('Artists')).toBe(false);
    expect(isTableId('')).toBe(false);
    expect(isTableId(undefined)).toBe(false);
    // Only its own entries: not whatever an array inherits.
    expect(isTableId('constructor')).toBe(false);
  });

  it('links to a table and to one of its rows', () => {
    expect(tableHref('artists')).toBe('/console/table/artists');
    expect(tableHref('songs', 'africa')).toBe('/console/table/songs/africa');
    // Row keys are encoded, as every console route's params are.
    expect(tableHref('keys', 'e flat')).toBe('/console/table/keys/e%20flat');
    expect(AdminRoutes.table()).toBe('/console/table');
    expect(AdminRoutes.tableList({ table: 'songs' }, { q: 'toto' })).toBe(
      '/console/table/songs?q=toto',
    );
  });
});

describe('the category pills', () => {
  it('are the owner’s ten, in his order and wording', () => {
    expect(CATEGORY_NAV.map((category) => category.label)).toEqual([
      'Artist',
      'Songs',
      'Genre',
      'Location',
      'Instruments',
      'Events',
      'Recording',
      'Key',
      'Chord Progression',
      'Year',
    ]);
  });

  it('cover every table exactly once', () => {
    const covered = CATEGORY_NAV.flatMap((category) => category.tables);
    expect([...covered].sort()).toEqual([...TABLE_IDS].sort());
  });

  it('open on a table of their own', () => {
    for (const category of CATEGORY_NAV) {
      expect(category.tables, category.label).toContain(category.defaultTable);
      expect(category.defaultTable, category.label).toBe(category.tables[0]);
    }
  });

  it('split Recording and Year into their views', () => {
    const views = (label: string) =>
      CATEGORY_NAV.find((category) => category.label === label)?.views;
    expect(views('Recording')).toEqual([
      { table: 'records', label: 'Records' },
      { table: 'studios', label: 'Studios' },
      { table: 'labels', label: 'Labels' },
    ]);
    expect(views('Year')).toEqual([
      { table: 'years', label: 'Years' },
      { table: 'decades', label: 'Decades' },
    ]);
    // Views name their category's tables, in order; one-table categories
    // have none.
    for (const category of CATEGORY_NAV) {
      if (category.views) {
        expect(category.views.map((v) => v.table)).toEqual(category.tables);
      } else {
        expect(category.tables, category.label).toHaveLength(1);
      }
    }
  });

  it('find the category a table belongs to', () => {
    expect(categoryOf('artists').label).toBe('Artist');
    expect(categoryOf('progressions').label).toBe('Chord Progression');
    expect(categoryOf('records').label).toBe('Recording');
    expect(categoryOf('studios').label).toBe('Recording');
    expect(categoryOf('labels').label).toBe('Recording');
    expect(categoryOf('years').label).toBe('Year');
    expect(categoryOf('decades').label).toBe('Year');
    for (const id of TABLE_IDS) {
      expect(categoryOf(id).tables, id).toContain(id);
    }
  });
});

describe('the Cortex section', () => {
  it('links "the tables" to the first one, not to the bare Table', () => {
    // The bare /console/table opens the section's graph now.
    expect(firstTableHref()).toBe('/console/table/artists');
  });

  it('knows the graph’s pages, a row beside the graph included', () => {
    for (const path of [
      '/console/cortex',
      '/console/cortex/integrity',
      '/console/cortex/links',
      '/console/cortex/artists/toto',
    ]) {
      expect(isCortexGraphPath(path), path).toBe(true);
      expect(isCortexSectionPath(path), path).toBe(true);
    }
  });

  it('counts the tables in the section, but not as the graph', () => {
    for (const path of [
      '/console/table',
      '/console/table/songs',
      '/console/table/records/abbey-road',
    ]) {
      expect(isCortexGraphPath(path), path).toBe(false);
      expect(isCortexSectionPath(path), path).toBe(true);
    }
  });

  it('leaves out everything else, and look-alikes', () => {
    for (const path of [
      '/console',
      '/console/content/graph',
      '/console/content/songs/africa',
      '/console/users',
      '/console/cortexes',
      '/console/tables',
      '/cortex',
    ]) {
      expect(isCortexSectionPath(path), path).toBe(false);
    }
  });
});
