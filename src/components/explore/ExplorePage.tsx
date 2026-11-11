import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { microLabel } from '@/components/kit/MicroLabel';
import { CAPTION } from '@/components/kit/libraryLook';
import { WHITE_PILL } from '@/components/kit/pills';
import { GENRE_OPTIONS } from '@/components/songLibrary/SongLibraryPage';
import { cn } from '@/components/utilities';
import { getAllSongs } from '@/curriculum/data/songs';
import { genreRows } from '@/features/explore/exploreShelves';
import {
  exploreHref,
  parseLearnHash,
  topicOfWord,
  topicWord,
} from '@/features/learn/catalog/exploreState';
import {
  type CatalogCourse,
  type CatalogSection,
  type CatalogTopic,
} from '@/features/learn/catalog/learnCatalog';
import { useLearnCatalog } from '@/features/learn/catalog/useLearnCatalog';
import { useGenreReadiness } from '@/features/learn/genreReadiness';
import {
  useInstrumentStore,
  useLearnChoice,
} from '@/features/learn/useInstrumentStore';
import { ChoicePills } from '../learn/LearnPromptPills';
import { CourseCard } from '../learn/explore/CourseCard';
import { GenreOrderContext } from '../learn/sigil/genreOrder';
import { EXPLORE_COLUMN, ExploreNavBar, LearnGrid } from './ExploreChrome';
import { FIT_ITEM, Shelf } from './Shelf';

// ── /learn: the courses, in Suno's layout (owner, 2026-11-04) ──────────────
// The Arcade's head across the top, its words the instruments; then
// shelves: that instrument's courses a section to a shelf. The songs have
// their own page, /songs (owner, 2026-11-11). The address holds the rest,
// so a teacher can share it: `?i=&c=` opens a section's courses whole
// (where every "See all" and lesson's way back lands); `?q=` (a link from
// the app's search) finds courses.

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
            <p className="max-w-[40rem] text-[0.875rem] leading-5 text-white/50">
              {section.blurb}
            </p>
          )}
        </div>
        <span className={CAPTION}>
          {open.length} {open.length === 1 ? 'course' : 'courses'}
        </span>
      </header>
      <LearnGrid>
        {open.map((course) => (
          <li key={course.id}>
            <CourseCard course={course} />
          </li>
        ))}
      </LearnGrid>
      {soon.length > 0 && (
        <div className="mt-2 flex flex-col gap-3">
          <span className={CAPTION}>Coming soon</span>
          <LearnGrid>
            {soon.map((course) => (
              <li key={course.id}>
                <CourseCard course={course} />
              </li>
            ))}
          </LearnGrid>
        </div>
      )}
    </section>
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

  const results = useMemo(() => {
    const terms = words(q);
    if (!terms.length) return null;
    const ordered = [topic, ...topics.filter((t) => t.id !== topic.id)];
    return ordered.flatMap((t) =>
      t.sections.flatMap((s) =>
        s.courses
          .filter((course) => courseMatches(course, t, terms))
          .map((course) => ({ course, topic: t, section: s })),
      ),
    );
  }, [q, topic, topics]);

  // The Best Of row's order, on /songs now: a genre course's sigil still
  // takes its tile's colours (owner, 2026-11-05).
  const genreOrder = useMemo(
    () => genreRows(songs, GENRE_OPTIONS).map((genre) => genre.slug),
    [songs],
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
              <p className="text-[0.875rem] text-white/50">
                {results.length
                  ? `${results.length} ${results.length === 1 ? 'course' : 'courses'} for “${q}”`
                  : `Nothing matches “${q}”.`}
              </p>
              {results.length > 0 && (
                <LearnGrid>
                  {results.map(({ course, topic: t, section: s }) => (
                    <li key={course.id}>
                      <CourseCard
                        course={course}
                        eyebrow={microLabel(t.title, s.title)}
                      />
                    </li>
                  ))}
                </LearnGrid>
              )}
              {!results.length && (
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
            <section
              aria-label={`${topic.title} courses`}
              data-explore-courses={topic.id}
              className="flex flex-col gap-10"
            >
              {topic.sections.map((s) => (
                <Shelf
                  fit
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
                    <li key={course.id} className={FIT_ITEM}>
                      <CourseCard course={course} />
                    </li>
                  ))}
                </Shelf>
              ))}
            </section>
          )}
        </motion.div>
      </div>
    </GenreOrderContext.Provider>
  );
}
