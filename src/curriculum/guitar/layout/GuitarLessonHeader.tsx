import { Fragment, type ReactNode } from 'react';
import { ChordNameSwitch } from '@/components/notation/ChordNameSwitch';
import type { HeaderModel } from './types';

// ── Lesson header ──────────────────────────────────────────────────────────
// The lesson's key and scale as its title ("C Lydian"), over it where you
// are in it ("Overview: Scale", "Melody: Ascend • Hold"; owner, 2026-10-26:
// the trail went, the lesson rail leads back). About this step and the
// lesson's settings are on the tool rail at the right (LessonToolRail).

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
  /** The guitar input indicator, when it has something to say. */
  inputIndicator?: ReactNode;
  /** Beside the title: piano's chord progression for the step (the chord
   *  name switch follows it when the step writes chord names). */
  titleAside?: ReactNode;
  /** The section the step is in ("Overview", "Melody"), before its name;
   *  without one, the subsection is. */
  section?: string;
}

export function GuitarLessonHeader({
  header,
  inputIndicator,
  titleAside,
  section,
}: GuitarLessonHeaderProps) {
  const step = lessonTitle(header.activity);
  // Where the step is: its section, or without sections its subsection
  // (Music Literacy's module).
  const where =
    section || (header.subsection ? eyebrowSubsection(header.subsection) : '');

  const aside =
    titleAside || header.chordNames ? (
      <>
        {titleAside}
        {header.chordNames && <ChordNameSwitch />}
      </>
    ) : null;

  return (
    // A grid (guitarLayout.css): the subtitle over the title, the buttons
    // beside both; on a phone the subtitle runs the full width and the
    // input indicator takes a row of its own.
    <header data-guitar-header className="shrink-0">
      <p
        data-area="subtitle"
        data-guitar-subtitle
        title={header.activity}
        className="min-w-0 truncate pr-2 text-sm leading-5 text-white/55"
      >
        {where && <span data-subtitle-where>{where}: </span>}
        <span data-subtitle-step>{step}</span>
      </p>
      {aside ? (
        <div
          data-area="title"
          className="mt-1 flex min-w-0 items-baseline gap-x-4 pr-2 max-[639px]:flex-wrap"
        >
          <h1
            data-guitar-title
            className="min-w-0 truncate text-2xl font-normal leading-8 tracking-[-0.01em] text-[#e8e8f0] max-[639px]:line-clamp-2 max-[639px]:whitespace-normal"
          >
            {header.keyLabel}
          </h1>
          <div className="flex min-w-0 shrink-0 items-center gap-3 [&>span]:truncate">
            {aside}
          </div>
        </div>
      ) : (
        <h1
          data-guitar-title
          data-area="title"
          className="mt-1 min-w-0 truncate pr-2 text-2xl font-normal leading-8 tracking-[-0.01em] text-[#e8e8f0] max-[639px]:line-clamp-2 max-[639px]:whitespace-normal"
        >
          {header.keyLabel}
        </h1>
      )}

      <div
        data-area="indicator"
        className="flex empty:hidden max-[639px]:mt-3 max-[639px]:[&>*]:w-full"
      >
        {inputIndicator}
      </div>
    </header>
  );
}
