// ── PresenceTrackDots ────────────────────────────────────────────────────
// Renders small colored dots on a track row for each remote user who has
// that track selected, beside the row's name (shell/tracklist/TrackRow).

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
        <span className="text-[11px] font-medium text-daw-text-3">
          +{users.length - 4}
        </span>
      )}
    </div>
  );
}
