import type { EntityId, GraphNode } from '@/content/graph/types';
import { SLUG_TO_CURRICULUM_GENRE } from '@/curriculum/bridge/genreIdMap';
import type { Song } from '@/curriculum/types/songLibrary';
import type { LessonCatalog } from './catalog';
import { kindOf, linked, slugOf, type LessonGraph } from './graphQueries';
import { focusGenres } from './producerTutorial';
import type { PerformerOption } from './types';

/**
 * The Performer's Learn lesson: a song connected to the focus, played in its
 * own key and mode (`song:<id>:lesson` opens the Theory lesson for it), else
 * the focus genre's first curriculum level (`curriculum:<genre>:L1`).
 *
 * Learn's free tier is the C major lesson; every other Theory lesson and every
 * genre lesson needs Premium, which the teacher sees on the option.
 */

/** Songs offered, at most. */
const MAX_SONG_LESSONS = 6;

const MODE_NAME: Readonly<Record<string, { en: string; es: string }>> = {
  major: { en: 'major', es: 'mayor' },
  ionian: { en: 'major', es: 'mayor' },
  minor: { en: 'minor', es: 'menor' },
  aeolian: { en: 'minor', es: 'menor' },
  dorian: { en: 'Dorian', es: 'dórico' },
  phrygian: { en: 'Phrygian', es: 'frigio' },
  lydian: { en: 'Lydian', es: 'lidio' },
  mixolydian: { en: 'Mixolydian', es: 'mixolidio' },
  locrian: { en: 'Locrian', es: 'locrio' },
};

/** "C major" → "C", "B♭ minor" → "B♭". */
const tonicOf = (song: Song): string => song.key.trim().split(/\s+/)[0] ?? '';

/** Free accounts open the C major (C Ionian) lesson only. */
const songLessonIsFree = (song: Song): boolean =>
  (song.mode === 'major' || song.mode === 'ionian') &&
  tonicOf(song).toLowerCase() === 'c';

const songOption = (song: Song): PerformerOption | null => {
  const mode = MODE_NAME[song.mode];
  const tonic = tonicOf(song);
  if (!mode || !tonic) return null;
  return {
    activityRef: `song:${song.id}:lesson`,
    label: {
      en: `“${song.title}” — ${tonic} ${mode.en}`,
      es: `“${song.title}” — ${tonic} ${mode.es}`,
    },
    needsPremium: !songLessonIsFree(song),
    songId: song.id,
  };
};

/** The focus's songs: an artist's own, else a city's and its artists'. */
const songsFor = (graph: LessonGraph, focusId: EntityId): GraphNode[] => {
  const songs: GraphNode[] = [];
  const add = (nodes: GraphNode[]) => {
    for (const n of nodes) if (!songs.some((s) => s.id === n.id)) songs.push(n);
  };
  if (kindOf(focusId) === 'artist') {
    add(linked(graph, focusId, 'performed_by', 'in'));
    add(linked(graph, focusId, 'written_by', 'in'));
    add(linked(graph, focusId, 'performed_by', 'in', { guesses: true }));
  } else {
    add(linked(graph, focusId, 'recorded_in', 'in'));
    for (const artist of [
      ...linked(graph, focusId, 'born_in', 'in'),
      ...linked(graph, focusId, 'based_in', 'in'),
    ])
      add(linked(graph, artist.id, 'performed_by', 'in'));
  }
  return songs;
};

export const performerOptions = (
  graph: LessonGraph,
  catalog: LessonCatalog,
  focusId: EntityId,
): PerformerOption[] => {
  const options: PerformerOption[] = [];
  for (const node of songsFor(graph, focusId)) {
    const song = catalog.songs.get(slugOf(node.id));
    const option = song ? songOption(song) : null;
    if (option) options.push(option);
    if (options.length >= MAX_SONG_LESSONS) break;
  }
  // The genre's curriculum, as the last option (or the only one).
  for (const genre of focusGenres(graph, focusId)) {
    if (genre.kind !== 'genre') continue;
    // The slug form (`hip-hop`, not `HIP HOP`): the resolver reads both, and
    // it keeps spaces and '&' out of the launch URL.
    const slug = slugOf(genre.id);
    if (!SLUG_TO_CURRICULUM_GENRE[slug]) continue;
    options.push({
      activityRef: `curriculum:${slug}:L1`,
      label: {
        en: `${genre.label} — Level 1`,
        es: `${genre.label} — Nivel 1`,
      },
      needsPremium: true,
    });
    break;
  }
  return options;
};
