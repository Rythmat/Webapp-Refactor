import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/components/utilities';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';

/**
 * One of the reference's stacked cards (the Sleep screen): a title with a
 * chevron that opens it, a grey line, and whatever it holds (chips, a row).
 * Cards stack with a small gap on the canvas, no borders.
 */
export function SectionCard({
  title,
  sub,
  onOpen,
  children,
  className,
}: {
  title: string;
  sub?: ReactNode;
  /** The chevron opens it; left out, the card is still. */
  onOpen?: () => void;
  children?: ReactNode;
  className?: string;
}) {
  const heading = (
    <span className="text-[1.0625rem] leading-tight text-daw-text">
      {title}
    </span>
  );
  return (
    <section
      aria-label={title}
      data-section-card
      className={cn(
        'flex flex-col gap-3 rounded-[var(--daw-radius-2xl)] bg-daw-surface-1 p-5',
        className,
      )}
    >
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className={cn(
            '-m-1 flex items-center justify-between gap-3 rounded-[var(--daw-radius-md)] p-1 text-left text-daw-text-2 hover:text-daw-text',
            TRANSITION,
            FOCUS_RING,
          )}
        >
          {heading}
          <ChevronRight aria-hidden className="size-4 shrink-0" />
        </button>
      ) : (
        heading
      )}
      {sub && <p className="text-[0.8125rem] text-daw-text-3">{sub}</p>}
      {children}
    </section>
  );
}
