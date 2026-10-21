import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/components/utilities';
import { Button, type ButtonProps } from './Button';
import { IconButton, type IconButtonProps } from './IconButton';

// ── Pills: the floating frame's controls (S0) ───────────────────────────────
//
// The top and bottom bars hold their controls in 36 px pills on the page:
// a Pill is one labelled control, an IconPill one round icon control, and a
// PillGroup holds several (Undo and Redo, the transport) in one pill.

export type PillProps = Omit<ButtonProps, 'variant' | 'size'> & {
  /** 'primary' is the white pill (Export, Learn): one per bar. */
  variant?: 'pill' | 'primary';
};

/** A 36 px labelled pill on the page: white/50 until hovered. */
export const Pill = forwardRef<HTMLButtonElement, PillProps>(function Pill(
  { variant = 'pill', ...props },
  ref,
) {
  return <Button ref={ref} variant={variant} size="pill" {...props} />;
});

export type IconPillProps = Omit<IconButtonProps, 'variant' | 'size'>;

/** A 36 px round icon pill on the page. Its label names it, as IconButton's. */
export const IconPill = forwardRef<HTMLButtonElement, IconPillProps>(
  function IconPill(props, ref) {
    return <IconButton ref={ref} variant="pill" size="play" {...props} />;
  },
);

/**
 * A bar's zone drawn as one pill, for a zone that is already a named group
 * (role="group" with its own label): the same look as PillGroup.
 */
export const PILL_ZONE =
  'inline-flex h-9 shrink-0 items-center gap-0.5 rounded-full bg-daw-pill px-1 text-daw-pill-text';

export interface PillGroupProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'aria-label'> {
  /** What the group is ('Undo and redo', 'Transport'): its accessible name. */
  label: string;
}

/**
 * Several controls in one 36 px pill. Put `bare` IconButtons, Toggles and
 * text in it. It doesn't clip, so a child's focus ring shows in full.
 */
export const PillGroup = forwardRef<HTMLDivElement, PillGroupProps>(
  function PillGroup({ label, className, ...props }, ref) {
    return (
      <div
        ref={ref}
        role="group"
        {...props}
        aria-label={label}
        className={cn(PILL_ZONE, className)}
      />
    );
  },
);
