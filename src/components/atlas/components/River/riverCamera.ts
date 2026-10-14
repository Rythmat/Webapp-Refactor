import {
  DOMAIN,
  clampWindow,
  panBy,
  zoomAt,
  type TimeWindow,
} from '@/components/atlas/timeline/timeWindow';

/**
 * The years the river shows, held outside React: a gesture moves it many
 * times a frame, and the river draws it straight to the DOM (TimeRiver's
 * frame writer) without a render. React hears about it only when the zoom
 * crosses a level or the view leaves the drawn range, and the page's store
 * when it rests.
 */
export interface RiverCamera {
  get: () => TimeWindow;
  /** Move to a window (kept inside the domain); `source` says who moved it. */
  set: (window: TimeWindow, source?: CameraSource) => void;
  zoomAt: (anchorYear: number, factor: number) => void;
  panBy: (years: number) => void;
  /** Ease to a window over `ms` (at once under reduced motion: ms 0). */
  tween: (to: TimeWindow, ms: number) => void;
  /** Stop a running tween (a gesture took over). */
  stop: () => void;
  subscribe: (listener: (source: CameraSource) => void) => () => void;
}

/** A gesture, an animation, or the page (the URL, the era rail). */
export type CameraSource = 'gesture' | 'tween' | 'page';

const ease = (t: number) => 1 - (1 - t) ** 3;

export function createRiverCamera(
  initial: TimeWindow,
  domain: TimeWindow = DOMAIN,
): RiverCamera {
  let current = clampWindow(initial, domain);
  let raf = 0;
  const listeners = new Set<(source: CameraSource) => void>();

  const emit = (source: CameraSource) => listeners.forEach((l) => l(source));

  const set = (window: TimeWindow, source: CameraSource = 'gesture') => {
    const next = clampWindow(window, domain);
    if (next.from === current.from && next.to === current.to) return;
    current = next;
    emit(source);
  };

  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  return {
    get: () => current,
    set: (window, source) => {
      if (source !== 'tween') stop();
      set(window, source);
    },
    zoomAt: (anchor, factor) => {
      stop();
      set(zoomAt(current, anchor, factor, domain), 'gesture');
    },
    panBy: (years) => {
      stop();
      set(panBy(current, years, domain), 'gesture');
    },
    tween: (to, ms) => {
      stop();
      const target = clampWindow(to, domain);
      if (ms <= 0 || typeof requestAnimationFrame === 'undefined') {
        set(target, 'tween');
        return;
      }
      const start = current;
      const t0 = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / ms);
        const k = ease(t);
        set(
          {
            from: start.from + (target.from - start.from) * k,
            to: start.to + (target.to - start.to) * k,
          },
          'tween',
        );
        raf = t < 1 ? requestAnimationFrame(step) : 0;
      };
      raf = requestAnimationFrame(step);
    },
    stop,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
