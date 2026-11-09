import { useId, type CSSProperties, type ReactNode } from 'react';
import {
  ATLAS_CARD,
  ATLAS_EYEBROW,
} from '@/components/atlas/components/UI/primitives';
import {
  introDelayStyle,
  useIntroDelay,
} from '@/components/atlas/layout/intro';
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
  const delay = useIntroDelay();
  return (
    <section
      aria-labelledby={id}
      className={cn(
        ATLAS_CARD,
        'atlas-card-in shrink-0 px-4 pb-4 pt-3',
        className,
      )}
      style={{ ...introDelayStyle(delay), '--i': order } as CSSProperties}
    >
      <h3 className={ATLAS_EYEBROW} id={id}>
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}
