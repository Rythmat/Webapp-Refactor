import { BookOpen, Settings } from 'lucide-react';
import { Fragment, useId, type ReactNode } from 'react';
import { cn } from '@/components/utilities';
import type { HeaderModel } from './types';

// ── Lesson header ──────────────────────────────────────────────────────────
// One eyebrow line (Theory › Guitar · Ionian › ● C major › A1 Major Scale),
// the step's name, and on the right the two ways into more: "About this
// step" (the theory notes, on demand) and the settings gear. The key dot is
// the header's only colour.

/** "A1.1: Major Scale Ascending (Out of Time)" → "Major Scale Ascending". */
export function lessonTitle(activity: string): string {
  return activity
    .replace(/^\s*[A-Z]\d+(?:\.\d+)*[a-z]?:\s*/, '')
    .replace(/\s*\((?:Out of Time|In Time)\)\s*$/i, '')
    .trim();
}

/** "A1: Major Scale" → "A1 Major Scale", as the eyebrow reads it. */
export function eyebrowSubsection(subsection: string): string {
  return subsection.replace(/^([A-Z]\d+):\s*/, '$1 ');
}

export interface GuitarLessonHeaderProps {
  header: HeaderModel;
  /** The step has notes not yet seen (useAboutStepNews). */
  aboutHasNews: boolean;
  aboutOpen: boolean;
  onOpenAbout: () => void;
  settingsOpen: boolean;
  onOpenSettings: () => void;
  /** The guitar input indicator, when it has something to say. */
  inputIndicator?: ReactNode;
}

const iconPill =
  'inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] text-sm font-normal text-[#e8e8f0] transition-colors duration-150 hover:bg-white/[0.08] max-[639px]:h-11';

export function GuitarLessonHeader({
  header,
  aboutHasNews,
  aboutOpen,
  onOpenAbout,
  settingsOpen,
  onOpenSettings,
  inputIndicator,
}: GuitarLessonHeaderProps) {
  const newsId = useId();
  const title = lessonTitle(header.activity);

  return (
    // A grid (guitarLayout.css): the trail over the title, the buttons
    // beside both; on a phone the trail runs the full width and the input
    // indicator takes a row of its own.
    <header data-guitar-header className="shrink-0">
      <nav aria-label="Breadcrumb" data-area="crumbs" className="min-w-0 pr-2">
        <ol
          // Clipped at the column's edge (the subsection gives way first).
          // A phone keeps the mode and the key: Theory and the subsection
          // go (the mode's crumb leads to Theory, the title names the step
          // and the step list its subsection); a longer trail scrolls
          // sideways, its right edge fading to say so. The padding,
          // taken back by the margin, keeps the crumbs' hit areas (36px,
          // 44px on a phone) inside the clip.
          className="-my-2.5 flex min-w-0 items-center gap-2 overflow-hidden py-2.5 text-xs uppercase leading-4 tracking-[0.14em] text-white/45 max-[639px]:-my-3.5 max-[639px]:overflow-x-auto max-[639px]:py-3.5 max-[639px]:pr-6 max-[639px]:[mask-image:linear-gradient(to_right,#000_calc(100%-24px),transparent)] max-[639px]:[scrollbar-width:none] max-[639px]:[&::-webkit-scrollbar]:hidden"
        >
          {header.crumbs.map((crumb, i) => (
            <Fragment key={i}>
              <li
                className={cn(
                  'shrink-0',
                  // A phone starts the trail at the mode: its crumb leads
                  // back to Theory too.
                  i === 0 && header.crumbs.length > 1 && 'max-[639px]:hidden',
                )}
              >
                <button
                  type="button"
                  onClick={crumb.onClick}
                  // A 36px (phone: 44px) hit area without growing the 16px line.
                  className="relative uppercase tracking-[0.14em] transition-colors duration-150 before:absolute before:inset-x-0 before:-inset-y-2.5 hover:text-[#e8e8f0] max-[639px]:before:-inset-y-3.5"
                >
                  {crumb.label}
                </button>
              </li>
              <li
                aria-hidden
                className={cn(
                  'shrink-0',
                  i === 0 && header.crumbs.length > 1 && 'max-[639px]:hidden',
                )}
              >
                ›
              </li>
            </Fragment>
          ))}
          <li className="flex shrink-0 items-center gap-1.5">
            <span
              aria-hidden
              data-guitar-key-dot
              className="size-2 rounded-full"
              style={{ backgroundColor: header.keyColor }}
            />
            {header.keyLabel}
          </li>
          <li aria-hidden className="shrink-0 max-[639px]:hidden">
            ›
          </li>
          <li
            data-crumb-subsection
            className="min-w-0 truncate max-[639px]:hidden"
          >
            {eyebrowSubsection(header.subsection)}
          </li>
        </ol>
      </nav>
      <h1
        data-guitar-title
        data-area="title"
        title={header.activity}
        className="mt-1 min-w-0 truncate pr-2 text-2xl font-normal leading-8 tracking-[-0.01em] text-[#e8e8f0] max-[639px]:line-clamp-2 max-[639px]:whitespace-normal"
      >
        {title}
      </h1>

      <div
        data-area="indicator"
        className="flex empty:hidden max-[639px]:mt-3 max-[639px]:[&>*]:w-full"
      >
        {inputIndicator}
      </div>
      <button
        data-area="about"
        type="button"
        onClick={onOpenAbout}
        aria-haspopup="dialog"
        aria-expanded={aboutOpen}
        aria-describedby={aboutHasNews ? newsId : undefined}
        data-guitar-about
        data-unseen={aboutHasNews || undefined}
        className={`${iconPill} relative px-4 max-[639px]:w-11 max-[639px]:justify-center max-[639px]:px-0`}
      >
        <BookOpen className="size-4 text-white/55" />
        <span className="max-[639px]:sr-only">About this step</span>
        {aboutHasNews && (
          <>
            <span
              aria-hidden
              data-guitar-about-dot
              className="size-1.5 rounded-full bg-[#e8e8f0] max-[639px]:absolute max-[639px]:right-2.5 max-[639px]:top-2.5"
            />
            <span id={newsId} hidden>
              New notes for this step
            </span>
          </>
        )}
      </button>
      <button
        type="button"
        onClick={onOpenSettings}
        aria-label="Lesson settings"
        aria-haspopup="dialog"
        aria-expanded={settingsOpen}
        data-guitar-settings
        data-area="settings"
        className={`${iconPill} w-9 justify-center max-[639px]:w-11`}
      >
        <Settings className="size-4" />
      </button>
    </header>
  );
}
