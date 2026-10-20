import {
  chordPads,
  gradeChordEcho,
  gradeMelodyEcho,
  recognizeChord,
  type ChordStrike,
  type PlayedNote,
} from '@/curriculum/engine/echo';
import type { StruckChord } from '@/curriculum/engine/musicLiteracy/chordGrading';
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
// call's chords by bar ("1 maj · 5 maj"). Played chords are the strikes the
// grade heard (engine/echo/strikes.ts: chords a 16th apart are two), named
// as the engine recognizes them (any octave, any order, held notes
// included); a strike that's none of the key's six reads "?".

/** Runs of the same label as one: a chord struck on every beat is one bar. */
const collapse = (labels: readonly string[]) =>
  labels.filter((label, i) => i === 0 || label !== labels[i - 1]);

/** The echo of one call of a run, graded and described. */
export function gradeRunCall(
  placed: RunCall,
  played: readonly PlayedNote[],
): EchoOutcome {
  const { call, timeline } = placed;
  if (call.kind === 'melody') {
    const result = gradeMelodyEcho(call, played, { timeline });
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
  const result = gradeChordEcho(call, played, { timeline });
  const names = new Map(chordPads(call.key).map((p) => [p.degree, p.label]));
  const struck: StruckChord[] = [
    ...result.attacks.flatMap((attack) =>
      attack.struck ? [attack.struck] : [],
    ),
    ...result.extraAttacks,
  ].sort((a, b) => a.onset - b.onset);
  return {
    passed: result.passed,
    percent: result.percent,
    asked: call.labels,
    played: collapse(
      struck.map((strike) => {
        const held = (strike as Partial<ChordStrike>).held ?? [];
        const degree = recognizeChord(
          [...strike.notes, ...held].map((note) => note.midi),
          call.key,
        );
        return (degree && names.get(degree)) ?? '?';
      }),
    ),
  };
}
