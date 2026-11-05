import { describe, expect, it } from 'vitest';
import { bluesFlows } from '@/curriculum/data/activityFlows/blues_v2';
import { hipHopFlows } from '@/curriculum/data/activityFlows/hipHop_v2';
import { jazzFlows } from '@/curriculum/data/activityFlows/jazz_v2';
import { latinFlows } from '@/curriculum/data/activityFlows/latin_v2';
import { SCALES } from '@/curriculum/engine/genreGeneration/scaleRegistry';
import { GENRE_PROFILES } from '..';

const levels = Object.values(GENRE_PROFILES).flatMap((profile) =>
  ([1, 2, 3] as const).map((n) => ({
    name: `${profile.id} L${n}`,
    level: profile.levels[n],
  })),
);

describe('genre profiles', () => {
  it('gives every voicing card in a level its own label', () => {
    // The Overview keys its cards by label: two alike leave a card from the
    // last level behind when the level changes.
    for (const { name, level } of levels) {
      const labels = level.primaryVoicings.map((v) => v.label);
      expect(new Set(labels).size, name).toBe(labels.length);
    }
  });

  it('lists a level’s own scale first, each as the lessons name it', () => {
    for (const { name, level } of levels) {
      if (!level.scales) continue;
      expect(level.scales[0].intervals, name).toEqual(level.scaleIntervals);
      expect(level.scales[0].notes, name).toEqual(level.scaleNotes);
      for (const scale of level.scales) {
        expect(SCALES[scale.scaleId], `${name} ${scale.name}`).toEqual(
          scale.intervals,
        );
        expect(scale.notes, `${name} ${scale.name}`).toHaveLength(
          scale.intervals.length,
        );
      }
      for (const v of level.primaryVoicings)
        if (v.scaleId)
          expect(
            level.scales.map((s) => s.scaleId),
            `${name} ${v.label}`,
          ).toContain(v.scaleId);
    }
  });

  it('shows Hip Hop’s, Latin’s, Jazz’s and Blues’ levels in the scales their lessons teach', () => {
    for (const flow of [
      ...hipHopFlows,
      ...latinFlows,
      ...jazzFlows,
      ...bluesFlows,
    ]) {
      const taught = new Set([
        flow.params.defaultScaleId,
        ...flow.sections.flatMap((s) =>
          s.steps.flatMap((step) => (step.scaleId ? [step.scaleId] : [])),
        ),
      ]);
      const level = GENRE_PROFILES[flow.genre].levels[flow.level as 1 | 2 | 3];
      expect(level.scales?.[0].scaleId).toBe(flow.params.defaultScaleId);
      expect(new Set(level.scales?.map((s) => s.scaleId))).toEqual(taught);
    }
  });

  it('starts a scale in a key of its own from that key', () => {
    // Latin L1's Mariachi is G major in an E minor level (D-089).
    const NAMES = [
      'C',
      'C♯',
      'D',
      'E♭',
      'E',
      'F',
      'F♯',
      'G',
      'A♭',
      'A',
      'B♭',
      'B',
    ];
    for (const { name, level } of levels)
      for (const scale of level.scales ?? []) {
        if (!scale.key) continue;
        const tonic = scale.key.split(' ')[0];
        expect(scale.notes[0], `${name} ${scale.name}`).toBe(tonic);
        expect(NAMES[scale.keyMidi! % 12], `${name} ${scale.name}`).toBe(tonic);
      }
  });
});
