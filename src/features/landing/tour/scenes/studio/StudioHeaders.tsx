import { motion, useTransform, type MotionValue } from 'framer-motion';
import { Circle, Headphones, Plus, Sparkles } from 'lucide-react';
import { cn } from '@/components/utilities';
import type { StudioState, TrackId } from './studioScript';
import {
  MASTER_STRIPE,
  METER_COLOR,
  ON_FILL,
  ON_TEXT,
  STUDIO,
  type Row,
  type StudioLayout,
} from './studioTokens';
import type { MeterId } from './useStudioTransport';

type ToggleKind = 'muted' | 'soloed';

const TRACKS: { id: TrackId; name: string }[] = [
  { id: 'chords', name: 'Chords' },
  { id: 'drums', name: 'Drums' },
];
/** Picking a key floods the stripes top to bottom. */
const STRIPE_STAGGER_MS = 80;

const dbText = (level: number) =>
  level > 0.001 ? (20 * Math.log10(level)).toFixed(1) : '-∞';

/** A track's thin level meter (+ dB readout on desktop), driven per frame. */
const Meter = ({
  level,
  compact,
}: {
  level: MotionValue<number>;
  compact: boolean;
}) => {
  const db = useTransform(level, dbText);
  return (
    <span aria-hidden className="flex items-center gap-1.5">
      <span
        className={cn(
          'relative flex-1 overflow-hidden rounded-full',
          compact ? 'h-1' : 'h-1.5',
        )}
        style={{ background: STUDIO.border }}
      >
        <motion.span
          className="absolute inset-0 origin-left rounded-full"
          style={{ background: METER_COLOR, scaleX: level }}
        />
      </span>
      {!compact && (
        <motion.span
          className="w-7 text-right font-mono text-[9px]"
          style={{ color: STUDIO.textDim }}
        >
          {db}
        </motion.span>
      )}
    </span>
  );
};

/**
 * The track-header column (`TrackHeader.tsx`): CHORDS (selected) and DRUMS
 * with a left stripe in the track color — grey until a key is set, then the
 * key's color floods in — M/S buttons and live meters; MASTER and a dashed
 * "+ Add Track" on desktop.
 */
export const StudioHeaders = ({
  layout,
  compact,
  staticMode,
  trackColor,
  state,
  meters,
  onToggle,
}: {
  layout: StudioLayout;
  compact: boolean;
  staticMode: boolean;
  trackColor: string;
  state: Pick<StudioState, 'muted' | 'soloed'>;
  meters: Record<MeterId, MotionValue<number>>;
  onToggle: (kind: ToggleKind, track: TrackId) => void;
}) => {
  const bottom = layout.timeRuler
    ? layout.timeRuler.top + layout.timeRuler.h
    : layout.lanesBottom;
  const box = (row: Row) => ({
    top: row.top - layout.transportH,
    height: row.h,
  });
  const msSize = compact
    ? 'size-[22px] text-[12px]'
    : 'size-[18px] text-[10px]';

  return (
    <div
      className="absolute left-0 border-r"
      style={{
        top: layout.transportH,
        height: bottom - layout.transportH,
        width: layout.headerW,
        background: STUDIO.surface,
        borderColor: STUDIO.border,
      }}
    >
      {TRACKS.map(({ id, name }, i) => {
        const row = layout.rows[id];
        const selected = id === 'chords';
        return (
          <div
            key={id}
            className={cn(
              'absolute inset-x-0 flex flex-col justify-between border-b border-white/[0.08]',
              compact ? 'px-2.5 py-2' : 'px-3 py-1.5',
            )}
            style={{
              ...box(row),
              background: selected ? STUDIO.surface2 : STUDIO.surface,
              borderLeftWidth: compact ? 4 : 3,
              borderLeftStyle: 'solid',
              borderLeftColor: trackColor,
              transition: `border-left-color 300ms ease ${
                staticMode ? 0 : i * STRIPE_STAGGER_MS
              }ms`,
            }}
          >
            {selected && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded border-2 border-white/90"
              />
            )}
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full transition-colors duration-300"
                style={{ background: trackColor }}
              />
              <span
                className={cn(
                  'uppercase tracking-wide',
                  compact ? 'text-[13px]' : 'text-[11px]',
                )}
                style={{ color: STUDIO.text }}
              >
                {name}
              </span>
              {!compact && (
                <span
                  aria-hidden
                  className="ml-auto text-[9px] uppercase"
                  style={{ color: STUDIO.textDim }}
                >
                  Auto
                </span>
              )}
            </span>
            <span className="flex items-center gap-1">
              {!compact && (
                <span
                  aria-hidden
                  className="mr-auto flex h-4 items-center gap-0.5 rounded border px-1 text-[9px]"
                  style={{ borderColor: STUDIO.border, color: STUDIO.textDim }}
                >
                  <Headphones className="size-2.5" />
                  MON
                </span>
              )}
              {(
                [
                  ['muted', 'M', 'Mute'],
                  ['soloed', 'S', 'Solo'],
                ] as const
              ).map(([kind, letter, verb]) => {
                const on = state[kind].includes(id);
                return (
                  <button
                    key={kind}
                    type="button"
                    aria-label={`${verb} ${name}`}
                    aria-pressed={on}
                    onClick={() => onToggle(kind, id)}
                    className={cn(
                      'grid place-items-center rounded-[3px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80',
                      msSize,
                      !on && 'hover:bg-white/[0.08]',
                    )}
                    style={{
                      background: on ? ON_FILL : 'transparent',
                      borderColor: on ? ON_FILL : 'rgba(255, 255, 255, 0.15)',
                      color: on ? ON_TEXT : STUDIO.textDim,
                    }}
                  >
                    {letter}
                  </button>
                );
              })}
              {!compact && (
                <span
                  aria-hidden
                  className="grid size-[18px] place-items-center rounded-full border"
                  style={{ borderColor: STUDIO.border, color: STUDIO.textDim }}
                >
                  <Circle className="size-2" />
                </span>
              )}
            </span>
            <Meter level={meters[id]} compact={compact} />
          </div>
        );
      })}
      {layout.rows.master && (
        <div
          aria-hidden
          className="absolute inset-x-0 flex flex-col justify-center gap-1.5 border-b border-l-[3px] border-white/[0.08] px-3"
          style={{
            ...box(layout.rows.master),
            background: STUDIO.surface2,
            borderLeftColor: MASTER_STRIPE,
          }}
        >
          <span className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full"
              style={{ background: MASTER_STRIPE }}
            />
            <span
              className="text-[11px] uppercase tracking-wide"
              style={{ color: STUDIO.text }}
            >
              Master
            </span>
            <span
              className="ml-auto flex items-center gap-0.5 rounded px-1 text-[9px]"
              style={{ background: STUDIO.surface3, color: STUDIO.textDim }}
            >
              <Sparkles className="size-2.5" />
              FX
            </span>
          </span>
          <Meter level={meters.master} compact={false} />
        </div>
      )}
      {layout.rows.addTrack && (
        <span
          aria-hidden
          className="absolute inset-x-3 flex items-center gap-1 rounded-md border border-dashed border-white/10 px-2 text-[10px]"
          style={{ ...box(layout.rows.addTrack), color: STUDIO.textDim }}
        >
          <Plus className="size-3" />
          Add Track
        </span>
      )}
    </div>
  );
};
