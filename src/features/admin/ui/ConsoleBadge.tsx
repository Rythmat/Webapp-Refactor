import type { ReactNode } from 'react';
import { cn } from '@/components/utilities';
import type {
  ContentReleaseStatus,
  ContentStatus,
} from '@/hooks/data/admin/useAdminContent';

export type ConsoleBadgeTone =
  | 'neutral'
  | 'muted'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger';

const TONES: Record<ConsoleBadgeTone, string> = {
  // The landing's tag: categories (roles, kinds) carry no colour.
  neutral: 'bg-white/10 text-white/80',
  muted: 'bg-white/[0.04] text-white/45',
  // States keep a hue so they scan, washed down to sit in the neutral page.
  info: 'bg-sky-400/10 text-sky-300',
  success: 'bg-emerald-400/10 text-emerald-300',
  warning: 'bg-amber-400/10 text-amber-300',
  danger: 'bg-red-400/10 text-red-300',
};

/** A status or category tag in the landing's tag shape. */
export const ConsoleBadge = ({
  tone = 'neutral',
  children,
  className,
  title,
}: {
  tone?: ConsoleBadgeTone;
  children: ReactNode;
  className?: string;
  title?: string;
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium',
      TONES[tone],
      className,
    )}
    title={title}
  >
    {children}
  </span>
);

export const CONTENT_STATUS_TONE: Record<ContentStatus, ConsoleBadgeTone> = {
  published: 'success',
  draft: 'warning',
  archived: 'muted',
};

export const RELEASE_STATUS_TONE: Record<
  ContentReleaseStatus,
  ConsoleBadgeTone
> = {
  live: 'success',
  building: 'info',
  superseded: 'muted',
  rolled_back: 'warning',
  failed: 'danger',
};
