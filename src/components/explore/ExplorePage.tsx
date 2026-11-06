import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { MICRO_LABEL, microLabel } from '@/components/kit/MicroLabel';
import { WHITE_PILL } from '@/components/kit/pills';
import { GENRE_OPTIONS } from '@/components/songLibrary/SongLibraryPage';
import { cn } from '@/components/utilities';
import { ProfileRoutes, SongRoutes } from '@/constants/routes';
import { getAllSongs } from '@/curriculum/data/songs';
import type { Song } from '@/curriculum/types/songLibrary';
import { getCortexRecords, subscribeCortex } from '@/features/cortex/ledger';
import {
  byTitle,
  easySongs,
  genreRows,
  popularSongs,
  SHELF_SIZE,
} from '@/features/explore/exploreShelves';
import { courseTouches } from '@/features/learn/catalog/courseActivity';
import {
  exploreHref,
  parseLearnHash,
  topicOfWord,
  topicWord,
} from '@/features/learn/catalog/exploreState';
import {
  allCourses,
  type CatalogCourse,
  type CatalogSection,
  type CatalogTopic,
} from '@/features/learn/catalog/learnCatalog';
import { useLearnCatalog } from '@/features/learn/catalog/useLearnCatalog';
import { songsFor } from '@/features/learn/dashboard/recommend';
import { useGenreReadiness } from '@/features/learn/genreReadiness';
import { useLearnProfile } from '@/features/learn/profile/useLearnProfile';
import {
  useInstrumentStore,
  useLearnChoice,
  type LearnChoice,
} from '@/features/learn/useInstrumentStore';
import { LearnActivityRail } from '../learn/LearnActivityRail';
import { ChoicePills } from '../learn/LearnPromptPills';
import { CourseArt } from '../learn/cover/CourseArt';
import { songsReason, useTasteGenres } from '../learn/dashboard/useTasteGenres';
import { CourseCard } from '../learn/explore/CourseCard';
import { GenreOrderContext } from '../learn/sigil/genreOrder';
import { EXPLORE_COLUMN, EXPLORE_GRID, ExploreNavBar } from './ExploreChrome';
import { GenreCard } from './GenreCard';
import { SHELF_ITEM, Shelf } from './Shelf';
import { SongCard } from './SongCard';

// ── /explore: everything, in Suno's layout (owner, 2026-11-04) ─────────────
// The Arcade's head across the top, its words the instruments; then
// shelves: that instrument's courses a section to a shelf, songs for them,
// the best-known, easy songs, and a "Best of" for each genre. The address
// holds the rest, so a teacher can share it: `?i=&c=` opens a section's
// courses whole (where every "See all" and lesson's way back lands); `?q=`
// (a link from the app's search) finds songs and courses.

function words(q: string) {
  return q.toLowerCase().split(/\s+/).filter(Boolean);
}

function courseMatches(
  course: CatalogCourse,
  topic: CatalogTopic,
  terms: string[],
) {
  const section = topic.sections.find((s) => s.id === course.section);
  const hay = [
    course.title,
    course.blurb,
    course.meta,
    section?.title ?? '',
    topic.title,
  ]
    .join(' ')
    .toLowerCase();
  return terms.every((term) => hay.includes(term));
}

function songMatches(song: Song, terms: string[]) {
  const hay = [song.title, song.artist, ...song.genreTags]
    .join(' ')
    .toLowerCase();
  return terms.every((term) => hay.includes(term));
}

/** Where a topic starts when nothing in it is begun yet (owner, 2026-11-05):
 *  an instrument's Level 1 · C Major, Audio's Sound Basics. */
const STARTER_COURSE: Readonly<Record<LearnChoice, string>> = {
  piano: 'piano/theory/diatonic',
  guitar: 'guitar/theory/diatonic',
  bass: 'bass/theory/diatonic',
  ukulele: 'ukulele/theory/diatonic',
  audio: 'audio/course/sound-basics',
};

/** The course here the student was in last, with its next stop; before
 *  they've begun, where to start. */
function ContinueStrip({ course }: { course: CatalogCourse }) {
  const next = course.next;
  if (!next) return null;
  const begun = next.done > 0;
  return (
    <div className="flex items-center gap-4 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-3 pr-4">
      <CourseArt course={course} stack={false} className="size-14 shrink-0" />
      <div className="min-w-0 flex-1">
        <span className={MICRO_LABEL}>
          {microLabel('Continue', course.title)}
        </span>
        <p className="truncate text-[0.9375rem] text-white">{next.title}</p>
        <p className="text-[0.8125rem] text-daw-text-3">
          {begun ? `${next.done} of ${next.total} done` : 'Start here'}
        </p>
      </div>
      <Link
        to={next.locked ? ProfileRoutes.plan() : next.route}
        className={cn(WHITE_PILL, 'shrink-0')}
      >
        {next.locked ? 'Unlock' : begun ? 'Continue' : 'Start'}
        <ArrowRight aria-hidden />
      </Link>
    </div>
  );
}

/** A section's courses whole: its "See all". */
function SectionGrid({
  topic,
  section,
}: {
  topic: CatalogTopic;
  section: CatalogSection;
}) {
  const open = section.courses.filter((course) => !course.comingSoon);
  const soon = section.courses.filter((course) => course.comingSoon);
  return (
    <section
      id={`learn-${topic.id}-${section.id}`}
      data-learn-row={section.id}
      aria-labelledby={`learn-${topic.id}-${section.id}-title`}
      className="flex flex-col gap-4"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h2
            id={`learn-${topic.id}-${section.id}-title`}
            className="text-[1.125rem] font-semibold leading-6 text-white"
          >
            {section.title}
          </h2>
          {section.blurb && (
            <p className="max-w-[40rem] text-[0.875rem] text-daw-text-3">
              {section.blurb}
            </p>
          )}
        </div>
        <span className={MICRO_LABEL}>
          {open.length} {open.length === 1 ? 'course' : 'courses'}
        </span>
      </header>
      <ul className={EXPLORE_GRID}>
        {open.map((course) => (
          <li key={course.id}>
            <CourseCard course={course} />
          </li>
        ))}
      </ul>
      {soon.length > 0 && (
        <div className="mt-2 flex flex-col gap-3">
          <span className={MICRO_LABEL}>Coming soon</span>
          <ul className={EXPLORE_GRID}>
            {soon.map((course) => (
              <li key={course.id}>
                <CourseCard course={course} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function SongShelf({
  id,
  title,
  reason,
  seeAll,
  songs,
}: {
  id: string;
  title: string;
  reason?: string;
  seeAll: string;
  songs: readonly Song[];
}) {
  if (!songs.length) return null;
  return (
    <Shelf
      id={id}
      title={title}
      reason={reason}
      seeAll={seeAll}
      count={songs.length}
    >
      {songs.map((song) => (
        <li key={song.id} className={SHELF_ITEM}>
          <SongCard song={song} />
        </li>
      ))}
    </Shelf>
  );
}

export function ExplorePage() {
  const reduced = useReducedMotion() ?? false;
  const navigate = useNavigate();
  const { hash } = useLocation();
  const [params, setParams] = useSearchParams();
  const choice = useLearnChoice();
  const setInstrument = useInstrumentStore((s) => s.setInstrument);
  const chooseAudio = useInstrumentStore((s) => s.chooseAudio);
  const genreReady = useGenreReadiness(true);
  const topics = useLearnCatalog(genreReady);
  const records = useSyncExternalStore(subscribeCortex, getCortexRecords);
  const { profile } = useLearnProfile();
  const tasteGenres = useTasteGenres(topics, records);
  // Read here, under the route's ContentGate: the store fills from the CDN.
  const songs = useMemo(() => getAllSongs(), []);

  // An old one-page anchor (/learn#guitar-theory) becomes its address here.
  useEffect(() => {
    const old = parseLearnHash(hash);
    if (old) navigate(exploreHref(old.topic, old.section), { replace: true });
  }, [hash, navigate]);

  const asked = topicOfWord(params.get('i'));
  const wanted = asked ?? choice;
  const topic =
    topics.find((t) => t.id === wanted) ??
    topics.find((t) => t.id === choice) ??
    topics[0];
  const sectionId = params.get('c');
  const section = topic.sections.find((s) => s.id === sectionId) ?? null;
  const q = params.get('q') ?? '';

  // A topic opened by its tab becomes Learn's choice, as the old pill did.
  useEffect(() => {
    if (!asked || asked !== topic.id) return;
    if (asked === 'audio') chooseAudio();
    else setInstrument(asked);
  }, [asked, topic.id, chooseAudio, setInstrument]);

  const setSection = (id: string | null) => {
    const next = new URLSearchParams(params);
    next.set('i', topicWord(topic.id));
    if (id) next.set('c', id);
    else next.delete('c');
    setParams(next, { replace: true });
  };

  const touches = useMemo(
    () => courseTouches(allCourses(topics), records),
    [topics, records],
  );

  // Where they were last in this topic, while it has a stop left; else
  // where to start, so every topic has its Continue.
  const resume = useMemo(() => {
    const courses = topic.sections.flatMap((s) => s.courses);
    const started = courses.filter(
      (course) => course.next && course.percent > 0,
    );
    const last = [...started].sort(
      (a, b) =>
        (touches.get(b.id)?.lastMin ?? 0) - (touches.get(a.id)?.lastMin ?? 0) ||
        b.percent - a.percent,
    )[0];
    if (last) return last;
    const starter = courses.find((c) => c.id === STARTER_COURSE[topic.id]);
    return starter?.next
      ? starter
      : (courses.find((c) => c.next && !c.comingSoon) ?? null);
  }, [topic, touches]);

  const results = useMemo(() => {
    const terms = words(q);
    if (!terms.length) return null;
    const ordered = [topic, ...topics.filter((t) => t.id !== topic.id)];
    return {
      songs: byTitle(songs.filter((song) => songMatches(song, terms))),
      courses: ordered.flatMap((t) =>
        t.sections.flatMap((s) =>
          s.courses
            .filter((course) => courseMatches(course, t, terms))
            .map((course) => ({ course, topic: t, section: s })),
        ),
      ),
    };
  }, [q, songs, topic, topics]);

  const shelves = useMemo(
    () => ({
      forYou: songsFor(songs, {
        tasteGenres,
        level: profile.level,
        records,
        limit: SHELF_SIZE,
      }),
      popular: popularSongs(songs),
      easy: easySongs(songs),
      genres: genreRows(songs, GENRE_OPTIONS),
    }),
    [songs, tasteGenres, profile.level, records],
  );

  // The Best Of row's order: a genre course's sigil takes its tile's
  // colours (owner, 2026-11-05).
  const genreOrder = useMemo(
    () => shelves.genres.map((genre) => genre.slug),
    [shelves.genres],
  );

  const view = results ? 'search' : section ? 'section' : 'hub';

  return (
    <GenreOrderContext.Provider value={genreOrder}>
      <div
        data-testid="explore"
        data-explore-view={view}
        className="relative isolate flex min-h-full w-full flex-col"
      >
        {/* The Arcade's head (owner, 2026-11-04): the instruments, the one
          showing white; on a section's page they keep the section. */}
        <ExploreNavBar
          activeKey={topic.id}
          items={topics.map((t) => ({
            key: t.id,
            label: t.title,
            to: exploreHref(t.id, section?.id),
          }))}
        />

        <motion.div
          key={view === 'section' ? `${topic.id}/${section?.id}` : view}
          className={cn(EXPLORE_COLUMN, 'mt-2 flex flex-col gap-10 pb-14')}
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {results ? (
            <section aria-live="polite" className="flex flex-col gap-8">
              <p className="text-[0.9375rem] text-daw-text-3">
                {results.songs.length + results.courses.length
                  ? `${results.songs.length} ${results.songs.length === 1 ? 'song' : 'songs'} and ${results.courses.length} ${results.courses.length === 1 ? 'course' : 'courses'} for “${q}”`
                  : `Nothing matches “${q}”.`}
              </p>
              {results.songs.length > 0 && (
                <div className="flex flex-col gap-4">
                  <h2 className="text-[1.125rem] font-semibold leading-6 text-white">
                    Songs
                  </h2>
                  <ul className={EXPLORE_GRID}>
                    {results.songs.map((song) => (
                      <li key={song.id}>
                        <SongCard song={song} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {results.courses.length > 0 && (
                <div className="flex flex-col gap-4">
                  <h2 className="text-[1.125rem] font-semibold leading-6 text-white">
                    Courses
                  </h2>
                  <ul className={EXPLORE_GRID}>
                    {results.courses.map(({ course, topic: t, section: s }) => (
                      <li key={course.id}>
                        <CourseCard
                          course={course}
                          eyebrow={microLabel(t.title, s.title)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!results.songs.length && !results.courses.length && (
                <button
                  type="button"
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    next.delete('q');
                    setParams(next, { replace: true });
                  }}
                  className={cn(WHITE_PILL, 'self-start')}
                >
                  Back to Learn
                </button>
              )}
            </section>
          ) : section ? (
            <div className="flex flex-col gap-8">
              {topic.sections.length > 1 && (
                <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none]">
                  <ChoicePills
                    label="Section"
                    options={topic.sections.map((s) => ({
                      id: s.id,
                      label: s.title,
                    }))}
                    value={section.id}
                    onChange={setSection}
                  />
                </div>
              )}
              <SectionGrid topic={topic} section={section} />
            </div>
          ) : (
            <>
              <section
                aria-label={`${topic.title} courses`}
                data-explore-courses={topic.id}
                className="flex flex-col gap-10"
              >
                {resume && <ContinueStrip course={resume} />}
                {topic.sections.map((s) => (
                  <Shelf
                    key={`${topic.id}/${s.id}`}
                    id={`${topic.id}-${s.id}`}
                    title={s.title}
                    seeAll={exploreHref(topic.id, s.id)}
                    count={s.courses.length}
                  >
                    {[
                      ...s.courses.filter((c) => !c.comingSoon),
                      ...s.courses.filter((c) => c.comingSoon),
                    ].map((course) => (
                      <li key={course.id} className={SHELF_ITEM}>
                        <CourseCard course={course} />
                      </li>
                    ))}
                  </Shelf>
                ))}
              </section>
              <SongShelf
                id="for-you"
                title="Songs for you"
                reason={songsReason(tasteGenres)}
                seeAll={SongRoutes.root()}
                songs={shelves.forYou}
              />
              <SongShelf
                id="popular"
                title="Popular songs"
                seeAll={SongRoutes.root()}
                songs={shelves.popular}
              />

              <SongShelf
                id="easy"
                title="Easy to start"
                reason="Level 1"
                seeAll={SongRoutes.root(undefined, { difficulty: '1' })}
                songs={shelves.easy}
              />
              {shelves.genres.length > 0 && (
                <Shelf
                  id="best-of"
                  title="Best Of"
                  seeAll={SongRoutes.root()}
                  count={shelves.genres.length}
                >
                  {shelves.genres.map((genre, position) => (
                    <li key={genre.slug} className={SHELF_ITEM}>
                      <GenreCard genre={genre} position={position} />
                    </li>
                  ))}
                </Shelf>
              )}
            </>
          )}
        </motion.div>
        <LearnActivityRail />
      </div>
    </GenreOrderContext.Provider>
  );
}
