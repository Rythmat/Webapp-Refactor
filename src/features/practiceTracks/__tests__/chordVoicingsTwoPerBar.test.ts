/**
 * A bar can hold two chords. Hip Hop L2's sus2 groove plays Am sus2 then Am in
 * each bar, and its Practice Track has to light A–C–E for Am, not the sus2.
 */
import { describe, expect, it } from 'vitest';
import { hipHopL2 } from '@/curriculum/data/activityFlows/hipHop_v2';
import { buildGenrePracticeTrack } from '../genre/buildGenrePracticeTrack';

describe('stylistic voicings with two chords a bar', () => {
  it('voices each chord of the Hip Hop L2 sus2 groove as the lesson did', () => {
    const track = buildGenrePracticeTrack(hipHopL2, 'B')!;
    expect(track.chordCycle).toEqual(['Asus2', 'Am', 'Dsus2', 'Dm']);
    const stylistic = track.voicingSets!.find((set) => set.id === 'stylistic')!;
    expect(stylistic.voicings).toEqual([
      [81, 83, 88], // A5-B5-E6
      [81, 84, 88], // A5-C6-E6
      [74, 76, 81], // D5-E5-A5
      [74, 77, 81], // D5-F5-A5
    ]);
  });
});
