import { GENRE_COURSES } from '@/components/learn/genreCourses';
import { discRatio } from '@/components/learn/path/pathGeometry';
import type {
  PathCourse,
  PathLevel,
  PathRow,
} from '@/components/learn/path/types';
import { LearnRoutes } from '@/constants/routes';
import { readGenreSections } from '@/curriculum/hooks/useGenreProgress';
import { exploreHref } from '@/features/learn/catalog/exploreState';
import { colorForKeyMode } from '@/lib/modeColorShift';

// ── A genre as a path ──────────────────────────────────────────────────────
// One stop per section of each level that's built. All genres teach at the
// keyboard so far.

const SECTIONS = [
  {
    id: 'A',
    title: 'Melody',
    blurb: 'Learn the lines and the scale behind them',
  },
  { id: 'B', title: 'Chords', blurb: 'Learn the chords and how they move' },
  { id: 'C', title: 'Bass', blurb: 'Lock in the low end' },
  { id: 'D', title: 'Performance', blurb: 'Put it together with the band' },
] as const;

const LEVEL_NAMES: Readonly<Record<number, string>> = {
  1: 'The foundations',
  2: 'Building on it',
  3: 'The full sound',
};

const LEVELS = [1, 2, 3] as const;

/** A level's readiness, as far as a path needs it. */
export type SectionBuilt = (level: number, section: string) => boolean;

export function genrePath(
  slug: string,
  options: {
    title: string;
    description: string;
    accent: string;
    ratio: readonly [number, number];
    isPremium: boolean;
    built: SectionBuilt;
  },
): PathCourse {
  const rows: PathRow[] = [];
  const levels: PathLevel[] = [];
  for (const level of LEVELS) {
    const sections = SECTIONS.filter((s) => options.built(level, s.id));
    if (!sections.length) continue;
    const record = readGenreSections(slug, level);
    levels.push({
      id: `level-${level}`,
      kicker: `Level ${level}`,
      title: LEVEL_NAMES[level],
      goals: sections.map((s) => `${s.title}: ${s.blurb.toLowerCase()}`),
    });
    for (const section of sections) {
      const s = record.sections[section.id];
      rows.push({
        id: `${level}-${section.id}`,
        title: section.title,
        blurb: section.blurb,
        ratio: discRatio(rows.length),
        levelId: `level-${level}`,
        route: `${LearnRoutes.genreLesson({ genre: slug, level: String(level) })}?section=${section.id}`,
        percent:
          s && s.stepsTotal > 0
            ? Math.min(100, Math.round((s.stepsCompleted / s.stepsTotal) * 100))
            : 0,
        tracked: true,
        locked: !options.isPremium,
      });
    }
  }
  return {
    id: slug,
    title: options.title,
    description: options.description,
    accent: options.accent,
    ratio: options.ratio,
    stats: [`${rows.length} lessons`, 'Keyboard'],
    back: { label: 'Learn', to: exploreHref('piano', 'genres') },
    levels,
    rows,
    upNext: undefined,
  };
}

/** The genre after this one with lessons, in Learn's order. */
export function followingGenre(
  slug: string,
  isBuilt: (slug: string) => boolean,
) {
  const at = GENRE_COURSES.findIndex((course) => course.slug === slug);
  return GENRE_COURSES.slice(at + 1).find((course) => isBuilt(course.slug));
}

/** Colours for the genres in turn: never A or D, too near the brand yellow. */
const ACCENT_KEYS = ['F#', 'B♭', 'E♭', 'A♭', 'D♭', 'B', 'F', 'E', 'G', 'C'];

/** A genre's key, for its colour, by its place in Learn's order. */
export function genreAccentKey(slug: string): string {
  const at = Math.max(
    0,
    GENRE_COURSES.findIndex((course) => course.slug === slug),
  );
  return ACCENT_KEYS[at % ACCENT_KEYS.length];
}

/** A genre's colour, by its place in Learn's order. */
export function genreAccent(slug: string): string {
  return colorForKeyMode(genreAccentKey(slug));
}
