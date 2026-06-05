import type { FilterOption } from '@/components/songLibrary/FilterDropdown';

/* ── Theory ───────────────────────────────────────────────────────── */

export type ModeFamily =
  | 'all'
  | 'diatonic'
  | 'relative'
  | 'parallel'
  | 'harmonic-minor'
  | 'melodic-minor'
  | 'harmonic-major'
  | 'double-harmonic';

export type TheorySort = 'brightness' | 'alphabetical';

export const MODE_FAMILY_OPTIONS: FilterOption<ModeFamily>[] = [
  { value: 'all', label: 'All Families' },
  { value: 'diatonic', label: 'Diatonic' },
  { value: 'relative', label: 'Relative' },
  { value: 'parallel', label: 'Parallel' },
  { value: 'harmonic-minor', label: 'Harmonic Minor' },
  { value: 'melodic-minor', label: 'Melodic Minor' },
  { value: 'harmonic-major', label: 'Harmonic Major' },
  { value: 'double-harmonic', label: 'Double Harmonic' },
];

export const THEORY_SORT_OPTIONS: FilterOption<TheorySort>[] = [
  { value: 'brightness', label: 'Brightness' },
  { value: 'alphabetical', label: 'A–Z' },
];

/* ── Technique ────────────────────────────────────────────────────── */

export type TechniqueCategory = 'all' | 'foundational';
export type TechniqueDifficulty =
  | 'all'
  | 'beginner'
  | 'intermediate'
  | 'advanced';
export type TechniqueSort = 'alphabetical' | 'alphabetical-desc';

export const TECHNIQUE_CATEGORY_OPTIONS: FilterOption<TechniqueCategory>[] = [
  { value: 'all', label: 'All' },
  { value: 'foundational', label: 'Foundational' },
];

export const TECHNIQUE_DIFFICULTY_OPTIONS: FilterOption<TechniqueDifficulty>[] =
  [
    { value: 'all', label: 'All Levels' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
  ];

export const TECHNIQUE_SORT_OPTIONS: FilterOption<TechniqueSort>[] = [
  { value: 'alphabetical', label: 'A–Z' },
  { value: 'alphabetical-desc', label: 'Z–A' },
];

/* ── Courses ──────────────────────────────────────────────────────── */

export type CoursesGenre =
  | 'all'
  | 'pop'
  | 'rock'
  | 'hip hop'
  | 'rnb'
  | 'jazz'
  | 'blues'
  | 'folk'
  | 'funk'
  | 'neo-soul'
  | 'electronic'
  | 'latin'
  | 'reggae'
  | 'jam-band'
  | 'african';

export type CoursesLevel = 'all' | '1' | '2' | '3';

export type CoursesSort = 'alphabetical' | 'popularity';

export const COURSES_GENRE_OPTIONS: FilterOption<CoursesGenre>[] = [
  { value: 'all', label: 'All Genres' },
  { value: 'pop', label: 'Pop' },
  { value: 'rock', label: 'Rock' },
  { value: 'hip hop', label: 'Hip Hop' },
  { value: 'rnb', label: 'R&B' },
  { value: 'jazz', label: 'Jazz' },
  { value: 'blues', label: 'Blues' },
  { value: 'folk', label: 'Folk' },
  { value: 'funk', label: 'Funk' },
  { value: 'neo-soul', label: 'Neo Soul' },
  { value: 'electronic', label: 'Electronic' },
  { value: 'latin', label: 'Latin' },
  { value: 'reggae', label: 'Reggae' },
  { value: 'jam-band', label: 'Jam Band' },
  { value: 'african', label: 'African' },
];

export const COURSES_LEVEL_OPTIONS: FilterOption<CoursesLevel>[] = [
  { value: 'all', label: 'All Levels' },
  { value: '1', label: 'Level 1' },
  { value: '2', label: 'Level 2' },
  { value: '3', label: 'Level 3' },
];

export const COURSES_SORT_OPTIONS: FilterOption<CoursesSort>[] = [
  { value: 'alphabetical', label: 'A–Z' },
  { value: 'popularity', label: 'Popularity' },
];
