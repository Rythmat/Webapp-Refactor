import { forwardRef, type ButtonHTMLAttributes } from 'react';
import {
  ATLAS_FOCUS,
  ATLAS_TRANSITION,
} from '@/components/atlas/components/UI/primitives/styles';
import { cn } from '@/lib/utils';

const VARIANT = {
  /** The one main action in view: a white pill (the Studio's primary). */
  primary:
    'bg-white font-bold text-atlas-page hover:bg-white/90 active:bg-white/80',
  /** An action standing on its own: a hairline pill on the pill surface. */
  outline:
    'border border-white/10 bg-atlas-pill font-medium text-atlas-text hover:bg-white/[0.06] disabled:border-dashed disabled:border-white/20',
  /** A control inside a rail's pill zone: lit while pressed. */
  pill: 'bg-atlas-pill font-medium text-atlas-pill-text hover:text-atlas-text aria-pressed:bg-atlas-pill-on aria-pressed:text-atlas-text',
} as const;

const SIZE = {
  sm: 'h-8 gap-1.5 px-3 text-[0.8125rem]',
  md: 'h-9 gap-1.5 px-4 text-[0.8125rem]',
} as const;

/**
 * A pill button. Disabled, it dims and an outline pill's border turns
 * dashed, so the state does not rest on colour alone.
 */
export const AtlasPillButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: keyof typeof VARIANT;
    size?: keyof typeof SIZE;
  }
>(function AtlasPillButton(
  { variant = 'outline', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:active:scale-100',
        ATLAS_TRANSITION,
        ATLAS_FOCUS,
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      type={type}
      {...props}
    />
  );
});
