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
