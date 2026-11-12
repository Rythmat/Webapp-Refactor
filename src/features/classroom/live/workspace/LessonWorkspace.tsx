import { Presentation } from 'lucide-react';
import type { ReactNode } from 'react';
import { AppIcons } from '@/components/icons/appIcons';
import { LESSON_FRAME_NAME } from '@/layouts/DashboardLayout/lessonFrame';
import { pickLocalized } from '../../presentation/localized';
import { resolveModuleUrl } from '../../presentation/resolveModuleUrl';
import { useTeacherConfig } from '../../settings/useTeacherConfig';
import {
  PROJECT_PLACES,
  type ProjectPlace,
  type ProjectPlaceId,
} from '../../slides/projectPlaces';
import type { StudentLanguage } from '../../types';

// ── The lesson's workspace (owner, 2026-11-11) ─────────────────────────────
// Where a student works in the Individual Project: their own Learn, Songs,
// Library, Studio or Globe, opened inside the lesson page instead of a new
// tab, so the lesson (and its connection to the class) keeps running around
// it. The teacher's later slides (share your work, the closing questions)
// come to the student here, in a sheet over their work: they never have to
// find their way back.
//
// Each place opened stays mounted while another is shown, so a Studio
// session or a lesson half done is just as the student left it. The pages
// in the frames drop the app's own frame (layouts/DashboardLayout/
// lessonFrame): this bar is theirs.

interface LessonWorkspaceProps {
  /** The places opened this class, in the order they were. */
  opened: readonly ProjectPlaceId[];
  shown: ProjectPlaceId;
  onShow: (place: ProjectPlace) => void;
  /** Show the teacher's slide over the work. */
  onSlides: () => void;
  /** The lesson's name. */
  title: string;
  language: StudentLanguage;
  /** Where the teacher is, when it isn't asking anything. */
  status?: ReactNode;
  /** The class timer and the connection, from the lesson page. */
  meta?: ReactNode;
  /** The teacher's slide, over the work; null when set aside. */
  sheet?: ReactNode;
  /** Set the sheet aside: back to the work. */
  onCloseSheet: () => void;
}

/**
 * Whether the teacher's slide is over the student's work: when they asked
 * for it (the bar's Slides), when the class has ended, or when the slide
 * asks something (share your work, the closing questions) and they haven't
 * set that slide aside.
 */
export const lessonSheetOpen = ({
  pinned,
  ended,
  asks,
  slideId,
  setAside,
}: {
  pinned: boolean;
  ended: boolean;
  asks: boolean;
  slideId: string | null;
  setAside: string | null;
}): boolean => pinned || ended || (asks && setAside !== slideId);

const placeOf = (id: ProjectPlaceId): ProjectPlace =>
  PROJECT_PLACES.find((p) => p.id === id) ?? PROJECT_PLACES[0];

export const LessonWorkspace = ({
  opened,
  shown,
  onShow,
  onSlides,
  title,
  language,
  status,
  meta,
  sheet,
  onCloseSheet,
}: LessonWorkspaceProps) => {
  const { config } = useTeacherConfig();
  const srcOf = (place: ProjectPlace) =>
    resolveModuleUrl(
      { id: place.id, module: place.module, activityRef: place.ref },
      config.moduleUrls,
    ) ?? '/';

  return (
    <div
      data-lesson-workspace=""
      className="fixed inset-0 z-[60] flex flex-col bg-[#0b0b0d] text-white"
    >
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-white/[0.06] px-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="truncate text-[0.875rem] text-white/80">
            {title}
          </span>
          {status}
        </div>
        <nav
          aria-label="Places"
          className="flex items-center gap-0.5 rounded-full bg-white/[0.04] p-0.5"
        >
          {PROJECT_PLACES.map((place) => {
            const Icon = AppIcons[place.id];
            const on = place.id === shown;
            const name = pickLocalized(place.label, language);
            return (
              <button
                key={place.id}
                type="button"
                onClick={() => onShow(place)}
                aria-pressed={on}
                aria-label={name}
                title={name}
                className={`inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[0.8125rem] transition-colors ${
                  on
                    ? 'bg-white text-black'
                    : 'text-white/60 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <Icon className="size-4" aria-hidden />
                <span className="hidden md:inline">{name}</span>
              </button>
            );
          })}
        </nav>
        <div className="flex flex-1 items-center justify-end gap-2">
          {meta}
          <button
            type="button"
            onClick={onSlides}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 px-3 text-[0.8125rem] text-white/80 hover:border-white/25 hover:text-white"
          >
            <Presentation className="size-4" aria-hidden />
            Slides
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        {opened.map((id) => {
          const place = placeOf(id);
          const visible = id === shown;
          return (
            <iframe
              key={id}
              name={LESSON_FRAME_NAME}
              title={pickLocalized(place.label, language)}
              src={srcOf(place)}
              allow="autoplay; microphone; midi; fullscreen; clipboard-write"
              data-place={id}
              aria-hidden={!visible}
              tabIndex={visible ? undefined : -1}
              // Hidden, never unmounted: the work in it stays as it was.
              className={`absolute inset-0 size-full border-0 bg-[#0b0b0d] ${
                visible ? '' : 'pointer-events-none invisible'
              }`}
            />
          );
        })}

        {sheet ? (
          <div className="absolute inset-0 flex flex-col justify-end bg-black/55">
            <section
              role="dialog"
              aria-label="Your teacher's slide"
              data-lesson-sheet=""
              className="max-h-[92%] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-[#121214] px-4 pb-6 pt-3 shadow-2xl md:px-6"
            >
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={onCloseSheet}
                  className="inline-flex h-8 items-center rounded-full bg-white px-3 text-[0.8125rem] text-black hover:bg-white/85"
                >
                  Back to my work
                </button>
              </div>
              {sheet}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
};
