import { describe, expect, it } from 'vitest';
import { buildGuitarTheoryFlow } from '@/curriculum/data/activityFlows/guitarTheoryFlows';
import { buildUkuleleTheoryFlow } from '@/curriculum/data/activityFlows/ukuleleTheoryFlows';
import { getGuitarShape } from '@/curriculum/data/guitar/centers';
import { UKULELE_THEORY_CATALOG } from '@/curriculum/data/ukulele';
import type {
  ActivityFlowV2,
  ActivityStepV2,
} from '@/curriculum/types/activity.v2';
import { fretToMidi, shapePitchClasses } from '@/lib/guitar/fretboard';
import { UKULELE } from '@/lib/guitar/instrument';

const KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
const steps = (flow: ActivityFlowV2): ActivityStepV2[] =>
  flow.sections.flatMap((s) => s.steps as ActivityStepV2[]);
const NAMES = ['A', 'E', 'C', 'G'];
const spell = (s: ActivityStepV2) =>
  (s.targetNotes ?? []).map(
    (n) => `${NAMES[n.fretPosition!.string - 1]}${n.fretPosition!.fret}`,
  );

describe('ukulele Theory flows', () => {
  it('build for every live tile in every key, on a ukulele', () => {
    for (const entry of UKULELE_THEORY_CATALOG) {
      for (const key of KEYS) {
        const flow = buildUkuleleTheoryFlow(key, entry.slug);
        const label = `${key} ${entry.slug}`;
        expect(flow.params.instrument, label).toBe('ukulele');
        expect(flow.genre, label).toBe(entry.genre);
        expect(flow.title, label).toMatch(/— Ukulele$/);
        const all = steps(flow);
        const tags = all.map((s) => s.tag);
        expect(new Set(tags).size, label).toBe(tags.length);
        for (const step of all) {
          expect(step.module, label).toBe('applied_theory_ukulele_l1');
          expect(step.tag, label).toMatch(
            /^ukulele_fund:.* \| applied_theory_ukulele$/,
          );
          expect(step.targetNotes?.length, label).toBeGreaterThan(0);
          for (const n of step.targetNotes ?? []) {
            expect(n.fretPosition!.string).toBeLessThanOrEqual(4);
            expect(fretToMidi(n.fretPosition!, UKULELE), label).toBe(n.midi);
          }
          for (const t of step.chordTargets ?? []) {
            expect(t.shapeId, label).toMatch(/^ukulele:/);
            const shape = getGuitarShape(t.shapeId!);
            expect(shape, `${label} ${t.shapeId}`).toBeDefined();
            expect(t.pitchClasses).toEqual(
              shapePitchClasses(shape!.frets, UKULELE),
            );
          }
        }
      }
    }
    // Every catalog scale in 12 keys: hundreds of flows.
  }, 60_000);

  it('keeps the guitar lesson’s shape: same sections, steps and suffixes', () => {
    for (const slug of ['ionian', 'dorian', 'harmonicminor', 'minorblues']) {
      const ukulele = buildUkuleleTheoryFlow('C', slug);
      const guitar = buildGuitarTheoryFlow('C', slug);
      expect(ukulele.sections.map((s) => s.id)).toEqual(
        guitar.sections.map((s) => s.id),
      );
      const suffix = (t: string) => t.split(' | ')[0].split(':')[1];
      expect(steps(ukulele).map((s) => suffix(s.tag))).toEqual(
        steps(guitar).map((s) => suffix(s.tag)),
      );
      // Chord steps score the same chords, on ukulele shapes.
      const chords = (f: ActivityFlowV2) =>
        steps(f).map((s) =>
          (s.chordTargets ?? []).map((t) => [t.symbol, t.onsetTick, t.attack]),
        );
      expect(chords(ukulele)).toEqual(chords(guitar));
    }
  });

  it('plays C Ionian from The Ukulele Atlas', () => {
    const flow = buildUkuleleTheoryFlow('C', 'ionian');
    const byActivity = (prefix: string) =>
      steps(flow).find((s) => s.activity.startsWith(prefix))!;
    // A1: the book's C major box, open strings and all.
    expect(spell(byActivity('A1.1'))).toEqual(
      'C0 C2 E0 E1 E3 A0 A2 A3'.split(' '),
    );
    // B1: open C, strummed G-C-E-A (written order, re-entrant G first).
    const b1 = byActivity('B1.1');
    expect(spell(b1).slice(0, 4)).toEqual(['G0', 'C0', 'E0', 'A3']);
    expect(b1.chordTargets?.[0]).toMatchObject({
      rootPc: 0,
      quality: 'major',
      pitchClasses: [0, 4, 7],
      bassPc: 0,
    });
  });
});
