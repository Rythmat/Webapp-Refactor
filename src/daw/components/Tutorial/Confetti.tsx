import { useEffect, useRef } from 'react';
import { addFrameTask } from '@/daw/engine/engineClock';

// ── Confetti ────────────────────────────────────────────────────────────────
// Self-contained celebratory burst (no external dependency). Fires once on
// mount, drawn as a task on the editor's frame loop, and calls `onDone` when
// it has finished so its owner can unmount the full-screen canvas. Remount
// with a new `key` to replay. Drawn at 1 device pixel per CSS pixel: small
// squares in flight need no more, and the backing store stays a quarter of
// a 2× one. The owner skips it under prefers-reduced-motion.

interface ConfettiProps {
  /** Burst origin in viewport px. Defaults to horizontal center, upper third. */
  origin?: { x: number; y: number };
  /** Called once the burst has finished. */
  onDone?: () => void;
}

const COLORS = [
  '#22d3ee',
  '#a78bfa',
  '#f472b6',
  '#facc15',
  '#34d399',
  '#fb923c',
];

export function Confetti({ origin, onDone }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    const ox = origin?.x ?? W / 2;
    const oy = origin?.y ?? H * 0.32;

    const particles = Array.from({ length: 90 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 7;
      return {
        x: ox,
        y: oy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        size: 4 + Math.random() * 5,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };
    });

    const DURATION = 1100;
    let start = -1;
    let remove: (() => void) | null = null;

    const tick = (now: number) => {
      if (start < 0) start = now;
      const t = now - start;
      ctx.clearRect(0, 0, W, H);
      const life = 1 - t / DURATION;
      for (const p of particles) {
        p.vy += 0.22; // gravity
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.99;
        p.rot += p.vr;
        ctx.save();
        ctx.globalAlpha = Math.max(0, life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      if (t >= DURATION) {
        ctx.clearRect(0, 0, W, H);
        remove?.();
        remove = null;
        onDoneRef.current?.();
      }
    };
    remove = addFrameTask(tick, { name: 'tutorial-confetti' });
    return () => remove?.();
  }, [origin]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}
