import type { FC } from 'react';
import { useExperienceSummary } from '@/hooks/data/experience';

/** Default daily XP target — small enough to be attainable from one lesson. */
export const DAILY_XP_GOAL = 30;

/**
 * A progress ring showing today's earned XP vs the daily goal. Pure display,
 * fed by the existing experience summary (`today.totalExperience`) — no backend.
 */
export const DailyGoalRing: FC<{ size?: number }> = ({ size = 88 }) => {
  const { data: xp } = useExperienceSummary();
  const today = xp?.today?.totalExperience ?? 0;
  const pct = Math.min(1, today / DAILY_XP_GOAL);
  const met = today >= DAILY_XP_GOAL;

  const stroke = 7;
  const r = size / 2 - stroke;
  const circumference = 2 * Math.PI * r;

  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
      aria-label={`${today} of ${DAILY_XP_GOAL} XP today`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={met ? '#34d399' : '#7ecfcf'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-none">
        <span className="text-base font-bold tabular-nums text-white">
          {today}
        </span>
        <span className="mt-0.5 text-[10px] text-white/40">
          / {DAILY_XP_GOAL} XP
        </span>
      </div>
    </div>
  );
};
