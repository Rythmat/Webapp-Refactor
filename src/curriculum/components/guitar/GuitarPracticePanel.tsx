import { useMemo, type ReactNode } from 'react';
import { Fretboard, ScaleBox } from '@/components/guitar';
import type {
  GuitarCenterId,
  GuitarScaleSlot,
} from '@/curriculum/data/guitar/types';
import {
  chordSymbolTones,
  type ChordSymbolTones,
} from '@/curriculum/engine/genreGeneration/chordSymbolTones';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import { GuitarChordStrip } from './GuitarChordStrip';
import { litMarkers } from './fretboardMarkers';
import {
  guitarPracticeModel,
  type GuitarVisualChord,
} from './guitarVisualModel';

// ── GuitarPracticePanel ────────────────────────────────────────────────────
// A guitar Practice Track's answer to the practice keyboard: what to play
// from, on the guitar. Improvising, the scale position the level plays from
// (its box, and every note of it lit on the neck); playing the chords, the
// shapes in the order the progression plays them, the one sounding now
// ringed in its box and lit on the neck.

/** The neck's height in the panel; the SVG keeps its aspect ratio. */
const NECK_HEIGHT = 190;

export interface GuitarPracticePanelProps {
  /** 'C', or 'D:dorian' (curriculum/data/guitar/centers). */
  keyCenter: string;
  scalePosition: string | null;
  shapeIds: readonly string[];
  view: 'scales' | 'chords';
  /** One turn of the progression, as the chart draws it. */
  chordCycle: readonly string[];
  /** The chord of the cycle sounding now; -1 before the playhead is in one. */
  chordIndex: number;
  keyColor: string;
  /** The view switch, over the panel. */
  controls?: ReactNode;
}

/**
 * The section's shape for a chord of the progression: the same root, and a
 * seventh for a seventh chord where the section has one. Null when the
 * section plays no shape on that root.
 */
export function shapeForChord(
  chords: readonly GuitarVisualChord[],
  tones: ChordSymbolTones,
): GuitarVisualChord | null {
  const onRoot = chords.filter((chord) => chord.rootPc === tones.rootPc);
  const wantsSeventh = tones.seventh !== undefined;
  return (
    onRoot.find(
      (chord) => chord.shape.quality.includes('7') === wantsSeventh,
    ) ??
    onRoot[0] ??
    null
  );
}

export function GuitarPracticePanel({
  keyCenter,
  scalePosition,
  shapeIds,
  view,
  chordCycle,
  chordIndex,
  keyColor,
  controls,
}: GuitarPracticePanelProps) {
  const leftHanded = useInstrumentStore((s) => s.leftHanded);
  const center = keyCenter as GuitarCenterId;
  const showScale = view === 'scales' && !!scalePosition;

  const model = useMemo(
    () =>
      showScale
        ? guitarPracticeModel(center, {
            scalePosition: scalePosition as GuitarScaleSlot,
          })
        : guitarPracticeModel(center, { shapeIds }),
    [showScale, center, scalePosition, shapeIds],
  );

  // The boxes in the progression's order, one per shape; each chord of the
  // cycle points at its box (-1 where the section has no shape for it).
  const strip = useMemo(() => {
    const boxes: GuitarVisualChord[] = [];
    const boxOfChord = chordCycle.map((symbol) => {
      const tones = chordSymbolTones(symbol);
      const shape = tones ? shapeForChord(model.chords, tones) : null;
      if (!shape) return -1;
      const at = boxes.findIndex((box) => box.shapeId === shape.shapeId);
      if (at >= 0) return at;
      boxes.push(shape);
      return boxes.length - 1;
    });
    return boxes.length > 0
      ? { boxes, boxOfChord }
      : { boxes: [...model.chords], boxOfChord: chordCycle.map(() => -1) };
  }, [chordCycle, model.chords]);

  const current = Math.max(0, strip.boxOfChord[Math.max(0, chordIndex)] ?? 0);
  const chord = strip.boxes[current];

  const markers = useMemo(() => {
    if (model.scale) {
      return litMarkers(
        model.scale.position.playOrder,
        model.tonicPc,
        model.tonicPc,
      );
    }
    return chord
      ? litMarkers(chord.positions, chord.rootPc, model.tonicPc)
      : [];
  }, [model, chord]);

  return (
    <section
      data-guitar-practice-panel={view}
      aria-label={showScale ? 'The scale on the guitar' : 'The chord shapes'}
      className="flex w-full flex-col gap-3"
    >
      {controls && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {controls}
        </div>
      )}
      {/* A scale: its box beside the neck. Chords: the strip over the neck,
          full width, so it scrolls itself to the chord sounding now. */}
      <div
        className={
          model.scale
            ? 'flex w-full flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6'
            : 'flex w-full flex-col gap-4'
        }
      >
        <div
          className={
            model.scale
              ? 'flex shrink-0 justify-center'
              : 'h-[230px] w-full min-w-0'
          }
        >
          {model.scale ? (
            <ScaleBox
              playOrder={model.scale.position.playOrder}
              fretStart={model.scale.position.fretStart}
              fretEnd={model.scale.position.fretEnd}
              unusedStrings={model.scale.position.unusedStrings}
              name={model.scale.name}
              tonicPc={model.tonicPc}
              keyColor={keyColor}
              size="md"
              mirrored={leftHanded}
              keyNumberLabels={model.keyNumberLabels}
              showOctave={model.showOctave}
              ghosts={model.scale.ghosts}
              variant="lesson"
            />
          ) : (
            strip.boxes.length > 0 && (
              <GuitarChordStrip
                chords={strip.boxes}
                currentIndex={current}
                keyColor={keyColor}
                heard={false}
                mirrored={leftHanded}
                keyCenter={center}
                variant="lesson"
                size="md"
              />
            )
          )}
        </div>
        <div className="w-full min-w-0 flex-1">
          <Fretboard
            window={model.window}
            markers={markers}
            keyColor={keyColor}
            height={NECK_HEIGHT}
            mirrored={leftHanded}
            scrollable
            variant="lesson"
          />
        </div>
      </div>
    </section>
  );
}
