import { Minus, Plus } from 'lucide-react';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { cn } from '@/components/utilities';
import type { SynthEngine } from '@/daw/oracle-synth/audio/SynthEngine';
import type { OscWarpMode } from '@/daw/oracle-synth/audio/types';
import {
  getFramesVersion,
  getRegisteredTableNames,
  subscribeFramesLoaded,
  subscribeTableRegistry,
} from '@/daw/oracle-synth/audio/wavetableImport';
import {
  buildWarpCurve,
  isDistortionWarp,
  isPhaseWarp,
} from '@/daw/oracle-synth/audio/wavetableWarp';
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
import { DeviceKnob } from './DeviceKnob';
import { EnvelopesCard, LfoCard, ModCard, SourcesCard } from './SynthDockCards';
import {
  CARD_SELECT,
  clamp,
  formatHz,
  HEADER_PX,
  KnobTile,
  PAD_PX,
  SELECT_H,
  sentenceCase,
  SYNTH_CARD_MAX_PX,
  synthCardLayout,
  TILE_PX,
  useLiveModulation,
  useLiveValue,
  useModulated,
  type LiveModulation,
  type SynthCardLayout,
} from './synthDockKit';

export {
  SYNTH_CARD_MAX_PX,
  synthCardLayout,
  type SynthCardLayout,
  type SynthCardMode,
} from './synthDockKit';

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
// It answers the keys as the frame's does: while a note plays, each
// modulated control moves with it (useLiveModulation, from the engine's
// own modulation maths), so the plot's lit frame travels through the table
// with Position, Position's ticks and Cutoff's and Res's arcs follow, and
// all settle back as the note ends. With nothing modulated they hold still.
//
// The dock shows the synth's main controls only; the rest (the sub, noise,
// tuning, unison, the second filter, envelopes, LFOs, modulation, FX, arp
// and routing) are the full synth's, a click away. And it fits the dock's
// height (synthCardLayout), hiding controls as the dock gets lower:
// 'compact' drops Warp, the warp mode and Res; 'tight' the plots too, each
// oscillator its table and Position in a line.

/** The card: the floating frame's device card. */
export const SYNTH_CARD_W = 528;
const OSC_W = 224;
/** The dock's corner buttons' width (Dock.tsx), kept clear of the row. */
const DOCK_CORNER_PX = 64;
const FILTER_W = 64;
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
  const live = useLiveModulation(engine);

  return (
    <div
      ref={rowRef}
      data-testid="synth-card-row"
      className="absolute inset-y-0 left-0 flex items-start gap-2 overflow-x-auto overflow-y-hidden p-2"
      // Short of the dock's Maximize and Close, which float in its corner:
      // no card slides under them.
      style={{ right: DOCK_CORNER_PX, scrollbarWidth: 'thin' }}
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
          <OscPanel
            index={0}
            engine={engine}
            color={color}
            layout={layout}
            live={live}
          />
          <FilterColumn color={color} layout={layout} live={live} />
          <OscPanel
            index={1}
            engine={engine}
            color={color}
            layout={layout}
            live={live}
          />
        </div>
      </section>
      <SourcesCard color={color} layout={layout} live={live} />
      <EnvelopesCard color={color} layout={layout} />
      <LfoCard engine={engine} color={color} layout={layout} />
      <ModCard color={color} layout={layout} />
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

// ── An oscillator ───────────────────────────────────────────────────────────

function OscPanel({
  index,
  engine,
  color,
  layout,
  live,
}: {
  index: 0 | 1;
  engine: SynthEngine;
  color: string;
  layout: SynthCardLayout;
  live: LiveModulation;
}) {
  const osc = useSynthStore((s) => s.oscillators[index]);
  // Where modulation has the table's position now, while a note plays.
  const positionOffset = useLiveValue(
    live,
    `${index === 0 ? 'osc1' : 'osc2'}:wtPos`,
  );
  const livePosition =
    positionOffset === undefined
      ? null
      : clamp(osc.wtPosition + positionOffset, 0, 1);
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
      live={livePosition}
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
            position={livePosition ?? osc.wtPosition}
            warpMode={osc.warpMode}
            warpAmount={osc.warpAmount}
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

/** The plot's top, clear of the oscillator's name; its side and foot. */
const PLOT_NAME_PX = 28;
const PLOT_INSET_PX = 8;
/** How many of a table's frames the stack draws. */
const STACK_LINES = 56;

// ── The wavetable plot ──────────────────────────────────────────────────────

/**
 * A table's frames as the oscillator plays them, for the plot: warped (a
 * phase warp's baked table, a distortion warp's curve on each sample),
 * without DC, and scaled as the bank plays them (each frame to full scale
 * for procedural tables, the table's own contour for imported ones).
 * Frames are made on first ask and kept for the plot's inputs.
 */
function displayFrames(
  engine: SynthEngine,
  table: string,
  warpMode: OscWarpMode,
  warpAmount: number,
): { count: number; frame(index: number): Float32Array } | null {
  const bank = engine.getWavetableBank();
  if (!bank) return null;
  const name = isPhaseWarp(warpMode)
    ? bank.resolveWarpedTable(table, warpMode, warpAmount)
    : table;
  const raw = bank.getDisplayFrames(name);
  if (!raw || raw.length === 0) return null;
  const curve = isDistortionWarp(warpMode)
    ? buildWarpCurve(warpMode, warpAmount)
    : null;
  const means = raw.map((f) => {
    let m = 0;
    for (let i = 0; i < f.length; i++) m += f[i];
    return m / (f.length || 1);
  });
  const peakOf = (i: number) => {
    let p = 0;
    const f = raw[i];
    for (let k = 0; k < f.length; k++)
      p = Math.max(p, Math.abs(f[k] - means[i]));
    return p;
  };
  let tablePeak = 0;
  const perFrame = bank.getDisplayScaling(name) === 'frame';
  if (!perFrame)
    for (let i = 0; i < raw.length; i++)
      tablePeak = Math.max(tablePeak, peakOf(i));
  const made = new Map<number, Float32Array>();
  return {
    count: raw.length,
    frame(index) {
      const i = Math.max(0, Math.min(raw.length - 1, index));
      let out = made.get(i);
      if (out) return out;
      const peak = perFrame ? peakOf(i) : tablePeak;
      const scale = peak > 0 ? 1 / peak : 1;
      const f = raw[i];
      out = new Float32Array(f.length);
      for (let k = 0; k < f.length; k++) {
        let v = (f[k] - means[i]) * scale;
        if (curve) {
          const x = Math.max(-1, Math.min(1, v));
          v = curve[Math.round(((x + 1) / 2) * (curve.length - 1))];
        }
        out[k] = v;
      }
      made.set(i, out);
      return out;
    },
  };
}

/** The screen's pixel density, following a move to another display. */
function useDevicePixelRatio(): number {
  const [dpr, setDpr] = useState(() =>
    typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(`(resolution: ${dpr}dppx)`);
    const onChange = () => setDpr(window.devicePixelRatio || 1);
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, [dpr]);
  return dpr;
}

/**
 * The table's frames drawn one behind the other, the first at the front
 * and each further one down and to the right, with the frame Position
 * plays lit white in its place in the stack; or one cycle of that frame
 * alone. A one-frame table is always that cycle, full size. Its buttons
 * switch the view and zoom the waves.
 *
 * The stack is drawn once to an offscreen layer when the table, warp, size
 * or view changes; a Position move (a knob, a note's modulation) only puts
 * that layer back and draws the lit frame. Each column of the plot draws
 * the frame's min and max over its samples, so a busy table's peaks show.
 */
function WavetablePlot({
  engine,
  table,
  position,
  warpMode,
  warpAmount,
  color,
  height,
  className,
}: {
  engine: SynthEngine;
  table: string;
  position: number;
  warpMode: OscWarpMode;
  warpAmount: number;
  color: string;
  height: number;
  className?: string;
}) {
  const width = 154;
  const [stack, setStack] = useState(true);
  const [zoom, setZoom] = useState(1);
  const ref = useRef<HTMLCanvasElement>(null);
  const dpr = useDevicePixelRatio();
  // A pack table asked for before its fetch finished draws when it lands.
  const framesVersion = useSyncExternalStore(
    subscribeFramesLoaded,
    getFramesVersion,
  );

  const frames = useMemo(
    () => displayFrames(engine, table, warpMode, warpAmount),
    // framesVersion: the same table, now loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [engine, table, warpMode, warpAmount, framesVersion],
  );
  const stacked = stack && !!frames && frames.count > 1;

  // Where each frame goes: the front one under the oscillator's name at
  // the left, each further one a little down and to the right.
  const geometry = useMemo(() => {
    const top = Math.min(PLOT_NAME_PX, height * 0.22);
    const usableH = height - top - PLOT_INSET_PX;
    const depthX = stacked ? width * 0.3 : 0;
    const depthY = stacked ? usableH * 0.34 : 0;
    const frameW = width - 2 * PLOT_INSET_PX - depthX;
    const waveH = usableH - depthY;
    const amp = Math.max(3, (waveH / 2) * (stacked ? 0.92 : 0.8) * zoom);
    return { top, depthX, depthY, frameW, waveH, amp };
  }, [stacked, height, zoom]);

  // A frame as the plot draws it: one point per 1.5 px, each the mean of
  // its samples, so a line is smooth at any table (the min and max of each
  // column drew a busy table as a wall of spikes).
  const points = useMemo(() => {
    const made = new Map<number, Float32Array>();
    const n = Math.max(16, Math.round(geometry.frameW / 1.5));
    return (index: number) => {
      let out = made.get(index);
      if (out || !frames) return out ?? new Float32Array(0);
      const frame = frames.frame(index);
      out = new Float32Array(n);
      const span = frame.length / n;
      for (let p = 0; p < n; p++) {
        const from = Math.floor(p * span);
        const to = Math.max(from + 1, Math.floor((p + 1) * span));
        let sum = 0;
        for (let k = from; k < to; k++) sum += frame[k];
        out[p] = sum / (to - from);
      }
      made.set(index, out);
      return out;
    };
  }, [frames, geometry.frameW]);

  const trace = (
    ctx: CanvasRenderingContext2D,
    wave: Float32Array,
    t: number,
  ) => {
    const { top, depthX, depthY, frameW, waveH, amp } = geometry;
    const x0 = PLOT_INSET_PX + t * depthX;
    const mid = top + waveH / 2 + t * depthY;
    ctx.beginPath();
    for (let p = 0; p < wave.length; p++) {
      const x = x0 + (p / (wave.length - 1)) * frameW;
      const y = mid - wave[p] * amp;
      if (p === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    return mid;
  };

  // The stack, once per table, warp, size or view: fine lines in the
  // track's colour, fading toward the back, drawn back to front.
  const layer = useMemo(() => {
    if (typeof document === 'undefined' || !frames || !stacked) return null;
    const off = document.createElement('canvas');
    off.width = Math.round(width * dpr);
    off.height = Math.round(height * dpr);
    const ctx = off.getContext('2d');
    if (!ctx) return null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = color;
    const count = Math.min(STACK_LINES, frames.count);
    for (let i = count - 1; i >= 0; i--) {
      const index = Math.round((i / (count - 1)) * (frames.count - 1));
      const t = index / (frames.count - 1);
      trace(ctx, points(index), t);
      ctx.globalAlpha = 0.14 + 0.36 * (1 - t);
      ctx.stroke();
    }
    return off;
    // trace reads geometry, which points follows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames, stacked, points, color, dpr, height]);

  // The canvas's bitmap follows its size and the screen's density only.
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }, [dpr, height]);

  // The layer, then the lit frame where Position has it: white, with a
  // soft glow in the track's colour. On its own (one cycle, or a one-frame
  // table) it stands over a fill fading down to its midline.
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (!frames) return;
    if (layer) ctx.drawImage(layer, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const index = Math.round(position * (frames.count - 1));
    const t = stacked ? index / (frames.count - 1) : 0;
    const wave = points(index);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (!stacked) {
      const mid = trace(ctx, wave, t);
      const x0 = PLOT_INSET_PX;
      const x1 = x0 + geometry.frameW;
      ctx.lineTo(x1, mid);
      ctx.lineTo(x0, mid);
      ctx.closePath();
      const fill = ctx.createLinearGradient(0, mid - geometry.amp, 0, mid);
      fill.addColorStop(0, color);
      fill.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = COLOR.text.value;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0, mid);
      ctx.lineTo(x1, mid);
      ctx.stroke();
    }
    trace(ctx, wave, t);
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 8 * dpr;
    ctx.strokeStyle = COLOR.text.value;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    // trace reads geometry. A new height clears the bitmap (the effect
    // above), so it redraws then too, even with no stack layer to follow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames, layer, points, position, stacked, dpr, color, geometry, height]);

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
  live,
}: {
  color: string;
  layout: SynthCardLayout;
  live: LiveModulation;
}) {
  const filter = useSynthStore((s) => s.filters[0]);
  // The matrix moves the cutoff in cents and the resonance in Q.
  const cents = useLiveValue(live, 'flt1:cutoff');
  const liveCutoff =
    cents === undefined
      ? null
      : clamp(filter.cutoff * 2 ** (cents / 1200), 20, 20000);
  const q = useLiveValue(live, 'flt1:resonance');
  const liveRes = q === undefined ? null : clamp(filter.resonance + q, 0, 30);
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
          live={liveCutoff}
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
            live={liveRes}
            onChange={(v) => setParam(0, 'resonance', v)}
          />
        </KnobTile>
      ) : null}
    </div>
  );
}
