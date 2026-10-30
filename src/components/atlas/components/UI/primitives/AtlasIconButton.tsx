import { forwardRef, type ButtonHTMLAttributes } from 'react';
import {
  ATLAS_FOCUS,
  ATLAS_TRANSITION,
} from '@/components/atlas/components/UI/primitives/styles';
import { cn } from '@/lib/utils';

const VARIANT = {
  /** Bare until hovered: the controls in a panel's header or a bar. */
  ghost:
    'border-transparent text-atlas-text-2 hover:bg-white/[0.06] hover:text-atlas-text',
  /** Ringed: an icon button standing on its own. */
  outline:
    'border-white/10 bg-atlas-pill text-atlas-text hover:bg-white/[0.06]',
  /** Inside a rail's pill zone: lit while pressed; dimmed when disabled. */
  pill: 'border-transparent text-atlas-pill-text hover:bg-white/[0.08] hover:text-atlas-text aria-pressed:bg-atlas-pill-on aria-pressed:text-atlas-text disabled:border-transparent',
} as const;

const SIZE = {
  xs: 'size-6',
  sm: 'size-7',
  md: 'size-8',
  lg: 'size-9',
} as const;

/**
 * A round button holding only an icon. Its accessible name is required, since
 * the icon says nothing to a screen reader; it is also the tooltip unless a
 * `title` is given. Disabled, it dims and shows a dashed ring.
 */
export const AtlasIconButton = forwardRef<
  HTMLButtonElement,
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
    'aria-label': string;
    variant?: keyof typeof VARIANT;
    size?: keyof typeof SIZE;
  }
>(function AtlasIconButton(
  {
    variant = 'ghost',
    size = 'md',
    className,
    type = 'button',
    title,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border disabled:cursor-not-allowed disabled:border-dashed disabled:border-white/25 disabled:bg-transparent disabled:opacity-40',
        ATLAS_TRANSITION,
        ATLAS_FOCUS,
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      title={title ?? props['aria-label']}
      type={type}
      {...props}
    />
  );
});
