import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LockedFeatureOverlay } from '@/components/ui/LockedFeatureOverlay';
import { cn } from '@/components/utilities';
import { LearnRoutes } from '@/constants/routes';
import {
  AUDIO_MODULES,
  audioLessonRoute,
  courseRows,
} from '@/curriculum/audio/catalog';
import { rowPercent } from '@/curriculum/audio/lab/audioProgress';
import type { GenreReadiness } from '@/features/learn/genreReadiness';
import { FAMILY_ACCENT_KEY } from '@/features/learn/paths/TheoryPathPage';
import { genrePath } from '@/features/learn/paths/genrePath';
import { THEORY_FAMILIES } from '@/features/learn/paths/theoryFamilies';
import {
  theoryFamilyPath,
  theoryFamilyRoute,
} from '@/features/learn/paths/theoryPath';
import { theoryProgress } from '@/features/learn/paths/theoryProgress';
import {
  isLearnInstrumentEnabled,
  useLearnChoice,
  type LearnChoice,
} from '@/features/learn/useInstrumentStore';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';
import { useProgressSummary } from '@/hooks/data/progress';
import { useIsPremium } from '@/hooks/useIsPremium';
import { colorForKeyMode } from '@/lib/modeColorShift';
import { GENRE_COURSES } from './genreCourses';
import type { PathCourse } from './path/types';
import { SigilCard } from './sigil/SigilCard';
import { genreSpec, sigilFor, type SigilSpec } from './sigil/sigilSpec';
import { techniqueDataFor } from './techniqueCatalog';

// ── Learn's topics ─────────────────────────────────────────────────────────
// The five things Learn teaches, each with its sub categories as a line of
// connected tiles. Picking a tile opens that sub category's path. The instrument
// played last comes first (owner, 2026-11-02).

interface Tile {
  id: string;
  title: string;
  route: string;
  spec: SigilSpec | null;
  percent: number;
  locked?: boolean;
  comingSoon?: boolean;
}

interface Row {
  id: string;
  title: string;
  tiles: readonly Tile[];
}

interface Topic {
  id: LearnChoice;
  title: string;
  tagline: string;
  icon: string;
  rows: readonly Row[];
}

const INSTRUMENT_TOPICS = [
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
] as const;

const coursePercent = (course: PathCourse) => {
  const tracked = course.rows.filter((row) => row.tracked);
  if (!tracked.length) return 0;
  return Math.round(
    tracked.reduce((sum, row) => sum + Math.min(100, row.percent), 0) /
      tracked.length,
  );
};

/** The figure a family's tile draws: its parent mode's. */
const familySpec = (parent: string | undefined, id: string) =>
  parent
    ? sigilFor({ mode: parent })
    : sigilFor({
        expandId: `${id}:c`,
        ratio: id === 'relative' ? [2, 3] : [3, 4],
      });

/** The genres known to be built, until the lessons have loaded to say so. */
const BUILT_BEFORE_LOADING = new Set(['pop', 'funk', 'hip-hop', 'latin']);

function ConnectedTile({
  tile,
  first,
  index,
  reduced,
}: {
  tile: Tile;
  first: boolean;
  index: number;
  reduced: boolean;
}) {
  const body: ReactNode = (
    <motion.span
      className="block"
      whileHover={reduced || tile.comingSoon ? undefined : { y: -3 }}
      whileTap={reduced || tile.comingSoon ? undefined : { y: 1, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
    >
      {tile.spec ? (
        <SigilCard
          spec={tile.spec}
          label={tile.title}
          interactive={!tile.comingSoon}
          className="pointer-events-none size-[8.5rem] overflow-hidden rounded-2xl"
        />
      ) : (
        <span className="block size-[8.5rem] rounded-2xl border border-white/15" />
      )}
      {tile.percent > 0 && (
        <span className="mx-3 mt-1 block h-1 overflow-hidden rounded-full bg-white/[0.1]">
          <span
            className="block h-full rounded-full bg-white/80"
            style={{ width: `${tile.percent}%` }}
          />
        </span>
      )}
    </motion.span>
  );
  return (
    <li
      className="relative flex shrink-0 items-start"
      data-learn-tile={tile.id}
      style={{ '--tile-index': index } as React.CSSProperties}
    >
      {!first && (
        <span
          aria-hidden
          className="mt-[4.25rem] h-px w-8 shrink-0 bg-white/20"
        />
      )}
      <div className="flex w-[8.5rem] flex-col items-center gap-2">
        {tile.comingSoon ? (
          <div
            className="opacity-45"
            aria-label={`${tile.title}: coming soon`}
            role="img"
          >
            {body}
          </div>
        ) : (
          <LockedFeatureOverlay
            locked={Boolean(tile.locked)}
            label={tile.title}
          >
            <Link
              to={tile.route}
              className="block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              aria-label={tile.title}
            >
              {body}
            </Link>
          </LockedFeatureOverlay>
        )}
        <span
          className={cn(
            'text-center text-[0.9375rem] leading-5',
            tile.comingSoon ? 'text-white/45' : 'text-white/90',
          )}
        >
          {tile.title}
          {tile.comingSoon && (
            <span className="block text-[0.75rem] text-white/40">
              Coming soon
            </span>
          )}
        </span>
      </div>
    </li>
  );
}

function TopicSection({ topic, reduced }: { topic: Topic; reduced: boolean }) {
  return (
    <motion.section
      id={`learn-${topic.id}`}
      data-learn-topic={topic.id}
      className="flex scroll-mt-4 flex-col gap-4"
      initial={reduced ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <header className="flex items-center gap-4">
        <span
          aria-hidden
          className="size-[4.5rem] shrink-0 bg-white"
          style={{
            maskImage: `url(${topic.icon})`,
            WebkitMaskImage: `url(${topic.icon})`,
            maskSize: 'contain',
            WebkitMaskSize: 'contain',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskPosition: 'center',
          }}
        />
        <div className="min-w-0">
          <h2 className="text-[1.125rem] font-bold leading-tight text-white">
            {topic.title}
          </h2>
          <p className="text-[0.9375rem] text-white/60">{topic.tagline}</p>
        </div>
      </header>
      <div className="flex flex-col gap-6 rounded-[1.375rem] bg-white/[0.035] p-4 sm:p-[1.375rem]">
        {topic.rows.map((row) => (
          <div
            key={row.id}
            id={`learn-${topic.id}-${row.id}`}
            data-learn-row={row.id}
            className="flex scroll-mt-4 flex-col gap-3"
          >
            <h3 className="text-[0.8125rem] font-bold uppercase tracking-widest text-white/50">
              {row.title}
            </h3>
            <ul
              className="-mx-1 flex overflow-x-auto py-1 pl-1 pr-10"
              style={{
                maskImage:
                  'linear-gradient(to right, #000 calc(100% - 2.5rem), transparent)',
              }}
            >
              {row.tiles.map((tile, i) => (
                <ConnectedTile
                  key={tile.id}
                  tile={tile}
                  first={i === 0}
                  index={i}
                  reduced={reduced}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

export function LearnTopics({
  genreReady,
}: {
  /** Which genre lessons are built; null until they've loaded. */
  genreReady: GenreReadiness | null;
}) {
  const reduced = useReducedMotion() ?? false;
  const choice = useLearnChoice();
  const { hash } = useLocation();
  const { isPremium } = useIsPremium();
  const { data: summary } = useProgressSummary(true);
  const completedAt = useTutorialProgressStore((s) => s.completedAt);
  const lessons = summary?.lessons;

  const topics = useMemo<readonly Topic[]>(() => {
    const instruments: Topic[] = INSTRUMENT_TOPICS.filter((topic) =>
      isLearnInstrumentEnabled(topic.id),
    ).map((topic) => {
      const progress = theoryProgress(topic.id, lessons ?? []);
      const rows: Row[] = [
        {
          id: 'theory',
          title: 'Theory',
          tiles: THEORY_FAMILIES.map((family) => ({
            id: family.id,
            title: family.title,
            route: theoryFamilyRoute(topic.id, family.id),
            spec: familySpec(family.parent, family.id),
            percent: coursePercent(
              theoryFamilyPath(
                family,
                colorForKeyMode(FAMILY_ACCENT_KEY[family.id]),
                { instrument: topic.id, isPremium, progress },
              ),
            ),
          })),
        },
      ];
      // Genres teach at the keys so far, so that's the only place they're offered.
      if (topic.id === 'piano') {
        const isBuilt = (slug: string) =>
          genreReady ? genreReady.course(slug) : BUILT_BEFORE_LOADING.has(slug);
        rows.push({
          id: 'genres',
          title: 'Genres',
          tiles: [...GENRE_COURSES]
            .sort((a, b) => Number(isBuilt(b.slug)) - Number(isBuilt(a.slug)))
            .map((course) => ({
              id: course.slug,
              title: course.title,
              route: LearnRoutes.genreCourse({ genre: course.slug }),
              spec: genreSpec(course.slug, course.image),
              comingSoon: !isBuilt(course.slug),
              percent:
                genreReady && isBuilt(course.slug)
                  ? coursePercent(
                      genrePath(course.slug, {
                        title: course.title,
                        description: '',
                        accent: '#ffffff',
                        ratio: [2, 3],
                        isPremium,
                        built: (level, section) =>
                          genreReady.section(course.slug, level, section),
                      }),
                    )
                  : 0,
            })),
        });
      }
      const technique = techniqueDataFor(topic.id);
      if (technique.length) {
        rows.push({
          id: 'technique',
          title: 'Technique',
          tiles: technique.map((item) => ({
            id: item.title,
            title: item.title,
            route: item.route,
            spec: sigilFor({ ratio: item.ratio }),
            percent: 0,
            locked: Boolean(item.premium) && !isPremium,
          })),
        });
      }
      return { ...topic, rows };
    });
    const courses = AUDIO_MODULES.filter((module) => module.shelf);
    const rest = AUDIO_MODULES.filter((module) => !module.shelf);
    const audio: Topic = {
      id: 'audio',
      title: 'Audio',
      tagline: 'How sound works, from the air to your mix',
      icon: '/icons/audio-icon.svg',
      rows: [
        {
          id: 'courses',
          title: 'Courses',
          tiles: courses.map((module) => {
            const rows = courseRows(module);
            return {
              id: module.id,
              title: module.title,
              route: LearnRoutes.audioCourse({ module: module.id }),
              spec: sigilFor({ ratio: module.lessons[0].ratio }),
              percent: Math.round(
                rows.reduce(
                  (sum, row) => sum + rowPercent(completedAt, module, row),
                  0,
                ) / Math.max(1, rows.length),
              ),
            };
          }),
        },
        ...rest.map((module) => ({
          id: module.id,
          title: module.title,
          tiles: module.lessons
            .filter(
              (lesson) =>
                lesson.kind !== 'anatomy' ||
                !lesson.instrument ||
                isLearnInstrumentEnabled(lesson.instrument),
            )
            .map((lesson) => ({
              id: lesson.id,
              title: lesson.title,
              route: audioLessonRoute(module, lesson),
              spec: sigilFor({ ratio: lesson.ratio }),
              percent: 0,
              locked: module.access === 'premium' && !isPremium,
            })),
        })),
      ],
    };
    const all = [...instruments, audio];
    // The one played last first.
    return [
      ...all.filter((topic) => topic.id === choice),
      ...all.filter((topic) => topic.id !== choice),
    ];
    // The order is set on arriving, so that nothing moves under the student.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedAt, genreReady, isPremium, lessons]);

  useEffect(() => {
    if (!hash) return;
    document
      .getElementById(`learn-${decodeURIComponent(hash.slice(1))}`)
      ?.scrollIntoView({
        block: 'start',
        behavior: reduced ? 'auto' : 'smooth',
      });
  }, [hash, reduced]);

  return (
    <div
      className="mx-auto mt-6 flex w-full max-w-[73rem] flex-col gap-10 px-4 pb-12 md:px-8"
      data-learn-home
    >
      <h1 className="sr-only">Learn</h1>
      {topics.map((topic) => (
        <TopicSection key={topic.id} topic={topic} reduced={reduced} />
      ))}
    </div>
  );
}
