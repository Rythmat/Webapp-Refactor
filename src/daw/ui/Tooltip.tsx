import { type ReactElement, type ReactNode } from 'react';
import {
  Tooltip as KitTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/components/utilities';
import { Kbd } from './Kbd';
import { TYPE_CLASS } from './styles';

export interface TooltipProps {
  /** The tip. For an icon button this is its label. */
  content: ReactNode;
  /** A shortcut shown after the tip. */
  shortcut?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Render the child alone, without a tip. */
  disabled?: boolean;
  /** One element that takes a ref and pointer and focus handlers. */
  children: ReactElement;
}

/**
 * A hover and focus tip on the shared Radix kit: it opens after 400 ms of
 * hover, at once on keyboard focus, and closes on Escape or a click. It
 * brings its own provider, so it works outside the app's (the DAW's portals,
 * the gallery) and keeps this delay inside it.
 */
export function Tooltip({
  content,
  shortcut,
  side = 'top',
  disabled = false,
  children,
}: TooltipProps) {
  if (disabled) return children;
  return (
    <TooltipProvider delayDuration={400} skipDelayDuration={300}>
      <KitTooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className={cn(
            'z-[var(--daw-z-tooltip)] flex items-center gap-2 rounded-[var(--daw-radius-sm)] border border-daw-hairline bg-daw-popover px-2 py-1 text-daw-text shadow-lg shadow-black/40 duration-daw-fast',
            TYPE_CLASS.label,
          )}
        >
          {content}
          {shortcut && <Kbd>{shortcut}</Kbd>}
        </TooltipContent>
      </KitTooltip>
    </TooltipProvider>
  );
}
