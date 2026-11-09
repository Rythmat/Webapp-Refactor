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
import { cn } from '@/components/utilities';
import { SpeedTrainerControl } from '@/curriculum/practice';
import type { GuitarInputHandle } from '@/learn/audio/guitar/types';
import { useLessonKeyboardSlot } from '@/learn/keyboard/lessonKeyboardSlot';
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

// The prompt box's pills (PromptPillButton), a size up for the bar: the
// hairline one, and the white one for the step to take.
const SECONDARY_PILL =
  'inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white/10 px-4 text-sm font-normal text-white/85 transition-colors duration-150 hover:bg-white/[0.06] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent max-[639px]:h-11 max-[639px]:w-full max-[639px]:px-2 [&_svg]:size-4 [&_svg]:shrink-0';

// A dark gap and a 2px ring make keyboard focus on the white pill plain to
// see.
const PRIMARY_PILL =
  'inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-5 text-sm font-normal text-[#101012] outline-none hover:bg-[#E6E6E8] active:bg-[#D1D1D3] [&_svg]:size-4 [&_svg]:shrink-0 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0c0e] disabled:bg-white disabled:text-grey-darkest disabled:opacity-40 max-[639px]:h-11 max-[639px]:w-full max-[639px]:px-2';

const TEXT_BUTTON =
  'inline-flex h-9 shrink-0 items-center rounded-full text-[15px] font-normal text-[#e8e8f0] underline decoration-white/30 underline-offset-4 transition-colors duration-150 hover:decoration-white/70 max-[639px]:h-11';

const MENU_ITEM =
  'flex min-h-9 cursor-default select-none items-center rounded-lg px-3 py-1.5 text-sm font-normal text-[#e8e8f0] outline-none transition-colors duration-150 data-[highlighted]:bg-white/[0.08] max-[639px]:min-h-11';

/** The bar's white pill (exported for screens that bring their own buttons). */
export function Primary({
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
      data-primary
      className={PRIMARY_PILL}
    >
      {children}
    </button>
  );
}

/** The bar's outlined pill. */
export function Secondary({
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

/**
 * "Pass = 75%": what a take needs to pass, in the bar's corner, out of the
 * way of the buttons. (Peter found "Wait for me · 75%" unclear: how the step
 * listens is in its instruction; the corner says only what passes.)
 */
function PassMark({ listen }: { listen: RunModel['listen'] }) {
  return (
    <span
      data-pass-mark={listen.passMarkPct}
      data-listen-mode={listen.mode}
      title={`Get ${listen.passMarkPct}% of the notes right to pass this step.`}
      className="whitespace-nowrap text-xs text-white/45"
    >
      Pass = {listen.passMarkPct}%
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
  /** Guitar only: what the mic hears, and the silence offer. */
  input?: InputModel;
  result: ResultModel | null;
  offer: SectionCompleteModel | null;
  /**
   * The words and buttons to show instead of the state's own, for a screen
   * whose steps end differently (Theory's practice prompt and retry).
   */
  custom?: Zones | null;
  /**
   * 'centered' (piano and Theory): one centred row under the keyboard, the
   * buttons bigger, and no instruction — it's in About this step.
   */
  variant?: 'default' | 'centered';
}

export interface Zones {
  lead: ReactNode;
  meta: ReactNode;
  actions: ReactNode;
  /** Bottom right, out of the way: the pass mark. */
  corner?: ReactNode;
}

function previewZones({
  run,
  tempo,
  practice,
  variant,
}: GuitarActionBarProps): Zones {
  return {
    lead:
      variant === 'centered' ? null : <Instruction text={run.instruction} />,
    meta: tempo ? (
      <TempoStepper
        bpm={tempo.bpm}
        effectiveBpm={tempo.effectiveBpm}
        onChange={tempo.onChange}
      />
    ) : null,
    corner: <PassMark listen={run.listen} />,
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

function practiceZones({
  run,
  tempo,
  practice,
  variant,
}: GuitarActionBarProps): Zones {
  // Bars loop on the TAB; a lesson without bar loops (piano) keeps the
  // instruction in view instead — or, centred, leaves it to About this step.
  const status = practice.loopStatus ? (
    <GuitarLoopStatus {...practice.loopStatus} />
  ) : variant === 'centered' ? null : (
    <Instruction text={run.instruction} />
  );
  const extras =
    tempo?.trainer || practice.notes ? (
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 empty:hidden [&_[data-guitar-practice-notes]]:mt-0 [&_[data-guitar-practice-notes]]:justify-start">
        {tempo?.trainer && <SpeedTrainerControl {...tempo.trainer} />}
        {practice.notes && <GuitarPracticeNotes {...practice.notes} />}
      </div>
    ) : null;
  return {
    lead:
      status || extras ? (
        <div className="flex min-w-0 flex-col gap-1.5">
          {status}
          {extras}
        </div>
      ) : null,
    corner: <PassMark listen={run.listen} />,
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
  const handle = input?.handle ?? null;
  const silence = input?.silence ?? null;
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
        Listening
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
    corner: <PassMark listen={run.listen} />,
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

/**
 * The lesson's keyboard, docked on the bar over its buttons (LessonKeyboard
 * renders into it), the same place in every lesson. Empty, it takes no room.
 */
function KeyboardSlot() {
  const slot = useLessonKeyboardSlot();
  if (!slot) return null;
  return (
    <div
      ref={slot.setEl}
      data-lesson-keyboard-slot
      className="mx-auto w-full max-w-[1184px] px-6 pt-3 empty:hidden max-[639px]:px-4"
    />
  );
}

export function GuitarActionBar(props: GuitarActionBarProps) {
  const { lead, meta, actions, corner } = props.custom ?? zonesFor(props);
  const focus = useBarFocus(props.state);
  if (props.variant === 'centered') {
    // One centred row under the keyboard: what's happening, the tempo and
    // how it listens, then the buttons, larger. A run's "Listening · …"
    // sits in the row, so the bar keeps its height from state to state.
    return (
      <div
        ref={focus.ref}
        onFocus={focus.onFocus}
        onBlur={focus.onBlur}
        role="region"
        aria-label="Lesson controls"
        data-guitar-bar={props.state}
        data-bar-variant="centered"
        className="sticky bottom-0 z-10 shrink-0 border-t border-white/[0.06] bg-[#0c0c0e] pb-[env(safe-area-inset-bottom)]"
      >
        <KeyboardSlot />
        <div className="relative mx-auto flex min-h-[80px] w-full max-w-[1184px] flex-wrap items-center justify-center gap-x-4 gap-y-2 px-6 py-4 max-[639px]:px-4">
          {lead && (
            <div data-bar-lead className="min-w-0 text-center">
              {lead}
            </div>
          )}
          {meta && (
            <div
              data-bar-meta
              className="flex shrink-0 flex-wrap items-center gap-2"
            >
              {meta}
            </div>
          )}
          <div
            data-bar-actions
            className="flex shrink-0 flex-wrap items-center justify-center gap-3 [&_button]:h-12 [&_button]:px-7 [&_button]:text-base max-[639px]:w-full max-[639px]:[&_button]:flex-1"
          >
            {actions}
          </div>
          {corner && (
            <div
              data-bar-corner
              className="absolute bottom-3 right-6 max-[639px]:static max-[639px]:w-full max-[639px]:text-center"
            >
              {corner}
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div
      ref={focus.ref}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      role="region"
      aria-label="Lesson controls"
      data-guitar-bar={props.state}
      className="sticky bottom-0 z-10 shrink-0 border-t border-white/[0.06] bg-[#0c0c0e] pb-[env(safe-area-inset-bottom)]"
    >
      <KeyboardSlot />
      <div className="mx-auto flex min-h-[72px] w-full max-w-[1184px] items-center gap-4 px-6 py-3 max-[639px]:flex-col max-[639px]:items-stretch max-[639px]:gap-2 max-[639px]:px-4">
        {/* Empty, it still pushes the buttons right; on a phone it goes. */}
        <div data-bar-lead className="min-w-0 flex-1 max-[639px]:empty:hidden">
          {lead}
        </div>
        {(meta || corner) && (
          <div
            data-bar-meta
            className="flex shrink-0 items-center gap-2 max-[639px]:flex-wrap"
          >
            {meta}
            {corner}
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
