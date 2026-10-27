import {
  BASS_SUGGESTIONS,
  GUITAR_SUGGESTIONS,
  KEYBOARD_SUGGESTIONS,
  UKULELE_SUGGESTIONS,
  learnSuggestionsFor,
  rotationOf,
  type PromptSuggestion,
} from '@/components/ClassroomLayout/home/promptSuggestions';
import { GENRE_COURSES } from '@/components/learn/genreCourses';
import { techniqueDataFor } from '@/components/learn/techniqueCatalog';
import { CurriculumRoutes, SongRoutes } from '@/constants/routes';
import { getAllSongs } from '@/curriculum/data/songs';
import type { Song } from '@/curriculum/types/songLibrary';
import type { GenreReadiness } from '@/features/learn/genreReadiness';
import type { LearnTab } from '@/features/learn/learnPaths';
import type { LearnInstrument } from '@/features/learn/useInstrumentStore';

// ── The Learn tab pages' prompt suggestions (owner, 2026-10-25) ────────────
// Each tab page's prompt bar suggests only what that page shows, on its
// instrument: Songs its songs, Genre its courses, Theory its lessons,
// Technique its tiles. Learn's own page keeps the instrument's whole list
// (learnSuggestionsFor). Its own module, not promptSuggestions.ts: Songs'
// list is built from the song library, which Home must not load.

const teach = (text: string, route: string): PromptSuggestion => ({
  text,
  target: 'learn',
  route,
});

/** How each instrument is named in a prompt. */
const ON: Record<LearnInstrument, string> = {
  piano: 'on piano',
  guitar: 'on guitar',
  bass: 'on bass',
  ukulele: 'on ukulele',
};

/** Songs: the songs the page lists (all of them, or as its filters leave
 *  them), on the instrument (its chart there). */
const songSuggestions = (instrument: LearnInstrument, songs: readonly Song[]) =>
  songs.map((song) =>
    teach(
      `Teach me ${song.title} by ${song.artist} ${ON[instrument]}`,
      SongRoutes.song({ songId: song.id }),
    ),
  );

/** Genre: the courses its tiles open (they teach at the keyboard, so the
 *  prompts name no instrument). */
const GENRE_SUGGESTIONS: PromptSuggestion[] = GENRE_COURSES.map((course) =>
  teach(
    `Teach me ${course.title}`,
    CurriculumRoutes.genre({ genre: course.slug }),
  ),
);

/**
 * A genre lesson's sections, as every course's levels have them: A Melody,
 * B Chords, C Bass, D Performance. The Genre pages' pills (owner,
 * 2026-10-25).
 */
export const GENRE_SECTIONS = [
  { id: 'A', label: 'Melody', ask: (genre: string) => `${genre} melodies` },
  { id: 'B', label: 'Chords', ask: (genre: string) => `${genre} chords` },
  { id: 'C', label: 'Bass', ask: (genre: string) => `${genre} bass lines` },
  {
    id: 'D',
    label: 'Performance',
    ask: (genre: string) => `to perform ${genre}`,
  },
] as const;

export type GenreSectionId = (typeof GENRE_SECTIONS)[number]['id'];

/** A course's levels, named as a prompt says them (owner, 2026-10-25). */
const COURSE_LEVELS = [
  { level: '1', name: 'beginner' },
  { level: '2', name: 'intermediate' },
  { level: '3', name: 'advanced' },
] as const;

/**
 * Genre, one section: it in every course's every level where it is built,
 * the level said as beginner, intermediate or advanced, opening on that
 * section there.
 */
const genreSectionSuggestions = (id: GenreSectionId, ready: GenreReadiness) => {
  const section = GENRE_SECTIONS.find((s) => s.id === id)!;
  return GENRE_COURSES.flatMap((course) =>
    COURSE_LEVELS.filter(({ level }) =>
      ready.section(course.slug, Number(level), id),
    ).map(({ level, name }) =>
      teach(
        `Teach me ${section.ask(`${name} ${course.title}`)}`,
        `${CurriculumRoutes.genreLevel({ genre: course.slug, level })}?section=${id}`,
      ),
    ),
  );
};

/** A genre course's own route (/curriculum/funk): its slug, else null. */
const courseOf = (route: string) =>
  GENRE_COURSES.find(
    (course) => route === CurriculumRoutes.genre({ genre: course.slug }),
  )?.slug ?? null;

/**
 * Genre: with a section chosen, its built lessons; with none, the built
 * courses and every built section's lessons (owner, 2026-10-25).
 */
const genreSuggestions = (
  ready: GenreReadiness,
  section: GenreSectionId | null,
): PromptSuggestion[] =>
  section
    ? genreSectionSuggestions(section, ready)
    : [
        ...GENRE_SUGGESTIONS.filter((s) => ready.course(courseOf(s.route)!)),
        ...GENRE_SECTIONS.flatMap((s) => genreSectionSuggestions(s.id, ready)),
      ];

/** One from each list in turn, until all run out. */
function interleave<T>(lists: readonly (readonly T[])[]): T[] {
  const out: T[] = [];
  const longest = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < longest; i++) {
    for (const list of lists) if (i < list.length) out.push(list[i]);
  }
  return out;
}

/** Theory: the instrument's Theory lessons from its list (/learn/…). */
const theorySuggestions = (list: readonly PromptSuggestion[]) =>
  list.filter((s) => /^\/learn\/[^?]/.test(s.route));
const THEORY_SUGGESTIONS: Record<LearnInstrument, PromptSuggestion[]> = {
  piano: theorySuggestions(KEYBOARD_SUGGESTIONS),
  guitar: theorySuggestions(GUITAR_SUGGESTIONS),
  bass: theorySuggestions(BASS_SUGGESTIONS),
  ukulele: theorySuggestions(UKULELE_SUGGESTIONS),
};

/** Technique: its tiles (none on guitar yet, so its bar suggests nothing),
 *  the instrument named unless the tile's title already does. */
const techniqueSuggestions = (instrument: LearnInstrument) =>
  techniqueDataFor(instrument).map((item) =>
    teach(
      /\b(piano|keyboard|guitar)\b/i.test(item.title)
        ? `Teach me ${item.title}`
        : `Teach me ${item.title} ${ON[instrument]}`,
      item.route,
    ),
  );

/**
 * Learn's own page, no pill (owner, 2026-10-25): everything the tab pages
 * suggest (songs, built genre lessons, Theory, Technique) and the rest of
 * the instrument's list (a Studio song idea, the Arcade's games, reading
 * music), each shuffled and taking turns, so the song library's hundreds
 * don't crowd the rest out. A genre course not built yet is left out; none
 * is suggested until which are is known.
 */
export function allLearnSuggestions(
  instrument: LearnInstrument,
  ready: GenreReadiness | null,
  songs: readonly Song[] = getAllSongs(),
): PromptSuggestion[] {
  const kinds = [
    songSuggestions(instrument, songs),
    ready ? genreSuggestions(ready, null) : [],
    THEORY_SUGGESTIONS[instrument],
    techniqueSuggestions(instrument),
  ];
  const taken = new Set(kinds.flat().map((s) => s.route));
  const rest = learnSuggestionsFor(instrument).filter(
    (s) => !taken.has(s.route) && courseOf(s.route) === null,
  );
  return interleave([...kinds, rest].map((list) => rotationOf(list)));
}

/**
 * The prompt bar's suggestions on a Learn page: its tab's, or everything on
 * Learn's own page (allLearnSuggestions, already in its rotation order). `songs`: the songs the Songs
 * page shows under its filters (every song when not given). `genreSection`:
 * the Genre page's chosen section, its lessons in place of the courses;
 * `genreReady`: which of them are built (only those are suggested).
 */
export function learnPageSuggestions(
  instrument: LearnInstrument,
  tab: LearnTab | undefined,
  {
    songs = getAllSongs(),
    genreSection = null,
    genreReady = null,
  }: {
    songs?: readonly Song[];
    genreSection?: GenreSectionId | null;
    /** Which genre lessons are built (useGenreReadiness); none suggested
     *  until it is known, so no placeholder is. */
    genreReady?: GenreReadiness | null;
  } = {},
): readonly PromptSuggestion[] {
  switch (tab) {
    case 'Songs':
      return songSuggestions(instrument, songs);
    case 'Genre':
      return genreReady ? genreSuggestions(genreReady, genreSection) : [];
    case 'Theory':
      return THEORY_SUGGESTIONS[instrument];
    case 'Technique':
      return techniqueSuggestions(instrument);
    default:
      return allLearnSuggestions(instrument, genreReady, songs);
  }
}
