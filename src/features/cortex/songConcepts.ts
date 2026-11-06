import { keyColourOfSlugs } from '@/content/graph/keyColour';
import { artistSlug, keySlug } from '@/content/graph/slugs';
import type { Song } from '@/curriculum/types/songLibrary';

/**
 * What an activity can share with another: the things that turn two separate
 * activities into a connection. Song concepts are chosen here rather than read
 * from the console's edgesForSong: that drags in the city table, and its
 * "unverified" mark falls on billed artists wherever a song has no `primary`
 * credit, so filtering guesses out would drop Talking Heads from Psycho Killer.
 */

export type ConceptKind =
  | 'release'
  | 'artist'
  | 'person'
  | 'studio'
  | 'mode'
  | 'genre'
  | 'key'
  | 'instrument'
  | 'group';

export interface ConceptRef {
  id: string;
  kind: ConceptKind;
  label: string;
  /** Its page, where it has one. */
  route?: string;
  /**
   * A hub unless a Theory lesson is involved: 70 songs are in C and 465 are
   * major, which says little until a lesson on that key or mode meets them.
   */
  needsTheory?: boolean;
  /** A key's colour (Key of C, red); nothing else has one. */
  keyColour?: string;
}

/** Most specific first: of two concepts with the same members, the first stays. */
export const CONCEPT_SPECIFICITY: readonly ConceptKind[] = [
  'release',
  'artist',
  'person',
  'studio',
  'mode',
  'genre',
  'key',
  'instrument',
  'group',
];

const words = (slug: string) =>
  slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');

export const artistConcept = (name: string): ConceptRef => ({
  id: `artist:${artistSlug(name)}`,
  kind: 'artist',
  label: name,
  route: `/globe?artist=${encodeURIComponent(name)}`,
});

export const modeConcept = (mode: string, label?: string): ConceptRef => {
  const slug = mode.toLowerCase();
  return {
    id: `mode:${slug}`,
    kind: 'mode',
    label: label ?? words(slug),
    route: `/learn/keyboard/${encodeURIComponent(slug)}`,
    needsTheory: slug === 'ionian' || slug === 'aeolian',
  };
};

export const keyConcept = (slug: string): ConceptRef => ({
  id: `key:${slug}`,
  kind: 'key',
  label: `Key of ${slug[0].toUpperCase()}${
    slug.endsWith('-flat') ? '♭' : slug.endsWith('-sharp') ? '♯' : ''
  }`,
  needsTheory: true,
  keyColour: keyColourOfSlugs(slug) ?? undefined,
});

/** A song's tags and modes in the vocabulary lessons use. */
const LESSON_MODE: Readonly<Record<string, string>> = {
  major: 'ionian',
  minor: 'aeolian',
};

export const songConcepts = (
  song: Song,
  genre: (tag: string) => ConceptRef | null,
): ConceptRef[] => {
  const concepts: ConceptRef[] = [];
  const add = (concept: ConceptRef | null) => {
    if (concept && !concepts.some((c) => c.id === concept.id))
      concepts.push(concept);
  };

  // The billed artist always, by name: it's what the label printed.
  if (song.artist) add(artistConcept(song.artist));

  // Producers and writers only where the name is linked to a real artist:
  // engineers, arrangers and sidemen would join most of the library together.
  for (const credit of song.credits ?? []) {
    const id = credit.artistGlobeId?.trim();
    if (!id || credit.unverified) continue;
    if (credit.role !== 'producer' && credit.role !== 'songwriter') continue;
    add({
      id: `artist:${id}`,
      kind: 'person',
      label: credit.name,
      route: `/globe?artist=${encodeURIComponent(credit.name)}`,
    });
  }

  for (const release of song.releases ?? []) {
    if (release.unverified || !release.releaseId) continue;
    add({
      id: `release:${release.releaseId}`,
      kind: 'release',
      label: words(release.releaseId),
    });
  }

  const studio = song.session;
  if (studio?.studioId && !studio.unverified) {
    add({
      id: `studio:${studio.studioId}`,
      kind: 'studio',
      label: studio.studio ?? words(studio.studioId),
    });
  }

  for (const tag of song.genreTags ?? []) add(genre(tag));

  if (song.mode) add(modeConcept(LESSON_MODE[song.mode] ?? song.mode));

  const tonic = keySlug(song.key?.trim().split(/\s+/)[0] ?? '');
  if (tonic) add(keyConcept(tonic));

  return concepts;
};
