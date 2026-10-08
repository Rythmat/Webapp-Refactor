import { useEffect, useRef, type HTMLAttributes } from 'react';
import { cn } from '@/components/utilities';
import { formatDb, gainToDb } from './format';
import { TYPE_CLASS } from './styles';
import { getDawPalette } from './tokens';

/**
 * One reading of a level source: each channel's peak as linear amplitude
 * (1 is 0 dBFS; above 1 is over). An ArrayLike, so a Float32Array from an
 * analyser passes straight through.
 */
export interface MeterLevels {
  readonly peak: ArrayLike<number>;
}

/**
 * Where a meter's levels come from. Milestone 1.7's MeterBus provides the
 * real one: a single loop that runs only while playing, recording or
 * monitoring and calls each subscriber at most once a frame. A source that
 * stops should send one silent reading, so meters fall to rest.
 */
export interface MeterSource {
  subscribe(callback: (levels: MeterLevels) => void): () => void;
}

export interface MeterProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** What is metered, for screen readers ('Master'). */
  label: string;
  source: MeterSource | null;
  orientation?: 'vertical' | 'horizontal';
  /** Length of the bars in px. Default 120. */
  length?: number;
  /** How many bars the canvas has room for: the source's channel count. Default 2. */
  channels?: number;
  /** The scale's floor and ceiling in dBFS. Default −60 to +6. */
  minDb?: number;
  maxDb?: number;
  /** Where the bar turns amber, and red. Default −12 and 0 dBFS. */
  hotDb?: number;
  clipDb?: number;
  /** Show the 'Peak' caption and the held peak in dB. */
  showPeak?: boolean;
}

/** Bar thickness and the gap between channels, in px. */
const BAR = 4;
const GAP = 2;
/** The clip light at the top of each bar, in px. */
const CLIP_LIGHT = 4;
/** How long a peak holds before it falls, and how fast bars fall (dB/s). */
const HOLD_MS = 1000;
const FALL_DB_PER_S = 24;

interface ChannelState {
  shown: number; // dB drawn now
  hold: number; // held peak, dB
  holdAt: number; // when the hold was set, ms
  clipped: boolean;
}

const silent = (): ChannelState => ({
  shown: -Infinity,
  hold: -Infinity,
  holdAt: 0,
  clipped: false,
});

/**
 * A peak meter drawn on a canvas. It subscribes to `source` and paints each
 * reading straight onto the canvas: no React state, so a playing project
 * re-renders nothing here. Bars fall smoothly, the peak holds for a second,
 * and a clip latches red until the meter is clicked.
 */
export function Meter({
  label,
  source,
  orientation = 'vertical',
  length = 120,
  channels = 2,
  minDb = -60,
  maxDb = 6,
  hotDb = -12,
  clipDb = 0,
  showPeak = false,
  className,
  ...rest
}: MeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peakRef = useRef<HTMLSpanElement>(null);
  const state = useRef<ChannelState[]>([]);
  const lastFrame = useRef(0);
  const scale = useRef({ minDb, maxDb, hotDb, clipDb, orientation, length });
  scale.current = { minDb, maxDb, hotDb, clipDb, orientation, length };

  const vertical = orientation === 'vertical';
  const thickness = channels * BAR + (channels - 1) * GAP;
  const width = vertical ? thickness : length;
  const height = vertical ? length : thickness;

  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const s = scale.current;
    const p = getDawPalette();
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    const span = s.maxDb - s.minDb;
    const along = (db: number) =>
      Math.max(0, Math.min(1, (db - s.minDb) / span)) * (s.length - CLIP_LIGHT);
    const hotAt = along(s.hotDb);
    const clipAt = along(s.clipDb);
    const total = s.length - CLIP_LIGHT;

    // Draws a run of the bar, measured from the floor, in the meter's axis.
    const run = (lane: number, from: number, to: number, color: string) => {
      if (to <= from) return;
      ctx.fillStyle = color;
      const across = lane * (BAR + GAP);
      if (s.orientation === 'vertical') {
        ctx.fillRect(across, s.length - to, BAR, to - from);
      } else {
        ctx.fillRect(from, across, to - from, BAR);
      }
    };

    state.current.forEach((ch, lane) => {
      run(lane, 0, total, p.meterTrack);
      const level = along(ch.shown);
      run(lane, 0, Math.min(level, hotAt), p.meterSafe);
      run(lane, hotAt, Math.min(level, clipAt), p.meterHot);
      run(lane, clipAt, level, p.meterClip);
      if (ch.hold > s.minDb) {
        const at = along(ch.hold);
        const color =
          ch.hold >= s.clipDb
            ? p.meterClip
            : ch.hold >= s.hotDb
              ? p.meterHot
              : p.text;
        run(lane, Math.max(0, at - 1), at + 1, color);
      }
      run(lane, total, s.length, ch.clipped ? p.meterClip : p.meterTrack);
    });

    const peakText = peakRef.current;
    if (peakText) {
      const held = Math.max(...state.current.map((ch) => ch.hold));
      const text = formatDb(held, { unit: '', floor: s.minDb });
      if (peakText.textContent !== text) peakText.textContent = text;
    }
  };

  // Size the backing store for the screen's pixel density.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    if (state.current.length === 0) {
      state.current = Array.from({ length: channels }, silent);
    }
    draw();
  }, [width, height, channels]);

  useEffect(() => {
    state.current = Array.from({ length: channels }, silent);
    lastFrame.current = 0;
    draw();
    if (!source) return;
    return source.subscribe((levels) => {
      const now = performance.now();
      const dt = lastFrame.current ? (now - lastFrame.current) / 1000 : 0;
      lastFrame.current = now;
      const fall = FALL_DB_PER_S * dt;
      const { clipDb: clip, minDb: floor } = scale.current;
      const count = levels.peak.length;
      if (state.current.length !== count) {
        state.current = Array.from({ length: count }, silent);
      }
      for (let i = 0; i < count; i++) {
        const ch = state.current[i];
        const db = gainToDb(levels.peak[i]);
        // Rise at once, fall at a steady rate, so the bar reads calmly.
        ch.shown = db >= ch.shown ? db : Math.max(db, ch.shown - fall);
        if (ch.shown < floor) ch.shown = -Infinity;
        if (db >= ch.hold) {
          ch.hold = db;
          ch.holdAt = now;
        } else if (now - ch.holdAt > HOLD_MS) {
          ch.hold = Math.max(db, ch.hold - fall);
          if (ch.hold < floor) ch.hold = -Infinity;
        }
        if (db >= clip) ch.clipped = true;
      }
      draw();
    });
  }, [source, channels]);

  const resetClip = () => {
    state.current.forEach((ch) => (ch.clipped = false));
    draw();
  };

  return (
    <div
      className={cn(
        'inline-flex select-none items-center gap-1',
        vertical ? 'flex-col' : 'flex-row',
        className,
      )}
      {...rest}
    >
      {/* Not a tab stop: a mixer would gain one per track for a light
          that only informs. Clicking it resets the clip light. */}
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`${label} peak meter`}
        title="Click to reset the clip light"
        onClick={resetClip}
        className="block cursor-pointer rounded-sm"
        style={{ width, height }}
      />
      {showPeak && (
        <span className="flex flex-col items-center">
          <span
            ref={peakRef}
            aria-hidden
            className={cn(
              TYPE_CLASS.label,
              'min-w-[4ch] text-center text-daw-text-2',
            )}
          />
          <span className={cn(TYPE_CLASS.micro, 'text-daw-text-3')}>Peak</span>
        </span>
      )}
    </div>
  );
}
