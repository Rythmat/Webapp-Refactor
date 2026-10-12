import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { ATLAS_FOCUS } from '@/components/atlas/components/UI/primitives/styles';
import { cn } from '@/lib/utils';

const VARIANT = {
  /** The one main action in view: a white pill. */
  primary: 'bg-white font-bold text-atlas-page hover:bg-white/90',
  /** Everything else. */
  outline:
    'border border-white/15 bg-white/[0.04] font-medium text-atlas-text hover:border-white/25 hover:bg-white/[0.08] disabled:border-dashed',
} as const;

const SIZE = {
  sm: 'h-7 px-2.5 text-xs',
  md: 'h-9 px-3.5 text-sm',
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
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40',
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
