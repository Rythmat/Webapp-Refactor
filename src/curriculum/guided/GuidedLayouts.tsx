import { useState } from 'react';
import type { TheoryLessonLayoutProps } from '@/components/Games/TheoryLessonLayout';
import { GuitarAboutStepSheet } from '@/curriculum/guitar/layout/GuitarAboutStepSheet';
import { GuitarInputIndicator } from '@/curriculum/guitar/layout/GuitarInputIndicator';
import {
  GuitarSettingsSheet,
  VolumeRow,
  type SettingsGroup,
} from '@/curriculum/guitar/layout/GuitarSettingsSheet';
import { LessonFrame } from '@/curriculum/guitar/layout/LessonFrame';
import { deriveBarState } from '@/curriculum/guitar/layout/deriveBarState';
import type { GuitarLessonLayoutProps } from '@/curriculum/guitar/layout/types';
import { PianoAboutStepSheet } from '@/curriculum/piano/layout/PianoAboutStepSheet';
import type { PianoLessonLayoutProps } from '@/curriculum/piano/layout/PianoLessonLayout';
import { PianoSettingsSheet } from '@/curriculum/piano/layout/PianoSettingsSheet';
import { GuidedPlayer, type GuidedBinding } from './GuidedPlayer';
import '@/curriculum/guitar/layout/guitarLayout.css';
import '@/curriculum/piano/layout/pianoLayout.css';

// ── The guided screen, on each instrument ──────────────────────────────────
// The third layout beside the piano and fretted ones, on the same models, so that
// the engines hand over exactly what they already do. Each keeps its own stage,
// tool rail and sheets; what changes is everything round them.

const useSheets = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  return { settingsOpen, setSettingsOpen, aboutOpen, setAboutOpen };
};

export function GuidedPianoLayout({
  guided,
  header,
  nav,
  run,
  tempo,
  about,
  audio,
  slots,
}: PianoLessonLayoutProps & { guided: GuidedBinding }) {
  const { settingsOpen, setSettingsOpen, aboutOpen, setAboutOpen } =
    useSheets();
  const state = deriveBarState({
    state: run.state,
    restartingPass: run.restartingPass,
    hasResult: false,
    hasOffer: false,
  });
  return (
    <LessonFrame
      guided
      header={header}
      nav={nav}
      tools={{
        about: { open: aboutOpen, onToggle: () => setAboutOpen(!aboutOpen) },
        settings: {
          open: settingsOpen,
          onToggle: () => setSettingsOpen(!settingsOpen),
        },
      }}
      data-piano-layout
      data-bar-state={state}
    >
      <GuidedPlayer
        key={guided.chapter.id}
        binding={guided}
        volume={<VolumeRow />}
        paused={settingsOpen || aboutOpen}
        bar={{
          state,
          run,
          tempo,
          practice: { presets: [] },
          result: null,
          offer: null,
          variant: 'centered',
        }}
        stage={
          <>
            <div data-piano-roll-slot className="min-w-0 flex-1">
              <div
                ref={slots.rollViewportRef}
                data-piano-roll
                className="relative h-full min-h-0 overflow-y-auto overflow-x-hidden rounded-xl"
              >
                {slots.roll}
              </div>
            </div>
            {/* Renders into the slot on the foot, over the buttons. */}
            <div data-piano-keyboard className="shrink-0">
              {slots.keyboard}
            </div>
          </>
        }
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

export function GuidedGuitarLayout({
  guided,
  header,
  nav,
  run,
  tempo,
  practice,
  input,
  theory,
  slots,
  overview,
}: GuitarLessonLayoutProps & { guided: GuidedBinding }) {
  const { settingsOpen, setSettingsOpen, aboutOpen, setAboutOpen } =
    useSheets();
  const [settingsFocus, setSettingsFocus] = useState<SettingsGroup>();
  const openSettings = (group?: SettingsGroup) => {
    setSettingsFocus(group);
    setSettingsOpen(true);
  };
  const state = deriveBarState({
    state: run.state,
    restartingPass: run.restartingPass,
    hasResult: false,
    hasOffer: false,
  });
  return (
    <LessonFrame
      guided
      header={header}
      nav={nav}
      tools={{
        about: { open: aboutOpen, onToggle: () => setAboutOpen(!aboutOpen) },
        settings: {
          open: settingsOpen,
          onToggle: () =>
            settingsOpen ? setSettingsOpen(false) : openSettings(),
        },
      }}
      data-guitar-layout
      data-bar-state={state}
    >
      <GuidedPlayer
        key={guided.chapter.id}
        binding={guided}
        volume={<VolumeRow />}
        paused={settingsOpen || aboutOpen || !!slots.setupModal}
        // No room beside the progress bar on a phone: Perform asks for setup anyway.
        extra={
          <div className="shrink-0 max-sm:hidden">
            <GuitarInputIndicator
              handle={input.handle}
              onOpenSetup={input.openSetup}
              onOpenInputSettings={() => openSettings('input')}
            />
          </div>
        }
        overview={overview}
        bar={{
          state,
          run,
          tempo,
          practice,
          input,
          result: null,
          offer: null,
          variant: 'centered',
        }}
        stage={
          <>
            <div data-guitar-visuals-slot className="min-w-0">
              <div className="h-full">{slots.visuals}</div>
            </div>
            <div
              ref={slots.tabViewportRef}
              data-guitar-stage
              className="relative overflow-y-auto overflow-x-hidden rounded-xl bg-[#151518]"
              style={{ ['--ma-tab-gap' as string]: '#151518' }}
            >
              {slots.tab}
            </div>
          </>
        }
      />
      <GuitarSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        focusGroup={settingsFocus}
        theory={theory}
        input={input}
      />
      <GuitarAboutStepSheet
        open={aboutOpen}
        onOpenChange={setAboutOpen}
        theory={theory}
        instruction={run.instruction}
      />
      {slots.setupModal}
    </LessonFrame>
  );
}

/** Piano Theory: its activities, with their own rolls and keys, as the stage. */
export function GuidedTheoryLayout({
  guided,
  header,
  nav,
  content,
  bar,
  about,
  audio,
}: TheoryLessonLayoutProps & { guided: GuidedBinding }) {
  const { settingsOpen, setSettingsOpen, aboutOpen, setAboutOpen } =
    useSheets();
  return (
    <LessonFrame
      guided
      header={header}
      nav={nav}
      tools={{
        about: { open: aboutOpen, onToggle: () => setAboutOpen(!aboutOpen) },
        settings: {
          open: settingsOpen,
          onToggle: () => setSettingsOpen(!settingsOpen),
        },
      }}
      data-piano-layout
      data-theory-layout
      data-bar-state={bar.state}
    >
      <GuidedPlayer
        key={guided.chapter.id}
        binding={guided}
        volume={<VolumeRow />}
        paused={settingsOpen || aboutOpen}
        bar={{ ...bar, variant: 'centered' }}
        stage={
          <div data-theory-content className="min-w-0">
            {content}
          </div>
        }
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
