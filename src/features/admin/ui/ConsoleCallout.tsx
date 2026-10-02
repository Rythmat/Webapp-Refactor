import {
  AlertTriangle,
  CheckCircle2,
  Info,
  type LucideIcon,
  XCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/components/utilities';

export type ConsoleTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const TONES: Record<
  ConsoleTone,
  { box: string; title: string; icon: LucideIcon | null }
> = {
  neutral: {
    box: 'border-white/10 bg-white/[0.03]',
    title: 'text-white',
    icon: null,
  },
  info: {
    box: 'border-sky-300/20 bg-sky-300/[0.05]',
    title: 'text-sky-200',
    icon: Info,
  },
  success: {
    box: 'border-emerald-300/20 bg-emerald-300/[0.05]',
    title: 'text-emerald-200',
    icon: CheckCircle2,
  },
  warning: {
    box: 'border-amber-300/20 bg-amber-300/[0.05]',
    title: 'text-amber-200',
    icon: AlertTriangle,
  },
  danger: {
    box: 'border-red-400/25 bg-red-400/[0.06]',
    title: 'text-red-300',
    icon: XCircle,
  },
};

/**
 * A notice box. The tone colours only the hairline, a faint wash and the
 * title — body copy stays white/70 so a page of warnings still reads as the
 * neutral landing palette.
 */
export const ConsoleCallout = ({
  tone = 'neutral',
  title,
  icon,
  children,
  className,
}: {
  tone?: ConsoleTone;
  title?: ReactNode;
  /** Overrides the tone's default icon; `null` hides it. */
  icon?: LucideIcon | null;
  children?: ReactNode;
  className?: string;
}) => {
  const style = TONES[tone];
  const Icon = icon === undefined ? style.icon : icon;
  return (
    <div
      className={cn(
        'rounded-xl border p-4 text-sm text-white/70',
        style.box,
        className,
      )}
    >
      {title ? (
        <div className={cn('flex items-center gap-2 font-medium', style.title)}>
          {Icon && <Icon className="size-4 shrink-0" />}
          {title}
        </div>
      ) : null}
      {children && (
        <div
          className={cn(
            title ? 'mt-1.5' : null,
            !title && Icon && 'flex gap-2',
          )}
        >
          {!title && Icon && (
            <Icon className={cn('mt-0.5 size-4 shrink-0', style.title)} />
          )}
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      )}
    </div>
  );
};
