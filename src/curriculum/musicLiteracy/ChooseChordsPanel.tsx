import { Check, Headphones, RotateCcw } from 'lucide-react';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/components/utilities';
import type {
  LiteracyChooseChordsStep,
  LiteracyScaleDegree,
} from '@/content/musicLiteracy/schemas';
import {
  circleOfFifths,
  pickProgression,
  type SavedProgression,
} from '@/curriculum/engine/musicLiteracy/choices';
import {
  diatonicChords,
  fillTemplate,
  progressionProblems,
  xBars,
  type LiteracyChord,
} from '@/curriculum/engine/musicLiteracy/chords';
import {
  pitchClassOf,
  type LiteracyKey,
} from '@/curriculum/engine/musicLiteracy/pitch';
import { useElementSize } from '@/hooks/useElementSize';
import { keyName } from './ChooseKeyPanel';
import { inkOn, KeyRing, ringPosition, type RingSlice } from './KeyRing';

// ── Choose your chords ─────────────────────────────────────────────────────
// A choose-chords step: the template as bars (| 1 | X | X | X |), and the
// palette as the six slices around the key on the circle, each named the
// hybrid way ("4 maj", "♭6 maj7"). A tap on a slice fills the next X (or
// the X tapped last) and plays that chord. What's still wrong is said under
// the bars (chords.ts progressionProblems); Hear it plays the progression,
// and Save keeps it for the steps that play it.

/** A palette chord, where it sits on the ring and in what color. */
interface PaletteChord extends LiteracyChord {
  position: number;
  color: string;
}

/** The mode's six chords on the ring, each on its root's slice. */
function paletteOf(
  key: LiteracyKey,
  harmony: LiteracyChooseChordsStep['harmony'],
): PaletteChord[] {
  const ring = circleOfFifths(key.mode);
  const one = pitchClassOf(key.tonic);
  return diatonicChords(key.mode, harmony).map((chord) => {
    const pc = (one + chord.rootSemitones) % 12;
    return {
      ...chord,
      position: ringPosition(pc),
      color: ring.find((k) => k.pitchClass === pc)?.color ?? '#888888',
    };
  });
}

/** The picks a saved progression made, when it fits this key; else none. */
function initialPicks(
  step: LiteracyChooseChordsStep,
  key: LiteracyKey,
  saved: SavedProgression | undefined,
): (LiteracyScaleDegree | null)[] {
  const slots = xBars(step.template);
  const fits =
    saved &&
    saved.tonic === key.tonic &&
    saved.mode === key.mode &&
    saved.chords.length === step.template.length;
  return slots.map((bar) => (fits ? saved.chords[bar] : null));
}

const same = (a: readonly unknown[], b: readonly unknown[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

export interface ChooseChordsPanelProps {
  step: LiteracyChooseChordsStep;
  key_: LiteracyKey;
  keyColor: string;
  saved: SavedProgression | undefined;
  /** The progression's bar sounding in a preview (null: none). */
  playingBar: number | null;
  onHearChord: (degree: LiteracyScaleDegree) => void;
  onHear: (chords: LiteracyScaleDegree[]) => void;
  onSave: (progression: SavedProgression) => void;
  keyboard: ReactNode;
  stacked: boolean;
}

export function ChooseChordsPanel({
  step,
  key_: key,
  keyColor,
  saved,
  playingBar,
  onHearChord,
  onHear,
  onSave,
  keyboard,
  stacked,
}: ChooseChordsPanelProps) {
  const palette = useMemo(() => paletteOf(key, step.harmony), [key, step]);
  const slots = useMemo(() => xBars(step.template), [step.template]);
  const [picks, setPicks] = useState(() => initialPicks(step, key, saved));
  const firstEmpty = picks.findIndex((p) => !p);
  const [chosenSlot, setChosenSlot] = useState<number | null>(null);
  const active = chosenSlot ?? (firstEmpty >= 0 ? firstEmpty : null);

  const chords = fillTemplate(step.template, picks);
  const problems = progressionProblems(
    step.template,
    step.distinct,
    picks,
    key.mode,
  );
  const messages = [...new Set(problems.map((p) => p.message))];
  const picked = pickProgression(step, picks, key);
  const isSaved =
    !!saved &&
    !!chords &&
    saved.tonic === key.tonic &&
    saved.mode === key.mode &&
    same(saved.chords, chords);

  const chordOf = (degree: LiteracyScaleDegree | null | undefined) =>
    degree ? palette.find((c) => c.degree === degree) : undefined;

  const pick = (chord: PaletteChord) => {
    if (active === null) return;
    const next = [...picks];
    next[active] = chord.degree;
    setPicks(next);
    // On to the next empty X, from the one just filled.
    const after = next.findIndex((p, i) => !p && i > active);
    const anyEmpty = next.findIndex((p) => !p);
    setChosenSlot(after >= 0 ? after : anyEmpty >= 0 ? anyEmpty : null);
    onHearChord(chord.degree);
  };

  const ringRef = useRef<HTMLDivElement>(null);
  const ringBox = useElementSize(ringRef);
  const ringMax = stacked ? 340 : 480;
  const ringSize = Math.max(
    200,
    Math.floor(
      Math.min(ringBox.width || ringMax, ringBox.height || ringMax, ringMax),
    ),
  );

  const onSlices = new Set(palette.map((c) => c.position));
  // Read round the ring from the first of the six (the 4 in major): 4, 1,
  // 5, 2, 6, 3.
  const first = [...onSlices].find((p) => !onSlices.has((p + 11) % 12)) ?? 0;
  const around = (slice: RingSlice) => (slice.position - first + 12) % 12;
  const slices: RingSlice[] = [
    ...palette.map(
      (chord): RingSlice => ({
        id: chord.degree,
        position: chord.position,
        color: chord.color,
        label: chord.number,
        sub: chord.quality,
        ariaLabel:
          chord.degree === '1' ? `${chord.label}, your 1` : chord.label,
        enabled: chord.degree !== '1' && active !== null,
        selected: active !== null && picks[active] === chord.degree,
      }),
    ),
    ...circleOfFifths(key.mode)
      .filter((k) => !onSlices.has(ringPosition(k.pitchClass)))
      .map(
        (k): RingSlice => ({
          id: `off-${k.tonic}`,
          position: ringPosition(k.pitchClass),
          color: k.color,
          label: '',
          ariaLabel: k.label,
          enabled: false,
          dim: true,
        }),
      ),
  ].sort((a, b) => around(a) - around(b));

  const activeBar = active === null ? null : slots[active];

  return (
    <section
      aria-label="Choose your chords"
      data-literacy-choose="chords"
      className={cn(
        'grid min-h-0 gap-6 rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 max-[639px]:p-4',
        stacked
          ? 'grid-cols-[minmax(0,1fr)] content-start'
          : 'flex-1 grid-cols-[minmax(0,5fr)_minmax(0,6fr)] grid-rows-[minmax(0,1fr)] items-center',
      )}
    >
      <div
        ref={ringRef}
        className={cn(
          'flex min-h-0 items-center justify-center',
          stacked ? 'h-[340px] max-[639px]:h-[300px]' : 'h-full',
        )}
      >
        <KeyRing
          slices={slices}
          size={ringSize}
          role="button"
          ariaLabel={`The chords of ${keyName(key.tonic, key.mode)}`}
          onPick={(slice) => {
            const chord = palette.find((c) => c.degree === slice.id);
            if (chord) pick(chord);
          }}
          center={
            activeBar !== null ? (
              <>
                <span className="text-[11px] uppercase tracking-[0.14em] text-white/55">
                  Bar {activeBar + 1}
                </span>
                <span
                  className="font-semibold leading-none"
                  style={{ color: keyColor, fontSize: ringSize * 0.1 }}
                >
                  X
                </span>
                <span className="mt-1 px-4 text-xs leading-4 text-white/55">
                  Tap a chord
                </span>
              </>
            ) : (
              <>
                <Check
                  aria-hidden
                  className="size-8"
                  style={{ color: keyColor }}
                />
                <span className="mt-1 text-sm text-[#e8e8f0]">
                  Every X filled
                </span>
              </>
            )
          }
        />
      </div>

      <div
        className={cn(
          'flex min-w-0 flex-col gap-4',
          !stacked && 'max-h-full min-h-0 overflow-y-auto',
        )}
      >
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[28px] font-normal leading-9 text-[#e8e8f0] max-[639px]:text-2xl">
            Choose your chords
          </h2>
          {step.direction && (
            <p className="text-[15px] leading-6 text-white/55">
              {step.direction}
            </p>
          )}
        </div>

        <ol
          aria-label="Your progression"
          data-literacy-template
          className="flex items-stretch border-x-[3px] border-white/40"
        >
          {step.template.map((bar, b) => {
            const slot = slots.indexOf(b);
            const chord =
              bar === '1'
                ? palette.find((c) => c.degree === '1')
                : chordOf(picks[slot]);
            const isActive = slot >= 0 && slot === active;
            const playing = playingBar === b;
            const body = (
              <>
                <span className="text-[10px] uppercase tracking-[0.14em] opacity-70">
                  Bar {b + 1}
                </span>
                <span className="text-xl font-semibold leading-7">
                  {chord ? chord.label : 'X'}
                </span>
              </>
            );
            const style = chord
              ? {
                  backgroundColor: chord.color,
                  color: inkOn(chord.color),
                  ...(bar === '1' ? { opacity: 0.8 } : {}),
                }
              : undefined;
            return (
              <li
                key={b}
                className={cn(
                  'flex min-w-0 flex-1 p-1.5',
                  b > 0 && 'border-l-2 border-white/25',
                )}
              >
                {bar === '1' ? (
                  <div
                    data-template-bar="1"
                    data-playing={playing || undefined}
                    className={cn(
                      'flex min-h-[76px] flex-1 flex-col items-center justify-center rounded-lg',
                      playing && 'ring-2 ring-white',
                    )}
                    style={style}
                    aria-label={`Bar ${b + 1}: ${chord?.label ?? '1'}`}
                  >
                    {body}
                  </div>
                ) : (
                  <button
                    type="button"
                    data-template-bar="X"
                    data-active={isActive || undefined}
                    data-playing={playing || undefined}
                    aria-pressed={isActive}
                    aria-label={`Bar ${b + 1}: ${chord ? chord.label : 'X, not chosen yet'}`}
                    onClick={() => setChosenSlot(slot)}
                    className={cn(
                      'flex min-h-[76px] flex-1 flex-col items-center justify-center rounded-lg border-2 transition-colors',
                      chord
                        ? 'border-transparent'
                        : 'border-dashed border-white/25 text-white/55 hover:bg-white/[0.05]',
                      playing && 'ring-2 ring-white',
                    )}
                    style={{
                      ...style,
                      ...(isActive
                        ? {
                            borderColor: keyColor,
                            borderStyle: 'solid',
                            boxShadow: `0 0 0 2px ${keyColor}55`,
                          }
                        : {}),
                    }}
                  >
                    {body}
                  </button>
                )}
              </li>
            );
          })}
        </ol>

        <div role="status" aria-live="polite" className="min-h-6">
          {messages.length > 0 ? (
            <ul data-literacy-problems className="flex flex-col gap-1">
              {messages.map((message) => (
                <li key={message} className="text-[15px] text-white/70">
                  {message}
                </li>
              ))}
            </ul>
          ) : isSaved ? (
            <p
              data-literacy-saved
              className="flex items-center gap-2 text-[15px] text-[#e8e8f0]"
            >
              <Check className="size-4 text-success-base" />
              Saved. The next steps play your chords.
            </p>
          ) : (
            <p className="text-[15px] text-[#e8e8f0]">
              Ready: hear it, then save it.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!chords}
            onClick={() => chords && onHear(chords)}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 text-[15px] text-[#e8e8f0] transition-colors hover:bg-white/[0.08] disabled:opacity-40 disabled:hover:bg-white/[0.04]"
          >
            <Headphones className="size-4" />
            Hear it
          </button>
          <button
            type="button"
            data-literacy-save
            disabled={!picked.progression || isSaved}
            onClick={() => picked.progression && onSave(picked.progression)}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-medium text-[#101012] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {isSaved ? (
              <>
                <Check className="size-4" />
                Saved
              </>
            ) : (
              'Save my chords'
            )}
          </button>
          {picks.some(Boolean) && (
            <button
              type="button"
              onClick={() => {
                setPicks(picks.map(() => null));
                setChosenSlot(null);
              }}
              className="inline-flex h-11 items-center gap-2 rounded-full px-3 text-sm text-white/55 transition-colors hover:text-[#e8e8f0]"
            >
              <RotateCcw className="size-4" />
              Start over
            </button>
          )}
        </div>

        {keyboard}
      </div>
    </section>
  );
}
