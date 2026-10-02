import { describe, expect, it } from 'vitest';
import type { EntityId, EntityKind } from '@/content/graph/types';
import {
  boundedDistance,
  type EntityEntry,
  rankEntities,
} from '../rankEntities';

const artist = (
  slug: string,
  name: string,
  aliases?: string[],
): EntityEntry => ({
  id: `artist:${slug}` as EntityId,
  kind: 'artist' as EntityKind,
  slug,
  name,
  aliases,
  source: 'repo',
});

const ENTRIES = [
  artist('andy-grammer', 'Andy Grammer', ['Andy Grammar']),
  artist('hall-and-oates', 'Hall & Oates', ['Daryl Hall & John Oates']),
  artist('stevie-wonder', 'Stevie Wonder'),
  artist('stevie-nicks', 'Stevie Nicks'),
  artist('wonder-mike', 'Wonder Mike'),
  artist('sinead-oconnor', 'Sinéad O’Connor'),
  artist('the-doors', 'The Doors'),
  artist('toto', 'Toto'),
];

const names = (q: string, opts = {}) =>
  rankEntities(ENTRIES, q, opts).map((r) => `${r.entry.name}:${r.tier}`);

describe('ranking what the author typed', () => {
  it('puts the exact name first', () => {
    expect(names('toto')[0]).toBe('Toto:exact');
  });

  it('finds the record an alias belongs to, and says it was the alias', () => {
    const [top] = rankEntities(ENTRIES, 'Andy Grammar');
    expect(top.entry.slug).toBe('andy-grammer');
    expect(top.tier).toBe('alias');
    expect(top.matched).toBe('Andy Grammar');
  });

  it('folds & and "and", accents and apostrophes', () => {
    expect(names('hall and oates')[0]).toBe('Hall & Oates:normalized');
    expect(names('sinead oconnor')[0]).toBe('Sinéad O’Connor:normalized');
  });

  it('ranks a prefix over a word over an interior match', () => {
    expect(names('wonder')).toEqual([
      'Wonder Mike:prefix',
      'Stevie Wonder:word',
    ]);
  });

  it('lets context lift a record within its tier', () => {
    expect(names('stevie')).toEqual([
      'Stevie Nicks:prefix',
      'Stevie Wonder:prefix',
    ]);
    expect(
      names('stevie', { context: new Set(['artist:stevie-wonder']) }),
    ).toEqual(['Stevie Wonder:prefix', 'Stevie Nicks:prefix']);
  });

  it('forgives a typo in a long enough name', () => {
    expect(names('stevie wondr')[0]).toBe('Stevie Wonder:fuzzy');
    // Short queries get no fuzzy matches: "tto" is not Toto.
    expect(names('tto')).toEqual([]);
  });

  it('finds by slug or id', () => {
    expect(names('the-doors')[0]).toBe('The Doors:exact');
    expect(names('artist:toto')[0]).toBe('Toto:exact');
  });

  it('finds nothing for nothing', () => {
    expect(names('  ')).toEqual([]);
  });
});

describe('the bounded edit distance', () => {
  it('counts edits and gives up past the bound', () => {
    expect(boundedDistance('grammer', 'grammar', 1)).toBe(1);
    expect(boundedDistance('abc', 'xyz', 2)).toBe(Infinity);
    expect(boundedDistance('toto', 'toto', 0)).toBe(0);
  });
});
