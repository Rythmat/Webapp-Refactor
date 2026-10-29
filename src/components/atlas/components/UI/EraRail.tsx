import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  MUSICAL_ERAS,
  eraWindow,
  type MusicalEra,
} from '@/components/atlas/data/musicalEras';
import { usePrefersReducedMotion } from '@/components/atlas/hooks/useMediaQuery';
import { isTimelineView } from '@/components/atlas/navigation/atlasFrame';
import { useAtlasFrame } from '@/components/atlas/navigation/useAtlasNavigate';
import { useAtlasSelector } from '@/components/atlas/state/atlasStore';
import { ATLAS_Z } from '@/components/atlas/theme/layers';
import { RIVER } from '@/components/atlas/theme/river';
import { useTimeCamera } from '@/components/atlas/timeline/TimeCamera';
import {
  DOMAIN,
  MIN_SPAN,
  clampWindow,
  railSegments,
  railToYear,
  yearToRail,
  type TimeWindow,
} from '@/components/atlas/timeline/timeWindow';
import { MUSIC_HISTORY, contentGeneration } from '@/content/contentStore';
import { KEY_RAINBOW } from '@/features/landing/rainbow';
import { HORIZON_STREAKS } from '@/features/landing/sections/RainbowHorizon';
import { cn } from '@/lib/utils';
import { RailEvents } from './RailEvents';

const eraIndexOf = (year: number) =>
  MUSICAL_ERAS.findIndex((e) => year >= e.yearStart && year <= e.yearEnd);

/** Events per era, for the rail's widths (railSegments). */
function eraCounts(): number[] {
  return MUSIC_HISTORY.reduce(
    (counts, e) => {
      const i = eraIndexOf(e.year);
      if (i >= 0) counts[i] += 1;
      return counts;
    },
    MUSICAL_ERAS.map(() => 0),
  );
}

type Drag =
  | { kind: 'from' | 'to' }
  | { kind: 'pan'; startX: number; start: TimeWindow };

/** The streaks rising off the rim, fading upward. */
const STREAKS = {
  backgroundImage: HORIZON_STREAKS,
  maskImage: 'linear-gradient(to top, black, transparent)',
  WebkitMaskImage: 'linear-gradient(to top, black, transparent)',
};
const RAINBOW = { backgroundImage: KEY_RAINBOW };

/** Shown, or grown, while the pointer or focus is on the rail. */
const OPEN =
  'group-focus-within/rail:opacity-100 group-hover/rail:opacity-100 group-data-[dragging=true]/rail:opacity-100';

/**
 * The years along the bottom, after Dorot's range bar, drawn as the landing
 * page's horizon (owner, 2026-10-29: "the arc on the marketing landing page",
 * sections/HeroArc and RainbowHorizon) laid straight along the stage's foot:
 * a crisp rim in the landing's rainbow, its bloom clipped by the stage's
 * edge, and light streaks rising off it. The years in view are lit between
 * two handles, the rest dimmed. The stop's events stand on its rim
 * (RailEvents: the place's, or an artist's career), so the years and the
 * events are one timeline. While the pointer or focus is on it the streaks
 * rise and brighten, the eras' names show, and ticks mark their bounds.
 * Drag a handle to move one end, drag between them to slide the window,
 * pick an era to fly there.
 *
 * It moves the page's time camera, so it works the same on the timeline and
 * on the globe; on the globe, with no years chosen, all of time is lit.
 * Eras get room by the square root of their events (timeWindow.railSegments),
 * so the busy twentieth century is wide and the early eras still findable.
 */
export function EraRail() {
  const camera = useTimeCamera();
  const reducedMotion = usePrefersReducedMotion();
  const timeline = useAtlasFrame(isTimelineView);
  const filtered = useAtlasSelector((s) => s.timeWindow !== null);
  const segments = useMemo(
    () => railSegments(eraCounts()),
    // Rebuilt when content loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contentGeneration, MUSIC_HISTORY.length],
  );

  const railRef = useRef<HTMLDivElement>(null);
  const brushRef = useRef<HTMLDivElement>(null);
  const fromRef = useRef<HTMLButtonElement>(null);
  const toRef = useRef<HTMLButtonElement>(null);
  const drag = useRef<Drag | null>(null);
  const [dragging, setDragging] = useState(false);

  // All of time lights up on the globe while no years are chosen.
  const allOfTime = !timeline && !filtered;

  // Draw the window straight to the DOM, every frame the camera moves.
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      raf = 0;
      const w = allOfTime ? DOMAIN : camera.get();
      const a = yearToRail(w.from, segments) * 100;
      const b = yearToRail(w.to, segments) * 100;
      if (brushRef.current) {
        // Open upward, so the rim's bloom fades out instead of stopping
        // at the rail's top edge.
        brushRef.current.style.clipPath = `inset(-4rem ${100 - b}% 0 ${a}%)`;
      }
      for (const [el, year, pct] of [
        [fromRef.current, w.from, a],
        [toRef.current, w.to, b],
      ] as const) {
        if (!el) continue;
        el.style.left = `${pct}%`;
        el.setAttribute('aria-valuenow', String(Math.round(year)));
        el.setAttribute('aria-valuetext', String(Math.round(year)));
      }
    };
    draw();
    return camera.subscribe(() => {
      if (!raf) raf = requestAnimationFrame(draw);
    });
  }, [camera, segments, allOfTime]);

  const yearAtX = (clientX: number) => {
    const rect = railRef.current!.getBoundingClientRect();
    return railToYear((clientX - rect.left) / rect.width, segments);
  };

  const move = (clientX: number) => {
    const d = drag.current;
    if (!d) return;
    const w = camera.get();
    if (d.kind === 'pan') {
      const shift = yearAtX(clientX) - yearAtX(d.startX);
      camera.set(
        clampWindow({ from: d.start.from + shift, to: d.start.to + shift }),
      );
      return;
    }
    const year = yearAtX(clientX);
    camera.set(
      d.kind === 'from'
        ? { from: Math.min(year, w.to - MIN_SPAN), to: w.to }
        : { from: w.from, to: Math.max(year, w.from + MIN_SPAN) },
    );
  };

  const startDrag = (e: ReactPointerEvent, next: Drag) => {
    e.preventDefault();
    e.stopPropagation();
    if (allOfTime) camera.set(DOMAIN);
    drag.current = next;
    setDragging(true);
    // Listeners on the window, not pointer capture (Globe UI prompt 5).
    const onMove = (ev: PointerEvent) => move(ev.clientX);
    const onUp = () => {
      drag.current = null;
      setDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const onTrackDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    const year = yearAtX(e.clientX);
    const w = allOfTime ? DOMAIN : camera.get();
    if (!allOfTime && year >= w.from && year <= w.to) {
      startDrag(e, { kind: 'pan', startX: e.clientX, start: camera.get() });
    }
  };

  const flyTo = (era: MusicalEra) =>
    camera.tween(eraWindow(era), reducedMotion ? 0 : RIVER.tweenMs);

  const onHandleKey = (e: ReactKeyboardEvent, end: 'from' | 'to') => {
    const step = e.shiftKey ? 10 : 1;
    const w = allOfTime ? DOMAIN : camera.get();
    const by =
      e.key === 'ArrowLeft' || e.key === 'ArrowDown'
        ? -step
        : e.key === 'ArrowRight' || e.key === 'ArrowUp'
          ? step
          : 0;
    if (!by && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const target =
      e.key === 'Home' ? DOMAIN.from : e.key === 'End' ? DOMAIN.to : null;
    camera.set(
      end === 'from'
        ? {
            from: Math.min(target ?? w.from + by, w.to - MIN_SPAN),
            to: w.to,
          }
        : {
            from: w.from,
            to: Math.max(target ?? w.to + by, w.from + MIN_SPAN),
          },
    );
  };

  // The horizon: streaks, bloom and rim, from the top of the rail down.
  const horizon = (
    <>
      <div
        className={cn(
          'absolute inset-x-0 bottom-[5px] h-11 origin-bottom scale-y-[0.4] opacity-60 transition-[transform,opacity] duration-200 [transition-timing-function:var(--ease-out)] group-focus-within/rail:scale-y-100 group-hover/rail:scale-y-100 group-data-[dragging=true]/rail:scale-y-100',
          OPEN,
        )}
        style={STREAKS}
      />
      <div
        className="absolute inset-x-0 -bottom-3 h-8 opacity-50 blur-2xl"
        style={RAINBOW}
      />
      <div className="absolute inset-x-0 bottom-[5px] h-0.5" style={RAINBOW} />
    </>
  );

  const handle =
    'pointer-events-auto absolute bottom-0 flex h-5 w-7 -translate-x-1/2 translate-y-[3px] cursor-ew-resize items-center justify-center gap-0.5 rounded-full bg-white shadow-lg ring-2 ring-atlas-page transition-[scale] duration-150 [transition-timing-function:var(--ease-out)] hover:scale-110 focus-visible:outline-none focus-visible:ring-atlas-focus';
  const grip = <span className="h-2.5 w-px bg-atlas-page" />;

  return (
    <div
      className={cn(
        // Inset, so a handle at either end is never cut off. Only its
        // parts take the pointer, so its open height never covers the map
        // or a panel above the rim.
        'group/rail pointer-events-none absolute inset-x-4 bottom-0 h-11 touch-none select-none',
        ATLAS_Z.bars,
      )}
      data-dragging={dragging}
    >
      {/* What it looks like: the horizon, dimmed, and lit over the years in
          view (clipped to them as the camera moves). */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-25">{horizon}</div>
        <div ref={brushRef} className="absolute inset-0">
          {horizon}
        </div>
        {/* Where one era gives way to the next, rising off the rim while
            the rail is open. */}
        <div
          className={cn(
            'absolute inset-x-0 bottom-[5px] h-8 opacity-0 transition-opacity duration-200 [transition-timing-function:var(--ease-out)]',
            OPEN,
          )}
        >
          {segments.slice(1).map((s) => (
            <div
              key={s.era.id}
              className="absolute inset-y-0 w-px bg-gradient-to-t from-white/50 to-transparent"
              style={{ left: `${s.x0 * 100}%` }}
            />
          ))}
        </div>
      </div>
      {/* Where it takes the pointer: a thin band along the rim, the rail's
          height while it is open. */}
      <div
        ref={railRef}
        aria-hidden
        className="pointer-events-auto absolute inset-x-0 bottom-0 h-11 origin-bottom scale-y-[0.22] cursor-pointer transition-transform duration-200 [transition-timing-function:var(--ease-out)] group-focus-within/rail:scale-y-100 group-hover/rail:scale-y-100 group-data-[dragging=true]/rail:scale-y-100"
        onPointerDown={onTrackDown}
      />

      {/* The eras' names, shown with the rail grown. */}
      {/* Above the events on the rim; the names alone take the pointer, so
          the strip between them still pans the window. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-11 opacity-0 transition-opacity duration-200 [transition-timing-function:var(--ease-out)] group-focus-within/rail:opacity-100 group-hover/rail:opacity-100">
        {segments.map((s) => (
          <button
            key={s.era.id}
            className="absolute bottom-6 -translate-x-1/2 truncate rounded-full px-1.5 text-xs font-bold text-white drop-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white group-focus-within/rail:pointer-events-auto group-hover/rail:pointer-events-auto"
            style={{
              left: `${((s.x0 + s.x1) / 2) * 100}%`,
              maxWidth: `${(s.x1 - s.x0) * 100}%`,
            }}
            title={`Show ${s.era.label}`}
            type="button"
            onClick={() => flyTo(s.era)}
          >
            {s.era.label}
          </button>
        ))}
      </div>

      {/* The map's stop's events, on the rim (not on the timeline, whose
          river shows them). */}
      {!timeline && <RailEvents segments={segments} />}

      {(['from', 'to'] as const).map((end) => (
        <button
          key={end}
          ref={end === 'from' ? fromRef : toRef}
          aria-label={end === 'from' ? 'First year shown' : 'Last year shown'}
          aria-valuemax={DOMAIN.to}
          aria-valuemin={DOMAIN.from}
          aria-valuenow={Math.round((allOfTime ? DOMAIN : camera.get())[end])}
          className={handle}
          role="slider"
          type="button"
          onKeyDown={(e) => onHandleKey(e, end)}
          onPointerDown={(e) => startDrag(e, { kind: end })}
        >
          {grip}
          {grip}
          {grip}
        </button>
      ))}
    </div>
  );
}
