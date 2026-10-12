import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The small bold uppercase label over a section: "21 events", "Artists · 12",
 * a tour's name. A dot in an entity kind's colour may lead it.
 */
export function AtlasEyebrow({
  as: Tag = 'span',
  dot,
  id,
  className,
  children,
}: {
  as?: 'span' | 'p' | 'h4';
  /** A CSS colour for the leading dot, e.g. `atlasVar('artist')`. */
  dot?: string;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag
      className={cn(
        'flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-atlas-text-3',
        className,
      )}
      id={id}
    >
      {dot && (
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: dot }}
        />
      )}
      {children}
    </Tag>
  );
}
