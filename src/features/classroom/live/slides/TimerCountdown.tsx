/**
 * TimerCountdown — a live mm:ss countdown to a `SessionTimer.endsAt` epoch-ms
 * deadline. Pure display; the teacher client owns the advancing action at zero.
 * Shared across the student chip, projector corner, and teacher panel.
 */
import { Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

const fmt = (ms: number): string => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export interface TimerCountdownProps {
  endsAt: number;
  size?: 'chip' | 'projector';
}

export const TimerCountdown = ({ endsAt, size = 'chip' }: TimerCountdownProps) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const remaining = endsAt - now;
  const urgent = remaining <= 10_000;
  const label = fmt(remaining);

  if (size === 'projector') {
    return (
      <div
        className={
          'inline-flex items-center gap-3 rounded-2xl border px-6 py-3 text-4xl font-semibold tabular-nums ' +
          (urgent
            ? 'border-amber-400/50 bg-amber-400/[0.1] text-amber-200'
            : 'border-white/10 bg-white/[0.04] text-white/80')
        }
      >
        <Clock className="h-8 w-8" />
        {label}
      </div>
    );
  }

  return (
    <span
      className={
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs tabular-nums ' +
        (urgent
          ? 'border-amber-400/40 bg-amber-400/[0.08] text-amber-200'
          : 'border-white/10 bg-white/[0.03] text-white/70')
      }
    >
      <Clock className="h-3.5 w-3.5" />
      {label}
    </span>
  );
};
