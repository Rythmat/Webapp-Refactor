import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { SpectrumCanvas } from '../viz/SpectrumCanvas';
import { WaveformCanvas } from '../viz/WaveformCanvas';
import type { RigAudio } from './audio/rigAudio';
import type { KnobDef, SwitchDef } from './rig/rigTypes';

// ── The panel's controls ───────────────────────────────────────────────────
// Large and plain, because they're what the student is listening with. Knobs
// answer to dragging, the wheel and the arrow keys.

const SWEEP = 270;
const DRAG_PIXELS = 170;

const knobText = (def: KnobDef, value: number) => {
  if (def.unit === 'dB') {
    if (value <= def.min && def.min <= -40) return 'Off';
    return `${value > 0 ? '+' : ''}${value} dB`;
  }
  return `${Math.round(((value - def.min) / (def.max - def.min)) * 100)}%`;
};

export function Knob({
  gear,
  def,
  label = def.label,
  value,
  accent,
  onChange,
}: {
  gear: string;
  def: KnobDef;
  /** Its name here, where that's better than the gear's own: "1 Kick". */
  label?: string;
  value: number;
  accent: string;
  onChange: (value: number) => void;
}) {
  const t = (value - def.min) / (def.max - def.min);
  const angle = -SWEEP / 2 + t * SWEEP;
  const clamp = (v: number) => {
    const stepped = Math.round(v / def.step) * def.step;
    const rounded = Math.round(stepped * 100) / 100;
    return Math.max(def.min, Math.min(def.max, rounded));
  };
  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const startY = event.clientY;
    const startX = event.clientX;
    const start = value;
    const range = def.max - def.min;
    const move = (e: globalThis.PointerEvent) => {
      const moved = startY - e.clientY + (e.clientX - startX);
      onChange(clamp(start + (moved / DRAG_PIXELS) * range));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const by: Record<string, number> = {
      ArrowUp: def.step,
      ArrowRight: def.step,
      ArrowDown: -def.step,
      ArrowLeft: -def.step,
      PageUp: def.step * 5,
      PageDown: -def.step * 5,
    };
    if (by[event.key] !== undefined) {
      event.preventDefault();
      onChange(clamp(value + by[event.key]));
    } else if (event.key === 'Home') {
      event.preventDefault();
      onChange(def.min);
    } else if (event.key === 'End') {
      event.preventDefault();
      onChange(def.max);
    }
  };
  // The arc of the sweep, drawn from its start to the value.
  const polar = (deg: number, r: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [24 + Math.cos(rad) * r, 24 + Math.sin(rad) * r] as const;
  };
  const [sx, sy] = polar(-SWEEP / 2, 20);
  const [ex, ey] = polar(angle, 20);
  const [mx, my] = polar(SWEEP / 2, 20);
  const [px, py] = polar(angle, 13);
  const large = t * SWEEP > 180 ? 1 : 0;
  return (
    <div className="flex w-[4.2rem] flex-col items-center gap-1">
      <button
        type="button"
        role="slider"
        aria-label={label}
        aria-valuemin={def.min}
        aria-valuemax={def.max}
        aria-valuenow={value}
        aria-valuetext={knobText(def, value)}
        data-testid={`knob-${gear}-${def.id}`}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        onWheel={(event) =>
          onChange(clamp(value - Math.sign(event.deltaY) * def.step))
        }
        className="size-14 cursor-grab touch-none rounded-full outline-none focus-visible:ring-1 focus-visible:ring-white active:cursor-grabbing"
      >
        <svg viewBox="0 0 48 48" className="size-full" aria-hidden>
          <path
            d={`M${sx} ${sy}A20 20 0 1 1 ${mx} ${my}`}
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth={2}
            strokeLinecap="round"
          />
          {t > 0 && (
            <path
              d={`M${sx} ${sy}A20 20 0 ${large} 1 ${ex} ${ey}`}
              fill="none"
              stroke={accent}
              strokeWidth={2}
              strokeLinecap="round"
            />
          )}
          <circle
            cx={24}
            cy={24}
            r={14}
            fill="#121215"
            stroke="rgba(255,255,255,0.75)"
          />
          <line
            x1={24}
            y1={24}
            x2={px}
            y2={py}
            stroke="#fff"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </svg>
      </button>
      <span className="text-center text-xs leading-tight text-white/70">
        {label}
      </span>
      <span className="text-xs tabular-nums text-white">
        {knobText(def, value)}
      </span>
    </div>
  );
}

export function Switch({
  gear,
  def,
  value,
  accent,
  onChange,
}: {
  gear: string;
  def: SwitchDef;
  value: string;
  accent: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={def.label}
      className="flex w-full flex-col gap-1"
    >
      <span className="text-xs text-white/70">{def.label}</span>
      <div className="flex flex-wrap gap-1">
        {def.options.map((option) => {
          const chosen = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={chosen}
              data-testid={`switch-${gear}-${def.id}-${option.value}`}
              onClick={() => onChange(option.value)}
              className={`min-h-9 rounded-md border px-2.5 text-sm transition-colors ${
                chosen
                  ? 'text-black'
                  : 'border-white/15 text-white/80 hover:border-white/40'
              }`}
              style={
                chosen ? { background: accent, borderColor: accent } : undefined
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Reading the rig ────────────────────────────────────────────────────────

const METER_FLOOR = -60;
const METER_TOP = 0;
/** The RMS at which peaks start to clip. */
const HOT_DB = -10;

/** A live level bar. It writes to the page itself, every frame. */
export function LiveMeter({
  read,
  label,
  accent,
}: {
  read: () => number;
  label: string;
  accent: string;
}) {
  const bar = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const hold = useRef(METER_FLOOR);
  const readRef = useRef(read);
  readRef.current = read;
  useEffect(() => {
    let frame = 0;
    const draw = () => {
      frame = requestAnimationFrame(draw);
      const db = readRef.current();
      // Fast up, slow down, or the bar is unreadable.
      hold.current = Math.max(db, hold.current - 0.9);
      const shown = Math.max(METER_FLOOR, hold.current);
      const t = (shown - METER_FLOOR) / (METER_TOP - METER_FLOOR);
      if (bar.current) {
        bar.current.style.transform = `scaleX(${t})`;
        bar.current.style.background = shown > HOT_DB ? '#ef4444' : accent;
      }
      if (text.current) {
        text.current.textContent =
          shown <= METER_FLOOR ? 'silent' : `${Math.round(shown)} dB`;
      }
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [accent]);
  const hotAt = ((HOT_DB - METER_FLOOR) / (METER_TOP - METER_FLOOR)) * 100;
  return (
    <div className="w-full">
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="text-white/70">{label}</span>
        <span ref={text} className="tabular-nums text-white/90">
          silent
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          ref={bar}
          className="absolute inset-0 origin-left"
          style={{ transform: 'scaleX(0)' }}
        />
        <div
          className="absolute inset-y-0 w-px bg-white/50"
          style={{ left: `${hotAt}%` }}
        />
      </div>
    </div>
  );
}

/** Headphones on a cable: what's on it, as a picture as well as a sound. */
export function ScopeCard({
  audio,
  cable,
  accent,
  title,
  note,
  onClose,
}: {
  audio: RigAudio | null;
  cable: string;
  accent: string;
  title: string;
  note: string;
  onClose: () => void;
}) {
  const wave = useRef(new Float32Array(2048));
  const spectrum = useRef(new Float32Array(1024));
  const getWave = () => {
    audio?.cableTap(cable)?.getFloatTimeDomainData(wave.current);
    return wave.current;
  };
  const getSpectrum = () => {
    audio?.cableTap(cable)?.getFloatFrequencyData(spectrum.current);
    return spectrum.current;
  };
  return (
    <div
      data-testid="scope"
      className="flex flex-col gap-2 rounded-xl border border-white/15 bg-[#121215] p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/60">
            Listening to
          </p>
          <p className="text-sm text-white">{title}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-9 rounded-md border border-white/15 px-2.5 text-sm text-white/80 hover:border-white/40"
        >
          Take off
        </button>
      </div>
      <WaveformCanvas
        getData={getWave}
        color={accent}
        lineWidth={1.5}
        className="h-16 w-full rounded-md bg-white/[0.03]"
      />
      <SpectrumCanvas
        getData={getSpectrum}
        color={accent}
        minDb={-100}
        maxDb={-10}
        className="h-12 w-full rounded-md bg-white/[0.03]"
      />
      <LiveMeter
        read={() => audio?.cableLevel(cable) ?? -Infinity}
        label="Level on this cable"
        accent={accent}
      />
      <p className="text-sm text-white/80">{note}</p>
    </div>
  );
}

// ── Playing it yourself ────────────────────────────────────────────────────

const KEYS = [
  { midi: 57, name: 'A' },
  { midi: 59, name: 'B' },
  { midi: 60, name: 'C' },
  { midi: 62, name: 'D' },
  { midi: 64, name: 'E' },
  { midi: 65, name: 'F' },
  { midi: 67, name: 'G' },
  { midi: 69, name: 'A' },
];

export function PlayKeys({ onPlay }: { onPlay: (midi: number) => void }) {
  return (
    <div
      role="group"
      aria-label="Keys to play"
      className="flex h-20 w-full gap-px"
    >
      {KEYS.map((key, i) => (
        <button
          key={`${key.midi}`}
          type="button"
          aria-label={`Play ${key.name}`}
          data-testid={`key-${i}`}
          onPointerDown={(event) => {
            event.preventDefault();
            onPlay(key.midi);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onPlay(key.midi);
            }
          }}
          className="flex-1 touch-none rounded-b-md bg-[#e6e6ea] pb-1 text-xs text-black/60 outline-none transition-colors focus-visible:ring-1 focus-visible:ring-white active:bg-white/60"
        >
          <span className="flex h-full items-end justify-center">
            {key.name}
          </span>
        </button>
      ))}
    </div>
  );
}
