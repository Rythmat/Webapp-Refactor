/**
 * Parts to and from what else speaks PPQ-480 notes: lesson steps' targetNotes,
 * Studio clip events, and MIDI files (via MidiFileIO's MidiSequence).
 */

import type { MidiNoteEvent, MidiSequence } from '@prism/engine';
import type {
  ActivityFlowV2,
  ActivityStepV2,
  TargetNote,
} from '@/curriculum/types/activity.v2';
import { flowKeyRoot, flowMode } from '@/curriculum/utils/flowKey';
import type { GuitarStringNumber } from '@/lib/guitar/types';
import {
  barsSpanned,
  blankPart,
  PPQ,
  shiftBetween,
  type InstrumentPart,
  type PartInstrument,
  type PartLevel,
  type PartNote,
  type PartRole,
} from './part';

const DEFAULT_VELOCITY = 96;

// ── Studio clip events ─────────────────────────────────────────────────────

export function toMidiEvents(notes: readonly PartNote[]): MidiNoteEvent[] {
  return notes.map((n) => ({
    note: n.midi,
    velocity: n.velocity,
    startTick: n.tick,
    durationTicks: n.duration,
    channel: 0,
  }));
}

/**
 * Edited clip events back into part notes. Clip events are the WRITTEN
 * notes; a note keeps its hand, tab position, played feel, grace flag and
 * finger when its written time and pitch are unchanged — a moved note is a
 * new decision and loses them.
 */
export function fromMidiEvents(
  events: readonly MidiNoteEvent[],
  previous: readonly PartNote[] = [],
): PartNote[] {
  const prev = new Map(previous.map((n) => [`${n.tick}:${n.midi}`, n]));
  return events
    .map((e) => {
      const was = prev.get(`${e.startTick}:${e.note}`);
      return {
        ...(was?.hand ? { hand: was.hand } : {}),
        ...(was?.string ? { string: was.string, fret: was.fret } : {}),
        ...(was?.offset ? { offset: was.offset } : {}),
        ...(was?.grace ? { grace: true } : {}),
        ...(was?.finger ? { finger: was.finger } : {}),
        tick: Math.max(0, Math.round(e.startTick)),
        duration: Math.max(1, Math.round(e.durationTicks)),
        midi: e.note,
        velocity: e.velocity,
      };
    })
    .sort((a, b) => a.tick - b.tick || a.midi - b.midi);
}

// ── MIDI files ─────────────────────────────────────────────────────────────

/** A MIDI file track's notes at PPQ 480, starting at its first bar. */
export function notesFromSequence(seq: MidiSequence): PartNote[] {
  const scale = PPQ / (seq.ticksPerQuarterNote || PPQ);
  const notes = seq.events.map((e) => ({
    tick: Math.round(e.startTick * scale),
    duration: Math.max(1, Math.round(e.durationTicks * scale)),
    midi: e.note,
    velocity: e.velocity || DEFAULT_VELOCITY,
  }));
  // A file that starts after a silent pickup bar or two is moved back to the
  // bar its first note falls in.
  const first = notes.reduce((m, n) => Math.min(m, n.tick), Infinity);
  const offset = Number.isFinite(first) ? Math.floor(first / 1920) * 1920 : 0;
  return notes
    .map((n) => ({ ...n, tick: n.tick - offset }))
    .sort((a, b) => a.tick - b.tick || a.midi - b.midi);
}

/** Bass if it lives below C3, drums on channel 10, else piano. */
export function guessInstrument(seq: MidiSequence): PartInstrument {
  if (seq.events.some((e) => e.channel === 9)) return 'drums';
  const name = seq.trackName.toLowerCase();
  if (/bass/.test(name)) return 'bass';
  if (/guit|gtr/.test(name)) return 'guitar';
  if (/drum|kit|perc/.test(name)) return 'drums';
  const avg =
    seq.events.reduce((s, e) => s + e.note, 0) / Math.max(1, seq.events.length);
  return avg < 48 ? 'bass' : 'piano';
}

// ── Lesson steps ───────────────────────────────────────────────────────────

export type StepHands = 'both' | 'rh' | 'lh';

/** Section letter → the role its notes play. */
const SECTION_ROLE: Record<string, PartRole> = {
  A: 'melody',
  B: 'comping',
  C: 'bassline',
  D: 'two-hand',
};

const GENRE_LABEL = (genre: string) =>
  genre.replace(
    /(^|-)(\w)/g,
    (_, dash, c) => `${dash ? ' ' : ''}${c.toUpperCase()}`,
  );

/**
 * A lesson step's authored notes as a part, in the flow's key. Reads the raw
 * targetNotes (or one variant's), not the resolved ones: register rules and
 * swing run on top of these in the lesson, and the part should keep what was
 * written. `hands` keeps one hand only — a section C step's left hand is a
 * bass line.
 */
export function partFromLessonStep(
  flow: ActivityFlowV2,
  step: ActivityStepV2,
  options: { id: string; hands?: StepHands; variant?: number } = { id: '' },
): InstrumentPart | null {
  const hands = options.hands ?? 'both';
  const variant =
    options.variant !== undefined
      ? step.variants?.[options.variant]
      : undefined;
  const source: TargetNote[] = variant?.targetNotes ?? step.targetNotes ?? [];
  const kept = source.filter((n) =>
    hands === 'both' ? true : (n.hand ?? 'rh') === hands,
  );
  if (kept.length === 0) return null;

  const instrument: PartInstrument =
    flow.params.instrument === 'guitar'
      ? 'guitar'
      : hands === 'lh' && step.section === 'C'
        ? 'bass'
        : 'piano';
  const notes: PartNote[] = kept
    .map((n) => ({
      tick: n.onset,
      duration: n.duration,
      midi: n.midi,
      velocity: DEFAULT_VELOCITY,
      ...(n.hand && instrument === 'piano' ? { hand: n.hand } : {}),
      ...(n.fretPosition
        ? { string: n.fretPosition.string, fret: n.fretPosition.fret }
        : {}),
    }))
    .sort((a, b) => a.tick - b.tick || a.midi - b.midi);

  // Lesson notes start after a count-in bar when the first note sits there.
  const firstBar = Math.floor(notes[0].tick / 1920) * 1920;
  const shifted = notes.map((n) => ({ ...n, tick: n.tick - firstBar }));

  const handLabel = hands === 'both' ? '' : hands === 'lh' ? ' (LH)' : ' (RH)';
  // Subsections often lead with the step's own label ("A1: Scale …").
  const label = `${step.section}${step.stepNumber}`;
  const subsection = (step.subsection ?? '')
    .replace(new RegExp(`^${label}\\s*[:·.-]?\\s*`), '')
    .trim();
  const name =
    `${GENRE_LABEL(flow.genre)} L${flow.level} · ${label} ${subsection}`.trim();
  const base = blankPart(options.id, `${name}${handLabel}`, instrument);
  const [lo, hi] = flow.params.tempoRange ?? [base.tempo, base.tempo];
  return {
    ...base,
    description: step.direction ?? undefined,
    role:
      instrument === 'bass'
        ? 'bassline'
        : hands === 'both'
          ? (SECTION_ROLE[step.section] ?? 'comping')
          : hands === 'rh'
            ? 'melody'
            : 'comping',
    genre: flow.genre,
    level: Math.min(5, Math.max(1, flow.level)) as PartLevel,
    key: { tonic: flowKeyRoot(flow) % 12, mode: flowMode(flow) },
    bars: barsSpanned(shifted),
    tempo: step.tempo ?? Math.round((lo + hi) / 2),
    swing: Math.max(50, step.swing ?? flow.params.swing ?? 50),
    chordSymbols: (variant?.chordSymbols ?? step.chordSymbols)?.slice(),
    notes: shifted,
    source: {
      kind: 'lesson',
      genre: flow.genre,
      level: flow.level,
      section: step.section,
      stepNumber: step.stepNumber,
      title: step.subsection,
      ...(step.tag ? { tag: step.tag } : {}),
      ...(options.variant !== undefined ? { variant: options.variant } : {}),
      hands,
      tickOffset: firstBar,
    },
  };
}

/**
 * A step with the part's notes written back into it — the inverse of
 * partFromLessonStep. Notes return to the flow's key (if the part was
 * transposed) and to their place after the count-in. Only the hand(s) the
 * part was taken from are replaced; the other hand's notes stay as they are.
 * Lessons grade the written notes, so played feel is not carried over.
 */
export function writePartToStep(
  part: InstrumentPart,
  step: ActivityStepV2,
  flowTonic: number,
): ActivityStepV2 {
  const source = part.source.kind === 'lesson' ? part.source : null;
  const hands = source?.hands ?? 'both';
  const tickOffset = source?.tickOffset ?? 0;
  const shift = shiftBetween(part.key.tonic, flowTonic);
  const written: TargetNote[] = part.notes
    .filter((n) => !n.grace)
    .map((n) => ({
      midi: n.midi + shift,
      onset: n.tick + tickOffset,
      duration: n.duration,
      ...(n.hand ? { hand: n.hand } : hands !== 'both' ? { hand: hands } : {}),
      ...(n.string !== undefined && n.fret !== undefined && shift === 0
        ? {
            fretPosition: {
              string: n.string as GuitarStringNumber,
              fret: n.fret,
            },
          }
        : {}),
    }));

  const merge = (existing: TargetNote[] | undefined) => {
    const kept =
      hands === 'both'
        ? []
        : (existing ?? []).filter((n) => (n.hand ?? 'rh') !== hands);
    return [...kept, ...written].sort(
      (a, b) => a.onset - b.onset || a.midi - b.midi,
    );
  };

  if (source?.variant !== undefined && step.variants?.[source.variant]) {
    return {
      ...step,
      variants: step.variants.map((v, i) =>
        i === source.variant ? { ...v, targetNotes: merge(v.targetNotes) } : v,
      ),
    };
  }
  return { ...step, targetNotes: merge(step.targetNotes) };
}
