import { motion, type MotionValue } from 'framer-motion';
import { Plus } from 'lucide-react';
import { cn } from '@/components/utilities';
import { SHELL, type ShellLayout } from './shellTokens';
import type { TrackId } from './studioScript';
import type { MeterId } from './useStudioTransport';

const TRACKS: { id: TrackId; name: string }[] = [
  { id: 'chords', name: 'Chords' },
  { id: 'bass', name: 'Bass' },
  { id: 'drums', name: 'Drums' },
];
/** Prism setting the key floods the stripes top to bottom. */
const STRIPE_STAGGER_MS = 80;

/**
 * The track column (`daw/shell/tracklist/TrackRow.tsx`): the "Now playing"
 * corner over the rulers, then a row per track — a stripe in the track color
 * (grey until Prism sets a key, then the key's color floods in), the number
 * in its circle, the name, M · S · arm (desktop), and the volume pill whose
 * meter moves with playback — and the quiet "+ Add track". Display only.
 */
export const StudioTracks = ({
  layout,
  compact,
  staticMode,
  trackColor,
  nowPlaying,
  meters,
}: {
  layout: ShellLayout;
  compact: boolean;
  staticMode: boolean;
  trackColor: string;
  nowPlaying: { label: string; color: string } | null;
  meters: Record<MeterId, MotionValue<number>>;
}) => {
  const { font, rows } = layout;
  const corner = layout.chordLane.top + layout.chordLane.h;
  const circle = compact ? 28 : 22;
  return (
    <div
      className="absolute inset-y-0 left-0 border-r"
      style={{
        width: layout.trackW,
        background: SHELL.surface,
        borderColor: SHELL.hairline,
      }}
    >
      {/* Now playing */}
      <div
        className="absolute inset-x-0 top-0 flex flex-col justify-center gap-1 border-b px-3"
        style={{ height: corner, borderColor: SHELL.hairline }}
      >
        <span
          className="uppercase tracking-wider"
          style={{ fontSize: font.micro, color: SHELL.text3 }}
        >
          Now playing
        </span>
        <span
          className="flex items-center gap-1.5 font-bold"
          style={{ fontSize: font.body, color: SHELL.text }}
        >
          <span
            aria-hidden
            className="rounded-full transition-colors duration-200"
            style={{
              width: compact ? 10 : 8,
              height: compact ? 10 : 8,
              background: nowPlaying?.color ?? SHELL.hairline,
            }}
          />
          {nowPlaying?.label ?? '—'}
        </span>
      </div>

      <div
        data-tour-target="tracks"
        className="absolute inset-x-0"
        style={{
          top: rows.chords.top,
          height: rows.drums.top + rows.drums.h - rows.chords.top,
        }}
      >
        {TRACKS.map(({ id, name }, i) => {
          const row = rows[id];
          return (
            <div
              key={id}
              aria-hidden
              className="absolute inset-x-0 flex flex-col justify-center gap-1.5 border-b pl-3 pr-2"
              style={{
                top: row.top - rows.chords.top,
                height: row.h,
                borderColor: SHELL.bg,
                background: i === 0 ? 'rgba(255, 255, 255, 0.04)' : undefined,
              }}
            >
              <span
                className="absolute inset-y-0 left-0 w-1"
                style={{
                  background: trackColor,
                  transition: staticMode
                    ? undefined
                    : `background-color 300ms ease ${i * STRIPE_STAGGER_MS}ms`,
                }}
              />
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  className="grid shrink-0 place-items-center rounded-full font-bold"
                  style={{
                    width: circle,
                    height: circle,
                    fontSize: font.label,
                    color: SHELL.text3,
                    background: 'rgba(255, 255, 255, 0.04)',
                  }}
                >
                  {i + 1}
                </span>
                <span
                  className="min-w-0 flex-1 truncate font-bold"
                  style={{ fontSize: font.label, color: SHELL.text }}
                >
                  {name}
                </span>
                {/* Compact's column only fits the number and the name. */}
                {(compact ? [] : ['M', 'S']).map((l) => (
                  <span
                    key={l}
                    className="grid shrink-0 place-items-center rounded-full border"
                    style={{
                      width: circle,
                      height: circle,
                      fontSize: font.micro,
                      color: SHELL.pillText,
                      borderColor: SHELL.hairline,
                    }}
                  >
                    {l}
                  </span>
                ))}
                {!compact && (
                  <span className="grid size-[22px] shrink-0 place-items-center">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: SHELL.text3 }}
                    />
                  </span>
                )}
              </span>
              <span
                className={cn(
                  'relative overflow-hidden rounded-[3px]',
                  compact ? 'h-4' : 'h-3',
                )}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  marginRight: compact ? 4 : 30,
                }}
              >
                <motion.span
                  className="absolute inset-y-0 left-0 w-full origin-left"
                  style={{
                    background: trackColor,
                    opacity: 0.55,
                    scaleX: meters[id],
                  }}
                />
                <span
                  className="absolute inset-y-0 w-0.5"
                  style={{ left: '72%', background: SHELL.text2 }}
                />
              </span>
            </div>
          );
        })}
      </div>

      <div
        aria-hidden
        className="absolute inset-x-0 grid place-items-center"
        style={{ top: layout.addTrack.top, height: layout.addTrack.h }}
      >
        <span
          className="flex items-center gap-1.5"
          style={{ fontSize: font.label, color: SHELL.text3 }}
        >
          <Plus className={compact ? 'size-4' : 'size-3'} />
          Add track
        </span>
      </div>
    </div>
  );
};
