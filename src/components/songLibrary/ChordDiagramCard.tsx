/* eslint-disable import/order, react/jsx-sort-props, tailwindcss/classnames-order, tailwindcss/enforces-shorthand, tailwindcss/no-custom-classname, tailwindcss/migration-from-tailwind-2 */
import { type FC, type ReactNode } from 'react';
import { getChordColorFromNotes } from '@prism/engine';
import type { SongMode } from '@/curriculum/types/songLibrary';
import { chordNameToMidi } from '@/curriculum/songLibrary/chordParser';
import { PianoKeyboard } from '@/components/PianoKeyboard/PianoKeyboard';
import type { PlaybackEvent } from '@/contexts/PlaybackContext';

/**
 * The chord diagram a student sees when they click a chord in a chart:
 * a two-octave keyboard with the chord tones lit in the key colour, and the
 * note names as pills beneath.
 *
 * Extracted from ChordChart so the content back office can render the exact
 * same card while swapping the header for editable fields — the point of the
 * visual editor is that the admin edits what the student sees, so the two must
 * be one component rather than two that drift.
 */

export type ChordRgb = readonly [number, number, number];

/** Teal — matches the former hard-coded #7ecfcf. */
export const FALLBACK_CHORD_RGB: ChordRgb = [126, 207, 207];

const NOTE_NAMES = [
  'C',
  'C♯',
  'D',
  'E♭',
  'E',
  'F',
  'F♯',
  'G',
  'A♭',
  'A',
  'B♭',
  'B',
];

/** Spell a MIDI note the way the chord pills do, e.g. 63 → "E♭4". */
export const midiToNoteLabel = (midi: number) =>
  `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;

/** Map Song's SongMode to the Prism engine's parent-Ionian mode keys. */
export function normalizeMode(mode: SongMode): string {
  if (mode === 'major') return 'ionian';
  if (mode === 'minor') return 'aeolian';
  return mode;
}

/**
 * The Studio key-colour for a chord name, routed through MIDI so callers don't
 * have to translate the song's degree strings ('1 maj', '♭7 maj') into Studio's
 * format. Null when the name doesn't parse.
 */
export function chordRgbFor(
  chordName: string,
  keyRoot: number,
  mode: SongMode,
): ChordRgb | null {
  const midis = chordNameToMidi(chordName);
  if (midis.length === 0) return null;
  const [r, g, b] = getChordColorFromNotes(midis, keyRoot, normalizeMode(mode));
  return [r, g, b] as const;
}

const midiToPlaybackEvents = (midis: number[]): PlaybackEvent[] =>
  midis.map((midi, i) => ({
    id: `chord-${midi}-${i}`,
    type: 'note' as const,
    midi,
    time: 0,
    duration: 1,
    velocity: 0.8,
  }));

export const ChordDiagramCard: FC<{
  /** Chord tones, as MIDI note numbers. */
  midi: number[];
  /** Key colour for the lit keys and pills. Falls back to teal. */
  rgb?: ChordRgb | null;
  /** The title block. The chart passes text; the editor passes inputs. */
  header: ReactNode;
  /** Extra controls under the note pills. Editor-only in practice. */
  footer?: ReactNode;
  className?: string;
}> = ({ midi, rgb, header, footer, className }) => {
  const [r, g, b] = rgb ?? FALLBACK_CHORD_RGB;
  const keyColor = `rgb(${r}, ${g}, ${b})`;
  const pillBg = `rgba(${r}, ${g}, ${b}, 0.18)`;

  return (
    <div
      className={`rounded-2xl max-w-md w-full overflow-hidden ${className ?? ''}`}
      style={{
        background: 'var(--color-surface, #1a1a1a)',
        border: '1px solid var(--color-border, rgba(255,255,255,0.08))',
      }}
    >
      <div className="px-5 pt-5 pb-3">{header}</div>

      <div className="px-3 pb-5" style={{ height: 120 }}>
        <PianoKeyboard
          startC={4}
          endC={6}
          playingNotes={midiToPlaybackEvents(midi)}
          activeWhiteKeyColor={keyColor}
          activeBlackKeyColor={keyColor}
          enableClick={false}
        />
      </div>

      <div className="px-5 pb-4 flex gap-2 flex-wrap">
        {midi.length === 0 ? (
          <span className="text-xs text-white/30">
            Chord name doesn’t resolve to any notes.
          </span>
        ) : (
          midi.map((m) => (
            <span
              key={m}
              className="rounded-full text-xs px-2 py-0.5"
              style={{ background: pillBg, color: keyColor }}
            >
              {midiToNoteLabel(m)}
            </span>
          ))
        )}
      </div>

      {footer}
    </div>
  );
};
