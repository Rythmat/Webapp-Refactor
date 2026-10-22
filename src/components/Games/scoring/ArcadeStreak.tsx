// ── The arcade streak, as every game shows it ──────────────────────────────
// A game's page counts the streak (useArcadeStreakReward) and hands it down
// through ArcadeStreakContext; the shared game header draws it in a strip
// right under the bar, where every game shows it in the same place, with the
// goal spelled out (five in a row earns XP) and the XP this visit has earned.
// A won streak drops a banner from the strip: the XP it earned, confetti,
// and the reward sound, unless the game plays a win of its own (Chroma's
// arpeggio). Play carries on under it.

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { playSound } from '@/lib/uiSounds';
import type { StreakWin } from './useArcadeStreakReward';

export interface ArcadeStreakState {
  count: number;
  target: number;
  win: StreakWin | null;
  /** XP this visit's streaks have earned. */
  sessionXp: number;
  /** The game sounds its own win; the banner stays quiet. */
  ownWinSound?: boolean;
  /** What's counted, when it isn't plain answers: 'phrases'. */
  unit?: string;
}

export const ArcadeStreakContext = createContext<ArcadeStreakState | null>(
  null,
);

/** The streak a game's page is counting, if it counts one. */
export function useArcadeStreak(): ArcadeStreakState | null {
  return useContext(ArcadeStreakContext);
}

/** How long a win is celebrated. */
export const WIN_MS = 3600;

/**
 * The win being celebrated, for WIN_MS from the moment it's won; null
 * otherwise. Keyed on the win's id alone, so the XP arriving doesn't restart
 * it, and a win from before the game opened isn't celebrated again.
 * `onWin` runs once per new win.
 */
export function useStreakCelebration(
  win: StreakWin | null,
  onWin?: () => (() => void) | void,
): StreakWin | null {
  const winId = win?.id ?? 0;
  const openedWinRef = useRef(winId);
  const onWinRef = useRef(onWin);
  onWinRef.current = onWin;
  const [celebratingId, setCelebratingId] = useState<number | null>(null);
  useEffect(() => {
    if (!winId || winId <= openedWinRef.current) return;
    setCelebratingId(winId);
    const stop = onWinRef.current?.();
    const done = window.setTimeout(() => setCelebratingId(null), WIN_MS);
    return () => {
      window.clearTimeout(done);
      stop?.();
    };
  }, [winId]);
  return win && win.id === celebratingId ? win : null;
}

const LIT_GEM =
  'linear-gradient(160deg, #e9d5ff 0%, #38bdf8 50%, #7c3aed 100%)';
const CONFETTI_COLORS = ['#e9d5ff', '#a78bfa', '#38bdf8', '#7c3aed', '#f0abfc'];

function Gem({ lit }: { lit: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 17,
        height: 19,
        clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
        background: lit ? LIT_GEM : 'rgba(255,255,255,0.14)',
        transform: lit ? 'scale(1.12)' : 'none',
        transition: 'background 0.25s ease, transform 0.25s ease',
      }}
    />
  );
}

/** What a won streak earned, as the banner says it. */
export function winXpLine(win: StreakWin): string {
  switch (win.status) {
    case 'pending':
      return 'Earning XP…';
    case 'granted':
      return `+${win.xp} XP`;
    case 'capped':
      return 'Today’s Arcade XP is all earned. Keep playing for practice!';
    case 'failed':
      return 'Your XP couldn’t be saved this time.';
  }
}

/** A won streak: the banner and confetti, falling from the strip. */
function WinBanner({ win }: { win: StreakWin }) {
  return (
    <div
      aria-live="polite"
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        height: '70vh',
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes arcade-confetti {
          0% { opacity: 0; transform: translateY(-4vh) rotate(0deg); }
          10% { opacity: 1; }
          100% { opacity: 0; transform: translateY(66vh) rotate(var(--arcade-spin)); }
        }
        @keyframes arcade-win {
          0% { opacity: 0; transform: translate(-50%, -8px) scale(0.92); }
          12% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          85% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -6px) scale(0.98); }
        }
        .arcade-confetti { animation: arcade-confetti var(--arcade-fall) ease-in var(--arcade-delay) forwards; }
        .arcade-win { animation: arcade-win ${WIN_MS}ms ease both; }
        @media (prefers-reduced-motion: reduce) {
          .arcade-confetti { display: none; }
          .arcade-win { animation: none; transform: translate(-50%, 0); }
        }
      `}</style>
      {Array.from({ length: 26 }, (_, i) => (
        <span
          key={i}
          className="arcade-confetti"
          style={
            {
              position: 'absolute',
              top: 0,
              left: `${(i * 37 + 7) % 100}%`,
              width: 6,
              height: 10,
              borderRadius: 2,
              opacity: 0,
              backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              '--arcade-delay': `${(i % 7) * 0.1}s`,
              '--arcade-fall': `${1.9 + (i % 5) * 0.25}s`,
              '--arcade-spin': `${(i * 53) % 360}deg`,
            } as CSSProperties
          }
        />
      ))}
      <div
        className="arcade-win"
        style={{
          position: 'absolute',
          top: 14,
          left: '50%',
          transform: 'translate(-50%, 0)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          padding: '14px 28px',
          borderRadius: 16,
          border: '1.5px solid #a78bfa',
          background:
            'linear-gradient(180deg, rgba(76,29,149,0.94), rgba(16,16,32,0.94))',
          boxShadow:
            '0 0 32px rgba(167,139,250,0.45), 0 8px 32px rgba(0,0,0,0.45)',
          textAlign: 'center',
          maxWidth: 'calc(100% - 32px)',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 2.5,
            textTransform: 'uppercase',
            color: '#c4b5fd',
          }}
        >
          Streak complete!
        </span>
        <span
          style={{
            fontSize: win.status === 'granted' ? 30 : 13,
            fontWeight: 800,
            color: win.status === 'granted' ? '#f5f3ff' : '#ddd6fe',
            textShadow:
              win.status === 'granted'
                ? '0 0 18px rgba(167,139,250,0.9)'
                : 'none',
          }}
        >
          {winXpLine(win)}
        </span>
      </div>
    </div>
  );
}

/**
 * The streak strip under a game's header: a gem for every answer in a row,
 * the goal, and the XP this visit has earned; and the banner when a streak
 * is won. Nothing when the page counts no streak.
 */
export function StreakStrip() {
  const streak = useArcadeStreak();
  const ownWinSound = streak?.ownWinSound ?? false;
  const celebrating = useStreakCelebration(streak?.win ?? null, () => {
    if (!ownWinSound) playSound('reward');
  });
  if (!streak) return null;
  const { count, target, sessionXp, unit } = streak;
  const shown = celebrating ? target : count;
  return (
    <div
      className="relative z-30 flex w-full shrink-0 flex-wrap items-center justify-center gap-x-5 gap-y-1 border-b border-zinc-800 bg-[#131316] px-4 py-2.5"
      data-streak-strip
    >
      <div
        role="status"
        aria-label={`Streak ${shown} of ${target}`}
        className="flex items-center gap-2.5"
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-200/85">
          Streak
        </span>
        <div className="flex gap-2">
          {Array.from({ length: target }).map((_, i) => (
            <Gem key={i} lit={i < shown} />
          ))}
        </div>
        <span className="min-w-[38px] text-sm font-bold tabular-nums text-violet-100">
          {shown} / {target}
        </span>
      </div>
      <span className="text-xs text-zinc-400">
        {target}
        {unit ? ` ${unit}` : ''} in a row earns XP
        {sessionXp > 0 ? ` · +${sessionXp} XP this visit` : ''}
      </span>
      {celebrating && <WinBanner win={celebrating} />}
    </div>
  );
}
