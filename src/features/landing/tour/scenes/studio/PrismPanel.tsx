import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Lock, Scissors } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { KEY_COLORS, type ColorIndex } from '@prism/engine';
import { cn } from '@/components/utilities';
import { demoChord } from '../../../music';
import { colorPhrase, HarmonySpectrum } from './HarmonySpectrum';
import { KeyWheel } from './KeyWheel';
import type { AutoFrame, PressTarget, StudioState } from './studioScript';
import { MAX_CHORDS, STYLE_NAMES, type StyleName } from './studioSong';
import {
  ON_FILL,
  ON_TEXT,
  PRESS,
  STUDIO,
  type StudioLayout,
} from './studioTokens';

/** `PrismStudio.tsx` `moduleCard` / `titleStyle`. */
const cardStyle = {
  background: STUDIO.card,
  border: `1px solid ${STUDIO.cardBorder}`,
  borderRadius: 4,
};
const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80';
/** Readout chords before "+n". */
const READOUT_MAX = 4;
/**
 * Where on Create the cursor clicks (fraction of its width): left of center,
 * so the callout opens to the right over the spent spectrum instead of
 * flipping left over the chords it describes.
 */
const CREATE_TARGET_AT = '45%';

const Card = ({
  title,
  extra,
  className,
  children,
}: {
  title: string;
  extra?: ReactNode;
  className?: string;
  children: ReactNode;
}) => (
  <section
    aria-label={title}
    className={cn('relative flex min-w-0 flex-col p-2', className)}
    style={cardStyle}
  >
    <div
      className="flex h-[14px] items-center gap-1.5 text-[11px] uppercase leading-none tracking-[1px]"
      style={{ color: STUDIO.textDim }}
    >
      {title}
      {extra}
    </div>
    {children}
  </section>
);

type Hover = AutoFrame['hover'];

/** The HARMONY readout: the hovered color's chords, or what to do next. */
const Readout = ({
  state,
  hover,
  lit,
  keyRoot,
}: {
  state: StudioState;
  hover: Hover;
  lit: number;
  keyRoot: number;
}) => {
  if (state.keyPc === null) return <>Pick a key to start</>;
  if (hover) {
    if (hover.tokens.length === 0)
      return <>Nothing in {colorPhrase(hover.segment)} fits next</>;
    const chords = hover.tokens.map((t) => demoChord(t, keyRoot));
    const extra = chords.length - READOUT_MAX;
    return (
      <>
        <span
          aria-hidden
          className="mr-1.5 inline-block size-2 shrink-0 rounded-full"
          style={{
            background: `rgb(${KEY_COLORS[hover.segment as ColorIndex].join(', ')})`,
          }}
        />
        {chords.slice(0, READOUT_MAX).map((c, i) => (
          <Fragment key={c.token}>
            {i > 0 && <span className="px-1 text-white/30">·</span>}
            <span className={c.token === hover.pick ? 'text-white' : undefined}>
              {c.label}
            </span>
          </Fragment>
        ))}
        {chords.length === 1 && (
          <span className="ml-1.5 text-white/40">{chords[0].roman}</span>
        )}
        {extra > 0 && <span className="ml-1.5 text-white/40">+{extra}</span>}
      </>
    );
  }
  if (lit === 0) {
    const written = state.clip?.join('|') === state.seq.join('|');
    return (
      <>
        No more options available
        {!written && <span className="text-white">&nbsp;— press Create</span>}
      </>
    );
  }
  return state.seq.length === 0 ? (
    <>Click a lit color to pick your first chord</>
  ) : (
    <>Lit colors can come next. Click one to add a chord</>
  );
};

/**
 * The dock's PRISM tab: the Studio's module cards (KEY, CHORD SELECTION,
 * HARMONY with Create, STYLE) with the real `#242424` / `#333` card look.
 * Compact drops STYLE and the status line and stacks HARMONY full width.
 */
export const PrismPanel = ({
  layout,
  compact,
  staticMode,
  state,
  keyRoot,
  groups,
  hover,
  press,
  cursor,
  flash,
  keyRing,
  onFlashDone,
  onRingDone,
  onKey,
  onUndo,
  onClear,
  onSegment,
  onHover,
  onCreate,
  onStyle,
  onChord,
}: {
  layout: StudioLayout;
  compact: boolean;
  staticMode: boolean;
  state: StudioState;
  keyRoot: number;
  groups: ReadonlyMap<number, readonly string[]>;
  hover: Hover;
  press: PressTarget | null;
  /** The auto cursor's later spectrum click (moves the step's target there). */
  cursor: { segment: number; target: string } | null;
  flash: { segment: number; n: number } | null;
  /** Set by the KEY pill: a one-shot ring on the KEY card (new id per press). */
  keyRing: number | null;
  onFlashDone: () => void;
  onRingDone: () => void;
  onKey: (pc: number) => void;
  onUndo: () => void;
  onClear: () => void;
  onSegment: (segment: number) => void;
  onHover: (segment: number | null) => void;
  onCreate: () => void;
  onStyle: (style: StyleName) => void;
  onChord: (token: string) => void;
}) => {
  const keyed = state.keyPc !== null;
  const chords = state.seq.map((t) => demoChord(t, keyRoot));
  const canCreate = keyed && chords.length > 0;
  const dirty = canCreate && state.clip?.join('|') !== state.seq.join('|');
  const pressedSegment =
    press && typeof press === 'object' ? press.segment : null;
  const pressCreate = press === 'create';
  const pop = staticMode ? false : ({ opacity: 0, scale: 0.6 } as const);
  const hasSeq = chords.length > 0;
  // Disabled without `disabled`, so a focused control that empties the
  // sequence keeps focus.
  const whenSeq = (run: () => void) => (hasSeq ? run : undefined);

  const undoClear = (
    <div className={cn('flex gap-1.5', compact ? 'h-8' : 'h-7')}>
      {(
        [
          ['Undo', 'Undo last chord', onUndo],
          ['Clear', 'Clear chord selection', onClear],
        ] as const
      ).map(([text, label, run]) => (
        <button
          key={text}
          type="button"
          aria-label={label}
          aria-disabled={!hasSeq || undefined}
          onClick={whenSeq(run)}
          className={cn(
            'flex-1 rounded border border-white/[0.08] font-medium transition-opacity',
            hasSeq ? 'hover:bg-white/[0.06]' : 'cursor-default opacity-40',
            compact ? 'text-[13px]' : 'text-[10px]',
            FOCUS,
          )}
          style={{ background: STUDIO.surface2, color: STUDIO.text }}
        >
          {text}
        </button>
      ))}
    </div>
  );

  const keyCard = (
    <Card
      title="Key"
      className="w-[150px] shrink-0"
      extra={
        <>
          {keyed && <Lock aria-hidden className="size-2.5" />}
          <button
            type="button"
            aria-label="Undo last chord"
            aria-disabled={!hasSeq || undefined}
            onClick={whenSeq(onUndo)}
            className={cn(
              'ml-auto grid size-4 place-items-center rounded',
              hasSeq ? 'hover:text-white' : 'cursor-default opacity-40',
              FOCUS,
            )}
          >
            <Scissors aria-hidden className="size-3" />
          </button>
        </>
      }
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-1.5">
        <KeyWheel
          size={layout.wheel}
          keyPc={state.keyPc}
          onPick={onKey}
          staticMode={staticMode}
          tourTarget={cursor?.target !== 'key'}
        />
        {!compact && (
          <span
            aria-hidden
            className="flex items-center gap-0.5 text-[10px] leading-none"
            style={{ color: STUDIO.textDim }}
          >
            Ionian <ChevronDown className="size-2.5" />
          </span>
        )}
      </div>
      {keyRing !== null && !staticMode && (
        <motion.span
          key={keyRing}
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded border-2 border-white"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          onAnimationComplete={onRingDone}
        />
      )}
    </Card>
  );

  // `ChordBuilder`'s dark inset box around the sequence.
  const pills = (
    <div
      className={cn(
        'rounded',
        compact
          ? 'flex gap-2 p-1'
          : 'mt-2 grid h-[76px] grid-cols-2 content-start gap-2 p-1.5',
      )}
      style={{ background: STUDIO.surface }}
    >
      <AnimatePresence initial={false}>
        {chords.map((c, i) => (
          <motion.button
            key={`${i}:${c.token}`}
            type="button"
            aria-label={`Play ${c.label}`}
            onClick={() => onChord(c.token)}
            initial={pop}
            animate={{ opacity: 1, scale: 1 }}
            exit={staticMode ? undefined : { opacity: 0, scale: 0.6 }}
            transition={{ type: 'spring', stiffness: 520, damping: 26 }}
            className={cn(
              'truncate rounded-full border font-medium',
              compact ? 'h-8 px-3 text-[14px]' : 'h-7 px-2.5 text-[12px]',
              FOCUS,
            )}
            style={{
              background: `color-mix(in srgb, ${c.color} 20%, transparent)`,
              borderColor: `color-mix(in srgb, ${c.color} 35%, transparent)`,
              color: c.color,
            }}
          >
            {c.label}
          </motion.button>
        ))}
      </AnimatePresence>
      {!hasSeq && (
        <span
          className={cn(
            'flex flex-1 items-center justify-center italic text-white/35',
            compact ? 'h-8 text-[14px]' : 'col-span-2 h-16 text-[12px]',
          )}
        >
          No chords yet
        </span>
      )}
    </div>
  );

  const dots = (
    <div aria-hidden className="mt-[7px] flex h-2.5 gap-1.5">
      {chords.map((c, i) => (
        <motion.span
          key={`${i}:${c.token}`}
          className="size-2.5 rounded-full"
          style={{ background: c.color }}
          initial={pop}
          animate={{ opacity: 1, scale: 1 }}
        />
      ))}
    </div>
  );

  const selectionCard = (
    <Card
      title="Chord selection"
      className={compact ? 'flex-1' : 'w-[200px] shrink-0'}
    >
      {dots}
      {compact ? <div className="mt-2.5 flex-1">{pills}</div> : pills}
      {!compact && (
        <p className="mt-1.5 h-[14px] text-[10px] leading-[14px] text-white/40">
          {!keyed
            ? 'Pick a key first'
            : `${chords.length} of ${MAX_CHORDS} chords`}
        </p>
      )}
      <div className="mt-auto">{undoClear}</div>
    </Card>
  );

  const harmonyCard = (
    <Card title="Harmony" className="flex-1">
      <div className={cn('mt-[5px]', compact ? 'h-[106px]' : 'h-[120px]')}>
        <HarmonySpectrum
          groups={groups}
          keyRoot={keyRoot}
          keyed={keyed}
          pressed={pressedSegment}
          cursor={cursor}
          flash={flash}
          onFlashDone={onFlashDone}
          compact={compact}
          onPick={onSegment}
          onHover={onHover}
        />
      </div>
      <p
        className={cn(
          'mt-1.5 flex items-center truncate text-white/60',
          compact ? 'h-5 text-[14px]' : 'h-4 text-[11px]',
        )}
      >
        <Readout
          state={state}
          hover={hover}
          lit={groups.size}
          keyRoot={keyRoot}
        />
      </p>
      <button
        type="button"
        disabled={!canCreate}
        onClick={onCreate}
        aria-label="Create: write the chords to the CHORDS clip"
        className={cn(
          'relative mt-auto w-full rounded-lg transition-[transform,filter,opacity] duration-150 disabled:opacity-50',
          compact ? 'h-10 text-[15px]' : 'h-7 text-[12px]',
          dirty && 'ring-1 ring-white/40 ring-offset-2 ring-offset-[#242424]',
          FOCUS,
        )}
        style={{
          background: canCreate ? ON_FILL : STUDIO.surface2,
          color: canCreate ? ON_TEXT : STUDIO.textDim,
          transform: pressCreate ? `scale(${PRESS.scale})` : undefined,
          filter: pressCreate ? 'brightness(0.82)' : undefined,
        }}
      >
        <span
          aria-hidden
          data-tour-target="create"
          className="pointer-events-none absolute inset-y-0 w-px"
          style={{ left: CREATE_TARGET_AT }}
        />
        Create
      </button>
    </Card>
  );

  if (compact) {
    return (
      <div className="flex size-full flex-col gap-1.5 p-1.5">
        <div className="flex h-[142px] shrink-0 gap-1.5">
          {keyCard}
          {selectionCard}
        </div>
        {harmonyCard}
      </div>
    );
  }

  return (
    <div className="flex size-full gap-1.5 p-1.5">
      {keyCard}
      {selectionCard}
      {harmonyCard}
      <Card title="Style" className="w-[150px] shrink-0">
        <div
          role="group"
          aria-label="Style"
          className="mt-2 flex flex-wrap gap-1.5"
        >
          {STYLE_NAMES.map((name) => {
            const on = state.style === name;
            return (
              <button
                key={name}
                type="button"
                aria-pressed={on}
                onClick={() => onStyle(name)}
                className={cn(
                  'flex h-6 items-center gap-0.5 rounded-full px-2 text-[10px] font-medium transition-colors',
                  on
                    ? 'bg-white/[0.14] text-white'
                    : 'bg-white/[0.06] text-white/45 hover:text-white/80',
                  FOCUS,
                )}
              >
                <span aria-hidden className="text-[9px]">
                  ♪
                </span>
                {name}
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
