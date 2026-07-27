import { useEffect, useRef } from 'react';

// ── Confetti ────────────────────────────────────────────────────────────────
// Self-contained celebratory burst (no external dependency). Fires once on
// mount and cleans itself up. Remount with a new `key` to replay.

interface ConfettiProps {
  /** Burst origin in viewport px. Defaults to horizontal center, upper third. */
  origin?: { x: number; y: number };
}

const COLORS = [
  '#22d3ee',
  '#a78bfa',
  '#f472b6',
  '#facc15',
  '#34d399',
  '#fb923c',
];

export function Confetti({ origin }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

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

    const start = performance.now();
    const DURATION = 1100;
    let raf = 0;

    const tick = (now: number) => {
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
      if (t < DURATION) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
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
