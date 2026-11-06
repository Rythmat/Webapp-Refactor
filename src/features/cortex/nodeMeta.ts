import type { WebNode } from './buildWeb';

/** How a node reads, in any view of the Cortex: its colour, its name, its status. */

/**
 * A node's colour: white, unless it has a key, and then the key's own colour
 * as the rest of the app gives it (owner, 2026-11-04): Key of C is red, a song
 * in F minor A♭'s indigo.
 */
export const nodeColour = (node: Pick<WebNode, 'keyColour'>): string =>
  node.keyColour ?? '#ffffff';

export const KIND_NAME: Readonly<Record<WebNode['kind'], string>> = {
  song: 'Song',
  theory: 'Theory lesson',
  lesson: 'Genre lesson',
  audio: 'Audio lesson',
  anatomy: 'Anatomy lesson',
  technique: 'Technique',
  literacy: 'Music Literacy',
  game: 'Arcade game',
  project: 'Studio project',
  tutorial: 'Studio lesson',
  artist: 'Artist',
  place: 'Place',
  event: 'Globe event',
  person: 'Artist',
  release: 'Record',
  studio: 'Recording studio',
  mode: 'Mode',
  key: 'Key',
  genre: 'Genre',
  instrument: 'Instrument',
  group: 'Shared',
};

const UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60],
  ['month', 30 * 24 * 60],
  ['day', 24 * 60],
  ['hour', 60],
  ['minute', 1],
];

/** "3 days ago"; exported for tests. */
export const timeAgo = (ms: number, now = Date.now()): string => {
  const minutes = Math.round((now - ms) / 60_000);
  if (minutes < 1) return 'just now';
  const format = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const [unit, size] of UNITS) {
    if (minutes >= size)
      return format.format(-Math.floor(minutes / size), unit);
  }
  return 'just now';
};

/** A bright node isn't always a lesson finished: a song is saved. */
const DONE_WORD: Partial<Record<WebNode['kind'], string>> = {
  song: 'Saved',
  project: 'Saved',
  game: 'Cleared a level',
};

export const status = (node: WebNode): string | null => {
  if (node.role !== 'activity') return null;
  if (node.done) {
    const word = DONE_WORD[node.kind] ?? 'Finished';
    return node.doneAt > 0 ? `${word} ${timeAgo(node.doneAt)}` : word;
  }
  return node.lastAt > 0 ? `Last here ${timeAgo(node.lastAt)}` : null;
};
