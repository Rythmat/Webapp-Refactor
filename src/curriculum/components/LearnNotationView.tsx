import { useMemo, useState, type ReactNode } from 'react';
import { CountOff, countOffBeatIndex } from '@/components/notation/CountOff';
import { GrandStaff } from '@/components/notation/GrandStaff';
import type { StaffLayout } from '@/components/notation/StaffView';
import { pitchNameToMidi } from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import {
  buildScore,
  resolveStaves,
  type NotationNoteInput,
} from '@/lib/notation';
import { ChordSymbolOverlay } from '../notation/ChordSymbolOverlay';
import type { LessonChordSymbol } from '../notation/lessonChordSymbols';
import type { NoteEvent, NoteHoldMeta } from './GenrePianoRoll';
import { learnNoteStyles } from './learnNoteStyles';

// ── Learn: lesson notes on the grand staff ─────────────────────────────────
// The notation face of GenrePianoRoll. The roll keeps running the lesson
// (playhead, hold tracking); this only draws what it would show: the lesson's
// own spelling, hand tags for the staves, and the same progress colors.

const HEADER_HEIGHT = 34;

interface LearnNotationViewProps {
  events: NoteEvent[];
  bars: number;
  beatsPerBar: number;
  keyRoot?: number;
  keyColor?: string;
  inTime: boolean;
  playheadTick: number;
  /** Lead-in before bar 1, in ticks; 0 when there is no count-off. */
  countInTicks?: number;
  /** Ticks in one beat, for counting the lead-in. */
  beatTicks?: number;
  /** Where bar 1 sits on the playhead's scale; 0 unless notes are offset. */
  musicStartTick?: number;
  /**
   * Which staves to write on. A melody belongs in the treble clef whatever
   * register it happens to dip into, so lessons name the clef rather than
   * letting the grand-staff split guess from pitch. Defaults to the split.
   */
  staves?: 'grand' | 'treble' | 'bass';
  /**
   * Octaves to write above the sounding pitch. Guitar is written an octave up
   * (with an 8 under the clef), so its lessons pass 1; the notes stay the same.
   */
  writtenOctaveShift?: number;
  /** The 8 under the clef that marks a part written an octave up. */
  clefAnnotation?: '8vb';
  noteHoldMeta?: Record<string, NoteHoldMeta>;
  performanceMeta?: Record<string, { startTick: number; endTick?: number }>;
  /** Total height, matching the roll it replaces. */
  height: number;
  /** Chord symbols to draw above the staff, one per harmonic change. */
  chordSymbols?: readonly LessonChordSymbol[];
  toggle: ReactNode;
}

export function LearnNotationView({
  events,
  bars,
  beatsPerBar,
  keyRoot,
  keyColor,
  inTime,
  playheadTick,
  countInTicks = 0,
  beatTicks = 480,
  musicStartTick = 0,
  staves,
  writtenOctaveShift = 0,
  clefAnnotation,
  noteHoldMeta,
  performanceMeta,
  height,
  chordSymbols,
  toggle,
}: LearnNotationViewProps) {
  const [layout, setLayout] = useState<StaffLayout | null>(null);
  // Rebuild only when the notes themselves change, not on every playhead frame.
  const signature = events
    .map(
      (e) =>
        `${e.id}|${e.midi}|${e.pitchName}|${e.startTicks}|${e.durationTicks}|${e.hand ?? ''}`,
    )
    .join(';');
  const score = useMemo(() => {
    const notes: NotationNoteInput[] = [];
    for (const e of events) {
      const midi = e.midi ?? pitchNameToMidi(e.pitchName);
      if (midi == null) continue;
      notes.push({
        id: e.id,
        // The name keeps its letter; buildScore takes the octave from midi.
        midi: midi + 12 * writtenOctaveShift,
        name: e.pitchName,
        startTick: e.startTicks,
        durationTicks: e.durationTicks,
        ...(e.hand ? { staff: e.hand === 'rh' ? 'treble' : 'bass' } : {}),
      });
    }
    // A hand-tagged part is a two-hand part: grand staff, whatever clef the
    // caller preferred. See lib/notation/handSplit.ts.
    const resolved = resolveStaves(events, staves);
    return buildScore(notes, {
      timeSignature: [beatsPerBar, 4],
      minMeasures: bars,
      ...(keyRoot !== undefined ? { keyTonicPc: keyRoot % 12 } : {}),
      ...(resolved ? { staves: resolved } : {}),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `signature` stands for `events`
  }, [signature, bars, beatsPerBar, keyRoot, staves, writtenOctaveShift]);

  const noteStyles = useMemo(
    () =>
      learnNoteStyles(events, {
        inTime,
        performanceMeta,
        noteHoldMeta,
        playheadTick,
        keyColor,
      }),
    [events, inTime, performanceMeta, noteHoldMeta, playheadTick, keyColor],
  );

  // The staff has no playhead running up to the first note, so the lead-in is
  // counted underneath it instead.
  const countInBeat = inTime
    ? countOffBeatIndex(playheadTick, countInTicks, beatTicks, musicStartTick)
    : null;

  return (
    <div
      className="flex w-full flex-col overflow-hidden rounded-xl"
      style={{
        height,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div
        className="relative z-30 flex shrink-0 items-center gap-2 px-2"
        style={{
          height: HEADER_HEIGHT,
          background: 'rgba(25,25,25,0.95)',
          borderBottom: '1px solid rgba(120,120,120,0.25)',
        }}
      >
        {toggle}
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <GrandStaff
          score={score}
          clefAnnotation={clefAnnotation}
          noteStyles={noteStyles}
          playheadTick={inTime && playheadTick >= 0 ? playheadTick : null}
          fitHeight
          // The roll scrolls sideways; the staff must not. Bars wrap onto as
          // many systems as they need and the whole thing shrinks to fit the
          // height, so nothing runs off the right edge where it cannot be
          // reached. It also reads the way sheet music does — to the end of
          // the line, then down and back to the left.
          wrapToFit
          className="min-h-0 flex-1 px-2 pt-2"
          {...(chordSymbols?.length
            ? {
                onLayout: setLayout,
                overlay: (
                  <ChordSymbolOverlay symbols={chordSymbols} layout={layout} />
                ),
              }
            : {})}
        />
        <CountOff beatIndex={countInBeat} beatsPerBar={beatsPerBar} />
      </div>
    </div>
  );
}
