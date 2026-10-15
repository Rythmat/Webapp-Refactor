/**
 * The six modal lessons (Dorian … Locrian) must not change while guitar
 * grows the rest of Theory: as guitar-ionian-invariance does for Ionian, the
 * flow every key builds, its theory notes, chord-family chips, chord-strip
 * cues and visual models are pinned here as digests, and so is every key
 * center (Ionian's too) by an explicit list of fields, so a field added for
 * the new scales cannot move them. A failing digest means a student's lesson
 * changed; update the snapshot only on purpose.
 */

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { chordStripCues } from '@/curriculum/components/guitar/GuitarChordStrip';
import { guitarVisualModel } from '@/curriculum/components/guitar/guitarVisualModel';
import {
  familyChips,
  sectionBCardBarreCare,
  stepTheoryNotes,
} from '@/curriculum/components/guitar/theory/theoryUi';
import { buildGuitarModeFlow } from '@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals';
import { GUITAR_KEY_ORDER } from '@/curriculum/data/guitar/bookOne';
import { centerId, getGuitarCenter } from '@/curriculum/data/guitar/centers';
import { GUITAR_MODES } from '@/curriculum/data/guitar/modes';
import {
  GUITAR_SUBSECTION_PREFIXES,
  notesFor,
} from '@/curriculum/data/guitar/theoryNotes';
import type { GuitarCenter } from '@/curriculum/data/guitar/types';

/** JSON with sorted object keys, so a digest ignores key order. */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v as Record<string, unknown>).sort(([a], [b]) =>
            a < b ? -1 : a > b ? 1 : 0,
          ),
        )
      : v,
  );
}

function digest(value: unknown): string {
  return createHash('sha256').update(canonical(value)).digest('hex');
}

/** The fields a center had before the rest of Theory (new ones are free). */
const CENTER_FIELDS = [
  'id',
  'mode',
  'key',
  'displayName',
  'source',
  'signatureText',
  'tonicPc',
  'steps',
  'spelling',
  'parentKey',
  'parentDegree',
  'scaleNotes',
  'pentatonicNotes',
  'majorScale',
  'pentatonic',
  'pentatonics',
  'triads',
  'sevenths',
  'musicMaps',
] as const;

function centerDigest(center: GuitarCenter): string {
  const record = center as unknown as Record<string, unknown>;
  return digest(CENTER_FIELDS.map((field) => [field, record[field]]));
}

const MODAL = GUITAR_MODES.filter((mode) => mode !== 'ionian');

describe('guitar key center invariance', () => {
  it('keeps every Ionian and modal center unchanged', () => {
    const out: Record<string, string> = {};
    for (const mode of GUITAR_MODES) {
      for (const key of GUITAR_KEY_ORDER) {
        const id = centerId(key, mode);
        out[id] = centerDigest(getGuitarCenter(id));
      }
    }
    expect(out).toMatchSnapshot();
  });
});

describe('guitar modal invariance', () => {
  for (const mode of MODAL) {
    for (const key of GUITAR_KEY_ORDER) {
      it(`keeps ${key} ${mode} unchanged`, () => {
        const flow = buildGuitarModeFlow(key, mode);
        const id = centerId(key, mode);
        const center = getGuitarCenter(id);
        const steps = flow.sections.flatMap((s) => s.steps);
        const { sections, ...head } = flow;

        const out: Record<string, string> = {
          head: digest(head),
          sections: digest(sections.map((s) => [s.id, s.name, s.steps.length])),
          familyChips: digest(familyChips(id)),
          barreCare: digest(sectionBCardBarreCare(flow, id)),
          prefixNotes: digest(
            GUITAR_SUBSECTION_PREFIXES.map((p) => [
              p,
              notesFor(p, { center, settings: { accidentals: 'unicode' } }),
            ]),
          ),
        };
        for (const step of steps) {
          const stepId = step.activity.split(':')[0];
          const model = guitarVisualModel(step, id);
          const map = step.guitar?.musicMap
            ? center.musicMaps[step.guitar.musicMap.example - 1]
            : undefined;
          out[stepId] = digest({
            step,
            notes: stepTheoryNotes(flow, step, id, false),
            roman: stepTheoryNotes(flow, step, id, true),
            model,
            cues: chordStripCues(model.chords, id, model.prefix, map),
          });
        }
        expect(out).toMatchSnapshot();
      });
    }
  }
});
