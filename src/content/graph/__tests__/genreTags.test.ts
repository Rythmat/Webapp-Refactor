import { describe, expect, it } from 'vitest';
import {
  IGNORED_GENRE_TAGS,
  INSTRUMENT_TAGS,
  resolveGenreTag,
  SUBGENRE_PARENT,
  TAG_TO_GENRE,
  TAG_TO_SUBGENRE,
  UNPLACED_GENRE_TAGS,
} from '../genreTags';
import { GENRES, getGenre, TAUGHT_GENRES } from '../genres';

describe('genre registry', () => {
  it('has unique ids', () => {
    const ids = GENRES.map((g) => g.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('teaches the twelve the song library normalises to', () => {
    expect(TAUGHT_GENRES.map((g) => g.id).sort()).toEqual(
      [
        'blues',
        'electronic',
        'folk',
        'funk',
        'hip-hop',
        'jam-band',
        'jazz',
        'latin',
        'pop',
        'reggae',
        'rnb',
        'rock',
      ].sort(),
    );
  });

  it('knows Classical without teaching it', () => {
    expect(getGenre('classical')?.taught).toBe(false);
  });
});

describe('genre tag resolution', () => {
  it('sends every subgenre to a genre that exists', () => {
    const orphans = Object.entries(SUBGENRE_PARENT)
      .filter(([, parent]) => !getGenre(parent))
      .map(([sub, parent]) => `${sub} → ${parent}`);
    expect(orphans).toEqual([]);
  });

  it('points every tag at a subgenre that has a parent', () => {
    const dangling = Object.entries(TAG_TO_SUBGENRE)
      .filter(([, sub]) => !SUBGENRE_PARENT[sub])
      .map(([tag, sub]) => `${tag} → ${sub}`);
    expect(dangling).toEqual([]);
  });

  it('sends every direct tag to a genre that exists', () => {
    const bad = Object.entries(TAG_TO_GENRE)
      .filter(([, g]) => !getGenre(g))
      .map(([tag, g]) => `${tag} → ${g}`);
    expect(bad).toEqual([]);
  });

  it('walks a subgenre up to its genre', () => {
    expect(resolveGenreTag('Art Rock')).toEqual({
      genre: 'rock',
      subgenre: 'art-rock',
    });
    expect(resolveGenreTag('Qawwali')).toEqual({
      genre: 'south-asian',
      subgenre: 'qawwali',
    });
  });

  it('answers "unknown" rather than guessing', () => {
    // 'World Music' says how far the music travelled, not what it is.
    expect(resolveGenreTag('World Music')).toBeNull();
    expect(resolveGenreTag(UNPLACED_GENRE_TAGS[0])).toBeNull();
    expect(resolveGenreTag('Not A Real Genre')).toBeNull();
    expect(resolveGenreTag('  ')).toBeNull();
  });

  it('never lists a tag as both placed and unplaced', () => {
    const placed = new Set([
      ...Object.keys(TAG_TO_SUBGENRE),
      ...Object.keys(TAG_TO_GENRE),
    ]);
    const both = [
      ...UNPLACED_GENRE_TAGS,
      ...IGNORED_GENRE_TAGS,
      ...INSTRUMENT_TAGS,
    ].filter((t) => placed.has(t));
    expect(both).toEqual([]);
  });

  it('keeps instruments out of genre space', () => {
    // Marimba is an instrument. The graph has a node kind for that, and an
    // instrument link says more than a genre guess would.
    expect(INSTRUMENT_TAGS).toContain('Marimba');
    expect(resolveGenreTag('Marimba')).toBeNull();
    expect(resolveGenreTag('Oud Music')).toBeNull();
  });

  it('is blind to accents, which broke Tropicália once', () => {
    expect(resolveGenreTag('Tropicália')?.genre).toBe('latin');
  });

  it('places the European traditions that had no umbrella', () => {
    expect(resolveGenreTag('Fado')?.genre).toBe('south-european');
    expect(resolveGenreTag('Chanson')?.genre).toBe('west-european');
  });
});
