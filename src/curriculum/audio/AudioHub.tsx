import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeartIcon } from '@/components/icons/HeartIcon';
import { SigilCard } from '@/components/learn/sigil/SigilCard';
import { sigilFor } from '@/components/learn/sigil/sigilSpec';
import { LockedFeatureOverlay } from '@/components/ui/LockedFeatureOverlay';
import { isLearnInstrumentEnabled } from '@/features/learn/useInstrumentStore';
import { useSavedItemsStore } from '@/features/learn/useSavedItemsStore';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';
import { useIsPremium } from '@/hooks/useIsPremium';
import {
  AUDIO_MODULES,
  audioLessonRoute,
  type AudioLesson,
  type AudioModule,
} from './catalog';
import { labPercent } from './lab/audioProgress';

/**
 * Learn → Audio: the section's tiles, a shelf for each module, in the order it
 * teaches them. It isn't tied to an instrument, though a lesson behind a
 * rollout flag only shows once that instrument is on.
 */
export function AudioHub() {
  const { isPremium } = useIsPremium();
  const shelves = useMemo(
    () =>
      AUDIO_MODULES.map((module) => ({
        module,
        lessons: module.lessons.filter(
          (lesson) =>
            lesson.kind !== 'anatomy' ||
            !lesson.instrument ||
            isLearnInstrumentEnabled(lesson.instrument),
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
        {shelves.map(({ module, lessons }) => (
          <section key={module.id} data-audio-module={module.id}>
            <h2 className="mb-4 text-lg text-[var(--color-text)]">
              {module.title}
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
              {lessons.map((lesson) => (
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
