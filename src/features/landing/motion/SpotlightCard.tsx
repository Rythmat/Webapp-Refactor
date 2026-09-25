import { useRef, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/components/utilities';

/**
 * Glass card whose fill and 1px border glow follow the pointer (Linear-style).
 * Pointer position is written straight to CSS variables (`--mx`/`--my`) so
 * hovering never re-renders React. Styles live in `landing.css`
 * (`.spotlight-card`); `accent` tints the glow.
 */
export const SpotlightCard = ({
  accent = '#e8e8f0',
  interactive = false,
  className,
  style,
  children,
}: {
  accent?: string;
  /** Adds the hover lift + accent shadow (for cards that are links). */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const onPointerMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      data-interactive={interactive ? 'true' : undefined}
      className={cn('spotlight-card', className)}
      style={{ '--card-accent': accent, ...style } as CSSProperties}
    >
      {children}
    </div>
  );
};
