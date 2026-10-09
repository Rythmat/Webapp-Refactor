/**
 * Landing-look recipes for the auth pages (MagneticButton can't stretch to
 * full width, which the auth column needs).
 */

/** Full-width ghost pill: the landing's secondary action. */
export const AUTH_GHOST_BUTTON =
  'inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 text-[15px] text-white transition-colors hover:border-white/30 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:pointer-events-none disabled:opacity-50';

/** Inline text action (looks like a link, may be a button). */
export const AUTH_TEXT_LINK =
  'rounded-sm text-white underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:pointer-events-none disabled:opacity-50';
