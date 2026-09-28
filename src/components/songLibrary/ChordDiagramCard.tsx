/* eslint-disable import/order, react/jsx-sort-props, tailwindcss/classnames-order, tailwindcss/enforces-shorthand, tailwindcss/no-custom-classname, tailwindcss/migration-from-tailwind-2 */
import { useMemo, type FC, type ReactNode } from 'react';
import { midiNameInKey } from '@prism/engine';
import type { SongMode } from '@/curriculum/types/songLibrary';
import {
  chordRgbFor,
  normalizeMode,
  type ChordRgb,
} from '@/curriculum/songLibrary/chordColor';
import { PianoKeyboard } from '@/components/PianoKeyboard/PianoKeyboard';
import type { PlaybackEvent } from '@/contexts/PlaybackContext';
import { Piano } from 'lucide-react';
import { GrandStaff } from '@/components/notation/GrandStaff';
import { RollViewToggle } from '@/components/notation/RollViewToggle';
import { buildScore } from '@/lib/notation';
import { useRollView } from '@/lib/notation/viewPreference';

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

// The colour helpers live in a plain module; re-exported for existing callers.
export { chordRgbFor, normalizeMode };
export type { ChordRgb };

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
  /** The key this chord is heard in, for the staff's signature and spelling. */
  keyTonicPc?: number | null;
  mode?: SongMode;
  /** The title block. The chart passes text; the editor passes inputs. */
  header: ReactNode;
  /** Extra controls under the note pills. Editor-only in practice. */
  footer?: ReactNode;
  className?: string;
}> = ({ midi, rgb, keyTonicPc, mode, header, footer, className }) => {
  const [r, g, b] = rgb ?? FALLBACK_CHORD_RGB;
  const keyColor = `rgb(${r}, ${g}, ${b})`;
  const pillBg = `rgba(${r}, ${g}, ${b}, 0.18)`;
  const [view, setView] = useRollView('songs');

  // The chord on a staff: one clef, since a song chord is four notes or
  // fewer, and spelled in the key it sounds in so the staff and the pills
  // below it cannot disagree (B♭, never A♯, in a flat key).
  const score = useMemo(() => {
    const spell =
      keyTonicPc == null
        ? undefined
        : (m: number) =>
            midiNameInKey(
              m,
              keyTonicPc,
              mode ? normalizeMode(mode) : undefined,
            );
    return buildScore(
      midi.map((m, i) => ({
        id: `n${i}`,
        midi: m,
        startTick: 0,
        durationTicks: 1920,
        ...(spell ? { name: spell(m) } : {}),
      })),
      {
        staves: 'treble',
        minMeasures: 1,
        timeSignature: [4, 4] as [number, number],
        ...(keyTonicPc == null ? {} : { keyTonicPc }),
      },
    );
  }, [midi, keyTonicPc, mode]);

  return (
    <div
      className={`rounded-2xl max-w-md w-full overflow-hidden ${className ?? ''}`}
      style={{
        background: 'var(--color-surface, #1a1a1a)',
        border: '1px solid var(--color-border, rgba(255,255,255,0.08))',
      }}
    >
      <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
        <div className="min-w-0">{header}</div>
        {midi.length > 0 && (
          <RollViewToggle
            view={view}
            onChange={setView}
            iconicIcon={Piano}
            iconicLabel="Keyboard"
          />
        )}
      </div>

      <div className="px-3 pb-5" style={{ height: 120 }}>
        {view === 'notation' && midi.length > 0 ? (
          <GrandStaff score={score} fitHeight className="h-full" />
        ) : (
          <PianoKeyboard
            startC={4}
            endC={6}
            playingNotes={midiToPlaybackEvents(midi)}
            activeWhiteKeyColor={keyColor}
            activeBlackKeyColor={keyColor}
            enableClick={false}
          />
        )}
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
