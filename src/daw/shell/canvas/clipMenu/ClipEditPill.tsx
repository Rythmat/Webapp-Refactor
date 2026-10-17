import { useCallback, useEffect, useState, type RefObject } from 'react';
import { cn } from '@/components/utilities';
import {
  clipBoxOf,
  useTimelineTracks,
} from '@/daw/components/Timeline/timelineGeometry';
import { TRIM_ZONE_PX } from '@/daw/components/Timeline/clipChrome';
import { LANE_HEADER_PX } from '@/daw/shell/tracklist/rowLayout';
import { useStore } from '@/daw/store';
import { Button } from '@/daw/ui/Button';
import { useCanvasMenuStore, openClipMenu } from './canvasMenuStore';
import { clipTitle, findClip } from './clipActions';

// ── The Edit pill (milestone 2.12) ─────────────────────────────────────────
//
// A real button over the selected clip, at its bottom left, that opens the
// clip menu: a Chromebook student never needs a two-finger tap (Soundtrap's
// pill, ST1). It is placed in the canvas's own coordinates from the clip's
// box (timelineGeometry.clipBoxOf), so it scrolls with the lanes, and hides
// while the clip is dragged (the Timeline marks its canvas data-dragging),
// under the sticky rulers, and once the clip is out of sight.

/** 24 px high, the target floor; wide enough for "Edit" at 12 px. */
const PILL_H = 24;
const PILL_W = 44;
/** Its gap from the clip's bottom and right edges. */
const INSET = 4;
/** Its gap from the clip's left edge: clear of the trim zone there. */
const LEFT_INSET = TRIM_ZONE_PX + 2;

export interface ClipEditPillProps {
  /** The lanes' scroller (TrackArea), for its vertical scroll. */
  scrollRef: RefObject<HTMLDivElement>;
  /** The canvas's width, px. */
  viewportWidth: number;
}

export function ClipEditPill({ scrollRef, viewportWidth }: ClipEditPillProps) {
  const clipId = useStore((s) => s.selectedClipId);
  const zoom = useStore((s) => s.timelineZoom);
  const scrollLeft = useStore((s) => s.timelineScrollLeft);
  const tracks = useTimelineTracks();
  const menuOpen = useCanvasMenuStore(
    (s) =>
      s.request?.source === 'pill' &&
      s.request.target.kind === 'clip' &&
      s.request.target.clipId === clipId,
  );

  // The scroller's top, read on scroll: the pill hides once its clip has
  // gone under the rulers, which are drawn over the lanes.
  const [scrollTop, setScrollTop] = useState(0);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const read = () => setScrollTop(el.scrollTop);
    read();
    el.addEventListener('scroll', read, { passive: true });
    return () => el.removeEventListener('scroll', read);
  }, [scrollRef]);

  const register = useCallback((node: HTMLButtonElement | null) => {
    useCanvasMenuStore.getState().setPill(node);
  }, []);

  const box = clipId ? clipBoxOf(tracks, clipId, zoom, scrollLeft) : null;
  if (!clipId || !box) return null;
  const right = box.x + box.w;
  if (right < INSET || box.x > viewportWidth - INSET) return null;
  const top = box.y + box.h - PILL_H - INSET;
  if (top < scrollTop + LANE_HEADER_PX) return null;
  // In the part of the clip that shows, at its left; a clip narrower than
  // the pill lets it hang out to the right.
  const visibleLeft = Math.max(box.x, 0) + LEFT_INSET;
  const left =
    visibleLeft + PILL_W <= right - INSET
      ? visibleLeft
      : Math.max(box.x + INSET, right - INSET - PILL_W);

  const found = findClip(useStore.getState(), {
    trackId: box.trackId,
    clipId,
  });
  const title = found ? clipTitle(found) : 'clip';

  return (
    <Button
      ref={register}
      size="sm"
      data-ds="v2"
      data-tutorial-id="clip-edit-pill"
      data-clip-id={clipId}
      aria-haspopup="menu"
      aria-expanded={menuOpen}
      aria-label={`Edit ${title}`}
      title="Clip menu: cut, rename, split, mute, transpose and more"
      className={cn(
        'absolute z-[var(--daw-z-sticky)] bg-daw-popover',
        'group-data-[dragging=true]/canvas:invisible',
      )}
      style={{ left, top, height: PILL_H, minWidth: PILL_W }}
      onClick={() => {
        openClipMenu({ trackId: box.trackId, clipId }, 'pill');
      }}
    >
      Edit
    </Button>
  );
}
