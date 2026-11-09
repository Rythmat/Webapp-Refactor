import { useId, useState, type ReactNode } from 'react';
import {
  PROMPT_FRAME,
  PROMPT_WASH,
} from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';
import {
  GuitarActionBar,
  type GuitarActionBarProps,
} from '@/curriculum/guitar/layout/GuitarActionBar';
import { GuitarLessonHeader } from '@/curriculum/guitar/layout/GuitarLessonHeader';
import { GuitarStepNav } from '@/curriculum/guitar/layout/GuitarStepNav';
import { LessonFrame } from '@/curriculum/guitar/layout/LessonFrame';
import type {
  HeaderModel,
  StepNavModel,
} from '@/curriculum/guitar/layout/types';
import { useGuitarStepKeys } from '@/curriculum/guitar/layout/useGuitarStepKeys';
import {
  PianoAboutStepSheet,
  type PianoAboutModel,
} from '@/curriculum/piano/layout/PianoAboutStepSheet';
import { PianoSettingsSheet } from '@/curriculum/piano/layout/PianoSettingsSheet';
import '@/curriculum/guitar/layout/guitarLayout.css';

// ── The Theory lesson screen ───────────────────────────────────────────────
// Piano Theory (Learn → Theory, ActivityFlow) on the guitar and Genre
// screens' frame: one page, no start card. ActivityFlow keeps every hook and
// handler; this draws what it hands over.
//
//   header    Theory › Ionian › ● C Ionian › Melody, the step's name,
//             About this step, settings
//   nav       Overview / Melody / Chords, ♪ Practice Track, the view switch,
//             ‹ 3 / 12 › (the step list)
//   subNav    Overview's Scale / Triads / 7th Chords / Inversions
//   content   the activity: its roll and keyboard, the step's notes lit
//   panel     a result or the section's offer, in the activity's place
//   bar       pinned at the bottom (GuitarActionBar)

export interface TheoryLessonLayoutProps {
  header: HeaderModel;
  nav: StepNavModel;
  subNav?: ReactNode;
  content: ReactNode;
  /** In the activity's place: a result, or the end of a section. */
  panel?: ReactNode;
  bar: GuitarActionBarProps;
  about: PianoAboutModel;
  audio: { outputLatencyMs: number; openAudioTiming: () => void };
  /** Said once when a result or offer arrives. */
  announcement: string;
}

export function TheoryLessonLayout({
  header,
  nav,
  subNav,
  content,
  panel,
  bar,
  about,
  audio,
  announcement,
}: TheoryLessonLayoutProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  useGuitarStepKeys({
    enabled: bar.state === 'preview' && !settingsOpen && !aboutOpen,
    index: nav.index,
    count: nav.steps.length,
    goToStep: nav.goToStep,
  });

  return (
    // In the lesson frame (rail, glow), as every lesson: the column scrolls
    // in its own box, the bar pinned under it.
    <LessonFrame
      header={header}
      nav={nav}
      tools={{
        about: {
          open: aboutOpen,
          onToggle: () => setAboutOpen(!aboutOpen),
        },
        // Settings is not modal, so its button stays in reach and toggles.
        settings: {
          open: settingsOpen,
          onToggle: () => setSettingsOpen(!settingsOpen),
        },
      }}
      data-piano-layout
      data-theory-layout
      data-bar-state={bar.state}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <div
          data-theory-column
          className="mx-auto flex w-full max-w-[1184px] flex-auto flex-col gap-4 px-6 pb-4 pt-5 max-[639px]:px-4"
        >
          <GuitarLessonHeader
            header={header}
            section={nav.sections.find((s) => s.active)?.name}
          />
          <GuitarStepNav nav={nav} keyColor={header.keyColor} />
          {subNav}
          {/* Kept mounted under a result: Restart and Try Again remount it
            themselves, by key. */}
          <div data-theory-content hidden={!!panel} className="min-w-0">
            {content}
          </div>
          {panel}
        </div>
      </div>

      <div
        aria-live="polite"
        aria-atomic="true"
        data-theory-announcer
        className="sr-only"
      >
        {announcement}
      </div>

      <GuitarActionBar {...bar} variant="centered" />

      <PianoSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        outputLatencyMs={audio.outputLatencyMs}
        openAudioTiming={audio.openAudioTiming}
      />
      <PianoAboutStepSheet
        open={aboutOpen}
        onOpenChange={setAboutOpen}
        about={about}
      />
    </LessonFrame>
  );
}

// ── Result ─────────────────────────────────────────────────────────────────

export interface TheoryResultPanelProps {
  /** "100%", "Great job!", "Not quite yet", "Nice practicing!". */
  heading: string;
  /** "Passed", "Not yet · 80% passes"; null for practice. */
  status: string | null;
  lines: string[];
  /** What the step taught, from activityPayoff. */
  payoff?: {
    headline: string;
    detail?: string | null;
    fromSong?: string | null;
  } | null;
}

/** Where a Theory step ends: in the activity's place, the buttons in the bar. */
export function TheoryResultPanel({
  heading,
  status,
  lines,
  payoff,
}: TheoryResultPanelProps) {
  const headingId = useId();
  const isScore = /^\d+%$/.test(heading);
  return (
    <section
      aria-labelledby={headingId}
      data-theory-result
      // The prompt box's card, as Home's and Learn's.
      className={cn(
        PROMPT_FRAME,
        PROMPT_WASH,
        'flex min-h-[240px] flex-col justify-center gap-3 p-6',
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2
          id={headingId}
          className={
            isScore
              ? 'text-5xl font-normal leading-[3.25rem] text-[#e8e8f0]'
              : 'text-2xl font-normal leading-8 text-[#e8e8f0]'
          }
        >
          {heading}
        </h2>
        {status && <p className="text-[15px] text-white/55">{status}</p>}
      </div>
      {lines.map((line) => (
        <p key={line} className="text-[15px] leading-6 text-white/55">
          {line}
        </p>
      ))}
      {payoff && (
        <div className="mt-1 flex max-w-xl flex-col gap-1">
          <p className="text-base text-[#e8e8f0]">{payoff.headline}</p>
          {payoff.detail && (
            <p className="text-sm leading-6 text-white/55">{payoff.detail}</p>
          )}
          {payoff.fromSong && (
            <p className="text-sm leading-6 text-white/70">{payoff.fromSong}</p>
          )}
        </div>
      )}
    </section>
  );
}
