import { useEffect, useMemo, useState } from 'react';
import * as Tone from 'tone';
import {
  midiNameInKey,
  noteNameInKey,
  type MidiNoteEvent,
} from '@prism/engine';
import { CountOff, countOffBeatAtTime } from '@/components/notation/CountOff';
import { GrandStaff, type NoteStyle } from '@/components/notation/GrandStaff';
import { parseNoteName } from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import { useStore } from '@/daw/store';
import { buildScore, keyFifthsForTonic } from '@/lib/notation';

// ── Studio: a clip on the grand staff ──────────────────────────────────────
// Read-only notation of the clip being edited, spelled in the project key,
// barred and numbered as on the song timeline, following the transport.

const TICKS_PER_QUARTER = 480;
const MIN_BARS = 4;

interface StudioNotationViewProps {
  events: MidiNoteEvent[];
  /** Clip start on the song timeline; event ticks are relative to it. */
  timelineStartTick: number;
  clipStartTick: number;
  /** Indices of the notes selected in the roll, shown in the accent color. */
  selectedIndices?: ReadonlySet<number>;
  /** A drum clip: one drumset staff, placed by instrument instead of pitch. */
  percussion?: boolean;
}

export function StudioNotationView({
  events,
  timelineStartTick,
  clipStartTick,
  selectedIndices,
  percussion = false,
}: StudioNotationViewProps) {
  const rootNote = useStore((s) => s.rootNote);
  const mode = useStore((s) => s.mode);
  const numerator = useStore((s) => s.timeSignatureNumerator);
  const denominator = useStore((s) => s.timeSignatureDenominator);
  const position = useStore((s) => s.position);
  const isCountingIn = useStore((s) => s.isCountingIn);
  const countInBars = useStore((s) => s.countInBars);
  const countInStartedAt = useStore((s) => s.countInStartedAt);
  const bpm = useStore((s) => s.bpm);

  // The transport stays parked while the count-in runs, so the beat is read
  // off the audio clock the clicks were scheduled against.
  const [countInBeat, setCountInBeat] = useState<number | null>(null);
  useEffect(() => {
    if (!isCountingIn || countInStartedAt === null) {
      setCountInBeat(null);
      return;
    }
    const beatSeconds = (60 / bpm) * (4 / denominator);
    const totalBeats = countInBars * numerator;
    let raf = 0;
    const tick = () => {
      setCountInBeat(
        countOffBeatAtTime(
          Tone.now() - countInStartedAt,
          beatSeconds,
          totalBeats,
        ),
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [
    isCountingIn,
    countInStartedAt,
    bpm,
    countInBars,
    numerator,
    denominator,
  ]);

  const score = useMemo(() => {
    const ticksPerBar = ((TICKS_PER_QUARTER * 4) / denominator) * numerator;
    const firstBar = Math.floor(
      (timelineStartTick + clipStartTick) / ticksPerBar,
    );
    const tonic =
      rootNote === null || percussion
        ? null
        : parseNoteName(noteNameInKey(rootNote, rootNote, mode));
    return buildScore(
      events.map((ev, i) => ({
        id: String(i),
        midi: ev.note,
        startTick: timelineStartTick + ev.startTick,
        durationTicks: ev.durationTicks,
        ...(rootNote !== null && !percussion
          ? { name: midiNameInKey(ev.note, rootNote, mode) }
          : {}),
      })),
      {
        ticksPerQuarter: TICKS_PER_QUARTER,
        timeSignature: [numerator, denominator],
        originTick: firstBar * ticksPerBar,
        firstMeasureNumber: firstBar + 1,
        minMeasures: MIN_BARS,
        ...(percussion ? { staves: 'percussion' as const } : {}),
        ...(tonic
          ? {
              keyFifths: keyFifthsForTonic(
                tonic.letterIndex,
                tonic.accidental,
                mode,
              ),
            }
          : {}),
      },
    );
  }, [
    events,
    timelineStartTick,
    clipStartTick,
    rootNote,
    mode,
    numerator,
    denominator,
    percussion,
  ]);

  const noteStyles = useMemo(() => {
    const styles = new Map<string, NoteStyle>();
    for (const i of selectedIndices ?? []) {
      styles.set(String(i), { color: 'var(--color-accent, #7ecfcf)' });
    }
    return styles;
  }, [selectedIndices]);

  return (
    <div className="relative size-full">
      <GrandStaff
        score={score}
        noteStyles={noteStyles}
        playheadTick={position}
        className="size-full px-3 pt-3"
      />
      <CountOff beatIndex={countInBeat} beatsPerBar={numerator} />
    </div>
  );
}
