import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';

/**
 * The class strings the Globe's primitives are made of, for the few elements
 * that cannot be one of them (a row inside a virtual list, a timeline dot).
 * Colours come from the `atlas-*` tokens (../../../theme/tokens.ts); the
 * look is the Studio's (owner, 2026-10-29): its focus outline, its motion,
 * its pills on the page and its surfaces (src/daw/ui/styles.ts, Pill.tsx).
 */

/** Keyboard focus: the Studio's outline, the same on every control. */
export const ATLAS_FOCUS = FOCUS_RING;

/**
 * Keyboard focus inside something that clips its children (a list row in a
 * scroller, a video's frame): the outline drawn inward, so it is never cut.
 */
export const ATLAS_FOCUS_INSET =
  'outline-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-atlas-focus';

/** The Studio's motion for a control's colours, opacity and press. */
export const ATLAS_TRANSITION = TRANSITION;

/**
 * A panel: the Studio's surface 1, opaque, with its floating shadow. Nothing
 * over the globe has a backdrop blur, which made the browser re-blur the
 * animating canvas under each panel on every frame.
 */
export const ATLAS_SURFACE =
  'rounded-xl bg-atlas-panel text-atlas-text [box-shadow:var(--daw-shadow-float)]';

/**
 * A popover or menu: the Studio's menu surface, opaque, since it opens over
 * other panels (search over the details card).
 */
/**
 * A floating card over the map (owner, 2026-10-29: the Studio frame with
 * floating cards): Home's prompt-box frame on the panel, nearly opaque, no
 * blur (the map moves under it).
 */
export const ATLAS_CARD =
  'rounded-[1.25rem] border border-white/10 bg-atlas-panel/95 text-atlas-text [box-shadow:var(--daw-shadow-float)]';

export const ATLAS_POPOVER =
  'rounded-[0.625rem] bg-atlas-menu text-atlas-text [box-shadow:var(--daw-shadow-pop)]';

/** A dialog over the page: the prompt box's frame on the panel surface. */
export const ATLAS_DIALOG =
  'rounded-[1.25rem] border border-white/10 bg-atlas-panel text-atlas-text [box-shadow:var(--daw-shadow-modal)]';

/** The one heading style: a panel's title. */
export const ATLAS_HEADING = 'text-lg font-bold leading-snug text-atlas-text';

/** The micro label over a section (the kit's MICRO_LABEL, in atlas tokens). */
export const ATLAS_EYEBROW =
  'text-[0.6875rem] font-bold uppercase leading-[1.27] tracking-[0.08em] text-atlas-text-3';

/** The title of an item inside a panel: an event card, a bar's current stop. */
export const ATLAS_ITEM_TITLE =
  'text-sm font-bold leading-snug text-atlas-text';

/** A clickable row in a panel's list. */
export const ATLAS_ROW = `rounded-lg hover:bg-white/[0.06] ${TRANSITION} ${ATLAS_FOCUS_INSET}`;

/**
 * A text link inside a panel: white, underlined. For an action that reads as
 * a sentence ("Search the globe for …").
 */
export const ATLAS_LINK = `rounded-sm text-atlas-text underline decoration-white/40 underline-offset-2 hover:decoration-white ${FOCUS_RING}`;

/**
 * A zone of controls on the rails: the Studio's pill (src/daw/ui/Pill.tsx
 * PILL_ZONE), its controls `ATLAS_SEGMENT`s or pill-variant buttons.
 */
export const ATLAS_PILL_ZONE =
  'inline-flex h-9 shrink-0 items-center gap-0.5 rounded-full bg-atlas-pill px-1 text-atlas-pill-text';

/** One of a pill's segments, lit while it is the current one (view tabs). */
export const ATLAS_SEGMENT = `h-8 shrink-0 whitespace-nowrap rounded-full px-4 text-[0.8125rem] text-atlas-pill-text hover:text-atlas-text aria-[current=page]:bg-atlas-pill-on aria-[current=page]:font-bold aria-[current=page]:text-atlas-text ${TRANSITION} ${FOCUS_RING}`;

/** A filter pill (a genre chip): the prompt box's pills, lit when chosen. */
export const ATLAS_FILTER_PILL = `flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[0.8125rem] ${TRANSITION} ${FOCUS_RING}`;
export const ATLAS_FILTER_ON = 'border-white/20 bg-white/15 text-white';
export const ATLAS_FILTER_OFF =
  'border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.07] hover:text-white/85';

/**
 * A pill floating on the globe in the map-control cluster (Spin, Layers,
 * Legend), until the rails take them: the Studio's pill, with its shadow.
 */
export const ATLAS_MAP_CONTROL =
  'h-9 gap-2 border-0 bg-atlas-pill px-3.5 text-atlas-pill-text [box-shadow:var(--daw-shadow-float)] hover:bg-atlas-pill hover:text-atlas-text aria-expanded:bg-atlas-pill-on aria-expanded:text-atlas-text';

/**
 * For a Radix popover or dialog, which stays mounted while its exit
 * animation plays. src/index.css gives every element an `animation-name`
 * (its autofill hook), so Radix takes any closing surface for one that is
 * animating out and waits for an `animationend` that never comes: the
 * Layers popover stayed open after Escape. `animation: none` lets it close
 * at once.
 */
export const ATLAS_NO_EXIT_ANIMATION = 'animate-none';
