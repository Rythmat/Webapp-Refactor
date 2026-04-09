/* eslint-disable tailwindcss/classnames-order */
/* eslint-disable tailwindcss/enforces-shorthand */
/* eslint-disable tailwindcss/migration-from-tailwind-2 */
import * as Slider from '@radix-ui/react-slider';
import {
  type CSSProperties,
  memo,
  type PointerEvent,
  useCallback,
  useRef,
} from 'react';
import { useStore, useTrack } from '@/daw/store';
import { getTrackAudioState } from '@/daw/hooks/usePlaybackEngine';
import { useMeterLevel } from '@/daw/hooks/useMeterLevel';

// ── Props ───────────────────────────────────────────────────────────────

interface ChannelStripProps {
  trackId: string;
}

// ── MeterSegments ────────────────────────────────────────────────────────
// 8 stacked segments, green → yellow → red (bottom to top)

function MeterSegments({ level }: { level: number }) {
  const segments = 8;
  return (
    <div
      className="flex flex-col-reverse gap-0.5 w-1.5"
      style={{ height: 120 }}
    >
      {Array.from({ length: segments }, (_, i) => {
        const threshold = ((i + 1) / segments) * 100;
        const lit = level >= threshold - 100 / segments;
        const color =
          i >= 7
            ? 'var(--color-meter-red)'
            : i >= 6
              ? 'var(--color-meter-yellow)'
              : 'var(--color-meter-green)';
        return (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{
              backgroundColor: lit ? color : 'rgba(255, 255, 255, 0.04)',
            }}
          />
        );
      })}
    </div>
  );
}

// ── PanKnob ─────────────────────────────────────────────────────────────
// Circular rotary knob for panning. Drag vertically to adjust.

interface PanKnobProps {
  value: number; // -1 to 1
  onChange: (value: number) => void;
}

function PanKnob({ value, onChange }: PanKnobProps) {
  const startY = useRef(0);
  const startVal = useRef(0);

  // Map -1..1 to 225°..315° (center = 270° = 12 o'clock)
  const angle = 270 + value * 45;

  const rad = (angle * Math.PI) / 180;
  const cx = 14,
    cy = 14,
    r = 8;
  const ix = cx + Math.cos(rad) * r;
  const iy = cy + Math.sin(rad) * r;

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      startY.current = e.clientY;
      startVal.current = value;
    },
    [value],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!(e.target as HTMLElement).hasPointerCapture(e.pointerId)) return;
      const dy = startY.current - e.clientY; // up = positive
      const next = Math.max(-1, Math.min(1, startVal.current + dy / 80));
      onChange(Math.round(next * 100) / 100);
    },
    [onChange],
  );

  const onDoubleClick = useCallback(() => onChange(0), [onChange]);

  return (
    <div
      className="cursor-grab active:cursor-grabbing select-none"
      style={{ width: 28, height: 28 }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onDoubleClick={onDoubleClick}
    >
      <svg width={28} height={28} viewBox="0 0 28 28">
        {/* Outer ring */}
        <circle
          cx={cx}
          cy={cy}
          r={11}
          fill="rgba(255,255,255,0.06)"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={1}
        />
        {/* Center dot */}
        <circle cx={cx} cy={cy} r={2} fill="rgba(255,255,255,0.2)" />
        {/* Indicator line */}
        <line
          x1={cx}
          y1={cy}
          x2={ix}
          y2={iy}
          stroke="var(--color-text)"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

// ── ChannelStrip ────────────────────────────────────────────────────────
// Layout matches DAW edit Dock reference (top→bottom):
//   Name → Fader+Meter → Pan knob → Volume readout → M/S buttons

export const ChannelStrip = memo(function ChannelStrip({
  trackId,
}: ChannelStripProps) {
  const track = useTrack(trackId);
  const toggleMute = useStore((s) => s.toggleMute);
  const toggleSolo = useStore((s) => s.toggleSolo);
  const updateTrack = useStore((s) => s.updateTrack);

  // Live audio metering
  const analyser =
    getTrackAudioState(trackId)?.trackEngine.getAnalyserNode() ?? null;
  const liveLevel = useMeterLevel(analyser);

  if (!track) return null;

  const volumePct = Math.round(track.volume * 100);

  return (
    <div
      className="flex flex-shrink-0 flex-col items-center py-3 px-1"
      style={{
        width: 72,
        borderRight: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* Track name */}
      <span
        className="w-full truncate text-center text-[10px] font-medium mb-1"
        style={{ color: 'var(--color-text)' }}
      >
        {track.name}
      </span>

      {/* Fader + segmented meter */}
      <div className="flex flex-1 items-center justify-center gap-1.5">
        {/* Segmented level meter — live audio */}
        <MeterSegments level={liveLevel} />

        {/* Volume fader */}
        <Slider.Root
          className="relative flex w-3 touch-none select-none flex-col items-center"
          style={{ height: 120 }}
          orientation="vertical"
          min={0}
          max={100}
          step={1}
          value={[volumePct]}
          onValueChange={([v]) => updateTrack(track.id, { volume: v / 100 })}
        >
          <Slider.Track
            className="relative h-full w-1 rounded-full"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
          >
            <Slider.Range
              className="absolute w-full rounded-full"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }}
            />
          </Slider.Track>
          <Slider.Thumb
            className="block h-3.5 w-3.5 rounded-full shadow-sm focus:outline-none focus:ring-1"
            style={
              {
                backgroundColor: '#e8e8f0',
                '--tw-ring-color': 'var(--color-accent)',
              } as CSSProperties
            }
            aria-label="Volume"
          />
        </Slider.Root>
      </div>

      {/* Volume readout (dB) */}
      <span
        className="text-[9px] font-mono tabular-nums mt-1"
        style={{ color: 'var(--color-text-dim)' }}
      >
        {track.volume === 0
          ? '-\u221E'
          : `${(20 * Math.log10(track.volume)).toFixed(1)}`}
      </span>

      {/* Pan knob (circular rotary control) */}
      <div className="flex items-center justify-center mt-1 mb-1">
        <PanKnob
          value={track.pan}
          onChange={(v) => updateTrack(track.id, { pan: v })}
        />
      </div>

      {/* M / S buttons */}
      <div className="flex gap-1">
        <button
          className="h-5 w-5 rounded text-[10px] font-bold transition-colors cursor-pointer"
          style={{
            backgroundColor: track.mute
              ? 'var(--color-record)'
              : 'rgba(255, 255, 255, 0.06)',
            color: track.mute ? '#fff' : 'var(--color-text-dim)',
            border: 'none',
          }}
          onClick={() => toggleMute(track.id)}
          title="Mute"
        >
          M
        </button>
        <button
          className="h-5 w-5 rounded text-[10px] font-bold transition-colors cursor-pointer"
          style={{
            backgroundColor: track.solo
              ? '#eab308'
              : 'rgba(255, 255, 255, 0.06)',
            color: track.solo ? '#000' : 'var(--color-text-dim)',
            border: 'none',
          }}
          onClick={() => toggleSolo(track.id)}
          title="Solo"
        >
          S
        </button>
      </div>
    </div>
  );
});

export { MeterSegments, PanKnob };
