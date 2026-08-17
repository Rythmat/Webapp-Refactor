import type { PhaseKey } from '../phases';

/**
 * Per-phase accent (hex) for the Presentation surface. Single source of truth:
 * `SlidePresentBody` sets it as the inline `--slide-accent` on the `SlideFrame`
 * element (its glow + chip dot read `var(--slide-accent)`), and `Board` tints
 * its phase cards with it. The deck student/projector surfaces never consume
 * this map, so they keep their default teal — this stays scoped to Presentation
 * Mode by construction.
 *
 * Tones mirror `SlideStrip.PHASE_ACCENT` (which uses Tailwind class strings, not
 * reusable as CSS values): connect→sky, practice→teal, create→violet,
 * share→amber, reflect→emerald.
 */
export const PHASE_ACCENT_HEX: Record<PhaseKey, string> = {
  connectRegulate: '#38bdf8', // sky-400
  groupPractice: '#7ecfcf', // teal (the deck accent)
  creativeProjects: '#a78bfa', // violet-400
  presentPerform: '#fbbf24', // amber-400
  respondReflectReset: '#34d399', // emerald-400
};
