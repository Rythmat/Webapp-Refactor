import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/components/utilities';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from './styles';

/**
 * The action button. Every variant is a pill:
 * - primary: the white pill with near-black text, one per region;
 * - secondary: a white/15 outline;
 * - ghost: no fill until hovered;
 * - danger: red, for actions that destroy work;
 * - quiet: dim text only, for low-stakes extras.
 * Sizes are 24, 28 (the default) and 32 px high. A press shrinks it a touch
 * in CSS, not in framer-motion, and not at all under reduced motion.
 */
export const buttonVariants = cva(
  [
    'inline-flex shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-bold',
    'active:scale-[0.97] motion-reduce:active:scale-100',
    'disabled:pointer-events-none disabled:opacity-40',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    TRANSITION,
    FOCUS_RING,
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-daw-primary text-daw-on-primary hover:bg-daw-primary-hover active:bg-daw-primary-active',
        secondary:
          'border border-daw-outline bg-transparent text-daw-text hover:bg-daw-hover',
        ghost: 'bg-transparent text-daw-text hover:bg-daw-hover',
        danger: 'bg-daw-danger text-daw-on-danger hover:bg-daw-danger-hover',
        quiet: 'bg-transparent text-daw-text-3 hover:text-daw-text',
      },
      size: {
        sm: 'h-6 px-2.5',
        md: 'h-7 px-3',
        lg: 'h-8 px-4',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export type ButtonVariant = NonNullable<
  VariantProps<typeof buttonVariants>['variant']
>;

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render the child (a link, say) with the button's look instead. */
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant, size, asChild = false, type, ...props },
    ref,
  ) {
    const Component = asChild ? Slot : 'button';
    return (
      <Component
        ref={ref}
        // A button never submits a form by accident.
        type={asChild ? type : (type ?? 'button')}
        data-variant={variant ?? 'secondary'}
        className={cn(
          buttonVariants({ variant, size }),
          size === 'lg' ? TYPE_CLASS.body : TYPE_CLASS.label,
          className,
        )}
        {...props}
      />
    );
  },
);
