import type { Anthem } from './types';

/**
 * Anthem bank — the "song we return to" for each theme. Stub for now;
 * the full anthem catalog with linked recordings + lyric sheets lands
 * when the Idea Bank surface ships.
 */
export const ANTHEMS: Anthem[] = [
  {
    id: 'anthem-glory',
    title: 'Glory',
    artist: 'Common & John Legend',
    year: 2014,
    themeIds: ['theme-january', 'theme-february'],
    notes: 'From the Selma soundtrack. Pairs well with the vision-cypher seed.',
  },
  {
    id: 'anthem-strange-fruit',
    title: 'Strange Fruit',
    artist: 'Billie Holiday',
    year: 1939,
    themeIds: ['theme-march'],
    notes: 'Handle with care. Restraint and silence are part of the pedagogy.',
  },
  {
    id: 'anthem-a-change',
    title: 'A Change Is Gonna Come',
    artist: 'Sam Cooke',
    year: 1964,
    themeIds: ['theme-january', 'theme-february'],
  },
];
