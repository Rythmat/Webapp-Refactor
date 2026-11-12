import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';

// ── The Office's recipes (owner, 2026-11-09) ───────────────────────────────
// Built on the Studio's tokens and kit, so the Office reads as the Studio
// and the Globe do: pills on the rails, one stage card, a quiet Inspector.
// Colour stays for meaning (status, live, warnings), never decoration.

/** One of a rail pill's segments, lit while it is the current page. */
export const OFFICE_SEGMENT = `inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-full px-4 text-[0.8125rem] text-daw-pill-text hover:text-daw-text aria-[current=page]:bg-daw-pill-on aria-[current=page]:font-bold aria-[current=page]:text-daw-text ${TRANSITION} ${FOCUS_RING}`;

/** A page in the stage: its gutters and its widest column. */
export const OFFICE_PAGE =
  'mx-auto flex w-full max-w-[86rem] flex-col gap-8 px-4 py-6 md:px-8 md:py-8';

/** A card on the stage: a step lighter than the stage itself. */
export const OFFICE_CARD =
  'rounded-[1.25rem] border border-white/[0.06] bg-white/[0.03]';

/** A list row in a card: the whole row is the link. */
export const OFFICE_ROW = `flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-white/[0.05] ${TRANSITION} ${FOCUS_RING}`;

/** A section's title on a page. */
export const OFFICE_SECTION_TITLE =
  'text-[1.125rem] font-semibold leading-6 text-daw-text';

/** A page's title: big, regular weight, tight, as the console's and Learn's. */
export const OFFICE_PAGE_TITLE =
  'text-[clamp(1.75rem,3.2vw,2.5rem)] font-normal leading-tight tracking-[-0.02em] text-daw-text';
