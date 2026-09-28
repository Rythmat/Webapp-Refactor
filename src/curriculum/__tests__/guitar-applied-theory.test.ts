/**
 * The guitar Applied Theory Fundamentals flow: built from The Guitar Atlas,
 * and following the piano flow's logic step for step.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildAppliedTheoryFundamentalsFlow } from '@/curriculum/data/activityFlows/appliedTheoryFundamentals';
import {
  MUSIC_MAP_PASSES,
  buildGuitarAppliedTheoryFundamentalsFlow,
} from '@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals';
import {
  GUITAR_ATLAS_BOOK_ONE,
  GUITAR_KEY_ORDER,
  keyPitchClass,
} from '@/curriculum/data/guitar/bookOne';
import { resolveStepContent } from '@/curriculum/engine/genreGeneration/resolveStepContent';
import type {
  ActivityFlowV2,
  ActivityStepV2,
  TargetNote,
} from '@/curriculum/types/activity.v2';
import { fretToMidi } from '@/lib/guitar/fretboard';

const PIANO_ROOT: Record<string, number> = {
  C: 60,
  G: 67,
  D: 62,
  A: 69,
  E: 64,
  B: 71,
  'F#': 66,
  Db: 61,
  Ab: 68,
  Eb: 63,
  Bb: 70,
  F: 65,
};

const logSpy = vi.spyOn(console, 'log');
const warnSpy = vi.spyOn(console, 'warn');
beforeAll(() => {
  logSpy.mockImplementation(() => {});
  warnSpy.mockImplementation(() => {});
});
afterAll(() => {
  logSpy.mockRestore();
  warnSpy.mockRestore();
});

function suffix(tag: string): string {
  return tag
    .replace(/^guitar_fund:|^theory_fund:/, '')
    .replace(/ \| applied_theory(_guitar)?$/, '');
}

function steps(flow: ActivityFlowV2): ActivityStepV2[] {
  return flow.sections.flatMap((s) => s.steps);
}

function pianoNotes(key: string, step: ActivityStepV2): TargetNote[] {
  const flow = buildAppliedTheoryFundamentalsFlow(key);
  return (
    resolveStepContent(step, {
      section: step.section,
      keyRoot: PIANO_ROOT[key],
      tempo: 80,
      timeSignature: [4, 4],
      tpb: 480,
      defaultScale: flow.params.defaultScale,
    }) ?? []
  );
}

/** Pitch classes sounding at each onset, relative to the key. */
function onsetPcs(notes: readonly TargetNote[], tonic: number) {
  const byOnset = new Map<number, Set<number>>();
  for (const n of notes) {
    const set = byOnset.get(n.onset) ?? new Set<number>();
    set.add((n.midi - tonic + 120) % 12);
    byOnset.set(n.onset, set);
  }
  return [...byOnset.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([onset, pcs]) => [onset, [...pcs].sort((a, b) => a - b)] as const);
}

function onsetDurations(notes: readonly TargetNote[]) {
  const seen = new Map<number, number>();
  for (const n of notes) seen.set(n.onset, n.duration);
  return [...seen.entries()].sort((a, b) => a[0] - b[0]);
}

describe('buildGuitarAppliedTheoryFundamentalsFlow', () => {
  for (const key of GUITAR_KEY_ORDER) {
    describe(key, () => {
      const flow = buildGuitarAppliedTheoryFundamentalsFlow(key);
      const piano = buildAppliedTheoryFundamentalsFlow(key);
      const all = steps(flow);
      const tonic = keyPitchClass(key);
      const pianoBySuffix = new Map(
        steps(piano).map((s) => [suffix(s.tag), s]),
      );

      it('is a guitar flow with the planned sections', () => {
        expect(flow.params.instrument).toBe('guitar');
        expect(flow.genre).toBe('guitar-applied-theory-fundamentals');
        expect(flow.params.defaultKey).toBe(`${key} Major (Ionian)`);
        expect(flow.params.tempoRange).toEqual([60, 100]);
        expect(flow.sections.map((s) => [s.id, s.steps.length])).toEqual([
          ['A', 20],
          ['B', 46],
          ['D', 9],
        ]);
        const tags = all.map((s) => s.tag);
        expect(new Set(tags).size).toBe(tags.length);
        for (const s of all) {
          expect(s.tag).not.toContain('performance');
          expect(s.instrument_config).toBeUndefined();
          expect(s.scaleIntervals).toBeUndefined();
        }
      });

      it('places every note on a string and fret at its sounding pitch', () => {
        for (const s of all) {
          expect(s.targetNotes?.length, s.activity).toBeGreaterThan(0);
          for (const n of s.targetNotes ?? []) {
            expect(n.fretPosition, s.activity).toBeDefined();
            expect(n.midi).toBe(fretToMidi(n.fretPosition!));
            expect(n.hand).toBeUndefined();
          }
        }
      });

      it('mirrors every piano step it shares', () => {
        const mirrored = all.filter((s) => pianoBySuffix.has(suffix(s.tag)));
        // A1-A3 (14), B1-B4 (20), D1-D2 (4): every piano step but Two-Hand.
        expect(mirrored).toHaveLength(38);
        for (const s of mirrored) {
          const p = pianoBySuffix.get(suffix(s.tag))!;
          expect(s.section, s.activity).toBe(p.section);
          expect(s.subsection, s.activity).toBe(p.subsection);
          expect(s.activity).toBe(p.activity);
          expect(s.assessment, s.activity).toBe(p.assessment);
          expect(s.successFeedback, s.activity).toBe(p.successFeedback);
        }
      });

      it('plays the same scale degrees and rhythms as piano in A1-A3 and D1', () => {
        for (const s of all) {
          if (!/^(A[123]|D1)/.test(s.subsection)) continue;
          const p = pianoBySuffix.get(suffix(s.tag))!;
          const theirs = pianoNotes(key, p);
          const mine = s.targetNotes!;
          expect(onsetDurations(mine), s.activity).toEqual(
            onsetDurations(theirs),
          );
          expect(onsetPcs(mine, tonic), s.activity).toEqual(
            onsetPcs(theirs, tonic),
          );
        }
      });

      it('strums the same chords in the same rhythm as piano in B2, B4 and D2', () => {
        for (const s of all) {
          if (!/^(B2|B4|D2)/.test(s.subsection)) continue;
          const p = pianoBySuffix.get(suffix(s.tag))!;
          const theirs = pianoNotes(key, p);
          expect(onsetDurations(s.targetNotes!), s.activity).toEqual(
            onsetDurations(theirs),
          );
          expect(onsetPcs(s.targetNotes!, tonic), s.activity).toEqual(
            onsetPcs(theirs, tonic),
          );
          expect(s.chordSymbols).toEqual(p.chordSymbols);
        }
      });

      it('arpeggiates the same chords as piano in B1, low to high, one per beat', () => {
        for (const s of all) {
          if (!s.subsection.startsWith('B1')) continue;
          const p = pianoBySuffix.get(suffix(s.tag))!;
          const theirs = pianoNotes(key, p);
          const pcs = (notes: readonly TargetNote[]) =>
            [...new Set(notes.map((n) => n.midi % 12))].sort((a, b) => a - b);
          expect(pcs(s.targetNotes!), s.activity).toEqual(pcs(theirs));
          s.targetNotes!.forEach((n, i) => {
            expect(n.onset).toBe(i * 480);
            expect(n.duration).toBe(460);
            if (i > 0)
              expect(n.midi).toBeGreaterThan(s.targetNotes![i - 1].midi);
          });
          expect(s.chordSymbols).toEqual(p.chordSymbols);
        }
      });

      it('plays B3 chords one per beat with piano’s sounding lengths', () => {
        const b3 = all.filter((s) => s.subsection.startsWith('B3'));
        expect(b3).toHaveLength(3);
        for (const s of b3) {
          const p = pianoBySuffix.get(suffix(s.tag))!;
          const theirs = pianoNotes(key, p);
          const mine = onsetDurations(s.targetNotes!);
          expect(mine.map(([onset]) => onset)).toEqual(
            mine.map((_, i) => i * 480),
          );
          expect(mine.map(([, d]) => d)).toEqual(
            onsetDurations(theirs).map(([, d]) => d),
          );
          expect(onsetPcs(s.targetNotes!, tonic).map(([, pcs]) => pcs)).toEqual(
            onsetPcs(theirs, tonic).map(([, pcs]) => pcs),
          );
        }
      });

      it('lines chordTargets up with the strums they score', () => {
        for (const s of all) {
          if (s.section === 'A' || s.subsection.startsWith('D1')) {
            expect(s.chordTargets, s.activity).toBeUndefined();
            continue;
          }
          const targets = s.chordTargets!;
          expect(targets.length, s.activity).toBeGreaterThan(0);
          const arpeggiated = targets[0].attack === 'arpeggio';
          if (arpeggiated) {
            expect(targets).toHaveLength(1);
            const pcs = [
              ...new Set(s.targetNotes!.map((n) => n.midi % 12)),
            ].sort((a, b) => a - b);
            expect(targets[0].pitchClasses).toEqual(pcs);
            continue;
          }
          const onsets = [...new Set(s.targetNotes!.map((n) => n.onset))].sort(
            (a, b) => a - b,
          );
          expect(
            targets.map((t) => t.onsetTick),
            s.activity,
          ).toEqual(onsets);
          for (const t of targets) {
            const sounding = s
              .targetNotes!.filter((n) => n.onset === t.onsetTick)
              .map((n) => n.midi);
            expect(t.pitchClasses).toEqual(
              [...new Set(sounding.map((m) => m % 12))].sort((a, b) => a - b),
            );
            expect(t.bassPc).toBe(Math.min(...sounding) % 12);
            expect(t.pitchClasses).toContain(t.rootPc);
          }
        }
      });

      it('plays each Music Map twice in the book’s rhythm, rests silent', () => {
        const maps = all.filter((s) => s.subsection.startsWith('D3'));
        expect(maps).toHaveLength(5);
        GUITAR_ATLAS_BOOK_ONE[key].musicMaps.forEach((map, m) => {
          const s = maps[m];
          const strumsPerPass = map.bars.reduce(
            (n, bar) =>
              n + bar.rhythm.filter((r) => !r.endsWith('rest')).length,
            0,
          );
          expect(s.chordTargets, s.activity).toHaveLength(
            strumsPerPass * MUSIC_MAP_PASSES,
          );
          const end = Math.max(
            ...s.targetNotes!.map((n) => n.onset + n.duration),
          );
          expect(end).toBeLessThanOrEqual(map.bars.length * 1920 * 2);
          expect(s.chordSymbols).toHaveLength(map.bars.length);
          expect(s.guitar?.musicMap).toEqual({
            example: map.example,
            passes: MUSIC_MAP_PASSES,
          });
        });
      });

      it('survives resolveStepContent untouched', () => {
        for (const s of all) {
          const resolved = resolveStepContent(s, {
            section: s.section,
            keyRoot: PIANO_ROOT[key],
            tempo: 80,
            timeSignature: [4, 4],
            tpb: 480,
            defaultScale: flow.params.defaultScale,
            instrument: 'guitar',
          });
          expect(resolved, s.activity).toEqual(s.targetNotes);
        }
      });
    });
  }

  it('resolves enharmonic spellings to the book key and unknown keys to C', () => {
    expect(
      buildGuitarAppliedTheoryFundamentalsFlow('Gb').params.defaultKey,
    ).toBe('F# Major (Ionian)');
    expect(
      buildGuitarAppliedTheoryFundamentalsFlow('C#').params.defaultKey,
    ).toBe('Db Major (Ionian)');
    expect(
      buildGuitarAppliedTheoryFundamentalsFlow('H').params.defaultKey,
    ).toBe('C Major (Ionian)');
  });

  it('skips the piano register rules for guitar', () => {
    // A chord above C5: the piano rules drop it an octave, guitar keeps it.
    const high: TargetNote[] = [
      {
        midi: 76,
        onset: 0,
        duration: 460,
        fretPosition: { string: 1, fret: 12 },
      },
      {
        midi: 79,
        onset: 0,
        duration: 460,
        fretPosition: { string: 1, fret: 15 },
      },
    ];
    const step: ActivityStepV2 = {
      stepNumber: 1,
      module: 'applied_theory_guitar_l1',
      section: 'B',
      subsection: 'B2: Play Chord (Triads)',
      activity: 'B2.1',
      assessment: 'pitch_only',
      tag: 'guitar_fund:play_chords_oot | applied_theory_guitar',
      styleRef: 'l1a',
      successFeedback: '',
      targetNotes: high,
    };
    const ctx = {
      section: 'B' as const,
      keyRoot: 60,
      tempo: 80,
      timeSignature: [4, 4] as [number, number],
      tpb: 480,
    };
    expect(resolveStepContent(step, { ...ctx, instrument: 'guitar' })).toEqual(
      high,
    );
    expect(resolveStepContent(step, ctx)?.map((n) => n.midi)).toEqual([64, 67]);
  });

  it('never lets a piano generator stand in for a guitar step', () => {
    const step: ActivityStepV2 = {
      stepNumber: 1,
      module: 'applied_theory_guitar_l1',
      section: 'A',
      subsection: 'A1: Major Scale',
      activity: 'A1.1',
      assessment: 'pitch_only',
      tag: 'guitar_fund:major_scale_ascending_oot | applied_theory_guitar',
      styleRef: 'l1a',
      successFeedback: '',
    };
    const ctx = {
      section: 'A' as const,
      keyRoot: 60,
      tempo: 80,
      timeSignature: [4, 4] as [number, number],
      tpb: 480,
      defaultScale: [0, 2, 4, 5, 7, 9, 11],
    };
    expect(
      resolveStepContent(step, { ...ctx, instrument: 'guitar' }),
    ).toBeNull();
    expect(resolveStepContent(step, ctx)?.length).toBe(8);
  });
});
