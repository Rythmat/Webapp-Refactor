import { motion, useReducedMotion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { WHITE_PILL_LG } from '@/components/kit/pills';
import { LessonDisc } from '@/components/learn/path/LessonDisc';
import type { PathFigure } from '@/components/learn/path/types';
import { useStreak } from '@/hooks/data/useStreak';

// ── A lesson's finish ──────────────────────────────────────────────────────
// The lesson clears to black and leaves only its disc from the course path. The
// disc rises, rings spread from it, a beam of light comes down, its figure draws
// itself, and it turns over into a coin as sparks drift up. Only then does it say
// so, with the XP if the server really gave any, and otherwise what they really
// did. A tap or a key skips to the end. With reduced motion there's just the coin.

const COIN_AT = 2000;
const TEXT_AT = 2500;

/** Seconds through the sequence each piece starts. */
const BEAM_DELAY = 1.2;
const RING_DELAY = 0.8;

const SPARKS = Array.from({ length: 24 }, (_, i) => {
  const angle = (i / 24) * Math.PI * 2;
  return {
    x: Math.cos(angle) * (60 + ((i * 37) % 70)),
    y: -40 - ((i * 53) % 130),
    delay: ((i * 7) % 10) / 22,
  };
});

/** Iridescent, with the yellows left out (no brand yellow, owner 2026-09-29). */
const IRIDESCENT =
  'conic-gradient(from 90deg, #5eead4, #60a5fa, #a78bfa, #f472b6, #5eead4)';

function useCountUp(target: number | null, run: boolean, reduced: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target == null || !run) return undefined;
    if (reduced) {
      setValue(target);
      return undefined;
    }
    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / 700);
      setValue(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduced, run, target]);
  return value;
}

export function FinishSequence({
  accent,
  ratio,
  xp,
  firstTry,
  questions,
  onContinue,
  figure,
  continueLabel,
}: {
  accent: string;
  ratio: readonly [number, number];
  /** A key's star on the disc, as its path draws it. */
  figure?: PathFigure;
  /** What Continue does, when it's more than carrying on. */
  continueLabel?: string;
  /** XP really awarded; null if none; 'waiting' until the server's said. */
  xp: number | null | 'waiting';
  firstTry: number;
  questions: number;
  onContinue: () => void;
}) {
  const reduced = useReducedMotion() ?? false;
  const { data: streak } = useStreak();
  const [skipped, setSkipped] = useState(false);
  const [coin, setCoin] = useState(reduced);
  const [text, setText] = useState(reduced);
  const [page, setPage] = useState<'done' | 'streak'>('done');
  const continueRef = useRef<HTMLButtonElement>(null);
  const instant = reduced || skipped;

  useEffect(() => {
    if (instant) {
      setCoin(true);
      setText(true);
      return undefined;
    }
    const a = setTimeout(() => setCoin(true), COIN_AT);
    const b = setTimeout(() => setText(true), TEXT_AT);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [instant]);

  // Anything skips ahead: a tap on the sequence, or any key.
  useEffect(() => {
    if (text) {
      continueRef.current?.focus();
      return undefined;
    }
    const skip = () => setSkipped(true);
    window.addEventListener('keydown', skip);
    return () => window.removeEventListener('keydown', skip);
  }, [text]);

  const award = typeof xp === 'number' ? xp : null;
  const shown = useCountUp(award, text, reduced);
  const showStreak = streak.activeToday && streak.currentStreak > 0;

  const proceed = () => {
    if (page === 'done' && showStreak) setPage('streak');
    else onContinue();
  };

  if (page === 'streak') {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-5 bg-[#0a0a0c] px-6 text-center"
        data-finish="streak"
      >
        <motion.span
          initial={reduced ? false : { scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 13 }}
          style={{ color: accent }}
        >
          <Flame className="size-20" strokeWidth={1.5} aria-hidden />
        </motion.span>
        <h1 className="text-2xl font-bold text-white">
          {streak.currentStreak === 1
            ? 'Your streak starts today'
            : `${streak.currentStreak} days in a row`}
        </h1>
        <button
          ref={continueRef}
          type="button"
          className={WHITE_PILL_LG}
          autoFocus
          onClick={onContinue}
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div
      className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-[#0a0a0c] px-6"
      data-finish={text ? 'done' : 'playing'}
      onPointerDown={() => {
        if (!text) setSkipped(true);
      }}
    >
      <div className="relative flex flex-col items-center">
        {!instant && (
          <>
            {/* The beam, dropping onto the disc. */}
            <motion.span
              aria-hidden
              className="pointer-events-none absolute -top-40 left-1/2 w-[8.4rem]"
              style={{
                x: '-50%',
                // Ends across the disc's widest line, so its foot is hidden.
                height: 'calc(10rem + 2.88rem)',
                background: `linear-gradient(to bottom, transparent, ${accent}66)`,
                clipPath: 'polygon(30% 0, 70% 0, 100% 100%, 0 100%)',
                transformOrigin: 'top',
              }}
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: [0, 1, 1, 0], scaleY: 1 }}
              transition={{
                opacity: {
                  delay: BEAM_DELAY,
                  duration: 1.9,
                  times: [0, 0.2, 0.65, 1],
                },
                scaleY: { delay: BEAM_DELAY, duration: 0.4, ease: 'easeOut' },
              }}
            />
            {/* Three rings spreading from it, edged in colour. */}
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-[2.88rem] size-44 rounded-full"
                style={{
                  x: '-50%',
                  y: '-50%',
                  scaleY: 0.56,
                  background: IRIDESCENT,
                  WebkitMask:
                    'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
                  mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
                }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: [0, 0.85, 0], scale: [0.5, 1.9] }}
                transition={{
                  delay: RING_DELAY + i * 0.22,
                  duration: 1.2,
                  ease: 'easeOut',
                }}
              />
            ))}
          </>
        )}

        {/* The disc: glows into being, rises, turns over into its coin. */}
        <motion.div
          className="relative"
          style={{
            filter: `drop-shadow(0 0 1.5rem ${accent}aa)`,
          }}
          initial={instant ? false : { opacity: 0, scale: 0.7, y: 60 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{
            opacity: { delay: 0.35, duration: 0.3 },
            scale: { delay: 0.35, type: 'spring', stiffness: 200, damping: 14 },
            y: { delay: 0.8, duration: 0.6, ease: 'easeOut' },
          }}
        >
          <motion.div
            key={coin ? 'coin' : 'face'}
            initial={instant || !coin ? false : { rotateX: -80, scale: 1.12 }}
            animate={{ rotateX: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 12 }}
          >
            <LessonDisc
              ratio={ratio}
              accent={accent}
              state={coin ? 'done' : 'next'}
              drawn={instant}
              size={9}
              figure={figure}
            />
          </motion.div>
        </motion.div>

        {coin &&
          !instant &&
          SPARKS.map((spark, i) => (
            <motion.span
              key={i}
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-[2.88rem] size-1 rounded-full bg-white"
              initial={{ opacity: 0, x: 0, y: 0 }}
              animate={{
                opacity: [0, 1, 0],
                x: spark.x,
                y: spark.y,
              }}
              transition={{
                delay: spark.delay,
                duration: 1.1,
                ease: 'easeOut',
              }}
            />
          ))}

        <div className="mt-8 flex min-h-36 flex-col items-center gap-2 text-center">
          {text && (
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-2"
            >
              <h1 className="text-[1.75rem] font-bold leading-tight text-white">
                Lesson complete!
              </h1>
              {award != null ? (
                <p className="flex items-baseline gap-2" data-finish-xp={award}>
                  <span className="text-[2.25rem] font-bold text-white">
                    {shown}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/60">
                    XP
                  </span>
                </p>
              ) : (
                <p className="text-[0.9375rem] text-white/70" data-finish-stats>
                  {firstTry} of {questions} right first try
                </p>
              )}
            </motion.div>
          )}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-8 flex justify-center">
        {text && (
          <button
            ref={continueRef}
            type="button"
            className={WHITE_PILL_LG}
            onClick={proceed}
          >
            {continueLabel ?? 'Continue'}
          </button>
        )}
      </div>
    </div>
  );
}
