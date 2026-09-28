import { ArrowRight, House } from 'lucide-react';
import { memo, type CSSProperties } from 'react';
import { cn } from '@/components/utilities';
import { theoryString } from '@/curriculum/data/guitar/theoryNotes';
import type { FunctionGroup } from '@/lib/guitar/theory';

// ── ChordJobsBadge ─────────────────────────────────────────────────────────
// What a chord does in the key: Home, Away or Tension. Always an icon plus
// the word (house, arrow, spring), so the job never rests on colour alone.

/** A small coil: tension, like a pressed spring. */
function SpringIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M1 8h2l1.5-5 2 10 2-10 2 10 2-10L14 8h1" />
    </svg>
  );
}

const ICON = {
  home: House,
  away: ArrowRight,
  tension: SpringIcon,
} as const;

const WORD = {
  home: 'fn.home',
  away: 'fn.away',
  tension: 'fn.tension',
} as const;

export interface ChordJobsBadgeProps {
  group: FunctionGroup;
  className?: string;
  style?: CSSProperties;
}

export const ChordJobsBadge = memo(function ChordJobsBadge({
  group,
  className,
  style,
}: ChordJobsBadgeProps) {
  const Icon = ICON[group];
  return (
    <span
      data-chord-job={group}
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-px text-[10px] font-medium leading-none',
        className,
      )}
      style={{
        border: '1px solid var(--color-border, rgba(255,255,255,0.16))',
        background: 'rgba(20,20,26,0.85)',
        color: 'var(--color-text, #e8e8f0)',
        ...style,
      }}
    >
      <Icon aria-hidden className="h-3 w-3 shrink-0" />
      {theoryString(WORD[group])}
    </span>
  );
});
