// ── ScaleBox ───────────────────────────────────────────────────────────────
// One scale position as the book draws it: the frets it spans, X over the
// strings it doesn't use, and a dot per note. Dots are labelled with the
// scale degree so the box teaches the pattern, not just the frets.
//
// A lesson picks what the dots say (beato-knowledge-spec §3): the suggested
// finger (one finger per fret, the default there), the note name, or the key
// number as a 1-7 chip. Optional layers: a hairline between the two tonics
// labelled 'octave', dashed outlines where the pentatonic skips 4 and 7, and
// an (i) popover.

import { memo, useMemo } from 'react';
import { theoryString } from '@/curriculum/data/guitar/theoryNotes';
import { midiToPitchName } from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import { formatAccidentalsForDisplay } from '@/curriculum/utils/formatAccidentals';
import { fretToMidi } from '@/lib/guitar/fretboard';
import { suggestedFingers } from '@/lib/guitar/theory/scaleTheory';
import type { GuitarStringNumber } from '@/lib/guitar/types';
import { TheoryInfoButton } from './ChordBox';
import { DIAGRAM_INK, FretDiagram } from './FretDiagram';
import type {
  DiagramConnector,
  FretDiagramDot,
  ScaleBoxLabelMode,
  ScaleBoxProps,
} from './types';

/** Degree names by semitones above the tonic. */
export const SCALE_DEGREE_LABELS = [
  '1',
  '♭2',
  '2',
  '♭3',
  '3',
  '4',
  '♯4',
  '5',
  '♭6',
  '6',
  '♭7',
  '7',
] as const;

/** The key number of a pitch: '1'-'7' in the major key on `tonicPc`. */
export function keyNumberLabel(midi: number, tonicPc: number): string {
  return SCALE_DEGREE_LABELS[(((midi - tonicPc) % 12) + 12) % 12];
}

/** The note name in the key, without its octave: 'B♭', 'F♯'. */
export function keyNoteName(midi: number, tonicPc: number): string {
  return formatAccidentalsForDisplay(
    midiToPitchName(midi, tonicPc).replace(/-?\d+$/, ''),
  );
}

const MODE_WORDS: Readonly<Record<ScaleBoxLabelMode, string>> = {
  fingers: 'fingers',
  notes: 'notes',
  keyNumbers: 'key numbers',
};

export const ScaleBox = memo(function ScaleBox({
  playOrder,
  fretStart,
  fretEnd,
  unusedStrings,
  name,
  tonicPc,
  keyColor,
  activeIndex,
  size,
  mirrored,
  labelMode,
  showOctave = false,
  ghosts,
  about,
}: ScaleBoxProps) {
  const model = useMemo(() => {
    const open: GuitarStringNumber[] = [];
    // Only playOrder is read; the rest makes it a position.
    const { anchor, fingers } = suggestedFingers({
      id: 'major',
      fretStart,
      fretEnd,
      unusedStrings,
      playOrder,
    });
    const labels = playOrder.map((position, i) => {
      const midi = fretToMidi(position);
      if (labelMode === 'fingers') return fingers[i] ? String(fingers[i]) : '';
      if (labelMode === 'notes') return keyNoteName(midi, tonicPc);
      return keyNumberLabel(midi, tonicPc);
    });
    const dots: FretDiagramDot[] = playOrder.map((position, i) => {
      if (position.fret === 0) open.push(position.string);
      const pc = fretToMidi(position) % 12;
      return {
        ...position,
        label: labels[i] || undefined,
        isRoot: pc === tonicPc,
        state: i === activeIndex ? 'next' : 'idle',
        chip: labelMode === 'keyNumbers',
      };
    });

    // The position runs tonic to tonic: its first and last notes.
    const low = playOrder[0];
    const high = playOrder[playOrder.length - 1];
    const octave =
      showOctave &&
      low &&
      high &&
      fretToMidi(high) - fretToMidi(low) === 12 &&
      fretToMidi(low) % 12 === tonicPc
        ? { from: low, to: high, label: theoryString('octave.label') }
        : null;
    const connectors: DiagramConnector[] = octave ? [octave] : [];
    const ghostCount = ghosts?.filter((g) => g.fret > 0).length ?? 0;

    const active =
      activeIndex === undefined ? undefined : playOrder[activeIndex];
    const label = [
      `${name}: ${playOrder.length} notes, frets ${fretStart} to ${fretEnd}`,
      active && `next: string ${active.string} fret ${active.fret}`,
      labelMode &&
        `${MODE_WORDS[labelMode]} ${labels.filter(Boolean).join(' ')}`,
      octave &&
        `octave from string ${octave.from.string} fret ${octave.from.fret} to string ${octave.to.string} fret ${octave.to.fret}`,
      ghostCount > 0 && `${ghostCount} outlines ${theoryString('ghost.label')}`,
    ]
      .filter(Boolean)
      .join(', ');
    const caption =
      labelMode === 'fingers'
        ? theoryString('position.label', { startFret: anchor })
        : undefined;
    return { open, dots, label, connectors, ghostCount, caption };
  }, [
    playOrder,
    fretStart,
    fretEnd,
    unusedStrings,
    name,
    tonicPc,
    activeIndex,
    labelMode,
    showOctave,
    ghosts,
  ]);

  const small = size === 'sm';
  const diagram = (
    <FretDiagram
      startFret={fretStart}
      rows={fretEnd - fretStart + 1}
      muted={unusedStrings}
      open={model.open}
      dots={model.dots}
      keyColor={keyColor}
      title={name}
      caption={model.caption}
      size={size}
      mirrored={mirrored}
      ariaLabel={model.label}
      connectors={model.connectors}
      ghosts={ghosts}
    />
  );
  if (model.ghostCount === 0 && !about?.length) return diagram;
  return (
    <div data-scale-box className="inline-flex flex-col items-center gap-1">
      {diagram}
      <div className="flex items-center gap-1.5">
        {model.ghostCount > 0 && (
          <span
            data-ghost-legend
            aria-hidden
            className={`inline-flex items-center gap-1 ${small ? 'text-[10px]' : 'text-xs'}`}
            style={{ color: 'var(--color-text-dim, #9a9aab)' }}
          >
            <svg width={10} height={10} viewBox="-5 -5 10 10">
              <circle
                r={4}
                fill="none"
                stroke={DIAGRAM_INK}
                strokeOpacity={0.6}
                strokeDasharray="1.6 1.6"
              />
            </svg>
            {theoryString('ghost.label')}
          </span>
        )}
        {about && about.length > 0 && (
          <TheoryInfoButton
            label={`About the ${name}`}
            heading={name}
            notes={about}
            size={size}
          />
        )}
      </div>
    </div>
  );
});
