import { Clock3 } from 'lucide-react';
import { cn } from '@/components/utilities';
import type { SongLight } from '@/features/songs/songGate';

/**
 * A song's light, drawn (songGate.ts): the back office's red or green dot,
 * and the app's Coming soon badge on a red song.
 */

const DOT: Record<SongLight, string> = {
  green: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]',
  red: 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]',
};

export const LIGHT_LABEL: Record<SongLight, string> = {
  green: 'Green light: ready for students',
  red: 'Red light: not ready, Coming soon to students',
};

/** The back office's light on a song: a red or green dot. */
export function LightDot({
  light,
  className,
}: {
  light: SongLight;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={LIGHT_LABEL[light]}
      title={LIGHT_LABEL[light]}
      data-song-light={light}
      className={cn(
        'inline-block size-3 shrink-0 rounded-full ring-2 ring-black/60',
        DOT[light],
        className,
      )}
    />
  );
}

/** Over a red song's art in the app: it is coming soon. */
export function ComingSoonBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full bg-black/65 px-2 text-[0.75rem] font-medium text-white',
        className,
      )}
    >
      <Clock3 aria-hidden className="size-3.5" strokeWidth={2.5} />
      Coming soon
    </span>
  );
}
