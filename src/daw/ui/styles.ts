import { installDawTokens } from './tokens';

// Every primitive imports this module, so the --daw-* tokens are on :root
// before the first one renders, wherever that is: in the editor, in an
// overlay portaled to <body>, or on the Studio dashboard (PremiumBadge).
// Milestone 2.1's codemod, which moves the legacy --color-* uses onto these
// tokens, also moves this install to src/main.tsx; until then the
// primitives bring their own.
installDawTokens();

/**
 * The keyboard focus indicator: a 2 px ring with a 2 px gap, so it reads on
 * the white pill as well as on dark chrome. Shown for keyboard focus only.
 */
export const FOCUS_RING =
  'outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-daw-focus';

/**
 * The type scale as classes. Font sizes go through the `length:` hint
 * because tailwind-merge files a custom `text-*` name under text colour and
 * would drop it next to `text-daw-text`; with the hint it is a font size and
 * replaces the kit's `text-sm`.
 */
export const TYPE_CLASS = {
  micro:
    'text-[length:var(--daw-font-micro)] leading-[var(--daw-leading-micro)] font-bold uppercase tracking-[var(--daw-tracking-micro)]',
  label:
    'text-[length:var(--daw-font-label)] leading-[var(--daw-leading-label)]',
  body: 'text-[length:var(--daw-font-body)] leading-[var(--daw-leading-body)]',
  title:
    'text-[length:var(--daw-font-title)] leading-[var(--daw-leading-title)] font-bold',
  coach:
    'text-[length:var(--daw-font-coach)] leading-[var(--daw-leading-coach)]',
  heading:
    'text-[length:var(--daw-font-heading)] leading-[var(--daw-leading-heading)] font-bold',
} as const;

/** Colour and size transitions at the fast step (0 ms under reduced motion). */
export const TRANSITION =
  'transition-[background-color,border-color,color,opacity,transform] duration-daw-fast ease-daw';

/**
 * How an overlay on the kit opens and closes (dialogs, sheets, menus,
 * selects, popovers, tooltips): at a motion step, and not at all under
 * reduced motion. The kit animates them with `data-[state=open]:animate-in`
 * and `data-[state=closed]:animate-out`, which carry their own 150 ms at a
 * higher specificity than a plain duration class, so the step is set under
 * the same two state variants as well.
 */
export const OVERLAY_MOTION = {
  fast: 'duration-daw-fast data-[state=open]:duration-daw-fast data-[state=closed]:duration-daw-fast motion-reduce:!animate-none',
  base: 'duration-daw-base data-[state=open]:duration-daw-base data-[state=closed]:duration-daw-base motion-reduce:!animate-none',
} as const;

/**
 * The surface every floating panel shares: menus, popovers, selects and
 * tooltips. Opaque (never glass), with a hairline and a soft shadow, above
 * dialogs in the stacking order.
 */
export const FLOATING_SURFACE = `z-[var(--daw-z-popover)] rounded-[var(--daw-radius-md)] border border-daw-hairline bg-daw-popover text-daw-text shadow-xl shadow-black/40 ${OVERLAY_MOTION.fast}`;
