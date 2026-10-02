import { ChevronDown } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { cn } from '@/components/utilities';
import type { ResolvedTheoryNote } from '@/curriculum/data/guitar/theoryNotes';

// ── Theory note parts ──────────────────────────────────────────────────────
// What a theory note is drawn with. 'panel' is the lesson's theory panel
// (GuitarTheoryPanel), exactly as it has always looked. 'sheet' is the
// About this step sheet: plain text on the sheet, no accent, nothing to
// close (the sheet itself closes).

type NoteCardProps =
  | {
      variant?: 'panel';
      note: ResolvedTheoryNote;
      keyColor: string;
      onClose: () => void;
    }
  | { variant: 'sheet'; note: ResolvedTheoryNote };

/** An intro note, open: its title and body. */
export function NoteCard(props: NoteCardProps) {
  const titleId = useId();
  const { note } = props;
  if (props.variant === 'sheet') {
    return (
      <div
        data-theory-note={note.id}
        role="group"
        aria-labelledby={titleId}
        className="flex flex-col gap-1"
      >
        <h4
          id={titleId}
          className="text-[15px] font-bold leading-6 text-[#e8e8f0]"
        >
          {note.title}
        </h4>
        <p className="text-[15px] leading-6 text-[#e8e8f0]">{note.body}</p>
      </div>
    );
  }
  const { keyColor, onClose } = props;
  return (
    <div
      data-theory-note={note.id}
      data-open-intro
      role="group"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="flex flex-col gap-1 rounded-lg py-1.5 pl-3 pr-2 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
      style={{
        borderLeft: `3px solid ${keyColor}`,
        background: 'rgba(255,255,255,0.04)',
      }}
    >
      <h4 id={titleId} className="text-sm font-semibold">
        {note.title}
      </h4>
      <p
        className="text-[13px] leading-snug"
        style={{ color: 'var(--color-text-dim, #b4b4c2)' }}
      >
        {note.body}
      </p>
      <button
        type="button"
        onClick={onClose}
        className="self-end rounded-full px-2 py-0.5 text-xs hover:bg-white/10"
        style={{
          border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
        }}
      >
        Got it
      </button>
    </div>
  );
}

/** A "More notes" item: its title, opening to its body. */
export function InfoItem({
  note,
  variant = 'panel',
}: {
  note: ResolvedTheoryNote;
  variant?: 'panel' | 'sheet';
}) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  if (variant === 'sheet') {
    return (
      <li data-info-note={note.id}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen(!open)}
          className="-mx-2 flex min-h-11 w-[calc(100%+1rem)] items-center justify-between gap-3 rounded-lg px-2 py-2 text-left text-[15px] leading-6 text-[#e8e8f0] transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          {note.title}
          <ChevronDown
            aria-hidden
            className={cn(
              'size-4 shrink-0 text-white/45',
              open && 'rotate-180',
            )}
          />
        </button>
        {open && (
          <p id={bodyId} className="pb-3 text-[15px] leading-6 text-[#e8e8f0]">
            {note.body}
          </p>
        )}
      </li>
    );
  }
  return (
    <li data-info-note={note.id}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[13px] font-medium hover:bg-white/5"
      >
        <ChevronDown
          aria-hidden
          className={cn(
            'h-3.5 w-3.5 shrink-0 motion-safe:transition-transform',
            open ? 'rotate-0' : '-rotate-90',
          )}
        />
        {note.title}
      </button>
      {open && (
        <p
          id={bodyId}
          className="pb-1 pl-5 text-[13px] leading-snug"
          style={{ color: 'var(--color-text-dim, #b4b4c2)' }}
        >
          {note.body}
        </p>
      )}
    </li>
  );
}

/**
 * A sheet block's heading that opens and closes the block: an h3 holding
 * the button, so the block is found by heading and by its button.
 */
export function DisclosureHeading({
  id,
  open,
  onToggle,
  controls,
  children,
}: {
  /** The heading's id: the block's region is labelled by it. */
  id: string;
  open: boolean;
  onToggle: () => void;
  /** The id of the body it shows and hides. */
  controls: string;
  children: ReactNode;
}) {
  return (
    <h3 id={id}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={controls}
        onClick={onToggle}
        className="-mx-2 flex min-h-11 w-[calc(100%+1rem)] items-center justify-between gap-3 rounded-lg px-2 py-2 text-left text-[15px] font-bold leading-6 text-[#e8e8f0] transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        {children}
        <ChevronDown
          aria-hidden
          className={cn('size-4 shrink-0 text-white/45', open && 'rotate-180')}
        />
      </button>
    </h3>
  );
}

/**
 * ChordFamilyStrip in the sheet's type, the strip itself unchanged (it is
 * shared): chord symbols bold, the number labels and Roman numerals at the
 * 12 px floor, and its greys white/55. Goes on an element around the strip.
 */
export const FAMILY_STRIP_SHEET_LOOK = cn(
  '[&_[data-family-chip]>span:nth-child(2)]:font-bold',
  '[&_[data-family-chip]>span:nth-child(3)]:text-xs [&_[data-family-chip]>span:nth-child(3)]:!text-white/55',
  '[&_[data-later]>span:nth-child(2)]:!text-white/55',
  '[&_[data-roman]]:text-xs',
);

/**
 * SameRootCompare in the sheet's type, the panel itself unchanged: its
 * toggle a 36 px target (44 px on a phone), its caption and the moved-note
 * labels at the 12 px floor, weight 400, greys white/55.
 */
export const COMPARE_SHEET_LOOK = cn(
  '[&_[data-same-root-compare]>button]:min-h-9 [&_[data-same-root-compare]>button]:px-3 [&_[data-same-root-compare]>button]:text-sm max-sm:[&_[data-same-root-compare]>button]:min-h-11',
  '[&_[data-same-root-compare]_section>p]:text-xs [&_[data-same-root-compare]_section>p]:!text-white/55',
  '[&_[data-moved]]:text-xs [&_[data-moved]]:font-normal [&_[data-moved]_span_span]:!text-white/55',
);

/** The small uppercase label over a sheet block. */
export function BlockLabel({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <h3
      id={id}
      className="text-xs uppercase leading-4 tracking-[0.14em] text-white/45"
    >
      {children}
    </h3>
  );
}
