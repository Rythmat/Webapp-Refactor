import type { ReactNode } from 'react';
import {
  ACCIDENTALS,
  ARTICULATIONS,
  DURATIONS,
  REST_GLYPHS,
  type ArticulationKind,
  type DurationChoice,
  type NoteLayer,
} from './noteEditor';

// ── The note palettes ──────────────────────────────────────────────────────
// What the note editor's toolbar row above the staff held, as palettes in
// the Palettes panel (owner, 2026-10-16): Notes, Rests and Rhythmic (the same
// lengths written as notes, rests or slashes), Articulations with Tie and
// Slur, Accidentals, and the chord symbol (in Text). Notes, Rests and
// Rhythmic each have a Write switch, and the live one is where a number key
// writes; a click on one of their cells makes it live and applies the
// length in the same tick. Undo and Redo left with the row: the top bar has
// them. Add notes (N, MuseScore's note input) sits above the palettes: on, a
// click on a staff writes a note of the Notes palette's length.

/** The note editor's state and actions (useScoreEditing's `editor`). */
export interface NoteTools {
  /** Notes are selected; without any, the cells do nothing. */
  hasNotes: boolean;
  /**
   * Note input is on (MuseScore's N): a click on a staff writes a note. The
   * Notes palette then picks the length the next note is written with,
   * selection or not.
   */
  noteInput?: boolean;
  onToggleNoteInput?: () => void;
  /** The length note input writes. */
  inputDuration?: DurationChoice;
  layer: NoteLayer;
  onLayer: (layer: NoteLayer) => void;
  /** The length of the selection, when they all share one. */
  currentDuration: DurationChoice | null;
  dotted: boolean;
  /** Marks every selected note carries. */
  activeArticulations: ReadonlySet<ArticulationKind>;
  slurred: boolean;
  /** A tie is possible: two or more notes of one pitch are selected. */
  canTie: boolean;
  onTie: () => void;
  /** A beat (note, rest or slash) is selected to write a chord over. */
  canAddChord: boolean;
  onAddChord: () => void;
  /** The accidental every selected note carries, when they agree. */
  currentAccidental: number | null;
  onAccidental: (alteration: number) => void;
  /**
   * Apply a length in `layer`. The layer is passed along because a cell
   * click also makes its palette live, and that change has not reached the
   * caller yet when the length is applied.
   */
  onDuration: (choice: DurationChoice, layer: NoteLayer) => void;
  /** Toggle the dot on `layer`'s lengths, for the same reason. */
  onToggleDot: (layer: NoteLayer) => void;
  onArticulation: (kind: ArticulationKind) => void;
  onSlur: () => void;
}

/** One cell of a palette. */
export interface PaletteCell {
  key: string;
  /** Its name, for the search. */
  name: string;
  /** The tooltip: the name, its key, and what it needs. */
  title: string;
  content: ReactNode;
  /** It can be applied now (something it applies to is selected). */
  live: boolean;
  /** What is selected already has it. */
  active?: boolean;
  onClick: () => void;
}

/** A Write switch in a palette's header: makes that layer the live one. */
export interface PaletteSwitch {
  label: string;
  on: boolean;
  onClick: () => void;
}

export interface ToolPalette {
  id: string;
  name: string;
  /** Cells sit over a five-line staff, as MuseScore draws them. */
  staff: boolean;
  cells: PaletteCell[];
  write?: PaletteSwitch;
}

const LAYERS: Array<{ id: NoteLayer; name: string; hotkey: string }> = [
  { id: 'notes', name: 'Notes', hotkey: '⌥N' },
  { id: 'rests', name: 'Rests', hotkey: '⌥R' },
  { id: 'slashes', name: 'Rhythmic', hotkey: '⌥H' },
];

/**
 * A music-font glyph. A music font's ascent and descent make the glyph's
 * text box much taller than the glyph, and a box from one cell took the
 * clicks aimed at the cell beside it, so the click always belongs to the
 * cell under the pointer.
 */
export function Glyph({
  text,
  fontReady,
  size = 22,
  lift = 3,
}: {
  text: string;
  fontReady: boolean;
  size?: number;
  lift?: number;
}) {
  return (
    <span
      className="relative"
      style={{
        fontFamily: fontReady ? 'Bravura' : 'serif',
        fontSize: size,
        lineHeight: 1,
        transform: `translateY(${lift}px)`,
        pointerEvents: 'none',
      }}
    >
      {text}
    </span>
  );
}

/** The arc both a tie and a slur draw; the slur's spans further. */
function CurveIcon({ slur }: { slur: boolean }) {
  return (
    <svg width="24" height="14" viewBox="0 0 22 12" aria-hidden>
      <path
        d={slur ? 'M 2 9 Q 11 -1 20 9' : 'M 4 9 Q 11 2 18 9'}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      {!slur && (
        <>
          <circle cx="4" cy="10" r="1.6" fill="currentColor" />
          <circle cx="18" cy="10" r="1.6" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

/** A slash of the given duration, drawn rather than taken from the font. */
function SlashGlyph({ quarters }: { quarters: number }) {
  const hollow = quarters >= 2;
  const stem = quarters < 4;
  // An eighth has one flag, a sixteenth two, a thirty-second three.
  const flags = quarters <= 1 / 2 ? Math.round(Math.log2(1 / quarters)) : 0;
  return (
    <svg width="20" height="24" viewBox="0 0 20 24" aria-hidden>
      <path
        d="M 3 16 L 13 8 L 15 10 L 5 18 Z"
        fill={hollow ? 'none' : 'currentColor'}
        stroke="currentColor"
        strokeWidth={hollow ? 1.2 : 1}
      />
      {stem && (
        <line
          x1="14.5"
          y1="9.5"
          x2="14.5"
          y2="1"
          stroke="currentColor"
          strokeWidth={1.2}
        />
      )}
      {Array.from({ length: flags }).map((_, i) => (
        <path
          key={i}
          d={`M 14.5 ${1 + i * 3.5} q 4 2 3.5 6`}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.2}
        />
      ))}
    </svg>
  );
}

/** Notes, Rests, Rhythmic, Articulations and Accidentals, in that order. */
export function notePalettes(
  tools: NoteTools,
  fontReady: boolean,
): ToolPalette[] {
  const { hasNotes, layer } = tools;
  const noteInput = tools.noteInput ?? false;
  const lengths: ToolPalette[] = LAYERS.map(({ id, name, hotkey }) => {
    const live = layer === id;
    // In note input the Notes palette sets the next note's length, so its
    // cells work with nothing selected and show the length to be written.
    const picksLength = noteInput && id === 'notes';
    const cells: PaletteCell[] = DURATIONS.map((choice) => ({
      key: `${id}-${choice.key}`,
      name: `${choice.name} ${name.toLowerCase()}`,
      title: `${choice.name} ${name.toLowerCase()} (${choice.key})`,
      content:
        id === 'notes' ? (
          <Glyph text={choice.glyph} fontReady={fontReady} />
        ) : id === 'rests' ? (
          <Glyph
            text={REST_GLYPHS[choice.key]}
            fontReady={fontReady}
            size={20}
            lift={4}
          />
        ) : (
          <SlashGlyph quarters={choice.quarters} />
        ),
      live: hasNotes || picksLength,
      active: picksLength
        ? tools.inputDuration?.key === choice.key
        : live && tools.currentDuration?.key === choice.key,
      onClick: () => {
        tools.onLayer(id);
        tools.onDuration(choice, id);
      },
    }));
    if (id === 'notes') {
      cells.push({
        key: 'dot',
        name: 'Augmentation dot',
        title: 'Augmentation dot',
        content: (
          <span aria-hidden className="text-base font-bold leading-none">
            .
          </span>
        ),
        live: hasNotes || noteInput,
        active: tools.dotted,
        onClick: () => {
          // The dot follows the live layer, so a slash stays a slash. Rests
          // are the exception: a dotted rest there would delete the selected
          // notes, so with Rests live the dot goes to the notes.
          const into = layer === 'rests' ? 'notes' : layer;
          tools.onLayer(into);
          tools.onToggleDot(into);
        },
      });
    }
    return {
      id,
      name,
      staff: false,
      cells,
      write: {
        label: `Write ${name.toLowerCase()} (${hotkey})`,
        on: live,
        onClick: () => tools.onLayer(id),
      },
    };
  });

  const articulations: ToolPalette = {
    id: 'articulations',
    name: 'Articulations',
    staff: false,
    cells: [
      ...ARTICULATIONS.map((a) => ({
        key: a.kind,
        name: a.name,
        title: `${a.name} (${a.keyLabel})`,
        content: (
          <Glyph text={a.glyph} fontReady={fontReady} size={18} lift={2} />
        ),
        live: hasNotes,
        active: tools.activeArticulations.has(a.kind),
        onClick: () => tools.onArticulation(a.kind),
      })),
      // Tie and slur look alike and mean different things, so they sit
      // together and their names say which is which.
      {
        key: 'tie',
        name: 'Tie',
        title: tools.canTie
          ? 'Tie: hold this pitch through what follows (T)'
          : 'Tie: needs the same pitch next, or a rest to fill',
        content: <CurveIcon slur={false} />,
        live: tools.canTie,
        onClick: tools.onTie,
      },
      {
        key: 'slur',
        name: 'Slur',
        title: 'Slur: play the notes legato (S)',
        content: <CurveIcon slur />,
        live: hasNotes,
        active: tools.slurred,
        onClick: tools.onSlur,
      },
    ],
  };

  const accidentals: ToolPalette = {
    id: 'accidentals',
    name: 'Accidentals',
    staff: false,
    cells: ACCIDENTALS.map((a) => ({
      key: a.kind,
      name: a.name,
      title: `${a.name}: written on the note, which moves to match`,
      content: (
        <Glyph text={a.glyph} fontReady={fontReady} size={20} lift={4} />
      ),
      live: hasNotes,
      active: hasNotes && tools.currentAccidental === a.alteration,
      onClick: () => tools.onAccidental(a.alteration),
    })),
  };

  return [...lengths, articulations, accidentals];
}

/** The chord symbol, a cell of the Text palette. */
export function chordSymbolCell(tools: NoteTools): PaletteCell {
  return {
    key: 'chord',
    name: 'Chord symbol',
    title: tools.canAddChord
      ? 'Chord symbol over this beat (K)'
      : 'Chord symbol: select a note, rest or slash',
    content: (
      <span
        className="relative text-xs font-bold"
        style={{ fontFamily: "'Glacial Indifference', system-ui, sans-serif" }}
      >
        C7
      </span>
    ),
    live: tools.canAddChord,
    onClick: tools.onAddChord,
  };
}
