import type { ReactNode } from 'react';
import { cn } from '@/components/utilities';

export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'live';

// Colour for meaning only: done is green, waiting amber, removed or overdue
// red, live the record red; everything else stays grey.
const TONE: Record<StatusTone, string> = {
  neutral: 'border-white/10 bg-white/[0.04] text-daw-text-2',
  success: 'border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-200',
  warning: 'border-amber-300/25 bg-amber-300/[0.08] text-amber-100',
  danger: 'border-rose-400/25 bg-rose-400/[0.08] text-rose-200',
  live: 'border-rose-400/30 bg-rose-400/[0.1] text-rose-100',
};

/** A small state pill: Pending, Done, Overdue, Live. */
export const StatusPill = ({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: StatusTone;
  children: ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      'inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-[0.75rem] font-medium',
      TONE[tone],
      className,
    )}
  >
    {tone === 'live' && (
      <span aria-hidden className="size-1.5 rounded-full bg-rose-400" />
    )}
    {children}
  </span>
);

/** A person's initial in a quiet circle, for rosters. */
export const Initial = ({
  name,
  className,
}: {
  name: string;
  className?: string;
}) => (
  <span
    aria-hidden
    className={cn(
      'inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[0.8125rem] font-bold text-daw-text-2',
      className,
    )}
  >
    {name.trim().charAt(0).toUpperCase() || '·'}
  </span>
);
