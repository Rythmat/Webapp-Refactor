// ── PresenceCursors ──────────────────────────────────────────────────────
// Renders colored playhead lines for each remote user on the timeline.
// Rendered as absolutely-positioned divs inside the timeline container,
// layered on top of the existing red playhead.

import { useRemoteUsers, useIsCollabActive } from '../presence';

interface PresenceCursorsProps {
  /** Convert a tick position to a pixel offset. */
  tickToPixel: (tick: number) => number;
  /** Viewport width for bounds checking. */
  containerWidth: number;
}

export function PresenceCursors({
  tickToPixel,
  containerWidth,
}: PresenceCursorsProps) {
  const isActive = useIsCollabActive();
  const users = useRemoteUsers();

  if (!isActive || users.length === 0) return null;

  return (
    <>
      {users.map((user) => {
        if (user.cursorTick == null) return null;
        const px = tickToPixel(user.cursorTick);
        if (px < -2 || px > containerWidth + 2) return null;

        return (
          <div
            key={user.userId}
            className="pointer-events-none absolute inset-y-0"
            style={{
              width: 1.5,
              backgroundColor: user.color,
              opacity: 0.6,
              transform: `translateX(${px}px)`,
              willChange: 'transform',
            }}
          >
            {/* Small triangle indicator at the top */}
            <div
              className="absolute -left-[4px] top-0"
              style={{
                width: 0,
                height: 0,
                borderLeft: '4.5px solid transparent',
                borderRight: '4.5px solid transparent',
                borderTop: `6px solid ${user.color}`,
              }}
            />
            {/* Username label */}
            <div
              className="absolute left-1.5 top-0 whitespace-nowrap rounded px-1 py-0.5 text-[8px] font-medium"
              style={{
                backgroundColor: user.color,
                color: '#fff',
                lineHeight: 1,
              }}
            >
              {user.userName}
            </div>
          </div>
        );
      })}
    </>
  );
}
