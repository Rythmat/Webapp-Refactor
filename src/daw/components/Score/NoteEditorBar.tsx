import { Pencil, Redo2, Undo2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { loadVexFlow } from '@/components/notation/StaffView';
import {
  ACCIDENTALS,
  ARTICULATIONS,
  DURATIONS,
  REST_GLYPHS,
  type ArticulationKind,
  type DurationChoice,
  type NoteLayer,
} from './noteEditor';

// ── Note editor ────────────────────────────────────────────────────────────
// Three rows of the same rhythms: notes, the rests that match them, and the
// slashes of rhythmic notation. The button at the left of each row makes that
// row the one in use, so a number key writes a note, a rest or a slash
// depending on which layer is live.

const LAYERS: Array<{ id: NoteLayer; name: string; hotkey: string }> = [
  { id: 'notes', name: 'Notes', hotkey: '⌥N' },
  { id: 'rests', name: 'Rests', hotkey: '⌥R' },
  { id: 'slashes', name: 'Rhythmic', hotkey: '⌥H' },
];

/** The arc both a tie and a slur draw; the slur's spans further. */
function CurveIcon({ dashed }: { dashed: boolean }) {
  return (
    <svg width="22" height="12" viewBox="0 0 22 12" aria-hidden>
      <path
        d={dashed ? 'M 2 9 Q 11 -1 20 9' : 'M 4 9 Q 11 2 18 9'}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      {!dashed && (
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

export interface NoteEditorBarProps {
  /** Notes are selected; without any, the cells do nothing. */
  hasNotes: boolean;
  /**
   * Note input is on: a click on a staff writes a note. The Notes row then
   * picks the length the next note is written with, selection or not.
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
  /** A beat — note, rest or slash — is selected to write a chord over. */
  canAddChord: boolean;
  onAddChord: () => void;
  /** The accidental every selected note carries, when they agree. */
  currentAccidental: number | null;
  onAccidental: (alteration: number) => void;
  /** Undo and redo act on the project, so they stand apart from the rest. */
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  /**
   * Apply a length in `layer`'s row. The row is passed along with it because
   * a cell click also makes its row live, and that change has not reached the
   * caller yet when the length is applied.
   */
  onDuration: (choice: DurationChoice, layer: NoteLayer) => void;
  /** Toggle the dot on `layer`'s lengths, for the same reason as onDuration. */
  onToggleDot: (layer: NoteLayer) => void;
  onArticulation: (kind: ArticulationKind) => void;
  onSlur: () => void;
}

export function NoteEditorBar({
  hasNotes,
  noteInput = false,
  onToggleNoteInput,
  inputDuration,
  layer,
  onLayer,
  currentDuration,
  dotted,
  activeArticulations,
  slurred,
  canTie,
  onTie,
  canAddChord,
  onAddChord,
  currentAccidental,
  onAccidental,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onDuration,
  onToggleDot,
  onArticulation,
  onSlur,
}: NoteEditorBarProps) {
  const [fontReady, setFontReady] = useState(false);
  useEffect(() => {
    let alive = true;
    loadVexFlow().then(
      () => alive && setFontReady(true),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, []);

  const cellStyle = (active: boolean, enabled = hasNotes) => ({
    borderColor: active ? 'var(--daw-accent)' : 'var(--daw-hairline)',
    background: active
      ? 'color-mix(in srgb, var(--daw-accent) 22%, transparent)'
      : 'var(--daw-surface-2)',
    color: 'var(--daw-text)',
    opacity: enabled ? 1 : 0.45,
    cursor: enabled ? 'pointer' : 'default',
  });
  // In note input the Notes row sets the next note's length, so its cells
  // work with nothing selected and show the length that will be written.
  const lengthPicks = (id: NoteLayer) => noteInput && id === 'notes';
  const lengthName = `${dotted ? 'dotted ' : ''}${inputDuration?.name.toLowerCase() ?? 'note'}`;
  const inputLength = `${/^[aeiou]/.test(lengthName) ? 'an' : 'a'} ${lengthName}`;

  const glyph = (text: string, size = 22, lift = 3) => (
    <span
      style={{
        fontFamily: fontReady ? 'Bravura' : 'serif',
        fontSize: size,
        lineHeight: 1,
        transform: `translateY(${lift}px)`,
        // A music font's ascent and descent make the glyph's text box over
        // two rows tall, and the row below, drawn later, took the clicks
        // aimed at this one: a click on a note value wrote a rest. The click
        // belongs to the cell under the pointer.
        pointerEvents: 'none',
      }}
    >
      {text}
    </span>
  );

  return (
    <div
      className="flex shrink-0 items-start gap-3 px-1"
      style={{ borderBottom: '1px solid var(--daw-hairline)' }}
    >
      {/* Note input, MuseScore's N: on, a click on a staff adds a note. */}
      {onToggleNoteInput && (
        <div className="flex shrink-0 self-stretch py-1 pl-2">
          <button
            data-tutorial-id="score-note-input"
            onClick={onToggleNoteInput}
            aria-pressed={noteInput}
            title={
              noteInput
                ? 'Stop adding notes (N or Esc). Shift+click or Shift+A–G adds to a chord.'
                : 'Add notes: click a staff to write one, or type A–G (N)'
            }
            className="flex w-[76px] flex-col items-center justify-center gap-1 rounded border px-1 text-[11px] font-semibold uppercase leading-tight tracking-wider transition-colors hover:bg-white/10"
            style={{
              borderColor: noteInput
                ? 'var(--daw-accent)'
                : 'var(--daw-hairline)',
              background: noteInput
                ? 'color-mix(in srgb, var(--daw-accent) 22%, transparent)'
                : 'var(--daw-surface-2)',
              color: 'var(--daw-text)',
            }}
          >
            <Pencil className="size-4" aria-hidden />
            Add notes
            <span style={{ color: 'var(--daw-text-3)' }}>
              {noteInput ? 'On · Esc' : 'N'}
            </span>
          </button>
        </div>
      )}

      {/* Left: the three rows you write into. */}
      <div className="flex shrink-0 flex-col">
        {LAYERS.map(({ id, name, hotkey }) => {
          const live = layer === id;
          return (
            <div key={id} className="flex items-center gap-2 px-3 py-1">
              <button
                onClick={() => onLayer(id)}
                title={`Write ${name.toLowerCase()} (${hotkey})`}
                aria-pressed={live}
                className="flex h-6 w-[86px] shrink-0 items-center gap-1.5 rounded border px-2 text-[10px] font-semibold uppercase tracking-wider transition-colors"
                style={{
                  borderColor: live
                    ? 'var(--daw-accent)'
                    : 'var(--daw-hairline)',
                  background: live
                    ? 'color-mix(in srgb, var(--daw-accent) 22%, transparent)'
                    : 'transparent',
                  color: live ? 'var(--daw-text)' : 'var(--daw-text-3)',
                }}
              >
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{
                    background: live
                      ? 'var(--daw-accent)'
                      : 'var(--daw-hairline)',
                  }}
                />
                {name}
              </button>

              <div className="flex items-center gap-1">
                {DURATIONS.map((choice) => (
                  <button
                    key={`${id}-${choice.key}`}
                    onClick={() => {
                      if (!hasNotes && !lengthPicks(id)) return;
                      onLayer(id);
                      onDuration(choice, id);
                    }}
                    title={`${choice.name} ${name.toLowerCase()} (${choice.key})`}
                    aria-pressed={
                      lengthPicks(id)
                        ? inputDuration?.key === choice.key
                        : undefined
                    }
                    className="flex h-7 min-w-8 items-center justify-center rounded border px-1 transition-colors hover:bg-white/10"
                    style={cellStyle(
                      lengthPicks(id)
                        ? inputDuration?.key === choice.key
                        : live && currentDuration?.key === choice.key,
                      hasNotes || lengthPicks(id),
                    )}
                  >
                    {id === 'notes' && glyph(choice.glyph)}
                    {id === 'rests' && glyph(REST_GLYPHS[choice.key], 20, 4)}
                    {id === 'slashes' && (
                      <SlashGlyph quarters={choice.quarters} />
                    )}
                  </button>
                ))}
                {id === 'notes' && (
                  <button
                    onClick={() => {
                      if (!hasNotes && !noteInput) return;
                      // The dot follows the live row, so a slash stays a
                      // slash. Rests are the exception: a dotted rest there
                      // would delete the selected notes, so with Rests live
                      // the dot goes to the notes, the row it sits in.
                      const into = layer === 'rests' ? 'notes' : layer;
                      onLayer(into);
                      onToggleDot(into);
                    }}
                    title="Augmentation dot"
                    className="flex h-7 min-w-8 items-center justify-center rounded border px-1 text-xs font-semibold transition-colors hover:bg-white/10"
                    style={cellStyle(dotted, hasNotes || noteInput)}
                  >
                    .
                  </button>
                )}
              </div>

              {id === 'slashes' && (
                <span
                  className="ml-auto pl-3 text-[10px]"
                  style={{ color: 'var(--daw-text-3)' }}
                >
                  {noteInput
                    ? `Click a staff, or type A–G, to add ${inputLength}`
                    : hasNotes
                      ? 'Numbers write into the live row · . > - _ mark · S slurs'
                      : 'Select a note to edit it, or press Add notes'}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Right: what marks the notes already written. These are not rows you
          write into, so they carry a plain label rather than the live-row
          button the three layers use. */}
      <div
        className="flex min-w-0 flex-1 flex-col"
        style={{ borderLeft: '1px solid var(--daw-hairline)' }}
      >
        <div className="flex items-center gap-2 px-3 py-1">
          <span
            className="flex h-6 w-[126px] shrink-0 items-center gap-1.5 rounded border px-2 text-[10px] font-semibold uppercase"
            style={{
              borderColor: 'var(--daw-hairline)',
              background: 'transparent',
              color: 'var(--daw-text-3)',
            }}
          >
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ background: 'var(--daw-hairline)' }}
            />
            Articulations
          </span>
          <div className="flex shrink-0 items-center gap-1">
            {ARTICULATIONS.map((articulation) => (
              <button
                key={articulation.kind}
                onClick={() => hasNotes && onArticulation(articulation.kind)}
                title={`${articulation.name} (${articulation.keyLabel})`}
                className="flex h-7 min-w-7 items-center justify-center rounded border px-1 transition-colors hover:bg-white/10"
                style={cellStyle(activeArticulations.has(articulation.kind))}
              >
                {glyph(articulation.glyph, 18, 2)}
              </button>
            ))}
            <div className="h-5 w-px shrink-0 bg-white/10" />
            {/* Tie and slur look alike and mean different things, so
                    they sit together and say which is which. */}
            <button
              onClick={() => canTie && onTie()}
              title={
                canTie
                  ? 'Tie — hold this pitch through what follows (T)'
                  : 'Tie — needs the same pitch next, or a rest to fill'
              }
              className="flex h-7 items-center gap-1 rounded border px-2 text-[10px] font-semibold uppercase tracking-wider transition-colors hover:bg-white/10"
              style={{
                ...cellStyle(false),
                opacity: canTie ? 1 : 0.45,
                cursor: canTie ? 'pointer' : 'default',
              }}
            >
              <CurveIcon dashed={false} />
              Tie
            </button>
            <button
              onClick={() => hasNotes && onSlur()}
              title="Slur — play the notes legato (S)"
              className="flex h-7 items-center gap-1 rounded border px-2 text-[10px] font-semibold uppercase tracking-wider transition-colors hover:bg-white/10"
              style={cellStyle(slurred)}
            >
              <CurveIcon dashed />
              Slur
            </button>
          </div>

          {/* Undo and redo sit apart at the far right: they act on the
                  whole project, not on whatever is selected. */}
          <div className="ml-auto flex shrink-0 items-center gap-1 pl-3">
            <button
              onClick={() => canUndo && onUndo()}
              disabled={!canUndo}
              title="Undo (\u2318Z)"
              aria-label="Undo"
              className="flex size-7 items-center justify-center rounded border transition-colors hover:bg-white/10"
              style={{
                borderColor: 'var(--daw-hairline)',
                background: 'var(--daw-surface-2)',
                color: 'var(--daw-text)',
                opacity: canUndo ? 1 : 0.35,
                cursor: canUndo ? 'pointer' : 'default',
              }}
            >
              <Undo2 className="size-3.5" />
            </button>
            <button
              onClick={() => canRedo && onRedo()}
              disabled={!canRedo}
              title="Redo (\u21e7\u2318Z)"
              aria-label="Redo"
              className="flex size-7 items-center justify-center rounded border transition-colors hover:bg-white/10"
              style={{
                borderColor: 'var(--daw-hairline)',
                background: 'var(--daw-surface-2)',
                color: 'var(--daw-text)',
                opacity: canRedo ? 1 : 0.35,
                cursor: canRedo ? 'pointer' : 'default',
              }}
            >
              <Redo2 className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1">
          <span
            className="flex h-6 w-[126px] shrink-0 items-center gap-1.5 rounded border px-2 text-[10px] font-semibold uppercase"
            style={{
              borderColor: 'var(--daw-hairline)',
              background: 'transparent',
              color: 'var(--daw-text-3)',
            }}
          >
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ background: 'var(--daw-hairline)' }}
            />
            Accidentals
          </span>
          <div className="flex items-center gap-1">
            {ACCIDENTALS.map((accidental) => (
              <button
                key={accidental.kind}
                onClick={() => hasNotes && onAccidental(accidental.alteration)}
                title={`${accidental.name} — raises or lowers the selected note`}
                className="flex h-7 min-w-8 items-center justify-center rounded border px-1 transition-colors hover:bg-white/10"
                style={cellStyle(
                  currentAccidental === accidental.alteration && hasNotes,
                )}
              >
                {glyph(accidental.glyph, 20, 4)}
              </button>
            ))}
          </div>
          <span
            className="ml-auto pl-3 text-[10px]"
            style={{ color: 'var(--daw-text-3)' }}
          >
            {hasNotes
              ? 'Written on the note, which moves a semitone to match'
              : 'Select a note to write an accidental on it'}
          </span>
        </div>

        {/* A chord symbol names the harmony over a beat rather than marking a
          note, so it stands on its own below the accidentals. */}
        <div className="flex items-center gap-2 px-3 py-1">
          <button
            onClick={() => canAddChord && onAddChord()}
            title={
              canAddChord
                ? 'Add a chord symbol over this beat (K)'
                : 'Add chord symbol — select a note, rest or slash'
            }
            className="flex h-7 items-center gap-1 rounded border px-2 text-[10px] font-semibold uppercase tracking-wider transition-colors hover:bg-white/10"
            style={{
              ...cellStyle(false),
              opacity: canAddChord ? 1 : 0.45,
              cursor: canAddChord ? 'pointer' : 'default',
            }}
          >
            <span
              style={{
                fontFamily: "'Glacial Indifference', system-ui, sans-serif",
                fontWeight: 700,
              }}
            >
              C7
            </span>
            Chord
          </button>
        </div>
      </div>
    </div>
  );
}
