import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeartIcon } from '@/components/icons/HeartIcon';
import { SigilCard } from '@/components/learn/sigil/SigilCard';
import { sigilFor } from '@/components/learn/sigil/sigilSpec';
import { LockedFeatureOverlay } from '@/components/ui/LockedFeatureOverlay';
import { LearnRoutes } from '@/constants/routes';
import { isLearnInstrumentEnabled } from '@/features/learn/useInstrumentStore';
import { useSavedItemsStore } from '@/features/learn/useSavedItemsStore';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';
import { useIsPremium } from '@/hooks/useIsPremium';
import {
  audioLessonRoute,
  audioShelves,
  courseRows,
  type AudioLesson,
  type AudioModule,
} from './catalog';
import { labPercent, rowPercent } from './lab/audioProgress';

/**
 * Learn → Audio: the section's tiles on their shelves, in the order it teaches
 * them, the course's modules sharing one. It isn't tied to an instrument, though
 * a lesson behind a rollout flag only shows once that instrument is on.
 */
export function AudioHub() {
  const { isPremium } = useIsPremium();
  const shelves = useMemo(
    () =>
      audioShelves().map((shelf) => ({
        title: shelf.title,
        courses: shelf.modules.filter((module) => module.shelf),
        tiles: shelf.modules
          .filter((module) => !module.shelf)
          .flatMap((module) =>
            module.lessons
              .filter(
                (lesson) =>
                  lesson.kind !== 'anatomy' ||
                  !lesson.instrument ||
                  isLearnInstrumentEnabled(lesson.instrument),
              )
              .map((lesson) => ({ module, lesson })),
          ),
      })),
    [],
  );
  return (
    <div
      className="h-full overflow-y-auto px-4 pb-10 pt-2 md:px-8"
      data-audio-hub
    >
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-8">
        {shelves.map(({ title, courses, tiles }) => (
          <section key={title} data-audio-shelf={title}>
            <h2 className="mb-4 text-lg text-[var(--color-text)]">{title}</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
              {courses.map((module) => (
                <CourseTile
                  key={module.id}
                  module={module}
                  locked={module.access === 'premium' && !isPremium}
                />
              ))}
              {tiles.map(({ module, lesson }) => (
                <AudioTile
                  key={lesson.id}
                  module={module}
                  lesson={lesson}
                  locked={module.access === 'premium' && !isPremium}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

/** A course: its one tile opens its page, with its lessons in order. */
function CourseTile({
  module,
  locked,
}: {
  module: AudioModule;
  locked: boolean;
}) {
  const navigate = useNavigate();
  const rows = useMemo(() => courseRows(module), [module]);
  const spec = useMemo(
    () => sigilFor({ ratio: module.lessons[0].ratio }),
    [module],
  );
  const percent = useTutorialProgressStore((s) => {
    const counted = rows.filter(
      (row) => row.kind === 'guided' || row.kind === 'lab',
    );
    const sum = counted.reduce(
      (total, row) => total + rowPercent(s.completedAt, module, row),
      0,
    );
    return Math.round(sum / Math.max(1, counted.length));
  });
  if (!spec) return null;
  const open = () => navigate(LearnRoutes.audioCourse({ module: module.id }));
  return (
    <LockedFeatureOverlay locked={locked} label={module.title}>
      <div className="group flex cursor-pointer flex-col gap-3">
        <SigilCard
          spec={spec}
          label={module.title}
          className="relative"
          data-audio-tile={module.id}
          role="link"
          tabIndex={0}
          aria-label={module.title}
          onClick={open}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              open();
            }
          }}
        >
          <h3 className="pointer-events-none absolute inset-x-4 bottom-3 truncate text-center text-lg text-[var(--color-text)]">
            {module.title}
          </h3>
          {percent > 0 && (
            <span className="pointer-events-none absolute left-3.5 top-3.5 text-xs text-[var(--color-text-dim)]">
              {percent}%
            </span>
          )}
        </SigilCard>
      </div>
    </LockedFeatureOverlay>
  );
}

function AudioTile({
  module,
  lesson,
  locked,
}: {
  module: AudioModule;
  lesson: AudioLesson;
  locked: boolean;
}) {
  const navigate = useNavigate();
  const spec = useMemo(() => sigilFor({ ratio: lesson.ratio }), [lesson.ratio]);
  // Anatomy keeps the hearts it had under Technique, by title.
  const canSave = lesson.kind === 'anatomy';
  const isSaved = useSavedItemsStore((s) =>
    canSave ? Boolean(s.saved[`technique:${lesson.title}`]) : false,
  );
  const toggleSaved = useSavedItemsStore((s) => s.toggleSaved);
  const percent = useTutorialProgressStore((s) =>
    lesson.kind === 'lab' ? labPercent(s.completedAt, module.id, lesson) : 0,
  );
  if (!spec) return null;
  const open = () => navigate(audioLessonRoute(module, lesson));
  return (
    <LockedFeatureOverlay locked={locked} label={lesson.title}>
      <div className="group flex cursor-pointer flex-col gap-3">
        <SigilCard
          spec={spec}
          label={lesson.title}
          className="relative"
          data-audio-tile={lesson.id}
          role="link"
          tabIndex={0}
          aria-label={lesson.title}
          onClick={open}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              open();
            }
          }}
        >
          <h3 className="pointer-events-none absolute inset-x-4 bottom-3 truncate text-center text-lg text-[var(--color-text)]">
            {lesson.title}
          </h3>
          {canSave && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                toggleSaved('technique', lesson.title);
              }}
              onKeyDown={(event) => event.stopPropagation()}
              aria-label={
                isSaved
                  ? `Remove ${lesson.title} from saved`
                  : `Save ${lesson.title}`
              }
              aria-pressed={isSaved}
              className="absolute right-2.5 top-2.5 z-10 rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <HeartIcon
                size={16}
                filled={isSaved}
                style={isSaved ? { color: '#ffffff' } : undefined}
              />
            </button>
          )}
          {percent > 0 && (
            <span className="pointer-events-none absolute left-3.5 top-3.5 text-xs text-[var(--color-text-dim)]">
              {percent}%
            </span>
          )}
        </SigilCard>
      </div>
    </LockedFeatureOverlay>
  );
}
