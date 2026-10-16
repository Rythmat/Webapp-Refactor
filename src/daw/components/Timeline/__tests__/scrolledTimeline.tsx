import { useRef } from 'react';
import { Timeline } from '../Timeline';

/**
 * The Timeline in its scroller, as TrackArea mounts it: the canvas reads its
 * scroll offset from there. `onScroller` sees the scroller as it mounts.
 */
export function ScrolledTimeline({
  onScroller,
}: {
  onScroller?: (node: HTMLDivElement) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  return (
    <div
      ref={(node) => {
        ref.current = node;
        if (node) onScroller?.(node);
      }}
    >
      <Timeline scrollRef={ref} />
    </div>
  );
}
