import { GENRE_COURSES } from '@/components/learn/genreCourses';
import type { PathCourse } from '@/components/learn/path/types';
import {
  genreSpec,
  sigilColors,
  sigilFor,
  type SigilSpec,
} from '@/components/learn/sigil/sigilSpec';
import { techniqueDataFor } from '@/components/learn/techniqueCatalog';
import {
  CurriculumRoutes,
  LearnRoutes,
  StudioRoutes,
} from '@/constants/routes';
import {
  AUDIO_MODULES,
  audioLessonRoute,
  type AudioLesson,
} from '@/curriculum/audio/catalog';
import { audioCoursePath } from '@/curriculum/audio/coursePath';
import { getGenreProfile } from '@/curriculum/data/genreProfiles';
import { fundamentalsCoursePath } from '@/curriculum/piano/fundamentals/coursePath';
import {
  courseLessons,
  listTutorialCatalog,
  TUTORIAL_COURSES,
  type TutorialCatalogEntry,
} from '@/daw/components/Tutorial/tutorialCatalog';
import type { GenreReadiness } from '@/features/learn/genreReadiness';
import {
  coursePercent,
  nextRow,
  stopsDone,
} from '@/features/learn/paths/courseProgress';
import { genreAccent, genrePath } from '@/features/learn/paths/genrePath';
import {
  FAMILY_ACCENT_KEY,
  THEORY_FAMILIES,
} from '@/features/learn/paths/theoryFamilies';
import {
  theoryFamilyPath,
  theoryFamilyRoute,
} from '@/features/learn/paths/theoryPath';
import {
  theoryProgress,
  type LessonSummaryLike,
} from '@/features/learn/paths/theoryProgress';
import type {
  LearnChoice,
  LearnInstrument,
} from '@/features/learn/useInstrumentStore';
import {
  firstStepTruchetCover,
  genreCourseTruchetCover,
  genreSpectrumIndex,
  intervalPair,
  intervalTruchetCover,
  pairNear,
  theoryTruchetCover,
  type CoverSpec,
  coverSignature,
} from '@/lib/cover';
import { colorForKeyMode } from '@/lib/modeColorShift';

// ── Everything Learn teaches, as one list ──────────────────────────────────
// Explore draws it a topic at a time; the Learn dashboard ranks from it. Built
// from the same adapters the path pages draw, so a card's percent and its next
// stop are the path's own.

export type CourseKind = 'theory' | 'genre' | 'technique' | 'audio';

export interface CatalogCourse {
  /** Unique across the catalog: `piano/theory/diatonic`. */
  id: string;
  /** Its own name in its kind: a family id, a genre slug, a module id. */
  slug: string;
  kind: CourseKind;
  topic: LearnChoice;
  /** The section of its topic it's listed under. */
  section: string;
  title: string;
  /** One line about it, for search and the dashboard. */
  blurb: string;
  route: string;
  /** Its picture: a Truchet tapestry from its music, in its sigil's
   *  colours (owner, 2026-11-05: every card's sigil a Truchet pattern). */
  cover: CoverSpec;
  /** Its sigil: what its music is, and the colours its cover takes. */
  sigil?: SigilSpec;
  accent: string;
  /** 0 to 100; 0 where there's no progress to show. */
  percent: number;
  /** "14 lessons", "3 levels · 9 lessons". */
  meta: string;
  /** Its next stop, while it has a path and one is left. */
  next: {
    title: string;
    route: string;
    locked: boolean;
    done: number;
    total: number;
  } | null;
  /** The genre it teaches, for matching a student's taste. */
  genre?: string;
  locked: boolean;
  comingSoon: boolean;
}

export interface CatalogSection {
  id: string;
  title: string;
  blurb: string;
  courses: readonly CatalogCourse[];
}

export interface CatalogTopic {
  id: LearnChoice;
  title: string;
  tagline: string;
  icon: string;
  sections: readonly CatalogSection[];
}

export interface CatalogInputs {
  enabled: (instrument: LearnInstrument) => boolean;
  isPremium: boolean;
  /** The progress summary's lessons (piano Theory). */
  lessons: readonly LessonSummaryLike[];
  /** Audio's finished steps (useTutorialProgressStore). */
  completedAt: Readonly<Record<string, number>>;
  /** Which genre lessons are built; null until they've loaded. */
  genreReady: GenreReadiness | null;
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];

/** Technique's patterns are white (owner, 2026-11-05). */
const TECHNIQUE_INK: readonly [string, string] = ['#ffffff', '#ffffff'];

/** The figure a Theory family's card draws: its parent mode's star; Relative
 *  and Parallel their key's modes. */
const familySigil = (parent: string | undefined, id: string) =>
  parent
    ? sigilFor({ mode: parent })
    : sigilFor({
        expandId: `${id}:c`,
        ratio: id === 'relative' ? [2, 3] : [3, 4],
      });

export const TOPIC_META: readonly {
  id: LearnChoice;
  title: string;
  tagline: string;
  icon: string;
}[] = [
  {
    id: 'piano',
    title: 'Keyboard',
    tagline: 'See every scale and chord laid out in front of you',
    icon: '/icons/keyboard-icon.svg',
  },
  {
    id: 'guitar',
    title: 'Guitar',
    tagline: 'From your first positions to the whole neck',
    icon: '/icons/guitar-icon.svg',
  },
  {
    id: 'bass',
    title: 'Bass',
    tagline: 'Hold the band together, in any key',
    icon: '/icons/bass-icon.svg',
  },
  {
    id: 'ukulele',
    title: 'Ukulele',
    tagline: 'Big harmony on four strings',
    icon: '/icons/ukulele-icon.svg',
  },
  {
    id: 'audio',
    title: 'Audio',
    tagline: 'How sound works, from the air to your mix',
    icon: '/icons/audio-icon.svg',
  },
];

export const topicTitle = (id: LearnChoice) =>
  TOPIC_META.find((topic) => topic.id === id)?.title ?? id;

/** The genres known to be built, until the lessons have loaded to say so. */
const BUILT_BEFORE_LOADING = new Set(['pop', 'funk', 'hip-hop', 'latin']);

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

/** A course's next stop, named so it reads alone: "Level 2 · Chords". */
function nextOf(course: PathCourse): CatalogCourse['next'] {
  const row = nextRow(course);
  if (!row) return null;
  const level = course.levels.find((l) => l.id === row.levelId);
  const { done, total } = stopsDone(course);
  return {
    title:
      level && course.levels.length > 1
        ? `${level.kicker} · ${row.title}`
        : row.title,
    route: row.route,
    locked: row.locked,
    done,
    total,
  };
}

/** A genre's own line, where its profile has one written. */
const genreBlurb = (slug: string) => {
  const tagline = getGenreProfile(slug)?.tagline ?? '';
  return tagline.startsWith('[') ? '' : tagline;
};

const audioLessonKind = (lesson: AudioLesson) =>
  lesson.kind === 'anatomy'
    ? 'Anatomy'
    : lesson.kind === 'arcade'
      ? 'Game'
      : 'Lesson';

function instrumentSections(
  instrument: LearnInstrument,
  inputs: CatalogInputs,
): CatalogSection[] {
  const { isPremium, genreReady } = inputs;
  const progress = theoryProgress(instrument, inputs.lessons);
  const sections: CatalogSection[] = [
    {
      id: 'theory',
      title: 'Theory',
      blurb: 'Scales and modes in all twelve keys',
      courses: THEORY_FAMILIES.map((family) => {
        const accent = colorForKeyMode(FAMILY_ACCENT_KEY[family.id]);
        const sigil = familySigil(family.parent, family.id) ?? undefined;
        const path = theoryFamilyPath(family, accent, {
          instrument,
          isPremium,
          progress,
        });
        return {
          id: `${instrument}/theory/${family.id}`,
          slug: family.id,
          kind: 'theory',
          topic: instrument,
          section: 'theory',
          title: family.title,
          blurb: family.description,
          route: theoryFamilyRoute(instrument, family.id),
          cover: theoryTruchetCover(
            `${instrument}/theory/${family.id}`,
            family.id,
            sigil?.kind === 'scale' ? sigil.pcs : MAJOR,
            sigil ? sigilColors(sigil) : pairNear(accent),
          ),
          sigil,
          accent,
          percent: coursePercent(path),
          meta: family.parent ? plural(path.rows.length, 'lesson') : '12 keys',
          next: nextOf(path),
          locked: false,
          comingSoon: false,
        } satisfies CatalogCourse;
      }),
    },
  ];
  // Genres teach at the keys so far, so that's the only place they're offered.
  if (instrument === 'piano') {
    const isBuilt = (slug: string) =>
      genreReady ? genreReady.course(slug) : BUILT_BEFORE_LOADING.has(slug);
    sections.push({
      id: 'genres',
      title: 'Genres',
      blurb: 'Play every part of the band, one style at a time',
      courses: [...GENRE_COURSES]
        .sort((a, b) => Number(isBuilt(b.slug)) - Number(isBuilt(a.slug)))
        .map((course) => {
          const built = isBuilt(course.slug);
          const accent = genreAccent(course.slug);
          const path =
            genreReady && built
              ? genrePath(course.slug, {
                  title: course.title,
                  description: '',
                  accent,
                  ratio: [2, 3],
                  isPremium,
                  built: (level, section) =>
                    genreReady.section(course.slug, level, section),
                })
              : null;
          return {
            id: `piano/genre/${course.slug}`,
            slug: course.slug,
            kind: 'genre',
            topic: 'piano',
            section: 'genres',
            title: course.title,
            blurb: genreBlurb(course.slug),
            route: LearnRoutes.genreCourse({ genre: course.slug }),
            // Recoloured by the page's Best Of row where it has one
            // (CourseArt).
            cover: genreCourseTruchetCover(
              `piano/genre/${course.slug}`,
              course.slug,
              genreSpectrumIndex(course.slug),
            ),
            sigil: genreSpec(course.slug, course.image) ?? undefined,
            accent,
            percent: path ? coursePercent(path) : 0,
            meta: !built
              ? 'Coming soon'
              : path
                ? `${plural(path.levels.length, 'level')} · ${plural(path.rows.length, 'lesson')}`
                : 'Keyboard',
            next: path ? nextOf(path) : null,
            genre: course.slug,
            locked: false,
            comingSoon: !built,
          } satisfies CatalogCourse;
        }),
    });
  }
  const technique = techniqueDataFor(instrument);
  if (technique.length) {
    sections.push({
      id: 'technique',
      title: 'Technique',
      blurb: 'Hands-on skills for your instrument',
      courses: technique.map((item, index) => {
        // Piano Fundamentals is a course of its own (owner, 2026-11-05).
        const path =
          item.route === CurriculumRoutes.pianoFundamentals()
            ? fundamentalsCoursePath(inputs.completedAt)
            : null;
        return {
          id: `${instrument}/technique/${item.title}`,
          slug: item.title,
          kind: 'technique',
          topic: instrument,
          section: 'technique',
          title: item.title,
          blurb: '',
          route: item.route,
          // In white, not a gradient (owner, 2026-11-05).
          cover: item.firstStep
            ? firstStepTruchetCover(
                `${instrument}/technique/${item.title}`,
                TECHNIQUE_INK,
              )
            : intervalTruchetCover(
                `${instrument}/technique/${item.title}`,
                index,
                item.ratio,
                TECHNIQUE_INK,
                false,
              ),
          sigil: sigilFor({ ratio: item.ratio }) ?? undefined,
          accent: '#ffffff',
          percent: path ? coursePercent(path) : 0,
          meta: path
            ? path.stats.join(' · ')
            : item.interactive
              ? 'Interactive'
              : 'Lesson',
          next: path ? nextOf(path) : null,
          locked: Boolean(item.premium) && !isPremium,
          comingSoon: false,
        } satisfies CatalogCourse;
      }),
    });
  }
  return sections;
}

/** The Production lessons' one accent (not A or D: yellow and amber). */
const PRODUCTION_ACCENT_KEY = 'B';

/**
 * The intervals the Production lessons' covers draw, one colour each, so a
 * shelf of sixteen still finds a cover no other card on the page has (the
 * path's disc ratios share colours: 3:5, 7:8 and 8:9 are all amber).
 */
const PRODUCTION_RATIOS: readonly (readonly [number, number])[] = [
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [5, 8],
  [1, 2],
  [8, 15],
  [5, 7],
  [9, 16],
  [15, 16],
  [8, 9],
];

function audioSections(inputs: CatalogInputs): CatalogSection[] {
  const { isPremium, completedAt } = inputs;
  const courses = AUDIO_MODULES.filter((module) => module.shelf);
  const rest = AUDIO_MODULES.filter((module) => !module.shelf);
  // No two covers on the page alike: a lesson whose turn's pattern and
  // colour are taken moves on to the next pattern.
  const taken = new Set<string>();
  let turn = 0;
  const pickCover = (
    seed: string,
    ratio: readonly [number, number],
    stacked: boolean,
  ) => {
    for (;;) {
      const cover = intervalTruchetCover(
        seed,
        turn,
        ratio,
        intervalPair(ratio),
        stacked,
      );
      turn += 1;
      const signature = coverSignature(cover);
      if (!taken.has(signature) || turn > 1000) {
        taken.add(signature);
        return cover;
      }
    }
  };
  const courseSection: CatalogSection = {
    id: 'courses',
    title: 'Courses',
    blurb: 'How sound works, one step at a time',
    courses: courses.map((module) => {
      const path = audioCoursePath(module, completedAt, isPremium);
      return {
        id: `audio/course/${module.id}`,
        slug: module.id,
        kind: 'audio',
        topic: 'audio',
        section: 'courses',
        title: module.title,
        blurb: module.blurb ?? '',
        route: LearnRoutes.audioCourse({ module: module.id }),
        cover: pickCover(
          `audio/course/${module.id}`,
          module.lessons[0].ratio,
          true,
        ),
        sigil: sigilFor({ ratio: module.lessons[0].ratio }) ?? undefined,
        accent: path.accent,
        percent: coursePercent(path),
        meta: path.stats.join(' · '),
        next: nextOf(path),
        locked: false,
        comingSoon: false,
      } satisfies CatalogCourse;
    }),
  };
  // A turn on from the courses, so the next shelf never opens on the
  // pattern above it.
  turn += 1;
  // The Studio's Production lessons, as its Production tab lists them: the
  // courses' lessons in order, then the rest. Each opens the editor with the
  // lesson running; finishing one there marks it done here too.
  const courseLessonsInOrder = TUTORIAL_COURSES.flatMap((course) =>
    courseLessons(course).map((lesson, i) => ({
      lesson,
      place: `${course.title} · Lesson ${i + 1}`,
    })),
  );
  const production: readonly {
    lesson: TutorialCatalogEntry;
    place: string | null;
  }[] = [
    ...courseLessonsInOrder,
    ...listTutorialCatalog()
      .filter((lesson) => !lesson.course)
      .map((lesson) => ({ lesson, place: null })),
  ];
  const productionSection: CatalogSection = {
    id: 'production',
    title: 'Production Lessons',
    blurb: 'Make a track in the Studio, step by step',
    courses: production.map(({ lesson, place }, i): CatalogCourse => {
      const ratio = PRODUCTION_RATIOS[i % PRODUCTION_RATIOS.length];
      return {
        id: `audio/production/${lesson.id}`,
        slug: lesson.id,
        kind: 'audio',
        topic: 'audio',
        section: 'production',
        title: lesson.title,
        blurb: lesson.subtitle,
        route: `${StudioRoutes.editor()}?tutorial=${encodeURIComponent(lesson.id)}`,
        cover: pickCover(`audio/production/${lesson.id}`, ratio, false),
        sigil: sigilFor({ ratio }) ?? undefined,
        accent: colorForKeyMode(PRODUCTION_ACCENT_KEY),
        percent: completedAt[lesson.id] != null ? 100 : 0,
        meta: `${place ?? lesson.difficulty} · ${lesson.estMinutes} min`,
        next: null,
        locked: lesson.requiresPremium && !isPremium,
        comingSoon: false,
      };
    }),
  };
  turn += 1;
  return [
    courseSection,
    productionSection,
    ...rest.map((module) => ({
      id: module.id,
      title: module.title,
      blurb: module.blurb ?? '',
      courses: module.lessons
        .filter(
          (lesson) =>
            lesson.kind !== 'anatomy' ||
            !lesson.instrument ||
            inputs.enabled(lesson.instrument),
        )
        .map(
          (lesson): CatalogCourse => ({
            id: `audio/${module.id}/${lesson.id}`,
            slug: lesson.id,
            kind: 'audio',
            topic: 'audio',
            section: module.id,
            title: lesson.title,
            blurb: '',
            route: audioLessonRoute(module, lesson),
            cover: pickCover(
              `audio/${module.id}/${lesson.id}`,
              lesson.ratio,
              false,
            ),
            sigil: sigilFor({ ratio: lesson.ratio }) ?? undefined,
            accent: colorForKeyMode(module.accentKey),
            percent: 0,
            meta: audioLessonKind(lesson),
            next: null,
            locked: module.access === 'premium' && !isPremium,
            comingSoon: false,
          }),
        ),
    })),
  ];
}

/** Every topic Learn teaches, in Learn's own order. Pure but for genre progress
 *  read from this device. */
export function buildLearnCatalog(
  inputs: CatalogInputs,
): readonly CatalogTopic[] {
  return TOPIC_META.filter(
    (topic) => topic.id === 'audio' || inputs.enabled(topic.id),
  ).map((topic) => ({
    ...topic,
    sections:
      topic.id === 'audio'
        ? audioSections(inputs)
        : instrumentSections(topic.id, inputs),
  }));
}

/** All of a catalog's courses, in order. */
export const allCourses = (
  topics: readonly CatalogTopic[],
): readonly CatalogCourse[] =>
  topics.flatMap((topic) => topic.sections.flatMap((s) => s.courses));
