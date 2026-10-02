/**
 * Ionian (Book One) must not change while guitar grows other modes: the
 * flow every key builds, its theory notes, chord-family chips, chord-strip
 * cues and visual models are pinned here as digests. A failing digest means
 * a student's Ionian lesson changed; update the snapshot only on purpose.
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
import { buildGuitarAppliedTheoryFundamentalsFlow } from '@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals';
import {
  GUITAR_ATLAS_BOOK_ONE,
  GUITAR_KEY_ORDER,
} from '@/curriculum/data/guitar/bookOne';
import {
  GUITAR_SUBSECTION_PREFIXES,
  notesFor,
} from '@/curriculum/data/guitar/theoryNotes';

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

describe('guitar Ionian invariance', () => {
  for (const key of GUITAR_KEY_ORDER) {
    it(`keeps ${key} Ionian unchanged`, () => {
      const flow = buildGuitarAppliedTheoryFundamentalsFlow(key);
      const center = GUITAR_ATLAS_BOOK_ONE[key];
      const steps = flow.sections.flatMap((s) => s.steps);
      const { sections, ...head } = flow;

      const out: Record<string, string> = {
        head: digest(head),
        sections: digest(sections.map((s) => [s.id, s.name, s.steps.length])),
        familyChips: digest(familyChips(key)),
        barreCare: digest(sectionBCardBarreCare(flow, key)),
        prefixNotes: digest(
          GUITAR_SUBSECTION_PREFIXES.map((p) => [
            p,
            notesFor(p, { center, settings: { accidentals: 'unicode' } }),
          ]),
        ),
      };
      for (const step of steps) {
        const id = step.activity.split(':')[0];
        const model = guitarVisualModel(step, key);
        const map = step.guitar?.musicMap
          ? center.musicMaps[step.guitar.musicMap.example - 1]
          : undefined;
        out[id] = digest({
          step,
          notes: stepTheoryNotes(flow, step, key, false),
          roman: stepTheoryNotes(flow, step, key, true),
          model,
          cues: chordStripCues(model.chords, key, model.prefix, map),
        });
      }
      expect(out).toMatchSnapshot();
    });
  }
});
