import { useState, type ReactNode, type RefObject } from 'react';
import {
  GuitarActionBar,
  type Zones,
} from '@/curriculum/guitar/layout/GuitarActionBar';
import { GuitarLessonHeader } from '@/curriculum/guitar/layout/GuitarLessonHeader';
import {
  GuitarResultPanel,
  resultSummary,
} from '@/curriculum/guitar/layout/GuitarResultPanel';
import { GuitarSectionCompletePanel } from '@/curriculum/guitar/layout/GuitarSectionCompletePanel';
import { GuitarStepNav } from '@/curriculum/guitar/layout/GuitarStepNav';
import { LessonFrame } from '@/curriculum/guitar/layout/LessonFrame';
import { deriveBarState } from '@/curriculum/guitar/layout/deriveBarState';
import type {
  HeaderModel,
  ResultModel,
  RunModel,
  SectionCompleteModel,
  StepNavModel,
  TempoModel,
} from '@/curriculum/guitar/layout/types';
import { useGuitarStepKeys } from '@/curriculum/guitar/layout/useGuitarStepKeys';
import {
  PianoAboutStepSheet,
  type PianoAboutModel,
} from './PianoAboutStepSheet';
import { PianoSettingsSheet } from './PianoSettingsSheet';
import '@/curriculum/guitar/layout/guitarLayout.css';
import './pianoLayout.css';

// ── The piano lesson screen ────────────────────────────────────────────────
// Guitar's screen, with the keyboard: one page, no start card. Presentational
// like GuitarLessonLayout: GenreLessonContainerV2 keeps every hook, timer and
// handler and hands this values and callbacks. It owns only which sheet is
// open.
//
//   header    eyebrow crumbs, the step's name and chords, About, settings
//   nav       sections, ♪ Practice Track, ‹ 3 / 20 ›, the progress line
//             (or, with the lesson's tab row, just the narrow-screen sections)
//   subNav    the tab row: the Overview's tabs, or a section's exercise
//             groups and its Practice Track (as Theory's)
//   overview  the lesson's Overview, in place of the roll and keyboard
//   roll      the piano roll / notation / cascade, taking what's left; the
//             result or the section-complete offer take its place
//   keyboard  the full-width lesson keyboard with the target notes
//   bar       pinned at the bottom, centred under the keyboard
//             (GuitarActionBar 'centered'): Demo / Practice / Play Now, big,
//             then Back / Perform, Stop, the result's Try Again / Next, the
//             section's offer. The instruction is in About this step.

export interface PianoLessonLayoutProps {
  header: HeaderModel;
  /** Beside the title: the step's chords, written for display. */
  chords: string[];
  nav: StepNavModel;
  run: RunModel;
  /** In-time steps only. */
  tempo: TempoModel | null;
  /** Set once a take is scored. */
  result: ResultModel | null;
  /** The section-complete offer (wins over the result). */
  offer: SectionCompleteModel | null;
  about: PianoAboutModel;
  audio: { outputLatencyMs: number; openAudioTiming: () => void };
  /** The tab row under the nav (Theory's): left out, none. */
  subNav?: ReactNode;
  /**
   * The lesson's Overview: set, it takes the roll's and keyboard's place
   * (it docks its own keyboard on the bar) and `barCustom` the bar's.
   */
  overview?: ReactNode;
  /** The bar's words and buttons instead of its state's own. */
  barCustom?: Zones | null;
  slots: {
    /** The roll's box: the container measures it; never remount it. */
    rollViewportRef: RefObject<HTMLDivElement>;
    roll: ReactNode;
    keyboard: ReactNode;
  };
}

export function PianoLessonLayout({
  header,
  chords,
  nav,
  run,
  tempo,
  result,
  offer,
  about,
  audio,
  subNav,
  overview,
  barCustom,
  slots,
}: PianoLessonLayoutProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const barState = deriveBarState({
    state: run.state,
    restartingPass: run.restartingPass,
    hasResult: result !== null,
    hasOffer: offer !== null,
  });

  useGuitarStepKeys({
    enabled: barState === 'preview' && !overview && !settingsOpen && !aboutOpen,
    index: nav.index,
    count: nav.steps.length,
    goToStep: nav.goToStep,
  });

  const announcement =
    barState === 'sectionComplete' && offer
      ? offer.heading
      : barState === 'result' && result
        ? resultSummary(result, run.listen.passMarkPct)
        : '';

  const slotTakenBy = overview ? (
    <div data-piano-overview>{overview}</div>
  ) : barState === 'result' && result ? (
    <GuitarResultPanel result={result} passMarkPct={run.listen.passMarkPct} />
  ) : barState === 'sectionComplete' && offer ? (
    <GuitarSectionCompletePanel offer={offer} />
  ) : null;

  return (
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
      data-bar-state={barState}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <div
          data-piano-column
          className="mx-auto flex min-h-0 w-full max-w-[1184px] flex-auto flex-col gap-4 px-6 pb-4 pt-5 max-[639px]:flex-[1_0_auto] max-[639px]:px-4"
        >
          <GuitarLessonHeader
            header={header}
            section={nav.sections.find((s) => s.active)?.name}
            titleAside={
              chords.length > 0 ? (
                <span
                  data-piano-chords
                  className="text-sm font-normal"
                  style={{ color: header.keyColor }}
                >
                  {chords.join(' → ')}
                </span>
              ) : undefined
            }
          />

          <GuitarStepNav nav={nav} keyColor={header.keyColor} />
          {subNav}

          <div data-piano-roll-slot className="min-w-0">
            {/* Kept mounted (and measured) under the result: no display
                utility here, it would beat [hidden]. */}
            <div
              ref={slots.rollViewportRef}
              hidden={slotTakenBy !== null}
              data-piano-roll
              className="relative h-full min-h-0 overflow-y-auto overflow-x-hidden rounded-xl"
            >
              {slots.roll}
            </div>
            {slotTakenBy}
          </div>

          {!overview && (
            <div data-piano-keyboard className="shrink-0">
              {slots.keyboard}
            </div>
          )}
        </div>
      </div>

      <div
        aria-live="polite"
        aria-atomic="true"
        data-piano-announcer
        className="sr-only"
      >
        {announcement}
      </div>

      <GuitarActionBar
        variant="centered"
        state={barState}
        run={run}
        tempo={tempo}
        practice={{ presets: [] }}
        result={result}
        offer={offer}
        custom={barCustom}
      />

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
