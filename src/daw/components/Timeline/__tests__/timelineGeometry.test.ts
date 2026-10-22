import { describe, expect, it } from 'vitest';
import { useStore } from '@/daw/store';
import type { Track } from '@/daw/store/tracksSlice';
import { sameTimelineGeometry, timelineNeedsRedraw } from '../timelineGeometry';

const s = () => useStore.getState();

/** Two tracks: one with a MIDI clip, one with an audio clip. */
function tracks(): Track[] {
  useStore.setState({ tracks: [] });
  const midi = s().addTrack('midi', 'soundfont', 'Keys');
  s().addMidiClip(midi, {
    id: 'm1',
    startTick: 0,
    events: [{ note: 60, velocity: 100, startTick: 0, durationTicks: 480 }],
  } as never);
  const audio = s().addTrack('audio', 'audio-input', 'Vocals');
  s().addAudioClip(audio, {
    id: 'a1',
    startTick: 1920,
    duration: 1920,
    fadeInTicks: 0,
    fadeOutTicks: 0,
    assetId: null,
    offsetSeconds: 0,
  });
  return s().tracks;
}

describe('sameTimelineGeometry', () => {
  it('ignores what the canvas does not draw', () => {
    const before = tracks();
    const after = before.map((t) => ({
      ...t,
      volume: 0.2,
      pan: -1,
      mute: true,
      solo: true,
    }));
    expect(sameTimelineGeometry(before, after)).toBe(true);
  });

  it('sees what a clip header draws: names, roles and clip mutes (2.12)', () => {
    const before = tracks();
    const renamed = before.map((t) => ({ ...t, name: `${t.name}!` }));
    expect(sameTimelineGeometry(before, renamed)).toBe(false);
    const role = before.map((t) => ({ ...t, trackRole: 'drums' as const }));
    expect(sameTimelineGeometry(before, role)).toBe(false);
    const muted = before.map((t) => ({
      ...t,
      midiClips: t.midiClips.map((c) => ({ ...c, muted: true })),
    }));
    expect(sameTimelineGeometry(before, muted)).toBe(false);
    const named = before.map((t) => ({
      ...t,
      audioClips: t.audioClips.map((c) => ({ ...c, name: 'Take 2' })),
    }));
    expect(sameTimelineGeometry(before, named)).toBe(false);
    const audioMuted = before.map((t) => ({
      ...t,
      audioClips: t.audioClips.map((c) => ({ ...c, muted: true })),
    }));
    expect(sameTimelineGeometry(before, audioMuted)).toBe(false);
    const midiNamed = before.map((t) => ({
      ...t,
      midiClips: t.midiClips.map((c) => ({ ...c, name: 'Riff' })),
    }));
    expect(sameTimelineGeometry(before, midiNamed)).toBe(false);
  });

  it('treats rebuilt but equal clips as the same (a collab rebuild)', () => {
    const before = tracks();
    const after = before.map((t) => ({
      ...t,
      midiClips: t.midiClips.map((c) => ({ ...c })),
      audioClips: t.audioClips.map((c) => ({ ...c })),
    }));
    expect(sameTimelineGeometry(before, after)).toBe(true);
  });

  it('sees every change the canvas draws', () => {
    const before = tracks();
    const [midi, audio] = before;
    const withMidi = (c: Partial<Track['midiClips'][number]>) => [
      { ...midi, midiClips: [{ ...midi.midiClips[0], ...c }] },
      audio,
    ];
    const withAudio = (c: Partial<Track['audioClips'][number]>) => [
      midi,
      { ...audio, audioClips: [{ ...audio.audioClips[0], ...c }] },
    ];
    const changes: Track[][] = [
      [audio, midi],
      [midi],
      [{ ...midi, color: '#ff0000' }, audio],
      [{ ...midi, id: 'other' }, audio],
      withMidi({ startTick: 480 }),
      withMidi({ durationTicks: 3840 }),
      withMidi({ events: [] }),
      withMidi({ id: 'm2' }),
      withAudio({ startTick: 0 }),
      withAudio({ duration: 960 }),
      withAudio({ fadeInTicks: 240 }),
      withAudio({ fadeOutTicks: 240 }),
      withAudio({ offsetSeconds: 1.5 }),
      withAudio({ assetId: 'asset-1' }),
      [midi, { ...audio, audioClips: [] }],
    ];
    for (const after of changes) {
      expect(sameTimelineGeometry(before, after)).toBe(false);
    }
  });
});

describe('timelineNeedsRedraw', () => {
  it('redraws for the view and selection, not for the mixer', () => {
    tracks();
    const prev = s();
    const trackId = prev.tracks[0].id;

    s().updateTrack(trackId, { volume: 0.1 });
    expect(timelineNeedsRedraw(s(), prev)).toBe(false);

    s().setTimelineScrollLeft(prev.timelineScrollLeft + 100);
    expect(timelineNeedsRedraw(s(), prev)).toBe(true);
  });

  it('redraws when another track is selected: its lane is lit', () => {
    tracks();
    const [first, second] = s().tracks;
    s().setSelectedTrackId(first.id);
    const prev = s();
    s().setSelectedTrackId(second.id);
    expect(timelineNeedsRedraw(s(), prev)).toBe(true);
  });
});
