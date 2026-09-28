import { useId, type CSSProperties, type ReactNode } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/components/utilities';

// ── TheoryPopover ──────────────────────────────────────────────────────────
// A theory note on tap: a chip, badge or cue opens its note in a small card.
// Portalled, so a note opened from the chord strip or the TAB is never
// clipped by their scroll areas. Escape or a tap elsewhere closes it; the
// open/close fade is dropped under prefers-reduced-motion.

export interface PopoverNote {
  id: string;
  title: string;
  body: string;
}

interface TheoryPopoverProps {
  /** One note, or several read together (a change that is tricky and moves the root). */
  notes: readonly PopoverNote[];
  /** The trigger's content: visible text, optionally with an icon. */
  children: ReactNode;
  /** Accessible name when it should say more than the visible text (must contain it). */
  triggerLabel?: string;
  className?: string;
  style?: CSSProperties;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function TheoryPopover({
  notes,
  children,
  triggerLabel,
  className,
  style,
  side = 'top',
}: TheoryPopoverProps) {
  const titleId = useId();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={triggerLabel}
          className={cn(
            'pointer-events-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1',
            className,
          )}
          style={style}
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        aria-labelledby={titleId}
        data-theory-popover
        className="w-64 space-y-2 p-3 text-xs leading-snug motion-reduce:!animate-none"
        style={{
          background: 'var(--color-surface, #1c1c22)',
          borderColor: 'var(--color-border, rgba(255,255,255,0.12))',
          color: 'var(--color-text, #e8e8f0)',
        }}
      >
        {notes.map((note, i) => (
          <div key={note.id} data-note-id={note.id}>
            <p id={i === 0 ? titleId : undefined} className="font-semibold">
              {note.title}
            </p>
            <p style={{ color: 'var(--color-text-dim, #9a9aab)' }}>
              {note.body}
            </p>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
