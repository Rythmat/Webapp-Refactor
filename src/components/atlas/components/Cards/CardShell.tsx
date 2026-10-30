import { useId, type CSSProperties, type ReactNode } from 'react';
import {
  ATLAS_CARD,
  ATLAS_EYEBROW,
} from '@/components/atlas/components/UI/primitives';
import { cn } from '@/lib/utils';

/**
 * One floating card: Home's prompt-box frame, a micro-label title, landing
 * in its turn (`order`) as the column fills.
 */
export function CardShell({
  title,
  order,
  children,
  className,
}: {
  title: string;
  order: number;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cn(
        ATLAS_CARD,
        'atlas-card-in shrink-0 px-4 pb-4 pt-3',
        className,
      )}
      style={{ '--i': order } as CSSProperties}
    >
      <h3 className={ATLAS_EYEBROW} id={id}>
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

/** A number and what it counts, as the cards' tiles. */
export function StatTile({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-lg font-bold leading-6 text-atlas-text">{children}</p>
      <p className="truncate text-xs text-atlas-text-2">{label}</p>
    </div>
  );
}
