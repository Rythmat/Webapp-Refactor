import { Undo2, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import type { InteractionInputProps } from './types';

interface Point {
  x: number;
  y: number;
}
interface Stroke {
  color: string;
  width: number;
  points: Point[];
}

const CANVAS_W = 640;
const CANVAS_H = 360;

/**
 * Minimal HTML5-canvas draw input. Stores stroke JSON (color/width/point list).
 * The 4 backgrounds — blank / staff / keyboard / grid — are drawn behind the
 * strokes each frame so switching interaction config doesn't require regen.
 *
 * Stroke JSON caps at 200 KB total per the backend contract; the submit
 * button surfaces the current size to the user.
 */
export const DrawInput = ({
  interaction,
  onSubmit,
  disabled,
}: InteractionInputProps) => {
  const background = interaction.draw?.background ?? 'blank';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [current, setCurrent] = useState<Stroke | null>(null);

  const redraw = useCallback(
    (all: Stroke[], pending: Stroke | null) => {
      const c = canvasRef.current;
      if (!c) return;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawBackground(ctx, background);
      const drawList = pending ? [...all, pending] : all;
      for (const stroke of drawList) {
        if (stroke.points.length < 2) continue;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
    },
    [background],
  );

  // Re-render on any state change.
  const setCanvasRef = useCallback(
    (node: HTMLCanvasElement | null) => {
      canvasRef.current = node;
      redraw(strokes, current);
    },
    [strokes, current, redraw],
  );

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
    };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const stroke: Stroke = {
      color: '#111',
      width: 2.5,
      points: [getPoint(e)],
    };
    setCurrent(stroke);
    redraw(strokes, stroke);
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!current || disabled) return;
    const next: Stroke = {
      ...current,
      points: [...current.points, getPoint(e)],
    };
    setCurrent(next);
    redraw(strokes, next);
  };

  const onUp = () => {
    if (!current) return;
    if (current.points.length >= 2) {
      setStrokes((prev) => [...prev, current]);
    }
    setCurrent(null);
  };

  const undo = () => {
    setStrokes((prev) => {
      const next = prev.slice(0, -1);
      redraw(next, null);
      return next;
    });
  };

  const clear = () => {
    setStrokes([]);
    setCurrent(null);
    redraw([], null);
  };

  const payloadSize = JSON.stringify(strokes).length;
  const overLimit = payloadSize > 200 * 1024;
  const canSubmit = !disabled && strokes.length > 0 && !overLimit;

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white">
        <canvas
          ref={setCanvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          className="block h-auto w-full touch-none"
          aria-label="Drawing area"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={undo}
          disabled={disabled || strokes.length === 0}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs text-white/80 hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Undo2 className="h-3.5 w-3.5" />
          Undo
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={disabled || strokes.length === 0}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs text-white/80 hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </button>
        <span
          className={`ml-auto text-xs ${
            overLimit ? 'text-red-400' : 'text-white/50'
          }`}
        >
          {(payloadSize / 1024).toFixed(1)} KB {overLimit && '(over 200 KB)'}
        </span>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => {
            if (canSubmit) {
              onSubmit({
                kind: 'draw',
                strokes: strokes as unknown as Array<Record<string, unknown>>,
              });
            }
          }}
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Submit
        </button>
      </div>
    </div>
  );
};

// ============================================================
// Backgrounds
// ============================================================

const drawBackground = (
  ctx: CanvasRenderingContext2D,
  background: 'blank' | 'staff' | 'keyboard' | 'grid',
) => {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  switch (background) {
    case 'blank':
      break;
    case 'grid': {
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 1;
      const step = 20;
      for (let x = step; x < CANVAS_W; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_H);
        ctx.stroke();
      }
      for (let y = step; y < CANVAS_H; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_W, y);
        ctx.stroke();
      }
      break;
    }
    case 'staff': {
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1;
      const lineGap = 12;
      const startY = CANVAS_H / 2 - (lineGap * 4) / 2;
      for (let i = 0; i < 5; i++) {
        const y = startY + i * lineGap;
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.lineTo(CANVAS_W - 30, y);
        ctx.stroke();
      }
      break;
    }
    case 'keyboard': {
      const keys = 14;
      const keyW = CANVAS_W / keys;
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1;
      ctx.fillStyle = '#f8f4ea';
      ctx.fillRect(0, CANVAS_H * 0.55, CANVAS_W, CANVAS_H * 0.45);
      for (let i = 0; i <= keys; i++) {
        const x = i * keyW;
        ctx.beginPath();
        ctx.moveTo(x, CANVAS_H * 0.55);
        ctx.lineTo(x, CANVAS_H);
        ctx.stroke();
      }
      // Black keys — skip the ones between E-F and B-C (pattern: 0,1,2,3,4,5,6 → skip 2,6)
      ctx.fillStyle = '#1a1a1a';
      for (let i = 0; i < keys; i++) {
        const posInOctave = i % 7;
        if (posInOctave === 2 || posInOctave === 6) continue;
        const x = i * keyW + keyW * 0.65;
        ctx.fillRect(x, CANVAS_H * 0.55, keyW * 0.7, CANVAS_H * 0.28);
      }
      break;
    }
  }

  ctx.restore();
};
