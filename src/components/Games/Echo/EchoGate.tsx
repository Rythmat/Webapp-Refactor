import { Flame, Music, Sparkles, Trophy } from 'lucide-react';
import { useMemo, type CSSProperties, type ReactNode } from 'react';
import {
  echoGameSummary,
  type EchoGameStats,
  type EchoSection,
} from '@/curriculum/engine/echo';
import { BOSS_VICTORY_STILL } from './bossArt';
import './echoGame.css';

// ── The gate: "You beat the Echo Boss!" ────────────────────────────────────
// The celebration between the echoes and the song: confetti in the key's
// colors (still under reduced motion), the ring shining as the beaten
// boss left it (bossArt.ts), and the game's
// numbers from the engine (stats.ts echoGameSummary):
//
//   XP          earned in this game (10 a good echo, 50 for the boss)
//   sections    Melody Echo, Chord Echo and the Boss: good echoes of tried,
//               and the rate
//   best streak and whether it's a new High Score for the level
//
// Then Make Your Song.

export const SECTION_TITLE: Readonly<Record<EchoSection, string>> = {
  melodyEcho: 'Melody Echo',
  chordEcho: 'Chord Echo',
  boss: 'Echo Boss',
};

/** Confetti pieces: where each falls from, how fast, its color's share. */
const CONFETTI = Array.from({ length: 36 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: ((i * 13) % 20) / 10,
  fall: 2.2 + ((i * 7) % 10) / 8,
  spin: 360 + ((i * 53) % 360),
  size: 6 + (i % 4) * 2,
  round: i % 3 === 0,
}));

export interface EchoGateProps {
  stats: EchoGameStats;
  keyColor: string;
  /** The colors confetti is cut from. */
  palette: readonly string[];
  /** The best streak beats the level's High Score from before the game. */
  newHighScore: boolean;
  onMakeYourSong: () => void;
}

export function EchoGate({
  stats,
  keyColor,
  palette,
  newHighScore,
  onMakeYourSong,
}: EchoGateProps) {
  const summary = useMemo(() => echoGameSummary(stats), [stats]);
  return (
    <section
      aria-label="You beat the Echo Boss"
      data-echo-screen="gate"
      className="relative flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto overflow-x-hidden p-6 max-[639px]:p-4"
    >
      <div
        aria-hidden
        className="echo-confetti pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden"
      >
        {CONFETTI.map((piece, i) => (
          <span
            key={i}
            className="absolute top-0 block"
            style={
              {
                left: `${piece.left}%`,
                width: piece.size,
                height: piece.round ? piece.size : piece.size * 1.6,
                borderRadius: piece.round ? '9999px' : '2px',
                backgroundColor: palette[i % palette.length] ?? keyColor,
                opacity: 0.85,
                transform: `translateY(${(i * 23) % 140}px) rotate(${piece.spin}deg)`,
                '--delay': `${piece.delay}s`,
                '--fall': `${piece.fall}s`,
                '--spin': `${piece.spin}deg`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="relative flex items-center gap-4">
        <img
          src={BOSS_VICTORY_STILL}
          alt=""
          width={104}
          height={104}
          draggable={false}
          className="echo-boss-blend size-[104px] shrink-0"
        />
        <div className="flex flex-col gap-1">
          <h2 className="echo-pop text-[clamp(26px,3.2vw,40px)] leading-tight text-[#e8e8f0]">
            You beat the Echo Boss!
          </h2>
          <p className="text-[15px] leading-6 text-white/60">
            The gate is open. Now let’s make a song of your own.
          </p>
        </div>
      </div>

      <div className="relative grid w-full max-w-3xl grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.6fr)] gap-3 max-[767px]:grid-cols-2">
        <Stat
          label="XP Earned"
          icon={
            <Sparkles
              aria-hidden
              className="size-4"
              style={{ color: keyColor }}
            />
          }
          value={`+${summary.xp}`}
          testId="xp"
        />
        <Stat
          label="Best Streak"
          icon={
            <Flame aria-hidden className="size-4" style={{ color: keyColor }} />
          }
          value={String(summary.bestStreak)}
          testId="best-streak"
          badge={
            newHighScore ? (
              <span
                data-echo-new-high-score
                className="echo-pop inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-[#101012]"
                style={{ backgroundColor: keyColor }}
              >
                <Trophy aria-hidden className="size-3" />
                New High Score!
              </span>
            ) : null
          }
        />
        <div className="flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-[#151518] p-4 max-[767px]:col-span-2">
          {summary.sections.map((section) => (
            <div
              key={section.section}
              data-echo-section-stat={section.section}
              className="flex flex-col gap-1"
            >
              <span className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-[#e8e8f0]">
                  {SECTION_TITLE[section.section]}
                </span>
                <span className="tabular-nums text-white/60">
                  {section.passed} of {section.tried} ·{' '}
                  <span className="text-[#e8e8f0]" data-echo-percent>
                    {section.percent ?? 0}%
                  </span>
                </span>
              </span>
              <span className="h-2 overflow-hidden rounded-full bg-white/10">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${section.percent ?? 0}%`,
                    backgroundColor: keyColor,
                  }}
                />
              </span>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        data-echo-make-your-song
        onClick={onMakeYourSong}
        className="relative mt-1 inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-white px-7 text-base font-semibold text-[#101012] transition-transform hover:scale-105"
      >
        <Music aria-hidden className="size-5" />
        Make Your Song
      </button>
    </section>
  );
}

function Stat({
  label,
  icon,
  value,
  badge,
  testId,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  badge?: ReactNode;
  testId: string;
}) {
  return (
    <div
      data-echo-stat={testId}
      className="flex flex-col justify-center gap-1 rounded-xl border border-white/[0.08] bg-[#151518] p-4"
    >
      <span className="flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-white/50">
        {icon}
        {label}
      </span>
      <span className="text-3xl font-semibold tabular-nums text-[#e8e8f0]">
        {value}
      </span>
      {badge}
    </div>
  );
}
