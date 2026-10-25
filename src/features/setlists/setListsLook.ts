// ── Set Lists in the Learn page's look (owner, 2026-10-25) ─────────────────
// Home's glow behind (HomeGlow), the prompt box's glass for cards and
// dialogs, Home's search pill's glass for the page's pills, the prompt box's
// Go pill for the main action, and white where Set Lists had its teal.

/** Home's search pill's glass, at its size: Set Lists' pills. */
export const GLASS_PILL =
  'flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 text-[0.9375rem] leading-6 text-white outline-none backdrop-blur-md transition-colors duration-150 hover:bg-white/[0.14] focus-visible:ring-2 focus-visible:ring-white/40';

/** A card or column: the prompt box's glass. */
export const GLASS_CARD =
  'rounded-[1.25rem] border border-white/10 bg-white/[0.04] shadow-[0_8px_28px_rgba(0,0,0,0.36)] backdrop-blur-md';

/** A dialog: the prompt box's glass, frosted hard so it reads over the page
 *  (as Home's search results are). */
export const GLASS_DIALOG =
  'rounded-[1.25rem] border border-white/10 bg-[#161618]/80 text-white shadow-[0_8px_28px_rgba(0,0,0,0.36)] backdrop-blur-xl';

/** A field inside one: a hairline, rounded as the pills are. */
export const GLASS_FIELD =
  'w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25';
