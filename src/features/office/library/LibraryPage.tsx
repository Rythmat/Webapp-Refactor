import { ArrowLeft, Search, X } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useCountryFeatures } from '@/components/ClassroomLayout/globe/RegionPolygonThumb';
import { SHELF_ITEM, Shelf } from '@/components/explore/Shelf';
import { MicroLabel } from '@/components/kit';
import { cn } from '@/components/utilities';
import { OfficeRoutes } from '@/constants/routes';
import { EmptyState } from '@/daw/ui/EmptyState';
import { IconButton } from '@/daw/ui/IconButton';
import { Segmented } from '@/daw/ui/Segmented';
import { useThemeBank } from '@/features/classroom/content/hooks';
import { PHASES, type PhaseKey } from '@/features/classroom/phases';
import { useLocalPlan } from '@/features/classroom/plan/useLocalPlan';
import { useSavedLessons } from '@/features/classroom/plan/useSavedLessons';
import { useSongsReady } from '@/features/classroom/plan/useSongsReady';
import { useMyClassrooms } from '@/hooks/data';
import { LIBRARY_SCOPE, withInspect } from '../frame/useOfficeInspector';
import { LessonCard } from '../ui/LessonCard';
import {
  OFFICE_CARD,
  OFFICE_PAGE,
  OFFICE_PAGE_TITLE,
  OFFICE_ROW,
} from '../ui/styles';
import { GoalCard, LibraryCard } from './LibraryCards';
import {
  SECTION_TITLE,
  isSection,
  matches,
  phaseName,
  themeForMonth,
  type LibrarySection,
} from './libraryModel';
import { useLibraryEntries, type LibraryEntry } from './useLibraryEntries';

const GRID =
  'grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]';
const ORDER: LibrarySection[] = [
  'seeds',
  'themes',
  'activities',
  'goals',
  'ideas',
];
const SEARCH_LIMIT = 12;

type PhaseFilter = PhaseKey | 'all';
type SeedFilter = 'all' | 'day' | 'activity';

/**
 * The Library (owner, 2026-11-09): the teacher's warehouse — saved lessons,
 * lesson seeds, themes, activities, learning goals and the idea bank — as
 * Learn's shelves, with search across all of it and a "See all" grid per
 * kind. Anything opens in the Inspector; a seed or activity makes a lesson
 * from there. `?q=` searches, `?section=` opens a kind's grid.
 */
export const LibraryPage = () => {
  const { pathname, search } = useLocation();
  const [params, setParams] = useSearchParams();
  const entries = useLibraryEntries();
  const { themes } = useThemeBank();
  const { classrooms } = useMyClassrooms();
  const { saved } = useSavedLessons();
  const { getDay } = useLocalPlan();
  const countryFeatures = useCountryFeatures();
  const songsReady = useSongsReady();

  const q = params.get('q') ?? '';
  const section = isSection(params.get('section'))
    ? (params.get('section') as LibrarySection)
    : null;
  const phase = (params.get('phase') ?? 'all') as PhaseFilter;
  const seedKind = (params.get('kind') ?? 'all') as SeedFilter;

  const set = (changes: Record<string, string | null>) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(changes)) {
          if (v === null || v === '' || v === 'all') p.delete(k);
          else p.set(k, v);
        }
        return p;
      },
      { replace: true },
    );

  const open = (e: LibraryEntry) =>
    `${pathname}${withInspect(search, { kind: e.kind, classroomId: LIBRARY_SCOPE, id: e.id })}`;
  const seeAll = (s: LibrarySection) =>
    `${OfficeRoutes.library()}?section=${s}${q ? `&q=${encodeURIComponent(q)}` : ''}`;

  const filtered = (s: LibrarySection) =>
    entries[s].filter(
      (e) =>
        matches(q, ...e.fields) &&
        (phase === 'all' ||
          s === 'seeds' ||
          s === 'themes' ||
          s === 'ideas' ||
          e.phase === phase) &&
        (s !== 'seeds' || seedKind === 'all' || e.seedKind === seedKind),
    );

  const month = new Date().getMonth() + 1;
  const monthTheme = themeForMonth(themes, month);
  const monthSeeds = monthTheme
    ? entries.seeds.filter((e) => e.themeId === monthTheme.id)
    : [];
  const names = new Map(classrooms.map((c) => [c.id, c.name]));
  const savedDays = useMemo(
    () =>
      [...saved]
        .map((id) => getDay(id))
        .filter((d) => d && d.classroomId && names.has(d.classroomId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [saved, getDay, classrooms],
  );

  const card = (e: LibraryEntry) =>
    e.section === 'goals' ? (
      <GoalCard to={open(e)} eyebrow={e.eyebrow} text={e.title} />
    ) : (
      <LibraryCard
        id={e.id}
        to={open(e)}
        eyebrow={e.personal ? `${e.eyebrow} — yours` : e.eyebrow}
        title={e.title}
        meta={e.meta}
      />
    );

  const searchBox = (
    <label className="relative flex h-10 w-full items-center sm:w-80">
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3.5 size-4 text-daw-text-3"
      />
      <input
        value={q}
        onChange={(e) => set({ q: e.target.value })}
        placeholder="Search seeds, activities, goals…"
        aria-label="Search the Library"
        className="h-10 w-full rounded-full border border-white/10 bg-white/[0.04] pl-10 pr-9 text-[0.875rem] text-daw-text placeholder:text-daw-text-3 focus:border-white/25 focus:outline-none"
      />
      {q && (
        <IconButton
          label="Clear search"
          icon={<X />}
          size="sm"
          className="absolute right-2"
          onClick={() => set({ q: null })}
        />
      )}
    </label>
  );

  // ── One kind, all of it ──
  if (section) {
    const list = filtered(section);
    const phaseFilter = section === 'activities' || section === 'goals';
    return (
      <div className={OFFICE_PAGE}>
        <header className="flex flex-col gap-4">
          <Link
            to={OfficeRoutes.library()}
            className="inline-flex w-fit items-center gap-1.5 text-[0.8125rem] text-daw-text-3 hover:text-daw-text"
          >
            <ArrowLeft aria-hidden className="size-3.5" />
            Library
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <MicroLabel>
                {list.length} {list.length === 1 ? 'item' : 'items'}
              </MicroLabel>
              <h1 className={OFFICE_PAGE_TITLE}>{SECTION_TITLE[section]}</h1>
            </div>
            {searchBox}
          </div>
          {phaseFilter && (
            <Segmented<PhaseFilter>
              label="Section"
              className="max-w-full overflow-x-auto"
              options={[
                { value: 'all', label: 'All sections' },
                ...PHASES.map((p) => ({
                  value: p,
                  label: phaseName(p),
                })),
              ]}
              value={phase}
              onValueChange={(v) => set({ phase: v })}
            />
          )}
          {section === 'seeds' && (
            <Segmented<SeedFilter>
              label="Kind"
              options={[
                { value: 'all', label: 'All' },
                { value: 'day', label: 'Full lessons' },
                { value: 'activity', label: 'One activity' },
              ]}
              value={seedKind}
              onValueChange={(v) => set({ kind: v })}
            />
          )}
        </header>
        {list.length === 0 ? (
          <p
            className={cn(
              OFFICE_CARD,
              'px-6 py-10 text-center text-[0.875rem] text-daw-text-3',
            )}
          >
            Nothing matches. Try other words, or clear the filters.
          </p>
        ) : section === 'goals' ? (
          <ul className={cn(OFFICE_CARD, 'flex flex-col p-2')}>
            {list.map((e) => (
              <li key={e.id}>
                <Link
                  to={open(e)}
                  className={cn(OFFICE_ROW, 'items-start py-2.5')}
                >
                  <span className="w-36 shrink-0 pt-0.5">
                    <MicroLabel>{e.eyebrow}</MicroLabel>
                  </span>
                  <span className="text-[0.875rem] leading-snug text-daw-text">
                    {e.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <ul className={GRID}>
            {list.map((e) => (
              <li key={e.id}>{card(e)}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const counts = ORDER.map(
    (s) => `${entries[s].length} ${SECTION_TITLE[s].toLowerCase()}`,
  );

  return (
    <div className={OFFICE_PAGE}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <MicroLabel className="max-w-[60ch]">
            {counts.slice(0, 3).join(' · ')}
          </MicroLabel>
          <h1 className={OFFICE_PAGE_TITLE}>Library</h1>
        </div>
        {searchBox}
      </header>

      {q ? (
        // ── Search: every kind's matches ──
        (() => {
          const found = ORDER.map((s) => ({ s, list: filtered(s) })).filter(
            (r) => r.list.length,
          );
          if (found.length === 0) {
            return (
              <div className={OFFICE_CARD}>
                <EmptyState
                  className="py-16"
                  titleAs="h2"
                  icon={<Search />}
                  title={`Nothing in the Library matches “${q}”`}
                  description="Try a song, an artist, a skill or a month."
                />
              </div>
            );
          }
          return found.map(({ s, list }) => (
            <section
              key={s}
              aria-label={SECTION_TITLE[s]}
              className="flex flex-col gap-4"
            >
              <header className="flex items-baseline justify-between gap-3">
                <h2 className="text-[1.125rem] font-semibold text-daw-text">
                  {SECTION_TITLE[s]}{' '}
                  <span className="text-daw-text-3">{list.length}</span>
                </h2>
                {list.length > SEARCH_LIMIT && (
                  <Link
                    to={seeAll(s)}
                    className="text-[0.8125rem] text-daw-text-3 hover:text-daw-text"
                  >
                    See all {list.length}
                  </Link>
                )}
              </header>
              <ul className={GRID}>
                {list.slice(0, SEARCH_LIMIT).map((e) => (
                  <li key={e.id}>{card(e)}</li>
                ))}
              </ul>
            </section>
          ));
        })()
      ) : (
        // ── Shelves ──
        <>
          {savedDays.length > 0 && (
            <Shelf
              id="lib-saved"
              title="Saved lessons"
              reason="Bookmarked from your classes"
              count={savedDays.length}
            >
              {savedDays.map((day) =>
                day ? (
                  <li key={day.id} className={SHELF_ITEM}>
                    <LessonCard
                      day={day}
                      eyebrow={names.get(day.classroomId as string) ?? ''}
                      to={`${pathname}${withInspect(search, { kind: 'lesson', classroomId: day.classroomId as string, id: day.id })}`}
                      countryFeatures={countryFeatures}
                      songsReady={songsReady}
                    />
                  </li>
                ) : null,
              )}
            </Shelf>
          )}
          {monthTheme && monthSeeds.length > 0 && (
            <Shelf
              id="lib-month"
              title={monthTheme.title.en}
              reason="This month’s theme"
              count={monthSeeds.length}
            >
              {monthSeeds.map((e) => (
                <li key={e.id} className={SHELF_ITEM}>
                  {card(e)}
                </li>
              ))}
            </Shelf>
          )}
          {ORDER.map((s) =>
            entries[s].length ? (
              <Shelf
                key={s}
                id={`lib-${s}`}
                title={SECTION_TITLE[s]}
                seeAll={seeAll(s)}
                count={Math.min(entries[s].length, 16)}
              >
                {entries[s].slice(0, 16).map((e) => (
                  <li key={e.id} className={SHELF_ITEM}>
                    {card(e)}
                  </li>
                ))}
              </Shelf>
            ) : null,
          )}
        </>
      )}
    </div>
  );
};
