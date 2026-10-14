import { afterEach, describe, expect, it, vi } from 'vitest';
import { funkL2 } from '@/curriculum/data/activityFlows/funk_v2';
import { buildGenrePracticeTrack } from '@/features/practiceTracks/genre/buildGenrePracticeTrack';
import type { ActivityStepV2 } from '../../../types/activity.v2';
import { buildBackingNotes } from '../../genreGeneration/backingPatterns';
import { getPairing, rememberPairing } from '../../lessonPairings/registry';
import type { Band } from '../band';
import { rememberBand } from '../registry';

/**
 * A band in a lesson: every layer the step has the engine play, the first of
 * each part on the part's lesson voice, every other layer — and any with a
 * sound or level of its own — on an instrument of its own; and the same
 * layers as tracks of their own in the Practice Track.
 */

const BAND: Band = {
  id: 'test-funk-band',
  name: 'Test Funk Band',
  status: 'live',
  timeSignature: [4, 4],
  tempo: 96,
  layers: [
    {
      id: 'drums',
      name: 'Drums',
      instrument: 'drums',
      source: { kind: 'groove', id: 'groove_funk_01' },
    },
    {
      id: 'percussion',
      name: 'Percussion',
      instrument: 'percussion',
      source: { kind: 'groove', id: 'groove_funk_02' },
      sound: 'drum-machine:808',
    },
    {
      id: 'bass',
      name: 'Synth bass',
      instrument: 'bass',
      source: { kind: 'bassLine', id: 'funk' },
      sound: 'oracle-synth:BASS',
      volume: 0.7,
    },
  ],
};

const STYLE = 'funk-l2-syncopation';
const original = getPairing(STYLE)!;

const step = (engine: ('drums' | 'bass' | 'chords')[]) =>
  ({
    stepNumber: 1,
    section: 'B',
    module: 'funk_l2',
    subsection: 'B1',
    activity: 'test',
    direction: '',
    assessment: 'pitch_order_timing_duration',
    tag: 'funk:test',
    successFeedback: '',
    targetNotes: [],
    chordSymbols: ['Am9', 'D13'],
    backing_parts: { engine_generates: engine, student_plays: ['chords'] },
  }) as unknown as ActivityStepV2;

afterEach(() => {
  rememberPairing(original);
  rememberBand(BAND.id, null);
  vi.restoreAllMocks();
});

const voices = (notes: ReturnType<typeof buildBackingNotes>) =>
  [
    ...new Set(
      notes.map((n) => (n.voice ? `${n.part}:${n.voice.layer}` : `${n.part}`)),
    ),
  ].sort();

describe('a band in a lesson', () => {
  it('plays the first of each part on its lesson voice, the rest on their own', () => {
    rememberBand(BAND.id, BAND);
    rememberPairing({ id: STYLE, band: BAND.id });
    const notes = buildBackingNotes(
      step(['drums', 'bass']),
      57,
      2,
      'l2a',
      [],
      'funk',
    );
    expect(voices(notes)).toEqual(['bass:bass', 'drums', 'drums:percussion']);
    const bass = notes.find((n) => n.voice?.layer === 'bass')!;
    expect(bass.voice).toMatchObject({
      name: 'Synth bass',
      sound: 'oracle-synth:BASS',
      volume: 0.7,
    });
    expect(
      notes.find((n) => n.voice?.layer === 'percussion')!.voice!.sound,
    ).toBe('drum-machine:808');
  });

  it('leaves out a part the student plays', () => {
    rememberBand(BAND.id, BAND);
    rememberPairing({ id: STYLE, band: BAND.id });
    const notes = buildBackingNotes(step(['drums']), 57, 2, 'l2a', [], 'funk');
    expect(notes.some((n) => n.voice?.layer === 'bass')).toBe(false);
  });

  it('gives a Practice Track one track per voiced layer, beside the parts', () => {
    rememberBand(BAND.id, BAND);
    rememberPairing({ id: STYLE, band: BAND.id });
    const track = buildGenrePracticeTrack(funkL2, 'B')!;
    expect(track.layerClips.map((c) => [c.name, c.part, c.sound])).toEqual([
      ['Percussion', 'drums', 'drum-machine:808'],
      ['Synth bass', 'bass', 'oracle-synth:BASS'],
    ]);
    // The parts' own clips keep only their lesson-voice notes.
    expect(track.clips.drums?.events.length).toBeGreaterThan(0);
    expect(track.clips.bass).toBeUndefined();
  });
});
