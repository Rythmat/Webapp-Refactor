import { Minus, Plus } from 'lucide-react';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { cn } from '@/components/utilities';
import type { SynthEngine } from '@/daw/oracle-synth/audio/SynthEngine';
import type { ModTarget, OscWarpMode } from '@/daw/oracle-synth/audio/types';
import {
  getRegisteredTableNames,
  subscribeTableRegistry,
} from '@/daw/oracle-synth/audio/wavetableImport';
import {
  BUILT_IN_TABLES,
  WARP_OPTIONS,
} from '@/daw/oracle-synth/components/modules/oscOptions';
import { useModIndicator } from '@/daw/oracle-synth/hooks/useModIndicator';
import { useSynthStore } from '@/daw/oracle-synth/store';
import { useStore } from '@/daw/store';
import { IconButton } from '@/daw/ui/IconButton';
import { Select } from '@/daw/ui/Select';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { COLOR } from '@/daw/ui/tokens';
import { DeviceKnob } from './DeviceKnob';

// ── The Synth in the dock (the floating frame, 2026-10-21) ──────────────────
//
// The Oracle synth as the floating frame's dock shows its synth, to the
// pixel at the frame's height: one 528 × 208 device card (white/4, radius
// 10).
//   Header, 32 px: the track's mark and the name at the left; the sound in
//   a pill at the centre with ‹ › to step through the sounds; the full
//   synth (every module, the maximized dock) at the right.
//   Body, 8 px in: Oscillator 1 (224) · the filter (64) · Oscillator 2 (224),
//   160 high. An oscillator is a panel (white/4, inset 2, radius 8): its on
//   switch and name over the corner of its wavetable plot (154 × 122,
//   radius 10, its view buttons along the bottom), Position (a ring of
//   ticks) and Warp (bipolar) in 64 px tiles at the right, and its table
//   and warp mode as 30 px selects under all of it. The filter is Cutoff
//   (50 px, its value inside) over Res. A violet dot marks a control the
//   modulation matrix moves. The knobs and the plot take the track's
//   colour.
//
// The dock shows the synth's main controls only; the rest (the sub, noise,
// tuning, unison, the second filter, envelopes, LFOs, modulation, FX, arp
// and routing) are the full synth's, a click away. And it fits the dock's
// height (synthCardLayout), hiding controls as the dock gets lower:
// 'compact' drops Warp, the warp mode and Res; 'tight' the plots too, each
// oscillator its table and Position in a line.

/** The card: the floating frame's device card. */
export const SYNTH_CARD_W = 528;
export const SYNTH_CARD_MAX_PX = 208;
const HEADER_PX = 32;
const PAD_PX = 8;
const OSC_W = 224;
const FILTER_W = 64;
/** A knob tile. */
const TILE_PX = 64;
const SELECT_H = 30;
/**
 * Under this body height the card is 'compact', under the next 'tight'.
 * 'full' is the frame's 160 at its height; down to 150 its tiles give way.
 */
const FULL_BODY_PX = 150;
const COMPACT_BODY_PX = 128;

export type SynthCardMode = 'full' | 'compact' | 'tight';

export interface SynthCardLayout {
  mode: SynthCardMode;
  cardH: number;
  /** Under the header, less the padding: the panels' height. */
  bodyH: number;
  /** The plot's height (154 wide); 0 in 'tight'. */
  plotH: number;
  /** Position's and Res's diameter (Cutoff's is `cutoff`). */
  knob: number;
  cutoff: number;
  /** A knob tile's height: 64 at the frame's height. */
  tileH: number;
}

/** How the card fits a row `rowH` high (its 8 px padding included). */
export function synthCardLayout(rowH: number): SynthCardLayout {
  const cardH = Math.max(0, Math.min(SYNTH_CARD_MAX_PX, rowH - 2 * PAD_PX));
  const bodyH = Math.max(0, cardH - HEADER_PX - 2 * PAD_PX);
  if (bodyH >= FULL_BODY_PX) {
    return {
      mode: 'full',
      cardH,
      bodyH,
      plotH: bodyH - 38,
      knob: 37,
      cutoff: 50,
      tileH: Math.min(TILE_PX, Math.floor((bodyH - SELECT_H - 2) / 2)),
    };
  }
  if (bodyH >= COMPACT_BODY_PX) {
    return {
      mode: 'compact',
      cardH,
      bodyH,
      plotH: bodyH - 38,
      knob: 37,
      cutoff: Math.min(50, bodyH - 52),
      tileH: TILE_PX,
    };
  }
  // A line of 32 (the name) over the table and Position.
  const knob = Math.max(20, Math.min(37, bodyH - 32 - 26));
  return {
    mode: 'tight',
    cardH,
    bodyH,
    plotH: 0,
    knob,
    cutoff: Math.max(20, Math.min(37, bodyH - 26)),
    tileH: TILE_PX,
  };
}

/** 'SUPER SAW' → 'Super saw', as a select shows it. */
const sentenceCase = (s: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;

const formatHz = (hz: number) =>
  hz >= 1000
    ? `${(hz / 1000).toFixed(hz >= 10000 ? 0 : 1)}kHz`
    : `${Math.round(hz)}Hz`;

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
      <section
        aria-label="Synth"
        data-testid="synth-card"
        data-mode={layout.mode}
        className="relative shrink-0 overflow-hidden rounded-[var(--daw-radius-card)] bg-daw-device"
        style={{ width: SYNTH_CARD_W, height: layout.cardH }}
      >
        <header
          className="relative flex items-center justify-between px-2"
          style={{ height: HEADER_PX }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden
              className="flex size-4 shrink-0 items-center justify-center"
            >
              <span
                className="size-3 rounded-full"
                // The track's colour: its mark on the canvas.
                style={{ backgroundColor: color }}
              />
            </span>
            <h3
              className={cn(
                TYPE_CLASS.body,
                'truncate leading-5 text-daw-text',
              )}
            >
              Synth
            </h3>
          </div>
          <SoundStepper />
          <IconButton
            label="Open the full synth"
            icon={<ExpandGlyph />}
            size="sm"
            variant="bare"
            tooltipSide="top"
            data-testid="synth-card-expand"
            className="size-[22px]"
            onClick={() => setMaximized(true)}
          />
        </header>
        <div
          className="absolute flex"
          style={{ left: PAD_PX, top: HEADER_PX + PAD_PX }}
        >
          <OscPanel index={0} engine={engine} color={color} layout={layout} />
          <FilterColumn color={color} layout={layout} />
          <OscPanel index={1} engine={engine} color={color} layout={layout} />
        </div>
      </section>
    </div>
  );
}

/**
 * The sound, in a pill at the header's centre, with ‹ › to the one before
 * and after in the list.
 */
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
  const arrow =
    'flex size-5 shrink-0 items-center justify-center rounded-full text-daw-text-3 hover:bg-daw-hover hover:text-daw-text';
  return (
    <div
      className="absolute left-1/2 top-1 flex h-6 -translate-x-1/2 items-center rounded-full px-0.5"
      style={{ width: 149 }}
    >
      <button
        type="button"
        aria-label="Previous sound"
        title="Previous sound"
        onClick={() => step(-1)}
        className={cn(arrow, TRANSITION, FOCUS_RING)}
      >
        <StepGlyph back />
      </button>
      <span
        data-testid="synth-card-sound"
        className="min-w-0 flex-1 truncate text-center text-[length:var(--daw-font-label)] leading-3 text-daw-text"
      >
        {sentenceCase(name)}
      </span>
      <button
        type="button"
        aria-label="Next sound"
        title="Next sound"
        onClick={() => step(1)}
        className={cn(arrow, TRANSITION, FOCUS_RING)}
      >
        <StepGlyph />
      </button>
    </div>
  );
}

// ── The knob tile ───────────────────────────────────────────────────────────

/**
 * A knob in its tile: 64 px wide, a soft square under the pointer, and the
 * violet dot at its corner while the modulation matrix moves it.
 */
function KnobTile({
  height = TILE_PX,
  top = 10,
  modulated,
  children,
}: {
  height?: number;
  /** Where the knob sits in the tile. */
  top?: number;
  modulated: boolean;
  children: ReactNode;
}) {
  return (
    <div className="group relative shrink-0" style={{ width: TILE_PX, height }}>
      <span
        aria-hidden
        className={cn(
          'absolute inset-[3px] rounded-xl group-hover:bg-daw-device',
          TRANSITION,
        )}
      />
      {modulated ? (
        <span
          role="img"
          aria-label="Modulated"
          title="A modulation source moves this"
          className="absolute left-2 top-2 size-[7px] rounded-full bg-daw-modulation"
        />
      ) : null}
      <div className="absolute inset-x-0 flex justify-center" style={{ top }}>
        {children}
      </div>
    </div>
  );
}

const useModulated = (source: ModTarget['source'], param: ModTarget['param']) =>
  useModIndicator(source, param) !== null;

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
  const positionModulated = useModulated(
    index === 0 ? 'osc1' : 'osc2',
    'wtPos',
  );
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
  const { mode, bodyH } = layout;
  const position = (
    <DeviceKnob
      label="Position"
      look="ticks"
      value={osc.wtPosition}
      min={0}
      max={1}
      step={0.01}
      resetValue={0}
      size={layout.knob}
      color={color}
      format={(v) => `${Math.round(v * 100)}%`}
      onChange={(v) => setParam(index, 'wtPosition', v)}
    />
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
  // A switched-off oscillator dims, all but its switch.
  const dimmed = !osc.enabled && 'opacity-50';

  return (
    <div
      role="group"
      aria-label={name}
      data-testid={`synth-osc-${index + 1}`}
      className="relative shrink-0"
      style={{ width: OSC_W, height: bodyH }}
    >
      {/* The panel: white/4, 2 px in, radius 8. */}
      <span
        aria-hidden
        className="absolute inset-[2px] rounded-lg bg-daw-device"
      />
      {mode === 'tight' ? (
        <div
          className={cn('absolute flex items-center gap-1', dimmed)}
          style={{ left: 4, right: 0, top: 32 }}
        >
          <div className="min-w-0 flex-1">{table}</div>
          <div
            className="flex shrink-0 justify-center"
            style={{ width: TILE_PX }}
          >
            {position}
          </div>
        </div>
      ) : (
        <>
          <WavetablePlot
            engine={engine}
            table={osc.wavetable}
            position={osc.wtPosition}
            color={color}
            height={layout.plotH}
            className={dimmed || undefined}
          />
          <div
            className={cn('absolute flex flex-col', dimmed)}
            style={{ left: 160, top: 0 }}
          >
            <KnobTile height={layout.tileH} modulated={positionModulated}>
              {position}
            </KnobTile>
            {mode === 'full' ? (
              <KnobTile height={layout.tileH} modulated={false}>
                <DeviceKnob
                  label="Warp"
                  dim={osc.warpMode === 'none'}
                  value={osc.warpAmount}
                  min={0}
                  max={1}
                  step={0.01}
                  resetValue={0}
                  color={color}
                  format={(v) => `${Math.round(v * 100)}%`}
                  onChange={(v) => setParam(index, 'warpAmount', v)}
                />
              </KnobTile>
            ) : null}
          </div>
          <div
            className={cn('absolute flex gap-0.5', dimmed)}
            style={{ left: 1, right: 1, top: bodyH - SELECT_H - 1 }}
          >
            <div style={{ width: mode === 'full' ? 126 : 222 }}>{table}</div>
            {mode === 'full' ? (
              <div style={{ width: 94 }}>
                <Select
                  label={`${name} warp`}
                  options={warps}
                  value={osc.warpMode}
                  onValueChange={(v) =>
                    setParam(index, 'warpMode', v as OscWarpMode)
                  }
                  className={CARD_SELECT}
                />
              </div>
            ) : null}
          </div>
        </>
      )}
      {/* The on switch and the name, over the plot's corner (last, so it
          paints above it). */}
      <button
        type="button"
        aria-pressed={osc.enabled}
        aria-label={`${name} on`}
        onClick={() => setParam(index, 'enabled', !osc.enabled)}
        className={cn(
          'absolute left-0 top-0 flex h-8 items-center gap-1 rounded-[var(--daw-radius-md)] px-2 text-[11px] font-bold leading-4 text-daw-text',
          TRANSITION,
          FOCUS_RING,
        )}
      >
        <span
          aria-hidden
          className="size-2.5 rounded-full border border-daw-text-3"
          style={{
            backgroundColor: osc.enabled ? color : 'transparent',
            borderColor: osc.enabled ? color : undefined,
          }}
        />
        {name}
      </button>
    </div>
  );
}

/**
 * A select on the card: 30 px, white/4, radius 8, 12 px, and a small
 * triangle in place of the kit's chevrons.
 */
const CARD_SELECT =
  "h-[30px] w-full min-w-0 rounded-lg border-0 bg-daw-device px-2 [&>svg]:hidden after:ml-1 after:shrink-0 after:text-[length:var(--daw-font-micro)] after:leading-none after:text-daw-text after:content-['▾']";

// ── The wavetable plot ──────────────────────────────────────────────────────

/**
 * The table's frames drawn one behind the other, the first at the front
 * and each further one down and to the right, with the frame Position
 * plays lit white; or one cycle of that frame alone. Its buttons switch the
 * view and zoom it.
 */
function WavetablePlot({
  engine,
  table,
  position,
  color,
  height,
  className,
}: {
  engine: SynthEngine;
  table: string;
  position: number;
  color: string;
  height: number;
  className?: string;
}) {
  const width = 154;
  const [stack, setStack] = useState(true);
  const [zoom, setZoom] = useState(1);
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

    const count = stack ? Math.min(64, frames.length) : 1;
    const pick = (i: number) =>
      frames[Math.round((i / Math.max(1, count - 1)) * (frames.length - 1))];
    const current =
      frames[Math.round(position * (frames.length - 1))] ?? frames[0];
    // Scaled to the table's own peak, so every frame stays in the plot.
    let peak = 0;
    for (const v of current) peak = Math.max(peak, Math.abs(v));
    for (let i = 0; i < count && stack; i++) {
      for (const v of pick(i)) peak = Math.max(peak, Math.abs(v));
    }
    const norm = peak > 0 ? 1 / peak : 1;
    const depthX = stack ? width * 0.26 * zoom : 0;
    const depthY = stack ? height * 0.24 * zoom : 0;
    const frameW = width - depthX - 16;
    const amp = ((height - depthY) / 2 - 6) * (stack ? 1 : zoom);
    const points = 128;
    const trace = (frame: Float32Array, t: number) => {
      const x0 = 8 + t * depthX;
      const y0 = (stack ? 6 + amp : height / 2) + t * depthY;
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
    if (stack) {
      for (let i = count - 1; i >= 0; i--) {
        trace(pick(i), count > 1 ? i / (count - 1) : 0);
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.3 + 0.4 * (1 - i / count);
        ctx.lineWidth = 0.75;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    // The lit frame: white over a dark edge.
    trace(current, stack ? position : 0);
    ctx.strokeStyle = COLOR.bg.value;
    ctx.lineWidth = 4.5;
    ctx.stroke();
    ctx.strokeStyle = COLOR.text.value;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }, [engine, table, position, color, height, stack, zoom]);

  const button =
    'flex size-[22px] items-center justify-center rounded-md bg-daw-chip text-daw-text-2 hover:text-daw-text disabled:opacity-40';
  return (
    <div
      className={cn(
        'group/plot absolute overflow-hidden rounded-[10px]',
        className,
      )}
      style={{ left: 3, top: 3, width, height }}
    >
      <canvas
        ref={ref}
        aria-hidden
        data-testid="synth-wavetable-plot"
        style={{ width, height }}
      />
      {height >= 70 ? (
        <>
          <button
            type="button"
            aria-pressed={!stack}
            aria-label={stack ? 'Show one cycle' : 'Show every frame'}
            title={stack ? 'Show one cycle' : 'Show every frame'}
            onClick={() => setStack((v) => !v)}
            className={cn(
              button,
              'absolute bottom-1.5 left-1.5',
              PLOT_TOOL,
              FOCUS_RING,
            )}
          >
            <CycleGlyph />
          </button>
          <div
            className={cn(
              'absolute bottom-1.5 right-1.5 flex gap-1 [&_svg]:size-2.5',
              PLOT_TOOL,
            )}
          >
            <button
              type="button"
              aria-label="Zoom the plot out"
              title="Zoom out"
              disabled={zoom <= 0.5}
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
              className={cn(button, FOCUS_RING)}
            >
              <Minus aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Zoom the plot in"
              title="Zoom in"
              disabled={zoom >= 1.5}
              onClick={() => setZoom((z) => Math.min(1.5, z + 0.25))}
              className={cn(button, FOCUS_RING)}
            >
              <Plus aria-hidden />
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

/** A small filled triangle: the sound before (back) or after. */
function StepGlyph({ back = false }: { back?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
      <path
        d={back ? 'M10 4.5v7L5.5 8z' : 'M6 4.5v7L10.5 8z'}
        fill="currentColor"
      />
    </svg>
  );
}

/** The plot's view buttons show while the pointer or focus is on it. */
const PLOT_TOOL =
  'opacity-0 transition-opacity group-hover/plot:opacity-100 group-focus-within/plot:opacity-100';

/** Two corner brackets: the card opens out to the full synth. */
function ExpandGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9.5 3.5h3v3M6.5 12.5h-3v-3" />
    </svg>
  );
}

/** One cycle of a wave, for the plot's view switch. */
function CycleGlyph() {
  return (
    <svg
      viewBox="0 0 12 12"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M1 6c1.2-4.5 3.8-4.5 5 0s3.8 4.5 5 0" />
    </svg>
  );
}

// ── The filter ──────────────────────────────────────────────────────────────

function FilterColumn({
  color,
  layout,
}: {
  color: string;
  layout: SynthCardLayout;
}) {
  const filter = useSynthStore((s) => s.filters[0]);
  const setParam = useSynthStore((s) => s.setFilterParam);
  const cutoffModulated = useModulated('flt1', 'cutoff');
  const resModulated = useModulated('flt1', 'resonance');
  const { mode, bodyH } = layout;
  return (
    <div
      role="group"
      aria-label="Filter"
      data-testid="synth-filter"
      className="flex shrink-0 flex-col"
      style={{ width: FILTER_W, height: bodyH }}
    >
      <KnobTile
        height={mode === 'full' ? bodyH - layout.tileH : bodyH}
        top={
          mode === 'full'
            ? 20
            : Math.max(4, Math.floor((bodyH - layout.cutoff - 20) / 2))
        }
        modulated={cutoffModulated}
      >
        <DeviceKnob
          label="Cutoff"
          look="value"
          value={filter.cutoff}
          min={20}
          max={20000}
          step={1}
          scale="log"
          resetValue={20000}
          size={layout.cutoff}
          color={color}
          format={formatHz}
          onChange={(v) => setParam(0, 'cutoff', v)}
        />
      </KnobTile>
      {mode === 'full' ? (
        <KnobTile height={layout.tileH} modulated={resModulated}>
          <DeviceKnob
            label="Res"
            value={filter.resonance}
            min={0}
            max={30}
            step={0.1}
            resetValue={0}
            color={color}
            onChange={(v) => setParam(0, 'resonance', v)}
          />
        </KnobTile>
      ) : null}
    </div>
  );
}
