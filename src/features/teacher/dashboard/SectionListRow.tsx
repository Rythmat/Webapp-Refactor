/**
 * SectionListRow — a single row inside an Overview "list panel" section, styled
 * to match the Home Dashboard's ChallengesCard rows: a title, a right-aligned
 * tabular-nums meta value, and a circular arrow chip that brightens on hover.
 * Sizing uses the same `clamp()` scale as the Home rows so it reads as one family.
 */
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/components/utilities';

interface SectionListRowProps {
  to: string;
  title: string;
  meta: string;
  /** Optional tint on the meta value (e.g. 'text-emerald-400'). */
  metaClassName?: string;
}

export const SectionListRow = ({
  to,
  title,
  meta,
  metaClassName,
}: SectionListRowProps) => (
  <Link
    to={to}
    className="group flex items-center justify-between text-left transition-colors hover:bg-white/[0.03]"
    style={{
      padding: 'clamp(0.6rem, 0.9vw, 0.85rem) clamp(0.25rem, 0.5vw, 0.5rem)',
    }}
  >
    <span
      className="flex-1 truncate text-white"
      style={{ fontSize: 'clamp(0.75rem, 1vw, 0.95rem)' }}
    >
      {title}
    </span>
    <span
      className={cn(
        'mx-2 min-w-14 flex-shrink-0 text-right tabular-nums text-white/55 sm:mx-3 sm:min-w-20',
        metaClassName,
      )}
      style={{ fontSize: 'clamp(0.7rem, 0.95vw, 0.9rem)' }}
    >
      {meta}
    </span>
    <span
      className="flex flex-shrink-0 items-center justify-center rounded-full border border-white/15 transition-colors group-hover:border-white/40"
      style={{
        width: 'clamp(1.75rem, 2.2vw, 2.25rem)',
        height: 'clamp(1.75rem, 2.2vw, 2.25rem)',
      }}
    >
      <ArrowRight
        className="text-white/85"
        style={{
          width: 'clamp(0.85rem, 1.05vw, 1rem)',
          height: 'clamp(0.85rem, 1.05vw, 1rem)',
        }}
      />
    </span>
  </Link>
);
