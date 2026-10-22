import type { EntityId, GraphNode } from '@/content/graph/types';
import type { LessonCatalog } from './catalog';
import { kindOf, linked, slugOf, type LessonGraph } from './graphQueries';
import type { ProducerOption } from './types';

/**
 * The Producer's Studio tutorial, chosen by the focus's genre.
 *
 * An artist's genres are its own `in_genre` edges and those of the songs it
 * performed; a city's are the scenes it is known for (`scene_of`). A subgenre
 * counts for itself and for the genre above it (`in_genre` subgenre → genre),
 * so "house" can pick the house tutorial while "soul" falls to its genre.
 */

/** Genre id → tutorial id. Genres not listed get `DEFAULT_TUTORIAL`. */
export const GENRE_TUTORIAL: Readonly<Record<string, string>> = {
  jazz: 'jazz-color-your-chords',
  'hip-hop': 'hiphop-build-the-beat',
  // Pop's lesson (Flip a sample, on the Chops sampler) went with the
  // sampler (owner, 2026-10-22): pop takes DEFAULT_TUTORIAL.
  electronic: 'edm-design-the-drop',
  rnb: 'rnb-mix-and-polish',
  funk: 'rnb-mix-and-polish',
  rock: 'indie-movement-and-dynamics',
  folk: 'indie-movement-and-dynamics',
  blues: 'indie-movement-and-dynamics',
  'jam-band': 'indie-movement-and-dynamics',
};

/** Subgenres with a tutorial closer than their genre's. */
export const SUBGENRE_TUTORIAL: Readonly<Record<string, string>> = {
  house: 'house-make-it-pump',
  'acid-house': 'house-make-it-pump',
  techno: 'house-make-it-pump',
  'minimal-techno': 'house-make-it-pump',
  disco: 'house-make-it-pump',
};

export const DEFAULT_TUTORIAL = 'make-first-track';

interface GenreVote {
  node: GraphNode;
  votes: number;
}

/** The focus's genres and subgenres, most often stated first. */
export const focusGenres = (
  graph: LessonGraph,
  focusId: EntityId,
): GraphNode[] => {
  const votes = new Map<EntityId, GenreVote>();
  const vote = (node: GraphNode, weight: number) => {
    const current = votes.get(node.id);
    votes.set(node.id, { node, votes: (current?.votes ?? 0) + weight });
    // A subgenre also counts, less, for the genre it sits under.
    if (node.kind === 'subgenre')
      for (const parent of linked(graph, node.id, 'in_genre', 'out'))
        if (parent.kind === 'genre') {
          const p = votes.get(parent.id);
          votes.set(parent.id, {
            node: parent,
            votes: (p?.votes ?? 0) + weight / 2,
          });
        }
  };
  if (kindOf(focusId) === 'place') {
    for (const scene of linked(graph, focusId, 'scene_of', 'out'))
      vote(scene, 2);
  } else {
    // The artist's own genres, and each of its songs' — so an artist filed
    // under several genres leans toward the one its music is in.
    for (const genre of linked(graph, focusId, 'in_genre', 'out'))
      vote(genre, 2);
    for (const song of linked(graph, focusId, 'performed_by', 'in', {
      guesses: true,
    }))
      for (const genre of linked(graph, song.id, 'in_genre', 'out'))
        vote(genre, 1);
  }
  // A stable sort: a tie keeps the order the genres were met in, which is
  // the best-connected first (as `linked` returns them).
  return [...votes.values()]
    .sort((a, b) => b.votes - a.votes)
    .map((v) => v.node);
};

/**
 * Every tutorial, the focus's genre pick first (with the genre that chose
 * it), then the rest in catalog order.
 */
export const producerOptions = (
  graph: LessonGraph,
  catalog: LessonCatalog,
  focusId: EntityId,
): ProducerOption[] => {
  let pickId = DEFAULT_TUTORIAL;
  let pickGenre: string | undefined;
  for (const genre of focusGenres(graph, focusId)) {
    const slug = slugOf(genre.id);
    const id =
      genre.kind === 'subgenre'
        ? SUBGENRE_TUTORIAL[slug]
        : GENRE_TUTORIAL[slug];
    if (id && catalog.tutorials.some((t) => t.id === id)) {
      pickId = id;
      pickGenre = genre.label;
      break;
    }
  }
  const pick = catalog.tutorials.find((t) => t.id === pickId);
  const rest = catalog.tutorials.filter((t) => t.id !== pickId);
  return [
    ...(pick
      ? [{ tutorial: pick, ...(pickGenre ? { genre: pickGenre } : {}) }]
      : []),
    ...rest.map((tutorial) => ({ tutorial })),
  ];
};
