import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── + Add track › Upload ───────────────────────────────────────────────────
// An audio file becomes a new Audio Track holding it as one clip at bar 1,
// named after the file, its audio in the buffer store as a pending clip
// (no assetId) for the draft and Save to keep. A MIDI file goes to the MIDI
// import. A file too big, too long or unreadable adds nothing and says why.

const h = vi.hoisted(() => ({
  decode: vi.fn(),
  setBuffer: vi.fn(),
  setOriginal: vi.fn(),
  importMidi: vi.fn(),
  notice: vi.fn(),
}));
vi.mock('@/lib/studio-assets/load-audio', () => ({
  getDecodeContext: () => ({ decodeAudioData: h.decode }),
}));
vi.mock('@/daw/audio/AudioBufferStore', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  setAudioBuffer: h.setBuffer,
  setOriginalAudio: h.setOriginal,
}));
vi.mock('@/daw/midi/importMidiToTracks', () => ({
  importMidiFileOrSay: h.importMidi,
}));
vi.mock('@/daw/shell/notice', () => ({ notice: h.notice }));

import { useStore } from '@/daw/store';
import { PPQ } from '@/daw/time/timeModel';
import { MAX_UPLOAD_BYTES, uploadFileToNewTrack } from '../uploadTrack';

const s = () => useStore.getState();
const file = (name: string, type: string, size = 16) => {
  const f = new File([new Uint8Array(16)], name, { type });
  if (size !== 16) Object.defineProperty(f, 'size', { value: size });
  return f;
};

beforeEach(() => {
  useStore.setState({
    tracks: [],
    selectedTrackId: null,
    channelStripTab: null,
    activeTutorialId: null,
    isRecording: false,
    bpm: 120,
  });
  for (const fn of Object.values(h)) fn.mockReset();
  h.decode.mockResolvedValue({ duration: 2 });
});

describe('Upload', () => {
  it('makes a plain audio track holding the file at bar 1', async () => {
    const id = await uploadFileToNewTrack(file('Big Riff.wav', 'audio/wav'));
    expect(s().tracks).toHaveLength(1);
    const track = s().tracks[0];
    expect(track).toMatchObject({
      id,
      name: 'Big Riff',
      type: 'audio',
      // No live input: an upload's dock is its effects (2026-10-22).
      instrument: 'none',
    });
    expect(track.audioClips).toHaveLength(1);
    const clip = track.audioClips[0];
    // Two seconds at 120 BPM: four beats.
    expect(clip).toMatchObject({ startTick: 0, duration: 4 * PPQ });
    expect(clip.assetId ?? null).toBeNull();
    expect(h.setBuffer).toHaveBeenCalledWith(clip.id, { duration: 2 });
    expect(h.setOriginal).toHaveBeenCalledWith(
      clip.id,
      expect.any(ArrayBuffer),
      'audio/wav',
    );
    expect(s().selectedTrackId).toBe(id);
    expect(s().channelStripTab).toBe('controls');
  });

  it('hands a MIDI file to the MIDI import', async () => {
    const midi = file('song.mid', 'audio/midi');
    expect(await uploadFileToNewTrack(midi)).toBe('');
    expect(h.importMidi).toHaveBeenCalledWith(midi);
    expect(h.decode).not.toHaveBeenCalled();
  });

  it('refuses a file too big, before reading it', async () => {
    await uploadFileToNewTrack(
      file('huge.wav', 'audio/wav', MAX_UPLOAD_BYTES + 1),
    );
    expect(h.decode).not.toHaveBeenCalled();
    expect(s().tracks).toHaveLength(0);
    expect(h.notice).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'That file is too big' }),
    );
  });

  it('refuses a file too long', async () => {
    h.decode.mockResolvedValue({ duration: 16 * 60 });
    await uploadFileToNewTrack(file('long.mp3', 'audio/mpeg'));
    expect(s().tracks).toHaveLength(0);
    expect(h.setBuffer).not.toHaveBeenCalled();
  });

  it('says so when the file can’t be decoded', async () => {
    h.decode.mockRejectedValue(new Error('bad'));
    await uploadFileToNewTrack(file('notes.txt.wav', 'audio/wav'));
    expect(s().tracks).toHaveLength(0);
    expect(h.notice).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'That file couldn’t be read' }),
    );
  });
});
