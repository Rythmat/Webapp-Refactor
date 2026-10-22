import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/components/utilities';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { useStore } from '@/daw/store';
import {
  alternatingBarGroup,
  pixelToTick,
  tickToPixel,
  ticksPerBar,
  visibleSubdivisions,
  visibleTickRange,
} from '@/daw/utils/timelineScale';
import { getDawPalette } from '@/daw/ui/tokens';
import { ALL_GRID_VALUES } from '@/daw/utils/quantize';
import {
  AUTOMATION_PARAMS,
  MASTER_AUTOMATION_ID,
  MASTER_AUTOMATION_PARAMS,
  getAutomationParamDef,
} from '@/daw/audio/automationParams';
import type { AutomationPoint } from '@/daw/audio/automation';
import { withTransaction } from '@/daw/store/history';
import { TRACK_COLUMN_PX } from '@/daw/shell/tracklist/rowLayout';
import { ZoomControls } from '@/daw/shell/canvas/TimelineFooter';
import { pauseFollow } from '@/daw/editor/follow';

// The breakpoint editor, in the editor dock (owner, 2026-10-21: it used to sit
// between the tracks and the dock). Renders the open track's selected-param
// lane over the full timeline width, horizontally scroll-synced with the
// timeline canvas (same tickToPixel + store zoom/scrollLeft), so it avoids
// the timeline's fixed→variable row-height refactor entirely. It fills the
// dock's height, its controls in a column as wide as the track column, so
// the lane lines up with the timeline above it: the lane's name and every
// parameter it can automate as a list (2026-10-22; a drop-down before).
// The same editor opens the Master bus lane (automationOpenTrackId ===
// MASTER_AUTOMATION_ID), which reads/writes store.masterAutomation instead.

const PAD = 10; // vertical inset so points at min/max aren't clipped
/** How far one notch of Ctrl/⌘ + wheel zooms, as the timeline's lanes do. */
const WHEEL_ZOOM_STEP = 0.03;
const HEADER_W = TRACK_COLUMN_PX; // the track column, so the lane lines up
const HIT_R = 7;
const NO_POINTS: AutomationPoint[] = [];
/** The bar numbers along the lane's top: the timeline ruler's font. */
const BAR_FONT = "11px 'Glacial Indifference', system-ui, sans-serif";
/** The least room between two bar numbers, in px. */
const BAR_LABEL_MIN_PX = 28;

export function AutomationLaneEditor() {
  const openTrackId = useStore((s) => s.automationOpenTrackId);
  const paramId = useStore((s) => s.automationParamId);
  const setParamId = useStore((s) => s.setAutomationParamId);
  const zoom = useStore((s) => s.timelineZoom);
  const scrollLeft = useStore((s) => s.timelineScrollLeft);
  const gridSize = useStore((s) => s.timelineGridSize);
  const tsNum = useStore((s) => s.timeSignatureNumerator);
  const tsDen = useStore((s) => s.timeSignatureDenominator);
  const snapEnabled = useStore((s) => s.timelineSnapEnabled);
  // Subscribe to the tracks array so lane edits + activeEffects changes repaint.
  const tracks = useStore((s) => s.tracks);
  const masterAutomation = useStore((s) => s.masterAutomation);
  const upsertTrackPoint = useStore((s) => s.upsertAutomationPoint);
  const removeTrackPoint = useStore((s) => s.removeAutomationPoint);
  const upsertMasterPoint = useStore((s) => s.upsertMasterAutomationPoint);
  const removeMasterPoint = useStore((s) => s.removeMasterAutomationPoint);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  // The drawing area's height: the dock's, less the panel's edges.
  const [canvasH, setCanvasH] = useState(128);
  // The tick of the point being dragged (value-only). State (not a ref) so the
  // window drag-listener effect re-binds the moment a drag begins.
  const [dragTick, setDragTick] = useState<number | null>(null);
  // The dragged point's value: drawn from here while it moves, and written
  // to the lane once, on release (milestone 1.9). Null for a press that
  // hasn't moved an existing point.
  const [dragValue, setDragValue] = useState<number | null>(null);
  const dragValueRef = useRef<number | null>(null);

  const isMaster = openTrackId === MASTER_AUTOMATION_ID;
  const track = isMaster
    ? null
    : (tracks.find((t) => t.id === openTrackId) ?? null);

  // Params available for this track: all mixer params + effect params whose slot
  // is currently active on the track. The Master offers volume only.
  const options = isMaster
    ? MASTER_AUTOMATION_PARAMS
    : AUTOMATION_PARAMS.filter(
        (p) =>
          p.group === 'Mixer' ||
          (p.slot ? (track?.activeEffects.includes(p.slot) ?? false) : false),
      );
  const activeParamId = options.some((o) => o.id === paramId)
    ? paramId
    : 'volume';
  const def = getAutomationParamDef(activeParamId) ?? AUTOMATION_PARAMS[0];
  // The list, by group: the mixer's, then the active effects'.
  const groups = (['Mixer', 'Effect'] as const)
    .map((group) => ({
      label: group === 'Mixer' ? 'Mixer' : 'Effects',
      params: options.filter((p) => p.group === group),
    }))
    .filter((g) => g.params.length > 0);
  const laneOf = (id: string): AutomationPoint[] | undefined =>
    isMaster ? masterAutomation[id] : track?.automation?.[id];
  const storedPoints: AutomationPoint[] =
    (isMaster
      ? masterAutomation[activeParamId]
      : track?.automation?.[activeParamId]) ?? NO_POINTS;
  const points = useMemo(
    () =>
      dragTick === null || dragValue === null
        ? storedPoints
        : [
            ...storedPoints.filter((p) => p.tick !== dragTick),
            { tick: dragTick, value: dragValue },
          ].sort((a, b) => a.tick - b.tick),
    [storedPoints, dragTick, dragValue],
  );

  // One write path for both kinds of lane; the callers below stay lane-agnostic.
  const upsertPoint = useCallback(
    (laneId: string, paramId: string, point: AutomationPoint) =>
      laneId === MASTER_AUTOMATION_ID
        ? upsertMasterPoint(paramId, point)
        : upsertTrackPoint(laneId, paramId, point),
    [upsertMasterPoint, upsertTrackPoint],
  );
  const removePoint = useCallback(
    (laneId: string, paramId: string, tick: number) =>
      laneId === MASTER_AUTOMATION_ID
        ? removeMasterPoint(paramId, tick)
        : removeTrackPoint(laneId, paramId, tick),
    [removeMasterPoint, removeTrackPoint],
  );

  // ── coordinate mapping ──
  const yFromValue = useCallback(
    (value: number) => {
      const norm = (value - def.min) / (def.max - def.min || 1);
      return PAD + (canvasH - 2 * PAD) * (1 - norm);
    },
    [def.min, def.max, canvasH],
  );
  const valueFromY = useCallback(
    (y: number) => {
      const norm = 1 - (y - PAD) / (canvasH - 2 * PAD || 1);
      const raw = def.min + norm * (def.max - def.min);
      return Math.max(def.min, Math.min(def.max, raw));
    },
    [def.min, def.max, canvasH],
  );

  // ── measure width ──
  // Depends on openTrackId: the panel returns null while closed, so wrapRef only
  // exists once a lane opens — re-run then to attach the ResizeObserver and take
  // the first real measurement (otherwise width stays stuck at its initial 800).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      setWidth(el.clientWidth);
      setCanvasH(Math.max(40, el.clientHeight));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [openTrackId]);

  // ── draw ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = canvasH * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, canvasH);

    // background + horizontal guides
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fillRect(0, 0, width, canvasH);
    drawBarGrid(ctx, width, canvasH, zoom, scrollLeft, tsNum, tsDen);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (const f of [0.25, 0.5, 0.75]) {
      const y = PAD + (canvasH - 2 * PAD) * f;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (points.length === 0) return;

    const xs = points.map((p) => tickToPixel(p.tick, zoom, scrollLeft));
    const ys = points.map((p) => yFromValue(p.value));

    // interpolation line (hold before first / after last)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, ys[0]);
    ctx.lineTo(xs[0], ys[0]);
    for (let i = 0; i < points.length; i++) ctx.lineTo(xs[i], ys[i]);
    ctx.lineTo(width + 4, ys[ys.length - 1]);
    ctx.stroke();

    // breakpoints
    for (let i = 0; i < points.length; i++) {
      ctx.beginPath();
      ctx.arc(xs[i], ys[i], 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }, [points, zoom, scrollLeft, width, canvasH, yFromValue, tsNum, tsDen]);

  // ── mouse ──
  const snap = useCallback(
    (tick: number) => {
      const g = snapEnabled ? (ALL_GRID_VALUES[gridSize] ?? 120) : 1;
      return Math.max(0, Math.round(tick / g) * g);
    },
    [snapEnabled, gridSize],
  );

  const hitPoint = useCallback(
    (mx: number, my: number): AutomationPoint | null => {
      for (const p of points) {
        const px = tickToPixel(p.tick, zoom, scrollLeft);
        const py = yFromValue(p.value);
        if (Math.hypot(mx - px, my - py) <= HIT_R) return p;
      }
      return null;
    },
    [points, zoom, scrollLeft, yFromValue],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!openTrackId) return;
      const rect = canvasRef.current!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const hit = hitPoint(mx, my);
      // alt / right click deletes a point
      if (hit && (e.altKey || e.button === 2)) {
        removePoint(openTrackId, activeParamId, hit.tick);
        return;
      }
      if (e.button !== 0) return;
      if (hit) {
        // Drag a point's VALUE (vertical). Tick stays fixed — reposition in time
        // by deleting and re-adding.
        dragValueRef.current = null;
        setDragValue(null);
        setDragTick(hit.tick);
      } else {
        // Click empty space → add a breakpoint at the snapped tick, written
        // with wherever the drag that may follow leaves it.
        const tick = snap(pixelToTick(mx, zoom, scrollLeft));
        const value = valueFromY(my);
        dragValueRef.current = value;
        setDragValue(value);
        setDragTick(tick);
      }
    },
    [
      openTrackId,
      activeParamId,
      hitPoint,
      removePoint,
      snap,
      zoom,
      scrollLeft,
      valueFromY,
    ],
  );

  // window-level drag so it keeps tracking outside the canvas
  useEffect(() => {
    if (dragTick === null || !openTrackId) return;
    const onMove = (e: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const value = valueFromY(e.clientY - rect.top);
      dragValueRef.current = value;
      setDragValue(value);
    };
    const onUp = () => {
      const value = dragValueRef.current;
      dragValueRef.current = null;
      setDragTick(null);
      setDragValue(null);
      if (value === null) return;
      withTransaction('Edit automation', () =>
        upsertPoint(openTrackId, activeParamId, { tick: dragTick, value }),
      );
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragTick, openTrackId, activeParamId, upsertPoint, valueFromY]);

  // ── zoom and scroll ──
  // The lane shares the timeline's zoom and scroll, so it zooms as the
  // timeline does: Ctrl or ⌘ with the wheel (a trackpad pinch too) zooms at
  // the pointer, and a sideways swipe or Shift with the wheel scrolls. The
  // page's own zoom never takes the gesture (React's wheel listener is
  // passive, so this one is the lane's). Re-bound as a lane opens, when the
  // canvas's wrapper exists.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const s = useStore.getState();
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        pauseFollow();
        const x = e.clientX - el.getBoundingClientRect().left;
        s.zoomAtPoint(
          e.deltaY > 0 ? -WHEEL_ZOOM_STEP : WHEEL_ZOOM_STEP,
          x + s.timelineScrollLeft,
        );
        return;
      }
      const dx = e.shiftKey && e.deltaX === 0 ? e.deltaY : e.deltaX;
      if (dx === 0) return;
      e.preventDefault();
      pauseFollow();
      s.setTimelineScrollLeft(Math.max(0, s.timelineScrollLeft + dx));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [openTrackId]);

  if (!openTrackId || (!isMaster && !track)) return null;
  const laneName = isMaster ? 'Master' : (track?.name ?? '');

  return (
    <div
      data-testid="automation-lane-editor"
      className="flex h-full min-h-0"
      style={{ backgroundColor: 'var(--daw-surface-1)' }}
      data-tutorial-id="automation-lane"
    >
      {/* The lane's name, then every parameter it can automate, as a list:
          a click shows that parameter's lane (owner, 2026-10-22: it was a
          drop-down). A dot marks the ones with points already. */}
      <div
        className="flex shrink-0 flex-col border-r border-daw-hairline"
        style={{ width: HEADER_W }}
      >
        {/* The lane's name. No close button of its own (owner, 2026-10-22):
            the rail's Automation, the dock's close and Escape shut it. */}
        <div className="flex h-9 shrink-0 items-center px-3 pt-1">
          <span
            className={cn(TYPE_CLASS.label, 'truncate font-bold text-daw-text')}
            title={laneName}
          >
            {laneName}
          </span>
        </div>
        <div
          role="group"
          aria-label="Automate"
          data-testid="automation-param-list"
          data-tutorial-id="automation-param-select"
          className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-1.5"
        >
          {groups.map((group) => (
            <div key={group.label} className="flex flex-col">
              {/* The mixer's parameters come first, under no heading
                  (owner, 2026-10-22); the effects' are headed. */}
              {group.label === 'Mixer' ? null : (
                <span
                  className={cn(
                    TYPE_CLASS.micro,
                    'px-1.5 pb-0.5 pt-1.5 text-daw-text-3',
                  )}
                >
                  {group.label}
                </span>
              )}
              {group.params.map((p) => {
                const on = p.id === activeParamId;
                const used = (laneOf(p.id)?.length ?? 0) > 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={on}
                    data-param={p.id}
                    data-automated={used || undefined}
                    onClick={() => setParamId(p.id)}
                    className={cn(
                      TYPE_CLASS.label,
                      'flex h-7 w-full shrink-0 items-center gap-2 rounded-[var(--daw-radius-sm)] px-1.5 text-left',
                      on
                        ? 'bg-daw-pill-on font-bold text-daw-text'
                        : 'text-daw-text-2 hover:bg-daw-hover hover:text-daw-text',
                      TRANSITION,
                      FOCUS_RING,
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{p.label}</span>
                    {used ? (
                      <span
                        aria-label="has automation"
                        className="size-1.5 shrink-0 rounded-full bg-daw-text-2"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <span className={cn(TYPE_CLASS.label, 'px-3 pb-2 text-daw-text-3')}>
          Click to add · drag ↕ · ⌥-click to delete
        </span>
      </div>

      {/* Lane canvas */}
      <div ref={wrapRef} className="relative flex-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            width,
            height: canvasH,
            display: 'block',
            cursor: 'crosshair',
          }}
        />
        {/* The timeline's zoom, at hand while drawing: bottom right, clear
            of the dock's own buttons at the top. */}
        <ZoomControls
          testIdPrefix="automation-"
          className="absolute bottom-2 right-2 rounded-[var(--daw-radius-md)] border border-daw-hairline bg-daw-surface-1 px-0.5 py-0.5"
        />
      </div>
    </div>
  );
}

/**
 * The bars under the lane, as the timeline above draws them (owner,
 * 2026-10-22: to see where in the song a change lands): every other bar
 * group shaded, the bar lines and, zoomed in, the beats and their
 * subdivisions, with each bar's number along the top where there is room.
 */
function drawBarGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  zoom: number,
  scrollLeft: number,
  tsNum: number,
  tsDen: number,
): void {
  const { lineRgb, text3 } = getDawPalette();
  const barTicks = ticksPerBar(tsNum, tsDen);
  const range = visibleTickRange(width, zoom, scrollLeft);
  const visStart = Math.max(0, range.startTick - barTicks);
  const visEnd = range.endTick + barTicks;
  const x = (tick: number) => tickToPixel(tick, zoom, scrollLeft);

  // Every other group of bars, lifted.
  const groupTicks = alternatingBarGroup(zoom) * barTicks;
  ctx.fillStyle = `rgba(${lineRgb}, 0.025)`;
  for (
    let g = Math.floor(visStart / groupTicks);
    g * groupTicks <= visEnd;
    g++
  ) {
    if (g % 2 === 0) continue;
    ctx.fillRect(
      x(g * groupTicks),
      0,
      x((g + 1) * groupTicks) - x(g * groupTicks),
      height,
    );
  }

  // Bar lines, then the finer lines the zoom shows, each drawn once.
  const levels = visibleSubdivisions(zoom, tsNum, tsDen);
  for (const level of levels) {
    ctx.strokeStyle = `rgba(${lineRgb}, ${level.alpha})`;
    ctx.lineWidth = level.lineWidth;
    const first =
      Math.floor(visStart / level.tickInterval) * level.tickInterval;
    for (let tick = first; tick <= visEnd; tick += level.tickInterval) {
      if (tick < 0) continue;
      const coarser = levels.some(
        (l) =>
          l.tickInterval > level.tickInterval && tick % l.tickInterval === 0,
      );
      if (coarser) continue;
      const px = Math.round(x(tick)) + 0.5;
      if (px < -1 || px > width + 1) continue;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
      ctx.stroke();
    }
  }

  // Bar numbers, every bar or every few as the zoom allows.
  const barPx = x(barTicks) - x(0);
  let every = 1;
  while (every * barPx < BAR_LABEL_MIN_PX) every *= 2;
  ctx.font = BAR_FONT;
  ctx.fillStyle = text3;
  ctx.textBaseline = 'top';
  for (
    let bar = Math.floor(visStart / barTicks);
    bar * barTicks <= visEnd;
    bar++
  ) {
    if (bar % every !== 0) continue;
    const px = x(bar * barTicks);
    if (px < -BAR_LABEL_MIN_PX || px > width) continue;
    ctx.fillText(String(bar + 1), px + 3, 3);
  }
}
