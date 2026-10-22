import { resolveStepContent } from '@/curriculum/engine/genreGeneration/resolveStepContent';
import { stepSwing } from '@/curriculum/engine/genreGeneration/swing';
import { stepTimeSignature } from '@/curriculum/engine/meter';
import type {
  ActivityFlowV2,
  ActivityStepV2,
} from '@/curriculum/types/activity.v2';
import { stepKeyRoot } from '@/curriculum/utils/flowKey';
import {
  suggestFingering,
  type FingeringInputNote,
  type Hand,
  type PianoFinger,
} from '@/lib/learn/pianoFingering';
import type { ChordClef } from '@/lib/notation';
import {
  genreFingeringContext,
  isTwoHandStep,
  stepStaves,
} from './fingeringContext';

/** The hand and finger a note gets; no finger when its chord is past one hand. */
export interface NoteFingerSuggestion {
  hand: Hand;
  finger: PianoFinger | null;
}

/**
 * A step's fingering for the back office, note by note, in the order of its
 * target notes.
 *
 * - `shown`: what the lesson shows, the authored fingers kept and the notes
 *   around them fitted to them.
 * - `auto`: what the suggester gives each note on its own — what it falls
 *   back to if its authored finger is cleared.
 */
export interface StepFingerSuggestions {
  shown: NoteFingerSuggestion[];
  auto: NoteFingerSuggestion[];
}

/** The parts of a lesson level the fingering reads. */
export type FingeringFlow = Pick<ActivityFlowV2, 'genre'> & {
  params: Partial<ActivityFlowV2['params']> &
    Pick<ActivityFlowV2['params'], 'defaultKey' | 'swing'>;
};

/**
 * Each target note's suggested hand and finger, as the student first meets
 * the step: the notes the lesson plays (register rules and swing applied, as
 * resolveStepContent does) and its chords on the treble staff unless `clef`
 * says bass. Null for a guitar lesson or a step without target notes.
 */
export function stepFingerSuggestions(
  flow: FingeringFlow,
  step: ActivityStepV2,
  clef: ChordClef = 'treble',
): StepFingerSuggestions | null {
  const authored = step.targetNotes;
  if (!authored?.length || flow.params.instrument === 'guitar') return null;
  const asFlow = flow as ActivityFlowV2;
  const played =
    resolveStepContent(step, {
      section: step.section,
      keyRoot: stepKeyRoot(asFlow, step),
      tempo: 90,
      timeSignature: stepTimeSignature(step, asFlow),
      tpb: 480,
      defaultScale: flow.params.defaultScale,
      genre: flow.genre,
      swing: stepSwing(step, flow.params.swing),
    }) ?? [];
  // Register rules and swing move notes but keep their order; anything else
  // and the authored notes are the best guess.
  const notes: FingeringInputNote[] =
    played.length === authored.length ? played : authored;
  const ctx = genreFingeringContext(
    asFlow,
    step,
    stepStaves(step.section, isTwoHandStep(step), clef),
  );
  const read = (input: FingeringInputNote[]) =>
    suggestFingering(input, ctx).map(({ hand, finger }) => ({ hand, finger }));
  return {
    shown: read(notes),
    auto: read(notes.map((note) => ({ ...note, finger: undefined }))),
  };
}
