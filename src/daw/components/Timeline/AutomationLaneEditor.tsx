import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '@/daw/store';
import { tickToPixel, pixelToTick } from '@/daw/utils/timelineScale';
import { ALL_GRID_VALUES } from '@/daw/utils/quantize';
import {
  AUTOMATION_PARAMS,
  getAutomationParamDef,
} from '@/daw/audio/automationParams';
import type { AutomationPoint } from '@/daw/audio/automation';

// Docked breakpoint editor for the arrange view. Renders the open track's
// selected-param lane over the full timeline width, horizontally scroll-synced
// with the timeline canvas (same tickToPixel + store zoom/scrollLeft), so it
// avoids the timeline's fixed→variable row-height refactor entirely.

const LANE_H = 132; // total panel height (px)
const CANVAS_H = LANE_H - 4; // drawing area
const PAD = 10; // vertical inset so points at min/max aren't clipped
const HEADER_W = 200; // matches the track-header column width
const HIT_R = 7;

export function AutomationLaneEditor() {
  const openTrackId = useStore((s) => s.automationOpenTrackId);
  const paramId = useStore((s) => s.automationParamId);
  const setParamId = useStore((s) => s.setAutomationParamId);
  const setOpen = useStore((s) => s.setAutomationOpenTrackId);
  const zoom = useStore((s) => s.timelineZoom);
  const scrollLeft = useStore((s) => s.timelineScrollLeft);
  const gridSize = useStore((s) => s.timelineGridSize);
  const snapEnabled = useStore((s) => s.timelineSnapEnabled);
  // Subscribe to the tracks array so lane edits + activeEffects changes repaint.
  const tracks = useStore((s) => s.tracks);
  const upsertPoint = useStore((s) => s.upsertAutomationPoint);
  const removePoint = useStore((s) => s.removeAutomationPoint);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  // The tick of the point being dragged (value-only). State (not a ref) so the
  // window drag-listener effect re-binds the moment a drag begins.
  const [dragTick, setDragTick] = useState<number | null>(null);

  const track = tracks.find((t) => t.id === openTrackId) ?? null;

  // Params available for this track: all mixer params + effect params whose slot
  // is currently active on the track.
  const options = AUTOMATION_PARAMS.filter(
    (p) =>
      p.group === 'Mixer' ||
      (p.slot ? (track?.activeEffects.includes(p.slot) ?? false) : false),
  );
  const activeParamId = options.some((o) => o.id === paramId)
    ? paramId
    : 'volume';
  const def = getAutomationParamDef(activeParamId) ?? AUTOMATION_PARAMS[0];
  const points: AutomationPoint[] = track?.automation?.[activeParamId] ?? [];

  // ── coordinate mapping ──
  const yFromValue = useCallback(
    (value: number) => {
      const norm = (value - def.min) / (def.max - def.min || 1);
      return PAD + (CANVAS_H - 2 * PAD) * (1 - norm);
    },
    [def.min, def.max],
  );
  const valueFromY = useCallback(
    (y: number) => {
      const norm = 1 - (y - PAD) / (CANVAS_H - 2 * PAD || 1);
      const raw = def.min + norm * (def.max - def.min);
      return Math.max(def.min, Math.min(def.max, raw));
    },
    [def.min, def.max],
  );

  // ── measure width ──
  // Depends on openTrackId: the panel returns null while closed, so wrapRef only
  // exists once a lane opens — re-run then to attach the ResizeObserver and take
  // the first real measurement (otherwise width stays stuck at its initial 800).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
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
    canvas.height = CANVAS_H * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, CANVAS_H);

    // background + horizontal guides
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fillRect(0, 0, width, CANVAS_H);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (const f of [0.25, 0.5, 0.75]) {
      const y = PAD + (CANVAS_H - 2 * PAD) * f;
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
  }, [points, zoom, scrollLeft, width, yFromValue]);

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
        setDragTick(hit.tick);
      } else {
        // Click empty space → add a breakpoint at the snapped tick.
        const tick = snap(pixelToTick(mx, zoom, scrollLeft));
        upsertPoint(openTrackId, activeParamId, {
          tick,
          value: valueFromY(my),
        });
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
      upsertPoint,
      valueFromY,
    ],
  );

  // window-level drag so it keeps tracking outside the canvas
  useEffect(() => {
    if (dragTick === null || !openTrackId) return;
    const onMove = (e: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const my = e.clientY - rect.top;
      upsertPoint(openTrackId, activeParamId, {
        tick: dragTick,
        value: valueFromY(my),
      });
    };
    const onUp = () => setDragTick(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragTick, openTrackId, activeParamId, upsertPoint, valueFromY]);

  if (!openTrackId || !track) return null;

  return (
    <div
      className="flex shrink-0 border-t"
      style={{
        height: LANE_H,
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
      data-tutorial-id="automation-lane"
    >
      {/* Label / controls column */}
      <div
        className="flex shrink-0 flex-col justify-between border-r p-2"
        style={{ width: HEADER_W, borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between">
          <span
            className="truncate text-[11px] font-semibold"
            style={{ color: 'var(--color-text)' }}
            title={track.name}
          >
            {track.name}
          </span>
          <button
            onClick={() => setOpen(null)}
            className="flex size-5 items-center justify-center rounded transition-colors hover:bg-white/10"
            style={{ color: 'var(--color-text-dim)' }}
            aria-label="Close automation lane"
          >
            <X size={13} />
          </button>
        </div>
        <div className="flex flex-col gap-1">
          <span
            className="text-[9px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--color-text-dim)' }}
          >
            Automate
          </span>
          <select
            data-tutorial-id="automation-param-select"
            value={activeParamId}
            onChange={(e) => setParamId(e.target.value)}
            className="w-full rounded px-1.5 py-1 text-[11px] outline-none"
            style={{
              backgroundColor: 'var(--color-surface-2)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          >
            {options.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <span className="text-[9px]" style={{ color: 'var(--color-text-dim)' }}>
          Click to add · drag ↕ · alt-click to delete
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
            height: CANVAS_H,
            display: 'block',
            cursor: 'crosshair',
          }}
        />
      </div>
    </div>
  );
}
