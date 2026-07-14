/**
 * Shared tile shell for the Teacher Dashboard. Every tile renders inside
 * this so they read as one visual family — same card treatment as the rest
 * of the classroom feature (`border-white/[0.06] bg-white/[0.02]`), same
 * padding, same header + footer rhythm.
 */
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface DashboardTileProps {
  title: string;
  icon?: ReactNode;
  /** Optional right-side subtitle in the header (e.g. a count). */
  headerRight?: ReactNode;
  /** Optional footer link (arrow → the deeper page). */
  footerLink?: { to: string; label: string };
  /** Emphasize the tile with a colored accent border (e.g. emerald when a
   *  live session is running, amber when approvals are pending). */
  accent?: 'default' | 'emerald' | 'amber' | 'rose';
  /** Optional CSS Grid column-span at the md+ breakpoint. Defaults to 4. */
  colSpanMd?: 4 | 6 | 8 | 12;
  children: ReactNode;
}

const ACCENT_CLASSES: Record<
  NonNullable<DashboardTileProps['accent']>,
  string
> = {
  default: 'border-white/[0.06] bg-white/[0.02]',
  emerald: 'border-emerald-400/40 bg-emerald-500/[0.06]',
  amber: 'border-amber-400/40 bg-amber-500/[0.06]',
  rose: 'border-rose-400/40 bg-rose-500/[0.06]',
};

const COL_SPAN_CLASSES: Record<
  NonNullable<DashboardTileProps['colSpanMd']>,
  string
> = {
  4: 'md:col-span-4',
  6: 'md:col-span-6',
  8: 'md:col-span-8',
  12: 'md:col-span-12',
};

export const DashboardTile = ({
  title,
  icon,
  headerRight,
  footerLink,
  accent = 'default',
  colSpanMd = 4,
  children,
}: DashboardTileProps) => (
  <section
    className={`col-span-1 flex flex-col gap-3 rounded-2xl border p-5 ${ACCENT_CLASSES[accent]} ${COL_SPAN_CLASSES[colSpanMd]}`}
  >
    <header className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-white/70">
        {icon}
        <h3 className="text-xs uppercase tracking-wider">{title}</h3>
      </div>
      {headerRight && (
        <div className="text-xs text-white/50">{headerRight}</div>
      )}
    </header>

    <div className="flex flex-1 flex-col gap-2">{children}</div>

    {footerLink && (
      <Link
        to={footerLink.to}
        className="mt-auto inline-flex items-center gap-1 text-xs text-white/60 transition-colors hover:text-white"
      >
        {footerLink.label}
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    )}
  </section>
);
