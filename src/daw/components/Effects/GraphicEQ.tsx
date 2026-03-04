import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import type { EqBand, EqBandType } from '@/daw/audio/EffectChain';

// ── Constants ─────────────────────────────────────────────────────────────

const BAND_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

const SAMPLE_RATE = 44100;
const FREQ_MIN = 20;
const FREQ_MAX = 20000;
const DB_RANGE = 18; // ±18 dB visible range
const NUM_POINTS = 200;

const FREQ_GRID = [50, 100, 200, 500, 1000, 2000, 5000, 10000];
const DB_GRID = [-12, -6, 0, 6, 12];

// Log-spaced frequency sample points
const LOG_FREQS: number[] = Array.from({ length: NUM_POINTS }, (_, i) => {
  const t = i / (NUM_POINTS - 1);
  return FREQ_MIN * Math.pow(FREQ_MAX / FREQ_MIN, t);
});

// ── Coordinate mapping ────────────────────────────────────────────────────

function freqToX(freq: number, w: number): number {
  return (Math.log(freq / FREQ_MIN) / Math.log(FREQ_MAX / FREQ_MIN)) * w;
}

function xToFreq(x: number, w: number): number {
  return FREQ_MIN * Math.pow(FREQ_MAX / FREQ_MIN, Math.max(0, Math.min(1, x / w)));
}

function dbToY(db: number, h: number): number {
  return h / 2 - (db / DB_RANGE) * (h / 2);
}

function yToDb(y: number, h: number): number {
  return -((y - h / 2) / (h / 2)) * DB_RANGE;
}

// ── Band type → BiquadFilterType ──────────────────────────────────────────

type BiquadType = 'highpass' | 'lowpass' | 'peaking' | 'lowshelf' | 'highshelf';

function bandTypeToBiquad(type: EqBandType): BiquadType {
  switch (type) {
    case 'lowcut':    return 'highpass';
    case 'lowshelf':  return 'lowshelf';
    case 'peaking':   return 'peaking';
    case 'highshelf': return 'highshelf';
    case 'highcut':   return 'lowpass';
  }
}

// ── Biquad frequency response math (RBJ Audio EQ Cookbook) ────────────────

interface BiquadCoeffs {
  b0: number; b1: number; b2: number;
  a0: number; a1: number; a2: number;
}

function computeBiquadCoeffs(
  type: BiquadType,
  freq: number,
  gain: number,
  Q: number,
): BiquadCoeffs {
  const w0 = (2 * Math.PI * freq) / SAMPLE_RATE;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const alpha = sinW0 / (2 * Math.max(0.001, Q));

  let b0: number, b1: number, b2: number;
  let a0: number, a1: number, a2: number;

  switch (type) {
    case 'highpass': {
      b0 = (1 + cosW0) / 2;
      b1 = -(1 + cosW0);
      b2 = (1 + cosW0) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cosW0;
      a2 = 1 - alpha;
      break;
    }
    case 'lowpass': {
      b0 = (1 - cosW0) / 2;
      b1 = 1 - cosW0;
      b2 = (1 - cosW0) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cosW0;
      a2 = 1 - alpha;
      break;
    }
    case 'peaking': {
      const A = Math.pow(10, gain / 40);
      b0 = 1 + alpha * A;
      b1 = -2 * cosW0;
      b2 = 1 - alpha * A;
      a0 = 1 + alpha / A;
      a1 = -2 * cosW0;
      a2 = 1 - alpha / A;
      break;
    }
    case 'lowshelf': {
      const A = Math.pow(10, gain / 40);
      const sqrtA = Math.sqrt(A);
      b0 = A * ((A + 1) - (A - 1) * cosW0 + 2 * sqrtA * alpha);
      b1 = 2 * A * ((A - 1) - (A + 1) * cosW0);
      b2 = A * ((A + 1) - (A - 1) * cosW0 - 2 * sqrtA * alpha);
      a0 = (A + 1) + (A - 1) * cosW0 + 2 * sqrtA * alpha;
      a1 = -2 * ((A - 1) + (A + 1) * cosW0);
      a2 = (A + 1) + (A - 1) * cosW0 - 2 * sqrtA * alpha;
      break;
    }
    case 'highshelf': {
      const A = Math.pow(10, gain / 40);
      const sqrtA = Math.sqrt(A);
      b0 = A * ((A + 1) + (A - 1) * cosW0 + 2 * sqrtA * alpha);
      b1 = -2 * A * ((A - 1) + (A + 1) * cosW0);
      b2 = A * ((A + 1) + (A - 1) * cosW0 - 2 * sqrtA * alpha);
      a0 = (A + 1) - (A - 1) * cosW0 + 2 * sqrtA * alpha;
      a1 = 2 * ((A - 1) - (A + 1) * cosW0);
      a2 = (A + 1) - (A - 1) * cosW0 - 2 * sqrtA * alpha;
      break;
    }
  }

  return { b0, b1, b2, a0, a1, a2 };
}

/** Evaluate biquad magnitude in dB at a given frequency */
function magnitudeDb(c: BiquadCoeffs, freq: number): number {
  const w = (2 * Math.PI * freq) / SAMPLE_RATE;
  const cosW = Math.cos(w);
  const cos2W = Math.cos(2 * w);
  const sinW = Math.sin(w);
  const sin2W = Math.sin(2 * w);

  const nR = c.b0 + c.b1 * cosW + c.b2 * cos2W;
  const nI = -(c.b1 * sinW + c.b2 * sin2W);
  const dR = c.a0 + c.a1 * cosW + c.a2 * cos2W;
  const dI = -(c.a1 * sinW + c.a2 * sin2W);

  const num2 = nR * nR + nI * nI;
  const den2 = dR * dR + dI * dI;
  if (den2 === 0) return 0;

  const db = 10 * Math.log10(num2 / den2);
  return isFinite(db) ? db : 0;
}

/** Compute per-frequency dB response for one band */
function computeBandResponse(band: EqBand): number[] {
  if (!band.enabled) return LOG_FREQS.map(() => 0);

  const bType = bandTypeToBiquad(band.type);
  const coeffs = computeBiquadCoeffs(bType, band.freq, band.gain, band.Q);

  return LOG_FREQS.map((f) => {
    let db = magnitudeDb(coeffs, f);
    // 24 dB/oct = two cascaded identical filters → double the dB
    if ((band.type === 'lowcut' || band.type === 'highcut') && band.slope === 24) {
      db *= 2;
    }
    return db;
  });
}

// ── SVG path helpers ──────────────────────────────────────────────────────

function curvePath(dbs: number[], gw: number, gh: number): string {
  return LOG_FREQS.map((f, i) => {
    const x = freqToX(f, gw);
    const y = Math.max(0, Math.min(gh, dbToY(dbs[i], gh)));
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join('');
}

function filledCurvePath(dbs: number[], gw: number, gh: number): string {
  const zeroY = dbToY(0, gh);
  const x0 = freqToX(LOG_FREQS[0], gw);
  const xN = freqToX(LOG_FREQS[NUM_POINTS - 1], gw);
  const line = LOG_FREQS.map((f, i) => {
    const x = freqToX(f, gw);
    const y = Math.max(0, Math.min(gh, dbToY(dbs[i], gh)));
    return `L${x.toFixed(1)},${y.toFixed(1)}`;
  }).join('');
  return `M${x0.toFixed(1)},${zeroY.toFixed(1)}${line}L${xN.toFixed(1)},${zeroY.toFixed(1)}Z`;
}

// ── Format helpers ────────────────────────────────────────────────────────

function fmtFreq(f: number): string {
  if (f >= 10000) return `${(f / 1000).toFixed(0)}k`;
  if (f >= 1000) return `${(f / 1000).toFixed(1)}k`;
  return `${Math.round(f)}`;
}

function fmtDb(db: number): string {
  return `${db > 0 ? '+' : ''}${db.toFixed(1)}`;
}

// ── GraphicEQ Component ──────────────────────────────────────────────────

interface GraphicEQProps {
  bands: EqBand[];
  onChange: (bands: EqBand[]) => void;
}

export function GraphicEQ({ bands, onChange }: GraphicEQProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // SVG internal dimensions
  const PAD = { top: 10, right: 10, bottom: 22, left: 30 };
  const SVG_W = 520;
  const SVG_H = 220;
  const GW = SVG_W - PAD.left - PAD.right; // graph width
  const GH = SVG_H - PAD.top - PAD.bottom; // graph height

  // ── Computed responses ──────────────────────────────────────────────

  const bandResponses = useMemo(() => bands.map(computeBandResponse), [bands]);

  const compositeDb = useMemo(
    () => LOG_FREQS.map((_, i) => bandResponses.reduce((sum, r) => sum + r[i], 0)),
    [bandResponses],
  );

  // ── Helpers to convert pointer to graph coords ─────────────────────

  const pointerToGraph = useCallback(
    (e: React.PointerEvent | PointerEvent): { gx: number; gy: number } => {
      const svg = svgRef.current;
      if (!svg) return { gx: 0, gy: 0 };
      const rect = svg.getBoundingClientRect();
      const scaleX = SVG_W / rect.width;
      const scaleY = SVG_H / rect.height;
      return {
        gx: (e.clientX - rect.left) * scaleX - PAD.left,
        gy: (e.clientY - rect.top) * scaleY - PAD.top,
      };
    },
    [SVG_W, SVG_H, PAD.left, PAD.top],
  );

  // ── Drag handlers ──────────────────────────────────────────────────

  const handlePointerDown = useCallback(
    (idx: number, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as Element).setPointerCapture(e.pointerId);
      setDragIdx(idx);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragIdx === null) return;
      const { gx, gy } = pointerToGraph(e);
      const band = bands[dragIdx];
      const newFreq = Math.max(20, Math.min(20000, xToFreq(gx, GW)));
      const isCut = band.type === 'lowcut' || band.type === 'highcut';
      const newGain = isCut ? 0 : Math.max(-DB_RANGE, Math.min(DB_RANGE, yToDb(gy, GH)));

      const updated = [...bands];
      updated[dragIdx] = {
        ...band,
        freq: Math.round(newFreq),
        gain: Math.round(newGain * 2) / 2, // snap to 0.5 dB
      };
      onChange(updated);
    },
    [dragIdx, bands, onChange, pointerToGraph, GW, GH],
  );

  const handlePointerUp = useCallback(() => {
    setDragIdx(null);
  }, []);

  // ── Wheel → Q adjustment ───────────────────────────────────────────

  const handleWheel = useCallback(
    (idx: number, e: React.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const band = bands[idx];
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newQ = Math.max(0.1, Math.min(10, band.Q + delta));
      const updated = [...bands];
      updated[idx] = { ...band, Q: Math.round(newQ * 10) / 10 };
      onChange(updated);
    },
    [bands, onChange],
  );

  // ── Double-click → reset band ──────────────────────────────────────

  const handleDblClick = useCallback(
    (idx: number) => {
      const band = bands[idx];
      const updated = [...bands];
      updated[idx] = { ...band, gain: 0, Q: band.type === 'peaking' ? 1.0 : 0.7 };
      onChange(updated);
    },
    [bands, onChange],
  );

  // ── Slope toggle (cut bands) ───────────────────────────────────────

  const toggleSlope = useCallback(
    (idx: number) => {
      const band = bands[idx];
      if (band.type !== 'lowcut' && band.type !== 'highcut') return;
      const updated = [...bands];
      updated[idx] = { ...band, slope: (band.slope ?? 12) === 12 ? 24 : 12 };
      onChange(updated);
    },
    [bands, onChange],
  );

  // ── Prevent default wheel on SVG to allow Q adjustment ─────────────

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const prevent = (e: WheelEvent) => { if (hoverIdx !== null) e.preventDefault(); };
    svg.addEventListener('wheel', prevent, { passive: false });
    return () => svg.removeEventListener('wheel', prevent);
  }, [hoverIdx]);

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-1 h-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full flex-1 select-none"
        preserveAspectRatio="xMidYMid meet"
        style={{ cursor: dragIdx !== null ? 'grabbing' : 'default' }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Background */}
        <rect
          x={0} y={0} width={SVG_W} height={SVG_H}
          rx={8}
          fill="rgba(0, 0, 0, 0.3)"
        />

        <g transform={`translate(${PAD.left}, ${PAD.top})`}>
          {/* ── Grid lines ──────────────────────────────────────── */}

          {/* Horizontal dB grid */}
          {DB_GRID.map((db) => {
            const y = dbToY(db, GH);
            return (
              <g key={`db-${db}`}>
                <line
                  x1={0} y1={y} x2={GW} y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth={db === 0 ? 0.8 : 0.5}
                />
                <text
                  x={-4} y={y + 3}
                  textAnchor="end"
                  fill="rgba(255,255,255,0.25)"
                  fontSize={8}
                  fontFamily="system-ui"
                >
                  {db > 0 ? `+${db}` : db}
                </text>
              </g>
            );
          })}

          {/* Vertical freq grid */}
          {FREQ_GRID.map((f) => {
            const x = freqToX(f, GW);
            return (
              <g key={`f-${f}`}>
                <line
                  x1={x} y1={0} x2={x} y2={GH}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth={0.5}
                />
                <text
                  x={x} y={GH + 12}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.25)"
                  fontSize={8}
                  fontFamily="system-ui"
                >
                  {fmtFreq(f)}
                </text>
              </g>
            );
          })}

          {/* ── Per-band colored fills ──────────────────────────── */}
          {bands.map((band, i) => {
            if (!band.enabled) return null;
            const resp = bandResponses[i];
            const hasEnergy = resp.some((d) => Math.abs(d) > 0.1);
            if (!hasEnergy) return null;
            return (
              <path
                key={`fill-${i}`}
                d={filledCurvePath(resp, GW, GH)}
                fill={BAND_COLORS[i]}
                opacity={0.12}
              />
            );
          })}

          {/* ── Composite curve (white) ────────────────────────── */}
          <path
            d={curvePath(compositeDb, GW, GH)}
            fill="none"
            stroke="rgba(232,232,240,0.8)"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />

          {/* ── Draggable band nodes ───────────────────────────── */}
          {bands.map((band, i) => {
            if (!band.enabled) return null;
            const isCut = band.type === 'lowcut' || band.type === 'highcut';
            const cx = freqToX(band.freq, GW);
            // For cut filters, show node on the composite curve at that frequency
            const _bandDb = isCut
              ? bandResponses[i][
                  LOG_FREQS.findIndex((f) => f >= band.freq) || 0
                ] || 0
              : band.gain;
            const cy = dbToY(isCut ? 0 : band.gain, GH);
            const isActive = dragIdx === i || hoverIdx === i;
            const color = BAND_COLORS[i];

            return (
              <g key={`node-${i}`}>
                {/* Hover ring */}
                {isActive && (
                  <circle
                    cx={cx} cy={cy} r={10}
                    fill="none"
                    stroke={color}
                    strokeWidth={1}
                    opacity={0.4}
                  />
                )}

                {/* Node circle */}
                <circle
                  cx={cx} cy={cy} r={7}
                  fill={color}
                  stroke="rgba(0,0,0,0.4)"
                  strokeWidth={1}
                  style={{ cursor: 'grab' }}
                  onPointerDown={(e) => handlePointerDown(i, e)}
                  onPointerEnter={() => setHoverIdx(i)}
                  onPointerLeave={() => { if (dragIdx !== i) setHoverIdx(null); }}
                  onWheel={(e) => handleWheel(i, e)}
                  onDoubleClick={() => handleDblClick(i)}
                />

                {/* Band number */}
                <text
                  x={cx} y={cy + 3}
                  textAnchor="middle"
                  fill="rgba(0,0,0,0.7)"
                  fontSize={8}
                  fontWeight={700}
                  fontFamily="system-ui"
                  style={{ pointerEvents: 'none' }}
                >
                  {i + 1}
                </text>

                {/* Slope label for cut bands */}
                {isCut && isActive && (
                  <g
                    onClick={(e) => { e.stopPropagation(); toggleSlope(i); }}
                    style={{ cursor: 'pointer' }}
                  >
                    <rect
                      x={cx + 10} y={cy - 8}
                      width={22} height={14}
                      rx={3}
                      fill="rgba(0,0,0,0.6)"
                      stroke={color}
                      strokeWidth={0.5}
                    />
                    <text
                      x={cx + 21} y={cy + 1}
                      textAnchor="middle"
                      fill={color}
                      fontSize={8}
                      fontWeight={600}
                      fontFamily="system-ui"
                    >
                      {band.slope ?? 12}
                    </text>
                  </g>
                )}

                {/* Tooltip on hover: Freq / Gain / Q */}
                {isActive && (
                  <g style={{ pointerEvents: 'none' }}>
                    <rect
                      x={cx - 36} y={cy - 28}
                      width={72} height={16}
                      rx={4}
                      fill="rgba(0,0,0,0.7)"
                    />
                    <text
                      x={cx} y={cy - 17}
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.85)"
                      fontSize={8}
                      fontFamily="system-ui"
                    >
                      {fmtFreq(band.freq)} Hz  {isCut ? '' : `${fmtDb(band.gain)} dB`}  Q {band.Q.toFixed(1)}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* ── Bottom readouts ────────────────────────────────────────── */}
      <div className="flex justify-between px-0.5">
        {bands.map((band, i) => (
          <div
            key={i}
            className="flex flex-col items-center"
            style={{ minWidth: 0, flex: 1 }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full mb-0.5"
              style={{ backgroundColor: band.enabled ? BAND_COLORS[i] : 'rgba(255,255,255,0.1)' }}
            />
            <span
              className="text-[8px] tabular-nums leading-none"
              style={{ color: BAND_COLORS[i], opacity: band.enabled ? 0.7 : 0.3 }}
            >
              {fmtFreq(band.freq)}
            </span>
            <span
              className="text-[7px] tabular-nums leading-none mt-px"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              {band.type === 'lowcut' || band.type === 'highcut'
                ? `${band.slope ?? 12}dB`
                : fmtDb(band.gain)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
