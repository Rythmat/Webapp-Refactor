import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LearnRoutes } from '@/constants/routes';
import {
  isGuitarLearnEnabled,
  useInstrumentStore,
  useLearnInstrument,
  type LearnInstrument,
} from '@/features/learn/useInstrumentStore';
import { cn } from '@/lib/utils';

/** Learn's Theory tab, where both piano and guitar lessons start. */
const THEORY_TAB_ROUTE = LearnRoutes.root(undefined, { tab: 'Theory' });

interface InstrumentRow {
  label: string;
  /** The Learn instrument this row selects; null until it has lessons. */
  instrument: LearnInstrument | null;
}

const INSTRUMENTS: InstrumentRow[] = [
  { label: 'Keyboard', instrument: 'piano' },
  { label: 'Guitar', instrument: 'guitar' },
  { label: 'Bass', instrument: null },
  { label: 'Ukulele', instrument: null },
  { label: 'Drums', instrument: null },
];

/**
 * Home's right column: the student's instrument. The choice is stored on this
 * device (useInstrumentStore, the same store as Learn's instrument picker) and
 * sets which instrument Learn's lessons and the Songs chord charts show.
 * Instruments without lessons yet (and guitar while its rollout flag is off)
 * are listed as "Coming soon" and can't be chosen. Native radios, so arrow
 * keys move the choice. "Go to lessons" opens Learn → Theory on that
 * instrument.
 */
export const InstrumentLessonsCard = () => {
  const selected = useLearnInstrument();
  const setInstrument = useInstrumentStore((s) => s.setInstrument);
  const guitarEnabled = isGuitarLearnEnabled();

  return (
    <section
      aria-labelledby="home-instruments-heading"
      className="flex min-h-[466px] flex-col gap-5 rounded-2xl bg-white/[0.04] p-5"
    >
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
        <div className="min-w-0">
          <h2
            id="home-instruments-heading"
            className="text-base font-bold leading-6 text-white"
          >
            Instruments
          </h2>
        </div>
      </div>

      <div
        role="radiogroup"
        aria-labelledby="home-instruments-heading"
        className="flex flex-1 flex-col gap-1"
      >
        {INSTRUMENTS.map(({ label, instrument }) => {
          const available =
            instrument === 'piano' ||
            (instrument === 'guitar' && guitarEnabled);
          const checked = available && instrument === selected;
          return (
            <label
              key={label}
              className={cn(
                'group flex flex-1 items-center gap-3 rounded-xl px-4 text-base transition-colors duration-150',
                'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-white/50',
                available
                  ? 'cursor-pointer text-white hover:bg-white/[0.06]'
                  : 'text-white/40',
                checked && 'bg-white/[0.06]',
              )}
            >
              <input
                type="radio"
                name="home-instrument"
                className="sr-only"
                checked={checked}
                disabled={!available}
                onChange={() => instrument && setInstrument(instrument)}
              />
              {/* The selection dot: a ring, filled with a centre dot when chosen. */}
              <span
                aria-hidden
                className={cn(
                  'flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-150',
                  checked
                    ? 'border-white'
                    : available
                      ? 'border-white/40 group-hover:border-white/70'
                      : 'border-white/15',
                )}
              >
                <span
                  className={cn(
                    'size-2 rounded-full bg-white transition-transform duration-150 ease-out',
                    checked ? 'scale-100' : 'scale-0',
                  )}
                />
              </span>
              <span className="font-bold">{label}</span>
              {!available && (
                <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/60">
                  Coming soon
                </span>
              )}
            </label>
          );
        })}
      </div>

      {/* Suno's column button ("See more" on Discover): a transparent pill
          with a hairline border and a faint white wash on hover. */}
      <Link
        to={THEORY_TAB_ROUTE}
        className="group mt-1 flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-white/10 px-4 py-2 text-[15px] font-medium leading-6 text-[#FCFBF9] outline-none transition-colors duration-75 hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-white/50"
      >
        Go to lessons
        <ArrowRight
          aria-hidden
          className="size-4 transition-transform duration-150 ease-out motion-safe:group-hover:translate-x-0.5"
        />
      </Link>
    </section>
  );
};
