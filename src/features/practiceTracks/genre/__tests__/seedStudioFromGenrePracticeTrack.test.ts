// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { funkL2 } from '@/curriculum/data/activityFlows/funk_v2';
import type { ActivitySectionId } from '@/curriculum/types/activity';
import { resetSessionToEmpty } from '@/daw/persistence/SessionSerializer';
import { resetProjectState } from '@/daw/persistence/projectDocument/initialState';
import { useStore } from '@/daw/store';
import { buildGenrePracticeTrack } from '../buildGenrePracticeTrack';
import { applyGenrePracticeTrack } from '../seedStudioFromGenrePracticeTrack';

/** Each seed starts from an empty session, reset the way openSession resets
 *  before it applies, so seeding twice in one test is two independent
 *  Practice Tracks rather than one with both sets of tracks. */
const seed = (section: ActivitySectionId) => {
  resetSessionToEmpty();
  resetProjectState('practice');
  const track = buildGenrePracticeTrack(funkL2, section)!;
  const studentTrackId = applyGenrePracticeTrack(track, 'Funk');
  return { track, studentTrackId, state: useStore.getState() };
};

describe('applyGenrePracticeTrack', () => {
  it('names the project after the level and section', () => {
    expect(seed('A').state.projectName).toBe('Funk L2 — Melody Practice Track');
  });

  it('sets the key, mode and tempo of the level', () => {
    const { state } = seed('A');
    expect(state.rootNote).toBe(9); // A
    expect(state.mode).toBe('dorian');
    expect(state.bpm).toBe(102);
  });

  it('adds a track per backing part plus one for the student', () => {
    const { state } = seed('A'); // drums + bass + chords, student on melody
    expect(state.tracks).toHaveLength(4);
    const { state: chords } = seed('B'); // drums + bass, student on chords
    expect(chords.tracks).toHaveLength(3);
  });

  it('leaves the student their own empty track, armed and selected', () => {
    const { studentTrackId, state } = seed('A');
    const student = state.tracks.find((t) => t.id === studentTrackId)!;
    expect(student.midiClips ?? []).toHaveLength(0);
    expect(student.recordArmed).toBe(true);
    expect(student.monitoring).toBe(true);
    expect(state.selectedTrackId).toBe(studentTrackId);
    // Nothing else is armed, so a take can only land on their track.
    expect(state.tracks.filter((t) => t.recordArmed).map((t) => t.id)).toEqual([
      studentTrackId,
    ]);
  });

  it('plays the backing on the instruments the lesson uses', () => {
    const { state } = seed('A');
    const byName = Object.fromEntries(
      state.tracks.map((t) => [t.name, t.instrument]),
    );
    expect(byName.Drums).toBe('drum-machine');
    expect(byName.Bass).toBe('bass-electric');
    expect(byName.Chords).toBe('electric-piano');
  });

  it('puts a bass part on a bass and everything else on the Rhodes', () => {
    const bass = seed('C');
    expect(
      bass.state.tracks.find((t) => t.id === bass.studentTrackId)!.instrument,
    ).toBe('bass-electric');

    for (const section of ['A', 'B', 'D'] as ActivitySectionId[]) {
      const s = seed(section);
      expect(
        s.state.tracks.find((t) => t.id === s.studentTrackId)!.instrument,
      ).toBe('electric-piano');
    }
  });

  it('loops the whole track from the top', () => {
    const { track, state } = seed('A');
    expect(state.loopEnabled).toBe(true);
    expect(state.loopStart).toBe(0);
    expect(state.loopEnd).toBe(track.loopTicks);
  });

  it('fills the chord lane', () => {
    const { state } = seed('B');
    expect(state.chordRegions).toHaveLength(16);
  });
});
