import { Check, Headphones } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { cn } from '@/components/utilities';
import type {
  LiteracyMode,
  LiteracyTonic,
} from '@/content/musicLiteracy/schemas';
import { MIDI_ROOT_TO_KEY } from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import { circleOfFifths } from '@/curriculum/engine/musicLiteracy/choices';
import { pitchClassOf } from '@/curriculum/engine/musicLiteracy/pitch';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import { useElementSize } from '@/hooks/useElementSize';
import { KeyRing, ringPosition, type RingSlice } from './KeyRing';

// ── Part 2's choose steps: the key, then the mode ──────────────────────────
// "Choose your color": the circle of fifths, large, in the key colors; a
// tap picks the key center, plays its 1, 3 and 5, and names it the hybrid
// way ("E♭ Major"). Then major or minor, each shown with the color it wears:
// a minor key takes its relative major's color (C minor is E♭'s purple),
// the house rule, so the student sees the color move round the ring.

/** "C Major", "E♭ Minor". */
export const keyName = (tonic: LiteracyTonic, mode: LiteracyMode) =>
  `${displayAccidentals(tonic)} ${mode === 'minor' ? 'Minor' : 'Major'}`;

/** A minor key's relative major, whose color it wears ("E♭" for C). */
export const colorKeyOf = (tonic: LiteracyTonic) =>
  displayAccidentals(MIDI_ROOT_TO_KEY[(pitchClassOf(tonic) + 3) % 12]);

/** A panel of the choose steps: the picker, and what the choice means. */
export function ChoosePanel({
  kind,
  heading,
  direction,
  picker,
  aside,
  stacked,
}: {
  kind: string;
  heading: string;
  direction?: string;
  picker: ReactNode;
  aside: ReactNode;
  stacked: boolean;
}) {
  return (
    <section
      aria-label={heading}
      data-literacy-choose={kind}
      className={cn(
        'grid min-h-0 gap-6 rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 max-[639px]:p-4',
        stacked
          ? 'grid-cols-[minmax(0,1fr)] content-start'
          : 'flex-1 grid-cols-[minmax(0,6fr)_minmax(0,5fr)] grid-rows-[minmax(0,1fr)] items-center',
      )}
    >
      {picker}
      <div
        className={cn(
          'flex min-w-0 flex-col gap-4',
          !stacked && 'max-h-full min-h-0 overflow-y-auto',
        )}
      >
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[28px] font-normal leading-9 text-[#e8e8f0] max-[639px]:text-2xl">
            {heading}
          </h2>
          {direction && (
            <p className="text-[15px] leading-6 text-white/55">{direction}</p>
          )}
        </div>
        {aside}
      </div>
    </section>
  );
}

/** The room a picker has: as large as fits, never past `max`. */
function useRingSize(max: number, min = 200) {
  const ref = useRef<HTMLDivElement>(null);
  const box = useElementSize(ref);
  const fit = Math.min(box.width || max, box.height || max, max);
  return { ref, size: Math.max(min, Math.floor(fit)) };
}

export interface ChooseKeyPanelProps {
  heading: string;
  direction?: string;
  tonic: LiteracyTonic | null;
  /** The mode the colors are drawn in: the student's, else major. */
  mode: LiteracyMode;
  onChoose: (tonic: LiteracyTonic) => void;
  onHear: () => void;
  stacked: boolean;
}

export function ChooseKeyPanel({
  heading,
  direction,
  tonic,
  mode,
  onChoose,
  onHear,
  stacked,
}: ChooseKeyPanelProps) {
  const { ref, size } = useRingSize(stacked ? 340 : 520);
  const keys = circleOfFifths(mode);
  const chosen = keys.find((k) => k.tonic === tonic) ?? null;
  const slices: RingSlice[] = keys.map((key) => ({
    id: key.tonic,
    position: ringPosition(key.pitchClass),
    color: key.color,
    label: key.label,
    ariaLabel: keyName(key.tonic, mode),
    enabled: true,
    selected: key.tonic === tonic,
  }));

  return (
    <ChoosePanel
      kind="key"
      heading={heading}
      direction={direction}
      stacked={stacked}
      picker={
        <div
          ref={ref}
          className={cn(
            'flex min-h-0 items-center justify-center',
            stacked ? 'h-[340px] max-[639px]:h-[300px]' : 'h-full',
          )}
        >
          <KeyRing
            slices={slices}
            size={size}
            role="radio"
            ariaLabel="Choose your key"
            onPick={(slice) => onChoose(slice.id as LiteracyTonic)}
            center={
              chosen ? (
                <>
                  <span className="text-[11px] uppercase tracking-[0.14em] text-white/55">
                    Your 1
                  </span>
                  <span
                    data-literacy-chosen-key
                    className="font-semibold leading-none"
                    style={{ color: chosen.color, fontSize: size * 0.12 }}
                  >
                    {chosen.label}
                  </span>
                </>
              ) : (
                <span className="px-6 text-sm leading-5 text-white/55">
                  Tap a color
                </span>
              )
            }
          />
        </div>
      }
      aside={
        chosen && tonic ? (
          <div
            data-literacy-key-card
            className="flex flex-col gap-4 rounded-xl border border-white/[0.08] bg-[#151518] p-5"
          >
            <div className="flex items-center gap-4">
              <span
                aria-hidden
                className="size-12 shrink-0 rounded-full"
                style={{ backgroundColor: chosen.color }}
              />
              <div className="flex min-w-0 flex-col">
                <span className="text-2xl leading-8 text-[#e8e8f0]">
                  {keyName(tonic, mode)}
                </span>
                <span className="text-sm text-white/55">
                  {mode === 'minor'
                    ? `Your 1 is ${chosen.label}, in ${colorKeyOf(tonic)}’s color.`
                    : `Your 1 is ${chosen.label}.`}
                </span>
              </div>
            </div>
            <div>
              <button
                type="button"
                onClick={onHear}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 text-sm text-[#e8e8f0] transition-colors hover:bg-white/[0.08]"
              >
                <Headphones className="size-4" />
                Hear it
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-white/45">
            Every color is a key. Pick the one you like.
          </p>
        )
      }
    />
  );
}

export interface ChooseModePanelProps {
  heading: string;
  direction?: string;
  tonic: LiteracyTonic;
  mode: LiteracyMode | null;
  onChoose: (mode: LiteracyMode) => void;
  stacked: boolean;
}

const MODES: readonly LiteracyMode[] = ['major', 'minor'];

export function ChooseModePanel({
  heading,
  direction,
  tonic,
  mode,
  onChoose,
  stacked,
}: ChooseModePanelProps) {
  const { ref, size } = useRingSize(stacked ? 200 : 300, 150);
  const pc = pitchClassOf(tonic);
  return (
    <section
      aria-label={heading}
      data-literacy-choose="mode"
      className="flex min-h-0 flex-1 flex-col gap-5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 max-[639px]:p-4"
    >
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[28px] font-normal leading-9 text-[#e8e8f0] max-[639px]:text-2xl">
          {heading}
        </h2>
        {direction && (
          <p className="text-[15px] leading-6 text-white/55">{direction}</p>
        )}
      </div>
      <div
        role="radiogroup"
        aria-label="Major or minor"
        className={cn(
          'grid min-h-0 flex-1 gap-4',
          stacked
            ? 'grid-cols-[minmax(0,1fr)] max-[639px]:grid-cols-[minmax(0,1fr)] min-[640px]:grid-cols-2'
            : 'grid-cols-2',
        )}
      >
        {MODES.map((m, i) => {
          const key = circleOfFifths(m).find((k) => k.tonic === tonic)!;
          const on = mode === m;
          const third = m === 'minor' ? '♭3' : '3';
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={on}
              data-literacy-mode={m}
              onClick={() => onChoose(m)}
              className={cn(
                'relative flex min-h-0 flex-col items-center justify-center gap-3 rounded-xl border bg-[#151518] p-5 text-center transition-colors',
                on
                  ? 'border-transparent'
                  : 'border-white/[0.08] hover:bg-white/[0.06]',
              )}
              style={on ? { boxShadow: `0 0 0 2px ${key.color}` } : undefined}
            >
              {on && (
                <span
                  className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-[#101012]"
                  style={{ backgroundColor: key.color }}
                >
                  <Check className="size-3.5" />
                  Chosen
                </span>
              )}
              <div
                ref={i === 0 ? ref : undefined}
                aria-hidden
                className="flex min-h-0 w-full flex-1 items-center justify-center"
              >
                <ModeRing
                  pitchClass={pc}
                  mode={m}
                  size={size}
                  label={key.label}
                />
              </div>
              <span className="text-2xl leading-8 text-[#e8e8f0]">
                {keyName(tonic, m)}
              </span>
              <span
                aria-label={`1, ${third} and 5`}
                className="text-xl font-semibold tabular-nums text-[#e8e8f0]"
              >
                1 · <span style={{ color: key.color }}>{third}</span> · 5
              </span>
              <span className="flex items-center gap-2 text-sm text-white/55">
                <span
                  aria-hidden
                  className="size-3 rounded-full"
                  style={{ backgroundColor: key.color }}
                />
                {m === 'minor'
                  ? `Minor takes ${colorKeyOf(tonic)}’s color`
                  : `${key.label}’s own color`}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** The ring in a mode's colors, the key's slice standing out. */
function ModeRing({
  pitchClass,
  mode,
  size,
  label,
}: {
  pitchClass: number;
  mode: LiteracyMode;
  size: number;
  label: string;
}) {
  const slices: RingSlice[] = circleOfFifths(mode).map((key) => ({
    id: key.tonic,
    position: ringPosition(key.pitchClass),
    color: key.color,
    label: key.pitchClass === pitchClass ? key.label : '',
    ariaLabel: key.label,
    enabled: false,
    selected: key.pitchClass === pitchClass,
  }));
  return (
    <KeyRing
      slices={slices}
      size={size}
      role="button"
      ariaLabel={`${label} ${mode}`}
      onPick={() => {}}
    />
  );
}
