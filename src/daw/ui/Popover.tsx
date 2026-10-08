import * as PopoverPrimitive from '@radix-ui/react-popover';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from 'react';
import {
  Popover as KitPopover,
  PopoverAnchor as KitPopoverAnchor,
  PopoverContent as KitPopoverContent,
  PopoverTrigger as KitPopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/components/utilities';
import { FLOATING_SURFACE, TYPE_CLASS } from './styles';

/**
 * A panel anchored to its trigger, on the shared Radix kit: the Song chip's
 * key and tempo, a track's colour, a collab invite. Escape or a click
 * outside closes it and focus returns to the trigger. Opaque, 8 px corners,
 * in the popover layer so one opened from a dialog sits above it.
 */
export const Popover = KitPopover;
export const PopoverTrigger = KitPopoverTrigger;
export const PopoverAnchor = KitPopoverAnchor;
/** Closes the popover from inside (a Done button). */
export const PopoverClose = PopoverPrimitive.Close;

export const PopoverContent = forwardRef<
  ElementRef<typeof KitPopoverContent>,
  ComponentPropsWithoutRef<typeof KitPopoverContent>
>(function PopoverContent({ className, ...props }, ref) {
  return (
    <KitPopoverContent
      ref={ref}
      collisionPadding={8}
      className={cn(FLOATING_SURFACE, 'w-auto p-3', TYPE_CLASS.body, className)}
      {...props}
    />
  );
});
