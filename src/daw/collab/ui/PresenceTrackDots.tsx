// ── PresenceTrackDots ────────────────────────────────────────────────────
// Renders small colored dots on a track header for each remote user who
// has that track selected. Integrates into TrackHeader's row 1.

import { useTrackPresence } from '../presence';

interface PresenceTrackDotsProps {
  trackId: string;
}

export function PresenceTrackDots({ trackId }: PresenceTrackDotsProps) {
  const users = useTrackPresence(trackId);
  if (users.length === 0) return null;

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {users.slice(0, 4).map((user) => (
        <div
          key={user.userId}
          className="size-2 rounded-full"
          style={{ backgroundColor: user.color }}
          title={user.userName}
        />
      ))}
      {users.length > 4 && (
        <span
          className="text-[8px] font-medium"
          style={{ color: 'var(--color-text-dim)' }}
        >
          +{users.length - 4}
        </span>
      )}
    </div>
  );
}
