import { AnimatePresence, motion } from 'framer-motion';
import { useRef } from 'react';
import type { DemoFrame, Point } from './demoPlayer';

// ── The demo's stage ───────────────────────────────────────────────────────
// What a "watch me" demo draws over the Studio: the landing tour's cursor
// and its glass callout (features/landing/tour/TourCursor.tsx), ported to
// the editor's tokens and to fixed positions on the whole window, and the
// blocker that keeps the student's clicks off the Studio while the demo
// plays. The cursor springs to each point and ripples on a click; under
// reduced motion it jumps and doesn't ripple, and the callouts still show.
// Both are decorative (aria-hidden): the coach card reads each caption out.

/** Callouts flip to the cursor's left past this share of the window's width. */
const FLIP_X = 0.6;
/** And above it past this share of its height. */
const FLIP_Y = 0.62;
/** The cursor svg's tip, from its top left corner. */
const TIP = { x: 4, y: 2.5 };

const SPRING = {
  type: 'spring',
  stiffness: 90,
  damping: 18,
  mass: 0.9,
} as const;

/**
 * Covers the Studio while a demo plays, so a click lands nowhere. It sits
 * under the coach card, whose Skip and Quit still work. The demo's own
 * clicks are sent to their elements directly, so it doesn't stop them.
 */
export function DemoBlocker() {
  return (
    <div
      aria-hidden
      data-testid="tutorial-demo-blocker"
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'auto',
        cursor: 'default',
        background: 'transparent',
      }}
    />
  );
}

/** Text with **bold** segments, as captions are written. */
function Bold({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <strong key={i} style={{ fontWeight: 700 }}>
            {p}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function DemoStage({
  frame,
  reducedMotion,
}: {
  frame: DemoFrame | null;
  reducedMotion: boolean;
}) {
  // Where the cursor starts: the middle of the window, so the first move
  // glides in from somewhere a student is looking.
  const start = useRef<Point | null>(null);
  if (start.current === null && typeof window !== 'undefined') {
    start.current = {
      x: Math.round(window.innerWidth / 2),
      y: Math.round(window.innerHeight / 2),
    };
  }
  // The last place it was, so it fades out where it stopped.
  const last = useRef<Point | null>(null);
  const point = frame?.point ?? null;
  if (point) last.current = point;
  const at = point ?? last.current;
  const caption = frame?.caption && point ? frame.caption : null;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900;

  return (
    <div
      aria-hidden
      data-testid="tutorial-demo-stage"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        // Above the coach card, within the lesson layer.
        zIndex: 'var(--daw-z-tutorial)',
      }}
    >
      {at && (
        <motion.div
          data-testid="tutorial-demo-cursor"
          data-x={at.x}
          data-y={at.y}
          data-shown={point ? 'true' : 'false'}
          initial={
            reducedMotion || !start.current
              ? false
              : { x: start.current.x, y: start.current.y, opacity: 0 }
          }
          animate={{ x: at.x, y: at.y, opacity: point ? 1 : 0 }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { ...SPRING, opacity: { duration: 0.2 } }
          }
          style={{ position: 'fixed', left: 0, top: 0 }}
        >
          <AnimatePresence>
            {frame?.clickKey && !reducedMotion && (
              <motion.span
                key={frame.clickKey}
                data-testid="tutorial-demo-ripple"
                initial={{ scale: 0.2, opacity: 0 }}
                animate={{ scale: [0.2, 1.6], opacity: [0.9, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                style={{
                  position: 'absolute',
                  left: -16,
                  top: -16,
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--daw-radius-pill)',
                  border: '2px solid var(--daw-text)',
                }}
              />
            )}
          </AnimatePresence>
          <motion.svg
            key={frame?.clickKey ?? 'idle'}
            width="22"
            height="22"
            viewBox="0 0 24 24"
            animate={
              frame?.clickKey && !reducedMotion
                ? { scale: [1, 0.82, 1] }
                : { scale: 1 }
            }
            transition={{ duration: 0.35 }}
            style={{
              position: 'absolute',
              left: -TIP.x,
              top: -TIP.y,
              filter: 'drop-shadow(var(--daw-shadow-pop))',
              overflow: 'visible',
            }}
          >
            <path
              d="M4 2.5 L19 12 L12.2 13.4 L9 20.5 Z"
              fill="var(--daw-text)"
              stroke="var(--daw-bg)"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </motion.svg>
        </motion.div>
      )}
      {caption && at && (
        <DemoCallout
          key={`${frame?.beat}:${caption}`}
          text={caption}
          at={at}
          flipX={at.x > vw * FLIP_X}
          flipY={at.y > vh * FLIP_Y}
          reducedMotion={reducedMotion}
        />
      )}
    </div>
  );
}

/** The glass bubble beside the cursor; flips left or up near the window's edges. */
function DemoCallout({
  text,
  at,
  flipX,
  flipY,
  reducedMotion,
}: {
  text: string;
  at: Point;
  flipX: boolean;
  flipY: boolean;
  reducedMotion: boolean;
}) {
  return (
    <motion.div
      data-testid="tutorial-demo-callout"
      initial={reducedMotion ? false : { opacity: 0, y: flipY ? 6 : -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }
      }
      style={{
        position: 'fixed',
        left: at.x + (flipX ? -22 : 22),
        top: at.y + (flipY ? -18 : 22),
        translate: `${flipX ? '-100%' : '0'} ${flipY ? '-100%' : '0'}`,
        width: 'max-content',
        maxWidth: 280,
        padding: '10px 14px',
        borderRadius: 'var(--daw-radius-lg)',
        border: '1px solid var(--daw-hairline)',
        background: 'var(--daw-popover)',
        boxShadow: 'var(--daw-shadow-pop)',
        color: 'var(--daw-text)',
        fontSize: 'var(--daw-font-title)',
        lineHeight: 'var(--daw-leading-title)',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: 6,
          height: 6,
          marginRight: 8,
          borderRadius: 'var(--daw-radius-pill)',
          background: 'var(--daw-text)',
          verticalAlign: 'middle',
        }}
      />
      <Bold text={text} />
    </motion.div>
  );
}
