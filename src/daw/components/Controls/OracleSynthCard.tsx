import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { cn } from '@/components/utilities';
import {
  RotaryKnob,
  RotaryKnobLookContext,
} from '@/daw/components/Controls/RotaryKnob';
import type { SynthEngine } from '@/daw/oracle-synth/audio/SynthEngine';
import {
  getRegisteredTableNames,
  subscribeTableRegistry,
} from '@/daw/oracle-synth/audio/wavetableImport';
import type { OscWarpMode } from '@/daw/oracle-synth/audio/types';
import {
  BUILT_IN_TABLES,
  WARP_OPTIONS,
} from '@/daw/oracle-synth/components/modules/oscOptions';
import { useSynthStore } from '@/daw/oracle-synth/store';
import { useStore } from '@/daw/store';
import { IconButton } from '@/daw/ui/IconButton';
import { Select } from '@/daw/ui/Select';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { COLOR } from '@/daw/ui/tokens';

// ── The Synth in the dock (the floating frame, 2026-10-21) ──────────────────
//
// The Oracle synth as the floating frame's dock shows its synth: one device
// card, 528 px wide and at most 208 high. Its header has the track's mark,
// the name, the sound with ‹ › to step through the sounds, and the full
// synth (the maximized dock, every module). Under it: Oscillator 1 and
// Oscillator 2 either side of the filter. Each oscillator has its on
// switch, its wavetable drawn frame by frame with the frame it plays lit,
// Position (the frame) and Warp, and its table and warp mode. The filter is
// Cutoff, its value inside, and Res. The knobs and the plot take the
// track's colour.
//
// The dock shows the synth's main controls only; the rest (the sub, noise,
// tuning, unison, the second filter, the envelopes, LFOs, modulation, FX,
// arp and routing) are the full synth's, a click away.
//
// The card fits the dock's height (synthCardLayout), dropping controls as
// it gets lower: at the frame's height every one shows, each oscillator's
// knobs standing beside its plot; lower ('compact') Warp and the warp mode
// go and the plot narrows; lower still ('tight') Res and the plots go, each
// oscillator its table and Position in a line. Its controls write the
// synth's store, as the full synth's do.

/** The card's tallest: the floating frame's device card. */
export const SYNTH_CARD_MAX_PX = 208;
/** The header: the mark, the name, the sound and the full synth. */
const HEADER_PX = 32;
/** The body's padding, all round. */
const PAD_PX = 8;
/** An oscillator panel's width, and the gap between the three columns. */
const OSC_W = 224;
const GAP_PX = 6;
/** The table and warp selects' row under each oscillator, and its gap. */
const SELECTS_PX = 30;
/** A knob's name under it, and the gap. */
const KNOB_LABEL_PX = 20;
/** At this body height and up, every control shows (the frame's 160). */
const FULL_BODY_PX = 150;
/** Under this one, the plots and Res go too. */
const TIGHT_BODY_PX = 100;
/** A tight oscillator's name, on its own line. */
const TITLE_PX = 20;

/**
 * How much the card shows: 'full' every control, the knobs beside the
 * plot; 'compact' Position and the table per oscillator, Cutoff and Res;
 * 'tight' no plots and no Res, each oscillator's table and Position in a
 * line under its name.
 */
export type SynthCardMode = 'full' | 'compact' | 'tight';

export interface SynthCardLayout {
  mode: SynthCardMode;
  cardH: number;
  /** Under the header, less the padding. */
  bodyH: number;
  /** Position and Warp, Res. */
  knob: number;
  /** Cutoff, a size up. */
  cutoff: number;
  plotW: number;
  /** 0: no plot. */
  plotH: number;
  /** The filter column's width. */
  filterW: number;
  cardW: number;
}

/** How the card fits a row `rowH` high (its padding included). */
export function synthCardLayout(rowH: number): SynthCardLayout {
  const cardH = Math.max(0, Math.min(SYNTH_CARD_MAX_PX, rowH - 2 * PAD_PX));
  const bodyH = Math.max(0, cardH - HEADER_PX - 2 * PAD_PX);
  // Over the selects: the plot and the oscillator's knobs.
  const top = Math.max(0, bodyH - SELECTS_PX - 4);
  const width = (filterW: number) =>
    2 * PAD_PX + 2 * OSC_W + filterW + 2 * GAP_PX;
  if (bodyH >= FULL_BODY_PX) {
    const knob = Math.min(37, Math.floor((top - 8) / 2) - KNOB_LABEL_PX);
    return {
      mode: 'full',
      cardH,
      bodyH,
      knob,
      cutoff: Math.min(50, knob + 13),
      plotW: OSC_W - 58 - 12,
      plotH: top - 6,
      filterW: 52,
      cardW: width(52),
    };
  }
  if (bodyH >= TIGHT_BODY_PX) {
    const knob = Math.min(37, top - KNOB_LABEL_PX - 4);
    return {
      mode: 'compact',
      cardH,
      bodyH,
      knob,
      cutoff: Math.min(50, bodyH - KNOB_LABEL_PX - 4),
      plotW: OSC_W - (knob + 16) - 12,
      plotH: top - 6,
      filterW: 116,
      cardW: width(116),
    };
  }
  const knob = Math.max(
    20,
    Math.min(37, bodyH - TITLE_PX - 4 - KNOB_LABEL_PX - 4),
  );
  return {
    mode: 'tight',
    cardH,
    bodyH,
    knob,
    cutoff: Math.max(20, Math.min(50, bodyH - KNOB_LABEL_PX - 4)),
    plotW: 0,
    plotH: 0,
    filterW: 64,
    cardW: width(64),
  };
}

/** 'SUPER SAW' → 'Super saw', as a select shows it. */
const sentenceCase = (s: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;

export function OracleSynthCard({ engine }: { engine: SynthEngine }) {
  const color = useStore(
    (s) =>
      s.tracks.find((t) => t.id === s.selectedTrackId)?.color ??
      COLOR.accent.value,
  );
  const setMaximized = useStore((s) => s.setDockMaximized);

  // The row measures itself: the card fits its height.
  const rowRef = useRef<HTMLDivElement>(null);
  const [rowH, setRowH] = useState(SYNTH_CARD_MAX_PX + 2 * PAD_PX);
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const measure = () => {
      if (row.clientHeight > 0) setRowH(row.clientHeight);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, []);
  const layout = synthCardLayout(rowH);

  return (
    <div
      ref={rowRef}
      data-testid="synth-card-row"
      className="absolute inset-0 flex items-start overflow-x-auto overflow-y-hidden p-2"
      style={{ scrollbarWidth: 'thin' }}
    >
      <RotaryKnobLookContext.Provider value="card">
        <section
          aria-label="Synth"
          data-testid="synth-card"
          data-mode={layout.mode}
          className="flex shrink-0 flex-col overflow-hidden rounded-[var(--daw-radius-card)] bg-daw-device"
          style={{ width: layout.cardW, height: layout.cardH }}
        >
          <header
            className="grid shrink-0 items-center gap-2 px-2"
            style={{
              height: HEADER_PX,
              gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)',
            }}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className="size-3 shrink-0 rounded-full"
                // The track's colour: its mark on the canvas.
                style={{ backgroundColor: color }}
              />
              <h3 className={cn(TYPE_CLASS.body, 'truncate text-daw-text')}>
                Synth
              </h3>
            </div>
            <SoundStepper />
            <div className="flex justify-end">
              <IconButton
                label="Open the full synth"
                icon={<Maximize2 />}
                size="sm"
                variant="bare"
                tooltipSide="top"
                data-testid="synth-card-expand"
                onClick={() => setMaximized(true)}
              />
            </div>
          </header>
          <div
            className="flex min-h-0 flex-1 items-stretch"
            style={{ gap: GAP_PX, padding: PAD_PX }}
          >
            <OscPanel index={0} engine={engine} color={color} layout={layout} />
            <FilterColumn color={color} layout={layout} />
            <OscPanel index={1} engine={engine} color={color} layout={layout} />
          </div>
        </section>
      </RotaryKnobLookContext.Provider>
    </div>
  );
}

/** The sound, with ‹ › to the one before and after in the list. */
function SoundStepper() {
  const name = useSynthStore((s) => s.presetName);
  const loadPreset = useSynthStore((s) => s.loadPreset);
  const getList = useSynthStore((s) => s.getPresetList);
  const userCount = useSynthStore((s) => s.userPresets.length);
  const packCount = useSynthStore((s) => s.packPresets.length);
  const names = useMemo(
    () => getList().map((p) => p.name),
    // The list changes with the user's and the packs' sounds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getList, userCount, packCount],
  );
  const at = names.indexOf(name);
  const step = (by: number) => {
    if (names.length === 0) return;
    const next = at < 0 ? 0 : (at + by + names.length) % names.length;
    loadPreset(names[next]);
  };
  return (
    <div className="flex min-w-0 items-center gap-1">
      <IconButton
        label="Previous sound"
        icon={<ChevronLeft />}
        size="sm"
        variant="bare"
        tooltipSide="top"
        onClick={() => step(-1)}
      />
      <span
        data-testid="synth-card-sound"
        className={cn(
          TYPE_CLASS.label,
          'max-w-40 truncate text-center text-daw-text',
        )}
      >
        {sentenceCase(name)}
      </span>
      <IconButton
        label="Next sound"
        icon={<ChevronRight />}
        size="sm"
        variant="bare"
        tooltipSide="top"
        onClick={() => step(1)}
      />
    </div>
  );
}

// ── An oscillator ───────────────────────────────────────────────────────────

function OscPanel({
  index,
  engine,
  color,
  layout,
}: {
  index: 0 | 1;
  engine: SynthEngine;
  color: string;
  layout: SynthCardLayout;
}) {
  const osc = useSynthStore((s) => s.oscillators[index]);
  const setParam = useSynthStore((s) => s.setOscParam);
  const packTables = useSyncExternalStore(
    subscribeTableRegistry,
    getRegisteredTableNames,
  );
  const tables = useMemo(
    () => [
      ...BUILT_IN_TABLES.map((t) => ({
        value: t.value,
        label: sentenceCase(t.label),
      })),
      ...packTables.map((name) => ({
        value: name,
        label: sentenceCase(name.replace(/^S2\//, '')),
      })),
    ],
    [packTables],
  );
  const warps = useMemo(
    () =>
      WARP_OPTIONS.map((w) => ({
        value: w.value,
        label: w.value === 'none' ? 'Off' : sentenceCase(w.label),
      })),
    [],
  );
  const name = `Oscillator ${index + 1}`;
  const full = layout.mode === 'full';
  const position = (
    <RotaryKnob
      label="Position"
      value={osc.wtPosition}
      min={0}
      max={1}
      step={0.01}
      size={layout.knob}
      arcColor={color}
      onChange={(v) => setParam(index, 'wtPosition', v)}
    />
  );
  const onSwitch = (
    <button
      type="button"
      aria-pressed={osc.enabled}
      aria-label={`${name} on`}
      onClick={() => setParam(index, 'enabled', !osc.enabled)}
      className={cn(
        TYPE_CLASS.label,
        'flex items-center gap-1.5 rounded-full px-1 font-bold text-daw-text',
        layout.mode !== 'tight' && 'absolute left-1 top-1',
        TRANSITION,
        FOCUS_RING,
      )}
    >
      <span
        aria-hidden
        className="size-3 rounded-full border border-daw-text-3"
        style={{
          backgroundColor: osc.enabled ? color : 'transparent',
          borderColor: osc.enabled ? color : undefined,
        }}
      />
      {name}
    </button>
  );
  const table = (
    <Select
      label={`${name} wavetable`}
      options={tables}
      value={osc.wavetable}
      onValueChange={(v) => setParam(index, 'wavetable', v)}
      className={CARD_SELECT}
    />
  );

  return (
    <div
      role="group"
      aria-label={name}
      data-testid={`synth-osc-${index + 1}`}
      className={cn(
        'flex min-h-0 shrink-0 flex-col gap-1 rounded-[var(--daw-radius-card)] bg-daw-device p-[3px]',
        !osc.enabled && '[&>*:not(:first-child)]:opacity-50',
      )}
      style={{ width: OSC_W }}
    >
      {layout.mode === 'tight' ? (
        <>
          <div
            className="flex shrink-0 items-center"
            style={{ height: TITLE_PX }}
          >
            {onSwitch}
          </div>
          <div className="flex min-h-0 flex-1 items-center gap-2">
            <div className="min-w-0 flex-1">{table}</div>
            {position}
          </div>
        </>
      ) : (
        <>
          <div className="relative flex min-h-0 flex-1 items-center justify-between gap-1">
            <WavetablePlot
              engine={engine}
              table={osc.wavetable}
              position={osc.wtPosition}
              color={color}
              width={layout.plotW}
              height={layout.plotH}
            />
            {/* The on switch and the name, over the plot's corner (after
                it, so it paints above it). */}
            {onSwitch}
            <div
              className="flex shrink-0 flex-col items-center justify-center gap-2"
              style={{ width: full ? 58 : layout.knob + 16 }}
            >
              {position}
              {full ? (
                <RotaryKnob
                  label="Warp"
                  value={osc.warpAmount}
                  min={0}
                  max={1}
                  step={0.01}
                  size={layout.knob}
                  arcColor={osc.warpMode === 'none' ? undefined : color}
                  onChange={(v) => setParam(index, 'warpAmount', v)}
                />
              ) : null}
            </div>
          </div>
          <div
            className="grid shrink-0 gap-1"
            style={{
              height: SELECTS_PX,
              gridTemplateColumns: full ? '4fr 3fr' : '1fr',
            }}
          >
            {table}
            {full ? (
              <Select
                label={`${name} warp`}
                options={warps}
                value={osc.warpMode}
                onValueChange={(v) =>
                  setParam(index, 'warpMode', v as OscWarpMode)
                }
                className={CARD_SELECT}
              />
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

/** A select on the card: 30 px, white/4, as the frame's. */
const CARD_SELECT =
  'h-[30px] w-full min-w-0 rounded-[var(--daw-radius-md)] border-0 bg-daw-device';

/**
 * The table's frames drawn one behind the other, from the first at the
 * front to the last at the back, with the frame Position plays lit white.
 */
function WavetablePlot({
  engine,
  table,
  position,
  color,
  width,
  height,
}: {
  engine: SynthEngine;
  table: string;
  position: number;
  color: string;
  width: number;
  height: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const frames = engine.getWavetableBank()?.getDisplayFrames(table) ?? null;
    if (!frames || frames.length === 0) return;

    // At most 24 frames drawn, evenly through the table.
    const count = Math.min(24, frames.length);
    const pick = (i: number) =>
      frames[Math.round((i / Math.max(1, count - 1)) * (frames.length - 1))];
    const lit = Math.round(position * (count - 1));
    // Scaled to the table's own peak, so every frame stays in the plot.
    let peak = 0;
    for (let i = 0; i < count; i++) {
      for (const v of pick(i)) peak = Math.max(peak, Math.abs(v));
    }
    const norm = peak > 0 ? 1 / peak : 1;
    // Each frame further back sits up and to the right.
    const depthX = width * 0.3;
    const depthY = height * 0.32;
    const frameW = width - depthX - 8;
    const amp = (height - depthY) * 0.4;
    const points = 64;
    const line = (frame: Float32Array, i: number) => {
      const t = count > 1 ? i / (count - 1) : 0;
      const x0 = 4 + t * depthX;
      const y0 = height - 2 - amp - t * depthY;
      ctx.beginPath();
      for (let p = 0; p <= points; p++) {
        const s = frame[Math.floor((p / points) * (frame.length - 1))] ?? 0;
        const x = x0 + (p / points) * frameW;
        const y = y0 - s * norm * amp;
        if (p === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    };
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (let i = count - 1; i >= 0; i--) {
      if (i === lit) continue;
      line(pick(i), i);
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.35 + 0.4 * (1 - i / count);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    line(pick(lit), lit);
    ctx.strokeStyle = COLOR.text.value;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }, [engine, table, position, color, width, height]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      data-testid="synth-wavetable-plot"
      className="shrink-0 rounded-[var(--daw-radius-md)]"
      style={{ width, height }}
    />
  );
}

// ── The filter ──────────────────────────────────────────────────────────────

const formatHz = (hz: number) =>
  hz >= 1000
    ? `${(hz / 1000).toFixed(hz >= 10000 ? 0 : 1)}k`
    : `${Math.round(hz)}Hz`;

function FilterColumn({
  color,
  layout,
}: {
  color: string;
  layout: SynthCardLayout;
}) {
  const filter = useSynthStore((s) => s.filters[0]);
  const setParam = useSynthStore((s) => s.setFilterParam);
  return (
    <div
      role="group"
      aria-label="Filter"
      data-testid="synth-filter"
      className={cn(
        'flex shrink-0 items-center justify-center',
        layout.mode === 'full' ? 'flex-col justify-around' : 'gap-3',
      )}
      style={{ width: layout.filterW }}
    >
      <div className="relative">
        <RotaryKnob
          label="Cutoff"
          value={filter.cutoff}
          min={20}
          max={20000}
          step={1}
          log
          size={layout.cutoff}
          arcColor={color}
          onChange={(v) => setParam(0, 'cutoff', v)}
        />
        {/* The cutoff's value inside its knob, as the frame's. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 text-center text-[11px] leading-none text-daw-text"
          style={{ top: layout.cutoff / 2 - 5 }}
        >
          {layout.cutoff >= 40 ? formatHz(filter.cutoff) : null}
        </span>
      </div>
      {layout.mode !== 'tight' ? (
        <RotaryKnob
          label="Res"
          value={filter.resonance}
          min={0}
          max={30}
          step={0.1}
          size={layout.knob}
          arcColor={color}
          onChange={(v) => setParam(0, 'resonance', v)}
        />
      ) : null}
    </div>
  );
}
