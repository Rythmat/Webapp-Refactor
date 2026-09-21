import { Redo2, Undo2 } from 'lucide-react';
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
  onDuration: (choice: DurationChoice) => void;
  onToggleDot: () => void;
  onArticulation: (kind: ArticulationKind) => void;
  onSlur: () => void;
}

export function NoteEditorBar({
  hasNotes,
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

  const cellStyle = (active: boolean) => ({
    borderColor: active
      ? 'var(--color-accent, #7ecfcf)'
      : 'var(--color-border)',
    background: active
      ? 'color-mix(in srgb, var(--color-accent, #7ecfcf) 22%, transparent)'
      : 'var(--color-surface-2)',
    color: 'var(--color-text)',
    opacity: hasNotes ? 1 : 0.45,
    cursor: hasNotes ? 'pointer' : 'default',
  });

  const glyph = (text: string, size = 22, lift = 3) => (
    <span
      style={{
        fontFamily: fontReady ? 'Bravura' : 'serif',
        fontSize: size,
        lineHeight: 1,
        transform: `translateY(${lift}px)`,
      }}
    >
      {text}
    </span>
  );

  return (
    <div
      className="flex shrink-0 items-start gap-3 px-1"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
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
                    ? 'var(--color-accent, #7ecfcf)'
                    : 'var(--color-border)',
                  background: live
                    ? 'color-mix(in srgb, var(--color-accent, #7ecfcf) 22%, transparent)'
                    : 'transparent',
                  color: live ? 'var(--color-text)' : 'var(--color-text-dim)',
                }}
              >
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{
                    background: live
                      ? 'var(--color-accent, #7ecfcf)'
                      : 'var(--color-border)',
                  }}
                />
                {name}
              </button>

              <div className="flex items-center gap-1">
                {DURATIONS.map((choice) => (
                  <button
                    key={`${id}-${choice.key}`}
                    onClick={() => {
                      if (!hasNotes) return;
                      onLayer(id);
                      onDuration(choice);
                    }}
                    title={`${choice.name} ${name.toLowerCase()} (${choice.key})`}
                    className="flex h-7 min-w-8 items-center justify-center rounded border px-1 transition-colors hover:bg-white/10"
                    style={cellStyle(
                      live && currentDuration?.key === choice.key,
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
                    onClick={() => hasNotes && onToggleDot()}
                    title="Augmentation dot"
                    className="flex h-7 min-w-8 items-center justify-center rounded border px-1 text-xs font-semibold transition-colors hover:bg-white/10"
                    style={cellStyle(dotted)}
                  >
                    .
                  </button>
                )}
              </div>

              {id === 'slashes' && (
                <span
                  className="ml-auto pl-3 text-[10px]"
                  style={{ color: 'var(--color-text-dim)' }}
                >
                  {hasNotes
                    ? 'Numbers write into the live row · . > - _ mark · S slurs'
                    : 'Select a note to edit it'}
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
        style={{ borderLeft: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-2 px-3 py-1">
          <span
            className="flex h-6 w-[126px] shrink-0 items-center gap-1.5 rounded border px-2 text-[10px] font-semibold uppercase"
            style={{
              borderColor: 'var(--color-border)',
              background: 'transparent',
              color: 'var(--color-text-dim)',
            }}
          >
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ background: 'var(--color-border)' }}
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
                borderColor: 'var(--color-border)',
                background: 'var(--color-surface-2)',
                color: 'var(--color-text)',
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
                borderColor: 'var(--color-border)',
                background: 'var(--color-surface-2)',
                color: 'var(--color-text)',
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
              borderColor: 'var(--color-border)',
              background: 'transparent',
              color: 'var(--color-text-dim)',
            }}
          >
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ background: 'var(--color-border)' }}
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
            style={{ color: 'var(--color-text-dim)' }}
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
            <span style={{ fontFamily: 'serif', fontWeight: 700 }}>C7</span>
            Chord
          </button>
        </div>
      </div>
    </div>
  );
}
