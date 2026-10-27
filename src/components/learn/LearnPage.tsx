import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ActivityRail } from '@/components/ClassroomLayout/home/ActivityRail';
import { HomeGlow } from '@/components/ClassroomLayout/home/HomeGlow';
import { HomePromptBar } from '@/components/ClassroomLayout/home/HomePromptBar';
import {
  filterSongs,
  type SavedFilter,
} from '@/components/songLibrary/SongLibraryPage';
import { PerStudent } from '@/components/ui/PerStudent';
import { cn } from '@/components/utilities';
import { SongRoutes } from '@/constants/routes';
import { getAllSongs } from '@/curriculum/data/songs';
import { useGenreReadiness } from '@/features/learn/genreReadiness';
import type { LearnTab } from '@/features/learn/learnPaths';
import {
  learnPageSuggestions,
  type GenreSectionId,
} from '@/features/learn/learnPromptSuggestions';
import { useLearnInstrument } from '@/features/learn/useInstrumentStore';
import { useSavedSongsStore } from '@/features/songs/useSavedSongsStore';
import { LearnInlet } from './LearnInlet';
import { LearnInstrumentPill } from './LearnInstrumentPill';
import {
  GenreSectionPills,
  LearnKindPills,
  SongFilterPills,
} from './LearnPromptPills';
import { LearnTabBar } from './LearnTabBar';

/** The old Learn navigation's tabs the page keeps, after its heading. */
const NAV_TABS = ['Songs', 'Genre', 'Theory', 'Technique'] as const;

/**
 * The Learn page, being redesigned (owner, 2026-10-24): /learn/keyboard and
 * /learn/guitar (bare /learn opens the chosen instrument's), and each tab's
 * page on them, /learn/keyboard/songs, /learn/guitar/theory… (`tab`). Only
 * the dashboard's side rail and TopRail show around it. Centred at the top,
 * the old Learn navigation (LearnTabBar): the Learn icon alone, then Songs,
 * Genre, Theory and Technique, without the tour button or instrument picker.
 * Top right, where Home has its search pill, LearnInstrumentPill names the
 * instrument and switches it; on the Songs pages, Set Lists top left. Under the navigation, centred, on every Learn
 * page, Home's prompt bar, with no Studio / Learn / Globe / Arcade picker:
 * it suggests the instrument's prompts only (keyboard or guitar), on a tab's
 * page only what that page shows (learnPageSuggestions), and opens its
 * Theory lessons on the instrument. Its pills, beside Go, narrow the
 * suggestions to Songs, Genre, Theory or Technique (LearnKindPills), the
 * page's own chosen on a tab's page; on the Songs pages they are the list's
 * Difficulty, Genre and Saved filters instead (SongFilterPills), and the
 * suggestions are the songs those filters leave; on the Genre pages, a
 * lesson's sections (GenreSectionPills: Melody, Chords, Bass, Performance),
 * one chosen turning the suggestions to that section of every course. On a tab's
 * page, the old Learn tab's content under it (LearnInlet, without its own
 * tab bar), on the instrument: Songs' chord charts, Theory's tiles and
 * Technique's are its. Home's glow behind, and Home's activity rail
 * (ActivityRail) pinned to the bottom.
 */
export const LearnPage = ({ tab }: { tab?: LearnTab }) => {
  const instrument = useLearnInstrument();
  // The kind the bar's pills narrow its suggestions to: the page's own on a
  // tab's page, none (the instrument's whole list) on Learn's own.
  const [kind, setKind] = useState<LearnTab | null>(tab ?? null);
  // The Genre pages' chosen lesson section (Melody, Chords…), if any.
  const [genreSection, setGenreSection] = useState<GenreSectionId | null>(null);
  useEffect(() => {
    setKind(tab ?? null);
    setGenreSection(null);
  }, [tab]);
  // On the Songs pages, the songs their filters leave (as the list shows).
  const [params] = useSearchParams();
  const savedIds = useSavedSongsStore((s) => s.savedIds);
  const q = params.get('q') ?? '';
  const genre = params.get('genre') ?? 'all';
  const difficulty = params.get('difficulty') ?? 'all';
  const saved = (params.get('saved') as SavedFilter) || 'all';
  const shownSongs = useMemo(
    () =>
      tab === 'Songs'
        ? filterSongs(
            getAllSongs(),
            { search: q, genre, difficulty, saved, sort: 'title' },
            savedIds,
          )
        : undefined,
    [tab, q, genre, difficulty, saved, savedIds],
  );
  // Which genre lessons are built: the Genre pages and Learn's own page
  // suggest only those.
  const genreReady = useGenreReadiness(!tab || tab === 'Genre');
  // Kept while the kind, instrument and songs stay: the bar reshuffles when
  // its list changes.
  const suggestions = useMemo(
    () =>
      learnPageSuggestions(instrument, kind ?? undefined, {
        songs: shownSongs,
        genreSection,
        genreReady,
      }),
    [instrument, kind, shownSongs, genreSection, genreReady],
  );
  return (
    // `isolate`, so the glow's -z-10 puts it behind everything here but
    // still in front of the panel's background (as on Home).
    <div
      data-testid="learn-page"
      className={cn(
        'relative isolate flex w-full flex-col',
        tab ? 'h-full' : 'min-h-full',
      )}
    >
      <HomeGlow />
      <div
        className={cn(
          'relative flex w-full shrink-0 flex-col items-center p-2',
          // The Songs pages' column headers 20px under it (owner,
          // 2026-10-25), in rem as the app's 110% scale wants.
          tab === 'Songs' ? 'pb-5' : tab ? 'pb-2' : 'pb-10',
        )}
      >
        {/* The instrument switcher, top right, where Home keeps its search. */}
        <div className="absolute right-2 top-2 z-10">
          <LearnInstrumentPill />
        </div>
        {/* On the Songs pages, Set Lists in the top left corner, in the
          switcher's look (owner, 2026-10-25). */}
        {tab === 'Songs' && (
          <Link
            to={SongRoutes.setLists()}
            // The tour's way in (navigateTour: open-set-lists).
            aria-label="Open Set Lists"
            className="absolute left-2 top-2 z-10 flex h-10 items-center whitespace-nowrap rounded-full border border-white/10 bg-white/10 px-4 text-[0.9375rem] leading-6 text-white outline-none backdrop-blur-md transition-colors duration-150 hover:bg-white/[0.14] focus-visible:ring-2 focus-visible:ring-white/40"
          >
            Set Lists
          </Link>
        )}
        {/* The old Learn navigation, centred at the top (owner, 2026-10-24). */}
        <LearnTabBar only={NAV_TABS} extras={false} instrumentHeading />
        {/* The prompt bar under it, centred, on every Learn page (owner,
          2026-10-25: the tab pages too). */}
        <div className="mt-6 flex w-full justify-center">
          <HomePromptBar
            suggestions={suggestions}
            // Learn's own page, no pill: the mixed list is already in its
            // order (the kinds take turns).
            ordered={!tab && !kind}
            showTargets={false}
            instrument={instrument}
            // The Songs pages: their filters; the Genre pages: a lesson's
            // sections; elsewhere, the kinds.
            pills={
              tab === 'Songs' ? (
                <SongFilterPills />
              ) : tab === 'Genre' ? (
                <GenreSectionPills
                  section={genreSection}
                  onChange={setGenreSection}
                />
              ) : instrument === 'bass' ? null : ( // Bass suggests its Theory lessons alone: nothing to narrow.
                <LearnKindPills kind={kind} onChange={setKind} />
              )
            }
          />
        </div>
      </div>
      {/* A tab's page: the old Learn tab, on this instrument, under the
        navigation, scrolling within itself. */}
      {tab && (
        <div className="relative min-h-0 flex-1">
          <LearnInlet tab={tab} bare />
        </div>
      )}
      {/* Pinned to the bottom, as on Home: where you left off, cycling
        through your recent activity. The negative margins and the -8px
        stick take it to the panel's edges, past the scroll area's 8px
        padding. */}
      <div className="sticky -bottom-2 z-20 -mx-2 -mb-2 mt-auto shrink-0">
        <PerStudent
          label="Recent activity"
          minHeight={72}
          className="rounded-none bg-[#0c0c0e]"
        >
          <ActivityRail />
        </PerStudent>
      </div>
    </div>
  );
};
