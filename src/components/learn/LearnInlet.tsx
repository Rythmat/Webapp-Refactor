import { ChevronDown, ChevronRight, Heart } from 'lucide-react';
import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FilterDropdown } from '@/components/songLibrary/FilterDropdown';
import { SearchInput } from '@/components/songLibrary/SearchInput';
import {
  ViewToggle,
  type ViewMode,
} from '@/components/songLibrary/SongLibraryPage';
import { LearnRoutes, CurriculumRoutes } from '@/constants/routes';
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
import { SongsMarquee } from '../songLibrary/SongsMarquee';
import { HexAvatarSVG } from '../ui/HexAvatarSVG';
import { LockedFeatureOverlay } from '../ui/LockedFeatureOverlay';
import { LearnNav } from './LearnNav';
import { LearnSubheader } from './LearnTabs';
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
  { id: 'C', name: 'Bass' },
  { id: 'D', name: 'Play-Along' },
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
  },
  {
    title: 'Rock',
    route: CurriculumRoutes.genre({ genre: 'rock' }),
    expandId: 'course:rock',
    subItems: buildGenreLevels('rock'),
    image: '/learn-tiles/rock.svg',
  },
  {
    title: 'Hip Hop',
    route: CurriculumRoutes.genre({ genre: 'hip hop' }),
    expandId: 'course:hip hop',
    subItems: buildGenreLevels('hip hop'),
  },
  {
    title: 'R&B',
    route: CurriculumRoutes.genre({ genre: 'rnb' }),
    expandId: 'course:rnb',
    subItems: buildGenreLevels('rnb'),
    image: '/learn-tiles/r-and-b.svg',
  },
  {
    title: 'Jazz',
    route: CurriculumRoutes.genre({ genre: 'jazz' }),
    expandId: 'course:jazz',
    subItems: buildGenreLevels('jazz'),
  },
  {
    title: 'Blues',
    route: CurriculumRoutes.genre({ genre: 'blues' }),
    expandId: 'course:blues',
    subItems: buildGenreLevels('blues'),
  },
  {
    title: 'Folk',
    route: CurriculumRoutes.genre({ genre: 'folk' }),
    expandId: 'course:folk',
    subItems: buildGenreLevels('folk'),
  },
  {
    title: 'Funk',
    route: CurriculumRoutes.genre({ genre: 'funk' }),
    expandId: 'course:funk',
    subItems: buildGenreLevels('funk'),
    image: '/learn-tiles/funk.svg',
  },
  {
    title: 'Neo Soul',
    route: CurriculumRoutes.genre({ genre: 'neo-soul' }),
    expandId: 'course:neo-soul',
    subItems: buildGenreLevels('neo-soul'),
    image: '/learn-tiles/neo-soul.svg',
  },
  {
    title: 'Electronic',
    route: CurriculumRoutes.genre({ genre: 'electronic' }),
    expandId: 'course:electronic',
    subItems: buildGenreLevels('electronic'),
    image: '/learn-tiles/electronic.svg',
  },
  {
    title: 'Latin',
    route: CurriculumRoutes.genre({ genre: 'latin' }),
    expandId: 'course:latin',
    subItems: buildGenreLevels('latin'),
  },
  {
    title: 'Reggae',
    route: CurriculumRoutes.genre({ genre: 'reggae' }),
    expandId: 'course:reggae',
    subItems: buildGenreLevels('reggae'),
  },
  {
    title: 'Jam Band',
    route: CurriculumRoutes.genre({ genre: 'jam-band' }),
    expandId: 'course:jam-band',
    subItems: buildGenreLevels('jam-band'),
    image: '/learn-tiles/jam-band.svg',
  },
  {
    title: 'African',
    route: CurriculumRoutes.genre({ genre: 'african' }),
    expandId: 'course:african',
    subItems: buildGenreLevels('african'),
    image: '/learn-tiles/african.svg',
  },
];

const THEORY_DATA: ContentItem[] = [
  {
    title: 'Lydian',
    mode: 'lydian',
    route: LearnRoutes.overview({ mode: 'lydian' }),
    image: '/learn-tiles/lydian.svg',
  },
  {
    title: 'Ionian (Major)',
    mode: 'ionian',
    route: LearnRoutes.overview({ mode: 'ionian' }),
  },
  {
    title: 'Mixolydian',
    mode: 'mixolydian',
    route: LearnRoutes.overview({ mode: 'mixolydian' }),
  },
  {
    title: 'Dorian',
    mode: 'dorian',
    route: LearnRoutes.overview({ mode: 'dorian' }),
  },
  {
    title: 'Aeolian (Minor)',
    mode: 'aeolian',
    route: LearnRoutes.overview({ mode: 'aeolian' }),
  },
  {
    title: 'Phrygian',
    mode: 'phrygian',
    route: LearnRoutes.overview({ mode: 'phrygian' }),
  },
  {
    title: 'Locrian',
    mode: 'locrian',
    route: LearnRoutes.overview({ mode: 'locrian' }),
  },
];

const TECHNIQUE_DATA: ContentItem[] = [
  {
    title: 'Fundamentals',
    route: CurriculumRoutes.genre({ genre: 'piano-fundamentals' }),
  },
];

const RELATIVE_MODES_DATA: ContentItem[] = [
  {
    title: 'Red',
    route: '/learn/relative/c',
    expandId: 'relative:c',
    subItems: buildRelativeSubItems('C'),
  },
  {
    title: 'Vermillion',
    route: '/learn/relative/g',
    expandId: 'relative:g',
    subItems: buildRelativeSubItems('G'),
  },
  {
    title: 'Orange',
    route: '/learn/relative/d',
    expandId: 'relative:d',
    subItems: buildRelativeSubItems('D'),
  },
  {
    title: 'Amber',
    route: '/learn/relative/a',
    expandId: 'relative:a',
    subItems: buildRelativeSubItems('A'),
  },
  {
    title: 'Green',
    route: '/learn/relative/e',
    expandId: 'relative:e',
    subItems: buildRelativeSubItems('E'),
  },
  {
    title: 'Sage',
    route: '/learn/relative/b',
    expandId: 'relative:b',
    subItems: buildRelativeSubItems('B'),
  },
  {
    title: 'Teal',
    route: '/learn/relative/fsharp',
    expandId: 'relative:fsharp',
    subItems: buildRelativeSubItems('F#'),
  },
  {
    title: 'Blue',
    route: '/learn/relative/dflat',
    expandId: 'relative:dflat',
    subItems: buildRelativeSubItems('D♭'),
  },
  {
    title: 'Indigo',
    route: '/learn/relative/aflat',
    expandId: 'relative:aflat',
    subItems: buildRelativeSubItems('A♭'),
  },
  {
    title: 'Purple',
    route: '/learn/relative/eflat',
    expandId: 'relative:eflat',
    subItems: buildRelativeSubItems('E♭'),
  },
  {
    title: 'Magenta',
    route: '/learn/relative/bflat',
    expandId: 'relative:bflat',
    subItems: buildRelativeSubItems('B♭'),
  },
  {
    title: 'Pink',
    route: '/learn/relative/f',
    expandId: 'relative:f',
    subItems: buildRelativeSubItems('F'),
  },
];

const PARALLEL_MODES_DATA: ContentItem[] = [
  {
    title: 'C',
    route: '/learn/parallel/c',
    expandId: 'parallel:c',
    subItems: buildParallelSubItems('C'),
  },
  {
    title: 'G',
    route: '/learn/parallel/g',
    expandId: 'parallel:g',
    subItems: buildParallelSubItems('G'),
  },
  {
    title: 'D',
    route: '/learn/parallel/d',
    expandId: 'parallel:d',
    subItems: buildParallelSubItems('D'),
  },
  {
    title: 'A',
    route: '/learn/parallel/a',
    expandId: 'parallel:a',
    subItems: buildParallelSubItems('A'),
  },
  {
    title: 'E',
    route: '/learn/parallel/e',
    expandId: 'parallel:e',
    subItems: buildParallelSubItems('E'),
  },
  {
    title: 'B',
    route: '/learn/parallel/b',
    expandId: 'parallel:b',
    subItems: buildParallelSubItems('B'),
  },
  {
    title: 'F#',
    route: '/learn/parallel/fsharp',
    expandId: 'parallel:fsharp',
    subItems: buildParallelSubItems('F#'),
  },
  {
    title: 'D♭',
    route: '/learn/parallel/dflat',
    expandId: 'parallel:dflat',
    subItems: buildParallelSubItems('D♭'),
  },
  {
    title: 'A♭',
    route: '/learn/parallel/aflat',
    expandId: 'parallel:aflat',
    subItems: buildParallelSubItems('A♭'),
  },
  {
    title: 'E♭',
    route: '/learn/parallel/eflat',
    expandId: 'parallel:eflat',
    subItems: buildParallelSubItems('E♭'),
  },
  {
    title: 'B♭',
    route: '/learn/parallel/bflat',
    expandId: 'parallel:bflat',
    subItems: buildParallelSubItems('B♭'),
  },
  {
    title: 'F',
    route: '/learn/parallel/f',
    expandId: 'parallel:f',
    subItems: buildParallelSubItems('F'),
  },
];

const HARMONIC_MINOR_DATA: ContentItem[] = [
  {
    title: 'Harmonic Minor',
    mode: 'harmonicminor',
    route: LearnRoutes.overview({ mode: 'harmonicminor' }),
  },
  {
    title: 'Locrian ♮6',
    mode: 'locriannat6',
    route: LearnRoutes.overview({ mode: 'locriannat6' }),
  },
  {
    title: 'Ionian #5',
    mode: 'ionian#5',
    route: LearnRoutes.overview({ mode: 'ionian#5' }),
  },
  {
    title: 'Dorian #4',
    mode: 'dorian#4',
    route: LearnRoutes.overview({ mode: 'dorian#4' }),
  },
  {
    title: 'Phrygian Dominant',
    mode: 'phrygiandominant',
    route: LearnRoutes.overview({ mode: 'phrygiandominant' }),
  },
  {
    title: 'Lydian #2',
    mode: 'lydian#2',
    route: LearnRoutes.overview({ mode: 'lydian#2' }),
    image: '/learn-tiles/lydian-2.svg',
  },
  {
    title: 'Altered Diminished',
    mode: 'altereddiminished',
    route: LearnRoutes.overview({ mode: 'altereddiminished' }),
  },
];

const MELODIC_MINOR_DATA: ContentItem[] = [
  {
    title: 'Melodic Minor',
    mode: 'melodicminor',
    route: LearnRoutes.overview({ mode: 'melodicminor' }),
  },
  {
    title: 'Dorian ♭2',
    mode: 'dorian♭2',
    route: LearnRoutes.overview({ mode: 'dorian♭2' }),
  },
  {
    title: 'Lydian Augmented',
    mode: 'lydianaugmented',
    route: LearnRoutes.overview({ mode: 'lydianaugmented' }),
    image: '/learn-tiles/lydian-augmented.svg',
  },
  {
    title: 'Lydian Dominant',
    mode: 'lydiandominant',
    route: LearnRoutes.overview({ mode: 'lydiandominant' }),
  },
  {
    title: 'Mixolydian ♭6',
    mode: 'mixolydiannat6',
    route: LearnRoutes.overview({ mode: 'mixolydiannat6' }),
  },
  {
    title: 'Locrian ♮2',
    mode: 'locriannat2',
    route: LearnRoutes.overview({ mode: 'locriannat2' }),
  },
  {
    title: 'Altered Dominant',
    mode: 'altereddominant',
    route: LearnRoutes.overview({ mode: 'altereddominant' }),
    image: '/learn-tiles/altered-dominant.svg',
  },
];

const HARMONIC_MAJOR_DATA: ContentItem[] = [
  {
    title: 'Harmonic Major',
    mode: 'harmonicmajor',
    route: LearnRoutes.overview({ mode: 'harmonicmajor' }),
  },
  {
    title: 'Dorian ♭5',
    mode: 'dorian♭5',
    route: LearnRoutes.overview({ mode: 'dorian♭5' }),
  },
  {
    title: 'Altered Dominant ♮5',
    mode: 'altereddominantnat5',
    route: LearnRoutes.overview({ mode: 'altereddominantnat5' }),
  },
  {
    title: 'Melodic Minor #4',
    mode: 'melodicminor#4',
    route: LearnRoutes.overview({ mode: 'melodicminor#4' }),
  },
  {
    title: 'Mixolydian ♭2',
    mode: 'mixolydian♭2',
    route: LearnRoutes.overview({ mode: 'mixolydian♭2' }),
  },
  {
    title: 'Lydian Augmented #2',
    mode: 'lydianaugmented#2',
    route: LearnRoutes.overview({ mode: 'lydianaugmented#2' }),
  },
  {
    title: 'Locrian 𝄫7',
    mode: 'locrian𝄫7',
    route: LearnRoutes.overview({ mode: 'locrian𝄫7' }),
  },
];

const DOUBLE_HARMONIC_DATA: ContentItem[] = [
  {
    title: 'Double Harmonic Major',
    mode: 'doubleharmonicmajor',
    route: LearnRoutes.overview({ mode: 'doubleharmonicmajor' }),
  },
  {
    title: 'Lydian #2 #6',
    mode: 'lydian#2#6',
    route: LearnRoutes.overview({ mode: 'lydian#2#6' }),
  },
  {
    title: 'Ultraphrygian',
    mode: 'ultraphrygian',
    route: LearnRoutes.overview({ mode: 'ultraphrygian' }),
  },
  {
    title: 'Double Harmonic Minor',
    mode: 'doubleharmonicminor',
    route: LearnRoutes.overview({ mode: 'doubleharmonicminor' }),
  },
  {
    title: 'Oriental',
    mode: 'oriental',
    route: LearnRoutes.overview({ mode: 'oriental' }),
  },
  {
    title: 'Ionian #2 #5',
    mode: 'ionian#2#5',
    route: LearnRoutes.overview({ mode: 'ionian#2#5' }),
  },
  {
    title: 'Locrian 𝄫3 𝄫7',
    mode: 'locrian𝄫3𝄫7',
    route: LearnRoutes.overview({ mode: 'locrian𝄫3𝄫7' }),
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
          className={`glass-panel relative ${imageSize ? '' : 'aspect-square'} overflow-hidden rounded-2xl transition-colors duration-150`}
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
          {image ? (
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
  const validTabs = ['Songs', 'Genre', 'Theory', 'Technique'];
  const defaultTab =
    tabParam && validTabs.includes(tabParam)
      ? tabParam
      : genreParam
        ? 'Genre'
        : initialTab && validTabs.includes(initialTab)
          ? initialTab
          : 'Songs';
  const [subTab, setSubTab] = useState(defaultTab);
  const [highlightedGenre, setHighlightedGenre] = useState<string | null>(
    genreParam,
  );
  const highlightRef = useRef<HTMLDivElement>(null);
  const expandedContentRef = useRef<HTMLDivElement>(null);
  const [expandedMode, setExpandedMode] = useState<string | null>(null);
  const [selectedSubItem, setSelectedSubItem] =
    useState<SelectedSubItem | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(
    null,
  );
  const listPanelRef = useRef<HTMLDivElement>(null);
  const [listPanelHeight, setListPanelHeight] = useState<number | undefined>(
    undefined,
  );

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
  const [learnViewMode, setLearnViewMode] = useState<ViewMode>('grid');
  const learnViewToggle = (
    <ViewToggle viewMode={learnViewMode} onChange={setLearnViewMode} />
  );
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

  useLayoutEffect(() => {
    if (listPanelRef.current) {
      setListPanelHeight(listPanelRef.current.offsetHeight);
    } else {
      setListPanelHeight(undefined);
    }
  }, [expandedMode]);
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
    setSelectedSubItem({
      label: `${keyLabel} ${modeTitle}`,
      route: LearnRoutes.lesson({ mode, key: keyLabelToUrlParam(keyLabel) }),
      completionPct: pct,
      sections: THEORY_SECTIONS,
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
      setSubTab('Songs');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam]);

  // Auto-select Genre tab and highlight the genre when arriving from Globe
  useEffect(() => {
    if (genreParam) {
      setSubTab('Genre');
      setHighlightedGenre(genreParam);
      // Clear the query param from the URL without adding a history entry
      setSearchParams({}, { replace: true });
    }
  }, [genreParam, setSearchParams]);

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

  const renderContent = (data: ContentItem[], tab: string = subTab) => {
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

    const expandedItem = expandedMode
      ? data.find((item) => (item.expandId ?? item.mode) === expandedMode)
      : null;

    if (expandedItem) {
      const remainingItems = data.filter(
        (item) => (item.expandId ?? item.mode) !== expandedMode,
      );
      return (
        <>
          <div ref={expandedContentRef} className="flex items-start gap-6">
            {/* Featured tile on the left — image sized to match list */}
            <div className="shrink-0">
              <CardItem
                {...expandedItem}
                {...savedPropsFor(expandedItem)}
                expanded={true}
                imageSize={listPanelHeight}
                progressPct={getTileCompletion(progressSummary, expandedItem)}
                locked={!isPremium && !isLearnItemFree(expandedItem, tab)}
                onToggleExpand={() => {
                  setExpandedMode(null);
                  setSelectedSubItem(null);
                }}
                onSelect={() => {
                  setExpandedMode(null);
                  setSelectedSubItem(null);
                }}
              />
            </div>
            {/* Sub-item list on the right — always 12 rows tall */}
            <div
              ref={listPanelRef}
              className="glass-panel-sm flex w-64 flex-col gap-0.5 rounded-xl p-4"
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
                      const lsnId = gId
                        ? buildCurriculumLessonId(gId, lId)
                        : '';
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
                // Pad to 12 rows so all tiles have consistent height
                while (items.length < 12) {
                  items.push(
                    <div
                      key={`spacer-${items.length}`}
                      className="px-3 py-1.5 text-sm"
                      aria-hidden="true"
                    >
                      &nbsp;
                    </div>,
                  );
                }
                return items;
              })()}
            </div>
            {/* Chapter panel when a sub-item is selected */}
            {selectedSubItem && (
              <div
                className="glass-panel-sm flex w-64 shrink-0 flex-col gap-1 self-start rounded-xl p-4"
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
                        e.currentTarget.style.background =
                          'rgba(255,255,255,0.04)';
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
          {/* Remaining tiles below */}
          {remainingItems.length > 0 && (
            <div
              className={
                learnViewMode === 'list'
                  ? 'mt-6 flex flex-col gap-2'
                  : 'mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4'
              }
            >
              {remainingItems.map((item, i) => {
                const itemExpandKey = item.expandId ?? item.mode;
                const handleSelect = () => {
                  if (item.mode || item.subItems) {
                    setExpandedMode(itemExpandKey ?? null);
                    setSelectedSubItem(null);
                    setTimeout(() => {
                      expandedContentRef.current?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                      });
                    }, 0);
                  } else if (item.route) {
                    navigate(item.route);
                  }
                };
                if (learnViewMode === 'list') {
                  return (
                    <ListItem
                      key={i}
                      {...item}
                      {...savedPropsFor(item)}
                      progressPct={getTileCompletion(progressSummary, item)}
                      locked={!isPremium && !isLearnItemFree(item, tab)}
                      onSelect={handleSelect}
                    />
                  );
                }
                return (
                  <CardItem
                    key={i}
                    {...item}
                    {...savedPropsFor(item)}
                    expanded={false}
                    progressPct={getTileCompletion(progressSummary, item)}
                    locked={!isPremium && !isLearnItemFree(item, tab)}
                    onToggleExpand={
                      item.mode || item.subItems
                        ? () => {
                            setExpandedMode(itemExpandKey ?? null);
                            setSelectedSubItem(null);
                            setTimeout(() => {
                              expandedContentRef.current?.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start',
                              });
                            }, 0);
                          }
                        : undefined
                    }
                    onSelect={handleSelect}
                  />
                );
              })}
            </div>
          )}
        </>
      );
    }

    const onItemSelect = (item: ContentItem) => {
      const itemExpandKey = item.expandId ?? item.mode;
      if (item.mode || item.subItems) {
        setExpandedMode(itemExpandKey ?? null);
        setTimeout(() => {
          expandedContentRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }, 0);
      } else if (item.route) {
        navigate(item.route);
      }
    };

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
              onSelect={() => onItemSelect(item)}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {data.map((item, i) => {
          const isHighlighted =
            highlightedGenre !== null && item.title === highlightedGenre;
          const itemExpandKey = item.expandId ?? item.mode;
          return (
            <CardItem
              key={i}
              {...item}
              {...savedPropsFor(item)}
              highlighted={isHighlighted}
              highlightRef={isHighlighted ? highlightRef : undefined}
              expanded={false}
              progressPct={getTileCompletion(progressSummary, item)}
              locked={!isPremium && !isLearnItemFree(item, tab)}
              onToggleExpand={
                item.mode || item.subItems
                  ? () => {
                      setExpandedMode(itemExpandKey ?? null);
                      setTimeout(() => {
                        expandedContentRef.current?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'start',
                        });
                      }, 0);
                    }
                  : undefined
              }
              onSelect={() => onItemSelect(item)}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div
      className="learn-root relative flex h-full"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <MeshGradientBg />
      <LearnNav />
      {subTab === 'Songs' ? (
        <div
          className="relative flex min-w-0 flex-1 flex-col overflow-y-auto"
          style={{ background: '#101012' }}
        >
          <div className="mb-4">
            <SongsMarquee bleed={false} />
          </div>
          <div className="flex-1 px-6 md:px-10">
            <SongLibraryBody />
          </div>
        </div>
      ) : (
        <div className="relative flex min-w-0 flex-1 flex-col overflow-y-auto px-8 pb-6 pt-4">
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
            style={{ background: 'var(--color-surface-3)' }}
          >
            {subTab === 'Theory' ? (
              <>
                <div
                  className="sticky top-0 z-10 pt-1 pb-3"
                  style={{ background: 'var(--color-bg)' }}
                >
                  <LearnSubheader title="Theory" right={learnViewToggle} />
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
                      {renderContent(section.items)}
                    </CollapsibleSection>
                  ))
                )}
              </>
            ) : subTab === 'Technique' ? (
              <>
                <div
                  className="sticky top-0 z-10 pt-1 pb-3"
                  style={{ background: 'var(--color-bg)' }}
                >
                  <LearnSubheader title="Technique" right={learnViewToggle} />
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
                    {renderContent(filteredTechnique)}
                  </CollapsibleSection>
                )}
              </>
            ) : (
              <>
                <div
                  className="sticky top-0 z-10 pt-1 pb-3"
                  style={{ background: 'var(--color-bg)' }}
                >
                  <LearnSubheader title="Genre" right={learnViewToggle} />
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
                  <CollapsibleSection
                    defaultOpen
                    className="mt-4"
                    title="Genres"
                  >
                    {renderContent(filteredCourses)}
                  </CollapsibleSection>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
