import { ChevronRight } from 'lucide-react';
import { useMemo, useRef, type RefObject } from 'react';
import { FixedDigits } from '@/components/common/FixedDigits';
import { cn } from '@/components/utilities';
import {
  GuitarLabelModeToggle,
  labelLegend,
  useGuitarLabelMode,
} from '@/curriculum/components/guitar/GuitarLabelModeToggle';
import { guitarVisualModel } from '@/curriculum/components/guitar/guitarVisualModel';
import { CHANGE_PREFIXES } from '@/curriculum/components/guitar/theory/theoryUi';
import { theoryString } from '@/curriculum/data/guitar/theoryNotes';
import { useGuitarDisplaySettings } from '@/features/learn/useGuitarDisplaySettings';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import { useLessonVolume } from '@/learn/audio/useLessonVolume';
import { usePracticeSettings } from '@/learn/audio/usePracticeSettings';
import { GuitarInputChip } from '@/learn/components/guitar/GuitarInputChip';
import type { GuitarSetupStep } from '@/learn/components/guitar/GuitarInputSetup';
import { GuitarToneSettings } from '@/learn/components/guitar/GuitarToneMenu';
import { useGuitarView } from '@/lib/notation/guitarViewPreference';
import {
  GuitarSheet,
  SegmentedControl,
  SettingsRow,
  SettingsSection,
  SettingsSlider,
  SettingsSwitchRow,
} from './settingsControls';
import type { InputModel, TheoryModel } from './types';

// ── GuitarSettingsSheet ────────────────────────────────────────────────────
// Every secondary control of the guitar lesson in one sheet, grouped as
// Display, Sound and Input. Not modal: the lesson stays live beside it, so
// each change shows as it is made. A row shows only when it does something
// on this step, and writes the same store its old control wrote: the
// TAB/notation preference, the guitar display settings, the instrument
// store, the tone prefs, the practice settings and the lesson volume.

export type SettingsGroup = 'display' | 'sound' | 'input';

export interface GuitarSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Open scrolled to (and focused on) this group, e.g. from the input chip. */
  focusGroup?: SettingsGroup;
  theory: TheoryModel;
  input: InputModel;
}

/** A group per band of the sheet, divided by hairlines. */
const GROUP = 'py-5 first:pt-0 last:pb-0';

/**
 * GuitarLabelModeToggle in the sheet's look, without touching the toggle:
 * the segments at the sheet's size and type, the choice a white pill.
 */
const LABEL_TOGGLE_LOOK = cn(
  '[&_[role=radiogroup]]:w-full [&_[role=radiogroup]]:bg-transparent',
  '[&_[role=radio]]:h-9 [&_[role=radio]]:flex-1 [&_[role=radio]]:px-3 [&_[role=radio]]:text-sm max-sm:[&_[role=radio]]:h-11',
  '[&_[role=radio][aria-checked=true]]:bg-white [&_[role=radio][aria-checked=true]]:text-[#101012]',
  '[&_[role=radio][aria-checked=false]]:text-white/55',
  'focus-visible:[&_[role=radio]]:outline-none focus-visible:[&_[role=radio]]:ring-2 focus-visible:[&_[role=radio]]:ring-white/40',
);

/**
 * GuitarInputChip in the sheet's look, without touching the chip: its text
 * at the 12 px floor in white/55, its Retry / Use MIDI / Set up buttons 36 px
 * targets (44 px on a phone), and its spinner still under reduced motion.
 */
const INPUT_CHIP_LOOK = cn(
  '[&_[role=group]]:flex-wrap [&_[role=group]]:text-xs [&_[role=group]]:!text-white/55',
  '[&_[role=group]_button]:min-h-9 [&_[role=group]_button]:px-3 max-sm:[&_[role=group]_button]:min-h-11',
  'motion-reduce:[&_.animate-spin]:animate-none',
);

const VIEW_OPTIONS = [
  { value: 'tab', label: 'TAB', name: 'Tablature' },
  { value: 'notation', label: 'Notation' },
] as const;

export function GuitarSettingsSheet({
  open,
  onOpenChange,
  focusGroup,
  theory,
  input,
}: GuitarSettingsSheetProps) {
  const headings = {
    display: useRef<HTMLHeadingElement>(null),
    sound: useRef<HTMLHeadingElement>(null),
    input: useRef<HTMLHeadingElement>(null),
  };
  const handoff = useRef(false);

  /** Close the sheet, then open what replaces it (focus goes there). */
  const leaveFor = (next: () => void) => {
    handoff.current = true;
    onOpenChange(false);
    next();
  };
  const openSetup = (step?: GuitarSetupStep) =>
    leaveFor(() => input.openSetup(step));

  return (
    <GuitarSheet
      open={open}
      onOpenChange={onOpenChange}
      modal={false}
      name="settings"
      title="Lesson settings"
      width={400}
      handoffRef={handoff}
      initialFocus={() => {
        const heading = focusGroup ? headings[focusGroup].current : null;
        heading?.scrollIntoView?.({ block: 'start' });
        return heading;
      }}
    >
      <div className="flex flex-col divide-y divide-white/[0.08]">
        <DisplaySettings theory={theory} headingRef={headings.display} />
        <SettingsSection
          label="Sound"
          headingRef={headings.sound}
          className={GROUP}
        >
          <GuitarToneSettings
            inputActive={input.listening}
            monitor={input.monitor}
            onMonitorChange={input.onMonitorChange}
            onPreview={input.onTonePreview}
          />
          <MetronomeRow />
          <VolumeRow />
          <AudioTimingRow
            latencyMs={input.outputLatencyMs}
            onOpen={() => leaveFor(input.openAudioTiming)}
          />
        </SettingsSection>
        {input.handle && (
          <SettingsSection
            label="Input"
            headingRef={headings.input}
            className={GROUP}
          >
            <div
              className={cn(
                'flex min-h-[52px] items-center py-2',
                INPUT_CHIP_LOOK,
              )}
            >
              {/* The chip carries its own Set up: one way in, not two. */}
              <GuitarInputChip handle={input.handle} onOpenSetup={openSetup} />
            </div>
          </SettingsSection>
        )}
      </div>
    </GuitarSheet>
  );
}

// ── Display ────────────────────────────────────────────────────────────────

function DisplaySettings({
  theory,
  headingRef,
}: {
  theory: TheoryModel;
  headingRef: RefObject<HTMLHeadingElement>;
}) {
  const [view, setView] = useGuitarView();
  const showSteps = useGuitarDisplaySettings((s) => s.showSteps);
  const setShowSteps = useGuitarDisplaySettings((s) => s.setShowSteps);
  const showChordJobs = useGuitarDisplaySettings((s) => s.showChordJobs);
  const setShowChordJobs = useGuitarDisplaySettings((s) => s.setShowChordJobs);
  const showSharedNotes = useGuitarDisplaySettings((s) => s.showSharedNotes);
  const setShowSharedNotes = useGuitarDisplaySettings(
    (s) => s.setShowSharedNotes,
  );
  const showRomanNumerals = useGuitarDisplaySettings(
    (s) => s.showRomanNumerals,
  );
  const setShowRomanNumerals = useGuitarDisplaySettings(
    (s) => s.setShowRomanNumerals,
  );
  const leftHanded = useInstrumentStore((s) => s.leftHanded);
  const setLeftHanded = useInstrumentStore((s) => s.setLeftHanded);

  // What the step shows decides which rows apply.
  const { displayStep, keyCenter } = theory;
  const model = useMemo(
    () => guitarVisualModel(displayStep, keyCenter),
    [displayStep, keyCenter],
  );
  const labelMode = useGuitarLabelMode(model.labelKind ?? 'scale');
  const legend = model.labelKind ? labelLegend(labelMode) : null;
  const musicMap = !!displayStep.guitar?.musicMap;
  const chordChange =
    !!model.prefix &&
    CHANGE_PREFIXES.has(model.prefix) &&
    model.chords.length > 1;
  // A teacher's setting, for the chords of Sections B to D.
  const roman = theory.canShowRoman && theory.sectionId !== 'A';

  return (
    <SettingsSection label="Display" headingRef={headingRef} className={GROUP}>
      <SettingsRow label="Show" forControl={false}>
        {({ labelId }) => (
          <SegmentedControl
            labelledBy={labelId}
            options={VIEW_OPTIONS}
            value={view}
            onChange={setView}
          />
        )}
      </SettingsRow>
      {model.labelKind && (
        <SettingsRow
          label="Dot labels"
          helper={legend}
          forControl={false}
          stacked
        >
          <div className={cn('w-full', LABEL_TOGGLE_LOOK)}>
            <GuitarLabelModeToggle kind={model.labelKind} />
          </div>
        </SettingsRow>
      )}
      {model.hasSteps && (
        <SettingsSwitchRow
          label="Whole and half steps"
          helper={theoryString('legend.steps')}
          checked={showSteps}
          onCheckedChange={setShowSteps}
        />
      )}
      {musicMap && (
        <SettingsSwitchRow
          label="Chord jobs"
          helper={`${theoryString('fn.home')}, ${theoryString('fn.away')} or ${theoryString('fn.tension')} over each bar.`}
          checked={showChordJobs}
          onCheckedChange={setShowChordJobs}
        />
      )}
      {chordChange && (
        <SettingsSwitchRow
          label="Shared notes"
          helper="Notes two chords in a row have in common."
          checked={showSharedNotes}
          onCheckedChange={setShowSharedNotes}
        />
      )}
      {roman && (
        <SettingsSwitchRow
          label="Roman numerals"
          helper="Beside chord names. A teacher setting."
          checked={showRomanNumerals}
          onCheckedChange={setShowRomanNumerals}
        />
      )}
      <SettingsSwitchRow
        label="Left-handed"
        helper="Mirror the fretboard and diagrams."
        checked={leftHanded}
        onCheckedChange={setLeftHanded}
      />
    </SettingsSection>
  );
}

// ── Sound ──────────────────────────────────────────────────────────────────

function MetronomeRow() {
  const { metronomeEnabled, setMetronomeEnabled } = usePracticeSettings();
  return (
    <SettingsSwitchRow
      label="Metronome"
      helper="The click on in-time steps."
      checked={metronomeEnabled}
      onCheckedChange={setMetronomeEnabled}
    />
  );
}

function VolumeRow() {
  const { volume, setVolume } = useLessonVolume();
  const percent = Math.round(volume * 100);
  return (
    <SettingsRow
      label="Volume"
      helper="Metronome and playback."
      forControl={false}
    >
      {({ labelId, helperId }) => (
        <div className="flex items-center gap-3">
          <SettingsSlider
            value={percent}
            onValueChange={(next) => setVolume(next / 100)}
            labelledBy={labelId}
            describedBy={helperId}
            valueText={percent === 0 ? 'Muted' : `${percent}%`}
          />
          <FixedDigits
            aria-hidden
            text={`${percent}%`}
            className="w-11 text-right text-sm text-white/55"
          />
        </div>
      )}
    </SettingsRow>
  );
}

function AudioTimingRow({
  latencyMs,
  onOpen,
}: {
  latencyMs: number;
  onOpen: () => void;
}) {
  const value = latencyMs > 0 ? `${latencyMs} ms` : null;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={value ? `Audio timing · ${value}` : 'Audio timing'}
      className="-mx-2 flex min-h-[52px] w-[calc(100%+1rem)] items-center justify-between gap-4 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm leading-5 text-[#e8e8f0]">Audio timing</span>
        <span className="text-xs leading-4 text-white/55">
          For sound that arrives late, as with Bluetooth.
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-sm text-white/55">
        {value && <FixedDigits text={value} />}
        <ChevronRight aria-hidden className="size-4" />
      </span>
    </button>
  );
}
