import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FC,
  type ReactNode,
  type RefObject,
} from 'react';
import { useWakeLock } from '@/hooks/useWakeLock';

/**
 * The music stand: a chart read a page at a time ("page" view, fitted to the
 * screen) or as one long scroll. Set Lists and the song page's Full page view
 * both read charts this way, so the stand is one piece of code.
 *
 * The chart (ChordChart or ChordGrid, given `systemsPerPage`) marks the system
 * that opens each page with `data-page-start`. Those marks give the page tops;
 * a page's height is the distance to the next one, and one zoom fits the
 * fullest page, so the staves are the same size on every page.
 */

/** A page of the chart: where it starts and how tall it is, unzoomed. */
export interface ChartPage {
  top: number;
  height: number;
}

export interface ChartStand {
  boxRef: RefObject<HTMLDivElement>;
  contentRef: RefObject<HTMLDivElement>;
  page: number;
  pageCount: number;
  pages: ChartPage[];
  zoom: number;
  /** The stand's own size, for a caller that lays the chart out to fit it. */
  size: { width: number; height: number };
  turn: (delta: number) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

export function useChartStand({
  view,
  measureDeps,
  onStep,
  perform,
  onExit,
}: {
  view: 'page' | 'scroll';
  /** Anything that changes where the pages fall: the chart, its staves per
   *  page, how it is drawn. A change goes back to the first page. */
  measureDeps: readonly unknown[];
  /** Past the first or last page (and ↑ ↓ in page view): the next or
   *  previous chart. Returns whether there was one. */
  onStep: (delta: number) => boolean;
  /** The stand has the whole screen, and the screen is held awake. */
  perform: boolean;
  /** Esc while performing. */
  onExit: () => void;
}): ChartStand {
  const boxRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  /** Empty until measured, so the first paint is not clipped to nothing. */
  const [pages, setPages] = useState<ChartPage[]>([]);
  const [zoom, setZoom] = useState(1);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const pageCount = Math.max(1, pages.length);

  // A chart is read for three minutes without a finger touching the glass.
  useWakeLock(perform);

  // Real fullscreen where the browser offers it. iOS Safari has none for an
  // element, but the stand already covers the app with `fixed inset-0`, so
  // perform mode works there regardless.
  useEffect(() => {
    const root = document.documentElement;
    if (perform) {
      void root.requestFullscreen?.().catch(() => {
        /* denied or unsupported — the overlay still covers the app */
      });
    } else if (document.fullscreenElement) {
      void document.exitFullscreen?.().catch(() => {});
    }
  }, [perform]);

  // Where the pages fall, and how far the chart has to shrink to fit one.
  // `offsetTop` is layout, not paint, so the zoom below does not disturb it.
  useEffect(() => {
    setPage(0);
    const measure = () => {
      const box = boxRef.current;
      const content = contentRef.current;
      if (!box || !content) return;
      setSize({ width: box.clientWidth, height: box.clientHeight });
      const base = content.offsetTop;
      const tops = [
        0,
        ...Array.from(
          content.querySelectorAll<HTMLElement>('[data-page-start]'),
        ).map((el) => el.offsetTop - base),
      ];
      const total = content.offsetHeight;
      const next = tops.map((top, i) => ({
        top,
        height: Math.max(1, (tops[i + 1] ?? total) - top),
      }));
      const tallest = Math.max(...next.map((p) => p.height));
      setPages(next);
      setZoom(Math.min(1, box.clientHeight / tallest));
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (boxRef.current) observer.observe(boxRef.current);
    if (contentRef.current) observer.observe(contentRef.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, ...measureDeps]);

  const turn = useCallback(
    (delta: number) => {
      setPage((current) => {
        const next = current + delta;
        // Past either edge, the next thing comes up — what a player expects
        // from a pedal at the end of a chart.
        if (next < 0) {
          // Off the front: the previous piece comes up, at its first page.
          onStep(-1);
          return 0;
        }
        if (next >= pageCount) return onStep(1) ? 0 : current;
        return next;
      });
    },
    [onStep, pageCount],
  );

  // Arrow keys: pages across, scrolling down, and the next chart.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target?.isContentEditable) return;
      if (e.key === 'Escape' && perform) {
        e.preventDefault();
        onExit();
        return;
      }
      const box = boxRef.current;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        view === 'page' ? turn(1) : onStep(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        view === 'page' ? turn(-1) : onStep(-1);
      } else if (e.key === 'ArrowDown') {
        if (view === 'page') {
          e.preventDefault();
          onStep(1);
        } else if (box) {
          e.preventDefault();
          box.scrollBy({ top: box.clientHeight * 0.8, behavior: 'smooth' });
        }
      } else if (e.key === 'ArrowUp') {
        if (view === 'page') {
          e.preventDefault();
          onStep(-1);
        } else if (box) {
          e.preventDefault();
          box.scrollBy({ top: -box.clientHeight * 0.8, behavior: 'smooth' });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [turn, onStep, view, perform, onExit]);

  // A thumb across the chart turns the page — the gesture a player already
  // makes on a tablet, and the only one available with no keyboard.
  const swipe = useRef<{ x: number; y: number; t: number } | null>(null);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    swipe.current = touch
      ? { x: touch.clientX, y: touch.clientY, t: Date.now() }
      : null;
  }, []);
  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const from = swipe.current;
      swipe.current = null;
      const touch = e.changedTouches[0];
      if (!from || !touch) return;
      const dx = touch.clientX - from.x;
      const dy = touch.clientY - from.y;
      // Far enough to mean it, flat enough not to be a scroll, and quick
      // enough not to be a press. A tap on a chord never reaches here.
      if (
        Math.abs(dx) < 60 ||
        Math.abs(dx) < Math.abs(dy) * 1.5 ||
        Date.now() - from.t > 700
      )
        return;
      if (view === 'page') turn(dx < 0 ? 1 : -1);
      else onStep(dx < 0 ? 1 : -1);
    },
    [turn, onStep, view],
  );

  return {
    boxRef,
    contentRef,
    page,
    pageCount,
    pages,
    zoom,
    size,
    turn,
    onTouchStart,
    onTouchEnd,
  };
}

/**
 * The stand's frame. Page view is three nested jobs: zoom the whole chart down
 * until a page fits, clip to exactly this page's height so the next page's
 * staves cannot show through under a short one, and slide the chart up to the
 * page being read. Scroll view is a plain scroller.
 */
export const ChartStandBox: FC<{
  stand: ChartStand;
  view: 'page' | 'scroll';
  children: ReactNode;
}> = ({ stand, view, children }) => {
  const { boxRef, contentRef, pages, page, zoom, onTouchStart, onTouchEnd } =
    stand;
  return (
    <div
      ref={boxRef}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className={
        view === 'page'
          ? 'relative min-h-0 flex-1 overflow-hidden'
          : 'custom-scrollbar relative min-h-0 flex-1 overflow-y-auto'
      }
    >
      <div
        style={
          view === 'page'
            ? { transform: `scale(${zoom})`, transformOrigin: 'top center' }
            : undefined
        }
      >
        <div
          style={
            view === 'page'
              ? { height: pages[page]?.height, overflow: 'hidden' }
              : undefined
          }
        >
          <div
            ref={contentRef}
            className={view === 'page' ? 'px-5' : 'px-5 py-4'}
            style={
              view === 'page'
                ? {
                    transform: `translateY(-${pages[page]?.top ?? 0}px)`,
                    transition: 'transform 180ms ease-out',
                  }
                : undefined
            }
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
