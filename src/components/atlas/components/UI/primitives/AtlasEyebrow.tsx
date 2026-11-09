import type { ReactNode } from 'react';
import { ATLAS_EYEBROW } from '@/components/atlas/components/UI/primitives/styles';
import { cn } from '@/lib/utils';

/**
 * The micro label over a section (the kit's and the Studio's): "21 events",
 * "Artists · 12", a tour's name. A dot in an entity kind's colour may lead it.
 */
export function AtlasEyebrow({
  as: Tag = 'span',
  dot,
  id,
  className,
  children,
}: {
  as?: 'span' | 'p' | 'h2' | 'h4';
  /** A CSS colour for the leading dot, e.g. `atlasVar('artist')`. */
  dot?: string;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag
      className={cn('flex items-center gap-1.5', ATLAS_EYEBROW, className)}
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
