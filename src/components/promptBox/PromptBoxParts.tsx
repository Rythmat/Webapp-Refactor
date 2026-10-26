import { AnimatePresence, motion, type MotionProps } from 'framer-motion';
import { ArrowUp, Dices } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/components/utilities';
import { KEY_RAINBOW_COLORS } from '@/features/landing/rainbow';

// ── The prompt box's look, shared by Home and the Studio (owner, 2026-10-23)
//
// Home's prompt bar (HomePromptBar) and the Studio's (daw/shell/prompt/
// PromptBar) are one design: a 20 px card with a hairline edge, a
// suggestion written in with the 12 key-center colors and settling to dim
// white beside a Tab key, a round dice button, and a Go pill that a rainbow
// comet runs around once after Tab takes a suggestion.

/** How long each suggestion stays before the next is written in. */
export const ROTATE_MS = 4500;

/**
 * The landing lead's rainbow sweep (Statement.tsx), retuned for a placeholder:
 * a three-width strip of settled dim white | the 12 key-center colors |
 * transparent. Sliding it right-to-left writes each suggestion in with the
 * rainbow and leaves it at placeholder white.
 */
export const RAINBOW_STOPS = KEY_RAINBOW_COLORS.map(
  (c, i) => `${c} ${37 + (i / (KEY_RAINBOW_COLORS.length - 1)) * 26}%`,
).join(', ');
export const SETTLED = 'rgba(255, 255, 255, 0.42)';
const SUGGESTION_SWEEP = `linear-gradient(90deg, ${SETTLED} 0%, ${SETTLED} 33.4%, ${RAINBOW_STOPS}, rgba(255, 255, 255, 0) 66.6%, rgba(255, 255, 255, 0) 100%)`;

/** Cuts a filled box down to a 1px ring (its padding), for the rainbow border. */
const RING_MASK =
  'linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)';

/**
 * The Go button's sweep: a comet of the 12 key-center colors, its tail fading
 * in over the trailing 150° and its head at `--sweep`. Turning `--sweep` once
 * around runs the rainbow around the button's outline.
 */
const COMET_STOPS = KEY_RAINBOW_COLORS.map(
  (c, i) => `${c} ${210 + (i / (KEY_RAINBOW_COLORS.length - 1)) * 150}deg`,
).join(', ');
const COMET = `conic-gradient(from var(--sweep), transparent 0deg, transparent 210deg, ${COMET_STOPS})`;

/** Once around in about the time the suggestion text takes to sweep in. */
const COMET_RUN = {
  initial: { '--sweep': '0deg', opacity: 0 },
  animate: { '--sweep': '360deg', opacity: [0, 1, 1, 0] },
  transition: {
    '--sweep': { duration: 0.9, ease: [0.45, 0, 0.25, 1] },
    opacity: { duration: 0.9, times: [0, 0.12, 0.8, 1] },
  },
  // framer's types don't list CSS variables; it animates them all the same.
} as unknown as MotionProps;

/** The card: 20 px corners, a hairline edge, a soft shadow. */
export const PROMPT_FRAME = cn(
  'relative w-full rounded-[1.25rem] border border-white/10',
  'shadow-[0_8px_28px_rgba(0,0,0,0.36)] transition-colors',
  'focus-within:border-white/20',
);

/** Home's wash on the page; the Studio's card is opaque over the lanes. */
export const PROMPT_WASH = 'bg-white/[0.04] focus-within:bg-white/[0.06]';

/**
 * The card's look without its size or place: corners, edge, shadow and wash.
 * For panels that bring their own layout (a lesson's cards).
 */
export const PROMPT_SURFACE = cn(
  'rounded-[1.25rem] border border-white/10 bg-white/[0.04]',
  'shadow-[0_8px_28px_rgba(0,0,0,0.36)]',
);
export const PROMPT_OPAQUE = 'bg-[#141416]';

/**
 * A pill under the input: Home's destinations (Studio, Learn…), the Learn
 * page's kinds and filters. Chosen, it lights up.
 */
export const PROMPT_PILL = cn(
  'flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[0.8125rem] transition-colors',
  'outline-none focus-visible:ring-2 focus-visible:ring-white/40',
);
export const PROMPT_PILL_ON = 'border-white/20 bg-white/15 text-white';
export const PROMPT_PILL_OFF =
  'border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.07] hover:text-white/85';

/** The input: one line that grows, the suggestion drawn over it while empty. */
export const PROMPT_TEXTAREA = cn(
  'block max-h-40 min-h-[1.75rem] w-full resize-none bg-transparent text-base leading-7 text-white',
  'outline-none placeholder:text-transparent',
);

/**
 * The suggestion over the empty input, written in with the rainbow, and the
 * Tab key that takes it. `text`'s change is what writes the next one in.
 */
export function RotatingSuggestion({
  text,
  reduce,
}: {
  text: string;
  reduce: boolean;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-5 top-4 flex h-7 items-center gap-3"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={text}
          className="block min-w-0 truncate text-base leading-7 bg-clip-text text-transparent [-webkit-background-clip:text]"
          style={
            reduce
              ? { color: SETTLED }
              : {
                  backgroundImage: SUGGESTION_SWEEP,
                  backgroundSize: '300% 100%',
                }
          }
          initial={reduce ? { opacity: 0 } : { backgroundPosition: '100% 0%' }}
          animate={reduce ? { opacity: 1 } : { backgroundPosition: '0% 0%' }}
          exit={{ opacity: 0, transition: { duration: 0.18 } }}
          transition={{
            duration: reduce ? 0.2 : 1.1,
            ease: [0.45, 0, 0.25, 1],
          }}
        >
          {text}
        </motion.span>
      </AnimatePresence>
      <kbd className="hidden h-6 shrink-0 items-center rounded border border-white/10 bg-white/[0.06] px-1.5 font-[inherit] text-xs text-white/50 sm:inline-flex">
        Tab
      </kbd>
    </div>
  );
}

/** The round dice button: another suggestion, into the input. */
export function DiceButton({
  onClick,
  label = 'Suggest a prompt',
}: {
  onClick(): void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 outline-none transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
    >
      <Dices className="size-[1.125rem]" />
    </button>
  );
}

/**
 * Go: a transparent pill with a hairline border, a faint white wash on
 * hover. After Tab takes a suggestion (`sweep` counts them; 0 stops one), a
 * rainbow comet runs once around its outline with a soft glow behind it,
 * then fades (skipped under reduced motion).
 */
/**
 * The Go button's hairline pill: 36px, no fill, a hairline edge, 15px text,
 * a faint wash on hover and press. Exported for the buttons that wear it
 * elsewhere (Home: New project, Collaborate, Go to Lessons).
 */
export const GO_PILL = cn(
  'relative isolate flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-4 text-[0.9375rem] font-medium leading-6 transition-colors duration-75',
  'outline-none focus-visible:outline-2 focus-visible:outline-white/50',
);
/** GO_PILL's text and washes while it can be pressed. */
export const GO_PILL_ENABLED =
  'text-[#FCFBF9] hover:bg-white/[0.04] active:bg-white/[0.08]';

export function GoButton({
  disabled,
  sweep,
  reduce,
  icon = <ArrowUp className="size-4" />,
  children,
  ...rest
}: {
  disabled: boolean;
  sweep: number;
  reduce: boolean;
  icon?: ReactNode;
  children: ReactNode;
  'data-testid'?: string;
  'aria-label'?: string;
}) {
  const sweeping = sweep > 0 && !disabled && !reduce;
  return (
    <button
      type="submit"
      disabled={disabled}
      {...rest}
      className={cn(
        GO_PILL,
        disabled ? 'cursor-not-allowed text-white/40' : GO_PILL_ENABLED,
      )}
    >
      {sweeping && (
        <>
          <motion.span
            key={`ring-${sweep}`}
            aria-hidden
            className="pointer-events-none absolute -inset-px rounded-full p-px"
            style={{ backgroundImage: COMET, mask: RING_MASK }}
            {...COMET_RUN}
          />
          <motion.span
            key={`glow-${sweep}`}
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 rounded-full blur-md"
            style={{ backgroundImage: COMET }}
            {...COMET_RUN}
          />
        </>
      )}
      {icon}
      {children}
    </button>
  );
}

/** A button in the box's cards: the white pill for the step to take, a
 *  hairline pill for another, plain text for the quiet one. */
export function PromptPillButton({
  variant = 'outline',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost';
}) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'flex h-8 shrink-0 items-center rounded-full px-3.5 text-[0.8125rem] font-medium outline-none transition-colors duration-75 focus-visible:ring-2 focus-visible:ring-white/40',
        variant === 'primary' &&
          'bg-white text-[#101012] hover:bg-[#E6E6E8] active:bg-[#D1D1D3]',
        variant === 'outline' &&
          'border border-white/10 text-white/85 hover:bg-white/[0.06] hover:text-white',
        variant === 'ghost' && 'text-white/60 hover:text-white',
        className,
      )}
    />
  );
}

/**
 * The frosted pill in a page's top corners: Home's search, Learn's
 * instrument switcher and Set Lists, a lesson's About and settings. Add the
 * padding (px-4) or a width.
 */
export const GLASS_PILL = cn(
  'flex h-10 items-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-md transition-colors duration-150 hover:bg-white/[0.14]',
  'outline-none focus-visible:ring-2 focus-visible:ring-white/40',
);

/** The card above the box (what it's doing, what it did): the box's frame. */
export const PROMPT_CARD = cn(
  'flex items-center gap-3 rounded-[1.25rem] border border-white/10 px-4 py-3',
  'shadow-[0_8px_28px_rgba(0,0,0,0.36)]',
);
