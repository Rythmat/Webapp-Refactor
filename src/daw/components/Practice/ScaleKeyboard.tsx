/**
 * ScaleKeyboard.tsx — The keyboard a Practice Track is played on: the scale lit,
 * each lit key named and numbered, and a switcher for every scale the level
 * teaches.
 *
 * A level often teaches more than one scale over the same key — Funk L2's Melody
 * section covers A Dorian and A minor blues — and switching between them on one
 * keyboard is how a student sees what actually changes: the ♭5 arrives, the 2
 * and the 6 leave. So the scale's name is the control, and it only looks like
 * one when there is something to switch to.
 */

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import { OCTAVE_WIDTH } from '@/components/PianoKeyboard/useExpandedRange';
import type { PlaybackEvent } from '@/contexts/PlaybackContext/helpers';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { BLACK_KEYS, useKeyCenters } from './useKeyCenters';

const ACCENT = '#7ecfcf';
const OFF_SCALE = '#71717a';

/** What `PianoKeyboard` asks for one octave in `gaming` mode: twice its normal. */
const OCTAVE_PX = OCTAVE_WIDTH * 2;
/**
 * The height of one line of each kind of label, and the gap between the two
 * bands they are drawn in.
 *
 * Black keys take the upper band and white keys the lower, and the bands are
 * tall enough that a stack in one can never reach into the other. They have to
 * be: F♯ and G are adjacent keys whose centres are closer together than their
 * labels are wide, so left in a single band they print on top of each other.
 */
const DEGREE_LINE_PX = 20;
const NAME_LINE_PX = 24;
const BAND_GAP_PX = 4;
/** A box shorter than this hasn't been laid out yet, rather than being small. */
const MIN_MEASURABLE_PX = 80;
/** Breathing room under the chart, so it never sits flush against the edge. */
const BOTTOM_MARGIN_PX = 12;
/** Slack smaller than this is close enough; chasing it would make the size hunt. */
const SETTLED_PX = 4;
/** Below this the keys stop being playable, so the page scrolls instead. */
const MIN_SCALE = 0.42;

export interface KeyboardScale {
  id: string;
  /** Without the tonic: 'Dorian', 'Minor Blues'. */
  title: string;
  intervals: number[];
  degrees: string[];
  names: string[];
}

interface ScaleKeyboardProps {
  /** Every scale on the switcher, the level's default first. */
  scales: KeyboardScale[];
  /** Which one is lit — held by the screen, so its task line can follow it. */
  activeId: string;
  /** MIDI note the labelled octave's tonic sounds at. */
  scaleTonic: number;
  startC: number;
  endC: number;
  /** Notes currently held on the student's MIDI keyboard. */
  heldNotes: ReadonlySet<number>;
  /** The screen's own scroll box — what the keyboard has to fit inside. */
  fitWithin: RefObject<HTMLElement | null>;
  /** The last thing that has to stay on screen: the chord chart. */
  fitAnchor: RefObject<HTMLElement | null>;
  onScaleChange: (scale: KeyboardScale) => void;
}

export function ScaleKeyboard({
  scales,
  activeId,
  scaleTonic,
  startC,
  endC,
  heldNotes,
  fitWithin,
  fitAnchor,
  onScaleChange,
}: ScaleKeyboardProps) {
  const showDegrees = useSettingsStore((s) => s.practiceShowDegrees);
  const showNames = useSettingsStore((s) => s.practiceShowNoteNames);
  const setShowDegrees = useSettingsStore((s) => s.setPracticeShowDegrees);
  const setShowNames = useSettingsStore((s) => s.setPracticeShowNoteNames);

  const scale = scales.find((s) => s.id === activeId) ?? scales[0];
  const outerRef = useRef<HTMLDivElement>(null);
  const keyboardRef = useRef<HTMLDivElement>(null);

  const bandPx =
    (showDegrees ? DEGREE_LINE_PX : 0) +
    (showNames ? NAME_LINE_PX : 0) +
    BAND_GAP_PX;
  const hasLabels = showDegrees || showNames;
  const labelsPx = hasLabels ? bandPx * 2 : 0;
  const naturalWidth = OCTAVE_PX * (endC - startC + 1);
  const naturalHeight = labelsPx + OCTAVE_PX;
  const fit = useFitScale(
    outerRef,
    fitWithin,
    fitAnchor,
    naturalWidth,
    naturalHeight,
  );
  const keyCenters = useKeyCenters(keyboardRef, startC, fit);

  const low = startC * 12;
  const high = endC * 12 + 11;

  // Every octave of the scale is lit; only the one octave is named.
  const scalePcs = useMemo(
    () => new Set(scale.intervals.map((i) => (scaleTonic + i) % 12)),
    [scale, scaleTonic],
  );
  const litKeys = useMemo(() => {
    const keys = new Map<number, string>();
    for (let midi = low; midi <= high; midi++) {
      if (scalePcs.has(((midi % 12) + 12) % 12)) keys.set(midi, ACCENT);
    }
    return keys;
  }, [scalePcs, low, high]);

  const playedKeys: PlaybackEvent[] = useMemo(
    () =>
      [...heldNotes].map((midi) => ({
        id: `hw-${midi}`,
        type: 'note',
        midi,
        time: 0,
        duration: Number.POSITIVE_INFINITY,
        velocity: 1,
        color: scalePcs.has(((midi % 12) + 12) % 12) ? ACCENT : OFF_SCALE,
      })),
    [heldNotes, scalePcs],
  );

  const labels = useMemo(
    () =>
      scale.intervals.map((step, i) => ({
        midi: scaleTonic + step,
        name: displayAccidentals(scale.names[i] ?? ''),
        degree: scale.degrees[i] ?? '',
      })),
    [scale, scaleTonic],
  );

  const octaveCs = useMemo(
    () =>
      Array.from({ length: endC - startC + 1 }, (_, i) => (startC + i) * 12),
    [startC, endC],
  );

  return (
    <div className="w-full">
      {/* The switcher and the label toggles: what is lit, and how it is read. */}
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
        {scales.length > 1 ? (
          <div
            className="flex items-center gap-1 rounded-full p-1"
            role="group"
            aria-label="Scale to show"
            style={{ border: '1px solid var(--color-border)' }}
          >
            {scales.map((option) => {
              const active = option.id === scale.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onScaleChange(option)}
                  className="rounded-full px-3 py-1 text-sm font-medium transition-colors"
                  style={{
                    background: active ? ACCENT : 'transparent',
                    color: active ? '#191919' : 'var(--color-text-dim)',
                  }}
                >
                  {option.title}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="flex items-center gap-1">
          <LabelToggle
            label="1 2 3"
            title="Scale degrees"
            on={showDegrees}
            onClick={() => setShowDegrees(!showDegrees)}
          />
          <LabelToggle
            label="A B C"
            title="Note names"
            on={showNames}
            onClick={() => setShowNames(!showNames)}
          />
        </div>
      </div>

      {/* The keyboard, scaled to whatever room the screen has. The label rows
      ride inside the same scaled box, so their text shrinks with the keys and a
      name never ends up wider than the key it belongs to. */}
      <div ref={outerRef} className="w-full">
        <div
          className="relative w-full"
          style={{ height: naturalHeight * fit }}
        >
          <div
            ref={keyboardRef}
            className="absolute left-1/2 top-0"
            style={{
              width: naturalWidth,
              transform: `translateX(-50%) scale(${fit})`,
              transformOrigin: 'top center',
            }}
          >
            {/* Degrees over names, each stack above its own key. Black keys take
            the upper band and white keys the lower: they are the pairs that sit
            closest together, and a shared band would have F♯ and G on top of
            each other. */}
            {hasLabels && (
              <div
                className="relative w-full"
                style={{ height: labelsPx }}
                aria-label={`${scale.title} scale: ${scale.names.join(' ')}`}
              >
                {labels.map(({ midi, name, degree }, i) => {
                  const x = keyCenters.get(midi);
                  if (x === undefined) return null;
                  const black = BLACK_KEYS.has(((midi % 12) + 12) % 12);
                  const tonic = i === 0;
                  return (
                    <span
                      key={midi}
                      className="absolute flex -translate-x-1/2 flex-col items-center leading-tight"
                      style={{ left: x, top: black ? 0 : bandPx }}
                    >
                      {showDegrees && (
                        <span
                          className={`text-sm ${tonic ? 'font-bold' : 'font-medium'}`}
                          style={{ color: ACCENT }}
                        >
                          {degree}
                        </span>
                      )}
                      {showNames && (
                        <span
                          className={`text-base ${tonic ? 'font-bold' : 'font-medium'}`}
                          style={{
                            color: showDegrees ? 'var(--color-text)' : ACCENT,
                          }}
                        >
                          {name}
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            )}

            {/* The keyboard's larger layout: keys at twice the default size, as
            it is the main thing on this screen. That layout leaves out the
            octave labels, so they are drawn over it here, at the foot of each C
            as the default keyboard writes them. */}
            <div className="relative" data-practice-keyboard>
              <PianoKeyboard
                gaming
                className="mx-auto"
                startC={startC}
                endC={endC}
                hintNotes={litKeys}
                playingNotes={playedKeys}
              />
              {octaveCs.map((midi) => {
                const x = keyCenters.get(midi);
                if (x === undefined) return null;
                return (
                  <span
                    key={midi}
                    className="pointer-events-none absolute bottom-1.5 -translate-x-1/2 text-[11px] font-medium text-black/70"
                    style={{ left: x }}
                  >
                    C{Math.floor(midi / 12) - 1}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** One of the two label rows, on or off. */
function LabelToggle({
  label,
  title,
  on,
  onClick,
}: {
  label: string;
  title: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={`${title} labels`}
      title={`${on ? 'Hide' : 'Show'} ${title.toLowerCase()}`}
      onClick={onClick}
      className="rounded-full px-2.5 py-1 text-xs font-medium tabular-nums transition-colors"
      style={{
        border: `1px solid ${on ? ACCENT : 'var(--color-border)'}`,
        color: on ? ACCENT : 'var(--color-text-dim)',
        opacity: on ? 1 : 0.7,
      }}
    >
      {label}
    </button>
  );
}

/**
 * How far the keyboard has to shrink so that it, the transport and the chord
 * chart are all on the screen at once — never larger than its natural size, and
 * never so small the keys stop being playable.
 *
 * The chart is the anchor rather than the bottom of the page, because the page
 * ends with a list of things to try that is happily read by scrolling. Trying to
 * fit that too drove the keyboard down to its minimum on a long list and made
 * the keys unplayable to save something nobody needed to see at once.
 *
 * Measured as the slack under the anchor and fed back into the scale, which
 * settles in a pass or two: shrinking the keyboard moves the chart up by exactly
 * the pixels the keyboard gave up. A few pixels either way are left alone, so it
 * settles rather than hunting.
 *
 * Scaled with a transform rather than re-laid out, so every key keeps its
 * proportions and the labels shrink with the keys they name. The box around it
 * is given the scaled height, because a transform does not change layout and the
 * page would otherwise keep a full-size gap.
 */
function useFitScale(
  ref: RefObject<HTMLDivElement | null>,
  within: RefObject<HTMLElement | null>,
  anchor: RefObject<HTMLElement | null>,
  naturalWidth: number,
  naturalHeight: number,
): number {
  const [fit, setFit] = useState(1);
  // Read inside the measurement without making it a dependency, which would
  // tear down and rebuild the observers on every resize.
  const fitRef = useRef(fit);
  fitRef.current = fit;

  useLayoutEffect(() => {
    const host = ref.current;
    if (!host) return;

    const measure = () => {
      const width = host.clientWidth;
      if (width === 0) return;
      const byWidth = width / naturalWidth;

      let next = Math.min(1, byWidth);
      const root = within.current;
      const last = anchor.current;
      if (root && last && root.clientHeight > MIN_MEASURABLE_PX) {
        const slack =
          root.getBoundingClientRect().bottom -
          last.getBoundingClientRect().bottom -
          BOTTOM_MARGIN_PX;
        if (Math.abs(slack) > SETTLED_PX) {
          const box = naturalHeight * fitRef.current + slack;
          next = Math.min(next, box / naturalHeight);
        } else {
          next = Math.min(next, fitRef.current);
        }
      }
      setFit(Math.max(MIN_SCALE, next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    if (within.current) observer.observe(within.current);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [ref, within, anchor, naturalWidth, naturalHeight]);

  return fit;
}
