import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/components/utilities';
import { LFOWaveformBuilder } from '@/daw/oracle-synth/audio/LFOWaveformBuilder';
import type { SynthEngine } from '@/daw/oracle-synth/audio/SynthEngine';
import type {
  BasicWaveform,
  EnvelopeParams,
  FilterType,
  ModRoute,
  RateDiv,
} from '@/daw/oracle-synth/audio/types';
import {
  detectLfoShape,
  LFO_RATES,
  LFO_SHAPES,
  lfoPattern,
  type LfoShape,
} from '@/daw/oracle-synth/components/modules/lfoShapes';
import { useSynthStore } from '@/daw/oracle-synth/store';
import { useStore } from '@/daw/store';
import { Segmented } from '@/daw/ui/Segmented';
import { Select } from '@/daw/ui/Select';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { Toggle } from '@/daw/ui/Toggle';
import { useSliderControl } from '@/daw/ui/useSliderControl';
import { DeviceKnob } from './DeviceKnob';
import {
  CARD_SELECT,
  clamp,
  formatHz,
  HEADER_PX,
  KnobTile,
  PAD_PX,
  SELECT_H,
  sentenceCase,
  TILE_PX,
  useLiveValue,
  useModulated,
  type LiveModulation,
  type SynthCardLayout,
} from './synthDockKit';

// ── The rest of the synth in the dock (owner, 2026-10-21) ───────────────────
//
// Beside the Synth card (oscillators and the filter), the row carries the
// synth's other sections as cards of the same make: a device card (white/4,
// radius 10) with a 32 px header, and panels (white/4, 2 px in, radius 8)
// with their name, or on switch and name, in the top corner.
//
//   Sub · Noise · Filter 2   each layer's level and pan, the sub's wave and
//                            octave, noise's colour; the second filter's
//                            cutoff, resonance, mix and type, and whether
//                            Filter 1 runs into it
//   Envelopes                the amp and mod envelopes, drawn, with their
//                            attack, decay, sustain and release
//   LFO                      one of four at a time: its shape over the four
//                            bars with a playhead, shape, rate, smoothing,
//                            one-shot, and what it moves
//   Macros & modulation      the eight macros, and every route with its
//                            amount and on switch
//
// They fit the dock's height by the room each panel has (panelFit): the
// drawings and selects stay while they fit, and the knobs shrink a little
// before anything goes. In a tall dock the whole row zooms (cardZoom).
// The full synth (the card header's expand button) edits the rest: drawn
// LFOs, routes' sources and targets, tuning.

/** A card's width for its panels, with the padding at both sides. */
const cardWidth = (...panels: number[]) =>
  panels.reduce((sum, w) => sum + w, 0) + 2 * PAD_PX;

/** The panel's name row. */
const NAME_PX = 32;

const percent = (v: number) => `${Math.round(v * 100)}%`;
const pan = (v: number) =>
  Math.abs(v) < 0.005
    ? 'C'
    : `${Math.round(Math.abs(v) * 100)}${v < 0 ? 'L' : 'R'}`;
const seconds = (v: number) =>
  v < 1 ? `${Math.round(v * 1000)}ms` : `${v.toFixed(v < 10 ? 2 : 1)}s`;

// ── The card and its panels ─────────────────────────────────────────────────

function DockCard({
  title,
  width,
  layout,
  aside,
  testId,
  children,
}: {
  title: string;
  width: number;
  layout: SynthCardLayout;
  aside?: ReactNode;
  testId: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      data-testid={testId}
      data-mode={layout.mode}
      className="relative shrink-0 overflow-hidden rounded-[var(--daw-radius-card)] bg-daw-device"
      style={{ width, height: layout.cardH }}
    >
      <header
        className="flex items-center justify-between gap-2 px-3"
        style={{ height: HEADER_PX }}
      >
        <h3 className={cn(TYPE_CLASS.body, 'truncate leading-5 text-daw-text')}>
          {title}
        </h3>
        {aside}
      </header>
      <div
        className="absolute flex"
        style={{ left: PAD_PX, top: HEADER_PX + PAD_PX }}
      >
        {children}
      </div>
    </section>
  );
}

/**
 * A panel: its name (with an on switch when it has one) in the top corner,
 * an optional control at the other, and its body under them. A switched-off
 * panel dims all but its switch.
 */
function Panel({
  name,
  width,
  height,
  color,
  on,
  onToggle,
  action,
  testId,
  children,
}: {
  name: string;
  width: number;
  height: number;
  color: string;
  on?: boolean;
  onToggle?: () => void;
  action?: ReactNode;
  testId?: string;
  children: ReactNode;
}) {
  const nameClass =
    'absolute left-0 top-0 flex h-8 items-center gap-1 rounded-[var(--daw-radius-md)] px-2 text-[11px] font-bold leading-4 text-daw-text';
  return (
    <div
      role="group"
      aria-label={name}
      data-testid={testId}
      className="relative shrink-0"
      style={{ width, height }}
    >
      <span
        aria-hidden
        className="absolute inset-[2px] rounded-lg bg-daw-device"
      />
      <div
        className={cn(
          'absolute inset-x-[2px] bottom-[2px]',
          on === false && 'opacity-50',
        )}
        style={{ top: NAME_PX }}
      >
        {children}
      </div>
      {onToggle ? (
        <button
          type="button"
          aria-pressed={on}
          aria-label={`${name} on`}
          onClick={onToggle}
          className={cn(nameClass, TRANSITION, FOCUS_RING)}
        >
          <span
            aria-hidden
            className="size-2.5 rounded-full border border-daw-text-3"
            style={{
              backgroundColor: on ? color : 'transparent',
              borderColor: on ? color : undefined,
            }}
          />
          {name}
        </button>
      ) : (
        <span className={nameClass}>{name}</span>
      )}
      {action ? (
        <div className="absolute right-1.5 top-1 flex h-6 items-center">
          {action}
        </div>
      ) : null}
    </div>
  );
}

/** A device knob's height with its name, for a knob `size` across. */
const knobHeight = (size: number) => size - Math.round((6 * size) / 37) + 15;

/** The largest knob from `max` down to 22 whose height fits `room`. */
function knobFor(room: number, max = 37): number {
  for (let size = max; size > 22; size--) {
    if (knobHeight(size) <= room) return size;
  }
  return 22;
}

/**
 * How a panel's knobs and selects fit its body: the selects stay while a
 * 30 px knob still fits over them, and the knobs take the room there is,
 * 37 at most. Decided by the room, not the card's mode, so nothing goes
 * that would still fit (owner, 2026-10-22: scale correctly in the dock).
 */
interface PanelFit {
  selects: boolean;
  /** The knob tiles' height over the selects (or the whole body). */
  tileH: number;
  knob: number;
}

function panelFit(layout: SynthCardLayout): PanelFit {
  const overSelects = layout.bodyH - NAME_PX - SELECT_H - 4;
  const selects = overSelects >= knobHeight(30) + 2;
  const room = selects ? overSelects : layout.bodyH - NAME_PX - 2;
  return {
    selects,
    tileH: Math.min(TILE_PX, room),
    knob: knobFor(room - 6),
  };
}

/** A row of knob tiles over a panel's selects, centred in the room. */
function TileRow({
  layout,
  children,
}: {
  layout: SynthCardLayout;
  children: ReactNode;
}) {
  const fit = panelFit(layout);
  const height = fit.selects
    ? layout.bodyH - NAME_PX - SELECT_H - 4
    : layout.bodyH - NAME_PX - 2;
  return (
    <div
      className="absolute left-0 top-0 flex items-center justify-center"
      style={{ right: 0, height }}
    >
      {children}
    </div>
  );
}

/** The selects along a panel's foot, while they fit (panelFit). */
function SelectRow({
  layout,
  children,
}: {
  layout: SynthCardLayout;
  children: ReactNode;
}) {
  if (!panelFit(layout).selects) return null;
  return (
    <div
      className="absolute inset-x-0 bottom-0 flex gap-0.5"
      style={{ height: SELECT_H }}
    >
      {children}
    </div>
  );
}

/** A panel knob's size (panelFit). */
const knobSize = (layout: SynthCardLayout) => panelFit(layout).knob;

/** A knob tile's height in a TileRow, the knob 6 px from its top. */
const tileHeight = (layout: SynthCardLayout) => panelFit(layout).tileH;

// ── Sub · Noise · Filter 2 ─────────────────────────────────────────────────

const SUB_W = 136;
const NOISE_W = 136;
const FILTER2_W = 200;
export const SOURCES_CARD_W = cardWidth(SUB_W, NOISE_W, FILTER2_W);

const WAVES: { value: BasicWaveform; label: string }[] = [
  { value: 'sine', label: 'Sine' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'sawtooth', label: 'Saw' },
  { value: 'square', label: 'Square' },
];
const SUB_OCTAVES = [
  { value: '0', label: 'Oct 0' },
  { value: '-1', label: 'Oct −1' },
  { value: '-2', label: 'Oct −2' },
];
const NOISE_TYPES = [
  { value: 'white', label: 'White' },
  { value: 'pink', label: 'Pink' },
];
const FILTER_TYPES: { value: FilterType; label: string }[] = [
  { value: 'lowpass', label: 'Low pass' },
  { value: 'highpass', label: 'High pass' },
  { value: 'bandpass', label: 'Band pass' },
  { value: 'notch', label: 'Notch' },
  { value: 'allpass', label: 'All pass' },
  { value: 'peaking', label: 'Peak' },
  { value: 'lowshelf', label: 'Low shelf' },
  { value: 'highshelf', label: 'High shelf' },
];

/** A layer's level and pan as modulation has them now. */
function useLiveLevelPan(
  live: LiveModulation,
  source: 'sub' | 'noise',
  level: number,
  panValue: number,
) {
  const levelOffset = useLiveValue(live, `${source}:level`);
  const panOffset = useLiveValue(live, `${source}:pan`);
  return {
    level: levelOffset === undefined ? null : clamp(level + levelOffset, 0, 1),
    pan: panOffset === undefined ? null : clamp(panValue + panOffset, -1, 1),
  };
}

export function SourcesCard({
  color,
  layout,
  live,
}: {
  color: string;
  layout: SynthCardLayout;
  live: LiveModulation;
}) {
  const sub = useSynthStore((s) => s.subOscillator);
  const setSub = useSynthStore((s) => s.setSubParam);
  const noise = useSynthStore((s) => s.noise);
  const setNoise = useSynthStore((s) => s.setNoiseParam);
  const filter = useSynthStore((s) => s.filters[1]);
  const setFilter = useSynthStore((s) => s.setFilterParam);
  const setFilterType = useSynthStore((s) => s.setFilterType);
  const serial = useSynthStore((s) => s.routing.filterRouting.serial ?? false);
  const setSerial = useSynthStore((s) => s.setFilterSerial);
  const subLive = useLiveLevelPan(live, 'sub', sub.level, sub.pan);
  const noiseLive = useLiveLevelPan(live, 'noise', noise.level, noise.pan);
  const cents = useLiveValue(live, 'flt2:cutoff');
  const q = useLiveValue(live, 'flt2:resonance');
  const subLevelMod = useModulated('sub', 'level');
  const noiseLevelMod = useModulated('noise', 'level');
  const cutoffMod = useModulated('flt2', 'cutoff');
  const resMod = useModulated('flt2', 'resonance');
  const size = knobSize(layout);
  const tileH = tileHeight(layout);
  const panelH = layout.bodyH;

  return (
    <DockCard
      title="Sub · Noise · Filter 2"
      width={SOURCES_CARD_W}
      layout={layout}
      testId="synth-sources-card"
    >
      <Panel
        name="Sub"
        width={SUB_W}
        height={panelH}
        color={color}
        on={sub.enabled}
        onToggle={() => setSub('enabled', !sub.enabled)}
      >
        <TileRow layout={layout}>
          <KnobTile height={tileH} top={6} modulated={subLevelMod}>
            <DeviceKnob
              label="Level"
              value={sub.level}
              min={0}
              max={1}
              step={0.01}
              resetValue={0.5}
              size={size}
              color={color}
              live={subLive.level}
              format={percent}
              onChange={(v) => setSub('level', v)}
            />
          </KnobTile>
          <KnobTile height={tileH} top={6} modulated={false}>
            <DeviceKnob
              label="Pan"
              bipolar
              value={sub.pan}
              min={-1}
              max={1}
              step={0.01}
              resetValue={0}
              size={size}
              color={color}
              live={subLive.pan}
              format={pan}
              onChange={(v) => setSub('pan', v)}
            />
          </KnobTile>
        </TileRow>
        <SelectRow layout={layout}>
          <div className="min-w-0 flex-1">
            <Select
              label="Sub wave"
              options={WAVES}
              value={sub.waveform}
              onValueChange={(v) => setSub('waveform', v as BasicWaveform)}
              className={CARD_SELECT}
            />
          </div>
          <div className="min-w-0 flex-1">
            <Select
              label="Sub octave"
              options={SUB_OCTAVES}
              value={String(sub.octave)}
              onValueChange={(v) => setSub('octave', Number(v))}
              className={CARD_SELECT}
            />
          </div>
        </SelectRow>
      </Panel>

      <Panel
        name="Noise"
        width={NOISE_W}
        height={panelH}
        color={color}
        on={noise.enabled}
        onToggle={() => setNoise('enabled', !noise.enabled)}
      >
        <TileRow layout={layout}>
          <KnobTile height={tileH} top={6} modulated={noiseLevelMod}>
            <DeviceKnob
              label="Level"
              value={noise.level}
              min={0}
              max={1}
              step={0.01}
              resetValue={0.3}
              size={size}
              color={color}
              live={noiseLive.level}
              format={percent}
              onChange={(v) => setNoise('level', v)}
            />
          </KnobTile>
          <KnobTile height={tileH} top={6} modulated={false}>
            <DeviceKnob
              label="Pan"
              bipolar
              value={noise.pan}
              min={-1}
              max={1}
              step={0.01}
              resetValue={0}
              size={size}
              color={color}
              live={noiseLive.pan}
              format={pan}
              onChange={(v) => setNoise('pan', v)}
            />
          </KnobTile>
        </TileRow>
        <SelectRow layout={layout}>
          <Select
            label="Noise colour"
            options={NOISE_TYPES}
            value={noise.type}
            onValueChange={(v) => setNoise('type', v as 'white' | 'pink')}
            className={CARD_SELECT}
          />
        </SelectRow>
      </Panel>

      <Panel
        name="Filter 2"
        width={FILTER2_W}
        height={panelH}
        color={color}
        on={filter.enabled}
        onToggle={() => setFilter(1, 'enabled', !filter.enabled)}
        action={
          <Toggle
            label="Run Filter 1 into Filter 2"
            size="sm"
            pressed={serial}
            onPressedChange={setSerial}
            className="text-[11px]"
          >
            1 → 2
          </Toggle>
        }
      >
        <TileRow layout={layout}>
          <KnobTile height={tileH} top={6} modulated={cutoffMod}>
            <DeviceKnob
              label="Cutoff"
              value={filter.cutoff}
              min={20}
              max={20000}
              step={1}
              scale="log"
              resetValue={20000}
              size={size}
              color={color}
              live={
                cents === undefined
                  ? null
                  : clamp(filter.cutoff * 2 ** (cents / 1200), 20, 20000)
              }
              format={formatHz}
              onChange={(v) => setFilter(1, 'cutoff', v)}
            />
          </KnobTile>
          <KnobTile height={tileH} top={6} modulated={resMod}>
            <DeviceKnob
              label="Res"
              value={filter.resonance}
              min={0}
              max={30}
              step={0.1}
              resetValue={0}
              size={size}
              color={color}
              live={q === undefined ? null : clamp(filter.resonance + q, 0, 30)}
              onChange={(v) => setFilter(1, 'resonance', v)}
            />
          </KnobTile>
          <KnobTile height={tileH} top={6} modulated={false}>
            <DeviceKnob
              label="Mix"
              value={filter.mix}
              min={0}
              max={1}
              step={0.01}
              resetValue={1}
              size={size}
              color={color}
              format={percent}
              onChange={(v) => setFilter(1, 'mix', v)}
            />
          </KnobTile>
        </TileRow>
        <SelectRow layout={layout}>
          <Select
            label="Filter 2 type"
            options={FILTER_TYPES}
            value={filter.type}
            onValueChange={(v) => setFilterType(1, v as FilterType)}
            className={CARD_SELECT}
          />
        </SelectRow>
      </Panel>
    </DockCard>
  );
}

// ── Envelopes ───────────────────────────────────────────────────────────────

const ENV_W = 240;
export const ENVELOPES_CARD_W = cardWidth(ENV_W, ENV_W);
/** The knob row under the drawing: 30 px knobs and their names. */
const ENV_KNOB = 30;
const ENV_ROW_PX = 44;

/**
 * An envelope drawn: the attack up, the decay down to the sustain, a held
 * stretch, then the release, each stage's width growing with the square
 * root of its time (so a 5 ms attack and a 2 s one both read), filled to
 * the floor in the track's colour.
 */
function EnvelopeCurve({
  env,
  width,
  height,
  color,
}: {
  env: EnvelopeParams;
  width: number;
  height: number;
  color: string;
}) {
  const gradient = useId();
  const pad = 6;
  const w = width - 2 * pad;
  const h = height - 2 * pad;
  const a = Math.sqrt(env.attack / 5) * 0.26;
  const d = Math.sqrt(env.decay / 5) * 0.26;
  const r = Math.sqrt(env.release / 10) * 0.3;
  const hold = 0.18;
  // The stages fill the width; a very short envelope keeps some air.
  const span = Math.max(0.55, a + d + hold + r);
  const x = (t: number) => pad + (t / span) * w;
  const y = (v: number) => pad + (1 - v) * h;
  const xa = x(a);
  const xd = x(a + d);
  const xs = x(a + d + hold);
  const xr = x(a + d + hold + r);
  const sy = y(env.sustain);
  // Each fall bows toward its target, as an exponential does.
  const line = [
    `M ${x(0)} ${y(0)}`,
    `Q ${x(a * 0.4)} ${y(0.85)} ${xa} ${y(1)}`,
    `Q ${xa + (xd - xa) * 0.25} ${sy} ${xd} ${sy}`,
    `L ${xs} ${sy}`,
    `Q ${xs + (xr - xs) * 0.2} ${y(0)} ${xr} ${y(0)}`,
  ].join(' ');
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      data-testid="synth-envelope-curve"
    >
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity={0.4} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <line
        x1={pad}
        x2={width - pad}
        y1={y(0)}
        y2={y(0)}
        stroke="var(--daw-hairline)"
      />
      <path d={`${line} L ${x(0)} ${y(0)} Z`} fill={`url(#${gradient})`} />
      <path
        d={line}
        fill="none"
        stroke="var(--daw-text)"
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
      {[
        [xa, y(1)],
        [xd, sy],
        [xs, sy],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={2.5} fill="var(--daw-text)" />
      ))}
    </svg>
  );
}

function EnvelopePanel({
  index,
  color,
  layout,
}: {
  index: 0 | 1;
  color: string;
  layout: SynthCardLayout;
}) {
  const env = useSynthStore((s) => s.envelopes[index]);
  const setEnv = useSynthStore((s) => s.setEnvParam);
  const size = knobFor(layout.bodyH - NAME_PX - 4, ENV_KNOB);
  const curveH = layout.bodyH - NAME_PX - ENV_ROW_PX - 4;
  const knob = (
    label: string,
    param: keyof EnvelopeParams,
    max: number,
    reset: number,
    format: (v: number) => string,
    min = 0.001,
  ) => (
    <DeviceKnob
      label={label}
      value={env[param]}
      min={min}
      max={max}
      step={param === 'sustain' ? 0.01 : 0.001}
      scale={param === 'sustain' ? undefined : 'log'}
      resetValue={reset}
      size={size}
      color={color}
      format={format}
      onChange={(v) => setEnv(index, param, v)}
    />
  );
  return (
    <Panel
      name={index === 0 ? 'Amp envelope' : 'Mod envelope'}
      width={ENV_W}
      height={layout.bodyH}
      color={color}
      testId={`synth-envelope-${index + 1}`}
    >
      {curveH >= 24 ? (
        <div className="absolute left-1 top-0">
          <EnvelopeCurve
            env={env}
            width={ENV_W - 12}
            height={curveH}
            color={color}
          />
        </div>
      ) : null}
      <div className="absolute inset-x-0 bottom-1 flex justify-around">
        {knob('Attack', 'attack', 5, 0.01, seconds)}
        {knob('Decay', 'decay', 5, 0.2, seconds)}
        {knob('Sustain', 'sustain', 1, 0.7, percent, 0)}
        {knob('Release', 'release', 10, 0.3, seconds)}
      </div>
    </Panel>
  );
}

export function EnvelopesCard({
  color,
  layout,
}: {
  color: string;
  layout: SynthCardLayout;
}) {
  return (
    <DockCard
      title="Envelopes"
      width={ENVELOPES_CARD_W}
      layout={layout}
      testId="synth-envelopes-card"
    >
      <EnvelopePanel index={0} color={color} layout={layout} />
      <EnvelopePanel index={1} color={color} layout={layout} />
    </DockCard>
  );
}

// ── LFO ─────────────────────────────────────────────────────────────────────

const LFO_W = 316;
const MOVES_W = 140;
export const LFO_CARD_W = cardWidth(LFO_W, MOVES_W);
/** The drawing's width; the Smooth tile and the Once switch at its right. */
const LFO_PLOT_W = LFO_W - 4 - TILE_PX - 8;

/**
 * The LFO's four bars drawn as the engine builds them (the shape, then
 * each bar's smoothing), filled in the track's colour, the bars split by
 * hairlines, and a playhead where the loop is now. The playhead moves by
 * itself, outside React.
 */
function LfoPlot({
  engine,
  index,
  width,
  height,
  color,
}: {
  engine: SynthEngine;
  index: number;
  width: number;
  height: number;
  color: string;
}) {
  const lfo = useSynthStore((s) => s.lfos[index]);
  const gradient = useId();
  const head = useRef<SVGGElement>(null);
  const pad = 4;
  const w = width - 2 * pad;
  const h = height - 2 * pad;
  const line = useMemo(() => {
    const perBar = 64;
    const pts: string[] = [];
    lfo.bars.forEach((bar, b) => {
      const samples = LFOWaveformBuilder.buildBar(bar, perBar, lfo.smooths[b]);
      samples.forEach((v, i) => {
        const x = pad + ((b * perBar + i) / (4 * perBar - 1)) * w;
        const y = pad + (1 - v) * h;
        pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      });
    });
    return pts;
  }, [lfo.bars, lfo.smooths, w, h]);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 33) return;
      last = t;
      const phase = engine.getLFO(index)?.phaseNow() ?? null;
      const g = head.current;
      if (!g) return;
      g.style.opacity = phase === null ? '0' : '1';
      if (phase !== null)
        g.setAttribute('transform', `translate(${pad + phase * w} 0)`);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine, index, w]);

  const path = `M ${line.join(' L ')}`;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      data-testid="synth-lfo-plot"
    >
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity={0.38} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {[1, 2, 3].map((b) => (
        <line
          key={b}
          x1={pad + (b / 4) * w}
          x2={pad + (b / 4) * w}
          y1={pad}
          y2={height - pad}
          stroke="var(--daw-hairline)"
        />
      ))}
      <path
        d={`${path} L ${pad + w} ${pad + h} L ${pad} ${pad + h} Z`}
        fill={`url(#${gradient})`}
      />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 3px ${color})` }}
      />
      <g ref={head} style={{ opacity: 0 }}>
        <line
          x1={0}
          x2={0}
          y1={pad}
          y2={height - pad}
          stroke="var(--daw-text)"
          strokeOpacity={0.5}
        />
      </g>
    </svg>
  );
}

/** A route's target in words ('Filter 1 cutoff'). */
const TARGET_NAMES: Record<string, string> = {
  osc1: 'Osc 1',
  osc2: 'Osc 2',
  sub: 'Sub',
  noise: 'Noise',
  flt1: 'Filter 1',
  flt2: 'Filter 2',
};
const PARAM_NAMES: Record<string, string> = {
  mix: 'mix',
  pan: 'pan',
  detune: 'fine',
  pitch: 'pitch',
  blend: 'blend',
  cutoff: 'cutoff',
  resonance: 'res',
  level: 'level',
  wtPos: 'position',
  gain: 'gain',
};
const targetName = (r: ModRoute) =>
  `${TARGET_NAMES[r.target.source] ?? r.target.source} ${
    PARAM_NAMES[r.target.param] ?? r.target.param
  }`;

/** A route's source in words ('LFO 2', 'Mod envelope', 'Macro 3'). */
function sourceName(r: ModRoute, macroNames: string[]): string {
  const i = r.source.index;
  switch (r.source.type) {
    case 'lfo':
      return `LFO ${i + 1}`;
    case 'envelope':
      return i === 0 ? 'Amp env' : 'Mod env';
    case 'macro':
      return macroNames[i] || `Macro ${i + 1}`;
    case 'velocity':
      return 'Velocity';
    case 'keytrack':
      return 'Note';
    case 'modwheel':
      return 'Mod wheel';
    case 'audio':
      return 'Audio';
    default:
      return String(r.source.type);
  }
}

export function LfoCard({
  engine,
  color,
  layout,
}: {
  engine: SynthEngine;
  color: string;
  layout: SynthCardLayout;
}) {
  const [index, setIndex] = useState(0);
  const lfo = useSynthStore((s) => s.lfos[index]);
  const setPattern = useSynthStore((s) => s.setLFOPattern);
  const setSmooth = useSynthStore((s) => s.setLFOBarSmooth);
  const setOnce = useSynthStore((s) => s.setLFOOnce);
  const routes = useSynthStore((s) => s.modRoutes);
  const moves = routes.filter(
    (r) => r.enabled && r.source.type === 'lfo' && r.source.index === index,
  );
  const detected = detectLfoShape(lfo);
  const smooth = lfo.smooths[0];
  const fit = panelFit(layout);
  const plotH = layout.bodyH - NAME_PX - (fit.selects ? SELECT_H + 6 : 4);

  const pick = (shape: LfoShape | null, rate: RateDiv | null) => {
    const s = shape ?? detected?.shape ?? 'triangle';
    const r = rate ?? detected?.rate ?? '1/4';
    setPattern(index, lfoPattern(s, r));
  };

  return (
    <DockCard
      title="LFO"
      width={LFO_CARD_W}
      layout={layout}
      testId="synth-lfo-card"
      aside={
        <Segmented
          label="Which LFO"
          options={[0, 1, 2, 3].map((i) => ({
            value: String(i),
            label: String(i + 1),
            testId: `synth-lfo-${i + 1}`,
          }))}
          value={String(index)}
          onValueChange={(v) => setIndex(Number(v))}
        />
      }
    >
      <Panel
        name={`LFO ${index + 1}`}
        width={LFO_W}
        height={layout.bodyH}
        color={color}
        action={
          <Toggle
            label="Play once from each note"
            size="sm"
            pressed={lfo.once ?? false}
            onPressedChange={(on) => setOnce(index, on)}
            className="text-[11px]"
          >
            Once
          </Toggle>
        }
      >
        {plotH >= 24 ? (
          <div className="absolute left-1 top-0">
            <LfoPlot
              engine={engine}
              index={index}
              width={LFO_PLOT_W}
              height={plotH}
              color={color}
            />
          </div>
        ) : null}
        <div className="absolute top-0" style={{ right: 4, width: TILE_PX }}>
          <KnobTile height={tileHeight(layout)} top={6} modulated={false}>
            <DeviceKnob
              label="Smooth"
              value={smooth}
              min={0}
              max={1}
              step={0.01}
              resetValue={0}
              size={knobSize(layout)}
              color={color}
              format={percent}
              onChange={(v) => {
                for (let bar = 0; bar < 4; bar++) setSmooth(index, bar, v);
              }}
            />
          </KnobTile>
        </div>
        <SelectRow layout={layout}>
          <div className="min-w-0 flex-[3]">
            <Select
              label={`LFO ${index + 1} shape`}
              options={LFO_SHAPES}
              value={detected?.shape ?? ''}
              placeholder="Drawn"
              onValueChange={(v) => pick(v as LfoShape, null)}
              className={CARD_SELECT}
            />
          </div>
          <div className="min-w-0 flex-[2]">
            <Select
              label={`LFO ${index + 1} rate`}
              options={LFO_RATES}
              value={detected?.rate ?? ''}
              placeholder="Drawn"
              onValueChange={(v) => pick(null, v as RateDiv)}
              className={CARD_SELECT}
            />
          </div>
        </SelectRow>
      </Panel>
      <Panel
        name="Moves"
        width={MOVES_W}
        height={layout.bodyH}
        color={color}
        testId="synth-lfo-moves"
      >
        <ul className="absolute inset-x-2 top-0 flex flex-col gap-1 overflow-hidden">
          {moves.length === 0 ? (
            <li className="text-[11px] leading-4 text-daw-text-3">
              Nothing yet. Route it in the full synth.
            </li>
          ) : (
            moves.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-1 rounded-md bg-daw-device px-1.5 py-1 text-[11px] leading-4 text-daw-text"
              >
                <span className="truncate">{targetName(r)}</span>
                <span className="shrink-0 text-daw-text-3">
                  {percent(Math.abs(r.amount))}
                </span>
              </li>
            ))
          )}
        </ul>
      </Panel>
    </DockCard>
  );
}

// ── Macros & modulation ─────────────────────────────────────────────────────

const MACROS_W = 248;
const ROUTES_W = 288;
export const MOD_CARD_W = cardWidth(MACROS_W, ROUTES_W);
const MACRO_KNOB = 30;

/**
 * A route's amount: a bipolar bar from its middle, dragged sideways (Shift
 * for fine, double-click for none), with the arrows on the keys.
 */
function AmountBar({
  route,
  color,
  onChange,
}: {
  route: ModRoute;
  color: string;
  onChange: (amount: number) => void;
}) {
  const width = 64;
  const { dragging, handlers } = useSliderControl({
    value: route.amount,
    min: -1,
    max: 1,
    step: 0.01,
    resetValue: 0,
    axis: 'horizontal',
    travelPx: width,
    onChange,
  });
  const half = width / 2;
  const fill = Math.abs(route.amount) * half;
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <span
        aria-hidden
        className="w-8 text-right text-[11px] tabular-nums leading-4 text-daw-text-3"
      >
        {percent(route.amount)}
      </span>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Amount"
        aria-valuemin={-1}
        aria-valuemax={1}
        aria-valuenow={route.amount}
        aria-valuetext={percent(route.amount)}
        data-dragging={dragging || undefined}
        title={`Amount: ${percent(route.amount)}`}
        className={cn(
          'relative h-5 shrink-0 cursor-ew-resize touch-none rounded-md',
          FOCUS_RING,
        )}
        style={{ width }}
        {...handlers}
      >
        {/* A 6 px bar in a 20 px grip. */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-daw-knob-track"
        />
        <span
          aria-hidden
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
          style={{
            left: route.amount >= 0 ? half : half - fill,
            width: fill,
            backgroundColor: color,
            opacity: route.enabled ? 1 : 0.4,
          }}
        />
        <span
          aria-hidden
          className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-daw-text-3"
          style={{ left: half }}
        />
      </div>
    </div>
  );
}

export function ModCard({
  color,
  layout,
}: {
  color: string;
  layout: SynthCardLayout;
}) {
  const macros = useSynthStore((s) => s.macros);
  const setMacro = useSynthStore((s) => s.setMacroValue);
  const routes = useSynthStore((s) => s.modRoutes);
  const updateRoute = useSynthStore((s) => s.updateModRoute);
  const setMaximized = useStore((s) => s.setDockMaximized);
  const macroNames = macros.map((m) => m.name);
  // Two rows of four, their knobs as big as fits (30 at most); one row of
  // four in a dock too low for two of even 22 px knobs.
  const room = layout.bodyH - NAME_PX - 4;
  const twoRows = knobFor((room - 4) / 2, MACRO_KNOB);
  const shown = knobHeight(twoRows) * 2 + 4 <= room ? 8 : 4;
  const macroKnob = shown === 8 ? twoRows : knobFor(room, MACRO_KNOB);

  return (
    <DockCard
      title="Macros & modulation"
      width={MOD_CARD_W}
      layout={layout}
      testId="synth-mod-card"
    >
      <Panel name="Macros" width={MACROS_W} height={layout.bodyH} color={color}>
        <div className="absolute inset-0 grid grid-cols-4 content-center gap-y-1">
          {macros.slice(0, shown).map((m, i) => (
            <div key={i} className="flex justify-center">
              <DeviceKnob
                label={sentenceCase(m.name) || `Macro ${i + 1}`}
                value={m.value}
                min={0}
                max={1}
                step={0.01}
                resetValue={0}
                size={macroKnob}
                color={color}
                format={percent}
                className="max-w-[58px] [&>span]:min-w-0 [&>span]:max-w-[58px] [&>span]:truncate"
                onChange={(v) => setMacro(i, v)}
              />
            </div>
          ))}
        </div>
      </Panel>
      <Panel
        name={`Modulation · ${routes.length}`}
        width={ROUTES_W}
        height={layout.bodyH}
        color={color}
        testId="synth-mod-routes"
        action={
          <button
            type="button"
            onClick={() => setMaximized(true)}
            className={cn(
              'h-6 rounded-full px-2 text-[11px] font-bold text-daw-text-2 hover:bg-daw-hover hover:text-daw-text',
              TRANSITION,
              FOCUS_RING,
            )}
          >
            Edit
          </button>
        }
      >
        <ul
          className="absolute inset-x-1.5 bottom-1 top-0 flex flex-col gap-0.5 overflow-y-auto"
          style={{ scrollbarWidth: 'thin' }}
        >
          {routes.length === 0 ? (
            <li className="px-1 text-[11px] leading-4 text-daw-text-3">
              No routes. Edit opens the full synth to add one.
            </li>
          ) : (
            routes.map((r) => (
              <li
                key={r.id}
                data-testid="synth-mod-route"
                className="flex h-7 shrink-0 items-center gap-1.5 rounded-md px-1 hover:bg-daw-device"
              >
                <button
                  type="button"
                  aria-pressed={r.enabled}
                  aria-label={`${sourceName(r, macroNames)} to ${targetName(r)} on`}
                  onClick={() => updateRoute(r.id, { enabled: !r.enabled })}
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full',
                    FOCUS_RING,
                  )}
                >
                  <span
                    aria-hidden
                    className="size-2 rounded-full border border-daw-text-3"
                    style={{
                      backgroundColor: r.enabled ? color : 'transparent',
                      borderColor: r.enabled ? color : undefined,
                    }}
                  />
                </button>
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-[11px] leading-4',
                    r.enabled ? 'text-daw-text' : 'text-daw-text-3',
                  )}
                >
                  {sourceName(r, macroNames)}
                  <span className="text-daw-text-3"> → </span>
                  {targetName(r)}
                </span>
                <AmountBar
                  route={r}
                  color={color}
                  onChange={(amount) => updateRoute(r.id, { amount })}
                />
              </li>
            ))
          )}
        </ul>
      </Panel>
    </DockCard>
  );
}
