import type { ReactNode } from 'react';
import { cn } from '@/components/utilities';
import { MicroLabel } from './MicroLabel';
import { RainbowWriteIn } from './RainbowWriteIn';

export interface DisplayHeadingProps {
  /** A string is written in with the rainbow (the prompt bar's write-in). */
  title: ReactNode;
  /**
   * The grey line under it. Its height is kept even while it is empty (say,
   * waiting for the user's name), so nothing jumps when it arrives.
   */
  sub?: ReactNode;
  eyebrow?: ReactNode;
  /** 'page': the page's title; 'section': a shelf's or card's. */
  size?: 'page' | 'section';
  as?: 'h1' | 'h2' | 'h3';
  /** Beside the title, at its end: a count, a link. */
  aside?: ReactNode;
  className?: string;
}

/**
 * A big, airy title over a small grey line (the reference's "Share",
 * Googlebook's tagline). Regular weight, sized up; a page's title is written
 * in with the rainbow and settles to white, again whenever it changes.
 */
export function DisplayHeading({
  title,
  sub,
  eyebrow,
  size = 'page',
  as,
  aside,
  className,
}: DisplayHeadingProps) {
  const Tag = as ?? (size === 'page' ? 'h1' : 'h2');
  const page = size === 'page';
  return (
    <header
      className={cn('flex flex-col', page ? 'gap-3' : 'gap-1.5', className)}
    >
      {eyebrow && <MicroLabel>{eyebrow}</MicroLabel>}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Tag
          className={cn(
            'font-normal text-daw-text',
            page
              ? 'text-[clamp(2.25rem,4.4vw,3.5rem)] leading-[1.02] tracking-[-0.02em]'
              : 'text-[1.375rem] leading-tight tracking-[-0.01em] md:text-[1.625rem]',
          )}
        >
          {page && typeof title === 'string' ? (
            <RainbowWriteIn text={title} />
          ) : (
            title
          )}
        </Tag>
        {aside}
      </div>
      {sub !== undefined && (
        <p
          className={cn(
            'text-daw-text-3',
            page ? 'min-h-[1.5em] text-[0.9375rem]' : 'text-[0.8125rem]',
          )}
        >
          {sub}
        </p>
      )}
    </header>
  );
}
