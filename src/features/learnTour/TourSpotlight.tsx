import { useId } from 'react';
import { usePrefersReducedMotion } from '@/daw/components/Tutorial/usePrefersReducedMotion';
import type { Rect } from './targets';
import { TOUR_ACCENT } from './tourStyle';

// ── The spotlight ──────────────────────────────────────────────────────────
// The Studio Basics look (daw/components/Tutorial/Spotlight.tsx) over Learn:
// the page dimmed, a glowing hole around the step's target, and a pulse on
// its ring. Purely visual: the layer lets every click through, so the player
// uses the real control. Under reduced motion the ring neither glides nor
// pulses.

const PAD = 6;
const RADIUS = 10;
const DIM = 'rgba(6, 8, 12, 0.45)';

export function TourSpotlight({ rect }: { rect: Rect | null }) {
  const reducedMotion = usePrefersReducedMotion();
  const maskId = `learn-tour-mask-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  if (!rect) return null;
  const x = rect.left - PAD;
  const y = rect.top - PAD;
  const width = rect.width + PAD * 2;
  const height = rect.height + PAD * 2;
  return (
    <>
      <svg
        aria-hidden
        data-testid="learn-tour-dim"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <defs>
          <mask id={maskId}>
            <rect width="100%" height="100%" fill="#fff" />
            <rect
              x={x}
              y={y}
              width={width}
              height={height}
              rx={RADIUS}
              fill="#000"
            />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill={DIM} mask={`url(#${maskId})`} />
      </svg>
      <div
        aria-hidden
        data-testid="learn-tour-ring"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width,
          height,
          transform: `translate(${x}px, ${y}px)`,
          borderRadius: RADIUS,
          pointerEvents: 'none',
          boxShadow: `0 0 0 2px ${TOUR_ACCENT}, 0 0 16px 4px ${TOUR_ACCENT}`,
        }}
      >
        {!reducedMotion && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: RADIUS,
              boxShadow: `0 0 0 3px ${TOUR_ACCENT}, 0 0 30px 10px ${TOUR_ACCENT}`,
              opacity: 0,
              willChange: 'opacity',
              animation: 'learnTourPulse 1.6s ease-in-out infinite',
            }}
          />
        )}
      </div>
    </>
  );
}
