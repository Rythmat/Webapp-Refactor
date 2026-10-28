import { cn } from '@/components/utilities';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';

/**
 * The white pill: the one primary action on a surface, as the Studio's
 * primary Button (src/daw/ui/Button: bold, its hover and press fills and
 * the 0.97 press, the Studio's focus ring). 36px; a hero's one call is
 * WHITE_PILL_LG.
 */
export const WHITE_PILL = `inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-daw-primary px-4 text-[0.8125rem] font-bold text-daw-on-primary hover:bg-daw-primary-hover active:scale-[0.97] active:bg-daw-primary-active motion-reduce:active:scale-100 [&_svg]:size-4 ${TRANSITION} ${FOCUS_RING}`;

/** A hero's single call: the same pill, 44px. */
export const WHITE_PILL_LG = cn(
  WHITE_PILL,
  'h-11 gap-2 px-6 text-[0.9375rem] [&_svg]:size-[1.125rem]',
);

/** The Studio's secondary Button: a hairline pill, a fill on hover. */
export const OUTLINE_PILL = `inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-daw-outline px-4 text-[0.8125rem] font-bold text-daw-text hover:bg-daw-hover active:scale-[0.97] motion-reduce:active:scale-100 [&_svg]:size-4 ${TRANSITION} ${FOCUS_RING}`;
