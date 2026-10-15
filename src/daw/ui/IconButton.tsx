import { cva } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/components/utilities';
import { FOCUS_RING, TRANSITION } from './styles';
import { Tooltip } from './Tooltip';

const iconButtonVariants = cva(
  [
    'inline-flex shrink-0 select-none items-center justify-center rounded-[var(--daw-radius-sm)]',
    'disabled:pointer-events-none disabled:opacity-40',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
    TRANSITION,
    FOCUS_RING,
  ],
  {
    variants: {
      variant: {
        ghost:
          'bg-transparent text-daw-text-2 hover:bg-daw-hover hover:text-daw-text',
        secondary:
          'border border-daw-outline bg-transparent text-daw-text hover:bg-daw-hover',
        primary:
          'rounded-full bg-daw-primary text-daw-on-primary hover:bg-daw-primary-hover active:bg-daw-primary-active',
        danger: 'bg-daw-danger text-daw-on-danger hover:bg-daw-danger-hover',
      },
      size: {
        sm: 'size-6 [&_svg]:size-3.5',
        md: 'size-7 [&_svg]:size-4',
        lg: 'size-8 [&_svg]:size-4',
        play: 'size-9 [&_svg]:size-5',
      },
    },
    defaultVariants: { variant: 'ghost', size: 'md' },
  },
);

export type IconButtonVariant = 'ghost' | 'secondary' | 'primary' | 'danger';
export type IconButtonSize = 'sm' | 'md' | 'lg' | 'play';

export interface IconButtonProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'aria-label' | 'aria-labelledby' | 'children'
  > {
  /**
   * What the button does, in words ('Undo', 'Delete track'). Required: an
   * icon alone names nothing, so this is the button's accessible name and
   * its tooltip.
   */
  label: string;
  icon: ReactNode;
  /** A shortcut for the tooltip ('⌘Z'). */
  shortcut?: string;
  variant?: IconButtonVariant;
  /** 24, 28 (the default) or 32 px square; 'play' is the 36 px transport. */
  size?: IconButtonSize;
  /** Leave the tooltip off, for a button with visible text beside it. */
  noTooltip?: boolean;
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * A square button that shows only an icon. Its type demands a label, which
 * becomes the accessible name and the tooltip, so no icon button ships
 * unnamed (audit design-system-02).
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      label,
      icon,
      shortcut,
      variant,
      size,
      noTooltip = false,
      tooltipSide,
      className,
      type = 'button',
      ...props
    },
    ref,
  ) {
    if (import.meta.env.DEV && !label.trim()) {
      console.error('IconButton: `label` is empty; the button has no name.');
    }
    return (
      <Tooltip
        content={label}
        shortcut={shortcut}
        side={tooltipSide}
        disabled={noTooltip}
      >
        <button
          ref={ref}
          type={type}
          data-variant={variant ?? 'ghost'}
          className={cn(iconButtonVariants({ variant, size }), className)}
          {...props}
          // After the spread: TypeScript lets any hyphenated attribute
          // through, so a stray aria-label must not displace the label.
          aria-label={label}
          aria-labelledby={undefined}
        >
          {icon}
        </button>
      </Tooltip>
    );
  },
);
