import { cn } from '@/components/utilities';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';

// ── Samply's library look (owner, 2026-11-10) ──────────────────────────────
// Measured on samply.app/library and set in our rem (html is 110%): a big
// title on the left, small pill tabs, flat square art with a hairline, a
// semibold title over a grey line, and list rows that stripe every other one.
// Learn's shelves and its path pages draw from here.

/** The page's title, top left. */
export const PAGE_TITLE =
  'text-[2.125rem] font-bold leading-[2.5rem] text-white';

/** The small grey line: a row's subtitle, a stat, a quiet link. */
export const CAPTION = 'text-[0.75rem] leading-4 text-white/50';

/** A tab: small words, the one showing on a soft pill. */
export const TAB = cn(
  'inline-flex h-8 shrink-0 items-center rounded-full px-3.5 text-[0.75rem] font-medium text-white/50 hover:text-white',
  TRANSITION,
  FOCUS_RING,
);
export const TAB_ACTIVE = 'bg-white/[0.08] text-white';

/**
 * A card's title, and the grey lines under it, at Samply's own sizes
 * (owner, 2026-11-10, measured side by side): 14px on a 20px line, the
 * small facts 12px on 16, the art 10px above the title. In rem over the
 * app's 17.6px root, so they come out at those pixels.
 */
export const CARD_TITLE =
  'truncate text-[0.795rem] font-semibold leading-[1.136rem] text-white';
export const CARD_SUB =
  'truncate text-[0.795rem] leading-[1.136rem] text-white/50';
export const CARD_META = 'text-[0.682rem] leading-[0.909rem] text-white/50';
export const CARD_GAP = 'mt-[0.568rem]';

/** A row's title, at a fixed size (rows, strips). */
export const ROW_TITLE =
  'truncate text-[0.875rem] font-semibold leading-5 text-white';

/** A card's art: square corners eased, a hairline inside. */
export const ART_FRAME =
  'overflow-hidden rounded-xl ring-1 ring-inset ring-white/[0.08]';

/** A list row: a fill on hover. Its `<li>` takes LIST_STRIPE. */
export const LIST_ROW = cn(
  'flex w-full items-center gap-4 rounded-2xl p-3 text-left hover:bg-white/[0.05]',
  TRANSITION,
  FOCUS_RING,
);

/** Every other row a shade lighter, on the row's `<li>`. */
export const LIST_STRIPE = 'rounded-2xl even:bg-white/[0.03]';

/** A round icon button. */
export const ICON_BUTTON = cn(
  'grid size-9 shrink-0 place-items-center rounded-full bg-white/[0.08] text-white hover:bg-white/[0.14]',
  TRANSITION,
  FOCUS_RING,
);

/** A flat panel: no border to speak of, a shade over the page. */
export const PANEL = 'rounded-xl border border-white/[0.02] bg-white/[0.06]';

/**
 * A row in the app rail, as Suno's open sidebar (owner, 2026-11-11,
 * measured): a 48px pill, rows 1px apart, the 18px icon 12px before the 15px
 * name. 15px in (Suno's 16, less the panel's 1px edge), so the icons sit where
 * its shut rail's do. Name and icon grey (#a3a3a3), white on hover over a 4%
 * fill; the page showing, white over 10%, 16% hovered. The weight never
 * changes.
 */
export const RAIL_ROW = cn(
  'group flex h-[2.727rem] min-w-0 items-center gap-[0.682rem] rounded-full px-[0.852rem] text-[0.852rem] leading-[1.136rem] text-[#a3a3a3] hover:bg-white/[0.04] hover:text-white',
  TRANSITION,
  FOCUS_RING,
);
export const RAIL_ROW_ACTIVE = 'bg-white/10 text-white hover:bg-white/[0.16]';
/** The rows at the rail's foot (help, support, log out): Suno's 40px. */
export const RAIL_ROW_FOOT = 'h-[2.273rem]';
/** A row's icon slot: 18px, in the row's colour. */
export const RAIL_ICON =
  'flex size-[1.023rem] shrink-0 items-center justify-center';
/** The rail's round buttons (shut it, search): 36px, the 20px icon at 48%. */
export const RAIL_BUTTON = cn(
  'inline-flex size-[2.045rem] shrink-0 items-center justify-center rounded-full text-white/[0.48] hover:bg-white/[0.08] hover:text-white',
  TRANSITION,
  FOCUS_RING,
);
