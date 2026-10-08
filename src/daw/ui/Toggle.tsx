import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react';
import { Toggle as KitToggle } from '@/components/ui/toggle';
import { cn } from '@/components/utilities';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from './styles';
import { Tooltip } from './Tooltip';

export type ToggleTone = 'neutral' | 'record';
export type ToggleSize = 'sm' | 'md' | 'lg';

export interface ToggleProps
  extends Omit<
    ComponentPropsWithoutRef<typeof KitToggle>,
    'aria-label' | 'aria-labelledby' | 'children' | 'size' | 'variant'
  > {
  /**
   * What the toggle switches, in words ('Mute', 'Loop'). Required: it is the
   * accessible name even when the face shows only an icon or a letter.
   */
  label: string;
  icon?: ReactNode;
  /** The face's text ('M', 'Loop'). Defaults to the label when there is no icon. */
  children?: ReactNode;
  /**
   * 'record' fills red when on, for Arm and Record. Mute and Solo stay
   * neutral (owner decision 3): white/10 when on, never yellow.
   */
  tone?: ToggleTone;
  size?: ToggleSize;
  shortcut?: string;
}

const SIZE: Record<ToggleSize, string> = {
  sm: 'h-6 min-w-6 px-1.5 [&_svg]:size-3.5',
  md: 'h-7 min-w-7 px-2 [&_svg]:size-4',
  lg: 'h-8 min-w-8 px-2.5 [&_svg]:size-4',
};

const TONE: Record<ToggleTone, string> = {
  neutral:
    'data-[state=on]:bg-daw-selected data-[state=on]:text-daw-text data-[state=on]:hover:bg-daw-selected',
  record:
    'data-[state=on]:bg-daw-danger data-[state=on]:text-daw-on-danger data-[state=on]:hover:bg-daw-danger-hover',
};

/**
 * A two-state button on the shared Radix kit: aria-pressed, with white/10 to
 * show it is on. An icon-only toggle gets its label as a tooltip, like
 * IconButton.
 */
export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  function Toggle(
    {
      label,
      icon,
      children,
      tone = 'neutral',
      size = 'md',
      shortcut,
      className,
      ...props
    },
    ref,
  ) {
    const face = icon || children ? children : label;
    const toggle = (
      <KitToggle
        ref={ref}
        data-tone={tone}
        className={cn(
          // Replaces the kit's sizes, accent fill and ring.
          'gap-1.5 rounded-[var(--daw-radius-sm)] bg-transparent font-bold text-daw-text-2 hover:bg-daw-hover hover:text-daw-text focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-40',
          TYPE_CLASS.label,
          SIZE[size],
          TONE[tone],
          TRANSITION,
          FOCUS_RING,
          className,
        )}
        {...props}
        // After the spread, so the label stays the name (see IconButton).
        aria-label={label}
        aria-labelledby={undefined}
      >
        {icon}
        {face}
      </KitToggle>
    );
    return (
      <Tooltip
        content={label}
        shortcut={shortcut}
        disabled={!icon || !!children}
      >
        {toggle}
      </Tooltip>
    );
  },
);
