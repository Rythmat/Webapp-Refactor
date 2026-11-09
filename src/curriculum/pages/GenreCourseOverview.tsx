import { ArrowRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useSearchParams } from 'react-router-dom';
import { HeaderBar } from '@/components/ClassroomLayout/HeaderBar';
import { HomeGlow } from '@/components/ClassroomLayout/home/HomeGlow';
import {
  GO_PILL,
  GO_PILL_ENABLED,
  PROMPT_FRAME,
  PROMPT_WASH,
} from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';
import { LearnRoutes } from '@/constants/routes';
import { getActivityFlow } from '@/curriculum/data/activityFlows';
import { getGenreProfile } from '@/curriculum/data/genreProfiles';
import { readGenreProgress } from '@/curriculum/hooks/useGenreProgress';
import type { GenreLevelProfile } from '@/curriculum/types/genreProfile';
import { isSectionBuilt } from '@/features/learn/genreReadiness';
import { levelScales, scaleColor } from './genreOverview/genreOverviewShared';
import '@/components/learn/learn.css';

// ── A genre course's page: choose a level (owner, 2026-10-27) ─────────────
// As Theory's mode page chooses a key: the page glows the chosen level's
// colour, Start opens its lesson on its Overview (About › Theory ›
// Technique, which were this page's tabs), and a level with progress saved
// on this device continues at its first unfinished section. The level is in
// the URL (?level=2), so Back returns to it.

const LEVELS = [1, 2, 3] as const;
type LevelNum = (typeof LEVELS)[number];

const asLevel = (value: string | null): LevelNum =>
  value === '2' ? 2 : value === '3' ? 3 : 1;

/** "D Dorian", or a level's several scales: "E Phrygian · Dorian". */
function levelKeyLine(level: GenreLevelProfile): string {
  const root = level.keyCenter.split(' ')[0];
  if (!level.scales) return `${root} ${level.mode}`;
  return `${root} ${levelScales(level)
    .map((s) => s.name)
    .join(' · ')}`;
}

type GenreCourseOverviewProps = {
  genreSlug: string;
};

export function GenreCourseOverview({ genreSlug }: GenreCourseOverviewProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selected = asLevel(searchParams.get('level'));
  const profile = getGenreProfile(genreSlug);

  // Which levels have a built lesson (most are still "Coming Soon").
  const [built, setBuilt] = useState<Record<number, boolean> | null>(null);
  useEffect(() => {
    let live = true;
    Promise.all(
      LEVELS.map(async (level) => {
        const flow = await getActivityFlow(genreSlug, level);
        const sections = (flow?.sections ?? []) as Parameters<
          typeof isSectionBuilt
        >[0][];
        return [level, sections.some(isSectionBuilt)] as const;
      }),
    ).then((entries) => {
      if (live) setBuilt(Object.fromEntries(entries));
    });
    return () => {
      live = false;
    };
  }, [genreSlug]);

  const progress = useMemo(
    () =>
      Object.fromEntries(
        LEVELS.map((level) => [level, readGenreProgress(genreSlug, level)]),
      ),
    [genreSlug],
  );

  if (!profile) {
    return (
      <div className="learn-root p-8 text-white/55">
        Genre profile not found: {genreSlug}
      </div>
    );
  }

  const choose = (level: LevelNum) =>
    setSearchParams(
      (params) => {
        params.set('level', String(level));
        return params;
      },
      { replace: true },
    );

  const level = profile.levels[selected];
  const accent = scaleColor(level, levelScales(level)[0]?.scaleId);
  const saved = progress[selected];
  const ready = built?.[selected] !== false;
  const lessonRoute = LearnRoutes.genreLesson({
    genre: genreSlug,
    level: String(selected),
  });
  const resuming = saved.started && saved.resumeSection !== null;

  return (
    <div
      className="learn-root relative isolate flex min-h-full flex-col"
      data-genre-course={genreSlug}
    >
      {/* The page glows the chosen level's colour, easing as it changes. */}
      <HomeGlow colors={[accent, accent]} />
      <HeaderBar
        title={profile.displayName}
        onBack={() => navigate(-1)}
        showProfile={false}
      />
      {/* Under the title, as the mode page's subtitle. */}
      <p className="-mt-3 pl-16 pr-4 text-sm text-white/60 sm:pl-[4.5rem] lg:pl-[5.5rem]">
        {profile.tagline}
      </p>

      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-5 px-4 py-6">
        <p className="text-[0.6875rem] uppercase tracking-[0.18em] text-white/45">
          Choose a level
        </p>

        <div
          role="radiogroup"
          aria-label={`${profile.displayName}: choose a level`}
          className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3"
        >
          {LEVELS.map((n) => {
            const lv = profile.levels[n];
            const color = scaleColor(lv, levelScales(lv)[0]?.scaleId);
            const lvSaved = progress[n];
            const lvReady = built?.[n] !== false;
            const isSelected = n === selected;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={isSelected}
                data-course-level={n}
                onClick={() => choose(n)}
                className={cn(
                  PROMPT_FRAME,
                  PROMPT_WASH,
                  'flex flex-col items-start gap-1.5 p-4 text-left outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-white/40',
                  isSelected
                    ? 'border-white/30 bg-white/[0.07]'
                    : 'hover:bg-white/[0.06]',
                )}
              >
                <span className="flex items-center gap-2 text-base text-[#e8e8f0]">
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ background: color }}
                  />
                  Level {n}
                </span>
                <span className="text-sm text-white/70">
                  {levelKeyLine(lv)}
                </span>
                <span className="text-sm text-white/45">{lv.tempoRange}</span>
                <span className="mt-1 text-[0.6875rem] uppercase tracking-[0.18em] text-white/40">
                  {!lvReady
                    ? 'Coming soon'
                    : lvSaved.started && lvSaved.resumeSection === null
                      ? 'Complete'
                      : lvSaved.started
                        ? `${lvSaved.passedSteps} ${lvSaved.passedSteps === 1 ? 'step' : 'steps'} passed`
                        : 'Not started'}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          data-start-level={selected}
          disabled={!ready}
          onClick={() =>
            navigate(
              resuming
                ? `${lessonRoute}?section=${saved.resumeSection}`
                : lessonRoute,
            )
          }
          className={cn(
            GO_PILL,
            ready ? GO_PILL_ENABLED : 'cursor-not-allowed text-white/40',
            'h-10 bg-white/[0.04] px-5',
          )}
        >
          <span
            aria-hidden
            className="size-2 rounded-full"
            style={{ background: accent }}
          />
          {!ready
            ? `Level ${selected} is coming soon`
            : `${resuming ? 'Continue' : 'Start'} ${profile.displayName} · Level ${selected}`}
          {ready && <ArrowRight aria-hidden className="size-4" />}
        </button>
      </section>
    </div>
  );
}
