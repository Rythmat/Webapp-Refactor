import { ArrowRight, Check } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  GO_PILL,
  GO_PILL_ENABLED,
  PROMPT_FRAME,
  PROMPT_WASH,
} from '@/components/promptBox/PromptBoxParts';
import { LearnRoutes } from '@/constants/routes';
import { SpotlightCard } from '@/features/landing/motion/SpotlightCard';
import { KEY_RAINBOW_COLORS } from '@/features/landing/rainbow';
import {
  isGuitarLearnEnabled,
  useInstrumentStore,
  useLearnInstrument,
  type LearnInstrument,
} from '@/features/learn/useInstrumentStore';
import { cn } from '@/lib/utils';
import './homeInstruments.css';

/** Learn's Theory tab, where both piano and guitar lessons start. */
const THEORY_TAB_ROUTE = LearnRoutes.root(undefined, { tab: 'Theory' });

/**
 * The Go to Lessons sweep's strip (homeInstruments.css): white | the 12
 * key-center colors | white, the rainbow kept inside the middle third so the
 * first and last frames are white.
 */
const LESSONS_SWEEP = `linear-gradient(90deg, #fff 0%, #fff 33.4%, ${KEY_RAINBOW_COLORS.map(
  (c, i) => `${c} ${37 + (i / (KEY_RAINBOW_COLORS.length - 1)) * 26}%`,
).join(', ')}, #fff 66.6%, #fff 100%)`;

/** An instrument's icon from public/icons, painted in currentColor. */
const InstrumentIcon = ({
  src,
  className,
}: {
  src: string;
  className?: string;
}) => (
  <span
    aria-hidden
    className={cn('shrink-0 bg-current', className)}
    style={{
      maskImage: `url(${src})`,
      WebkitMaskImage: `url(${src})`,
      maskSize: 'contain',
      WebkitMaskSize: 'contain',
      maskRepeat: 'no-repeat',
      WebkitMaskRepeat: 'no-repeat',
    }}
  />
);

interface InstrumentCell {
  label: string;
  /** Its icon in public/icons. */
  icon: string;
  /** The Learn instrument this cell selects; null until it has lessons. */
  instrument: LearnInstrument | null;
}

const INSTRUMENTS: InstrumentCell[] = [
  { label: 'Keyboard', icon: '/icons/keyboard-icon.svg', instrument: 'piano' },
  { label: 'Guitar', icon: '/icons/guitar-icon.svg', instrument: 'guitar' },
  { label: 'Bass', icon: '/icons/bass-icon.svg', instrument: null },
  { label: 'Ukulele', icon: '/icons/ukulele-icon.svg', instrument: null },
  { label: 'Drums', icon: '/icons/drum-icon.svg', instrument: null },
];

/**
 * Home's instrument picker, above the Songs row: a hairline bento of the
 * instruments, in the landing page's style (ModuleBentoRow: flat cells with
 * the pointer-tracking spotlight). The choice is stored on this device
 * (useInstrumentStore, the same store as Learn's instrument picker) and sets
 * which instrument Learn's lessons and the Songs chord charts show.
 * Instruments without lessons yet (and guitar while its rollout flag is off)
 * are tagged "Coming soon" and can't be chosen. Native radios, so arrow keys
 * move the choice. The chosen cell's name gives way to Go to Lessons (Learn
 * → Theory on that instrument), a rainbow sweeping across its text.
 */
export const HomeInstrumentsRow = () => {
  const selected = useLearnInstrument();
  const setInstrument = useInstrumentStore((s) => s.setInstrument);
  const guitarEnabled = isGuitarLearnEnabled();

  return (
    <section
      aria-labelledby="home-instruments-heading"
      className="flex flex-col gap-2"
    >
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="size-6 shrink-0 bg-white"
            style={{
              maskImage: 'url(/icons/learn-icon.svg)',
              WebkitMaskImage: 'url(/icons/learn-icon.svg)',
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
            }}
          />
          <h2
            id="home-instruments-heading"
            className="min-w-0 text-base leading-6 text-white"
          >
            Instruments
          </h2>
        </div>
      </div>

      {/* Stacks to two columns when the content area is under 42rem
          (container query, so the sidebar's width counts); the odd last
          cell then spans the row, as on the landing page. The card is the
          prompt box's (hairline edge, 20px corners, soft shadow, light
          wash), as the Studio and Projects cards above. */}
      <div className="@container">
        <div
          role="radiogroup"
          aria-labelledby="home-instruments-heading"
          className={cn(
            PROMPT_FRAME,
            PROMPT_WASH,
            'spotlight-scope grid grid-cols-2 overflow-hidden @2xl:grid-cols-5',
          )}
        >
          {INSTRUMENTS.map(({ label, icon, instrument }, i) => {
            const available =
              instrument === 'piano' ||
              (instrument === 'guitar' && guitarEnabled);
            const checked = available && instrument === selected;
            return (
              // The cell holds the radio's label and, once chosen, the
              // Go to Lessons link, a sibling: a label can't hold a link.
              <div
                key={label}
                className={cn(
                  'relative transition-colors duration-300',
                  // The hairlines between cells: each cell's right and
                  // bottom edge, in the card's border color; the card clips
                  // the ones along its own edge, where its border is.
                  'shadow-[1px_0_0_rgba(255,255,255,0.1),0_1px_0_rgba(255,255,255,0.1)]',
                  // The chosen cell's lift is on the cell: spotlight-flat
                  // keeps the card itself transparent.
                  checked && 'bg-white/[0.04]',
                  i === INSTRUMENTS.length - 1 && 'col-span-2 @2xl:col-span-1',
                )}
              >
                <label
                  className={cn(
                    'group block h-full has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-white/60',
                    available ? 'cursor-pointer' : 'cursor-default',
                  )}
                >
                  <input
                    type="radio"
                    name="home-instrument"
                    aria-label={label}
                    className="sr-only"
                    checked={checked}
                    disabled={!available}
                    onChange={() => instrument && setInstrument(instrument)}
                  />
                  {/* After Spitfire Audio's instrument tiles: the icon fills
                    the cell, its name under it. The chosen cell wears a
                    check, one without lessons a "Coming soon" tag. */}
                  <SpotlightCard className="spotlight-flat relative flex h-full flex-col items-center p-3 pb-4">
                    {checked && (
                      <span className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-white text-[#101012]">
                        <Check aria-hidden className="size-4" strokeWidth={3} />
                      </span>
                    )}
                    {!available && (
                      <span className="absolute left-3 top-3 z-10 rounded-full bg-[#26262A] px-2 py-0.5 text-[0.6875rem] text-white/70">
                        Coming soon
                      </span>
                    )}
                    <InstrumentIcon
                      src={icon}
                      className={cn(
                        'aspect-square w-full max-w-48 transition-transform duration-300',
                        available
                          ? 'text-white motion-safe:group-hover:-translate-y-1'
                          : 'text-white/30',
                      )}
                    />
                    {/* Chosen, the name keeps its room under the link. */}
                    <span
                      aria-hidden
                      className={cn(
                        'mt-1 text-lg',
                        checked && 'invisible',
                        available ? 'text-white' : 'text-white/40',
                      )}
                    >
                      {label}
                    </span>
                  </SpotlightCard>
                </label>
                {checked && (
                  <Link
                    to={THEORY_TAB_ROUTE}
                    // The prompt box's Go pill, the text still swept.
                    className={cn(
                      GO_PILL,
                      GO_PILL_ENABLED,
                      'home-lessons-button absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap',
                    )}
                  >
                    <span
                      className="home-lessons-sweep"
                      style={{ '--sweep': LESSONS_SWEEP } as CSSProperties}
                    >
                      Go to Lessons
                    </span>
                    <ArrowRight aria-hidden className="size-4" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
