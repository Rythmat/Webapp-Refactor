import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { usePrefersReducedMotion } from '@/daw/components/Tutorial/usePrefersReducedMotion';
import { TourRichText } from './TourRichText';
import {
  TOUR_ACCENT,
  TOUR_FONT,
  TOUR_HAIRLINE,
  TOUR_SURFACE,
  TOUR_TEXT,
  TOUR_TEXT_DIM,
} from './tourStyle';

// ── The end of a tour ──────────────────────────────────────────────────────
// Congratulations, then "Have Fun Learning!", and a poof: the card swells,
// blurs and is gone in a puff (Peter, 2026-10-21). A click poofs it at once.
// Under reduced motion there's no confetti, swell or puff; it just goes.

const SHOW_MS = 3800;
const POOF_MS = 520;

const CONFETTI = [
  '#7ecfcf',
  '#a78bfa',
  '#f472b6',
  '#facc15',
  '#34d399',
  '#fb923c',
];

function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const W = (canvas.width = window.innerWidth);
    const H = (canvas.height = window.innerHeight);
    const pieces = Array.from({ length: 110 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      return {
        x: W / 2,
        y: H * 0.38,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 5,
        size: 4 + Math.random() * 5,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: CONFETTI[Math.floor(Math.random() * CONFETTI.length)],
      };
    });
    const DURATION = 1600;
    let start = -1;
    let raf = 0;
    const tick = (now: number) => {
      if (start < 0) start = now;
      const t = now - start;
      ctx.clearRect(0, 0, W, H);
      for (const p of pieces) {
        p.vy += 0.22;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.99;
        p.rot += p.vr;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - t / DURATION);
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
  }, []);
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
      }}
    />
  );
}

/** The puff the card leaves behind. */
function Puff() {
  return (
    <div aria-hidden style={{ position: 'fixed', left: '50%', top: '50%' }}>
      {Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * Math.PI * 2;
        return (
          <span
            key={i}
            style={
              {
                position: 'absolute',
                width: 46,
                height: 46,
                borderRadius: '50%',
                background: 'rgba(232, 232, 240, 0.35)',
                filter: 'blur(4px)',
                '--dx': `${Math.cos(angle) * 150}px`,
                '--dy': `${Math.sin(angle) * 110}px`,
                animation: `learnTourPuff ${POOF_MS + 180}ms ease-out forwards`,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

export function TourFinale({
  heading,
  line,
  onDone,
}: {
  heading: string;
  line: string;
  onDone: () => void;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [poof, setPoof] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const id = window.setTimeout(() => setPoof(true), SHOW_MS);
    return () => window.clearTimeout(id);
  }, []);
  useEffect(() => {
    if (!poof) return;
    const id = window.setTimeout(
      () => onDoneRef.current(),
      reducedMotion ? 0 : POOF_MS + 200,
    );
    return () => window.clearTimeout(id);
  }, [poof, reducedMotion]);

  return (
    <>
      {!reducedMotion && <Confetti />}
      {poof && !reducedMotion && <Puff />}
      <div
        role="status"
        data-testid="learn-tour-finale"
        onClick={() => setPoof(true)}
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          width: 420,
          maxWidth: 'calc(100vw - 32px)',
          transform: `translate(-50%, -50%) scale(${poof ? 1.18 : 1})`,
          opacity: poof ? 0 : 1,
          filter: poof ? 'blur(10px)' : 'none',
          transition: reducedMotion
            ? 'none'
            : `transform ${POOF_MS}ms ease-in, opacity ${POOF_MS}ms ease-in, filter ${POOF_MS}ms ease-in`,
          pointerEvents: 'auto',
          cursor: 'pointer',
          background: TOUR_SURFACE,
          border: `1px solid ${TOUR_HAIRLINE}`,
          borderRadius: 18,
          boxShadow: '0 18px 60px rgba(0,0,0,0.6)',
          padding: '26px 24px 24px',
          textAlign: 'center',
          color: TOUR_TEXT,
          fontFamily: TOUR_FONT,
        }}
      >
        <p style={{ margin: 0, fontSize: 15, color: TOUR_TEXT_DIM }}>
          {heading}
        </p>
        <h2
          style={{
            margin: '10px 0 12px',
            fontSize: 34,
            lineHeight: 1.15,
            fontWeight: 700,
            color: '#fff',
            textWrap: 'balance',
          }}
        >
          Have Fun Learning!
        </h2>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
          <TourRichText text={line} />
        </p>
        <div
          aria-hidden
          style={{
            margin: '16px auto 0',
            width: 48,
            height: 3,
            borderRadius: 2,
            background: TOUR_ACCENT,
          }}
        />
      </div>
    </>
  );
}
