import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { HomeGlow } from '@/components/ClassroomLayout/home/HomeGlow';
import { HomePromptBar } from '@/components/ClassroomLayout/home/HomePromptBar';
import { HomeSearchPill } from '@/components/ClassroomLayout/home/HomeSearchPill';
import { useGenreReadiness } from '@/features/learn/genreReadiness';
import type { LearnTab } from '@/features/learn/learnPaths';
import { learnPageSuggestions } from '@/features/learn/learnPromptSuggestions';
import { useLearnInstrument } from '@/features/learn/useInstrumentStore';
import { useWelcomeRedirect } from '@/features/welcome/useWelcomeGate';
import { useMe } from '@/hooks/data';
import { LearnKindPills } from '../LearnPromptPills';

/**
 * /learn: the student's Learn, in Suno Discover's layout (owner, 2026-11-04).
 * Search top right and a centred welcome over the prompt bar. Its three
 * columns (For You, Staff Picks, Progress: LearnDiscoverColumns) moved to
 * Home in place of the instrument picker (owner, 2026-11-04); the page's
 * other sections come back later, their components kept.
 */
export function LearnDashboard() {
  const welcome = useWelcomeRedirect();
  const instrument = useLearnInstrument();
  const genreReady = useGenreReadiness(true);
  const { data: me } = useMe();
  const [kind, setKind] = useState<LearnTab | null>(null);

  const suggestions = useMemo(
    () => learnPageSuggestions(instrument, kind ?? undefined, { genreReady }),
    [instrument, kind, genreReady],
  );

  if (welcome) return <Navigate replace to={welcome} />;

  const name = me?.nickname || me?.username;

  return (
    <div data-testid="learn-page" className="flex min-h-full w-full flex-col">
      {/* `isolate`, so the glow's -z-10 sits behind everything here. */}
      <div
        data-learn-home
        className="relative isolate flex w-full flex-col items-center px-4 pb-14 pt-[clamp(3rem,12vh,8.75rem)] md:px-10"
      >
        <HomeGlow />
        {/* Search, top right, where Suno's Discover keeps it. */}
        <div className="absolute right-2 top-2 z-10">
          <HomeSearchPill avoidId="home-prompt" />
        </div>
        <h1 className="relative mb-7 text-center text-[clamp(2rem,1.4rem+2.4vw,3.25rem)] leading-[1.05] -tracking-wide text-white">
          {name ? `Welcome, ${name}` : 'Welcome'}
        </h1>
        <div className="flex w-full justify-center">
          <HomePromptBar
            suggestions={suggestions}
            ordered={!kind}
            showTargets={false}
            instrument={instrument}
            pills={
              instrument === 'bass' || instrument === 'ukulele' ? null : (
                <LearnKindPills kind={kind} onChange={setKind} />
              )
            }
          />
        </div>
      </div>
    </div>
  );
}
