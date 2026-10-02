/**
 * Class recipes for the console's landing-page look (see
 * src/features/landing/landing.css for the colour policy: neutral white
 * steps, hairlines, colour only where it means something).
 */

/** Small-caps label: field labels, table heads, card and section eyebrows. */
export const CONSOLE_LABEL =
  'text-xs font-semibold uppercase tracking-[0.14em] text-white/45';

/** Pass to `<TableHeader className>` so column heads read as labels. */
export const CONSOLE_TABLE_HEAD =
  '[&_th]:h-10 [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-[0.14em] [&_th]:text-white/45';

/** A hairline panel — the console's card. Pass to `<Card className>` too. */
export const CONSOLE_PANEL =
  'rounded-xl border border-white/[0.08] bg-white/[0.02] shadow-none';

/** Pill tab / segmented option (landing step pills). */
export const consoleTabClass = (active: boolean, size: 'sm' | 'md' = 'md') =>
  [
    'inline-flex items-center gap-1.5 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
    size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
    active
      ? 'border-white/20 bg-white/10 text-white'
      : 'border-white/[0.08] text-white/50 hover:border-white/15 hover:text-white/80',
  ].join(' ');
