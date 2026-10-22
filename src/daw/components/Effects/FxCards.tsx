import { Expand, Maximize2, X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/components/utilities';
import type { EffectSlotType, TrackEffectState } from '@/daw/audio/EffectChain';
import {
  RotaryKnob,
  RotaryKnobLookContext,
} from '@/daw/components/Controls/RotaryKnob';
import { FX_COLOR, FX_LABEL } from '@/daw/data/libraryItems';
import { meterSource } from '@/daw/engine/meterBus';
import {
  ControlGestureContext,
  useContinuousControl,
} from '@/daw/hooks/useContinuousControl';
import { DawDialog } from '@/daw/ui/DawDialog';
import { IconButton } from '@/daw/ui/IconButton';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { COLOR } from '@/daw/ui/tokens';
import { CardSwitch, CARD_SELECT_LABEL, FxKnobs } from './EffectsPanel';
import { FxMeter } from './FxMeter';
import { BAND_COLORS, CurveTypeSelector } from './FxShared';
import { GraphicEQ } from './GraphicEQ';
import {
  CompressorCurve,
  DelayTaps,
  GateCurve,
  ReverbDecay,
} from './visualizers';

// ── The effect cards (the floating frame, 2026-10-21) ───────────────────────
//
// A rack's chain as the floating frame's dock draws it: one card per effect
// in a row, then the Add effect card, 8 px apart inside 8 px of padding.
// Each card is the device: a 32 px header (its on switch, its name and
// Remove) over its graph and its controls. No In and Out blocks: the row
// is the chain, left to right.
//
// The cards take the dock's size, whatever it is, and fit inside it: the
// row measures itself, and each card sizes its graph and its knobs to the
// height left (cardLayout). Where two rows of knobs fit, a card shows every
// control; in one row it keeps its main ones (FxKnobs puts them first) and
// its header offers the rest (Show all: a taller dock); where even that is
// tight, or the row is narrow, the graph goes too. The row scrolls sideways
// when the chain is wider than the dock; nothing spills out of a card or
// the dock.

/** The row's padding and the gap between its cards, in px. */
export const CARD_GAP_PX = 8;
/** A card's header: its on switch, name and Remove. */
export const CARD_HEADER_PX = 32;
/** Under a knob: its name (16) and value (14), and the two 4 px gaps. */
export const KNOB_CELL_EXTRA_PX = 38;
/** The gap between two rows of knobs. */
const KNOB_ROW_GAP_PX = 4;
/** Two rows of knobs need at least this diameter, else they go to one. */
const TWO_ROW_MIN_KNOB_PX = 26;
/**
 * A graph is never taller than this: in a tall dock it stays a graph, not a
 * wall (the floating frame's are 154 px).
 */
const GRAPH_MAX_PX = 200;
/** The row's height before it has measured itself (the floating frame's). */
const FALLBACK_ROW_PX = 224;
/** In one row of knobs, a card keeps this many controls, its main ones. */
const ONE_ROW_KEEP = 4;
/** Under this body height, fewer still, and no graph. */
const TIGHT_BODY_PX = 72;
const TIGHT_KEEP = 3;
/** A row narrower than this drops the graphs: the controls come first. */
const NARROW_ROW_PX = 640;

/**
 * How many controls each card has, in FxKnobs' order (the compressor's
 * Auto makeup is a cell of its own; the EQ's are its band's).
 */
export const CONTROL_COUNT: Record<EffectSlotType, number> = {
  // The guitar pedals: their knobs (pedalEffects).
  overdrive: 3,
  amp: 6,
  chorus: 3,
  phaser: 3,
  flanger: 3,
  wah: 6,
  compressor: 8,
  gate: 5,
  eq: 6,
  reverb: 6,
  delay: 3,
  presence: 3,
  'de-esser': 2,
  saturator: 3,
  multiband: 7,
  ducker: 6,
};

/** Hides a grid's cells after the first `keep` (literal, for Tailwind). */
const HIDE_AFTER: Record<number, string> = {
  [TIGHT_KEEP]: '[&>*:nth-child(n+4)]:hidden',
  [ONE_ROW_KEEP]: '[&>*:nth-child(n+5)]:hidden',
};

export interface CardLayout {
  /** The card's height: the row's, less its padding. */
  cardH: number;
  /** The height under the header, less the card's bottom padding. */
  bodyH: number;
  rows: 1 | 2;
  /** The knobs' diameter. */
  knob: number;
  /** How many controls show, in FxKnobs' order: all, or the main ones. */
  keep: number;
  /** Whether the graph shows. */
  graph: boolean;
}

/**
 * How a card fits a row `rowH` high: its controls in two rows where the
 * knobs keep a usable size, else one, never taller than the card's body.
 * `extraPx` is height its controls take above the knobs (the EQ's bands).
 */
export function cardLayout(
  rowH: number,
  extraPx = 0,
  rowW = Infinity,
): CardLayout {
  const cardH = Math.max(0, rowH - 2 * CARD_GAP_PX);
  const bodyH = Math.max(0, cardH - CARD_HEADER_PX - CARD_GAP_PX);
  const room = bodyH - extraPx;
  const cap = bodyH >= 240 ? 48 : 37;
  const two = Math.floor((room - KNOB_ROW_GAP_PX - 2 * KNOB_CELL_EXTRA_PX) / 2);
  const wide = rowW >= NARROW_ROW_PX;
  if (two >= TWO_ROW_MIN_KNOB_PX) {
    return {
      cardH,
      bodyH,
      rows: 2,
      knob: Math.min(cap, two),
      keep: Infinity,
      graph: wide,
    };
  }
  const tight = bodyH < TIGHT_BODY_PX;
  return {
    cardH,
    bodyH,
    rows: 1,
    knob: Math.max(20, Math.min(cap, room - KNOB_CELL_EXTRA_PX)),
    keep: tight ? TIGHT_KEEP : ONE_ROW_KEEP,
    graph: wide && !tight,
  };
}

/** Each graph's width for its height: the EQ is wide, the rest near 4:3. */
const GRAPH_RATIO: Partial<Record<EffectSlotType, number>> = {
  compressor: 1.36,
  gate: 1.36,
  reverb: 1.5,
  delay: 1.5,
  // The EQ's drawing is 520 × 220: at its own shape it fills the well.
  eq: 520 / 220,
};

export interface FxCardRowProps {
  /** The rack's id on the meter bus and in the lessons' anchors. */
  fxId: string;
  chain: readonly EffectSlotType[];
  effects: TrackEffectState;
  /** Writes the slots a gesture changed. */
  onUpdate(changed: Partial<TrackEffectState>): void;
  /** Plays the effects without writing the store, while a knob moves. */
  onPreview(effects: TrackEffectState): void;
  onRemove(slot: EffectSlotType): void;
  /** Whose chain the meters read, or null where there's none to meter. */
  meterTarget: string | null;
  /** The effect the library and the lessons point at. */
  shown: EffectSlotType | null;
  onShow(slot: EffectSlotType): void;
  /** The card after the last effect: Add effect. */
  addSlot: ReactNode;
  /**
   * Makes room for every control (a taller or maximized dock): offered on
   * a card that keeps only its main ones. None: no offer.
   */
  onShowAll?(): void;
  /**
   * A picture of the device (the Add effect picker's cards): no Remove or
   * Show all, no scrolling, and none of the dock's test ids or lesson
   * anchors. The caller makes it inert.
   */
  preview?: boolean;
  /**
   * Cards before the effects, at the row's height (a plain Audio track's
   * amp and pitch correction, AudioFxCards): one row for both.
   */
  leading?(rowH: number): ReactNode;
}

export function FxCardRow({
  fxId,
  chain,
  effects: storeEffects,
  onUpdate,
  onPreview,
  onRemove,
  meterTarget,
  shown,
  onShow,
  addSlot,
  onShowAll,
  preview = false,
  leading,
}: FxCardRowProps) {
  // One control for the whole rack: a knob or a band drag previews and
  // writes the store once on release; a switch or a list writes at once. A
  // write carries only the slots the gesture changed, so a collaborator's
  // edit to another slot meanwhile stands.
  const fx = useContinuousControl<TrackEffectState>({
    value: storeEffects,
    preview: onPreview,
    commit: (next, start) => {
      const changed: Partial<TrackEffectState> = {};
      for (const key of Object.keys(next) as (keyof TrackEffectState)[]) {
        if (next[key] !== start[key]) {
          (changed as Record<string, unknown>)[key] = next[key];
        }
      }
      onUpdate(changed);
    },
    label: 'Change effect',
  });
  const effects = fx.value;
  const latest = useRef(effects);
  latest.current = effects;
  const update = useCallback(
    (partial: Partial<TrackEffectState>) => {
      const next = { ...latest.current, ...partial };
      latest.current = next;
      fx.change(next);
    },
    [fx],
  );
  const gesture = useMemo(
    () => ({ begin: fx.begin, end: fx.end }),
    [fx.begin, fx.end],
  );

  const rowRef = useRef<HTMLDivElement>(null);
  const [rowH, setRowH] = useState(FALLBACK_ROW_PX);
  const [rowW, setRowW] = useState(Infinity);
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    // clientHeight: the row's box less a sideways scrollbar, if it shows.
    const measure = () => {
      if (row.clientHeight > 0) setRowH(row.clientHeight);
      if (row.clientWidth > 0) setRowW(row.clientWidth);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, []);

  // The shown effect comes into view: one just added from the library, or
  // one a lesson points at.
  useEffect(() => {
    if (!shown) return;
    const card = rowRef.current?.querySelector<HTMLElement>(
      `[data-fx-card="${shown}"]`,
    );
    if (typeof card?.scrollIntoView === 'function') {
      card.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [shown, chain]);

  return (
    <ControlGestureContext.Provider value={gesture}>
      <RotaryKnobLookContext.Provider value="card">
        <div
          ref={rowRef}
          role={preview ? undefined : 'group'}
          aria-label={preview ? undefined : 'Effects chain'}
          data-testid={preview ? undefined : 'fx-cards'}
          className={cn(
            'flex h-full min-h-0 min-w-0 flex-1 items-stretch gap-2 overflow-y-hidden p-2',
            preview ? 'overflow-x-hidden' : 'overflow-x-auto',
          )}
          style={{ scrollbarWidth: 'thin' }}
        >
          {leading?.(rowH)}
          {chain.map((slot) => (
            <FxCard
              key={slot}
              slot={slot}
              fxId={fxId}
              effects={effects}
              update={update}
              onRemove={onRemove}
              shown={slot === shown}
              onShow={onShow}
              meterTarget={meterTarget}
              rowH={rowH}
              rowW={rowW}
              onShowAll={onShowAll}
              preview={preview}
            />
          ))}
          {addSlot}
        </div>
      </RotaryKnobLookContext.Provider>
    </ControlGestureContext.Provider>
  );
}

// ── One card ────────────────────────────────────────────────────────────────

function FxCard({
  slot,
  fxId,
  effects,
  update,
  onRemove,
  shown,
  onShow,
  meterTarget,
  rowH,
  rowW,
  onShowAll,
  preview,
}: {
  slot: EffectSlotType;
  fxId: string;
  effects: TrackEffectState;
  update(partial: Partial<TrackEffectState>): void;
  onRemove(slot: EffectSlotType): void;
  shown: boolean;
  onShow(slot: EffectSlotType): void;
  meterTarget: string | null;
  rowH: number;
  rowW: number;
  onShowAll?(): void;
  preview: boolean;
}) {
  const label = FX_LABEL[slot] ?? slot;
  const color = FX_COLOR[slot] ?? COLOR.accent.value;
  const state = effects[slot as keyof TrackEffectState] as {
    enabled: boolean;
  };
  const enabled = state?.enabled ?? false;
  const isEq = slot === 'eq';
  const layout = cardLayout(rowH, 0, rowW);
  // The EQ is its graph alone, its knobs in its expanded view (EqExpanded,
  // 2026-10-22): nothing of it is left out of the card.
  const hidden = isEq ? 0 : Math.max(0, CONTROL_COUNT[slot] - layout.keep);
  const ratio = layout.graph ? GRAPH_RATIO[slot] : undefined;
  const graphH = Math.min(layout.bodyH, GRAPH_MAX_PX);
  const graphW = ratio ? Math.round(graphH * ratio) : 0;
  // The EQ's graph runs to the card's edges, as wide as its height allows.
  const eqW = Math.max(EQ_MIN_W_PX, Math.round(layout.cardH * EQ_RATIO));
  const [expanded, setExpanded] = useState(false);
  const pick = () => {
    if (!shown) onShow(slot);
  };

  return (
    <section
      aria-label={label}
      data-testid={preview ? undefined : `fx-card-${slot}`}
      data-tutorial-id={preview ? undefined : `fx-slot-${slot}`}
      data-fx-card={slot}
      data-shown={shown || undefined}
      data-enabled={enabled}
      data-rows={layout.rows}
      data-hidden={hidden || undefined}
      onPointerDownCapture={pick}
      onFocusCapture={pick}
      className="flex h-full shrink-0 flex-col overflow-hidden rounded-[var(--daw-radius-card)] bg-daw-device"
    >
      <header
        className="flex shrink-0 items-center gap-2 px-2"
        style={{ height: CARD_HEADER_PX }}
      >
        <PowerDot
          label={label}
          on={enabled}
          color={color}
          onToggle={() => update({ [slot]: { ...state, enabled: !enabled } })}
        />
        <h3
          className={cn(
            TYPE_CLASS.body,
            'min-w-0 flex-1 truncate text-daw-text',
          )}
        >
          {label}
        </h3>
        {isEq && !preview ? (
          <IconButton
            label="Expand the EQ"
            icon={<Expand />}
            size="sm"
            variant="bare"
            tooltipSide="top"
            data-testid="fx-eq-expand"
            onClick={() => setExpanded(true)}
          />
        ) : null}
        {hidden > 0 && onShowAll && !preview ? (
          <IconButton
            label={`Show all ${CONTROL_COUNT[slot]} controls`}
            icon={<Maximize2 />}
            size="sm"
            variant="bare"
            tooltipSide="top"
            data-testid={`fx-show-all-${slot}`}
            onClick={onShowAll}
          />
        ) : null}
        {preview ? null : (
          <IconButton
            label={`Remove ${label}`}
            icon={<X />}
            size="sm"
            variant="bare"
            tooltipSide="top"
            data-testid={`fx-remove-${slot}`}
            onClick={() => onRemove(slot)}
          />
        )}
      </header>
      {isEq ? (
        // The graph to the card's edges; the card's corners clip it.
        <div
          className={cn('min-h-0 flex-1', !enabled && 'opacity-50', TRANSITION)}
          style={{ width: eqW }}
        >
          <EqGraph
            effects={effects}
            update={update}
            meterTarget={meterTarget}
          />
          {preview ? null : (
            <EqExpanded
              open={expanded}
              onOpenChange={setExpanded}
              effects={effects}
              update={update}
              meterTarget={meterTarget}
            />
          )}
        </div>
      ) : (
        /* A switched-off effect dims, all but its switch. */
        <div
          className={cn(
            'flex min-h-0 flex-1 items-center gap-3 px-2',
            !enabled && 'opacity-50',
            TRANSITION,
          )}
          style={{ paddingBottom: CARD_GAP_PX }}
        >
          {ratio ? (
            <CardGraph
              slot={slot}
              effects={effects}
              update={update}
              meterTarget={meterTarget}
              width={graphW}
              height={graphH}
            />
          ) : null}
          {
            <div
              className={cn(
                'grid h-full min-w-max shrink-0 content-center items-center justify-items-center gap-x-3',
                HIDE_AFTER[layout.keep],
              )}
              style={{
                gridAutoFlow: 'column',
                gridTemplateRows: `repeat(${layout.rows}, auto)`,
                rowGap: KNOB_ROW_GAP_PX,
              }}
            >
              <FxKnobs
                trackId={fxId}
                slot={slot}
                effects={effects}
                onUpdate={(_id, partial) => update(partial)}
                color={color}
                knobSize={layout.knob}
                card
              />
            </div>
          }
        </div>
      )}
    </section>
  );
}

/**
 * The card's on switch: a ring with the effect's colour lit inside while
 * it plays, empty while it is bypassed.
 */
export function PowerDot({
  label,
  on,
  color,
  onToggle,
}: {
  label: string;
  on: boolean;
  color: string;
  onToggle(): void;
}) {
  return (
    <button
      type="button"
      aria-label={`${label} on`}
      aria-pressed={on}
      title={on ? `Turn ${label} off` : `Turn ${label} on`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded-full border border-daw-text-3 hover:border-daw-text',
        TRANSITION,
        FOCUS_RING,
      )}
    >
      <span
        aria-hidden
        className="size-2 rounded-full"
        // The effect's colour is its mark, as on the library's rows.
        style={{ backgroundColor: on ? color : 'transparent' }}
      />
    </button>
  );
}

/** The effect's graph at the card's height, in a dark well. */
function CardGraph({
  slot,
  effects,
  update,
  meterTarget,
  width,
  height,
}: {
  slot: EffectSlotType;
  effects: TrackEffectState;
  update(partial: Partial<TrackEffectState>): void;
  meterTarget: string | null;
  width: number;
  height: number;
}) {
  if (width <= 0 || height <= 0) return null;
  let graph: ReactNode = null;
  switch (slot) {
    case 'compressor': {
      const c = effects.compressor;
      // The gain reduction beside the curve; no In and Out meters.
      const gr = meterTarget ? meterSource(`gr:${meterTarget}`) : null;
      const meterW = 26;
      graph = (
        <div className="flex h-full items-center gap-1">
          <CompressorCurve
            threshold={c.threshold}
            ratio={c.ratio}
            knee={c.knee}
            width={width - meterW}
            height={height}
          />
          <FxMeter
            source={gr}
            label="GR"
            color="var(--daw-accent)"
            height={height}
          />
        </div>
      );
      break;
    }
    case 'gate':
      graph = (
        <GateCurve
          threshold={effects.gate.threshold}
          range={effects.gate.range}
          width={width}
          height={height}
        />
      );
      break;
    case 'eq':
      graph = (
        <GraphicEQ
          bands={effects.eq.bands}
          onChange={(bands) => update({ eq: { ...effects.eq, bands } })}
          spectrumKey={meterTarget ? `fx-pre:${meterTarget}` : null}
          readouts={false}
        />
      );
      break;
    case 'reverb': {
      const r = effects.reverb;
      graph = (
        <ReverbDecay
          decay={r.decay}
          wet={r.wet}
          type={r.type}
          preDelay={r.preDelay}
          highPass={r.highPass}
          lowPass={r.lowPass}
          width={width}
          height={height}
        />
      );
      break;
    }
    case 'delay':
      graph = (
        <DelayTaps
          time={effects.delay.time}
          feedback={effects.delay.feedback}
          wet={effects.delay.wet}
          width={width}
          height={height}
        />
      );
      break;
    default:
      return null;
  }
  return (
    <div
      data-testid={`fx-graph-${slot}`}
      className="shrink-0 overflow-hidden rounded-[var(--daw-radius-md)]"
      style={{ width, height }}
    >
      {graph}
    </div>
  );
}

// ── The EQ (owner, 2026-10-22) ─────────────────────────────────────────────
//
// One EQ wherever it plays (a track's, a send's, Master's): its graph to
// the card's edges over the live spectrum, and Expand, which opens it large
// with its knobs (EqControls). Master's is this same card, in its chain
// like any effect (owner, 2026-10-22).

/** The EQ's graph: as wide for its height as its 520 × 220 drawing. */
const EQ_RATIO = 520 / 220;
/** Its card is never narrower than this (px). */
const EQ_MIN_W_PX = 280;

/** The expanded view's controls: one row of full-size knobs, all shown. */
const EQ_EXPANDED_LAYOUT: CardLayout = {
  cardH: 0,
  bodyH: 0,
  rows: 1,
  knob: 48,
  keep: Infinity,
  graph: true,
};

/** A band moved or a knob turned turns the EQ on. */
const switchedOn = (
  effects: TrackEffectState,
  partial: Partial<TrackEffectState>,
): Partial<TrackEffectState> =>
  partial.eq ? { ...partial, eq: { ...partial.eq, enabled: true } } : partial;

/** The EQ's graph, filling its box, no readouts under it. */
export function EqGraph({
  effects,
  update,
  meterTarget,
  onPickBand,
}: {
  effects: TrackEffectState;
  update(partial: Partial<TrackEffectState>): void;
  meterTarget: string | null;
  /** A band's node pressed (the expanded view's knobs follow it). */
  onPickBand?(index: number): void;
}) {
  return (
    <GraphicEQ
      onPickBand={onPickBand}
      bands={effects.eq.bands}
      onChange={(bands) =>
        update(switchedOn(effects, { eq: { ...effects.eq, bands } }))
      }
      spectrumKey={meterTarget ? `fx-pre:${meterTarget}` : null}
      readouts={false}
      fill
    />
  );
}

/** The EQ large, nearly the whole window: its graph over its knobs. */
export function EqExpanded({
  open,
  onOpenChange,
  effects,
  update,
  meterTarget,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  effects: TrackEffectState;
  update(partial: Partial<TrackEffectState>): void;
  meterTarget: string | null;
}) {
  const eq = effects.eq;
  const color = FX_COLOR.eq ?? COLOR.accent.value;
  // The band the knobs show: picked by its number or by its node on the
  // graph (owner, 2026-10-22).
  const [picked, setPicked] = useState(0);
  return (
    <DawDialog
      open={open}
      onOpenChange={onOpenChange}
      title="EQ"
      size="full"
      data={{ 'data-testid': 'eq-expanded' }}
    >
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="flex items-center gap-2">
          <PowerDot
            label="EQ"
            on={eq.enabled}
            color={color}
            onToggle={() => update({ eq: { ...eq, enabled: !eq.enabled } })}
          />
        </div>
        <div className="min-h-[240px] flex-1 overflow-hidden rounded-[var(--daw-radius-md)]">
          <EqGraph
            effects={effects}
            update={update}
            meterTarget={meterTarget}
            onPickBand={setPicked}
          />
        </div>
        <div className="flex shrink-0 justify-center pb-1">
          <EqControls
            effects={effects}
            update={(partial) => update(switchedOn(effects, partial))}
            layout={EQ_EXPANDED_LAYOUT}
            color={color}
            picked={picked}
            onPick={setPicked}
          />
        </div>
      </div>
    </DawDialog>
  );
}

// ── The EQ's controls ───────────────────────────────────────────────────────

/**
 * The EQ beside its graph: a band picker, then the picked band's switch,
 * shape, frequency, gain and Q, and the EQ's makeup gain. The graph's
 * handles move any band.
 */
export function EqControls({
  effects,
  update,
  layout,
  color,
  picked: pickedFromOutside,
  onPick,
}: {
  effects: TrackEffectState;
  update(partial: Partial<TrackEffectState>): void;
  layout: CardLayout;
  color: string;
  /** The band the knobs show, when the graph picks it too (EqExpanded). */
  picked?: number;
  onPick?(index: number): void;
}) {
  const eq = effects.eq;
  const [pickedHere, setPickedHere] = useState(0);
  const picked = pickedFromOutside ?? pickedHere;
  const setPicked = (i: number) => {
    setPickedHere(i);
    onPick?.(i);
  };
  const index = Math.min(picked, eq.bands.length - 1);
  const band = eq.bands[index];
  if (!band) return null;
  const bandColor = BAND_COLORS[index] ?? color;
  const setBand = (patch: Partial<typeof band>) =>
    update({
      eq: {
        ...eq,
        bands: eq.bands.map((b, i) => (i === index ? { ...b, ...patch } : b)),
      },
    });
  const knob = layout.knob;
  const arc = band.enabled ? bandColor : undefined;

  return (
    <div className="flex h-full shrink-0 flex-col justify-center gap-1">
      <div
        role="radiogroup"
        aria-label="EQ band"
        className="flex h-5 items-center gap-1"
      >
        {eq.bands.map((b, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={i === index}
            aria-label={`Band ${i + 1}`}
            onClick={() => setPicked(i)}
            className={cn(
              TYPE_CLASS.label,
              'flex h-5 min-w-7 items-center justify-center gap-1 rounded-full px-1.5',
              i === index
                ? 'bg-daw-pill-on text-daw-text'
                : 'text-daw-text-3 hover:bg-daw-hover hover:text-daw-text',
              TRANSITION,
              FOCUS_RING,
            )}
          >
            <span
              aria-hidden
              className="size-1.5 rounded-full"
              style={{
                backgroundColor: b.enabled
                  ? (BAND_COLORS[i] ?? color)
                  : 'var(--daw-hover)',
              }}
            />
            {i + 1}
          </button>
        ))}
      </div>
      {/* The band's main controls first, as FxKnobs orders them. */}
      <div
        className={cn(
          'grid min-w-max content-center items-center justify-items-center gap-x-3',
          HIDE_AFTER[layout.keep],
        )}
        style={{
          gridAutoFlow: 'column',
          gridTemplateRows: `repeat(${layout.rows}, auto)`,
          rowGap: KNOB_ROW_GAP_PX,
        }}
      >
        <RotaryKnob
          label="FREQ"
          value={band.freq}
          min={20}
          max={20000}
          step={1}
          size={knob}
          log
          arcColor={arc}
          formatValue={(v) =>
            v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`
          }
          onChange={(v) => setBand({ freq: v })}
        />
        <RotaryKnob
          label="GAIN"
          value={band.gain}
          min={-12}
          max={12}
          step={0.5}
          size={knob}
          arcColor={arc}
          formatValue={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}`}
          onChange={(v) => setBand({ gain: v })}
        />
        <RotaryKnob
          label="Q"
          value={band.Q}
          min={0.1}
          max={10}
          step={0.1}
          size={knob}
          arcColor={arc}
          formatValue={(v) => v.toFixed(1)}
          onChange={(v) => setBand({ Q: v })}
        />
        <div className="flex flex-col items-center gap-1.5">
          <CurveTypeSelector
            type={band.type}
            color={arc}
            onChange={(type) => setBand({ type })}
          />
          <span className={CARD_SELECT_LABEL}>Shape</span>
        </div>
        <CardSwitch
          label="Band on"
          on={band.enabled}
          onChange={(on) => setBand({ enabled: on })}
        />
        <RotaryKnob
          label="MAKEUP"
          value={eq.makeup}
          min={0}
          max={12}
          step={0.5}
          size={knob}
          arcColor={color}
          formatValue={(v) => `${v.toFixed(1)}dB`}
          onChange={(v) => update({ eq: { ...eq, makeup: v } })}
        />
      </div>
    </div>
  );
}
