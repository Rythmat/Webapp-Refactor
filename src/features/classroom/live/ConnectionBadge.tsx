/**
 * ConnectionBadge — the visible answer to "can students actually join this?".
 *
 * Mounted on every surface that represents a live session: the teacher
 * dashboard, the projector, the student page and the Present control. The
 * practice variant is deliberately loud (amber, the word "Practice") because
 * the failure it prevents is a teacher discovering mid-lesson that the session
 * they have been driving for ten minutes never existed on the server.
 */
import { Radio, TriangleAlert, WifiOff } from 'lucide-react';
import {
  TRANSPORT_COPY,
  type SessionTransportStatus,
} from './connectionStatus';

const TONE_CLASS: Record<string, string> = {
  live: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  pending: 'border-white/10 bg-white/[0.03] text-white/60',
  warn: 'border-orange-400/30 bg-orange-400/10 text-orange-200',
  practice: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
};

interface ConnectionBadgeProps {
  status: SessionTransportStatus;
  /** Compact variant for dense chip rows and the projector corner. */
  size?: 'sm' | 'md';
  className?: string;
}

export const ConnectionBadge = ({
  status,
  size = 'md',
  className,
}: ConnectionBadgeProps) => {
  const { label, detail, tone } = TRANSPORT_COPY[status];
  const Icon =
    status === 'practice'
      ? TriangleAlert
      : status === 'offline'
        ? WifiOff
        : Radio;
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';
  const icon = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <span
      role="status"
      aria-label={detail}
      title={detail}
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${pad} ${TONE_CLASS[tone]} ${className ?? ''}`}
    >
      <Icon className={`${icon} shrink-0`} aria-hidden />
      {label}
    </span>
  );
};
