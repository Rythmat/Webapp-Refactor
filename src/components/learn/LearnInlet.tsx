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
import {
  LearnRoutes,
  CurriculumRoutes,
  StudioRoutes,
} from '@/constants/routes';
import { SLUG_TO_CURRICULUM_GENRE } from '@/curriculum/bridge/genreIdMap';
import { getActivityFlow } from '@/curriculum/data/activityFlows';
import { getGenreProfile } from '@/curriculum/data/genreProfiles';
import { buildCurriculumLessonId } from '@/curriculum/hooks/useCurriculumProgress';
import { MeshGradientBg } from '@/daw/components/MeshGradientBg';
import {
  useSavedItemsStore,
  type SavedItemKind,
} from '@/features/learn/useSavedItemsStore';
import type { PrismModeSlug } from '@/hooks/data';
import { useProgressSummary } from '@/hooks/data/progress/useProgressSummary';
import { useIsPremium } from '@/hooks/useIsPremium';
import { defaultAvatarConfig } from '@/lib/avatarHexGrid';
import { colorForKeyMode } from '@/lib/modeColorShift';
import { keyLabelToUrlParam } from '@/lib/musicKeyUrl';
import type { ProgressSummaryResponse } from '@/lib/progress/types';
import { SongLibraryBody } from '../songLibrary/SongLibraryPage';
import { HexAvatarSVG } from '../ui/HexAvatarSVG';
import { LockedFeatureOverlay } from '../ui/LockedFeatureOverlay';
import { HexWaveBackground } from '../ui/hex-wave-background';
import { LearnHome } from './LearnHome';
import { LearnTabBar } from './LearnTabBar';
import { WorldHarmony } from './WorldHarmony';
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
}

interface ContentItem {
  title: string;
  mode?: string;
  route?: string;
  expandId?: string;
  subItems?: ContentSubItem[];
  image?: string;
  /** When true (and `image` is a polygon honeycomb), the tile art is an
   *  interactive hex canvas that paints on hover and drifts on its own. */
  interactive?: boolean;
}

interface SelectedSubItem {
  label: string;
  route: string;
  completionPct: number;
  sections: { id: string; name: string; stepCount?: number; route?: string }[];
}

function getLessonCompletion(
  summary: ProgressSummaryResponse | undefined,
  lessonIdPrefix: string,
  mode?: string,
  root?: string,
): number {
  if (!summary) return 0;
  const lesson = summary.lessons.find((l) => {
    if (mode && root) {
      return (
        l.lessonId.startsWith(lessonIdPrefix) &&
        l.mode?.toLowerCase() === mode.toLowerCase() &&
        l.root?.toLowerCase() === root.toLowerCase()
      );
    }
    return l.lessonId === lessonIdPrefix;
  });
  if (!lesson || !lesson.totalCount) return 0;
  return Math.round((lesson.completedCount / lesson.totalCount) * 100);
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

const THEORY_SECTIONS = [
  { id: 'O', name: 'Overview' },
  { id: 'A', name: 'Melody' },
  { id: 'B', name: 'Chords' },
  { id: 'D', name: 'Practice Track' },
];

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
      route: LearnRoutes.lesson({
        mode: mode.slug,
        key: keyLabelToUrlParam(note),
      }),
    };
  });
}

function buildParallelSubItems(keyLabel: string): ContentSubItem[] {
  return DIATONIC_MODES.map((mode) => ({
    label: `${keyLabel} ${mode.title}`,
    color: colorForKeyMode(keyLabel, mode.slug as PrismModeSlug),
    route: LearnRoutes.lesson({
      mode: mode.slug,
      key: keyLabelToUrlParam(keyLabel),
    }),
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

const COURSES_DATA: ContentItem[] = [
  {
    title: 'Pop',
    route: CurriculumRoutes.genre({ genre: 'pop' }),
    expandId: 'course:pop',
    subItems: buildGenreLevels('pop'),
    image: '/learn-tiles/pop.svg',
    interactive: true,
  },
  {
    title: 'Rock',
    route: CurriculumRoutes.genre({ genre: 'rock' }),
    expandId: 'course:rock',
    subItems: buildGenreLevels('rock'),
    image: '/learn-tiles/rock-hex.svg',
    interactive: true,
  },
  {
    title: 'Hip Hop',
    route: CurriculumRoutes.genre({ genre: 'hip hop' }),
    expandId: 'course:hip hop',
    subItems: buildGenreLevels('hip hop'),
    image: '/learn-tiles/hip-hop-hex.svg',
    interactive: true,
  },
  {
    title: 'R&B',
    route: CurriculumRoutes.genre({ genre: 'rnb' }),
    expandId: 'course:rnb',
    subItems: buildGenreLevels('rnb'),
    image: '/learn-tiles/r-and-b-hex.svg',
    interactive: true,
  },
  {
    title: 'Jazz',
    route: CurriculumRoutes.genre({ genre: 'jazz' }),
    expandId: 'course:jazz',
    subItems: buildGenreLevels('jazz'),
    image: '/learn-tiles/jazz-hex.svg',
    interactive: true,
  },
  {
    title: 'Blues',
    route: CurriculumRoutes.genre({ genre: 'blues' }),
    expandId: 'course:blues',
    subItems: buildGenreLevels('blues'),
    image: '/learn-tiles/blues-hex.svg',
    interactive: true,
  },
  {
    title: 'Folk',
    route: CurriculumRoutes.genre({ genre: 'folk' }),
    expandId: 'course:folk',
    subItems: buildGenreLevels('folk'),
    image: '/learn-tiles/folk-hex.svg',
    interactive: true,
  },
  {
    title: 'Funk',
    route: CurriculumRoutes.genre({ genre: 'funk' }),
    expandId: 'course:funk',
    subItems: buildGenreLevels('funk'),
    image: '/learn-tiles/funk-hex.svg',
    interactive: true,
  },
  {
    title: 'Neo Soul',
    route: CurriculumRoutes.genre({ genre: 'neo-soul' }),
    expandId: 'course:neo-soul',
    subItems: buildGenreLevels('neo-soul'),
    image: '/learn-tiles/neo-soul-hex.svg',
    interactive: true,
  },
  {
    title: 'Electronic',
    route: CurriculumRoutes.genre({ genre: 'electronic' }),
    expandId: 'course:electronic',
    subItems: buildGenreLevels('electronic'),
    image: '/learn-tiles/electronic-hex.svg',
    interactive: true,
  },
  {
    title: 'Latin',
    route: CurriculumRoutes.genre({ genre: 'latin' }),
    expandId: 'course:latin',
    subItems: buildGenreLevels('latin'),
    image: '/learn-tiles/latin-hex.svg',
    interactive: true,
  },
  {
    title: 'Reggae',
    route: CurriculumRoutes.genre({ genre: 'reggae' }),
    expandId: 'course:reggae',
    subItems: buildGenreLevels('reggae'),
    image: '/learn-tiles/reggae-hex.svg',
    interactive: true,
  },
  {
    title: 'Jam Band',
    route: CurriculumRoutes.genre({ genre: 'jam-band' }),
    expandId: 'course:jam-band',
    subItems: buildGenreLevels('jam-band'),
    image: '/learn-tiles/jam-band-hex.svg',
    interactive: true,
  },
  {
    title: 'African',
    route: CurriculumRoutes.genre({ genre: 'african' }),
    expandId: 'course:african',
    subItems: buildGenreLevels('african'),
    image: '/learn-tiles/african-hex.svg',
    interactive: true,
  },
];

const THEORY_DATA: ContentItem[] = [
  {
    title: 'Lydian',
    mode: 'lydian',
    route: LearnRoutes.overview({ mode: 'lydian' }),
    image: '/learn-tiles/theory/lydian.svg',
    interactive: true,
  },
  {
    title: 'Ionian (Major)',
    mode: 'ionian',
    route: LearnRoutes.overview({ mode: 'ionian' }),
    image: '/learn-tiles/theory/ionian.svg',
    interactive: true,
  },
  {
    title: 'Mixolydian',
    mode: 'mixolydian',
    route: LearnRoutes.overview({ mode: 'mixolydian' }),
    image: '/learn-tiles/theory/mixolydian.svg',
    interactive: true,
  },
  {
    title: 'Dorian',
    mode: 'dorian',
    route: LearnRoutes.overview({ mode: 'dorian' }),
    image: '/learn-tiles/theory/dorian.svg',
    interactive: true,
  },
  {
    title: 'Aeolian (Minor)',
    mode: 'aeolian',
    route: LearnRoutes.overview({ mode: 'aeolian' }),
    image: '/learn-tiles/theory/aeolian.svg',
    interactive: true,
  },
  {
    title: 'Phrygian',
    mode: 'phrygian',
    route: LearnRoutes.overview({ mode: 'phrygian' }),
    image: '/learn-tiles/theory/phrygian.svg',
    interactive: true,
  },
  {
    title: 'Locrian',
    mode: 'locrian',
    route: LearnRoutes.overview({ mode: 'locrian' }),
    image: '/learn-tiles/theory/locrian.svg',
    interactive: true,
  },
];

const TECHNIQUE_DATA: ContentItem[] = [
  {
    title: 'Piano Fundamentals',
    route: CurriculumRoutes.genre({ genre: 'piano-fundamentals' }),
    image: '/learn-tiles/beginner-hex.svg',
    interactive: true,
  },
  {
    title: 'Applied Theory Fundamentals',
    route: CurriculumRoutes.appliedTheoryFundamentals(),
    image: '/learn-tiles/beginner-hex.svg',
    interactive: true,
  },
];

const RELATIVE_MODES_DATA: ContentItem[] = [
  {
    title: 'Red',
    route: '/learn/relative/c',
    expandId: 'relative:c',
    subItems: buildRelativeSubItems('C'),
    image: '/learn-tiles/theory/relative-c.svg',
    interactive: true,
  },
  {
    title: 'Vermillion',
    route: '/learn/relative/g',
    expandId: 'relative:g',
    subItems: buildRelativeSubItems('G'),
    image: '/learn-tiles/theory/relative-g.svg',
    interactive: true,
  },
  {
    title: 'Orange',
    route: '/learn/relative/d',
    expandId: 'relative:d',
    subItems: buildRelativeSubItems('D'),
    image: '/learn-tiles/theory/relative-d.svg',
    interactive: true,
  },
  {
    title: 'Amber',
    route: '/learn/relative/a',
    expandId: 'relative:a',
    subItems: buildRelativeSubItems('A'),
    image: '/learn-tiles/theory/relative-a.svg',
    interactive: true,
  },
  {
    title: 'Green',
    route: '/learn/relative/e',
    expandId: 'relative:e',
    subItems: buildRelativeSubItems('E'),
    image: '/learn-tiles/theory/relative-e.svg',
    interactive: true,
  },
  {
    title: 'Sage',
    route: '/learn/relative/b',
    expandId: 'relative:b',
    subItems: buildRelativeSubItems('B'),
    image: '/learn-tiles/theory/relative-b.svg',
    interactive: true,
  },
  {
    title: 'Teal',
    route: '/learn/relative/fsharp',
    expandId: 'relative:fsharp',
    subItems: buildRelativeSubItems('F#'),
    image: '/learn-tiles/theory/relative-fsharp.svg',
    interactive: true,
  },
  {
    title: 'Blue',
    route: '/learn/relative/dflat',
    expandId: 'relative:dflat',
    subItems: buildRelativeSubItems('D♭'),
    image: '/learn-tiles/theory/relative-dflat.svg',
    interactive: true,
  },
  {
    title: 'Indigo',
    route: '/learn/relative/aflat',
    expandId: 'relative:aflat',
    subItems: buildRelativeSubItems('A♭'),
    image: '/learn-tiles/theory/relative-aflat.svg',
    interactive: true,
  },
  {
    title: 'Purple',
    route: '/learn/relative/eflat',
    expandId: 'relative:eflat',
    subItems: buildRelativeSubItems('E♭'),
    image: '/learn-tiles/theory/relative-eflat.svg',
    interactive: true,
  },
  {
    title: 'Magenta',
    route: '/learn/relative/bflat',
    expandId: 'relative:bflat',
    subItems: buildRelativeSubItems('B♭'),
    image: '/learn-tiles/theory/relative-bflat.svg',
    interactive: true,
  },
  {
    title: 'Pink',
    route: '/learn/relative/f',
    expandId: 'relative:f',
    subItems: buildRelativeSubItems('F'),
    image: '/learn-tiles/theory/relative-f.svg',
    interactive: true,
  },
];

const PARALLEL_MODES_DATA: ContentItem[] = [
  {
    title: 'C',
    route: '/learn/parallel/c',
    expandId: 'parallel:c',
    subItems: buildParallelSubItems('C'),
    image: '/learn-tiles/theory/parallel-c.svg',
    interactive: true,
  },
  {
    title: 'G',
    route: '/learn/parallel/g',
    expandId: 'parallel:g',
    subItems: buildParallelSubItems('G'),
    image: '/learn-tiles/theory/parallel-g.svg',
    interactive: true,
  },
  {
    title: 'D',
    route: '/learn/parallel/d',
    expandId: 'parallel:d',
    subItems: buildParallelSubItems('D'),
    image: '/learn-tiles/theory/parallel-d.svg',
    interactive: true,
  },
  {
    title: 'A',
    route: '/learn/parallel/a',
    expandId: 'parallel:a',
    subItems: buildParallelSubItems('A'),
    image: '/learn-tiles/theory/parallel-a.svg',
    interactive: true,
  },
  {
    title: 'E',
    route: '/learn/parallel/e',
    expandId: 'parallel:e',
    subItems: buildParallelSubItems('E'),
    image: '/learn-tiles/theory/parallel-e.svg',
    interactive: true,
  },
  {
    title: 'B',
    route: '/learn/parallel/b',
    expandId: 'parallel:b',
    subItems: buildParallelSubItems('B'),
    image: '/learn-tiles/theory/parallel-b.svg',
    interactive: true,
  },
  {
    title: 'F#',
    route: '/learn/parallel/fsharp',
    expandId: 'parallel:fsharp',
    subItems: buildParallelSubItems('F#'),
    image: '/learn-tiles/theory/parallel-fsharp.svg',
    interactive: true,
  },
  {
    title: 'D♭',
    route: '/learn/parallel/dflat',
    expandId: 'parallel:dflat',
    subItems: buildParallelSubItems('D♭'),
    image: '/learn-tiles/theory/parallel-dflat.svg',
    interactive: true,
  },
  {
    title: 'A♭',
    route: '/learn/parallel/aflat',
    expandId: 'parallel:aflat',
    subItems: buildParallelSubItems('A♭'),
    image: '/learn-tiles/theory/parallel-aflat.svg',
    interactive: true,
  },
  {
    title: 'E♭',
    route: '/learn/parallel/eflat',
    expandId: 'parallel:eflat',
    subItems: buildParallelSubItems('E♭'),
    image: '/learn-tiles/theory/parallel-eflat.svg',
    interactive: true,
  },
  {
    title: 'B♭',
    route: '/learn/parallel/bflat',
    expandId: 'parallel:bflat',
    subItems: buildParallelSubItems('B♭'),
    image: '/learn-tiles/theory/parallel-bflat.svg',
    interactive: true,
  },
  {
    title: 'F',
    route: '/learn/parallel/f',
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
    route: LearnRoutes.overview({ mode: 'harmonicminor' }),
    image: '/learn-tiles/theory/harmonicminor.svg',
    interactive: true,
  },
  {
    title: 'Locrian ♮6',
    mode: 'locriannat6',
    route: LearnRoutes.overview({ mode: 'locriannat6' }),
    image: '/learn-tiles/theory/locrian-nat6.svg',
    interactive: true,
  },
  {
    title: 'Ionian #5',
    mode: 'ionian#5',
    route: LearnRoutes.overview({ mode: 'ionian#5' }),
    image: '/learn-tiles/theory/ionian-sharp5.svg',
    interactive: true,
  },
  {
    title: 'Dorian #4',
    mode: 'dorian#4',
    route: LearnRoutes.overview({ mode: 'dorian#4' }),
    image: '/learn-tiles/theory/dorian-sharp4.svg',
    interactive: true,
  },
  {
    title: 'Phrygian Dominant',
    mode: 'phrygiandominant',
    route: LearnRoutes.overview({ mode: 'phrygiandominant' }),
    image: '/learn-tiles/theory/phrygiandominant.svg',
    interactive: true,
  },
  {
    title: 'Lydian #2',
    mode: 'lydian#2',
    route: LearnRoutes.overview({ mode: 'lydian#2' }),
    image: '/learn-tiles/theory/lydian-sharp2.svg',
    interactive: true,
  },
  {
    title: 'Altered Diminished',
    mode: 'altereddiminished',
    route: LearnRoutes.overview({ mode: 'altereddiminished' }),
    image: '/learn-tiles/theory/altereddiminished.svg',
    interactive: true,
  },
];

const MELODIC_MINOR_DATA: ContentItem[] = [
  {
    title: 'Melodic Minor',
    mode: 'melodicminor',
    route: LearnRoutes.overview({ mode: 'melodicminor' }),
    image: '/learn-tiles/theory/melodicminor.svg',
    interactive: true,
  },
  {
    title: 'Dorian ♭2',
    mode: 'dorian♭2',
    route: LearnRoutes.overview({ mode: 'dorian♭2' }),
    image: '/learn-tiles/theory/dorian-flat2.svg',
    interactive: true,
  },
  {
    title: 'Lydian Augmented',
    mode: 'lydianaugmented',
    route: LearnRoutes.overview({ mode: 'lydianaugmented' }),
    image: '/learn-tiles/theory/lydianaugmented.svg',
    interactive: true,
  },
  {
    title: 'Lydian Dominant',
    mode: 'lydiandominant',
    route: LearnRoutes.overview({ mode: 'lydiandominant' }),
    image: '/learn-tiles/theory/lydiandominant.svg',
    interactive: true,
  },
  {
    title: 'Mixolydian ♭6',
    mode: 'mixolydiannat6',
    route: LearnRoutes.overview({ mode: 'mixolydiannat6' }),
    image: '/learn-tiles/theory/mixolydian-flat6.svg',
    interactive: true,
  },
  {
    title: 'Locrian ♮2',
    mode: 'locriannat2',
    route: LearnRoutes.overview({ mode: 'locriannat2' }),
    image: '/learn-tiles/theory/locrian-nat2.svg',
    interactive: true,
  },
  {
    title: 'Altered Dominant',
    mode: 'altereddominant',
    route: LearnRoutes.overview({ mode: 'altereddominant' }),
    image: '/learn-tiles/theory/altereddominant.svg',
    interactive: true,
  },
];

const HARMONIC_MAJOR_DATA: ContentItem[] = [
  {
    title: 'Harmonic Major',
    mode: 'harmonicmajor',
    route: LearnRoutes.overview({ mode: 'harmonicmajor' }),
    image: '/learn-tiles/theory/harmonicmajor.svg',
    interactive: true,
  },
  {
    title: 'Dorian ♭5',
    mode: 'dorian♭5',
    route: LearnRoutes.overview({ mode: 'dorian♭5' }),
    image: '/learn-tiles/theory/dorian-flat5.svg',
    interactive: true,
  },
  {
    title: 'Altered Dominant ♮5',
    mode: 'altereddominantnat5',
    route: LearnRoutes.overview({ mode: 'altereddominantnat5' }),
    image: '/learn-tiles/theory/altereddominant-nat5.svg',
    interactive: true,
  },
  {
    title: 'Melodic Minor #4',
    mode: 'melodicminor#4',
    route: LearnRoutes.overview({ mode: 'melodicminor#4' }),
    image: '/learn-tiles/theory/melodicminor-sharp4.svg',
    interactive: true,
  },
  {
    title: 'Mixolydian ♭2',
    mode: 'mixolydian♭2',
    route: LearnRoutes.overview({ mode: 'mixolydian♭2' }),
    image: '/learn-tiles/theory/mixolydian-flat2.svg',
    interactive: true,
  },
  {
    title: 'Lydian Augmented #2',
    mode: 'lydianaugmented#2',
    route: LearnRoutes.overview({ mode: 'lydianaugmented#2' }),
    image: '/learn-tiles/theory/lydianaugmented-sharp2.svg',
    interactive: true,
  },
  {
    title: 'Locrian 𝄫7',
    mode: 'locrian𝄫7',
    route: LearnRoutes.overview({ mode: 'locrian𝄫7' }),
    image: '/learn-tiles/theory/locrian-bb7.svg',
    interactive: true,
  },
];

const DOUBLE_HARMONIC_DATA: ContentItem[] = [
  {
    title: 'Double Harmonic Major',
    mode: 'doubleharmonicmajor',
    route: LearnRoutes.overview({ mode: 'doubleharmonicmajor' }),
    image: '/learn-tiles/theory/doubleharmonicmajor.svg',
    interactive: true,
  },
  {
    title: 'Lydian #2 #6',
    mode: 'lydian#2#6',
    route: LearnRoutes.overview({ mode: 'lydian#2#6' }),
    image: '/learn-tiles/theory/lydian-sharp2-sharp6.svg',
    interactive: true,
  },
  {
    title: 'Ultraphrygian',
    mode: 'ultraphrygian',
    route: LearnRoutes.overview({ mode: 'ultraphrygian' }),
    image: '/learn-tiles/theory/ultraphrygian.svg',
    interactive: true,
  },
  {
    title: 'Double Harmonic Minor',
    mode: 'doubleharmonicminor',
    route: LearnRoutes.overview({ mode: 'doubleharmonicminor' }),
    image: '/learn-tiles/theory/doubleharmonicminor.svg',
    interactive: true,
  },
  {
    title: 'Oriental',
    mode: 'oriental',
    route: LearnRoutes.overview({ mode: 'oriental' }),
    image: '/learn-tiles/theory/oriental.svg',
    interactive: true,
  },
  {
    title: 'Ionian #2 #5',
    mode: 'ionian#2#5',
    route: LearnRoutes.overview({ mode: 'ionian#2#5' }),
    image: '/learn-tiles/theory/ionian-sharp2-sharp5.svg',
    interactive: true,
  },
  {
    title: 'Locrian 𝄫3 𝄫7',
    mode: 'locrian𝄫3𝄫7',
    route: LearnRoutes.overview({ mode: 'locrian𝄫3𝄫7' }),
    image: '/learn-tiles/theory/locrian-bb3-bb7.svg',
    interactive: true,
  },
];

const KEY_LABELS = [
  'C',
  'G',
  'D',
  'A',
  'E',
  'B',
  'F#',
  'D♭',
  'A♭',
  'E♭',
  'B♭',
  'F',
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
        className="group mb-4 flex w-fit cursor-pointer select-none items-center gap-2"
        style={{
          color: 'var(--color-text)',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}
        onClick={() => setIsOpen(!isOpen)}
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
 *  - Theory (Diatonic Modes) → "Ionian (Major)" — specifically the C key sub-item
 *
 * Everything else (all courses, all other modes, relative/parallel/harmonic/melodic/
 * double-harmonic sections) is premium-only.
 */
function isLearnItemFree(item: ContentItem, tab: string): boolean {
  return (
    tab === 'Technique' || // Piano Fundamentals
    (tab === 'Theory' && item.mode === 'ionian') // C Ionian available
  );
}

interface CardItemProps {
  title: string;
  mode?: string;
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
}

const CardItem: React.FC<CardItemProps> = ({
  title,
  mode,
  subItems,
  onSelect,
  highlighted,
  highlightRef,
  expanded,
  imageSize,
  onToggleExpand,
  image,
  interactive,
  progressPct,
  locked,
  savedKind,
  savedId,
}) => {
  const hasExpansion = !!(mode || subItems);
  const isSaved = useSavedItemsStore((s) =>
    savedKind && savedId ? Boolean(s.saved[`${savedKind}:${savedId}`]) : false,
  );
  const toggleSavedItem = useSavedItemsStore((s) => s.toggleSaved);

  return (
    <LockedFeatureOverlay locked={!!locked}>
      <div
        ref={highlightRef}
        className={`group flex cursor-pointer flex-col gap-3 ${highlighted ? 'genre-highlight' : ''}`}
      >
        <div
          className={`glass-panel relative ${imageSize ? '' : interactive ? 'aspect-[3/4]' : 'aspect-square'} overflow-hidden rounded-2xl transition-colors duration-150`}
          style={{
            ...(imageSize ? { width: imageSize, height: imageSize } : {}),
            background: 'rgba(255,255,255,0.03)',
            border: expanded
              ? '2px solid var(--color-accent)'
              : highlighted
                ? '2px solid var(--color-accent)'
                : '1px solid var(--color-border)',
          }}
          onClick={onSelect}
        >
          {image && interactive ? (
            <HexWaveBackground
              src={image}
              drain={false}
              ambient
              className="pointer-events-none absolute inset-0 transition-transform duration-500 group-hover:scale-105"
              backgroundColor="#0D0B08"
              colorThreshold={0.05}
              brushRadius={70}
            />
          ) : image ? (
            <img
              src={image}
              alt={title}
              className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <HexAvatarSVG
              config={defaultAvatarConfig(title)}
              circular={false}
              className="absolute left-0 top-0 size-[120%] transition-transform duration-500 group-hover:scale-105"
            />
          )}
          <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
          {savedKind && savedId && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleSavedItem(savedKind, savedId);
              }}
              aria-label={isSaved ? 'Remove from saved' : 'Save'}
              aria-pressed={isSaved}
              className="absolute top-2 right-2 z-10 rounded-full p-1.5 bg-black/30 hover:bg-black/50 transition-colors"
            >
              <Heart
                size={16}
                fill={isSaved ? 'currentColor' : 'none'}
                style={{
                  color: isSaved ? '#ffffff' : 'rgba(255,255,255,0.85)',
                }}
              />
            </button>
          )}
        </div>
        <div className="flex items-start justify-between px-1">
          <h3
            className="text-lg font-semibold"
            style={{ color: 'var(--color-text)' }}
          >
            {title}
          </h3>
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
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand?.();
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
}) => {
  const hasExpansion = !!(mode || subItems);
  const isSaved = useSavedItemsStore((s) =>
    savedKind && savedId ? Boolean(s.saved[`${savedKind}:${savedId}`]) : false,
  );
  const toggleSavedItem = useSavedItemsStore((s) => s.toggleSaved);

  return (
    <LockedFeatureOverlay locked={!!locked}>
      <button
        type="button"
        onClick={onSelect}
        className="group flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-white/[0.04]"
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
        {progressPct != null && progressPct > 0 && (
          <span
            className="flex-shrink-0 text-xs tabular-nums"
            style={{ color: 'var(--color-text-dim)' }}
          >
            {progressPct}%
          </span>
        )}
        {savedKind && savedId && (
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
}

export const LearnInlet: React.FC<LearnInletProps> = ({
  initialTab,
  setSubTab: parentSetSubTab,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const genreParam = searchParams.get('genre');
  const tabParam = searchParams.get('tab');
  const { isPremium } = useIsPremium();
  const validTabs = ['Songs', 'Genre', 'Theory', 'Technique', 'WorldHarmony'];
  const defaultTab =
    tabParam && validTabs.includes(tabParam)
      ? tabParam
      : genreParam
        ? 'Genre'
        : initialTab && validTabs.includes(initialTab)
          ? initialTab
          : 'Home';
  const [subTab, setSubTab] = useState(defaultTab);
  const [highlightedGenre, setHighlightedGenre] = useState<string | null>(
    genreParam,
  );
  const highlightRef = useRef<HTMLDivElement>(null);
  const [expandedMode, setExpandedMode] = useState<string | null>(null);
  const [selectedSubItem, setSelectedSubItem] =
    useState<SelectedSubItem | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(
    null,
  );
  // Responsive column count of the tile grid (grid-cols-2 → md:grid-cols-4);
  // used to span the inline expansion panel across a row's remaining columns.
  const [gridCols, setGridCols] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(min-width: 768px)').matches
      ? 4
      : 2,
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => setGridCols(mq.matches ? 4 : 2);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

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
    const all = [
      {
        family: 'diatonic' as ModeFamily,
        title: 'Diatonic Modes',
        items: THEORY_DATA,
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
            applySearch(s.items, theoryFilters.search),
            theoryFilters.saved,
            (i) => !!i.mode && Boolean(savedLearnItems[`mode:${i.mode}`]),
          ),
          theoryFilters.sort,
        ),
      }))
      .filter((s) => s.items.length > 0);
  }, [theoryFilters, savedLearnItems]);

  const filteredTechnique = useMemo(() => {
    const searched = applySearch(TECHNIQUE_DATA, techniqueFilters.search);
    const savedFiltered = applySavedFilter(
      searched,
      techniqueFilters.saved,
      (i) => Boolean(savedLearnItems[`technique:${i.title}`]),
    );
    // category + difficulty have no backing data today — wired but no-op
    return applyTechniqueSort(savedFiltered, techniqueFilters.sort);
  }, [techniqueFilters, savedLearnItems]);

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

  const handleLevelSelect = async (sub: ContentSubItem) => {
    if (sub.genre && sub.level) {
      const flow = await getActivityFlow(sub.genre, sub.level);
      if (flow) {
        const genreId = SLUG_TO_CURRICULUM_GENRE[sub.genre];
        const levelId = `L${sub.level}` as 'L1' | 'L2' | 'L3';
        const lessonId = genreId
          ? buildCurriculumLessonId(genreId, levelId)
          : '';
        const flowSections = flow.sections.map((s) => ({
          id: s.id,
          name: s.name,
          stepCount: s.steps.length,
          route: CurriculumRoutes.genreLevel(
            { genre: sub.genre!, level: String(sub.level) },
            { section: s.id },
          ),
        }));
        const hasProfile = !!getGenreProfile(sub.genre);
        setSelectedSubItem({
          label: `Level ${sub.level}`,
          route: sub.route,
          completionPct: getLessonCompletion(progressSummary, lessonId),
          sections: hasProfile
            ? [
                {
                  id: 'O',
                  name: 'Overview',
                  route: CurriculumRoutes.genre({ genre: sub.genre }),
                },
                ...flowSections,
              ]
            : flowSections,
        });
        return;
      }
    }
    navigate(sub.route);
  };

  const handleKeySelect = (
    mode: string,
    keyLabel: string,
    modeTitle: string,
  ) => {
    const pct = getLessonCompletion(
      progressSummary,
      'mode-lesson-flow',
      mode,
      keyLabelToUrlParam(keyLabel),
    );
    // Practice Track is only offered for the 7 diatonic modes (DIATONIC_MODES
    // above already enumerates exactly those slugs).
    const isDiatonicMode = DIATONIC_MODES.some((m) => m.slug === mode);
    const sections = isDiatonicMode
      ? THEORY_SECTIONS.map((section) =>
          section.id === 'D'
            ? {
                ...section,
                route: `${StudioRoutes.editor.definition}?practiceMode=${mode}&practiceRoot=${keyLabelToUrlParam(keyLabel)}&practiceOpen=melody`,
              }
            : section,
        )
      : THEORY_SECTIONS.filter((section) => section.id !== 'D');
    setSelectedSubItem({
      label: `${keyLabel} ${modeTitle}`,
      route: LearnRoutes.lesson({ mode, key: keyLabelToUrlParam(keyLabel) }),
      completionPct: pct,
      sections,
    });
  };

  // Auto-select the first key/level when a tile is expanded
  useEffect(() => {
    if (!expandedMode) return;
    const data =
      subTab === 'Genre'
        ? COURSES_DATA
        : subTab === 'Theory'
          ? THEORY_DATA
          : TECHNIQUE_DATA;
    const item = data.find((d) => (d.expandId ?? d.mode) === expandedMode);
    if (item?.mode) {
      handleKeySelect(item.mode, KEY_LABELS[0], item.title);
    } else if (item?.subItems?.[0]) {
      handleLevelSelect(item.subItems[0]);
    }
  }, [expandedMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select the first chapter when a key/level is selected
  useEffect(() => {
    if (selectedSubItem?.sections?.[0]) {
      setSelectedChapterId(selectedSubItem.sections[0].id);
    } else {
      setSelectedChapterId(null);
    }
  }, [selectedSubItem]);

  // Auto-select tab from ?tab= param (and reset to Songs when param is cleared)
  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam)) {
      setSubTab(tabParam);
    } else if (!tabParam) {
      setSubTab('Home');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam]);

  // Auto-select Genre tab and highlight the genre when arriving from Globe.
  // Skip while the Songs tab is active: the Songs filter also writes ?genre=,
  // and hijacking it here would clear the URL (dropping ?tab=Songs) and bounce
  // the user to the Learn Home.
  useEffect(() => {
    if (genreParam && tabParam !== 'Songs') {
      setSubTab('Genre');
      setHighlightedGenre(genreParam);
      // Clear the query param from the URL without adding a history entry
      setSearchParams({}, { replace: true });
    }
  }, [genreParam, tabParam, setSearchParams]);

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
      if (tab === 'Theory' && item.mode)
        return { savedKind: 'mode', savedId: item.mode };
      if (tab === 'Technique')
        return { savedKind: 'technique', savedId: item.title };
      if (tab === 'Genre' && item.expandId)
        return { savedKind: 'course', savedId: item.expandId };
      return {};
    };

    // Click a tile: toggle its inline expansion (modes/genres) or navigate.
    const toggleExpand = (item: ContentItem) => {
      const key = item.expandId ?? item.mode;
      if (item.mode || item.subItems) {
        setSelectedSubItem(null);
        setExpandedMode(key === expandedMode ? null : (key ?? null));
      } else if (item.route) {
        navigate(item.route);
      }
    };

    // Keys/Levels + Chapter detail panels — shown inline beside the expanded
    // tile (width-fluid so they fit the row's remaining columns).
    const renderPanels = (expandedItem: ContentItem) => (
      <div className="flex flex-wrap gap-4">
        <div
          className="glass-panel-sm flex w-64 max-w-full flex-col gap-0.5 rounded-xl p-4"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--color-border)',
          }}
        >
          <h4
            className="mb-2 text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--color-text-dim)' }}
          >
            {expandedItem.mode ? 'Keys' : 'Levels'}
          </h4>
          {(() => {
            const items: React.ReactNode[] = [];
            if (expandedItem.mode && !expandedItem.subItems) {
              KEY_LABELS.forEach((keyLabel) => {
                const keyColor = colorForKeyMode(
                  keyLabel,
                  expandedItem.mode as PrismModeSlug,
                );
                const isSelected =
                  selectedSubItem?.label ===
                  `${keyLabel} ${expandedItem.title}`;
                const keyPct = getLessonCompletion(
                  progressSummary,
                  'mode-lesson-flow',
                  expandedItem.mode,
                  keyLabelToUrlParam(keyLabel),
                );
                items.push(
                  <div
                    key={keyLabel}
                    className="flex cursor-pointer items-center justify-between rounded-md px-3 py-1.5 text-sm transition-colors duration-150"
                    style={{
                      color: keyColor,
                      ...(isSelected
                        ? { background: 'rgba(255,255,255,0.06)' }
                        : {}),
                    }}
                    onClick={() =>
                      handleKeySelect(
                        expandedItem.mode!,
                        keyLabel,
                        expandedItem.title,
                      )
                    }
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        'rgba(255,255,255,0.04)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isSelected
                        ? 'rgba(255,255,255,0.06)'
                        : 'transparent';
                    }}
                  >
                    <span>
                      {keyLabel} {expandedItem.title}
                    </span>
                    {keyPct > 0 && (
                      <span
                        className="text-xs"
                        style={{ color: 'var(--color-text-dim)' }}
                      >
                        {keyPct}%
                      </span>
                    )}
                  </div>,
                );
              });
            }
            if (expandedItem.subItems) {
              expandedItem.subItems.forEach((sub) => {
                let levelPct = 0;
                if (sub.genre && sub.level) {
                  const gId = SLUG_TO_CURRICULUM_GENRE[sub.genre];
                  const lId = `L${sub.level}` as 'L1' | 'L2' | 'L3';
                  const lsnId = gId ? buildCurriculumLessonId(gId, lId) : '';
                  if (lsnId)
                    levelPct = getLessonCompletion(progressSummary, lsnId);
                }
                const isLevelSelected =
                  selectedSubItem?.label === `Level ${sub.level}`;
                items.push(
                  <div
                    key={sub.label}
                    className="flex cursor-pointer items-center justify-between rounded-md px-3 py-1.5 text-sm transition-colors duration-150"
                    style={{
                      color: sub.color,
                      ...(isLevelSelected
                        ? { background: 'rgba(255,255,255,0.06)' }
                        : {}),
                    }}
                    onClick={() => {
                      if (sub.genre && sub.level) {
                        handleLevelSelect(sub);
                      } else {
                        navigate(sub.route);
                      }
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        'rgba(255,255,255,0.04)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isLevelSelected
                        ? 'rgba(255,255,255,0.06)'
                        : 'transparent';
                    }}
                  >
                    <span>{sub.label}</span>
                    {levelPct > 0 && (
                      <span
                        className="text-xs"
                        style={{ color: 'var(--color-text-dim)' }}
                      >
                        {levelPct}%
                      </span>
                    )}
                  </div>,
                );
              });
            }
            return items;
          })()}
        </div>
        {selectedSubItem && (
          <div
            className="glass-panel-sm flex w-64 max-w-full flex-col gap-1 self-start rounded-xl p-4"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--color-border)',
            }}
          >
            <h4
              className="mb-2 text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-text-dim)' }}
            >
              {selectedSubItem.label} Chapters
              {selectedSubItem.completionPct > 0 && (
                <span
                  className="ml-2 normal-case tracking-normal"
                  style={{ color: 'var(--color-accent)' }}
                >
                  — {selectedSubItem.completionPct}%
                </span>
              )}
            </h4>
            {selectedSubItem.sections.map((section) => {
              const isChapterSelected = selectedChapterId === section.id;
              return (
                <div
                  key={section.id}
                  className="cursor-pointer rounded-md px-3 py-1.5 text-sm transition-colors duration-150"
                  style={{
                    color: isChapterSelected
                      ? 'var(--color-accent)'
                      : 'var(--color-text)',
                    background: isChapterSelected
                      ? 'rgba(255,255,255,0.06)'
                      : 'transparent',
                  }}
                  onClick={() => {
                    setSelectedChapterId(section.id);
                    navigate(section.route ?? selectedSubItem.route);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isChapterSelected
                      ? 'rgba(255,255,255,0.06)'
                      : 'transparent';
                  }}
                >
                  {section.name}
                  {section.stepCount != null && (
                    <span
                      className="ml-2 text-xs"
                      style={{ color: 'var(--color-text-dim)' }}
                    >
                      {section.stepCount} steps
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );

    if (learnViewMode === 'list') {
      return (
        <div className="flex flex-col gap-2">
          {data.map((item, i) => (
            <ListItem
              key={i}
              {...item}
              {...savedPropsFor(item)}
              progressPct={getTileCompletion(progressSummary, item)}
              locked={!isPremium && !isLearnItemFree(item, tab)}
              onSelect={() => toggleExpand(item)}
            />
          ))}
        </div>
      );
    }

    const expandedIndex =
      expandedMode != null
        ? data.findIndex((it) => (it.expandId ?? it.mode) === expandedMode)
        : -1;

    // Expanding moves the tile to the far-left of its row and fills the rest of
    // that row with the panel; every other tile in the row (left and right)
    // drops to the next row. Reorder the render list to reflect that — stable
    // keys let framer-motion animate the tiles to their new positions.
    const slots: { item: ContentItem; panel?: boolean }[] = [];
    if (expandedIndex >= 0) {
      const rowStart = Math.floor(expandedIndex / gridCols) * gridCols;
      const rowEnd = Math.min(rowStart + gridCols, data.length);
      data.slice(0, rowStart).forEach((it) => slots.push({ item: it }));
      slots.push({ item: data[expandedIndex] });
      slots.push({ item: data[expandedIndex], panel: true });
      data.slice(rowStart, rowEnd).forEach((it, k) => {
        if (rowStart + k !== expandedIndex) slots.push({ item: it });
      });
      data.slice(rowEnd).forEach((it) => slots.push({ item: it }));
    } else {
      data.forEach((it) => slots.push({ item: it }));
    }

    return (
      <div className={gridClassName}>
        {slots.map(({ item, panel }) => {
          const itemKey = item.expandId ?? item.mode ?? item.title;
          if (panel) {
            return (
              <div
                key={`${itemKey}__panel`}
                className="min-w-0"
                style={{ gridColumn: `span ${Math.max(gridCols - 1, 1)}` }}
              >
                {renderPanels(item)}
              </div>
            );
          }
          const key = item.expandId ?? item.mode;
          const isExpanded = !!key && key === expandedMode;
          const isHighlighted =
            highlightedGenre !== null && item.title === highlightedGenre;
          const hasExpansion = !!(item.mode || item.subItems);
          return (
            <motion.div layout="position" key={itemKey}>
              <CardItem
                {...item}
                {...savedPropsFor(item)}
                highlighted={isHighlighted}
                highlightRef={isHighlighted ? highlightRef : undefined}
                expanded={isExpanded}
                progressPct={getTileCompletion(progressSummary, item)}
                locked={!isPremium && !isLearnItemFree(item, tab)}
                onToggleExpand={
                  hasExpansion ? () => toggleExpand(item) : undefined
                }
                onSelect={() => toggleExpand(item)}
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
      style={{ backgroundColor: '#101012' }}
    >
      <MeshGradientBg />
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Persistent Learn tab bar — rendered once at the top of the page so it
            stays in the same place across every tab (Home included) and does
            not scroll with the tab content below it. */}
        <div className="shrink-0 px-6 pt-4 md:px-10">
          <LearnTabBar />
        </div>
        {subTab === 'Home' ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <LearnHome />
          </div>
        ) : subTab === 'Songs' ? (
          <div
            className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto pt-4"
            style={{ background: '#101012' }}
          >
            <div
              className="flex-1 overflow-y-auto px-6 md:px-10"
              style={{ background: '#101012' }}
            >
              {/* Filter row pins at the top with the column headers just below;
                  the outer pt-4 + inner scroll wrapper mirror the Genre/Theory/
                  Technique tabs so the filter lands at the same vertical position. */}
              <SongLibraryBody />
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
              style={{ background: '#101012' }}
            >
              {subTab === 'Theory' ? (
                <>
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
                          setTechniqueFilters((f) => ({ ...f, difficulty: v }))
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
                  {filteredTechnique.length === 0 ? (
                    <p
                      className="text-white/40"
                      style={{
                        fontSize: 13,
                        padding: '48px 0',
                        textAlign: 'center',
                      }}
                    >
                      No items match these filters
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
