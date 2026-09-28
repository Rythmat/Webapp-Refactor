import { ChevronDown } from 'lucide-react';
import { memo, useId, useMemo, useState } from 'react';
import { ChordBox } from '@/components/guitar';
import {
  chordName,
  chordRootName,
  chordRootPc,
} from '@/curriculum/data/guitar/bookOne';
import { theoryString } from '@/curriculum/data/guitar/theoryNotes';
import type {
  GuitarChordShape,
  GuitarKeyName,
} from '@/curriculum/data/guitar/types';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import {
  GUITAR_STANDARD_TUNING,
  GUITAR_STRINGS_LOW_TO_HIGH,
  defaultDiagramStart,
  parseShape,
} from '@/lib/guitar/fretboard';
import {
  classifyVoicing,
  compareShapes,
  spokenToneLabel,
  toneLabelText,
  type CompareShape,
} from '@/lib/guitar/theory';
import { displayText } from './theoryUi';

// ── SameRootCompare ────────────────────────────────────────────────────────
// "Same root, four kinds": major 7, dominant 7, minor 7 and minor 7(♭5)
// built on the current chord's root with the same grip family, each one note
// away from the one before, with the note that moved named under its box.
// For listening and comparing only: nothing here is graded.

export interface SameRootCompareProps {
  /** The current 7th chord's box: its root and grip pick the four shapes. */
  chordShape: GuitarChordShape;
  keyCenter: GuitarKeyName;
  /** Defaults to the string of the shape's lowest note. */
  rootString?: 5 | 6;
  /** Defaults to the fret of the shape's lowest note (0 moves up 12). */
  rootFret?: number;
  keyColor: string;
  /** Plays a shape ("Hear it"). Omitted = no buttons. */
  onHearShape?: (frets: string) => void;
  /** Left-handed: defaults to the instrument setting. */
  mirrored?: boolean;
  defaultOpen?: boolean;
}

interface CompareBox extends CompareShape {
  name: string;
  movedText: string | null;
  movedSpoken: string | null;
}

/** The root string and fret of a shape, when compareShapes can build on it. */
function rootOf(
  shape: GuitarChordShape,
  key: GuitarKeyName,
): { string: 5 | 6; fret: number } | null {
  const voicing = classifyVoicing(
    shape,
    chordRootPc(key, shape.degree),
    shape.quality,
  );
  const string = voicing.rootString;
  if (string !== 5 && string !== 6) return null;
  const fret = parseShape(shape.frets)[
    GUITAR_STRINGS_LOW_TO_HIGH.indexOf(string)
  ];
  return fret === null ? null : { string, fret };
}

export const SameRootCompare = memo(function SameRootCompare({
  chordShape,
  keyCenter,
  rootString,
  rootFret,
  keyColor,
  onHearShape,
  mirrored,
  defaultOpen = false,
}: SameRootCompareProps) {
  const leftHanded = useInstrumentStore((s) => s.leftHanded);
  const [open, setOpen] = useState(defaultOpen);
  const regionId = useId();

  const model = useMemo(() => {
    const root = rootOf(chordShape, keyCenter);
    const string = rootString ?? root?.string;
    const fret = rootFret ?? root?.fret;
    if (string === undefined || fret === undefined) return null;
    const rootName = displayText(chordRootName(keyCenter, chordShape.degree));
    const played = fret === 0 ? 12 : fret;
    const rootPc = (GUITAR_STANDARD_TUNING[string] + played) % 12;
    const boxes: CompareBox[] = compareShapes(string, fret).map((shape) => ({
      ...shape,
      // Same root and degree; only the quality changes.
      name: displayText(chordName(keyCenter, chordShape.degree, shape.quality)),
      movedText: shape.moved
        ? theoryString('compare.moved', {
            from: toneLabelText(shape.moved.from),
            to: toneLabelText(shape.moved.to),
          })
        : null,
      movedSpoken: shape.moved
        ? `${spokenToneLabel(shape.moved.from)} to ${spokenToneLabel(shape.moved.to)}, string ${shape.moved.string}`
        : null,
    }));
    return { rootName, rootPc, boxes };
  }, [chordShape, keyCenter, rootString, rootFret]);

  if (!model) return null;

  return (
    <div data-same-root-compare className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={regionId}
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 self-start rounded-full px-2 py-0.5 text-xs hover:bg-white/10"
        style={{
          border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
          color: 'var(--color-text, #e8e8f0)',
        }}
      >
        <ChevronDown
          aria-hidden
          className={`h-3.5 w-3.5 motion-safe:transition-transform ${open ? 'rotate-180' : ''}`}
        />
        {theoryString('compare.title')}
      </button>
      {open && (
        <section
          id={regionId}
          aria-label={theoryString('compare.title')}
          className="flex flex-col gap-1.5"
        >
          <p
            className="text-[11px]"
            style={{ color: 'var(--color-text-dim, #9a9aab)' }}
          >
            {theoryString('compare.caption', { root: model.rootName })}
          </p>
          <ul className="flex flex-wrap items-start gap-3">
            {model.boxes.map((box) => (
              <li
                key={box.quality}
                data-compare-quality={box.quality}
                className="flex flex-col items-center gap-0.5"
              >
                <ChordBox
                  shape={{
                    frets: box.frets,
                    diagramStartFret: defaultDiagramStart(box.frets),
                    fingering: [],
                  }}
                  name={box.name}
                  rootPc={model.rootPc}
                  keyColor={keyColor}
                  size="sm"
                  mirrored={mirrored ?? leftHanded}
                  onHear={
                    onHearShape ? () => onHearShape(box.frets) : undefined
                  }
                />
                <span
                  data-moved
                  className="min-h-4 text-[11px] font-medium"
                  style={{ color: 'var(--color-text, #e8e8f0)' }}
                >
                  {box.movedText && (
                    <>
                      <span aria-hidden>
                        {box.movedText}
                        <span
                          style={{ color: 'var(--color-text-dim, #9a9aab)' }}
                        >
                          {` · string ${box.moved?.string}`}
                        </span>
                      </span>
                      <span className="sr-only">{box.movedSpoken}</span>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
});
