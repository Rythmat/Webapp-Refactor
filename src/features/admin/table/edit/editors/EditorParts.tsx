import type { KeyboardEvent, ReactNode } from 'react';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover';
import type { EditMove } from './types';

/**
 * What the cell editors share: which key commits and where it moves, the
 * box's look, and the note beside the cell that says why a draft cannot be
 * written.
 */

/**
 * A key pressed while an input method is composing (Japanese, Chinese,
 * Korean): the composition's own — its Enter confirms the characters, its
 * arrows pick among them, its Esc drops them — never the editor's, or
 * Enter would save half a word and move on. Safari says so of the Enter
 * that ends a composition only by its key code, 229 (`isComposing` is
 * already false there).
 */
export const composing = (event: KeyboardEvent): boolean =>
  event.nativeEvent.isComposing ||
  event.key === 'Process' ||
  event.keyCode === 229;

/**
 * Enter and Shift+Enter commit and move down or up; Tab and Shift+Tab,
 * right or left. Anything else is the editor's own. (Each editor leaves
 * the keys of a composition alone first: `composing`.)
 */
export function moveFor(event: KeyboardEvent): EditMove | null {
  if (event.key === 'Enter') return event.shiftKey ? 'up' : 'down';
  if (event.key === 'Tab') return event.shiftKey ? 'left' : 'right';
  return null;
}

/** The box in the cell: it fills the 44 px row, as `h-8 w-full`. */
export const EDITOR_INPUT =
  'h-8 w-full min-w-0 rounded-md border bg-[#0b0b0d] px-2 text-sm text-white outline-none placeholder:text-white/35 focus-visible:ring-1 focus-visible:ring-white/40';

/** Opaque, like the Columns menu: the grid's chips must not show through. */
export const EDITOR_POPOVER =
  'border-white/[0.12] bg-[#141416] text-white/85 shadow-lg';

/**
 * Why the draft cannot be written, under the cell: the box names it
 * (`aria-describedby={id}`) and it is said at once (`role="alert"`). It
 * floats outside the grid, so the cell's `overflow-hidden` never clips it,
 * and it hides while the cell is scrolled out of view. It never takes
 * focus: typing goes on in the box.
 */
export const EditorProblem = ({
  id,
  message,
  children,
}: {
  id: string;
  message: string | null;
  /** The box the note belongs to. */
  children: ReactNode;
}) => (
  <Popover open={message !== null}>
    <PopoverAnchor asChild>{children}</PopoverAnchor>
    {message !== null && (
      <PopoverContent
        // A note, not a dialog: nothing in it takes focus.
        role="presentation"
        side="bottom"
        align="start"
        sideOffset={6}
        hideWhenDetached
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        className="w-auto max-w-xs border-red-400/40 bg-[#1b1113] px-3 py-2 text-xs leading-snug text-red-100"
      >
        <p id={id} role="alert">
          {message}
        </p>
      </PopoverContent>
    )}
  </Popover>
);
