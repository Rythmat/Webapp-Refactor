import { memo, useCallback, useRef, useState, type PointerEvent } from 'react';
import { useDevCommitCount } from '@/daw/dev/DevProfiler';
import { useStore, useTrackIds } from '@/daw/store';
import { withTransaction } from '@/daw/store/history';
import { dropGap, gapTop, indexAfterDrop } from './reorder';
import { rowLayoutOf } from './rowLayout';
import { TrackRow } from './TrackRow';
import { useTrackListKeys } from './useTrackListKeys';

// ── The track list (milestone 2.6) ─────────────────────────────────────────
//
// The rows beside the lanes, in the scroller they share (TrackArea). It
// reads only the track ids, so an edit to one track re-renders that row
// alone. One row's name is in the Tab order (the selected track's, else the
// first), and the list's keys move from there (useTrackListKeys).
//
// A row's colour bar is its grip: dragging it shows where the row will land
// and moves it there on release, as one undo step. (Framer's Reorder, which
// measured every row on each track edit, is gone: timeline-24.) ⌥↑ and ⌥↓
// move a row from the keyboard.

interface Drag {
  trackId: string;
  from: number;
  gap: number;
  pointerId: number;
}

export const TrackList = memo(function TrackList() {
  useDevCommitCount('TrackList');
  const ids = useTrackIds();
  const selected = useStore((s) => s.selectedTrackId);
  const listRef = useRef<HTMLUListElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  useTrackListKeys(listRef);

  // The selected track's row has the Tab stop and the lessons' ⋯ anchor.
  const lead = selected !== null && ids.includes(selected) ? selected : ids[0];

  const onGripDown = useCallback(
    (event: PointerEvent<HTMLElement>, trackId: string) => {
      if (event.button !== 0) return;
      const list = listRef.current;
      if (!list) return;
      event.preventDefault();
      event.stopPropagation();
      const from = useStore
        .getState()
        .tracks.findIndex((t) => t.id === trackId);
      if (from < 0) return;
      const grip = event.currentTarget;
      grip.setPointerCapture(event.pointerId);
      setDrag({ trackId, from, gap: from, pointerId: event.pointerId });

      const gapAt = (clientY: number) =>
        dropGap(
          rowLayoutOf(useStore.getState().tracks),
          clientY - list.getBoundingClientRect().top,
        );
      const onMove = (e: globalThis.PointerEvent) => {
        if (e.pointerId !== event.pointerId) return;
        const gap = gapAt(e.clientY);
        setDrag((d) => (d && d.gap !== gap ? { ...d, gap } : d));
      };
      const onEnd = (e: globalThis.PointerEvent) => {
        if (e.pointerId !== event.pointerId) return;
        grip.removeEventListener('pointermove', onMove);
        grip.removeEventListener('pointerup', onEnd);
        grip.removeEventListener('pointercancel', onEnd);
        setDrag(null);
        if (e.type === 'pointercancel') return;
        const to = indexAfterDrop(from, gapAt(e.clientY));
        if (to !== from) {
          withTransaction('Move track', () =>
            useStore.getState().reorderTrack(trackId, to),
          );
        }
      };
      grip.addEventListener('pointermove', onMove);
      grip.addEventListener('pointerup', onEnd);
      grip.addEventListener('pointercancel', onEnd);
    },
    [],
  );

  const layout = rowLayoutOf(useStore.getState().tracks);
  const showDrop =
    drag !== null && drag.gap !== drag.from && drag.gap !== drag.from + 1;

  return (
    <ul
      ref={listRef}
      aria-label="Tracks"
      data-testid="track-list"
      className="relative m-0 list-none p-0"
    >
      {ids.map((id, index) => (
        <TrackRow
          key={id}
          trackId={id}
          index={index}
          tabStop={id === lead}
          menuAnchor={id === lead}
          onGripDown={onGripDown}
          dragging={drag?.trackId === id}
        />
      ))}
      {showDrop ? (
        <li
          aria-hidden
          data-testid="track-drop-line"
          className="pointer-events-none absolute inset-x-0 h-0.5 -translate-y-1/2 bg-daw-text"
          style={{ top: gapTop(layout, drag.gap) }}
        />
      ) : null}
    </ul>
  );
});
