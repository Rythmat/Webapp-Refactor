// ── A scale's seven positions, on the neck ─────────────────────────────────
// The Overview of a diatonic lesson on guitar, and the Relative Modes page:
// the fretboard (PositionsNeck) with the chosen position lit, and beside it
// (under it, narrow) that position's box with its fingers. The positions
// are labelled along the neck: hovering one lights it there, choosing it
// (onIndexChange) makes it the box's. The page keeps which is chosen.
//
// labels 'position' numbers the shapes from the scale's tonic (Position 1 …
// 7) and rings the tonic; 'mode' names them (Ionian … Locrian) and rings
// each shape's own root, as the reference sheet does.

import { useMemo } from 'react';
import {
  PROMPT_PILL,
  PROMPT_PILL_OFF,
} from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';
import {
  fretboardScaleNotes,
  modalPositions,
  POSITIONS_LAST_FRET,
  type ModalPosition,
  type ModalScale,
} from '@/curriculum/data/guitar/modes/modalPositions';
import {
  GUITAR_MODE_NAME,
  GUITAR_MODES,
} from '@/curriculum/data/guitar/modes/modeNames';
import { MODE_INDEX } from '@/curriculum/data/guitar/modes/modeTables';
import type { GuitarMode } from '@/curriculum/data/guitar/types';
import type { LessonTab } from '@/curriculum/guitar/layout/LessonTabStrip';
import { formatAccidentalsForDisplay } from '@/curriculum/utils/formatAccidentals';
import { PositionBox } from './PositionBox';
import { PositionsNeck } from './PositionsNeck';

export type PositionLabels = 'position' | 'mode';

/** 'Position 3', or the shape's mode: 'Phrygian'. */
export function positionName(
  labels: PositionLabels,
  position: Pick<ModalPosition, 'number' | 'shapeMode'>,
): string {
  return labels === 'mode'
    ? GUITAR_MODE_NAME[position.shapeMode]
    : `Position ${position.number}`;
}

/**
 * The page's tab row of positions: 'Position 1' … or 'Ionian' …; on a
 * phone just the number, the name under it.
 */
export function positionTabs({
  mode,
  labels,
  index,
  onSelect,
  narrow,
}: {
  mode: GuitarMode;
  labels: PositionLabels;
  index: number;
  onSelect: (index: number) => void;
  narrow: boolean;
}): LessonTab[] {
  return Array.from({ length: 7 }, (_, i) => {
    const name = positionName(labels, {
      number: i + 1,
      shapeMode: GUITAR_MODES[(MODE_INDEX[mode] + i) % 7],
    });
    return {
      id: `position-${i + 1}`,
      label: narrow ? String(i + 1) : name,
      name,
      sub: narrow && labels === 'mode' ? name.slice(0, 3) : undefined,
      active: i === index,
      onSelect: () => onSelect(i),
    };
  });
}

export interface ModePositionsOverviewProps {
  scale: ModalScale;
  /** 0-6: the position lit. */
  index: number;
  labels: PositionLabels;
  keyColor: string;
  mirrored: boolean;
  /** Mode labels: opens the lesson of the shape's mode on its root. */
  onOpenMode?: (position: ModalPosition) => void;
  /** A position chosen on the neck. */
  onIndexChange: (index: number) => void;
}

export function ModePositionsOverview({
  scale,
  index,
  labels,
  keyColor,
  mirrored,
  onOpenMode,
  onIndexChange,
}: ModePositionsOverviewProps) {
  const positions = useMemo(() => modalPositions(scale), [scale]);
  const scaleNotes = useMemo(() => fretboardScaleNotes(scale), [scale]);
  const position = positions[Math.min(Math.max(index, 0), 6)];
  const rootRing = labels === 'mode' ? 'shape' : 'tonic';
  const name = positionName(labels, position);
  const root = formatAccidentalsForDisplay(position.rootName);
  const tonic = formatAccidentalsForDisplay(scale.spelling[0]);
  const shape = `${root} ${GUITAR_MODE_NAME[position.shapeMode]}`;
  const span = `Frets ${position.firstFret}–${position.lastFret}`;
  // The scale from the shape's root, as the position plays it up string 6.
  const fromRoot = [
    ...scale.spelling.slice(position.number - 1),
    ...scale.spelling.slice(0, position.number - 1),
  ].map(formatAccidentalsForDisplay);
  const ringed = rootRing === 'tonic' ? tonic : root;

  return (
    <div
      data-mode-positions={labels}
      className="@container flex min-w-0 flex-col gap-4"
    >
      <div className="grid items-start gap-5 @[44rem]:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <div className="flex min-w-0 justify-center">
          <PositionsNeck
            scaleNotes={scaleNotes}
            positions={positions}
            names={positions.map((p) => positionName(labels, p))}
            selectedIndex={positions.indexOf(position)}
            onSelect={onIndexChange}
            rootRing={rootRing}
            lastFret={POSITIONS_LAST_FRET}
            keyColor={keyColor}
            mirrored={mirrored}
            label={`The scale on the neck, ${name} chosen: the ${shape} shape, ${span.toLowerCase()}. Choose a position beside the neck.`}
          />
        </div>
        <section
          aria-label={name}
          data-position-card={position.number}
          className="flex flex-col gap-4 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-5 @[44rem]:sticky @[44rem]:top-4"
        >
          <header className="flex flex-col gap-1">
            <h3 className="text-xl font-bold leading-6 text-[#e8e8f0]">
              {name}
            </h3>
            <p className="text-sm leading-5 text-white/55">
              {labels === 'mode'
                ? `${shape} · ${span}`
                : `The ${shape} shape · ${span}`}
            </p>
          </header>
          <PositionBox
            position={position}
            rootRing={rootRing}
            keyColor={keyColor}
            label={`${name} box: finger 1 on fret ${position.firstFret}; hollow dots are ${ringed}.`}
          />
          <ul
            aria-label="Notes from the root"
            className="flex flex-wrap gap-1.5"
          >
            {fromRoot.map((note, i) => (
              <li
                key={`${note}-${i}`}
                className={cn(
                  'inline-flex h-8 min-w-8 items-center justify-center rounded-full border px-2.5 text-sm font-bold',
                  note === ringed
                    ? 'text-[#e8e8f0]'
                    : 'border-transparent text-[#17171c]',
                )}
                style={
                  note === ringed
                    ? { borderColor: keyColor }
                    : { backgroundColor: keyColor }
                }
              >
                {note}
              </li>
            ))}
          </ul>
          <p className="text-sm leading-5 text-white/55">
            {rootRing === 'tonic'
              ? `Hollow dots are ${tonic}, the tonic. The numbers are the fingers that play each note: one finger per fret, from finger 1 on fret ${position.firstFret}.`
              : `Hollow dots are ${root}, the root of ${shape}. The numbers are the fingers that play each note: one finger per fret, from finger 1 on fret ${position.firstFret}.`}
          </p>
          {onOpenMode && (
            <button
              type="button"
              data-open-mode={position.shapeMode}
              onClick={() => onOpenMode(position)}
              className={cn(PROMPT_PILL, PROMPT_PILL_OFF, 'self-start')}
            >
              Open the {shape} lesson
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
