/**
 * Shared Arcade chrome class strings — a single source of truth so the app's
 * dark-glass idiom (base #101012 + white-opacity surfaces + subtle borders) isn't
 * re-scattered across the ~13 game modules. Mirrors the rest of the app
 * (ClassroomDashboard / ActivityCard) rather than the Arcade's old zinc/dark-hex.
 *
 * These cover CHROME only — page/panel backgrounds, cards, headers. Gameplay
 * colors (feedback greens/reds, viz scales, cable codes) and the teal
 * `--color-accent` chrome accent are intentionally NOT tokenized here; they stay
 * as-is in each game.
 */

/** Page/game root — the app base, continuous with the dashboard wrapper. */
export const ARCADE_ROOT = 'bg-[#101012]';

/** Interactive glass card (hub tiles, level-select cards). */
export const ARCADE_CARD =
  'rounded-2xl border border-white/10 bg-white/[0.03] transition-colors hover:border-white/25 hover:bg-white/[0.05]';

/** Static nested glass panel. */
export const ARCADE_PANEL = 'rounded-xl border border-white/10 bg-white/[0.02]';

/** Section/toolbar header strip. */
export const ARCADE_HEADER = 'border-b border-white/10 bg-white/[0.02]';

/** Raised/interactive utility surface (e.g. a zinc button replacement). */
export const ARCADE_BUTTON =
  'bg-white/[0.05] hover:bg-white/[0.08] border border-white/10';
