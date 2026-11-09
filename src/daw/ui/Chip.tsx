import { Slot, Slottable } from '@radix-ui/react-slot';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/components/utilities';
import { onColor } from './color';
import { FOCUS_RING, TYPE_CLASS } from './styles';

export type ChipTone = 'neutral' | 'record' | 'warning' | 'success';

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  /** Neutral by default; the others carry meaning (a red 'Rec', an amber note). */
  tone?: ChipTone;
  /**
   * A meaning colour, such as a key's or a track's: a dot before the text,
   * or with `fill` the chip's background with readable ink on it.
   */
  color?: string;
  /**
   * With `color`: true fills the chip with it; 'tint' gives it a pale
   * version of the colour with near-black text (the prompt bar's target).
   */
  fill?: boolean | 'tint';
  /**
   * What `color` means, for the design probe: a track's or a key's colour.
   * Set by default whenever `color` is.
   */
  meaning?: 'track-colour' | 'key-colour' | 'colour';
  /** A dashed outline and no fill: something not set yet (no key chosen). */
  dashed?: boolean;
  /** A leading icon, 14 px. */
  icon?: ReactNode;
  /** 20 px high by default; 24 px beside 28 px controls. */
  size?: 'sm' | 'md';
  /** Render the child (a button, say) with the chip's look. */
  asChild?: boolean;
}

const TONE: Record<ChipTone, string> = {
  neutral: 'bg-daw-chip text-daw-text-2',
  record: 'bg-daw-danger-subtle text-daw-danger-text',
  warning: 'bg-daw-warning-subtle text-daw-warning',
  success: 'bg-daw-success-subtle text-daw-success',
};

/**
 * A small label: a status, a count, the key, Premium. Neutral white/8 with
 * 12 px text unless it means something. Not a control on its own; wrap a
 * button with `asChild` for that.
 */
export const Chip = forwardRef<HTMLSpanElement, ChipProps>(function Chip(
  {
    tone = 'neutral',
    color,
    fill = false,
    meaning,
    dashed = false,
    icon,
    size = 'sm',
    asChild = false,
    className,
    style,
    children,
    ...props
  },
  ref,
) {
  const Component = asChild ? Slot : 'span';
  const filled = Boolean(color && fill === true);
  const tinted = Boolean(color && fill === 'tint');
  return (
    <Component
      ref={ref}
      data-tone={tone}
      data-meaning={color ? (meaning ?? 'colour') : undefined}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 [&_svg]:size-3.5 [&_svg]:shrink-0',
        size === 'md' ? 'h-6' : 'h-5',
        TYPE_CLASS.label,
        dashed
          ? 'border border-dashed border-daw-outline bg-transparent text-daw-text-3'
          : TONE[tone],
        // A chip that is a control (a trigger) shows the kit's focus ring,
        // not the browser's default outline.
        asChild && FOCUS_RING,
        className,
      )}
      style={
        filled && color
          ? { backgroundColor: color, color: onColor(color), ...style }
          : tinted && color
            ? {
                backgroundColor: `color-mix(in srgb, ${color} 55%, var(--daw-primary))`,
                color: 'var(--daw-on-primary)',
                ...style,
              }
            : style
      }
      {...props}
    >
      {color && fill === false && (
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {icon}
      {asChild ? <Slottable>{children}</Slottable> : children}
    </Component>
  );
});

export interface ColorChipProps
  extends Omit<ChipProps, 'color' | 'fill' | 'meaning' | 'tone'> {
  /** The track's or key's colour. */
  color: string;
  meaning: 'track-colour' | 'key-colour';
}

/**
 * A chip in a pale version of a meaning colour, with near-black text: what
 * the prompt bar is about to act on ('Bass', '4 bars · Keys'). 24 px, so it
 * can be a control (wrap a button with `asChild`).
 */
export const ColorChip = forwardRef<HTMLSpanElement, ColorChipProps>(
  function ColorChip({ size = 'md', ...props }, ref) {
    return <Chip ref={ref} fill="tint" size={size} {...props} />;
  },
);
