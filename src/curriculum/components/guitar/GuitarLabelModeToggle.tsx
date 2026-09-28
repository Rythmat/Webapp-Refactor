import { useRef, type KeyboardEvent } from 'react';
import {
  theoryString,
  type GuitarTheoryStringId,
} from '@/curriculum/data/guitar/theoryNotes';
import {
  useGuitarDisplaySettings,
  type ChordFretboardLabelMode,
  type ScaleLabelMode,
} from '@/features/learn/useGuitarDisplaySettings';
import type { GuitarLabelKind } from './guitarVisualModel';

// ── GuitarLabelModeToggle ──────────────────────────────────────────────────
// What the guitar diagrams' dots say, as a small segmented control beside the
// Left-handed chip. Scale and melody steps choose Fingers, Notes or Key
// numbers; chord and arpeggio steps choose Fingers, Notes or Chord tones.
// On chord steps one choice drives the fretboard and the chord boxes
// together: a chord box has no Notes mode, so it keeps its fingers then. The
// choice is saved per device (useGuitarDisplaySettings).

type Mode = ScaleLabelMode | ChordFretboardLabelMode;

const OPTIONS: Readonly<
  Record<GuitarLabelKind, readonly { mode: Mode; text: GuitarTheoryStringId }[]>
> = {
  scale: [
    { mode: 'fingers', text: 'toggle.fingers' },
    { mode: 'notes', text: 'toggle.notes' },
    { mode: 'keyNumbers', text: 'toggle.keyNumbers' },
  ],
  chord: [
    { mode: 'fingers', text: 'toggle.fingers' },
    { mode: 'notes', text: 'toggle.notes' },
    { mode: 'chordTones', text: 'toggle.chordTones' },
  ],
};

/** The legend string for a mode; Notes needs none. */
export function labelLegend(mode: Mode): string | null {
  if (mode === 'fingers') return theoryString('legend.fingers');
  if (mode === 'keyNumbers') return theoryString('legend.keyNumbers');
  if (mode === 'chordTones') return theoryString('legend.chordTones');
  return null;
}

/** The current mode for a step kind, from the device settings. */
export function useGuitarLabelMode(kind: GuitarLabelKind): Mode {
  return useGuitarDisplaySettings((s) =>
    kind === 'scale' ? s.scaleLabels : s.chordFretboardLabels,
  );
}

export interface GuitarLabelModeToggleProps {
  kind: GuitarLabelKind;
  /** The key colour marks the chosen option's outline. */
  keyColor?: string;
}

export function GuitarLabelModeToggle({
  kind,
  keyColor,
}: GuitarLabelModeToggleProps) {
  const value = useGuitarLabelMode(kind);
  const setScaleLabels = useGuitarDisplaySettings((s) => s.setScaleLabels);
  const setChordFretboardLabels = useGuitarDisplaySettings(
    (s) => s.setChordFretboardLabels,
  );
  const setChordBoxLabels = useGuitarDisplaySettings(
    (s) => s.setChordBoxLabels,
  );
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const options = OPTIONS[kind];

  const choose = (mode: Mode) => {
    if (kind === 'scale') {
      setScaleLabels(mode as ScaleLabelMode);
      return;
    }
    setChordFretboardLabels(mode as ChordFretboardLabelMode);
    setChordBoxLabels(mode === 'chordTones' ? 'chordTones' : 'fingers');
  };

  // A radio group moves with the arrow keys; Tab enters it at the choice.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const at = options.findIndex((o) => o.mode === value);
    const next = (at + step + options.length) % options.length;
    choose(options[next].mode);
    buttons.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label="Dot labels"
      data-label-mode-toggle={kind}
      onKeyDown={onKeyDown}
      className="flex shrink-0 items-center gap-0.5 rounded-full border border-white/10 bg-black/30 p-0.5"
    >
      {options.map(({ mode, text }, i) => {
        const checked = value === mode;
        return (
          <button
            key={mode}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => choose(mode)}
            className={`rounded-full px-2 py-0.5 text-[11px] leading-tight transition-colors ${
              checked
                ? 'bg-white/15 text-white'
                : 'text-white/50 hover:bg-white/5 hover:text-white/80'
            }`}
            style={
              checked && keyColor
                ? { boxShadow: `inset 0 0 0 1px ${keyColor}` }
                : undefined
            }
          >
            {theoryString(text)}
          </button>
        );
      })}
    </div>
  );
}
