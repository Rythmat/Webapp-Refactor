import type { MouseEventHandler, ReactNode } from 'react';
import {
  ATLAS_FOCUS,
  ATLAS_TRANSITION,
} from '@/components/atlas/components/UI/primitives/styles';
import { cn } from '@/lib/utils';

// Home's genre pills (HomeGlobeCard): a hairline, a breath of white.
const BASE =
  'inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[0.8125rem] leading-5 text-atlas-text-2';

/**
 * A small pill: a genre, an artist, a "Song" badge. With `onClick` it is a
 * button; otherwise a label. A dot in an entity kind's colour may lead it.
 */
export function AtlasChip({
  dot,
  onClick,
  title,
  className,
  children,
}: {
  /** A CSS colour for the leading dot, e.g. `atlasVar('song')`. */
  dot?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  const content = (
    <>
      {dot && (
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: dot }}
        />
      )}
      {children}
    </>
  );
  if (!onClick) {
    return (
      <span className={cn(BASE, className)} title={title}>
        {content}
      </span>
    );
  }
  return (
    <button
      className={cn(
        BASE,
        'hover:bg-white/[0.08] hover:text-atlas-text',
        ATLAS_TRANSITION,
        ATLAS_FOCUS,
        className,
      )}
      title={title}
      type="button"
      onClick={onClick}
    >
      {content}
    </button>
  );
}
