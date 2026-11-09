// ── You Made a Song! ───────────────────────────────────────────────────────
// The celebration once the song is finished: its chords (the hybrid names
// and their symbols, in their colors), the band, the groove and the key.
// Then Play Again, Next Level! (when there's one) and Take Your Song To The
// Studio! Confetti falls only for those who don't ask for reduced motion.

import {
  ArrowRight,
  Loader2,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { useMemo, type CSSProperties } from 'react';
import { inkOn } from '@/curriculum/musicLiteracy/KeyRing';

export interface VictoryChord {
  label: string;
  symbol: string;
  color: string;
}

export interface VictoryProps {
  chords: readonly VictoryChord[];
  bandName: string;
  styleName: string;
  keyName: string;
  bpm: number;
  keyColor: string;
  onPlayAgain: () => void;
  onNextLevel: (() => void) | null;
  onStudio: () => void;
  studioBusy: boolean;
  studioError: string | null;
}

/** Bits of confetti: where each falls from and how. */
const CONFETTI = 28;

export function Victory({
  chords,
  bandName,
  styleName,
  keyName,
  bpm,
  keyColor,
  onPlayAgain,
  onNextLevel,
  onStudio,
  studioBusy,
  studioError,
}: VictoryProps) {
  const confetti = useMemo(
    () =>
      Array.from({ length: CONFETTI }, (_, i) => ({
        left: `${(i * 37) % 100}%`,
        delay: `${(i % 7) * 0.12}s`,
        duration: `${1.8 + (i % 5) * 0.25}s`,
        color: chords.length ? chords[i % chords.length].color : keyColor,
        rotate: `${(i * 47) % 360}deg`,
      })),
    [chords, keyColor],
  );

  return (
    <div
      data-echo-victory
      className="relative flex min-h-full w-full flex-col items-center justify-center overflow-hidden px-6 py-8 max-[639px]:px-4"
    >
      <style>{`
        @keyframes echo-confetti {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(100vh) rotate(540deg); opacity: 0; }
        }
        @keyframes echo-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        .echo-confetti { animation: echo-confetti var(--echo-fall) ease-in var(--echo-delay) forwards; }
        .echo-rise { animation: echo-rise 420ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
        @media (prefers-reduced-motion: reduce) {
          .echo-confetti { display: none; }
          .echo-rise { animation: none; }
        }
      `}</style>
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {confetti.map((c, i) => (
          <span
            key={i}
            className="echo-confetti absolute top-0 block h-2.5 w-1.5 rounded-[2px] opacity-0"
            style={
              {
                left: c.left,
                backgroundColor: c.color,
                rotate: c.rotate,
                '--echo-fall': c.duration,
                '--echo-delay': c.delay,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="echo-rise relative flex w-full max-w-[720px] flex-col items-center gap-6 text-center">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.14em] text-white/55">
            Echo · Make Your Song
          </p>
          <h1 className="text-[36px] font-normal leading-[44px] text-[#e8e8f0] max-[639px]:text-[28px] max-[639px]:leading-9">
            You Made a Song!
          </h1>
          <p className="text-[17px] leading-6 text-white/70">
            {bandName} played your song with you. Nice work!
          </p>
        </div>

        <ol
          aria-label={`Your chords: ${chords.map((c) => c.label).join(' · ')}`}
          data-echo-victory-chords={chords.map((c) => c.label).join(' · ')}
          className="flex w-full flex-wrap justify-center gap-2"
        >
          {chords.map((chord, i) => (
            <li
              key={i}
              className="flex min-w-[88px] flex-col items-center rounded-xl px-3 py-2"
              style={{
                backgroundColor: chord.color,
                color: inkOn(chord.color),
              }}
            >
              <span className="text-[17px] font-semibold leading-6">
                {chord.label}
              </span>
              <span className="text-xs leading-4 opacity-75">
                {chord.symbol}
              </span>
            </li>
          ))}
        </ol>

        <dl className="grid grid-cols-3 gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-left max-[639px]:grid-cols-1">
          <div>
            <dt className="text-xs text-white/55">Band</dt>
            <dd className="text-[15px] text-[#e8e8f0]">{bandName}</dd>
          </div>
          <div>
            <dt className="text-xs text-white/55">Groove</dt>
            <dd className="text-[15px] text-[#e8e8f0]">
              {styleName} · {bpm} BPM
            </dd>
          </div>
          <div>
            <dt className="text-xs text-white/55">Key</dt>
            <dd className="text-[15px] text-[#e8e8f0]">{keyName}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            data-echo-play-again
            onClick={onPlayAgain}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-white/10 px-5 text-[15px] text-[#e8e8f0] hover:bg-white/[0.14]"
          >
            <RotateCcw aria-hidden className="size-4" />
            Play Again
          </button>
          {onNextLevel && (
            <button
              type="button"
              data-echo-next-level
              onClick={onNextLevel}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-white/10 px-5 text-[15px] text-[#e8e8f0] hover:bg-white/[0.14]"
            >
              Next Level!
              <ArrowRight aria-hidden className="size-4" />
            </button>
          )}
          <button
            type="button"
            data-echo-to-studio
            onClick={onStudio}
            disabled={studioBusy}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-[#101012] hover:bg-[#e6e6e8] disabled:opacity-60"
          >
            {studioBusy ? (
              <Loader2 aria-hidden className="size-4 animate-spin" />
            ) : (
              <SlidersHorizontal aria-hidden className="size-4" />
            )}
            Take Your Song To The Studio!
          </button>
        </div>
        {studioError && (
          <p role="alert" className="text-[15px] text-white/70">
            {studioError}
          </p>
        )}
      </div>
    </div>
  );
}
