import { Headphones, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { CurriculumRoutes } from '@/constants/routes';
import {
  chartColors,
  chartKeyColor,
  chartKeyName,
  chartLabels,
  chartLine,
  chartSymbols,
} from '@/curriculum/engine/musicLiteracy/chart';
import { formatAccidentalsForDisplay } from '@/curriculum/utils/formatAccidentals';
import {
  literacyBands,
  openBandPracticeTrack,
  type LiteracyBandOption,
} from '@/features/practiceTracks/genre/bandPracticeTrack';
import { inkOn } from './KeyRing';
import {
  bandCharts,
  openingBandProgression,
  PART_2_LESSON_ID,
  readBandPicks,
  readBandProgressions,
  writeBandPicks,
  type BandPicks,
  type BandProgression,
} from './bandProgressions';
import { BAND_STOP_ID, startHereRoute } from './literacyPath';
import { markStopDone } from './stopDone';

// ── Part 3 · Hear It with Your Band ────────────────────────────────────────
// /curriculum/music-literacy/hear-it-with-your-band, free like the rest of
// the series. Three choices, top to bottom, then one button:
//
//   Your Progression   every progression saved in Part 2 (bandProgressions.ts),
//                      triads and 7ths apart, each as its chords in the key's
//                      colors and the key's name; the starter, C major's
//                      1 6 4 5, while nothing is saved
//   Choose a Band      the live back-office Bands with a style in 4/4
//   Choose a Style     that band's 4/4 styles, each at its tempo
//
// Hear It in the Studio builds the band's track over the chart and opens it
// on the Studio's Practice view (bandPracticeTrack.ts), and marks the path's
// stop done (stopDone.ts). The picks are remembered on this device. Titles
// in Title Case, the rest in sentences; chords by the app's hybrid names,
// never Roman numerals.

/** A progression's chords, as Part 2's chooser shows them: chips in key colors. */
function ChordChips({
  progression,
  size = 'md',
}: {
  progression: BandProgression['progression'];
  size?: 'md' | 'sm';
}) {
  const labels = chartLabels(progression);
  const symbols = chartSymbols(progression);
  const colors = chartColors(progression);
  return (
    <ol
      aria-label={chartLine(progression, ', ')}
      className="flex min-w-0 flex-1 gap-1.5"
    >
      {labels.map((label, i) => (
        <li
          key={i}
          data-chord-chip={label}
          className={cn(
            'flex min-w-0 flex-1 flex-col items-center justify-center rounded-lg px-1',
            size === 'md' ? 'min-h-[56px] py-1.5' : 'min-h-[44px] py-1',
          )}
          style={{ backgroundColor: colors[i], color: inkOn(colors[i]) }}
        >
          <span
            className={cn(
              'w-full truncate text-center font-semibold',
              size === 'md' ? 'text-[17px] leading-6' : 'text-[15px] leading-5',
            )}
          >
            {label}
          </span>
          <span className="w-full truncate text-center text-xs leading-4 opacity-75">
            {formatAccidentalsForDisplay(symbols[i])}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** A section of the page: its heading in Title Case, and what it holds. */
function Section({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2
          id={id}
          className="text-[22px] font-normal leading-8 text-[#e8e8f0]"
        >
          {title}
        </h2>
        {note && <p className="text-[15px] leading-6 text-white/55">{note}</p>}
      </div>
      {children}
    </section>
  );
}

/** A choice card: a radio the whole card picks, lit in the key color. */
function ChoiceCard({
  name,
  value,
  checked,
  onPick,
  keyColor,
  testId,
  children,
  className,
}: {
  name: string;
  value: string;
  checked: boolean;
  onPick: (value: string) => void;
  keyColor: string;
  testId?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label
      data-choice={testId}
      data-checked={checked || undefined}
      className={cn(
        'relative flex cursor-pointer flex-col gap-2 rounded-xl border bg-white/[0.03] p-3 transition-colors focus-within:ring-2 focus-within:ring-white/60 hover:bg-white/[0.06]',
        checked ? 'border-transparent' : 'border-white/[0.08]',
        className,
      )}
      style={
        checked
          ? {
              boxShadow: `0 0 0 2px ${keyColor}`,
              backgroundColor: `${keyColor}1f`,
            }
          : undefined
      }
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onPick(value)}
        className="sr-only"
      />
      {children}
    </label>
  );
}

/** The progressions, the triads first, then the 7ths: each harmony a row. */
const GROUPS = [
  { harmony: 'triads', label: 'Triads' },
  { harmony: 'sevenths', label: 'With 7ths' },
] as const;

export function HearItWithYourBand() {
  const navigate = useNavigate();
  const [progressions] = useState(readBandProgressions);
  const [picks, setPicks] = useState<BandPicks>(() => {
    const remembered = readBandPicks();
    return {
      ...remembered,
      progression: openingBandProgression(progressions, remembered).name,
    };
  });
  const [bands, setBands] = useState<LiteracyBandOption[] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    let live = true;
    literacyBands()
      .then((list) => {
        if (live) setBands(list);
      })
      .catch(() => {
        if (live) {
          setBands([]);
          setFailed(
            'The bands couldn’t load. Check your connection, then try again.',
          );
        }
      });
    return () => {
      live = false;
    };
  }, []);

  const progression =
    progressions.find((p) => p.name === picks.progression) ?? progressions[0];
  const keyColor = chartKeyColor(progression.progression);
  const band =
    bands?.find((b) => b.band.id === picks.band) ?? bands?.[0] ?? null;
  const style =
    band?.styles.find((s) => s.variation === picks.variation) ??
    band?.styles[0] ??
    null;
  const starter = progressions.length === 1 && progressions[0].starter;

  const pick = (change: Partial<BandPicks>) =>
    setPicks((before) => {
      const next = { ...before, ...change };
      writeBandPicks(next);
      return next;
    });

  const groups = useMemo(
    () =>
      GROUPS.map((group) => ({
        ...group,
        items: progressions.filter(
          (p) => p.progression.harmony === group.harmony,
        ),
      })).filter((group) => group.items.length > 0),
    [progressions],
  );

  const hearIt = async () => {
    if (!band || !style || opening) return;
    setOpening(true);
    setFailed(null);
    writeBandPicks({
      progression: progression.name,
      band: band.band.id,
      variation: style.variation,
    });
    try {
      const url = await openBandPracticeTrack({
        band: band.band.id,
        variation: style.variation,
        chart: progression.progression,
        charts: bandCharts(progressions),
        bpm: style.bpm,
      });
      if (!url) {
        setFailed('That style couldn’t play just now. Choose another one.');
        return;
      }
      // Done once the Studio opens from here (the path's stop 3).
      markStopDone(BAND_STOP_ID);
      navigate(url);
    } catch {
      setFailed(
        'The band couldn’t get ready. Check your connection, then try again.',
      );
    } finally {
      setOpening(false);
    }
  };

  return (
    <div
      data-literacy-band-page
      className="mx-auto flex w-full max-w-[880px] flex-col gap-8 px-6 pb-12 pt-6 text-[#e8e8f0] max-[639px]:px-4"
    >
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.14em] text-white/45">
          <Link to={startHereRoute()} className="hover:text-[#e8e8f0]">
            Start Here
          </Link>
          <span aria-hidden> · </span>
          <span>Studio · Practice</span>
        </p>
        <h1 className="text-[32px] font-normal leading-10 text-[#e8e8f0] max-[639px]:text-[28px] max-[639px]:leading-9">
          Practice with a Band
        </h1>
        <p className="max-w-[640px] text-[17px] leading-6 text-white/55">
          Pick a progression, a band and a style. The band plays your chords in
          the Studio, and you play along.
        </p>
      </header>

      <Section
        id="band-progression"
        title="Your Progression"
        note={
          starter ? (
            <>
              Nothing is saved yet, so the band plays a starter in C major. Make
              your own in{' '}
              <Link
                to={CurriculumRoutes.musicLiteracyLesson({
                  id: PART_2_LESSON_ID,
                })}
                className="text-[#e8e8f0] underline decoration-white/30 underline-offset-4 hover:decoration-white/70"
              >
                Melodies and Chords
              </Link>
              .
            </>
          ) : undefined
        }
      >
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <div
              key={group.harmony}
              role="radiogroup"
              aria-label={group.label}
              className="flex flex-col gap-2"
            >
              {groups.length > 1 && (
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                  {group.label}
                </p>
              )}
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-2">
                {group.items.map((p) => (
                  <ChoiceCard
                    key={p.name}
                    name="band-progression"
                    value={p.name}
                    checked={p.name === progression.name}
                    onPick={(name) => pick({ progression: name })}
                    keyColor={chartKeyColor(p.progression)}
                    testId={`progression:${p.name}`}
                  >
                    <ChordChips progression={p.progression} />
                    <span className="text-sm text-white/55">
                      {chartKeyName(p.progression)}
                      {p.starter && ' · Starter'}
                    </span>
                  </ChoiceCard>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="band-band" title="Choose a Band">
        {bands === null ? (
          <p className="flex items-center gap-2 text-[15px] text-white/55">
            <Loader2 aria-hidden className="size-4 animate-spin" />
            Getting the bands ready…
          </p>
        ) : bands.length === 0 ? (
          <p className="text-[15px] text-white/55">
            {failed ?? 'No band is ready to play yet.'}
          </p>
        ) : (
          <div
            role="radiogroup"
            aria-label="Choose a Band"
            className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,200px),1fr))] gap-2"
          >
            {bands.map((b) => (
              <ChoiceCard
                key={b.band.id}
                name="band-band"
                value={b.band.id}
                checked={b.band.id === band?.band.id}
                onPick={(id) => pick({ band: id })}
                keyColor={keyColor}
                testId={`band:${b.band.id}`}
              >
                <span className="text-[17px] leading-6 text-[#e8e8f0]">
                  {b.band.name}
                </span>
                <span className="text-sm leading-5 text-white/55">
                  {b.instruments.join(' · ')}
                </span>
              </ChoiceCard>
            ))}
          </div>
        )}
      </Section>

      {band && (
        <Section
          id="band-style"
          title="Choose a Style"
          note={`How ${band.band.name} plays your chords. Each style has its own tempo.`}
        >
          <div
            role="radiogroup"
            aria-label="Choose a Style"
            className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,180px),1fr))] gap-2"
          >
            {band.styles.map((s) => (
              <ChoiceCard
                key={s.variation}
                name="band-style"
                value={s.variation}
                checked={s.variation === style?.variation}
                onPick={(variation) => pick({ band: band.band.id, variation })}
                keyColor={keyColor}
                testId={`style:${s.variation}`}
              >
                <span className="text-[17px] leading-6 text-[#e8e8f0]">
                  {s.name}
                </span>
                <span className="text-sm leading-5 text-white/55">
                  {s.bpm} BPM · 4/4
                </span>
              </ChoiceCard>
            ))}
          </div>
        </Section>
      )}

      <div className="flex flex-col gap-3 border-t border-white/[0.08] pt-6">
        {band && style && (
          <p className="text-[15px] leading-6 text-white/55" data-band-summary>
            {band.band.name} plays{' '}
            <span className="text-[#e8e8f0]">
              {chartLine(progression.progression)}
            </span>{' '}
            in {chartKeyName(progression.progression)}, {style.name} style, at{' '}
            {style.bpm} BPM.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-hear-it-in-studio
            disabled={!band || !style || opening}
            onClick={() => void hearIt()}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-medium text-[#101012] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {opening ? (
              <Loader2 aria-hidden className="size-4 animate-spin" />
            ) : (
              <Headphones aria-hidden className="size-4" />
            )}
            Hear It in the Studio
          </button>
          {failed && bands && bands.length > 0 && (
            <p role="alert" className="text-[15px] text-white/70">
              {failed}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
