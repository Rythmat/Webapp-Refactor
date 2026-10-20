import { Heart, Swords } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/components/utilities';
import { BOSS_CALLS, BOSS_GOOD_TO_WIN } from '@/curriculum/engine/echo';
import { inkOn } from '@/curriculum/musicLiteracy/KeyRing';
import './echoGame.css';

// ── The Echo Boss ──────────────────────────────────────────────────────────
// The Final Boss is a friend to beat, not a monster: a round, bouncy echo of
// a creature in the key's color, with big eyes, a grin, a little gold crown
// and sound waves rippling off it. It bobs while it waits, wobbles when a
// good echo lands, spins happily away when beaten, and hops when it wins a
// fight. Its health is a bar of three hearts: one goes with each good echo.
// Still under reduced motion (echoGame.css).

export type BossMood = 'idle' | 'enter' | 'hit' | 'beaten' | 'cheer';

const MOOD_CLASS: Record<BossMood, string> = {
  idle: 'echo-boss-idle',
  enter: 'echo-boss-enter',
  hit: 'echo-boss-hit',
  beaten: 'echo-boss-beaten',
  cheer: 'echo-boss-cheer',
};

export function EchoBossCharacter({
  color,
  mood,
  size,
  className,
}: {
  color: string;
  mood: BossMood;
  size: number;
  className?: string;
}) {
  const id = useId().replace(/:/g, '');
  const happyEyes = mood === 'hit' || mood === 'beaten' || mood === 'cheer';
  return (
    <div
      data-echo-boss={mood}
      className={cn('shrink-0', className)}
      style={{ width: size, height: size }}
    >
      <svg
        // A new mood restarts its motion.
        key={mood}
        viewBox="0 0 200 200"
        width={size}
        height={size}
        role="img"
        aria-label="The Echo Boss"
        className={cn('overflow-visible', MOOD_CLASS[mood])}
      >
        <defs>
          <radialGradient id={`${id}-body`} cx="40%" cy="35%" r="70%">
            <stop
              offset="0%"
              stopColor={`color-mix(in oklab, ${color} 45%, white)`}
            />
            <stop offset="70%" stopColor={color} />
            <stop
              offset="100%"
              stopColor={`color-mix(in oklab, ${color} 70%, #101012)`}
            />
          </radialGradient>
        </defs>
        {/* Sound waves, both sides: it's an echo. */}
        <g
          className="echo-boss-waves"
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
        >
          <path d="M 30 82 Q 18 110 30 138" />
          <path d="M 18 70 Q 2 110 18 150" />
          <path d="M 6 60 Q -14 110 6 160" />
        </g>
        <g
          className="echo-boss-waves"
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
        >
          <path d="M 170 82 Q 182 110 170 138" />
          <path d="M 182 70 Q 198 110 182 150" />
          <path d="M 194 60 Q 214 110 194 160" />
        </g>
        {/* Little feet. */}
        <ellipse cx="78" cy="172" rx="16" ry="9" fill={color} />
        <ellipse cx="122" cy="172" rx="16" ry="9" fill={color} />
        {/* The body. */}
        <circle cx="100" cy="112" r="62" fill={`url(#${id}-body)`} />
        {/* The crown. */}
        <path
          d="M 70 58 L 76 30 L 90 46 L 100 22 L 110 46 L 124 30 L 130 58 Z"
          fill="#fdc94a"
          stroke="#e59a1e"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <circle cx="100" cy="44" r="5" fill="#ef5b8c" />
        {/* Cheeks. */}
        <circle cx="66" cy="126" r="9" fill="#ff8fb1" opacity="0.45" />
        <circle cx="134" cy="126" r="9" fill="#ff8fb1" opacity="0.45" />
        {/* Eyebrows, raised: a cheeky friend. */}
        <path
          d="M 64 80 Q 78 70 92 78"
          stroke="#101012"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 108 78 Q 122 70 136 80"
          stroke="#101012"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        {happyEyes ? (
          <>
            <path
              d="M 66 104 Q 78 92 90 104"
              stroke="#101012"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 110 104 Q 122 92 134 104"
              stroke="#101012"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
          </>
        ) : (
          <>
            <ellipse cx="78" cy="102" rx="14" ry="17" fill="#ffffff" />
            <ellipse cx="122" cy="102" rx="14" ry="17" fill="#ffffff" />
            <circle cx="81" cy="105" r="7.5" fill="#101012" />
            <circle cx="125" cy="105" r="7.5" fill="#101012" />
            <circle cx="84" cy="101" r="2.6" fill="#ffffff" />
            <circle cx="128" cy="101" r="2.6" fill="#ffffff" />
          </>
        )}
        {/* The grin. */}
        {mood === 'hit' ? (
          <ellipse cx="100" cy="140" rx="9" ry="11" fill="#101012" />
        ) : (
          <path
            d="M 76 132 Q 100 158 124 132 Z"
            fill="#101012"
            stroke="#101012"
            strokeWidth="4"
            strokeLinejoin="round"
          />
        )}
        {mood !== 'hit' && (
          <path d="M 92 140 Q 100 150 108 140 Z" fill="#ff8fb1" />
        )}
      </svg>
    </div>
  );
}

/** The boss's hearts: one goes with each good echo. */
export function BossHealthBar({
  health,
  color,
}: {
  health: number;
  color: string;
}) {
  const max = BOSS_GOOD_TO_WIN;
  return (
    <div
      role="meter"
      aria-label="Echo Boss health"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={health}
      data-echo-boss-health={health}
      className="flex min-w-0 flex-col gap-1"
    >
      <span className="flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-white/55">
        Echo Boss
        {Array.from({ length: max }, (_, i) => (
          <Heart
            key={i}
            aria-hidden
            className={cn(
              'size-3.5 transition-opacity',
              i < health ? 'opacity-100' : 'opacity-25',
            )}
            style={{ color, fill: i < health ? color : 'transparent' }}
          />
        ))}
      </span>
      <span className="relative h-3 w-[min(280px,40vw)] overflow-hidden rounded-full bg-white/10">
        <span
          className="echo-health-fill absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${(health / max) * 100}%`,
            background: `linear-gradient(90deg, color-mix(in oklab, ${color} 60%, white), ${color})`,
          }}
        />
      </span>
    </div>
  );
}

/** "The Echo Boss appears!" */
export function EchoBossIntro({
  color,
  onFight,
}: {
  color: string;
  onFight: () => void;
}) {
  return (
    <section
      aria-label="The Echo Boss appears"
      data-echo-screen="bossIntro"
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-6 text-center"
    >
      <EchoBossCharacter color={color} mood="enter" size={190} />
      <h2 className="echo-pop text-[clamp(28px,3.4vw,44px)] leading-tight text-[#e8e8f0]">
        The Echo Boss appears!
      </h2>
      <p className="max-w-md text-[15px] leading-6 text-white/60">
        It plays {BOSS_CALLS} calls in a row, with trickier rhythms. Echo{' '}
        {BOSS_GOOD_TO_WIN} of them to win!
      </p>
      <button
        type="button"
        onClick={onFight}
        className="mt-1 inline-flex h-12 items-center gap-2 rounded-full px-7 text-base font-semibold transition-transform hover:scale-105"
        style={{ backgroundColor: color, color: inkOn(color) }}
      >
        <Swords aria-hidden className="size-5" />
        Fight!
      </button>
    </section>
  );
}
