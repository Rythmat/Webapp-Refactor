import { useReducedMotion } from 'framer-motion';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { SpectrumRim } from '@/components/art/light/SpectrumLight';
import {
  GoButton,
  PROMPT_FRAME,
  PROMPT_WASH,
} from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';
import { useInView } from '@/features/landing/motion/useInView';
import { MicroLabel } from './MicroLabel';
import { RainbowWriteIn } from './RainbowWriteIn';

export interface HeroArtProps {
  /** The cover, drifting (an ArtCover at hero density, motion "drift"). */
  art: ReactNode;
  eyebrow?: ReactNode;
  title: string;
  blurb?: ReactNode;
  cta: {
    /** Its words are its name too: "Play Jam Room". */
    label: string;
    icon?: ReactNode;
    onClick: () => void;
  };
  /** The section's name: "Featured: Jam Room". */
  ariaLabel: string;
  /**
   * The page's glow colours (HomeGlow's pair): the card's lines and the
   * light along its foot wear them, easing as the glow eases.
   */
  glow?: readonly [string, string];
  className?: string;
}

/** The glow's colours as the card's own, easing as HomeGlow's do. */
export const GLOW_VARS = ['var(--home-glow-a)', 'var(--home-glow-b)'] as const;

/**
 * A page's spotlight, a card on the canvas: its cover drifting inside and
 * fading toward the words, the spectrum leaking from under its bottom edge
 * (Googlebook's lit card), the title written in with the rainbow, and one
 * white pill that a comet runs round when the hero comes into view or the
 * pill takes keyboard focus (the prompt bar's Go after Tab). A click
 * anywhere on the card is the pill's; the pill is its one tab stop.
 */
export function HeroArt({
  art,
  eyebrow,
  title,
  blurb,
  cta,
  ariaLabel,
  glow,
  className,
}: HeroArtProps) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion() ?? false;
  const inView = useInView(ref, { threshold: 0.4 });
  const [runs, setRuns] = useState(0);
  const seen = useRef(false);
  useEffect(() => {
    if (inView && !seen.current) {
      seen.current = true;
      setRuns((n) => n + 1);
    }
  }, [inView]);

  return (
    <section
      ref={ref}
      aria-label={ariaLabel}
      data-hero-art
      onClick={cta.onClick}
      // The prompt box's card (PROMPT_FRAME + PROMPT_WASH): its corners,
      // hairline edge, shadow and wash, so the spotlight reads as one with
      // the bar above it.
      className={cn(
        PROMPT_FRAME,
        PROMPT_WASH,
        'art-host isolate flex min-h-[24rem] cursor-pointer items-end overflow-hidden md:min-h-[27rem]',
        className,
      )}
      style={
        glow
          ? ({
              '--home-glow-a': glow[0],
              '--home-glow-b': glow[1],
              transition:
                '--home-glow-a 5s ease-in-out, --home-glow-b 5s ease-in-out',
            } as CSSProperties)
          : undefined
      }
    >
      <div className="absolute inset-0 -z-20">{art}</div>
      {/* The words sit on the card's wash: the art fades out toward them
          (its own mask; give it fade={270} for words on the left). */}
      <SpectrumRim
        state="on"
        edge="bottom"
        colors={glow ? GLOW_VARS : undefined}
      />
      <div className="flex max-w-[40rem] flex-col gap-4 p-8 md:p-12">
        {eyebrow && <MicroLabel>{eyebrow}</MicroLabel>}
        <h2 className="text-balance text-[clamp(2.5rem,5.2vw,4.25rem)] font-normal leading-[0.98] -tracking-wide text-daw-text">
          <RainbowWriteIn text={title} />
        </h2>
        {blurb && (
          <p className="max-w-[44ch] text-[0.9375rem] leading-relaxed text-daw-text-3 md:text-base">
            {blurb}
          </p>
        )}
        {/* The prompt box's Go pill (Home's and the Studio's), its comet
            run once round when the hero comes into view or takes keyboard
            focus, as Go's does after Tab. */}
        <GoButton
          type="button"
          disabled={false}
          sweep={runs}
          reduce={reduce}
          icon={cta.icon}
          className="mt-2 self-start"
          onClick={(event) => {
            // The card hears the click too; the pill's is the one.
            event.stopPropagation();
            cta.onClick();
          }}
          onFocus={(event) => {
            // Keyboard focus only (an older engine may not know the
            // selector: then no comet).
            let keyboard = false;
            try {
              keyboard = event.currentTarget.matches(':focus-visible');
            } catch {
              keyboard = false;
            }
            if (keyboard) setRuns((n) => n + 1);
          }}
        >
          {cta.label}
        </GoButton>
      </div>
    </section>
  );
}
