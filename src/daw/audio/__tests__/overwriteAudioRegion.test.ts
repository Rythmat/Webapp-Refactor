import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '@/daw/store';
import type { AudioClip, MidiClip } from '@/daw/store/tracksSlice';
import type { UserPresence } from '@/daw/collab/types';
import { resetUndoHistory, pushUndo, undo } from '@/daw/store/undoMiddleware';
import {
  getAudioBuffer,
  getOriginalAudio,
  setAudioBuffer,
  setOriginalAudio,
} from '../AudioBufferStore';
import { overwriteAudioRegion } from '../overwriteAudioRegion';

// ── Record-over ────────────────────────────────────────────────────────────
// A new take replaces what it rolls over and nothing else: the parts of an
// earlier take outside it must keep playing that take, after an undo and
// after a reload, so they keep its audio, asset and trim.

const BPM = 120;
const SEC = 960; // ticks per second at 120 bpm
const ctx = {} as AudioContext; // nothing is sliced any more

/** A decoded take; nothing reads its samples here. */
const fakeBuffer = (seconds: number) =>
  ({
    duration: seconds,
    sampleRate: 48_000,
    length: seconds * 48_000,
    numberOfChannels: 1,
  }) as unknown as AudioBuffer;

const audioClip = (over: Partial<AudioClip>): AudioClip => ({
  id: 'clip',
  startTick: 0,
  duration: SEC,
  fadeInTicks: 0,
  fadeOutTicks: 0,
  ...over,
});

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

/** An audio track holding an earlier take at 0–8 s and the new take at 2–4 s. */
function recordOver(earlier: Partial<AudioClip> = {}) {
  useStore.getState().addMidiClip(trackId, midiClip);
  useStore.getState().addAudioClip(
    trackId,
    audioClip({
      id: 'earlier',
      duration: 8 * SEC,
      fadeInTicks: 120,
      fadeOutTicks: 480,
      assetId: 'asset-earlier',
      offsetSeconds: 0.5,
      gain: 0.7,
      ...earlier,
    }),
  );
  useStore
    .getState()
    .addAudioClip(
      trackId,
      audioClip({ id: 'take', startTick: 2 * SEC, duration: 2 * SEC }),
    );
}

beforeEach(() => {
  useStore.setState({ tracks: [], bpm: BPM, remoteUsers: new Map() });
  trackId = useStore.getState().addTrack('audio', 'vocal-fx', 'Vox');
  resetUndoHistory();
});

describe('overwriteAudioRegion', () => {
  it('keeps both sides of the earlier take, playing the same recording', () => {
    const buffer = fakeBuffer(10);
    const original = { bytes: new ArrayBuffer(8), contentType: 'audio/webm' };
    setAudioBuffer('earlier', buffer);
    setOriginalAudio('earlier', original.bytes, original.contentType);
    recordOver();

    overwriteAudioRegion(trackId, 2 * SEC, 4 * SEC, ctx, BPM, 'take');

    const [left, right, take] = track().audioClips;
    expect(track().audioClips).toHaveLength(3);
    expect(take.id).toBe('take');
    expect(left).toEqual(
      audioClip({
        id: 'earlier',
        duration: 2 * SEC,
        fadeInTicks: 120,
        assetId: 'asset-earlier',
        offsetSeconds: 0.5,
        gain: 0.7,
      }),
    );
    expect(right).toEqual(
      audioClip({
        id: right.id,
        startTick: 4 * SEC,
        duration: 4 * SEC,
        fadeOutTicks: 480,
        assetId: 'asset-earlier',
        // 4 s into the earlier take, after its 0.5 s trim.
        offsetSeconds: 4.5,
        gain: 0.7,
      }),
    );
    expect(right.id).not.toBe('earlier');

    // The new piece plays (and would upload) the same take, not a copy.
    expect(getAudioBuffer(right.id)).toBe(buffer);
    expect(getOriginalAudio(right.id)?.bytes).toBe(original.bytes);
    // Nothing was evicted.
    expect(getAudioBuffer('earlier')).toBe(buffer);
  });

  it('undo brings the earlier take back still playing', () => {
    const buffer = fakeBuffer(10);
    setAudioBuffer('earlier', buffer);
    recordOver();
    pushUndo(); // what the take's recording stop captures

    overwriteAudioRegion(trackId, 0, 8 * SEC, ctx, BPM, 'take');
    expect(track().audioClips.map((c) => c.id)).toEqual(['take']);

    undo();
    const earlier = track().audioClips.find((c) => c.id === 'earlier');
    expect(earlier?.duration).toBe(8 * SEC);
    expect(getAudioBuffer('earlier')).toBe(buffer);
  });

  it('keeps the remainders of a take still downloading (they load by asset)', () => {
    // No decoded audio yet: this used to delete the whole earlier take.
    recordOver({ id: 'loading' });

    overwriteAudioRegion(trackId, 2 * SEC, 4 * SEC, ctx, BPM, 'take');

    const pieces = track().audioClips.filter((c) => c.id !== 'take');
    expect(pieces).toHaveLength(2);
    expect(pieces.every((c) => c.assetId === 'asset-earlier')).toBe(true);
  });

  it('writes the store once and leaves MIDI clips alone', () => {
    recordOver();
    const midiBefore = track().midiClips;
    let writes = 0;
    const stop = useStore.subscribe(
      (s) => s.tracks,
      () => {
        writes += 1;
      },
    );

    overwriteAudioRegion(trackId, 2 * SEC, 4 * SEC, ctx, BPM, 'take');
    stop();

    expect(writes).toBe(1);
    expect(track().midiClips).toBe(midiBefore);
  });

  it('does nothing when the take overlaps no other clip', () => {
    recordOver({ startTick: 10 * SEC });
    const before = track();

    overwriteAudioRegion(trackId, 2 * SEC, 4 * SEC, ctx, BPM, 'take');

    expect(track()).toBe(before);
  });

  it('leaves nothing in the audio store when a track lock refuses the write', () => {
    setAudioBuffer('earlier', fakeBuffer(10));
    recordOver();
    const before = track();
    useStore.setState({
      remoteUsers: new Map([
        [7, { selectedTrackId: trackId } as unknown as UserPresence],
      ]),
    });
    const uuid = vi
      .spyOn(crypto, 'randomUUID')
      .mockReturnValue('0badc0de-0000-4000-8000-000000000000');

    overwriteAudioRegion(trackId, 2 * SEC, 4 * SEC, ctx, BPM, 'take');
    uuid.mockRestore();

    expect(track()).toBe(before);
    expect(getAudioBuffer('clip-trim-0badc0de')).toBeUndefined();
  });
});
