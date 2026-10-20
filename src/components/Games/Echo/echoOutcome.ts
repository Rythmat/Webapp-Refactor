import {
  chordPads,
  gradeEcho,
  recognizeChord,
  type PlayedNote,
} from '@/curriculum/engine/echo';
import {
  clusterChords,
  inChordResponse,
} from '@/curriculum/engine/musicLiteracy/chordGrading';
import { inResponse } from '@/curriculum/engine/musicLiteracy/grading';
import {
  degreeLabel,
  degreeOfMidi,
} from '@/curriculum/engine/musicLiteracy/pitch';
import type { EchoOutcome } from './echoFlow';
import type { RunCall } from './echoRunCues';

// ── An echo graded, as the result shows it ─────────────────────────────────
// The engine grades (engine/echo/grading.ts, Music Literacy's graders and
// pass rule); this says what was asked and what was played, the way the
// student reads it: a melody's scale degrees ("1 · 2 · ♭3"), a chord
// call's chords by bar ("1 maj · 5 maj"). Played chords are named as the
// engine recognizes them (any octave, any order); a strike that's none of
// the key's six reads "?".

/** Runs of the same label as one: a chord struck on every beat is one bar. */
const collapse = (labels: readonly string[]) =>
  labels.filter((label, i) => i === 0 || label !== labels[i - 1]);

/** The echo of one call of a run, graded and described. */
export function gradeRunCall(
  placed: RunCall,
  played: readonly PlayedNote[],
): EchoOutcome {
  const { call, timeline } = placed;
  const result = gradeEcho(call, played, { timeline });
  if (call.kind === 'melody') {
    const answered = inResponse(played, timeline, {
      call: placed.notes.call,
      response: placed.notes.response,
    }).sort((a, b) => a.onset - b.onset);
    return {
      passed: result.passed,
      percent: result.percent,
      asked: call.notes.map((note) => note.label),
      played: answered.map((note) =>
        degreeLabel(degreeOfMidi(note.midi, call.tonic).degree),
      ),
    };
  }
  const names = new Map(chordPads(call.key).map((p) => [p.degree, p.label]));
  const struck = clusterChords(
    inChordResponse(
      played,
      timeline,
      placed.attacks.response,
      placed.attacks.call,
    ),
  );
  return {
    passed: result.passed,
    percent: result.percent,
    asked: call.labels,
    played: collapse(
      struck.map((attack) => {
        const degree = recognizeChord(
          attack.notes.map((note) => note.midi),
          call.key,
        );
        return (degree && names.get(degree)) ?? '?';
      }),
    ),
  };
}
