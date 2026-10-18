import { useRef, useState, type ReactNode, type RefObject } from 'react';
import { cn } from '@/components/utilities';
import {
  GuitarActionBar,
  type GuitarActionBarProps,
} from '@/curriculum/guitar/layout/GuitarActionBar';
import { GuitarLessonHeader } from '@/curriculum/guitar/layout/GuitarLessonHeader';
import { GuitarStepNav } from '@/curriculum/guitar/layout/GuitarStepNav';
import { TempoStepper } from '@/curriculum/guitar/layout/TempoStepper';
import { SettingsSection } from '@/curriculum/guitar/layout/settingsControls';
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
import { useElementSize } from '@/hooks/useElementSize';
import {
  LiteracyGrooveSettings,
  type LiteracyGrooveSettingsProps,
} from './LiteracyGrooveSettings';
import '@/curriculum/guitar/layout/guitarLayout.css';

// ── The Music Literacy lesson screen ───────────────────────────────────────
// The house lesson chrome (the guitar and piano screens' header, step pager,
// settings and About sheets, and the pinned action bar) around two panels,
// as the landing page's Theory scene sets them side by side:
//
//   call      the circle of fifths with the Simon-like hub, the words under it
//   response  the roll / staff / falling notes (the result takes its place),
//             the 25-key keyboard always under it
//
// One page: the column never scrolls the page on a desktop, the roll takes
// what the keyboard leaves. Narrower than STACK_BELOW the panels stack (the
// call a short row over the response); on a phone the column scrolls.
// MusicLiteracyPlayer keeps every hook and handler; this draws what it hands
// over and owns only which sheet is open.

/** Panels side by side need this much width (px), else they stack. */
const STACK_BELOW = 880;

export interface MusicLiteracyLayoutProps {
  header: HeaderModel;
  nav: StepNavModel;
  bar: GuitarActionBarProps;
  about: PianoAboutModel;
  audio: { outputLatencyMs: number; openAudioTiming: () => void };
  tempo: { bpm: number; onChange: (bpm: number) => void };
  /** Settings → Play along: the drum groove. */
  groove: LiteracyGrooveSettingsProps;
  /** Said once when a result arrives. */
  announcement: string;
  /** Over the step pager: a module's round, while the student plays it. */
  banner?: ReactNode;
  slots: {
    /**
     * In place of both panels (Part 2's choose steps, and a step waiting
     * for a choice); null for the call and the response.
     */
    full?: ((stacked: boolean) => ReactNode) | null;
    /** The call panel; `stacked`: draw its compact row. */
    call: (stacked: boolean) => ReactNode;
    /** The response panel, measured by the player (the keyboard's room). */
    responseRef: RefObject<HTMLElement>;
    /** The roll's box, measured by the player; never remount it. */
    rollRef: RefObject<HTMLDivElement>;
    roll: ReactNode;
    /** In the roll's place after a take. */
    result: ReactNode | null;
    keyboard: ReactNode;
  };
}

export function MusicLiteracyLayout({
  header,
  nav,
  bar,
  about,
  audio,
  tempo,
  groove,
  announcement,
  banner,
  slots,
}: MusicLiteracyLayoutProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const panelsRef = useRef<HTMLDivElement>(null);
  const panels = useElementSize(panelsRef);
  const stacked = panels.width > 0 && panels.width < STACK_BELOW;

  useGuitarStepKeys({
    enabled: bar.state === 'preview' && !settingsOpen && !aboutOpen,
    index: nav.index,
    count: nav.steps.length,
    goToStep: nav.goToStep,
  });

  return (
    <div
      data-piano-layout
      data-literacy-layout
      data-bar-state={bar.state}
      className="flex h-full min-h-0 flex-col bg-[#101012] text-[#e8e8f0]"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <div
          data-literacy-column
          className="mx-auto flex min-h-0 w-full max-w-[1280px] flex-auto flex-col gap-4 px-6 pb-4 pt-5 max-[639px]:flex-[1_0_auto] max-[639px]:px-4"
        >
          <GuitarLessonHeader
            header={header}
            aboutHasNews={false}
            aboutOpen={aboutOpen}
            onOpenAbout={() => setAboutOpen(true)}
            settingsOpen={settingsOpen}
            onOpenSettings={() => setSettingsOpen((open) => !open)}
          />
          {banner}
          <GuitarStepNav nav={nav} keyColor={header.keyColor} />

          {/* The panels stay mounted (and measured) under a full-width
              screen, so the roll and keyboard keep their sizes. */}
          <div
            ref={panelsRef}
            data-literacy-stage
            className="flex min-h-0 flex-1 flex-col max-[639px]:flex-none"
          >
            {slots.full && (
              <div
                data-literacy-full
                data-stacked={stacked || undefined}
                className="flex min-h-0 flex-1 flex-col"
              >
                {slots.full(stacked)}
              </div>
            )}
            <div
              data-literacy-panels
              data-stacked={stacked || undefined}
              className={cn(
                'min-h-0 flex-1 gap-4',
                slots.full ? 'hidden' : 'grid',
                stacked
                  ? 'grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] max-[639px]:flex-none max-[639px]:grid-rows-[auto_auto]'
                  : 'grid-cols-[minmax(0,5fr)_minmax(0,7fr)] grid-rows-[minmax(0,1fr)]',
              )}
            >
              {slots.call(stacked)}
              <section
                ref={slots.responseRef}
                aria-label="Your answer"
                data-literacy-response
                className="flex min-h-0 min-w-0 flex-col gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3"
              >
                <div
                  data-literacy-roll-slot
                  className="grid min-h-[140px] flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] max-[639px]:h-[300px] max-[639px]:flex-none"
                >
                  {/* Kept mounted (and measured) under the result: no display
                    utility here, it would beat [hidden]. */}
                  <div
                    ref={slots.rollRef}
                    hidden={slots.result !== null}
                    data-literacy-roll
                    className="relative h-full min-h-0 overflow-hidden rounded-lg"
                  >
                    {slots.roll}
                  </div>
                  {slots.result}
                </div>
                <div data-literacy-keyboard className="shrink-0">
                  {slots.keyboard}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      <div
        aria-live="polite"
        aria-atomic="true"
        data-literacy-announcer
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
      >
        {/* Divided from Sound as the guitar sheet divides its groups. */}
        <SettingsSection
          label="Tempo"
          className="mb-5 border-b border-white/[0.08] pb-5"
        >
          <div className="flex min-h-[52px] items-center justify-between gap-4 py-2">
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm leading-5 text-[#e8e8f0]">Speed</span>
              <span className="text-xs leading-4 text-white/55">
                The step’s whole run, call and answer.
              </span>
            </span>
            <TempoStepper bpm={tempo.bpm} onChange={tempo.onChange} />
          </div>
        </SettingsSection>
        <LiteracyGrooveSettings {...groove} />
      </PianoSettingsSheet>
      <PianoAboutStepSheet
        open={aboutOpen}
        onOpenChange={setAboutOpen}
        about={about}
      />
    </div>
  );
}
