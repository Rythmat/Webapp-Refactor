/**
 * The rule for chord symbols, held over the whole library: a symbol sits over
 * the target notes that play its chord (lessonChordSymbols.ts).
 *
 * lessonChordSymbols.test.ts proves the placement does what it says; this
 * proves the lessons let it. A step whose symbols don't match its notes — a
 * chord labelled G7 but voiced G7alt, a "Dm7→G7" step whose last bar still
 * plays Dm7 — places its symbols wrongly however good the placement is, and
 * the backing plays the wrong chord with it (they read the same timeline). So
 * when a step plays its chords, every chord it lists has to be found in its
 * notes, and every symbol has to land on notes of its own chord.
 *
 * Funk L2 B1.5 is why: "Am9 → Ddom13" puts D13 on beat 3 of a one-bar step,
 * and the staff drew it over the empty bar after the music.
 */
import { describe, expect, it } from 'vitest';
import { loadAllFlows } from '@/content/flowStore';
import { chordSymbolTones } from '@/curriculum/engine/genreGeneration/chordSymbolTones';
import { chordStrikes } from '@/curriculum/engine/genreGeneration/chordTimeline';
import {
  resolveStepContent,
  type GenreNoteEvent,
} from '@/curriculum/engine/genreGeneration/resolveStepContent';
import { barTicks, type TimeSignature } from '@/curriculum/engine/meter';
import type {
  ActivityFlowV2,
  ActivityStepV2,
} from '@/curriculum/types/activity.v2';
import { placeLessonChords } from '../lessonChordSymbols';

const KEY_ROOT: Record<string, number> = {
  C: 60,
  'C#': 61,
  Db: 61,
  D: 62,
  'D#': 63,
  Eb: 63,
  E: 64,
  F: 65,
  'F#': 66,
  Gb: 66,
  G: 67,
  'G#': 68,
  Ab: 68,
  A: 69,
  'A#': 70,
  Bb: 70,
  B: 71,
};

interface Case {
  where: string;
  labels: string[];
  notes: GenreNoteEvent[];
  ticksPerBar: number;
}

/** Every step with chord symbols and notes, resolved as the lesson resolves it. */
async function stepsWithChords(): Promise<Case[]> {
  const flows = [...(await loadAllFlows()).values()].flat() as ActivityFlowV2[];
  const out: Case[] = [];
  for (const flow of flows) {
    const timeSignature: TimeSignature = (
      flow.params as { timeSignature?: TimeSignature }
    ).timeSignature ?? [4, 4];
    for (const section of flow.sections ?? []) {
      for (const step of (section.steps ?? []) as ActivityStepV2[]) {
        if (!step.chordSymbols?.length) continue;
        const keyName = (step.key ?? flow.params.defaultKey).split(' ')[0];
        const notes =
          resolveStepContent(step, {
            section: step.section,
            keyRoot: KEY_ROOT[keyName] ?? 60,
            tempo: 90,
            timeSignature,
            tpb: 480,
            defaultScale: flow.params.defaultScale,
            genre: flow.genre,
            instrument: flow.params.instrument,
          }) ?? [];
        if (notes.length === 0) continue;
        out.push({
          where: `${flow.genre} L${flow.level} ${step.activity}`,
          labels: step.chordSymbols,
          notes,
          ticksPerBar: barTicks(timeSignature),
        });
      }
    }
  }
  return out;
}

const place = ({ labels, notes, ticksPerBar }: Case) =>
  placeLessonChords(labels, {
    // The roll's padded count: placement has to see past it.
    bars: Math.max(2, Math.ceil(end(notes) / ticksPerBar)),
    ticksPerBar,
    notes,
  });

const end = (notes: readonly GenreNoteEvent[]) =>
  Math.max(...notes.map((n) => n.onset + n.duration));

const pc = (midi: number) => ((midi % 12) + 12) % 12;

describe('chord symbols sit over the notes that play them', () => {
  it('has steps to check', async () => {
    expect((await stepsWithChords()).length).toBeGreaterThan(200);
  });

  it('never puts a symbol past the end of the music', async () => {
    const offenders: string[] = [];
    for (const step of await stepsWithChords()) {
      const last = end(step.notes);
      for (const chord of place(step)) {
        if (chord.startTick >= last) {
          offenders.push(`${step.where}: ${chord.label} at ${chord.startTick}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('finds every chord a step lists in the notes, when they play chords', async () => {
    const offenders: string[] = [];
    for (const step of await stepsWithChords()) {
      const struck = chordStrikes(step.labels, step.notes);
      if (!struck) continue;
      const found = new Set(struck.map((chord) => chord.symbol));
      const missing = [...new Set(step.labels)].filter((l) => !found.has(l));
      if (missing.length > 0) {
        offenders.push(`${step.where}: ${missing.join(', ')} never played`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('puts each symbol on notes of its own chord, when the notes play chords', async () => {
    const offenders: string[] = [];
    for (const step of await stepsWithChords()) {
      if (!chordStrikes(step.labels, step.notes)) continue;
      for (const chord of place(step)) {
        const tones = chordSymbolTones(chord.label);
        if (!tones) continue;
        const pcs = new Set([
          ...tones.intervals.map((i) => (tones.rootPc + i) % 12),
          tones.bassPc,
        ]);
        const struck = step.notes.filter((n) => n.onset === chord.startTick);
        const fit = struck.filter((n) => pcs.has(pc(n.midi))).length;
        if (struck.length === 0 || fit * 2 < struck.length) {
          offenders.push(`${step.where}: ${chord.label} at ${chord.startTick}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
