import { ArrowRight, Check } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
} from 'react';
import { Link } from 'react-router-dom';
import {
  GO_PILL,
  GO_PILL_ENABLED,
} from '@/components/promptBox/PromptBoxParts';
import { KEY_RAINBOW_COLORS } from '@/features/landing/rainbow';
import {
  isLearnInstrumentEnabled,
  learnPageRoute,
  useInstrumentStore,
  useLearnInstrument,
  type LearnInstrument,
} from '@/features/learn/useInstrumentStore';
import { cn } from '@/lib/utils';
import './homeInstruments.css';

/** How long the sweep takes (homeInstruments.css). */
const SWEEP_MS = 1100;

/**
 * The Go to (instrument) sweep's strip (homeInstruments.css): white | the 12
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
  { label: 'Bass', icon: '/icons/bass-icon.svg', instrument: 'bass' },
  {
    label: 'Ukulele',
    icon: '/icons/ukulele-icon.svg',
    instrument: 'ukulele',
  },
  { label: 'Drums', icon: '/icons/drum-icon.svg', instrument: null },
];

/**
 * Home's instrument picker, above the Songs row: the instruments in a row,
 * each a tile of its own — no card around them, no hairlines between them
 * (owner, 2026-10-24: the bento box went). The choice is stored on this device
 * (useInstrumentStore, the same store as Learn's instrument picker) and sets
 * which instrument Learn's lessons and the Songs chord charts show.
 * Every instrument looks and chooses the same (owner, 2026-10-24); one
 * without lessons yet (and guitar while it's switched off) says "Coming
 * soon" where Go to would be, and choosing it leaves Learn's instrument as
 * it was, the pick kept on this row only. Native radios, so arrow keys move
 * the choice. The chosen cell's name gives way to a "Keyboard →",
 * "Guitar →"… button (owner, 2026-10-25; it said Go to Keyboard) (its Learn
 * page, /learn/keyboard or /learn/guitar), a rainbow sweeping across its text.
 */
export const HomeInstrumentsRow = () => {
  const selected = useLearnInstrument();
  const setInstrument = useInstrumentStore((s) => s.setInstrument);
  // An instrument without lessons, picked here: shown as chosen, Learn's own
  // instrument untouched.
  const [soonPick, setSoonPick] = useState<string | null>(null);
  // Go to (instrument)'s rainbow: it plays when the button appears (an
  // instrument chosen), and each time the pointer comes onto it. Not while
  // that first sweep is still playing: a button that appears under a
  // resting pointer would start it over at once.
  const [sweeps, setSweeps] = useState(0);
  const shownAt = useRef(0);
  useEffect(() => {
    shownAt.current = performance.now();
  }, [selected, soonPick]);
  const sweepAgain = () => {
    if (performance.now() - shownAt.current < SWEEP_MS) return;
    setSweeps((n) => n + 1);
  };

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
            Learn
          </h2>
        </div>
      </div>

      {/* Stacks to two columns when the content area is under 42rem
          (container query, so the sidebar's width counts); the odd last
          tile then spans the row. */}
      <div className="@container">
        <div
          role="radiogroup"
          aria-labelledby="home-instruments-heading"
          className="grid grid-cols-2 gap-2 @2xl:grid-cols-5"
        >
          {INSTRUMENTS.map(({ label, icon, instrument }, i) => {
            const available =
              instrument !== null && isLearnInstrumentEnabled(instrument);
            const checked =
              soonPick !== null
                ? label === soonPick
                : available && instrument === selected;
            return (
              // The cell holds the radio's label and, once chosen, the
              // Go to link, a sibling: a label can't hold a link.
              <div
                key={label}
                className={cn(
                  // No fill behind a tile (owner, 2026-10-24): the check
                  // and Go to (instrument) say which is chosen.
                  'relative rounded-[1.25rem]',
                  i === INSTRUMENTS.length - 1 && 'col-span-2 @2xl:col-span-1',
                )}
              >
                <label
                  className={cn(
                    'group block h-full cursor-pointer rounded-[1.25rem] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-white/60',
                  )}
                >
                  <input
                    type="radio"
                    name="home-instrument"
                    aria-label={label}
                    className="sr-only"
                    checked={checked}
                    onChange={() => {
                      if (available && instrument) {
                        setSoonPick(null);
                        setInstrument(instrument);
                      } else {
                        setSoonPick(label);
                      }
                    }}
                  />
                  {/* After Spitfire Audio's instrument tiles: the icon fills
                    the cell, its name under it. The chosen cell wears a
                    check. */}
                  <div className="relative flex h-full flex-col items-center p-3 pb-4">
                    {checked && (
                      <span className="absolute right-3 top-3 z-10 flex size-6 items-center justify-center rounded-full bg-white text-[#101012]">
                        <Check aria-hidden className="size-4" strokeWidth={3} />
                      </span>
                    )}
                    <InstrumentIcon
                      src={icon}
                      className="aspect-square w-full max-w-48 text-white transition-transform duration-300 motion-safe:group-hover:-translate-y-1"
                    />
                    {/* Chosen, the name keeps its room under the link. */}
                    <span
                      aria-hidden
                      className={cn(
                        'mt-1 text-lg text-white',
                        checked && 'invisible',
                      )}
                    >
                      {label}
                    </span>
                  </div>
                </label>
                {checked && !available && (
                  // Where Go to would be: no lessons for it yet.
                  <span
                    data-testid="home-instrument-soon"
                    className={cn(
                      GO_PILL,
                      'absolute bottom-3 left-1/2 h-8 -translate-x-1/2 cursor-default whitespace-nowrap px-3 text-[0.8125rem] text-white/70',
                    )}
                  >
                    Coming soon
                  </span>
                )}
                {checked && available && (
                  <Link
                    // That instrument's Learn page: /learn/keyboard,
                    // /learn/guitar (owner, 2026-10-24).
                    to={learnPageRoute(instrument)}
                    // The prompt box's Go pill, the text still swept.
                    className={cn(
                      GO_PILL,
                      GO_PILL_ENABLED,
                      // The name's own size (text-lg), so it doesn't shrink as the
                      // button takes its place (owner, 2026-10-25).
                      'home-lessons-button absolute bottom-3 left-1/2 h-9 -translate-x-1/2 gap-1 whitespace-nowrap px-3 text-lg',
                    )}
                    onPointerEnter={sweepAgain}
                    onFocus={(event: FocusEvent<HTMLAnchorElement>) => {
                      // Keyboard focus only: a click's focus follows the
                      // hover that already played it.
                      if (event.currentTarget.matches(':focus-visible'))
                        sweepAgain();
                    }}
                  >
                    <span
                      // A new key each time the pointer comes onto the
                      // button (or keyboard focus does): the sweep plays
                      // again then, and never as the pointer leaves.
                      key={sweeps}
                      className="home-lessons-sweep"
                      style={{ '--sweep': LESSONS_SWEEP } as CSSProperties}
                    >
                      {label}
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
