import { motion } from 'framer-motion';
import { ChevronDown, ChevronRight, Heart } from 'lucide-react';
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FilterDropdown } from '@/components/songLibrary/FilterDropdown';
import { SearchInput } from '@/components/songLibrary/SearchInput';
import { type ViewMode } from '@/components/songLibrary/SongLibraryPage';
import { LearnRoutes, CurriculumRoutes } from '@/constants/routes';
import { SLUG_TO_CURRICULUM_GENRE } from '@/curriculum/bridge/genreIdMap';
import { buildCurriculumLessonId } from '@/curriculum/hooks/useCurriculumProgress';
import { START_HERE_TAB } from '@/curriculum/musicLiteracy/literacyPath';
import { MeshGradientBg } from '@/daw/components/MeshGradientBg';
import { useLearnInstrument } from '@/features/learn/useInstrumentStore';
import {
  useSavedItemsStore,
  type SavedItemKind,
} from '@/features/learn/useSavedItemsStore';
import type { PrismModeSlug } from '@/hooks/data';
import { useProgressSummary } from '@/hooks/data/progress/useProgressSummary';
import { useIsPremium } from '@/hooks/useIsPremium';
import { defaultAvatarConfig } from '@/lib/avatarHexGrid';
import { SCALE_LESSON_SLUGS, SCALE_LESSONS } from '@/lib/learn/scaleLessons';
import { colorForKeyMode } from '@/lib/modeColorShift';
import { keyLabelToUrlParam } from '@/lib/musicKeyUrl';
import type { ProgressSummaryResponse } from '@/lib/progress/types';
import { SongLibraryBody } from '../songLibrary/SongLibraryPage';
import { HexAvatarSVG } from '../ui/HexAvatarSVG';
import { LockedFeatureOverlay } from '../ui/LockedFeatureOverlay';
import { cn } from '../utilities';
import { LearnHome } from './LearnHome';
import { LearnTabBar } from './LearnTabBar';
import { StartHere } from './StartHere';
import { WorldHarmony } from './WorldHarmony';
import { GENRE_COURSES } from './genreCourses';
import {
  COMING_SOON_FOR_GUITAR,
  guitarLessonRoute,
  isTheoryItemOnGuitar,
} from './guitarTheory';
import {
  COURSES_LEVEL_OPTIONS,
  COURSES_SORT_OPTIONS,
  MODE_FAMILY_OPTIONS,
  TECHNIQUE_CATEGORY_OPTIONS,
  TECHNIQUE_DIFFICULTY_OPTIONS,
  TECHNIQUE_SORT_OPTIONS,
  THEORY_SORT_OPTIONS,
  type CoursesLevel,
  type CoursesSort,
  type ModeFamily,
  type TechniqueCategory,
  type TechniqueDifficulty,
  type TechniqueSort,
  type TheorySort,
} from './learnFilterOptions';
import { SigilCard } from './sigil/SigilCard';
import { sigilFor, type SigilSpec } from './sigil/sigilSpec';
import { techniqueDataFor } from './techniqueCatalog';
import './learn.css';

/* ── Filter row + helpers ─────────────────────────────────────────── */

const LearnFilterRow: FC<{ children: ReactNode }> = ({ children }) => (
  <div
    className="flex items-center flex-wrap"
    style={{ gap: 10, marginBottom: 16 }}
  >
    {children}
  </div>
);

interface TheoryFilters {
  family: ModeFamily;
  sort: TheorySort;
  search: string;
  saved: SavedFilter;
}

interface TechniqueFilters {
  category: TechniqueCategory;
  difficulty: TechniqueDifficulty;
  sort: TechniqueSort;
  search: string;
  saved: SavedFilter;
}

interface CoursesFilters {
  level: CoursesLevel;
  sort: CoursesSort;
  search: string;
  saved: SavedFilter;
}

type SavedFilter = 'all' | 'saved' | 'unsaved';

const SAVED_FILTER_OPTIONS: { value: SavedFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'saved', label: 'Saved only' },
  { value: 'unsaved', label: 'Unsaved only' },
];

function applySearch(items: ContentItem[], q: string): ContentItem[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return items;
  return items.filter((i) => i.title.toLowerCase().includes(needle));
}

function applySavedFilter<T>(
  items: T[],
  mode: SavedFilter,
  isItemSaved: (item: T) => boolean,
): T[] {
  if (mode === 'all') return items;
  return items.filter((i) =>
    mode === 'saved' ? isItemSaved(i) : !isItemSaved(i),
  );
}

function applyTheorySort(
  items: ContentItem[],
  sort: TheorySort,
): ContentItem[] {
  if (sort === 'alphabetical') {
    return [...items].sort((a, b) => a.title.localeCompare(b.title));
  }
  return items;
}

function applyTechniqueSort(
  items: ContentItem[],
  sort: TechniqueSort,
): ContentItem[] {
  const sorted = [...items].sort((a, b) => a.title.localeCompare(b.title));
  return sort === 'alphabetical-desc' ? sorted.reverse() : sorted;
}

function applyCoursesFilters(
  items: ContentItem[],
  filters: CoursesFilters,
): ContentItem[] {
  let out = items;
  if (filters.level !== 'all') {
    out = out.filter((i) =>
      i.subItems?.some((s) => String(s.level) === filters.level),
    );
  }
  out = applySearch(out, filters.search);
  if (filters.sort === 'alphabetical') {
    out = [...out].sort((a, b) => a.title.localeCompare(b.title));
  }
  return out;
}

interface ContentSubItem {
  label: string;
  color: string;
  route: string;
  genre?: string;
  level?: number;
  /** A Relative / Parallel mode: its slug and key, for its guitar lesson. */
  mode?: string;
  keyLabel?: string;
}

interface ContentItem {
  title: string;
  mode?: string;
  /** A Technique tile's interval (techniqueCatalog), drawn as its figure. */
  ratio?: readonly [number, number];
  route?: string;
  expandId?: string;
  subItems?: ContentSubItem[];
  image?: string;
  /** When true (and `image` is a polygon honeycomb), the tile art is an
   *  interactive hex canvas that paints on hover and drifts on its own. */
  interactive?: boolean;
  /** Set when the tile has no lessons on the chosen instrument yet: it is
   *  shown dimmed and disabled, labelled with this text. */
  comingSoon?: string;
}

function getTileCompletion(
  summary: ProgressSummaryResponse | undefined,
  item: ContentItem,
): number {
  if (!summary) return 0;

  // Theory tile: aggregate all keys for this mode
  if (item.mode) {
    const matching = summary.lessons.filter(
      (l) =>
        l.lessonId.startsWith('mode-lesson-flow') &&
        l.mode?.toLowerCase() === item.mode!.toLowerCase(),
    );
    if (matching.length === 0) return 0;
    const completed = matching.reduce((s, l) => s + l.completedCount, 0);
    const total = matching.reduce((s, l) => s + (l.totalCount ?? 0), 0);
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  // Genre tile: aggregate all levels
  if (item.subItems?.some((s) => s.genre)) {
    const genreSlug = item.subItems[0].genre!;
    const genreId = SLUG_TO_CURRICULUM_GENRE[genreSlug];
    if (!genreId) return 0;
    const levels: ('L1' | 'L2' | 'L3')[] = ['L1', 'L2', 'L3'];
    const lessonIds = levels.map((lv) => buildCurriculumLessonId(genreId, lv));
    const matching = summary.lessons.filter((l) =>
      lessonIds.includes(l.lessonId),
    );
    if (matching.length === 0) return 0;
    const completed = matching.reduce((s, l) => s + l.completedCount, 0);
    const total = matching.reduce((s, l) => s + (l.totalCount ?? 0), 0);
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  return 0;
}

const DIATONIC_MODES = [
  { title: 'Lydian', slug: 'lydian' },
  { title: 'Ionian', slug: 'ionian' },
  { title: 'Mixolydian', slug: 'mixolydian' },
  { title: 'Dorian', slug: 'dorian' },
  { title: 'Aeolian', slug: 'aeolian' },
  { title: 'Phrygian', slug: 'phrygian' },
  { title: 'Locrian', slug: 'locrian' },
];

const DIATONIC_MODES_BY_DEGREE = [
  { title: 'Ionian', slug: 'ionian' },
  { title: 'Dorian', slug: 'dorian' },
  { title: 'Phrygian', slug: 'phrygian' },
  { title: 'Lydian', slug: 'lydian' },
  { title: 'Mixolydian', slug: 'mixolydian' },
  { title: 'Aeolian', slug: 'aeolian' },
  { title: 'Locrian', slug: 'locrian' },
];

const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

const SEMITONE_TO_KEY = [
  'C',
  'D♭',
  'D',
  'E♭',
  'E',
  'F',
  'F#',
  'G',
  'A♭',
  'A',
  'B♭',
  'B',
];

const KEY_TO_SEMITONE: Record<string, number> = {
  C: 0,
  'D♭': 1,
  D: 2,
  'E♭': 3,
  E: 4,
  F: 5,
  'F#': 6,
  G: 7,
  'A♭': 8,
  A: 9,
  'B♭': 10,
  B: 11,
};

function buildRelativeSubItems(keyLabel: string): ContentSubItem[] {
  const root = KEY_TO_SEMITONE[keyLabel] ?? 0;
  return DIATONIC_MODES_BY_DEGREE.map((mode, i) => {
    const note = SEMITONE_TO_KEY[(root + MAJOR_SCALE_INTERVALS[i]) % 12];
    return {
      label: `${note} ${mode.title}`,
      color: colorForKeyMode(note, mode.slug as PrismModeSlug),
      route: LearnRoutes.keyboardLesson({
        mode: mode.slug,
        key: keyLabelToUrlParam(note),
      }),
      mode: mode.slug,
      keyLabel: note,
    };
  });
}

function buildParallelSubItems(keyLabel: string): ContentSubItem[] {
  return DIATONIC_MODES.map((mode) => ({
    label: `${keyLabel} ${mode.title}`,
    color: colorForKeyMode(keyLabel, mode.slug as PrismModeSlug),
    route: LearnRoutes.keyboardLesson({
      mode: mode.slug,
      key: keyLabelToUrlParam(keyLabel),
    }),
    mode: mode.slug,
    keyLabel,
  }));
}

function buildGenreLevels(genreSlug: string): ContentSubItem[] {
  return [1, 2, 3].map((n) => ({
    label: `Level ${n}`,
    color: '#7ecfcf',
    route: CurriculumRoutes.genreLevel({ genre: genreSlug, level: String(n) }),
    genre: genreSlug,
    level: n,
  }));
}

// The genre courses (genreCourses.ts).
const COURSES_DATA: ContentItem[] = GENRE_COURSES.map((course) => ({
  title: course.title,
  route: CurriculumRoutes.genre({ genre: course.slug }),
  expandId: course.expandId,
  subItems: buildGenreLevels(course.slug),
  image: course.image,
  interactive: true,
}));

const THEORY_DATA: ContentItem[] = [
  {
    title: 'Lydian',
    mode: 'lydian',
    route: LearnRoutes.keyboardOverview({ mode: 'lydian' }),
    image: '/learn-tiles/theory/lydian.svg',
    interactive: true,
  },
  {
    title: 'Ionian (Major)',
    mode: 'ionian',
    route: LearnRoutes.keyboardOverview({ mode: 'ionian' }),
    image: '/learn-tiles/theory/ionian.svg',
    interactive: true,
  },
  {
    title: 'Mixolydian',
    mode: 'mixolydian',
    route: LearnRoutes.keyboardOverview({ mode: 'mixolydian' }),
    image: '/learn-tiles/theory/mixolydian.svg',
    interactive: true,
  },
  {
    title: 'Dorian',
    mode: 'dorian',
    route: LearnRoutes.keyboardOverview({ mode: 'dorian' }),
    image: '/learn-tiles/theory/dorian.svg',
    interactive: true,
  },
  {
    title: 'Aeolian (Minor)',
    mode: 'aeolian',
    route: LearnRoutes.keyboardOverview({ mode: 'aeolian' }),
    image: '/learn-tiles/theory/aeolian.svg',
    interactive: true,
  },
  {
    title: 'Phrygian',
    mode: 'phrygian',
    route: LearnRoutes.keyboardOverview({ mode: 'phrygian' }),
    image: '/learn-tiles/theory/phrygian.svg',
    interactive: true,
  },
  {
    title: 'Locrian',
    mode: 'locrian',
    route: LearnRoutes.keyboardOverview({ mode: 'locrian' }),
    image: '/learn-tiles/theory/locrian.svg',
    interactive: true,
  },
];

const PENTATONIC_BLUES_DATA: ContentItem[] = SCALE_LESSON_SLUGS.map((slug) => ({
  title: SCALE_LESSONS[slug].title,
  mode: slug,
  route: LearnRoutes.keyboardOverview({ mode: slug }),
  image: SCALE_LESSONS[slug].image,
  interactive: true,
}));

// Technique tiles live in ./techniqueCatalog, one list per instrument.

const RELATIVE_MODES_DATA: ContentItem[] = [
  {
    title: 'Red',
    route: LearnRoutes.relativeOverview({ key: 'c' }),
    expandId: 'relative:c',
    subItems: buildRelativeSubItems('C'),
    image: '/learn-tiles/theory/relative-c.svg',
    interactive: true,
  },
  {
    title: 'Vermillion',
    route: LearnRoutes.relativeOverview({ key: 'g' }),
    expandId: 'relative:g',
    subItems: buildRelativeSubItems('G'),
    image: '/learn-tiles/theory/relative-g.svg',
    interactive: true,
  },
  {
    title: 'Orange',
    route: LearnRoutes.relativeOverview({ key: 'd' }),
    expandId: 'relative:d',
    subItems: buildRelativeSubItems('D'),
    image: '/learn-tiles/theory/relative-d.svg',
    interactive: true,
  },
  {
    title: 'Amber',
    route: LearnRoutes.relativeOverview({ key: 'a' }),
    expandId: 'relative:a',
    subItems: buildRelativeSubItems('A'),
    image: '/learn-tiles/theory/relative-a.svg',
    interactive: true,
  },
  {
    title: 'Green',
    route: LearnRoutes.relativeOverview({ key: 'e' }),
    expandId: 'relative:e',
    subItems: buildRelativeSubItems('E'),
    image: '/learn-tiles/theory/relative-e.svg',
    interactive: true,
  },
  {
    title: 'Sage',
    route: LearnRoutes.relativeOverview({ key: 'b' }),
    expandId: 'relative:b',
    subItems: buildRelativeSubItems('B'),
    image: '/learn-tiles/theory/relative-b.svg',
    interactive: true,
  },
  {
    title: 'Teal',
    route: LearnRoutes.relativeOverview({ key: 'fsharp' }),
    expandId: 'relative:fsharp',
    subItems: buildRelativeSubItems('F#'),
    image: '/learn-tiles/theory/relative-fsharp.svg',
    interactive: true,
  },
  {
    title: 'Blue',
    route: LearnRoutes.relativeOverview({ key: 'dflat' }),
    expandId: 'relative:dflat',
    subItems: buildRelativeSubItems('D♭'),
    image: '/learn-tiles/theory/relative-dflat.svg',
    interactive: true,
  },
  {
    title: 'Indigo',
    route: LearnRoutes.relativeOverview({ key: 'aflat' }),
    expandId: 'relative:aflat',
    subItems: buildRelativeSubItems('A♭'),
    image: '/learn-tiles/theory/relative-aflat.svg',
    interactive: true,
  },
  {
    title: 'Purple',
    route: LearnRoutes.relativeOverview({ key: 'eflat' }),
    expandId: 'relative:eflat',
    subItems: buildRelativeSubItems('E♭'),
    image: '/learn-tiles/theory/relative-eflat.svg',
    interactive: true,
  },
  {
    title: 'Magenta',
    route: LearnRoutes.relativeOverview({ key: 'bflat' }),
    expandId: 'relative:bflat',
    subItems: buildRelativeSubItems('B♭'),
    image: '/learn-tiles/theory/relative-bflat.svg',
    interactive: true,
  },
  {
    title: 'Pink',
    route: LearnRoutes.relativeOverview({ key: 'f' }),
    expandId: 'relative:f',
    subItems: buildRelativeSubItems('F'),
    image: '/learn-tiles/theory/relative-f.svg',
    interactive: true,
  },
];

const PARALLEL_MODES_DATA: ContentItem[] = [
  {
    title: 'C',
    route: LearnRoutes.parallelOverview({ key: 'c' }),
    expandId: 'parallel:c',
    subItems: buildParallelSubItems('C'),
    image: '/learn-tiles/theory/parallel-c.svg',
    interactive: true,
  },
  {
    title: 'G',
    route: LearnRoutes.parallelOverview({ key: 'g' }),
    expandId: 'parallel:g',
    subItems: buildParallelSubItems('G'),
    image: '/learn-tiles/theory/parallel-g.svg',
    interactive: true,
  },
  {
    title: 'D',
    route: LearnRoutes.parallelOverview({ key: 'd' }),
    expandId: 'parallel:d',
    subItems: buildParallelSubItems('D'),
    image: '/learn-tiles/theory/parallel-d.svg',
    interactive: true,
  },
  {
    title: 'A',
    route: LearnRoutes.parallelOverview({ key: 'a' }),
    expandId: 'parallel:a',
    subItems: buildParallelSubItems('A'),
    image: '/learn-tiles/theory/parallel-a.svg',
    interactive: true,
  },
  {
    title: 'E',
    route: LearnRoutes.parallelOverview({ key: 'e' }),
    expandId: 'parallel:e',
    subItems: buildParallelSubItems('E'),
    image: '/learn-tiles/theory/parallel-e.svg',
    interactive: true,
  },
  {
    title: 'B',
    route: LearnRoutes.parallelOverview({ key: 'b' }),
    expandId: 'parallel:b',
    subItems: buildParallelSubItems('B'),
    image: '/learn-tiles/theory/parallel-b.svg',
    interactive: true,
  },
  {
    title: 'F#',
    route: LearnRoutes.parallelOverview({ key: 'fsharp' }),
    expandId: 'parallel:fsharp',
    subItems: buildParallelSubItems('F#'),
    image: '/learn-tiles/theory/parallel-fsharp.svg',
    interactive: true,
  },
  {
    title: 'D♭',
    route: LearnRoutes.parallelOverview({ key: 'dflat' }),
    expandId: 'parallel:dflat',
    subItems: buildParallelSubItems('D♭'),
    image: '/learn-tiles/theory/parallel-dflat.svg',
    interactive: true,
  },
  {
    title: 'A♭',
    route: LearnRoutes.parallelOverview({ key: 'aflat' }),
    expandId: 'parallel:aflat',
    subItems: buildParallelSubItems('A♭'),
    image: '/learn-tiles/theory/parallel-aflat.svg',
    interactive: true,
  },
  {
    title: 'E♭',
    route: LearnRoutes.parallelOverview({ key: 'eflat' }),
    expandId: 'parallel:eflat',
    subItems: buildParallelSubItems('E♭'),
    image: '/learn-tiles/theory/parallel-eflat.svg',
    interactive: true,
  },
  {
    title: 'B♭',
    route: LearnRoutes.parallelOverview({ key: 'bflat' }),
    expandId: 'parallel:bflat',
    subItems: buildParallelSubItems('B♭'),
    image: '/learn-tiles/theory/parallel-bflat.svg',
    interactive: true,
  },
  {
    title: 'F',
    route: LearnRoutes.parallelOverview({ key: 'f' }),
    expandId: 'parallel:f',
    subItems: buildParallelSubItems('F'),
    image: '/learn-tiles/theory/parallel-f.svg',
    interactive: true,
  },
];

const HARMONIC_MINOR_DATA: ContentItem[] = [
  {
    title: 'Harmonic Minor',
    mode: 'harmonicminor',
    route: LearnRoutes.keyboardOverview({ mode: 'harmonicminor' }),
    image: '/learn-tiles/theory/harmonicminor.svg',
    interactive: true,
  },
  {
    title: 'Locrian ♮6',
    mode: 'locriannat6',
    route: LearnRoutes.keyboardOverview({ mode: 'locriannat6' }),
    image: '/learn-tiles/theory/locrian-nat6.svg',
    interactive: true,
  },
  {
    title: 'Ionian #5',
    mode: 'ionian#5',
    route: LearnRoutes.keyboardOverview({ mode: 'ionian#5' }),
    image: '/learn-tiles/theory/ionian-sharp5.svg',
    interactive: true,
  },
  {
    title: 'Dorian #4',
    mode: 'dorian#4',
    route: LearnRoutes.keyboardOverview({ mode: 'dorian#4' }),
    image: '/learn-tiles/theory/dorian-sharp4.svg',
    interactive: true,
  },
  {
    title: 'Phrygian Dominant',
    mode: 'phrygiandominant',
    route: LearnRoutes.keyboardOverview({ mode: 'phrygiandominant' }),
    image: '/learn-tiles/theory/phrygiandominant.svg',
    interactive: true,
  },
  {
    title: 'Lydian #2',
    mode: 'lydian#2',
    route: LearnRoutes.keyboardOverview({ mode: 'lydian#2' }),
    image: '/learn-tiles/theory/lydian-sharp2.svg',
    interactive: true,
  },
  {
    title: 'Altered Diminished',
    mode: 'altereddiminished',
    route: LearnRoutes.keyboardOverview({ mode: 'altereddiminished' }),
    image: '/learn-tiles/theory/altereddiminished.svg',
    interactive: true,
  },
];

const MELODIC_MINOR_DATA: ContentItem[] = [
  {
    title: 'Melodic Minor',
    mode: 'melodicminor',
    route: LearnRoutes.keyboardOverview({ mode: 'melodicminor' }),
    image: '/learn-tiles/theory/melodicminor.svg',
    interactive: true,
  },
  {
    title: 'Dorian ♭2',
    mode: 'dorian♭2',
    route: LearnRoutes.keyboardOverview({ mode: 'dorian♭2' }),
    image: '/learn-tiles/theory/dorian-flat2.svg',
    interactive: true,
  },
  {
    title: 'Lydian Augmented',
    mode: 'lydianaugmented',
    route: LearnRoutes.keyboardOverview({ mode: 'lydianaugmented' }),
    image: '/learn-tiles/theory/lydianaugmented.svg',
    interactive: true,
  },
  {
    title: 'Lydian Dominant',
    mode: 'lydiandominant',
    route: LearnRoutes.keyboardOverview({ mode: 'lydiandominant' }),
    image: '/learn-tiles/theory/lydiandominant.svg',
    interactive: true,
  },
  {
    title: 'Mixolydian ♭6',
    mode: 'mixolydiannat6',
    route: LearnRoutes.keyboardOverview({ mode: 'mixolydiannat6' }),
    image: '/learn-tiles/theory/mixolydian-flat6.svg',
    interactive: true,
  },
  {
    title: 'Locrian ♮2',
    mode: 'locriannat2',
    route: LearnRoutes.keyboardOverview({ mode: 'locriannat2' }),
    image: '/learn-tiles/theory/locrian-nat2.svg',
    interactive: true,
  },
  {
    title: 'Altered Dominant',
    mode: 'altereddominant',
    route: LearnRoutes.keyboardOverview({ mode: 'altereddominant' }),
    image: '/learn-tiles/theory/altereddominant.svg',
    interactive: true,
  },
];

const HARMONIC_MAJOR_DATA: ContentItem[] = [
  {
    title: 'Harmonic Major',
    mode: 'harmonicmajor',
    route: LearnRoutes.keyboardOverview({ mode: 'harmonicmajor' }),
    image: '/learn-tiles/theory/harmonicmajor.svg',
    interactive: true,
  },
  {
    title: 'Dorian ♭5',
    mode: 'dorian♭5',
    route: LearnRoutes.keyboardOverview({ mode: 'dorian♭5' }),
    image: '/learn-tiles/theory/dorian-flat5.svg',
    interactive: true,
  },
  {
    title: 'Altered Dominant ♮5',
    mode: 'altereddominantnat5',
    route: LearnRoutes.keyboardOverview({ mode: 'altereddominantnat5' }),
    image: '/learn-tiles/theory/altereddominant-nat5.svg',
    interactive: true,
  },
  {
    title: 'Melodic Minor #4',
    mode: 'melodicminor#4',
    route: LearnRoutes.keyboardOverview({ mode: 'melodicminor#4' }),
    image: '/learn-tiles/theory/melodicminor-sharp4.svg',
    interactive: true,
  },
  {
    title: 'Mixolydian ♭2',
    mode: 'mixolydian♭2',
    route: LearnRoutes.keyboardOverview({ mode: 'mixolydian♭2' }),
    image: '/learn-tiles/theory/mixolydian-flat2.svg',
    interactive: true,
  },
  {
    title: 'Lydian Augmented #2',
    mode: 'lydianaugmented#2',
    route: LearnRoutes.keyboardOverview({ mode: 'lydianaugmented#2' }),
    image: '/learn-tiles/theory/lydianaugmented-sharp2.svg',
    interactive: true,
  },
  {
    title: 'Locrian 𝄫7',
    mode: 'locrian𝄫7',
    route: LearnRoutes.keyboardOverview({ mode: 'locrian𝄫7' }),
    image: '/learn-tiles/theory/locrian-bb7.svg',
    interactive: true,
  },
];

const DOUBLE_HARMONIC_DATA: ContentItem[] = [
  {
    title: 'Double Harmonic Major',
    mode: 'doubleharmonicmajor',
    route: LearnRoutes.keyboardOverview({ mode: 'doubleharmonicmajor' }),
    image: '/learn-tiles/theory/doubleharmonicmajor.svg',
    interactive: true,
  },
  {
    title: 'Lydian #2 #6',
    mode: 'lydian#2#6',
    route: LearnRoutes.keyboardOverview({ mode: 'lydian#2#6' }),
    image: '/learn-tiles/theory/lydian-sharp2-sharp6.svg',
    interactive: true,
  },
  {
    title: 'Ultraphrygian',
    mode: 'ultraphrygian',
    route: LearnRoutes.keyboardOverview({ mode: 'ultraphrygian' }),
    image: '/learn-tiles/theory/ultraphrygian.svg',
    interactive: true,
  },
  {
    title: 'Double Harmonic Minor',
    mode: 'doubleharmonicminor',
    route: LearnRoutes.keyboardOverview({ mode: 'doubleharmonicminor' }),
    image: '/learn-tiles/theory/doubleharmonicminor.svg',
    interactive: true,
  },
  {
    title: 'Oriental',
    mode: 'oriental',
    route: LearnRoutes.keyboardOverview({ mode: 'oriental' }),
    image: '/learn-tiles/theory/oriental.svg',
    interactive: true,
  },
  {
    title: 'Ionian #2 #5',
    mode: 'ionian#2#5',
    route: LearnRoutes.keyboardOverview({ mode: 'ionian#2#5' }),
    image: '/learn-tiles/theory/ionian-sharp2-sharp5.svg',
    interactive: true,
  },
  {
    title: 'Locrian 𝄫3 𝄫7',
    mode: 'locrian𝄫3𝄫7',
    route: LearnRoutes.keyboardOverview({ mode: 'locrian𝄫3𝄫7' }),
    image: '/learn-tiles/theory/locrian-bb3-bb7.svg',
    interactive: true,
  },
];

// interface FilterCheckboxProps {
//   label: string;
//   checked?: boolean;
// }

// const FilterCheckbox: React.FC<FilterCheckboxProps> = ({ label, checked }) => {
//   const [isChecked, setIsChecked] = useState(!!checked);

//   return (
//     <div
//       className="flex items-center gap-3 p-1 cursor-pointer hover:bg-white/5 rounded transition-colors group"
//       onClick={() => setIsChecked((prev) => !prev)}
//     >
//       <div
//         className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isChecked ? "bg-white border-white" : "border-gray-600 group-hover:border-gray-400"}`}
//       >
//         {isChecked && <Check size={10} className="text-black" />}
//       </div>
//       <span className={`text-sm ${isChecked ? "text-white" : "text-gray-400 group-hover:text-gray-200"}`}>{label}</span>
//     </div>
//   );
// };

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultOpen = true,
  className = '',
  style,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className={className} style={style}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        data-learn-section={title}
        className="group mb-4 flex w-fit cursor-pointer select-none items-center gap-2"
        style={{
          color: 'var(--color-text)',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
      >
        <h2>{title}</h2>
        {isOpen ? (
          <ChevronDown
            className="opacity-60 transition-opacity group-hover:opacity-100"
            size={14}
            style={{ color: 'var(--color-text-dim)' }}
          />
        ) : (
          <ChevronRight
            className="opacity-60 transition-opacity group-hover:opacity-100"
            size={14}
            style={{ color: 'var(--color-text-dim)' }}
          />
        )}
      </div>
      {isOpen && <div className="flex flex-col">{children}</div>}
    </div>
  );
};

/**
 * Determine whether a theory/course/technique item is available to free users.
 *
 * Free items:
 *  - Technique → "Fundamentals" (piano-fundamentals)
 *  - Theory (Diatonic Modes) → "Ionian (Major)" — specifically the C key sub-item,
 *    on piano and on guitar (The Guitar Atlas's key centers live there)
 *
 * Everything else (all courses, all other modes, relative/parallel/harmonic/melodic/
 * double-harmonic sections) is premium-only.
 */
function isLearnItemFree(item: ContentItem, tab: string): boolean {
  return (
    tab === 'Technique' || // Piano Fundamentals, Applied Theory Fundamentals
    (tab === 'Theory' && item.mode === 'ionian') // C Ionian available
  );
}

interface CardItemProps {
  title: string;
  mode?: string;
  expandId?: string;
  /** A Technique tile's interval, drawn as its figure. */
  ratio?: readonly [number, number];
  subItems?: ContentSubItem[];
  onSelect?: () => void;
  highlighted?: boolean;
  highlightRef?: React.Ref<HTMLDivElement>;
  expanded?: boolean;
  imageSize?: number;
  onToggleExpand?: () => void;
  image?: string;
  interactive?: boolean;
  progressPct?: number;
  locked?: boolean;
  savedKind?: SavedItemKind;
  savedId?: string;
  /** No lessons on this instrument yet: dimmed, not clickable, and labelled
   *  with this text. Hides the premium lock and the saved heart. */
  comingSoon?: string;
}

/** A tile with nothing to draw: the unison, a circle. */
const SIGIL_FALLBACK: SigilSpec = {
  kind: 'interval',
  ratio: [1, 1],
  stats: '',
  strip: [],
};

const CardItem: React.FC<CardItemProps> = ({
  title,
  mode,
  expandId,
  ratio,
  subItems,
  onSelect,
  highlighted,
  highlightRef,
  expanded,
  imageSize,
  image,
  progressPct,
  locked,
  savedKind,
  savedId,
  comingSoon,
}) => {
  const unavailable = !!comingSoon;
  const hasExpansion = !!(mode || subItems) && !unavailable;
  // The tile's music, drawn (owner, 2026-10-26); a plain circle for one
  // with nothing to draw.
  const sigil = useMemo(
    () => sigilFor({ mode, expandId, image, ratio }) ?? SIGIL_FALLBACK,
    [mode, expandId, image, ratio],
  );
  const isSaved = useSavedItemsStore((s) =>
    savedKind && savedId ? Boolean(s.saved[`${savedKind}:${savedId}`]) : false,
  );
  const toggleSavedItem = useSavedItemsStore((s) => s.toggleSaved);

  return (
    <LockedFeatureOverlay locked={!!locked && !unavailable} label={title}>
      <div
        ref={highlightRef}
        role={unavailable ? 'group' : undefined}
        aria-label={unavailable ? `${title}: ${comingSoon}` : undefined}
        aria-disabled={unavailable || undefined}
        className={`group flex ${unavailable ? 'cursor-not-allowed' : 'cursor-pointer'} flex-col gap-3 ${highlighted ? 'genre-highlight' : ''}`}
      >
        <SigilCard
          spec={sigil}
          label={title}
          interactive={!unavailable}
          className={cn(
            'relative',
            highlighted &&
              'rounded-[1.25rem] ring-2 ring-[var(--color-accent)]',
          )}
          style={
            imageSize ? { width: imageSize, height: imageSize } : undefined
          }
          onClick={unavailable ? undefined : onSelect}
          data-learn-tile={title}
        >
          {unavailable && (
            // The figure veiled, the reason on top, in words, not colour
            // alone.
            <div className="absolute inset-0 flex items-end bg-black/60 p-3">
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/80">
                {comingSoon}
              </span>
            </div>
          )}
          {savedKind && savedId && !unavailable && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleSavedItem(savedKind, savedId);
              }}
              aria-label={isSaved ? 'Remove from saved' : 'Save'}
              aria-pressed={isSaved}
              className="absolute right-2.5 top-2.5 z-10 rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Heart
                size={16}
                fill={isSaved ? 'currentColor' : 'none'}
                style={isSaved ? { color: '#ffffff' } : undefined}
              />
            </button>
          )}
        </SigilCard>
        <div className="flex items-start justify-between gap-2 px-1">
          <div className="min-w-0">
            <h3
              className="text-lg"
              style={{
                color: unavailable
                  ? 'var(--color-text-dim)'
                  : 'var(--color-text)',
              }}
            >
              {title}
            </h3>
            {sigil.character && (
              <p className="truncate text-sm text-white/55">
                {sigil.character}
              </p>
            )}
          </div>
          {progressPct != null && progressPct > 0 && (
            <span
              className="text-xs"
              style={{ color: 'var(--color-text-dim)' }}
            >
              {progressPct}%
            </span>
          )}
          {hasExpansion && (
            <button
              type="button"
              className="flex items-center justify-center rounded p-1 transition-colors hover:bg-white/10"
              aria-label={`Open ${title}`}
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.();
              }}
            >
              <ChevronRight
                size={18}
                style={{
                  color: expanded
                    ? 'var(--color-accent)'
                    : 'var(--color-text-dim)',
                  transition: 'color 150ms',
                }}
              />
            </button>
          )}
        </div>
      </div>
    </LockedFeatureOverlay>
  );
};

/* ── ListItem — list-view counterpart of CardItem ────────────────── */

const ListItem: React.FC<CardItemProps> = ({
  title,
  mode,
  subItems,
  onSelect,
  image,
  progressPct,
  locked,
  savedKind,
  savedId,
  comingSoon,
}) => {
  const unavailable = !!comingSoon;
  const hasExpansion = !!(mode || subItems) && !unavailable;
  const isSaved = useSavedItemsStore((s) =>
    savedKind && savedId ? Boolean(s.saved[`${savedKind}:${savedId}`]) : false,
  );
  const toggleSavedItem = useSavedItemsStore((s) => s.toggleSaved);

  return (
    <LockedFeatureOverlay locked={!!locked && !unavailable} label={title}>
      <button
        type="button"
        onClick={unavailable ? undefined : onSelect}
        aria-disabled={unavailable || undefined}
        className={
          unavailable
            ? 'group flex w-full cursor-not-allowed items-center gap-3 rounded-lg border px-3 py-2 text-left opacity-50'
            : 'group flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-white/[0.04]'
        }
        style={{
          background: 'rgba(255,255,255,0.02)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div
          className="relative size-12 flex-shrink-0 overflow-hidden rounded-md"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          {image ? (
            <img
              src={image}
              alt=""
              className="absolute inset-0 size-full object-cover"
              draggable={false}
            />
          ) : (
            <HexAvatarSVG
              config={defaultAvatarConfig(title)}
              circular={false}
              className="absolute left-0 top-0 size-[120%]"
            />
          )}
        </div>
        <h3
          className="flex-1 truncate text-base font-medium"
          style={{ color: 'var(--color-text)' }}
        >
          {title}
        </h3>
        {unavailable && (
          <span
            className="flex-shrink-0 text-xs"
            style={{ color: 'var(--color-text-dim)' }}
          >
            {comingSoon}
          </span>
        )}
        {progressPct != null && progressPct > 0 && (
          <span
            className="flex-shrink-0 text-xs tabular-nums"
            style={{ color: 'var(--color-text-dim)' }}
          >
            {progressPct}%
          </span>
        )}
        {savedKind && savedId && !unavailable && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              toggleSavedItem(savedKind, savedId);
            }}
            aria-label={isSaved ? 'Remove from saved' : 'Save'}
            aria-pressed={isSaved}
            className="flex-shrink-0 rounded-full p-1.5 transition-colors hover:bg-white/10"
          >
            <Heart
              size={16}
              fill={isSaved ? 'currentColor' : 'none'}
              style={{
                color: isSaved ? '#ffffff' : 'rgba(255,255,255,0.55)',
              }}
            />
          </button>
        )}
        {hasExpansion && (
          <ChevronRight
            size={16}
            className="flex-shrink-0"
            style={{ color: 'var(--color-text-dim)' }}
          />
        )}
      </button>
    </LockedFeatureOverlay>
  );
};

interface LearnInletProps {
  initialTab?: string;
  setSubTab?: (tab: string) => void;
  /**
   * The tab to show, whatever ?tab= says: the Learn page's tab pages
   * (/learn/keyboard/songs…) give it from their path (owner, 2026-10-24).
   * Guitar's Technique then shows guitar's technique tiles.
   */
  tab?: string;
  /** Without Learn's own tab bar and background: the page around it has
   *  them. */
  bare?: boolean;
}

export const LearnInlet: React.FC<LearnInletProps> = ({
  initialTab,
  setSubTab: parentSetSubTab,
  tab: fixedTab,
  bare = false,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const genreParam = searchParams.get('genre');
  const tabParam = searchParams.get('tab');
  const { isPremium } = useIsPremium();
  const validTabs = [
    START_HERE_TAB,
    'Songs',
    'Genre',
    'Theory',
    'Technique',
    'WorldHarmony',
  ];
  const defaultTab =
    tabParam && validTabs.includes(tabParam)
      ? tabParam
      : genreParam
        ? 'Genre'
        : initialTab && validTabs.includes(initialTab)
          ? initialTab
          : 'Home';
  const [selectedTab, setSubTab] = useState(defaultTab);
  // The instrument picker decides what Learn shows. Guitar's lessons are
  // Theory's seven diatonic modes (Ionian from The Guitar Atlas); it has no
  // Technique tiles, so its Technique tab is hidden and opens Theory instead.
  const learnInstrument = useLearnInstrument();
  const onGuitar = learnInstrument === 'guitar';
  const subTab =
    fixedTab ??
    (onGuitar && selectedTab === 'Technique' ? 'Theory' : selectedTab);
  const techniqueData = useMemo<ContentItem[]>(
    () => [...techniqueDataFor(learnInstrument)],
    [learnInstrument],
  );
  const [highlightedGenre, setHighlightedGenre] = useState<string | null>(
    genreParam,
  );
  const highlightRef = useRef<HTMLDivElement>(null);
  const [theoryFilters, setTheoryFilters] = useState<TheoryFilters>({
    family: 'all',
    sort: 'brightness',
    search: '',
    saved: 'all',
  });
  const [techniqueFilters, setTechniqueFilters] = useState<TechniqueFilters>({
    category: 'all',
    difficulty: 'all',
    sort: 'alphabetical',
    search: '',
    saved: 'all',
  });
  const [coursesFilters, setCoursesFilters] = useState<CoursesFilters>({
    level: 'all',
    sort: 'alphabetical',
    search: '',
    saved: 'all',
  });
  // Shared view-mode toggle (card vs list) for Theory / Technique / Genre tabs.
  // The Songs tab has its own viewMode state inside SongLibraryBody.
  const [learnViewMode] = useState<ViewMode>('grid');
  const savedLearnItems = useSavedItemsStore((s) => s.saved);

  const theorySections = useMemo(() => {
    // On guitar, the families the guitar catalog has live have lessons and
    // the rest say so. A Relative / Parallel tile's modes open their guitar
    // lessons.
    const forInstrument = (items: ContentItem[]): ContentItem[] =>
      onGuitar
        ? items.map((item) => {
            if (!isTheoryItemOnGuitar(item)) {
              return { ...item, comingSoon: COMING_SOON_FOR_GUITAR };
            }
            if (item.mode || !item.subItems) return item;
            return {
              ...item,
              subItems: item.subItems.map((sub) =>
                sub.mode && sub.keyLabel
                  ? { ...sub, route: guitarLessonRoute(sub.mode, sub.keyLabel) }
                  : sub,
              ),
            };
          })
        : items;
    const all = [
      {
        family: 'diatonic' as ModeFamily,
        title: 'Diatonic Modes',
        items: THEORY_DATA,
        defaultOpen: true,
      },
      {
        family: 'pentatonic-blues' as ModeFamily,
        title: 'Pentatonic/Blues',
        items: PENTATONIC_BLUES_DATA,
        defaultOpen: true,
      },
      {
        family: 'relative' as ModeFamily,
        title: 'Relative Modes',
        items: RELATIVE_MODES_DATA,
        defaultOpen: true,
      },
      {
        family: 'parallel' as ModeFamily,
        title: 'Parallel Modes',
        items: PARALLEL_MODES_DATA,
        defaultOpen: true,
      },
      {
        family: 'harmonic-minor' as ModeFamily,
        title: 'Harmonic Minor Modes',
        items: HARMONIC_MINOR_DATA,
        defaultOpen: true,
      },
      {
        family: 'melodic-minor' as ModeFamily,
        title: 'Melodic Minor Modes',
        items: MELODIC_MINOR_DATA,
        defaultOpen: true,
      },
      {
        family: 'harmonic-major' as ModeFamily,
        title: 'Harmonic Major Modes',
        items: HARMONIC_MAJOR_DATA,
        defaultOpen: true,
      },
      {
        family: 'double-harmonic' as ModeFamily,
        title: 'Double Harmonic Modes',
        items: DOUBLE_HARMONIC_DATA,
        defaultOpen: true,
      },
    ];
    return all
      .filter(
        (s) =>
          theoryFilters.family === 'all' || s.family === theoryFilters.family,
      )
      .map((s) => ({
        ...s,
        items: applyTheorySort(
          applySavedFilter(
            applySearch(forInstrument(s.items), theoryFilters.search),
            theoryFilters.saved,
            (i) => !!i.mode && Boolean(savedLearnItems[`mode:${i.mode}`]),
          ),
          theoryFilters.sort,
        ),
      }))
      .filter((s) => s.items.length > 0);
  }, [theoryFilters, savedLearnItems, onGuitar]);

  const filteredTechnique = useMemo(() => {
    const searched = applySearch(techniqueData, techniqueFilters.search);
    const savedFiltered = applySavedFilter(
      searched,
      techniqueFilters.saved,
      (i) => Boolean(savedLearnItems[`technique:${i.title}`]),
    );
    // category + difficulty have no backing data today — wired but no-op
    return applyTechniqueSort(savedFiltered, techniqueFilters.sort);
  }, [techniqueData, techniqueFilters, savedLearnItems]);

  const filteredCourses = useMemo(
    () =>
      applySavedFilter(
        applyCoursesFilters(COURSES_DATA, coursesFilters),
        coursesFilters.saved,
        (i) => !!i.expandId && Boolean(savedLearnItems[`course:${i.expandId}`]),
      ),
    [coursesFilters, savedLearnItems],
  );

  // const [showFilter, setShowFilter] = useState(false);
  const navigate = useNavigate();
  const { data: progressSummary } = useProgressSummary();

  // Auto-select tab from ?tab= param (and reset to Songs when param is cleared)
  useEffect(() => {
    if (fixedTab) return;
    if (tabParam && validTabs.includes(tabParam)) {
      setSubTab(tabParam);
    } else if (!tabParam) {
      setSubTab('Home');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam, fixedTab]);

  // Guitar has no Technique tab: a ?tab=Technique link shows Theory (see
  // `subTab`) and the URL is corrected to match, without a history entry.
  useEffect(() => {
    if (fixedTab || !onGuitar || tabParam !== 'Technique') return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', 'Theory');
        return next;
      },
      { replace: true },
    );
  }, [fixedTab, onGuitar, tabParam, setSearchParams]);

  // Auto-select Genre tab and highlight the genre when arriving from Globe.
  // Skip while the Songs tab is active: the Songs filter also writes ?genre=,
  // and hijacking it here would clear the URL (dropping ?tab=Songs) and bounce
  // the user to the Learn Home.
  // A tab page shows its own tab: only Genre's takes the highlight.
  useEffect(() => {
    const takesGenre = fixedTab ? fixedTab === 'Genre' : tabParam !== 'Songs';
    if (genreParam && takesGenre) {
      setSubTab('Genre');
      setHighlightedGenre(genreParam);
      // Clear the query param from the URL without adding a history entry
      setSearchParams({}, { replace: true });
    }
  }, [fixedTab, genreParam, tabParam, setSearchParams]);

  // Auto-scroll to and fade out the highlighted card
  useEffect(() => {
    if (highlightedGenre && highlightRef.current) {
      highlightRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      const timer = setTimeout(() => setHighlightedGenre(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [highlightedGenre]);

  useEffect(() => {
    if (parentSetSubTab) parentSetSubTab(subTab);
  }, [subTab, parentSetSubTab]);

  const renderContent = (
    data: ContentItem[],
    tab: string = subTab,
    gridClassName = 'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4',
  ) => {
    const savedPropsFor = (
      item: ContentItem,
    ): { savedKind?: SavedItemKind; savedId?: string } => {
      if (item.comingSoon) return {};
      if (tab === 'Theory' && item.mode)
        return { savedKind: 'mode', savedId: item.mode };
      if (tab === 'Technique')
        return { savedKind: 'technique', savedId: item.title };
      if (tab === 'Genre' && item.expandId)
        return { savedKind: 'course', savedId: item.expandId };
      return {};
    };

    // Guitar has no server progress; the piano lessons' would mislead.
    const guitarTheory = onGuitar && tab === 'Theory';
    const tileProgress = (item: ContentItem) =>
      guitarTheory ? 0 : getTileCompletion(progressSummary, item);

    // A tile opens its page (owner, 2026-10-26): a mode or scale its art and
    // key wheel, a genre its course, a Relative / Parallel key its overview.
    // No menus open in the grid.
    const openItem = (item: ContentItem) => {
      if (item.comingSoon) return;
      if (item.mode) {
        navigate(
          onGuitar
            ? LearnRoutes.guitarOverview({ mode: item.mode })
            : LearnRoutes.keyboardOverview({ mode: item.mode }),
        );
        return;
      }
      if (item.route) navigate(item.route);
    };

    if (learnViewMode === 'list') {
      return (
        <div className="flex flex-col gap-2">
          {data.map((item, i) => (
            <ListItem
              key={i}
              {...item}
              {...savedPropsFor(item)}
              progressPct={tileProgress(item)}
              locked={!isPremium && !isLearnItemFree(item, tab)}
              onSelect={() => openItem(item)}
            />
          ))}
        </div>
      );
    }

    return (
      <div className={gridClassName}>
        {data.map((item) => {
          const itemKey = item.expandId ?? item.mode ?? item.title;
          const isHighlighted =
            highlightedGenre !== null && item.title === highlightedGenre;
          return (
            <motion.div layout="position" key={itemKey}>
              <CardItem
                {...item}
                {...savedPropsFor(item)}
                highlighted={isHighlighted}
                highlightRef={isHighlighted ? highlightRef : undefined}
                progressPct={tileProgress(item)}
                locked={!isPremium && !isLearnItemFree(item, tab)}
                onSelect={() => openItem(item)}
              />
            </motion.div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className="learn-root relative flex h-full"
      style={bare ? undefined : { backgroundColor: '#101012' }}
    >
      {!bare && <MeshGradientBg />}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Persistent Learn tab bar — rendered once at the top of the page so it
            stays in the same place across every tab (Home included) and does
            not scroll with the tab content below it. */}
        {!bare && (
          <div className="shrink-0 px-6 pt-4 md:px-10">
            <LearnTabBar />
          </div>
        )}
        {subTab === 'Home' ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <LearnHome />
          </div>
        ) : subTab === START_HERE_TAB ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <StartHere />
          </div>
        ) : subTab === 'Songs' ? (
          // Bare (the Learn page's tab pages): no background behind the
          // list, the page's glow showing through (owner, 2026-10-25).
          <div
            className={cn(
              'relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto',
              // Bare: the column headers right under the page's top.
              !bare && 'pt-4',
            )}
            style={bare ? undefined : { background: '#101012' }}
          >
            <div
              className="flex-1 overflow-y-auto px-6 md:px-10"
              style={bare ? undefined : { background: '#101012' }}
            >
              {/* Filter row pins at the top with the column headers just below;
                  the outer pt-4 + inner scroll wrapper mirror the Genre/Theory/
                  Technique tabs so the filter lands at the same vertical position. */}
              <SongLibraryBody clear={bare} />
            </div>
          </div>
        ) : (
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto pb-6 pl-6 pr-0 pt-4 md:pl-10">
            {/* {showFilter && (
          <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4 absolute top-[150px] left-8 right-8 z-20 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex justify-between items-start mb-4 pb-2 border-b border-white/5">
              <h3 className="text-sm font-medium text-gray-200">Filter</h3>
              <X size={16} className="text-gray-500 cursor-pointer hover:text-white" onClick={() => setShowFilter(false)} />
            </div>
            <div className="grid grid-cols-4 gap-4 h-64 overflow-y-auto custom-scrollbar">
              <div className="flex flex-col gap-1 border-r border-white/5 pr-4">
                <FilterCheckbox label="Diatonic Modes" />
                <FilterCheckbox label="Relative Modes" />
              </div>
              <div className="flex flex-col gap-1 border-r border-white/5 pr-4">
                <FilterCheckbox label="Lydian" />
                <FilterCheckbox label="Dorian" />
              </div>
              <div className="flex flex-col gap-1 border-r border-white/5 pr-4">
                {["C", "G", "D", "A"].map((key) => (
                  <FilterCheckbox key={key} label={key}  />
                ))}
              </div>
              <div className="flex flex-col gap-1">
                <FilterCheckbox label="7th Chords"  />
              </div>
            </div>
          </div>
        )} */}

            <div
              className="flex-1 overflow-y-auto"
              style={bare ? undefined : { background: '#101012' }}
            >
              {subTab === 'Theory' ? (
                <>
                  {/* The Learn page's tab pages show the tiles alone: no
                      filters or search (owner, 2026-10-25). */}
                  {!bare && (
                    <div
                      className="sticky top-0 z-10 pt-1 pb-3"
                      style={{ background: '#101012' }}
                    >
                      <LearnFilterRow>
                        <FilterDropdown
                          label="Mode Family"
                          value={theoryFilters.family}
                          options={MODE_FAMILY_OPTIONS}
                          onChange={(v) =>
                            setTheoryFilters((f) => ({ ...f, family: v }))
                          }
                        />
                        <FilterDropdown
                          label="Sort"
                          value={theoryFilters.sort}
                          options={THEORY_SORT_OPTIONS}
                          onChange={(v) =>
                            setTheoryFilters((f) => ({ ...f, sort: v }))
                          }
                        />
                        <FilterDropdown
                          label="Saved"
                          value={theoryFilters.saved}
                          options={SAVED_FILTER_OPTIONS}
                          onChange={(v) =>
                            setTheoryFilters((f) => ({
                              ...f,
                              saved: v as SavedFilter,
                            }))
                          }
                        />
                        <SearchInput
                          value={theoryFilters.search}
                          onChange={(v) =>
                            setTheoryFilters((f) => ({ ...f, search: v }))
                          }
                          onClear={() =>
                            setTheoryFilters((f) => ({ ...f, search: '' }))
                          }
                          placeholder="Search modes"
                        />
                      </LearnFilterRow>
                    </div>
                  )}
                  {theorySections.length === 0 ? (
                    <p
                      className="text-white/40"
                      style={{
                        fontSize: 13,
                        padding: '48px 0',
                        textAlign: 'center',
                      }}
                    >
                      No modes match these filters
                    </p>
                  ) : (
                    theorySections.map((section, i) => (
                      <CollapsibleSection
                        key={section.family}
                        defaultOpen={
                          section.defaultOpen || theoryFilters.search.length > 0
                        }
                        className={i === 0 ? 'mt-4' : 'mt-4 pt-4'}
                        style={
                          i === 0
                            ? undefined
                            : { borderTop: '1px solid var(--color-border)' }
                        }
                        title={section.title}
                      >
                        {renderContent(
                          section.items,
                          'Theory',
                          'grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5',
                        )}
                      </CollapsibleSection>
                    ))
                  )}
                </>
              ) : subTab === 'Technique' ? (
                <>
                  {/* The Learn page's tab pages show the tiles alone: no
                      filters or search (owner, 2026-10-25). */}
                  {!bare && (
                    <div
                      className="sticky top-0 z-10 pt-1 pb-3"
                      style={{ background: '#101012' }}
                    >
                      <LearnFilterRow>
                        <FilterDropdown
                          label="Category"
                          value={techniqueFilters.category}
                          options={TECHNIQUE_CATEGORY_OPTIONS}
                          onChange={(v) =>
                            setTechniqueFilters((f) => ({ ...f, category: v }))
                          }
                        />
                        <FilterDropdown
                          label="Difficulty"
                          value={techniqueFilters.difficulty}
                          options={TECHNIQUE_DIFFICULTY_OPTIONS}
                          onChange={(v) =>
                            setTechniqueFilters((f) => ({
                              ...f,
                              difficulty: v,
                            }))
                          }
                        />
                        <FilterDropdown
                          label="Sort"
                          value={techniqueFilters.sort}
                          options={TECHNIQUE_SORT_OPTIONS}
                          onChange={(v) =>
                            setTechniqueFilters((f) => ({ ...f, sort: v }))
                          }
                        />
                        <FilterDropdown
                          label="Saved"
                          value={techniqueFilters.saved}
                          options={SAVED_FILTER_OPTIONS}
                          onChange={(v) =>
                            setTechniqueFilters((f) => ({
                              ...f,
                              saved: v as SavedFilter,
                            }))
                          }
                        />
                        <SearchInput
                          value={techniqueFilters.search}
                          onChange={(v) =>
                            setTechniqueFilters((f) => ({ ...f, search: v }))
                          }
                          onClear={() =>
                            setTechniqueFilters((f) => ({ ...f, search: '' }))
                          }
                          placeholder="Search technique"
                        />
                      </LearnFilterRow>
                    </div>
                  )}
                  {filteredTechnique.length === 0 ? (
                    <p
                      className="text-white/40"
                      style={{
                        fontSize: 13,
                        padding: '48px 0',
                        textAlign: 'center',
                      }}
                    >
                      {/* Guitar's Technique page (the Learn page shows it):
                          no lessons yet, rather than a filter that matched
                          nothing. */}
                      {techniqueData.length === 0
                        ? 'Technique lessons for guitar are coming soon'
                        : 'No items match these filters'}
                    </p>
                  ) : (
                    <CollapsibleSection
                      defaultOpen
                      className="mt-4"
                      title="Foundational"
                    >
                      {renderContent(
                        filteredTechnique,
                        'Technique',
                        'grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5',
                      )}
                    </CollapsibleSection>
                  )}
                </>
              ) : subTab === 'WorldHarmony' ? (
                <WorldHarmony />
              ) : (
                <>
                  {/* The Learn page's tab pages show the tiles alone: no
                      filters or search (owner, 2026-10-25). */}
                  {!bare && (
                    <div
                      className="sticky top-0 z-10 pt-1 pb-3"
                      style={{ background: '#101012' }}
                    >
                      <LearnFilterRow>
                        <FilterDropdown
                          label="Difficulty"
                          value={coursesFilters.level}
                          options={COURSES_LEVEL_OPTIONS}
                          onChange={(v) =>
                            setCoursesFilters((f) => ({ ...f, level: v }))
                          }
                        />
                        <FilterDropdown
                          label="Saved"
                          value={coursesFilters.saved}
                          options={SAVED_FILTER_OPTIONS}
                          onChange={(v) =>
                            setCoursesFilters((f) => ({
                              ...f,
                              saved: v as SavedFilter,
                            }))
                          }
                        />
                        <FilterDropdown
                          label="Sort"
                          value={coursesFilters.sort}
                          options={COURSES_SORT_OPTIONS}
                          onChange={(v) =>
                            setCoursesFilters((f) => ({ ...f, sort: v }))
                          }
                        />
                        <SearchInput
                          value={coursesFilters.search}
                          onChange={(v) =>
                            setCoursesFilters((f) => ({ ...f, search: v }))
                          }
                          onClear={() =>
                            setCoursesFilters((f) => ({ ...f, search: '' }))
                          }
                          placeholder="Search courses"
                        />
                      </LearnFilterRow>
                    </div>
                  )}
                  {filteredCourses.length === 0 ? (
                    <p
                      className="text-white/40"
                      style={{
                        fontSize: 13,
                        padding: '48px 0',
                        textAlign: 'center',
                      }}
                    >
                      No courses match these filters
                    </p>
                  ) : (
                    <div className="mt-4">
                      {renderContent(
                        filteredCourses,
                        'Genre',
                        'grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5',
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
