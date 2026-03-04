import { useRef, useEffect } from 'react';

// ── Animated Mesh Gradient Background ──────────────────────────────────
// Renders a subtle, slowly-moving gradient on a full-screen canvas.
// Uses requestAnimationFrame for smooth 60fps animation.
// The gradient is intentionally muted so glass panels blur over it.

export function MeshGradientBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let w = 0;
    let h = 0;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const parent = canvas!.parentElement;
      w = parent ? parent.clientWidth : window.innerWidth;
      h = parent ? parent.clientHeight : window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.scale(dpr, dpr);
    }

    resize();
    window.addEventListener('resize', resize);

    // Gradient orb definitions
    const orbs = [
      { cx: 0.2, cy: 0.3, r: 0.35, color: [139, 92, 246], speed: 0.0003, phase: 0 },    // purple
      { cx: 0.8, cy: 0.6, r: 0.3, color: [6, 182, 212], speed: 0.0004, phase: 2 },       // teal
      { cx: 0.5, cy: 0.8, r: 0.25, color: [236, 72, 153], speed: 0.00025, phase: 4 },     // pink
      { cx: 0.7, cy: 0.2, r: 0.2, color: [59, 130, 246], speed: 0.00035, phase: 1 },      // blue
    ];

    function draw(time: number) {
      ctx!.clearRect(0, 0, w, h);

      for (const orb of orbs) {
        // Slowly drift the orb position
        const ox = orb.cx + Math.sin(time * orb.speed + orb.phase) * 0.08;
        const oy = orb.cy + Math.cos(time * orb.speed * 0.7 + orb.phase) * 0.06;

        const cx = ox * w;
        const cy = oy * h;
        const r = orb.r * Math.min(w, h);

        const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, r);
        const [rr, gg, bb] = orb.color;
        grad.addColorStop(0, `rgba(${rr}, ${gg}, ${bb}, 0.08)`);
        grad.addColorStop(0.5, `rgba(${rr}, ${gg}, ${bb}, 0.04)`);
        grad.addColorStop(1, `rgba(${rr}, ${gg}, ${bb}, 0)`);

        ctx!.fillStyle = grad;
        ctx!.fillRect(0, 0, w, h);
      }

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: -1 }}
    />
  );
}
