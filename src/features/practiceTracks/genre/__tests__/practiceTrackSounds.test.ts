/**
 * A Practice Track carries its lesson's sound into the Studio: the play-along's
 * drum kit and bass (ledger D-050–D-053, T-028).
 */
import { describe, expect, it } from 'vitest';
import { funkL1 } from '@/curriculum/data/activityFlows/funk_v2';
import {
  hipHopL1,
  hipHopL2,
  hipHopL3,
} from '@/curriculum/data/activityFlows/hipHop_v2';
import { popL1 } from '@/curriculum/data/activityFlows/pop_v2';
import { buildGenrePracticeTrack } from '../buildGenrePracticeTrack';

describe('Practice Track sounds', () => {
  // The kits are the designed grooves' own (console → Drum Grooves).
  it('gives Pop its Fretless bass on its groove’s kit', () => {
    const track = buildGenrePracticeTrack(popL1, 'A')!;
    expect(track).toMatchObject({
      drumKit: 'custom_808_01',
      bassVoice: 'fretless',
    });
  });

  it('gives Funk its Finger electric bass', () => {
    const track = buildGenrePracticeTrack(funkL1, 'C')!;
    expect(track).toMatchObject({
      drumKit: 'custom_custom_natural_01',
      bassVoice: 'finger',
    });
  });

  it('gives every Hip Hop L1 section the 808 kit and 808 bass', () => {
    for (const section of ['A', 'B', 'C', 'D'] as const) {
      const track = buildGenrePracticeTrack(hipHopL1, section)!;
      expect(track).toMatchObject({
        section,
        drumKit: '808',
        bassVoice: '808',
      });
    }
  });

  it('takes Hip Hop L2 and L3 sounds from each section’s last play-along', () => {
    expect(buildGenrePracticeTrack(hipHopL2, 'A')).toMatchObject({
      drumKit: 'house',
      bassVoice: 'finger',
    });
    // L3 Chords ends on Am7 → B7♭9 → Em9: house kit, Upright, swung.
    expect(buildGenrePracticeTrack(hipHopL3, 'B')).toMatchObject({
      drumKit: 'house',
      bassVoice: 'upright',
      bpm: 81,
    });
  });
});
