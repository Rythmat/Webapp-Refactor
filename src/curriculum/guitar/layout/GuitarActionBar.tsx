import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, Play, Square } from 'lucide-react';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type ReactNode,
} from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/utilities';
import { SpeedTrainerControl } from '@/curriculum/practice';
import type { GuitarInputHandle } from '@/learn/audio/guitar/types';
import { GuitarLoopStatus, GuitarPracticeNotes } from '../GuitarLoopStatus';
import { TempoStepper } from './TempoStepper';
import type {
  BarState,
  InputModel,
  PracticeModel,
  PracticePreset,
  ResultModel,
  RunModel,
  SectionCompleteModel,
  TempoModel,
} from './types';

// ── Action bar ─────────────────────────────────────────────────────────────
// Pinned under the lesson, so nothing ever covers the TAB. Left: what to do
// now (the instruction, the loop, what the mic hears, the silence offer).
// Right: the tempo, how the step listens, and the buttons — secondary pills,
// then the one white pill. What shows comes from deriveBarState, one state
// at a time:
//
//   preview          instruction │ tempo · mode · Demo · Practice · Play Now
//   practice         loop, speed trainer, notes │ tempo · Back · Demo · Perform
//   performance      meter + "Listening", or the silence offer │ bpm · Stop
//   result           Count it myself │ Try Again + Next (the primary is Next
//                    after a pass, Try Again after a miss)
//   sectionComplete  │ Enter Practice Track · Continue to …
//
// On a phone the bar stacks: the words, then the tempo, then the buttons in
// equal columns, 44px tall.

const SECONDARY_PILL =
  'inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white/15 bg-white/[0.04] px-4 text-sm font-normal text-[#e8e8f0] transition-colors duration-150 hover:bg-white/[0.08] disabled:opacity-40 disabled:hover:bg-white/[0.04] max-[639px]:h-11 max-[639px]:w-full max-[639px]:px-2 [&_svg]:size-4 [&_svg]:shrink-0';

// The shared button's 1px ring hugs the white pill and all but vanishes; a
// dark gap and a 2px ring make keyboard focus plain to see.
const PRIMARY_PILL =
  'h-10 px-5 font-normal shadow-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101012] disabled:bg-white disabled:text-grey-darkest disabled:opacity-40 max-[639px]:h-11 max-[639px]:w-full max-[639px]:px-2';

const TEXT_BUTTON =
  'inline-flex h-9 shrink-0 items-center rounded-full text-[15px] font-normal text-[#e8e8f0] underline decoration-white/30 underline-offset-4 transition-colors duration-150 hover:decoration-white/70 max-[639px]:h-11';

const MENU_ITEM =
  'flex min-h-9 cursor-default select-none items-center rounded-lg px-3 py-1.5 text-sm font-normal text-[#e8e8f0] outline-none transition-colors duration-150 data-[highlighted]:bg-white/[0.08] max-[639px]:min-h-11';

function Primary({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-primary
      className={PRIMARY_PILL}
    >
      {children}
    </Button>
  );
}

function Secondary({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={SECONDARY_PILL}
    >
      {children}
    </button>
  );
}

const modeName = (mode: RunModel['listen']['mode']) =>
  mode === 'keepTime' ? 'Keep time' : 'Wait for me';

/**
 * "Wait for me · 75%": how the step listens, and what passes. Plain words,
 * no outline: among the bar's pills an outlined label would pass for one
 * more button.
 */
function ModeChip({ listen }: { listen: RunModel['listen'] }) {
  return (
    <span
      data-guitar-mode={listen.mode}
      title={
        listen.mode === 'keepTime'
          ? `Play in time with the count. ${listen.passMarkPct}% passes.`
          : `The lesson waits for each note. ${listen.passMarkPct}% passes.`
      }
      className="inline-flex h-7 shrink-0 items-center whitespace-nowrap px-2 text-xs text-white/55"
    >
      {modeName(listen.mode)}
      <span aria-hidden>&nbsp;·&nbsp;</span>
      <span className="sr-only">Pass mark </span>
      {listen.passMarkPct}%
    </span>
  );
}

function DemoButton({ demo }: { demo: RunModel['demo'] }) {
  return demo.playing ? (
    <Secondary onClick={demo.stop}>
      <Square />
      Stop demo
    </Secondary>
  ) : (
    <Secondary onClick={demo.play}>
      <Play />
      Demo
    </Secondary>
  );
}

/** Practice; on a Music Map, a menu: the whole step or one part of it. */
function PracticeButton({
  practise,
  presets,
}: {
  practise: () => void;
  presets: readonly PracticePreset[];
}) {
  if (presets.length === 0) {
    return <Secondary onClick={practise}>Practice</Secondary>;
  }
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className={SECONDARY_PILL}>
          Practice
          <ChevronDown className="text-white/55" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          align="end"
          sideOffset={8}
          collisionPadding={16}
          data-guitar-overlay
          className="z-50 min-w-[240px] rounded-xl border border-white/[0.08] bg-[#141416] p-1.5 text-[#e8e8f0] shadow-xl outline-none motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=open]:fade-in-0"
        >
          <DropdownMenu.Item onSelect={practise} className={MENU_ITEM}>
            Whole step
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="mx-1.5 my-1 h-px bg-white/[0.08]" />
          <DropdownMenu.Label className="px-3 pb-1 pt-1.5 text-xs uppercase tracking-[0.14em] text-white/45">
            Loop a part
          </DropdownMenu.Label>
          {presets.map((preset, i) => (
            <DropdownMenu.Item
              key={`${preset.id}-${i}`}
              onSelect={preset.start}
              className={MENU_ITEM}
            >
              {preset.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** The meter's floor: quieter input shows an empty bar. */
const METER_FLOOR_DB = -60;
/** ~15 Hz, the rate the input reports its level at. */
const LEVEL_POLL_MS = 66;

/** Input RMS as 0–1 on a dB scale (a good strum is only ~0.03–0.2 RMS). */
export function meterFraction(rms: number): number {
  if (!(rms > 0)) return 0;
  const db = 20 * Math.log10(rms);
  return Math.max(0, Math.min(1, 1 - db / METER_FLOOR_DB));
}

/**
 * A small neutral level bar. The handle's `level` is a live getter on an
 * unchanged handle, so this polls it rather than waiting for a re-render.
 */
function LevelMeter({ handle }: { handle: GuitarInputHandle }) {
  const [level, setLevel] = useState(() => meterFraction(handle.level));
  useEffect(() => {
    const read = () => setLevel(meterFraction(handle.level));
    read();
    const timer = setInterval(read, LEVEL_POLL_MS);
    return () => clearInterval(timer);
  }, [handle]);

  return (
    <span
      role="meter"
      aria-label="Input level"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(level * 100)}
      className="relative inline-block h-1 w-10 shrink-0 overflow-hidden rounded-full bg-white/10"
    >
      <span
        className="absolute inset-y-0 left-0 rounded-full bg-white/55"
        style={{ width: `${level * 100}%` }}
      />
    </span>
  );
}

function Instruction({ text }: { text: string }) {
  return (
    <p
      data-guitar-instruction
      title={text}
      className="line-clamp-2 text-[15px] leading-5 text-[#e8e8f0]"
    >
      {text}
    </p>
  );
}

function ReadOnlyBpm({ tempo }: { tempo: TempoModel }) {
  return (
    <span
      data-guitar-bpm
      className="inline-flex h-9 shrink-0 items-center whitespace-nowrap px-1 text-sm text-white/55"
    >
      {tempo.effectiveBpm} bpm
    </span>
  );
}

export interface GuitarActionBarProps {
  state: BarState;
  run: RunModel;
  tempo: TempoModel | null;
  practice: PracticeModel;
  input: InputModel;
  result: ResultModel | null;
  offer: SectionCompleteModel | null;
}

interface Zones {
  lead: ReactNode;
  meta: ReactNode;
  actions: ReactNode;
}

function previewZones({ run, tempo, practice }: GuitarActionBarProps): Zones {
  return {
    lead: <Instruction text={run.instruction} />,
    meta: (
      <>
        {tempo && (
          <TempoStepper
            bpm={tempo.bpm}
            effectiveBpm={tempo.effectiveBpm}
            onChange={tempo.onChange}
          />
        )}
        <ModeChip listen={run.listen} />
      </>
    ),
    actions: (
      <>
        <DemoButton demo={run.demo} />
        <PracticeButton practise={run.practise} presets={practice.presets} />
        <Primary onClick={run.playNow} disabled={run.loading}>
          {run.loading ? 'Loading instruments...' : 'Play Now'}
        </Primary>
      </>
    ),
  };
}

function practiceZones({ run, tempo, practice }: GuitarActionBarProps): Zones {
  return {
    lead: (
      <div className="flex min-w-0 flex-col gap-1.5">
        <GuitarLoopStatus {...practice.loopStatus} />
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 empty:hidden [&_[data-guitar-practice-notes]]:mt-0 [&_[data-guitar-practice-notes]]:justify-start">
          {tempo && <SpeedTrainerControl {...tempo.trainer} />}
          <GuitarPracticeNotes {...practice.notes} />
        </div>
      </div>
    ),
    meta: tempo && (
      <TempoStepper
        bpm={tempo.bpm}
        effectiveBpm={tempo.effectiveBpm}
        onChange={tempo.onChange}
      />
    ),
    actions: (
      <>
        <Secondary onClick={run.back}>Back</Secondary>
        <DemoButton demo={run.demo} />
        <Primary onClick={run.playNow} disabled={run.loading}>
          Perform
        </Primary>
      </>
    ),
  };
}

function performanceZones({ run, tempo, input }: GuitarActionBarProps): Zones {
  const { handle, silence } = input;
  const lead = silence ? (
    <div
      role="status"
      data-guitar-silence
      className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-[#e8e8f0]"
    >
      <span>Not hearing your guitar?</span>
      {silence.checkSetup && (
        <button
          type="button"
          onClick={silence.checkSetup}
          className={TEXT_BUTTON}
        >
          Check the setup
        </button>
      )}
      <button
        type="button"
        onClick={silence.countItMyself}
        className={TEXT_BUTTON}
      >
        Count it myself
      </button>
    </div>
  ) : (
    <div className="flex min-w-0 flex-col gap-1">
      <p
        data-guitar-listening
        className="flex items-center gap-3 text-[15px] leading-5 text-[#e8e8f0]"
      >
        {handle && handle.prefs.source !== 'midi' && (
          <LevelMeter handle={handle} />
        )}
        Listening · {modeName(run.listen.mode)}
      </p>
      {run.hint && (
        <p
          data-guitar-hint
          className="line-clamp-1 text-sm leading-5 text-white/55"
        >
          {run.hint}
        </p>
      )}
    </div>
  );

  return {
    lead,
    meta: tempo && <ReadOnlyBpm tempo={tempo} />,
    actions: (
      <Primary onClick={run.stopTake}>
        <Square />
        Stop
      </Primary>
    ),
  };
}

function resultZones(result: ResultModel): Zones {
  const retry = <Try onClick={result.retry} primary={!result.result.passed} />;
  const next = result.result.passed ? (
    <Primary onClick={result.next}>{result.nextLabel}</Primary>
  ) : (
    <Secondary onClick={result.next}>{result.nextLabel}</Secondary>
  );
  return {
    lead: result.canCountItMyself ? (
      <button
        type="button"
        onClick={result.onCountItMyself}
        className={TEXT_BUTTON}
      >
        Count it myself
      </button>
    ) : null,
    meta: null,
    // The primary sits last: Next after a pass, Try Again after a miss.
    actions: result.result.passed ? (
      <>
        {retry}
        {next}
      </>
    ) : (
      <>
        {next}
        {retry}
      </>
    ),
  };
}

function Try({ onClick, primary }: { onClick: () => void; primary: boolean }) {
  return primary ? (
    <Primary onClick={onClick}>Try Again</Primary>
  ) : (
    <Secondary onClick={onClick}>Try Again</Secondary>
  );
}

function sectionCompleteZones(offer: SectionCompleteModel): Zones {
  return {
    lead: null,
    meta: null,
    actions: (
      <>
        {/* The Practice Track offer, label and behaviour as before. */}
        <Secondary onClick={offer.enterPracticeTrack}>
          Enter Practice Track
        </Secondary>
        <Primary onClick={offer.onContinue}>{offer.continueLabel}</Primary>
      </>
    ),
  };
}

function zonesFor(props: GuitarActionBarProps): Zones {
  const { state, result, offer } = props;
  if (state === 'sectionComplete' && offer) return sectionCompleteZones(offer);
  if (state === 'result' && result) return resultZones(result);
  if (state === 'performance') return performanceZones(props);
  if (state === 'practice') return practiceZones(props);
  return previewZones(props);
}

/**
 * Keyboard focus survives a change of state. The button pressed usually
 * leaves with the state it belonged to (Play Now becomes Stop, Stop becomes
 * Next), which would drop focus to the page; when focus was in the bar and
 * nothing has it now, it moves to the new state's main button.
 */
function useBarFocus(state: BarState) {
  const barRef = useRef<HTMLDivElement>(null);
  /** Focus was last seen in the bar and hasn't gone anywhere else since. */
  const focusInBar = useRef(false);
  const shownState = useRef(state);

  useLayoutEffect(() => {
    if (shownState.current === state) return;
    shownState.current = state;
    if (!focusInBar.current) return;
    const active = document.activeElement;
    if (active && active !== document.body && active.isConnected) return;
    const bar = barRef.current;
    const target =
      bar?.querySelector<HTMLElement>('[data-primary]:not(:disabled)') ??
      bar?.querySelector<HTMLElement>('button:not(:disabled)');
    target?.focus({ preventScroll: true });
  }, [state]);

  return {
    ref: barRef,
    onFocus: () => {
      focusInBar.current = true;
    },
    onBlur: (event: FocusEvent<HTMLDivElement>) => {
      // Focus that moved somewhere else stays there. (A control removed
      // with focus may blur with no new target: that one is ours to fix.)
      const to = event.relatedTarget;
      if (to instanceof Element && !event.currentTarget.contains(to)) {
        focusInBar.current = false;
      }
    },
  };
}

export function GuitarActionBar(props: GuitarActionBarProps) {
  const { lead, meta, actions } = zonesFor(props);
  const focus = useBarFocus(props.state);
  return (
    <div
      ref={focus.ref}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      role="region"
      aria-label="Lesson controls"
      data-guitar-bar={props.state}
      className="sticky bottom-0 z-10 shrink-0 border-t border-white/[0.08] bg-[#101012] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex min-h-[72px] w-full max-w-[1184px] items-center gap-4 px-6 py-3 max-[639px]:flex-col max-[639px]:items-stretch max-[639px]:gap-2 max-[639px]:px-4">
        {/* Empty, it still pushes the buttons right; on a phone it goes. */}
        <div data-bar-lead className="min-w-0 flex-1 max-[639px]:empty:hidden">
          {lead}
        </div>
        {meta && (
          <div
            data-bar-meta
            className="flex shrink-0 items-center gap-2 max-[639px]:flex-wrap"
          >
            {meta}
          </div>
        )}
        <div
          data-bar-actions
          className={cn(
            'flex shrink-0 items-center gap-2',
            'max-[639px]:grid max-[639px]:auto-cols-fr max-[639px]:grid-flow-col',
          )}
        >
          {actions}
        </div>
      </div>
    </div>
  );
}
