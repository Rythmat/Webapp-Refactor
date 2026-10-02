import { describe, expect, it } from 'vitest';
import {
  getPath,
  jsonRemainder,
  parseRefPath,
  readSteps,
  setPath,
  writeSteps,
} from './bodyPaths';

describe('the form’s dot paths', () => {
  it('read and write nested fields, making what is missing', () => {
    const body = { location: { city: 'Detroit' } };
    expect(getPath(body, 'location.city')).toBe('Detroit');
    expect(getPath(body, 'location.country')).toBeUndefined();
    expect(getPath(body, 'nope.deeper')).toBeUndefined();
    expect(setPath({}, 'location.city', 'Memphis')).toEqual({
      location: { city: 'Memphis' },
    });
    // A copy: the body read from the server is never changed in place.
    const next = setPath(body, 'location.city', 'Memphis');
    expect(body.location.city).toBe('Detroit');
    expect(next).toEqual({ location: { city: 'Memphis' } });
  });

  it('leave the form’s keys out of the JSON half', () => {
    expect(jsonRemainder({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ b: 2 });
  });

  // Loading the kind specs loads every kind's editor: over a second alone,
  // and past the default 5 s when the whole suite runs at once.
  it('are still what the kind specs export', async () => {
    const kinds = await import('@/features/admin/content/kinds');
    expect(kinds.getPath).toBe(getPath);
    expect(kinds.setPath).toBe(setPath);
    expect(kinds.jsonRemainder).toBe(jsonRemainder);
  }, 30_000);
});

describe('reference paths', () => {
  it('spell elements and lists as REF_PATHS and the linker do', () => {
    expect(parseRefPath('basedInPlaceId')).toEqual({
      steps: ['basedInPlaceId'],
      each: false,
    });
    expect(parseRefPath('credits[3].artistGlobeId')).toEqual({
      steps: ['credits', 3, 'artistGlobeId'],
      each: false,
    });
    expect(parseRefPath('artistIds[]')).toEqual({
      steps: ['artistIds'],
      each: true,
    });
    expect(parseRefPath('born.placeId')).toEqual({
      steps: ['born', 'placeId'],
      each: false,
    });
  });

  it('refuse what no single write can address', () => {
    // "Every element" is a rule for readers, not somewhere to write.
    expect(parseRefPath('credits[].name')).toBeNull();
    expect(parseRefPath('')).toBeNull();
    expect(parseRefPath('a..b')).toBeNull();
    expect(parseRefPath('a[x]')).toBeNull();
    expect(parseRefPath('a[][]')).toBeNull();
    // Not a field of a body, and a write there would reach a prototype.
    expect(parseRefPath('__proto__.polluted')).toBeNull();
    expect(parseRefPath('constructor')).toBeNull();
    expect(parseRefPath('born.prototype')).toBeNull();
  });

  it('read through elements', () => {
    const body = { credits: [{ name: 'A' }, { name: 'B' }] };
    expect(readSteps(body, ['credits', 1, 'name'])).toBe('B');
    expect(readSteps(body, ['credits', 5, 'name'])).toBeUndefined();
    expect(readSteps(body, ['credits', 'name'])).toBeUndefined();
    // Only what the body holds, never what every object inherits.
    expect(readSteps({}, ['toString'])).toBeUndefined();
    expect(readSteps({ a: {} }, ['a', 'hasOwnProperty'])).toBeUndefined();
  });

  it('write into an element that is there, as a copy', () => {
    const body = { credits: [{ name: 'A' }, { name: 'B' }] };
    const next = writeSteps(body, ['credits', 1, 'artistGlobeId'], 'b');
    expect(next).toEqual({
      credits: [{ name: 'A' }, { name: 'B', artistGlobeId: 'b' }],
    });
    expect(body.credits[1]).toEqual({ name: 'B' });
    // Untouched elements are shared, not copied.
    expect(next!.credits[0]).toBe(body.credits[0]);
  });

  it('make a missing object, but never grow or invent a list', () => {
    expect(writeSteps({}, ['session', 'studioId'], 'hitsville')).toEqual({
      session: { studioId: 'hitsville' },
    });
    expect(writeSteps({ credits: [] }, ['credits', 0, 'name'], 'A')).toBeNull();
    expect(writeSteps({}, ['credits', 0, 'name'], 'A')).toBeNull();
    // A field of a string is nowhere.
    expect(writeSteps({ artist: 'Toto' }, ['artist', 'id'], 'toto')).toBeNull();
    // Null is a value like any other.
    expect(writeSteps({ year: 1982 }, ['year'], null)).toEqual({ year: null });
  });
});
