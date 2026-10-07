import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '@/daw/store';
import type { AudioClip, MidiClip } from '@/daw/store/tracksSlice';
import type { UserPresence } from '@/daw/collab/types';
import { pushUndo, resetUndoHistory, undo } from '@/daw/store/undoMiddleware';
import {
  getAudioBuffer,
  getOriginalAudio,
  setAudioBuffer,
  setOriginalAudio,
} from '@/daw/audio/AudioBufferStore';
import { splitAudioClipAt } from '../splitAudioClipAt';

// ── Scissors / Split at Playhead on an audio clip ──────────────────────────
// Cutting a take to remove a mistake must keep the take: both halves play
// the recording they came from, keep its asset (so they survive a reload)
// and undo brings back a clip that still plays.

const BPM = 120;
const SEC = 960; // ticks per second at 120 bpm

const fakeBuffer = () =>
  ({
    duration: 10,
    sampleRate: 48_000,
    length: 480_000,
    numberOfChannels: 1,
  }) as unknown as AudioBuffer;

const recorded: AudioClip = {
  id: 'take',
  startTick: 2 * SEC,
  duration: 6 * SEC,
  fadeInTicks: 120,
  fadeOutTicks: 480,
  assetId: 'asset-1',
  // Front-trimmed by a second, which the old split ignored.
  offsetSeconds: 1,
  gain: 0.6,
};

const midiClip: MidiClip = {
  id: 'midi',
  name: 'Keys',
  startTick: 0,
  events: [
    { note: 60, velocity: 100, startTick: 0, durationTicks: 480, channel: 0 },
  ],
};

let trackId = '';
const track = () => useStore.getState().tracks.find((t) => t.id === trackId)!;

beforeEach(() => {
  useStore.setState({ tracks: [], bpm: BPM, remoteUsers: new Map() });
  trackId = useStore.getState().addTrack('audio', 'vocal-fx', 'Vox');
  useStore.getState().addMidiClip(trackId, midiClip);
  useStore.getState().addAudioClip(trackId, recorded);
  resetUndoHistory();
});

describe('splitAudioClipAt', () => {
  it('splits without slicing: both halves play the take from the right place', () => {
    const buffer = fakeBuffer();
    const bytes = new ArrayBuffer(8);
    setAudioBuffer('take', buffer);
    setOriginalAudio('take', bytes, 'audio/webm');

    const rightId = splitAudioClipAt(trackId, 'take', 5 * SEC);

    expect(rightId).toBeTruthy();
    const [left, right] = track().audioClips;
    expect(track().audioClips).toHaveLength(2);
    expect(left).toEqual({
      ...recorded,
      duration: 3 * SEC,
      fadeOutTicks: 0,
    });
    expect(right).toEqual({
      ...recorded,
      id: rightId,
      startTick: 5 * SEC,
      duration: 3 * SEC,
      fadeInTicks: 0,
      // 3 s into the clip, after its 1 s trim.
      offsetSeconds: 4,
    });

    // The right half shares the take's audio and bytes; nothing is evicted.
    expect(getAudioBuffer(rightId!)).toBe(buffer);
    expect(getOriginalAudio(rightId!)?.bytes).toBe(bytes);
    expect(getAudioBuffer('take')).toBe(buffer);
  });

  it('undo brings back the whole clip, still playing', () => {
    const buffer = fakeBuffer();
    setAudioBuffer('take', buffer);
    pushUndo(); // what auto-capture records before the edit

    splitAudioClipAt(trackId, 'take', 5 * SEC);
    undo();

    expect(track().audioClips).toEqual([recorded]);
    expect(getAudioBuffer('take')).toBe(buffer);
  });

  it('is one store write and leaves MIDI clips alone', () => {
    const midiBefore = track().midiClips;
    let writes = 0;
    const stop = useStore.subscribe(
      (s) => s.tracks,
      () => {
        writes += 1;
      },
    );

    splitAudioClipAt(trackId, 'take', 5 * SEC);
    stop();

    expect(writes).toBe(1);
    expect(track().midiClips).toBe(midiBefore);
  });

  it('splits a clip whose audio is still downloading (halves load by asset)', () => {
    const rightId = splitAudioClipAt(trackId, 'take', 5 * SEC);
    expect(rightId).toBeTruthy();
    expect(track().audioClips.map((c) => c.assetId)).toEqual([
      'asset-1',
      'asset-1',
    ]);
  });

  it('does nothing outside the clip, for a MIDI clip, or on a locked track', () => {
    const before = track();
    expect(splitAudioClipAt(trackId, 'take', 2 * SEC)).toBeNull();
    expect(splitAudioClipAt(trackId, 'take', 8 * SEC)).toBeNull();
    expect(splitAudioClipAt(trackId, 'midi', 240)).toBeNull();
    expect(track()).toBe(before);

    useStore.setState({
      remoteUsers: new Map([
        [7, { selectedTrackId: trackId } as unknown as UserPresence],
      ]),
    });
    setAudioBuffer('take', fakeBuffer());
    const uuid = vi
      .spyOn(crypto, 'randomUUID')
      .mockReturnValue('0badc0de-0000-4000-8000-000000000000');
    expect(splitAudioClipAt(trackId, 'take', 5 * SEC)).toBeNull();
    uuid.mockRestore();
    expect(track()).toBe(before);
    // Nothing is left in the audio store for the half that never landed.
    expect(getAudioBuffer('clip-split-0badc0de')).toBeUndefined();
  });
});
