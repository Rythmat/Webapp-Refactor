import { type HTMLAttributes } from 'react';
import { cn } from '@/components/utilities';
import { TYPE_CLASS } from './styles';

/**
 * A key or shortcut as the student presses it ('⌘Z', 'Space'), in tooltips
 * and menus. At the 12 px label floor, like any other text.
 */
export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-[var(--daw-radius-sm)] border border-daw-hairline px-1 font-[inherit] text-daw-text-3',
        TYPE_CLASS.label,
        className,
      )}
      {...props}
    />
  );
}

/**
 * A key on a lighter cap, beside a menu row or in a Learn card ('A' for
 * Add audio track, 'Shift T'): 24 px, white/10 edge on the chip fill.
 * Hide it from screen readers when the row's shortcut already says it.
 */
export function Keycap({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <Kbd
      className={cn(
        'h-6 min-w-6 rounded-[var(--daw-radius-xs)] border-daw-edge bg-daw-chip px-1.5 text-daw-text-2',
        className,
      )}
      {...props}
    />
  );
}
