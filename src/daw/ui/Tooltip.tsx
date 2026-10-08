import {
  createContext,
  useContext,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  Tooltip as KitTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/components/utilities';
import { Kbd } from './Kbd';
import { OVERLAY_MOTION, TYPE_CLASS } from './styles';

/** A tip opens after this much hover; once one has shown, the next at once. */
const DELAY_MS = 400;
const SKIP_DELAY_MS = 300;

const InGroup = createContext(false);

/**
 * One tooltip timing for everything inside it: the editor, the gallery.
 * Once a tip has shown, the next one opens at once as the pointer moves
 * along a toolbar, instead of after another 400 ms at every button.
 */
export function TooltipGroup({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={DELAY_MS} skipDelayDuration={SKIP_DELAY_MS}>
      <InGroup.Provider value>{children}</InGroup.Provider>
    </TooltipProvider>
  );
}

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
 * hover, at once on keyboard focus, and closes on Escape or a click. Inside
 * a TooltipGroup it shares the group's timing; outside one (a portal, a page
 * without a group) it brings its own.
 *
 * Radix reads an open tip to screen readers as the control's description.
 * When the tip only repeats the control's name (an icon button's label),
 * that would read the name twice ('Undo, button, Undo'), so the tip then
 * describes only its shortcut, or nothing.
 */
export function Tooltip({
  content,
  shortcut,
  side = 'top',
  disabled = false,
  children,
}: TooltipProps) {
  const inGroup = useContext(InGroup);
  if (disabled) return children;

  const name = (children.props as { 'aria-label'?: unknown })['aria-label'];
  const repeatsName = typeof content === 'string' && content === name;
  const tip = (
    <KitTooltip>
      <TooltipTrigger
        asChild
        {...(repeatsName && !shortcut ? { 'aria-describedby': undefined } : {})}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent
        side={side}
        sideOffset={6}
        collisionPadding={8}
        aria-label={
          repeatsName && shortcut ? `Shortcut ${shortcut}` : undefined
        }
        className={cn(
          'z-[var(--daw-z-tooltip)] flex items-center gap-2 rounded-[var(--daw-radius-sm)] border border-daw-hairline bg-daw-popover px-2 py-1 text-daw-text shadow-lg shadow-black/40',
          OVERLAY_MOTION.fast,
          TYPE_CLASS.label,
        )}
      >
        {content}
        {shortcut && <Kbd>{shortcut}</Kbd>}
      </TooltipContent>
    </KitTooltip>
  );
  return inGroup ? (
    tip
  ) : (
    <TooltipProvider delayDuration={DELAY_MS} skipDelayDuration={SKIP_DELAY_MS}>
      {tip}
    </TooltipProvider>
  );
}
