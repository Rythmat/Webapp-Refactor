import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/components/utilities';

/**
 * Error callout for the auth pages, legible on the dark surface (the shared
 * `destructive` Alert is dark red on dark). The border colour is inline
 * because `.dashboard-root` resets every border colour inside it.
 */
export const AuthAlert = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    role="alert"
    className={cn(
      'flex items-start gap-3 rounded-xl border bg-danger-base/[0.08] px-4 py-3 text-left text-sm leading-snug text-danger-lighter',
      className,
    )}
    style={{ borderColor: 'rgba(242, 98, 85, 0.3)' }}
  >
    <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger-light" />
    <div className="min-w-0 break-words">{children}</div>
  </div>
);
