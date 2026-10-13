/**
 * The class strings the Globe's primitives are made of, for the few elements
 * that cannot be one of them (a row inside a virtual list, a timeline dot).
 * Colours come from the `atlas-*` tokens (../../../theme/tokens.ts).
 */

/** Keyboard focus, the same ring on every control. */
export const ATLAS_FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus';

/**
 * Every panel and bar: #151518 at 95%, a white/8 hairline, the
 * larger of the two radii. Opaque enough that nothing over the globe needs a
 * backdrop blur, which made the browser re-blur the animating canvas under
 * each panel on every frame.
 */
export const ATLAS_SURFACE =
  'rounded-2xl border border-atlas-panel-border bg-atlas-panel/95 text-atlas-text shadow-2xl';

/**
 * A popover: the surface, fully opaque, since it opens over other panels
 * (search over the details card) and their text would show through 95%.
 */
export const ATLAS_POPOVER =
  'rounded-2xl border border-atlas-panel-border bg-atlas-panel text-atlas-text shadow-2xl';

/** The one heading style: a panel's title. */
export const ATLAS_HEADING = 'text-xl font-bold leading-tight text-atlas-text';

/** The title of an item inside a panel: an event card, a bar's current stop. */
export const ATLAS_ITEM_TITLE =
  'text-sm font-bold leading-snug text-atlas-text';

/** A clickable row in a panel's list. */
export const ATLAS_ROW = `rounded-2xl transition-colors hover:bg-white/[0.06] ${ATLAS_FOCUS}`;

/**
 * A text link inside a panel: the accent, underlined on hover. For an action
 * that reads as a sentence ("Search the globe for …").
 */
export const ATLAS_LINK = `rounded-sm text-atlas-accent underline-offset-2 hover:underline ${ATLAS_FOCUS}`;

/**
 * A pill floating on the globe in the map-control cluster (Spin, Layers,
 * Legend): an outline pill on the panel surface, since over the globe the
 * pill's own white/4 fill would leave the label on whatever colour spins
 * past.
 */
export const ATLAS_MAP_CONTROL =
  'h-10 gap-2 bg-atlas-panel/95 px-3.5 shadow-2xl hover:bg-atlas-panel aria-expanded:border-white/30 aria-expanded:bg-atlas-panel';

/**
 * For a Radix popover or dialog, which stays mounted while its exit
 * animation plays. src/index.css gives every element an `animation-name`
 * (its autofill hook), so Radix takes any closing surface for one that is
 * animating out and waits for an `animationend` that never comes: the
 * Layers popover stayed open after Escape. `animation: none` lets it close
 * at once.
 */
export const ATLAS_NO_EXIT_ANIMATION = 'animate-none';
