import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/utilities';

/**
 * A console page's title block, in the landing's type: regular weight with
 * tight tracking (Glacial Indifference only ships 400 and 700, so the
 * landing never bolds its headlines), white/55 supporting copy.
 */
export const ConsolePageHeader = ({
  title,
  description,
  actions,
  backTo,
  backLabel = 'Back',
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned controls (primary action last). */
  actions?: ReactNode;
  /** Renders a back arrow before the title. */
  backTo?: string;
  /** Accessible name for the back arrow, e.g. "Back to list". */
  backLabel?: string;
  className?: string;
}) => (
  <header
    className={cn(
      'flex flex-wrap items-start justify-between gap-x-6 gap-y-4',
      className,
    )}
  >
    <div className="flex min-w-0 max-w-3xl items-start gap-3">
      {backTo && (
        <Button asChild className="mt-0.5 shrink-0" size="icon" variant="ghost">
          <Link aria-label={backLabel} to={backTo}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
      )}
      <div className="min-w-0">
        <h1 className="text-[2rem] leading-[1.1] tracking-[-0.02em] text-white">
          {title}
        </h1>
        {description && (
          <div className="mt-2 space-y-1 text-[15px] leading-relaxed text-white/55">
            {description}
          </div>
        )}
      </div>
    </div>
    {actions && (
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    )}
  </header>
);

/** A section title inside a page (telemetry sub-pages, grouped settings). */
export const ConsoleSectionTitle = ({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  /** For a section's `aria-labelledby`. */
  id?: string;
}) => (
  <h2
    id={id}
    className={cn(
      'text-xl leading-[1.2] tracking-[-0.01em] text-white md:text-2xl',
      className,
    )}
  >
    {children}
  </h2>
);
