/* eslint-disable react/display-name */
/* eslint-disable tailwindcss/classnames-order */
import {
  type CSSProperties,
  type FC,
  type PointerEvent,
  memo,
  useCallback,
  useMemo,
  useRef,
  useReducer,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  trackEngineRegistry,
  subscribeEngineReady,
  getEngineReadyVersion,
} from '@/daw/hooks/usePlaybackEngine';
import { useStore } from '@/daw/store';
import {
  DRAWBAR_LABELS,
  LeslieSpeed,
  ORGAN_PRESETS,
  TonewheelOrganEngine,
  VibratoMode,
} from '@/daw/instruments/TonewheelOrganEngine';
import { PianoKeyboard } from '@/daw/oracle-synth/components/keyboard/PianoKeyboard';
import { useLiveChordColor } from '@/daw/hooks/useLiveChordColor';
import styles from './OrganView.module.css';

// ── Helpers ──────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function useOrganEngine(
  trackId: string | undefined,
): TonewheelOrganEngine | null {
  useSyncExternalStore(subscribeEngineReady, getEngineReadyVersion);
  if (!trackId) return null;
  const state = trackEngineRegistry.get(trackId);
  if (state?.instrument instanceof TonewheelOrganEngine)
    return state.instrument;
  return null;
}

// ── Drawbar tip colors (Hammond convention) ──────────────────────────────

const DRAWBAR_COLORS = [
  '#8B5E3C', // 16'  brown
  '#8B5E3C', // 5⅓' brown
  '#ccc', // 8'   white
  '#ccc', // 4'   white
  '#444', // 2⅔' black
  '#ccc', // 2'   white
  '#444', // 1⅗' black
  '#444', // 1⅓' black
  '#ccc', // 1'   white
];

// ── Module accent colors ─────────────────────────────────────────────────

const ACCENT = {
  presets: '#e8a040',
  drawbars: '#e8a040',
  percussion: '#e8c840',
  vibrato: '#7ecfcf',
  leslie: '#45B649',
  mix: '#aaa',
} as const;

// ── Knob sub-component ──────────────────────────────────────────────────

const START_ANGLE = 225;
const END_ANGLE = 495;
const SWEEP = END_ANGLE - START_ANGLE;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, s: number, e: number) {
  const start = polarToCartesian(cx, cy, r, e);
  const end = polarToCartesian(cx, cy, r, s);
  const large = e - s <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`;
}

interface KnobProps {
  value: number;
  min: number;
  max: number;
  label: string;
  accent?: string;
  size?: number;
  formatValue?: (v: number) => string;
  onChange: (v: number) => void;
}

const Knob: FC<KnobProps> = memo(
  ({
    value,
    min,
    max,
    label,
    accent = '#aaa',
    size = 44,
    formatValue,
    onChange,
  }) => {
    const startY = useRef<number | null>(null);
    const startVal = useRef(0);
    const norm = clamp((value - min) / (max - min), 0, 1);
    const angle = START_ANGLE + norm * SWEEP;
    const cx = size / 2,
      cy = size / 2,
      r = size / 2 - 3;
    const trackPath = describeArc(cx, cy, r, START_ANGLE, END_ANGLE);
    const arcPath =
      norm > 0.001 ? describeArc(cx, cy, r, START_ANGLE, angle) : '';

    // Pointer line from 60% to 85% of radius
    const pInner = polarToCartesian(cx, cy, r * 0.6, angle);
    const pOuter = polarToCartesian(cx, cy, r * 0.85, angle);

    const onDown = useCallback(
      (e: PointerEvent) => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        startY.current = e.clientY;
        startVal.current = value;
      },
      [value],
    );

    const onMove = useCallback(
      (e: PointerEvent) => {
        if (startY.current === null) return;
        const dy = startY.current - e.clientY;
        const sens = e.shiftKey ? 0.0005 : 0.005;
        onChange(clamp(startVal.current + dy * sens * (max - min), min, max));
      },
      [min, max, onChange],
    );

    const onUp = useCallback(() => {
      startY.current = null;
    }, []);

    const display = formatValue
      ? formatValue(clamp(value, min, max))
      : Math.round(clamp(value, min, max) * 100) + '%';

    return (
      <div className={styles.knobContainer}>
        <svg
          className={styles.knobSvg}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
        >
          <path className={styles.knobTrack} d={trackPath} strokeWidth={3} />
          {arcPath && (
            <path
              className={styles.knobArc}
              d={arcPath}
              stroke={accent}
              strokeWidth={3}
              style={
                norm > 0.001
                  ? { filter: `drop-shadow(0 0 3px ${accent}44)` }
                  : undefined
              }
            />
          )}
          <line
            className={styles.knobPointer}
            x1={pInner.x}
            y1={pInner.y}
            x2={pOuter.x}
            y2={pOuter.y}
            strokeWidth={2}
          />
        </svg>
        <span className={styles.knobValue}>{display}</span>
        <span className={styles.knobLabel}>{label}</span>
      </div>
    );
  },
);

// ── Drawbar sub-component ───────────────────────────────────────────────

interface DrawbarProps {
  index: number;
  value: number;
  onChange: (index: number, value: number) => void;
}

const DrawbarSlider: FC<DrawbarProps> = memo(({ index, value, onChange }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const color = DRAWBAR_COLORS[index];
  const norm = value / 8;

  const update = useCallback(
    (clientY: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const n = (clientY - rect.top) / rect.height;
      onChange(index, Math.round(clamp(n * 8, 0, 8)));
    },
    [index, onChange],
  );

  const onDown = useCallback(
    (e: PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      update(e.clientY);
    },
    [update],
  );

  const onMove = useCallback(
    (e: PointerEvent) => {
      if (e.buttons === 0) return;
      update(e.clientY);
    },
    [update],
  );

  return (
    <div className={styles.drawbarSlot}>
      <div
        ref={trackRef}
        className={styles.drawbarTrack}
        onPointerDown={onDown}
        onPointerMove={onMove}
      >
        <div className={styles.drawbarCap} style={{ background: color }} />
        <div
          className={styles.drawbarFill}
          style={{ height: `${norm * 100}%`, background: color }}
        />
        <div
          className={styles.drawbarThumb}
          style={{ top: `${norm * 100}%`, background: color }}
        >
          <span className={styles.drawbarThumbValue}>{value}</span>
        </div>
      </div>
      <span className={styles.drawbarLabel}>{DRAWBAR_LABELS[index]}</span>
    </div>
  );
});

// ── Toggle sub-component ────────────────────────────────────────────────

interface ToggleProps {
  label: string;
  active: boolean;
  accent?: string;
  onChange: (v: boolean) => void;
}

const Toggle: FC<ToggleProps> = memo(
  ({ label, active, accent = '#e8c840', onChange }) => (
    <div className={styles.toggleRow}>
      <span className={styles.toggleLabel}>{label}</span>
      <button
        className={styles.toggleSwitch}
        data-active={active}
        style={{ '--toggle-accent': accent } as CSSProperties}
        onClick={() => onChange(!active)}
      >
        <div className={styles.toggleThumbInner} />
      </button>
    </div>
  ),
);

// ── Segmented sub-component ─────────────────────────────────────────────

interface SegmentedProps<T extends string> {
  options: T[];
  value: T;
  accent?: string;
  className?: string;
  onChange: (v: T) => void;
}

function Segmented<T extends string>({
  options,
  value,
  accent = '#7ecfcf',
  className,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div
      className={`${styles.segmented} ${className ?? ''}`}
      style={{ '--seg-accent': accent } as CSSProperties}
    >
      {options.map((opt) => (
        <button
          key={opt}
          className={styles.segmentBtn}
          data-active={opt === value}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ── Leslie rotor speed mapping for CSS animation ────────────────────────

function leslieAnimDuration(speed: LeslieSpeed, type: 'horn' | 'drum'): string {
  if (speed === 'stop') return '0s';
  if (type === 'horn') return speed === 'slow' ? '1.5s' : '0.17s';
  return speed === 'slow' ? '1.72s' : '0.15s';
}

// ── OrganView (main export) ─────────────────────────────────────────────

interface OrganViewProps {
  trackId: string;
}

export function OrganView({ trackId }: OrganViewProps) {
  const engine = useOrganEngine(trackId);
  const [, forceRender] = useReducer((x: number) => x + 1, 0);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const hwActiveNotes = useStore((s) => s.hwActiveNotes);
  const mergedNotes = useMemo(
    () => new Set([...activeNotes, ...hwActiveNotes]),
    [activeNotes, hwActiveNotes],
  );
  const chordColor = useLiveChordColor(mergedNotes);

  // ── Note handlers (click on keyboard) ──────────────────────────────
  const handleNoteOn = useCallback(
    (note: number, velocity: number = 0.8) => {
      const state = trackEngineRegistry.get(trackId);
      if (state) state.trackEngine.noteOn(note, Math.round(velocity * 127));
      setActiveNotes((prev) => new Set(prev).add(note));
    },
    [trackId],
  );

  const handleNoteOff = useCallback(
    (note: number) => {
      const state = trackEngineRegistry.get(trackId);
      if (state) state.trackEngine.noteOff(note);
      setActiveNotes((prev) => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
    },
    [trackId],
  );

  if (!engine) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
          Organ engine loading...
        </span>
      </div>
    );
  }

  const drawbars = engine.getDrawbars();
  const percEnabled = engine.getPercEnabled();
  const percHarmonic = engine.getPercHarmonic();
  const percVolume = engine.getPercVolume();
  const percDecay = engine.getPercDecay();
  const vibratoMode = engine.getVibratoMode();
  const leslieSpeed = engine.getLeslieSpeed();
  const leslieEnabled = engine.getLeslieEnabled();
  const clickLevel = engine.getClickLevel();
  const overdrive = engine.getOverdrive();
  const swellLevel = engine.getSwellLevel();

  const handleDrawbar = (index: number, value: number) => {
    engine.setDrawbar(index, value);
    setActivePreset(null);
    forceRender();
  };

  const handleLoadPreset = (preset: (typeof ORGAN_PRESETS)[number]) => {
    engine.loadPreset(preset);
    setActivePreset(preset.name);
    forceRender();
  };

  const moduleAccent = (accent: string): CSSProperties =>
    ({
      '--module-accent': accent,
    }) as CSSProperties;

  return (
    <div className={styles.organRoot}>
      {/* ── PRESETS (full-height left column) ──────────────────────── */}
      <div className={styles.presetsCol} style={moduleAccent(ACCENT.presets)}>
        <h4 className={styles.presetsTitle}>Presets</h4>
        {ORGAN_PRESETS.map((preset) => (
          <button
            key={preset.name}
            className={styles.segmentBtn}
            data-active={activePreset === preset.name}
            style={
              {
                '--seg-accent': ACCENT.presets,
                textAlign: 'left',
                width: '100%',
              } as CSSProperties
            }
            onClick={() => handleLoadPreset(preset)}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* ── MAIN AREA (controls row + keyboard) ───────────────────── */}
      <div className={styles.mainArea}>
        {/* ── CONTROLS ROW (single row) ──────────────────────────── */}
        <div className={styles.controlsRow}>
          {/* Leslie */}
          <div className={styles.module} style={moduleAccent(ACCENT.leslie)}>
            <h4 className={styles.moduleTitle}>Leslie</h4>
            <Toggle
              label="Enabled"
              active={leslieEnabled}
              accent={ACCENT.leslie}
              onChange={(v) => {
                engine.setLeslieEnabled(v);
                forceRender();
              }}
            />
            <Segmented<LeslieSpeed>
              options={['stop', 'slow', 'fast']}
              value={leslieSpeed}
              accent={ACCENT.leslie}
              className={styles.leslieSpeed}
              onChange={(v) => {
                engine.setLeslieSpeed(v);
                forceRender();
              }}
            />
            <div className={styles.leslieIndicators}>
              <div className={styles.leslieRotor}>
                <div
                  className={styles.leslieRotorDot}
                  data-stopped={leslieSpeed === 'stop'}
                >
                  <div
                    className={styles.leslieRotorInner}
                    style={
                      {
                        '--rotor-speed': leslieAnimDuration(
                          leslieSpeed,
                          'horn',
                        ),
                        animationPlayState:
                          leslieSpeed === 'stop' ? 'paused' : 'running',
                      } as CSSProperties
                    }
                  />
                </div>
                <span className={styles.leslieRotorLabel}>Horn</span>
              </div>
              <div className={styles.leslieRotor}>
                <div
                  className={styles.leslieRotorDot}
                  data-stopped={leslieSpeed === 'stop'}
                >
                  <div
                    className={styles.leslieRotorInner}
                    style={
                      {
                        '--rotor-speed': leslieAnimDuration(
                          leslieSpeed,
                          'drum',
                        ),
                        animationPlayState:
                          leslieSpeed === 'stop' ? 'paused' : 'running',
                      } as CSSProperties
                    }
                  />
                </div>
                <span className={styles.leslieRotorLabel}>Drum</span>
              </div>
            </div>
          </div>

          {/* Vibrato */}
          <div className={styles.module} style={moduleAccent(ACCENT.vibrato)}>
            <h4 className={styles.moduleTitle}>Vibrato</h4>
            <Segmented<VibratoMode>
              options={['off', 'V1', 'V2', 'V3', 'C1', 'C2', 'C3']}
              value={vibratoMode}
              accent={ACCENT.vibrato}
              onChange={(v) => {
                engine.setVibratoMode(v);
                forceRender();
              }}
            />
          </div>

          {/* Drawbars (flex: 1 to fill space) */}
          <div
            className={`${styles.module} ${styles.moduleExpand}`}
            style={moduleAccent(ACCENT.drawbars)}
          >
            <h4 className={styles.moduleTitle}>Drawbars</h4>
            <div className={styles.drawbarRow}>
              {drawbars.map((val, i) => (
                <DrawbarSlider
                  key={i}
                  index={i}
                  value={val}
                  onChange={handleDrawbar}
                />
              ))}
            </div>
          </div>

          {/* Percussion */}
          <div
            className={styles.module}
            style={moduleAccent(ACCENT.percussion)}
          >
            <h4 className={styles.moduleTitle}>Percussion</h4>
            <Toggle
              label="On/Off"
              active={percEnabled}
              accent={ACCENT.percussion}
              onChange={(v) => {
                engine.setPercEnabled(v);
                forceRender();
              }}
            />
            <Toggle
              label={percHarmonic === '2nd' ? '2nd' : '3rd'}
              active={percHarmonic === '3rd'}
              accent={ACCENT.percussion}
              onChange={(v) => {
                engine.setPercHarmonic(v ? '3rd' : '2nd');
                forceRender();
              }}
            />
            <Toggle
              label={percVolume === 'normal' ? 'Nml' : 'Soft'}
              active={percVolume === 'soft'}
              accent={ACCENT.percussion}
              onChange={(v) => {
                engine.setPercVolume(v ? 'soft' : 'normal');
                forceRender();
              }}
            />
            <Toggle
              label={percDecay === 'fast' ? 'Fast' : 'Slow'}
              active={percDecay === 'slow'}
              accent={ACCENT.percussion}
              onChange={(v) => {
                engine.setPercDecay(v ? 'slow' : 'fast');
                forceRender();
              }}
            />
          </div>

          {/* Mix */}
          <div className={styles.module} style={moduleAccent(ACCENT.mix)}>
            <h4 className={styles.moduleTitle}>Mix</h4>
            <div className={styles.knobRow}>
              <Knob
                value={clickLevel}
                min={0}
                max={1}
                label="Click"
                accent={ACCENT.mix}
                size={40}
                onChange={(v) => {
                  engine.setClickLevel(v);
                  forceRender();
                }}
              />
              <Knob
                value={overdrive}
                min={0}
                max={1}
                label="Drive"
                accent={ACCENT.mix}
                size={40}
                onChange={(v) => {
                  engine.setOverdrive(v);
                  forceRender();
                }}
              />
              <Knob
                value={swellLevel}
                min={0}
                max={1}
                label="Swell"
                accent={ACCENT.mix}
                size={40}
                onChange={(v) => {
                  engine.setSwellLevel(v);
                  forceRender();
                }}
              />
            </div>
          </div>
        </div>

        {/* ── KEYBOARD (bottom of main area) ─────────────────────── */}
        <div className={styles.keyboardWrapper}>
          <div style={{ position: 'absolute', inset: 0 }}>
            <PianoKeyboard
              startNote={36}
              endNote={96}
              activeNotes={mergedNotes}
              activeColor={chordColor ?? undefined}
              onNoteOn={handleNoteOn}
              onNoteOff={handleNoteOff}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
