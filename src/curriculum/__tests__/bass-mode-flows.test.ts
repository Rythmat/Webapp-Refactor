import { describe, expect, it } from 'vitest';
import { barPattern } from '@/curriculum/data/activityFlows/bassAppliedTheory';
import { buildBassTheoryFlow } from '@/curriculum/data/activityFlows/bassTheoryFlows';
import { buildGuitarTheoryFlow } from '@/curriculum/data/activityFlows/guitarTheoryFlows';
import { BASS_THEORY_CATALOG } from '@/curriculum/data/bass';
import type {
  ActivityFlowV2,
  ActivityStepV2,
} from '@/curriculum/types/activity.v2';
import { fretToMidi } from '@/lib/guitar/fretboard';
import { BASS } from '@/lib/guitar/instrument';

const KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
const steps = (flow: ActivityFlowV2): ActivityStepV2[] =>
  flow.sections.flatMap((s) => s.steps as ActivityStepV2[]);
const NAMES = ['G', 'D', 'A', 'E'];
const spell = (s: ActivityStepV2) =>
  (s.targetNotes ?? []).map(
    (n) => `${NAMES[n.fretPosition!.string - 1]}${n.fretPosition!.fret}`,
  );

describe('bass Theory flows', () => {
  it('build for every live tile in every key, scored note by note on a bass', () => {
    for (const entry of BASS_THEORY_CATALOG) {
      for (const key of KEYS) {
        const flow = buildBassTheoryFlow(key, entry.slug);
        const label = `${key} ${entry.slug}`;
        expect(flow.params.instrument, label).toBe('bass');
        expect(flow.genre, label).toBe(entry.genre);
        const all = steps(flow);
        const tags = all.map((s) => s.tag);
        expect(new Set(tags).size, label).toBe(tags.length);
        for (const step of all) {
          expect(step.chordTargets, label).toBeUndefined();
          expect(step.guitar, label).toBeUndefined();
          expect(step.bass?.keyCenter, label).toBeDefined();
          expect(
            step.targetNotes?.length,
            `${label} ${step.activity}`,
          ).toBeGreaterThan(0);
          for (const n of step.targetNotes ?? []) {
            expect(n.fretPosition, label).toBeDefined();
            expect(n.fretPosition!.string).toBeLessThanOrEqual(4);
            expect(fretToMidi(n.fretPosition!, BASS), label).toBe(n.midi);
          }
        }
      }
    }
  });

  it('keeps the guitar lesson’s shape: same sections, steps and suffixes', () => {
    for (const slug of ['ionian', 'dorian', 'harmonicminor', 'minorblues']) {
      const bass = buildBassTheoryFlow('C', slug);
      const guitar = buildGuitarTheoryFlow('C', slug);
      expect(bass.sections.map((s) => s.id)).toEqual(
        guitar.sections.map((s) => s.id),
      );
      const suffix = (t: string) => t.split(' | ')[0].split(':')[1];
      expect(steps(bass).map((s) => suffix(s.tag))).toEqual(
        steps(guitar).map((s) => suffix(s.tag)),
      );
      // Section A is note for note the same melody, on bass.
      const melody = (f: ActivityFlowV2) =>
        f.sections[0].steps.map((s) => (s as ActivityStepV2).activity);
      expect(melody(bass)).toEqual(melody(guitar));
    }
  });

  it('plays C Ionian from the Bass Atlas positions', () => {
    const flow = buildBassTheoryFlow('C', 'ionian');
    const byActivity = (prefix: string) =>
      steps(flow).find((s) => s.activity.startsWith(prefix))!;
    expect(spell(byActivity('A1.1'))).toEqual(
      'E8 E10 A7 A8 A10 D7 D9 D10'.split(' '),
    );
    expect(spell(byActivity('B1.1'))).toEqual(['A3', 'D2', 'D5']);
    // B2.2: a whole-note root a bar; B2.3 root and 5th; B2.4 R 3 5 3.
    expect(spell(byActivity('B2.2'))).toEqual(['A3', 'A5', 'A7', 'A8']);
    expect(spell(byActivity('B2.3')).slice(0, 4)).toEqual([
      'A3',
      'D5',
      'A5',
      'D7',
    ]);
    expect(spell(byActivity('B2.4')).slice(0, 4)).toEqual([
      'A3',
      'D2',
      'D5',
      'D2',
    ]);
    // B4: the roots of 4 2 1 3.
    expect(spell(byActivity('B4.2'))).toEqual(['A8', 'A5', 'A3', 'A7']);
    // Music Map 1: a whole-note C, twice.
    const map1 = byActivity('D3.1');
    expect(spell(map1)).toEqual(['A3', 'A3']);
    expect(map1.targetNotes!.map((n) => n.onset)).toEqual([0, 1920]);
    // Music Map 3: R 3 5 3 in quarters over C then Dm, twice.
    expect(spell(byActivity('D3.3')).slice(0, 8)).toEqual(
      'A3 D2 D5 D2 A5 A8 D7 A8'.split(' '),
    );
  });

  it('picks the chord tones a bar holds', () => {
    expect(barPattern(1, 3)).toEqual([0]);
    expect(barPattern(2, 3)).toEqual([0, 2]);
    expect(barPattern(3, 3)).toEqual([0, 1, 2]);
    expect(barPattern(4, 3)).toEqual([0, 1, 2, 1]);
    expect(barPattern(4, 4)).toEqual([0, 1, 2, 3]);
    expect(barPattern(8, 4)).toEqual([0, 1, 2, 3, 0, 1, 2, 3]);
  });

  it('leaves the bass out of every play-along backing', () => {
    for (const slug of ['ionian', 'minorblues']) {
      for (const step of steps(buildBassTheoryFlow('A', slug))) {
        if (!step.backing_parts) continue;
        expect(step.backing_parts.engine_generates).not.toContain('bass');
      }
    }
  });
});
