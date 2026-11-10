import { Users } from 'lucide-react';

/**
 * How many have answered, without words (owner, 2026-11-10): the number and
 * a people mark. For a band that also shows what to answer with (a feelings
 * check-in's faces), where the participation ring has no room. A count only,
 * never who.
 */
export const AnsweredCount = ({ n }: { n: number }) => (
  <span
    aria-live="polite"
    aria-label={`${n} checked in`}
    className="inline-flex items-center gap-[0.4em] text-white/60"
    style={{ fontSize: 'var(--slide-body-fz)' }}
  >
    <Users aria-hidden className="size-[1em]" />
    <span className="font-bold tabular-nums text-white">{n}</span>
  </span>
);
