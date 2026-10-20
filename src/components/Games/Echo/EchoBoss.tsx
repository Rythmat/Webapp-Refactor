import { Heart } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/components/utilities';
import { BOSS_GOOD_TO_WIN } from '@/curriculum/engine/echo';
import { BOSS_AVATAR } from './bossArt';
import './echoGame.css';

// ── The Echo Boss's HUD ────────────────────────────────────────────────────
// The boss itself is the owner's art, on the circle (EchoBossArt.tsx). Up
// in the HUD: a small picture of its face beside its health, a bar of
// three hearts (one goes with each good echo), and the cards that say what
// is happening over the input while the art plays: the entrance, the win,
// the loss.

/** The boss's face, small: the HUD's, beside its health. */
export function BossAvatar({
  size,
  className,
}: {
  size: number;
  className?: string;
}) {
  return (
    <img
      src={BOSS_AVATAR}
      alt="The Echo Boss"
      width={size}
      height={size}
      draggable={false}
      data-echo-boss-avatar
      className={cn('shrink-0 rounded-full', className)}
      style={{ width: size, height: size }}
    />
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

/**
 * What the boss's art is doing, said over the input while it plays: a
 * title, a line, and a button that moves on (Fight!, Continue).
 */
export function BossCard({
  title,
  line,
  action,
  data,
}: {
  title: string;
  line?: string;
  action: ReactNode;
  /** Its data attributes, for the browser test and the unit tests. */
  data?: Record<`data-${string}`, string>;
}) {
  return (
    <div
      {...data}
      className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[#101012]/80 p-4 backdrop-blur-[2px]"
    >
      <div
        role="status"
        className="echo-pop flex max-w-md flex-col items-center gap-3 text-center"
      >
        <h2 className="text-[clamp(26px,3vw,40px)] leading-tight text-[#e8e8f0]">
          {title}
        </h2>
        {line && <p className="text-[15px] leading-6 text-white/60">{line}</p>}
        {action}
      </div>
    </div>
  );
}
