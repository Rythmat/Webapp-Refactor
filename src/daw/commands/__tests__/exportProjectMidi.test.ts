import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MidiChannelSequence } from '@/daw/midi/MidiFileIO';

// ── File ▸ Export MIDI (milestones 2.12, 2.15) ─────────────────────────────
// The file holds what plays, as the audio export does: a muted clip is left
// out, and a track whose clips are all muted gets no MIDI track. Since 2.15
// it is named after the song (one track's export after the track too), a
// drum track plays on channel 10 and the others take 1–16 without 10, and
// `trackIds` picks the tracks. Run:
// npx vitest run src/daw/commands/__tests__/exportProjectMidi.test.ts

const h = vi.hoisted(() => ({
  exported: null as MidiChannelSequence[] | null,
  downloads: [] as string[],
}));
vi.mock('@/daw/midi/MidiFileIO', () => ({
  exportMidiFile: (tracks: MidiChannelSequence[]) => {
    h.exported = tracks;
    return new Blob(['MThd']);
  },
}));
vi.mock('@/daw/utils/exportFiles', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/daw/utils/exportFiles')>()),
  downloadFile: (_blob: Blob, filename: string) => {
    h.downloads.push(filename);
  },
}));

import { useStore } from '@/daw/store';
import type { MidiClip, Track } from '@/daw/store/tracksSlice';
import {
  buildProjectMidi,
  exportProjectMidi,
  MIDI_DRUM_CHANNEL,
  planProjectMidi,
  type ProjectMidiState,
} from '../projectCommands';

const s = () => useStore.getState();
const note = (n: number, startTick = 0) => ({
  note: n,
  velocity: 100,
  startTick,
  durationTicks: 240,
  channel: 0,
});

/** A bare MIDI track holding one note, for states past the track limit. */
const bareTrack = (
  id: string,
  instrument = 'piano-sampler',
  name = id,
): Track =>
  ({
    id,
    name,
    type: 'midi',
    instrument,
    trackRole: 'auto',
    midiClips: [{ id: `${id}-c`, startTick: 0, events: [note(60)] }],
    audioClips: [],
  }) as unknown as Track;

const bareState = (tracks: Track[]): ProjectMidiState => ({
  tracks,
  projectName: 'Night Drive',
  bpm: 96,
  timeSignatureNumerator: 3,
  timeSignatureDenominator: 4,
});

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  h.exported = null;
  h.downloads = [];
});

describe('exportProjectMidi', () => {
  it('leaves muted clips out of the file', async () => {
    const keys = s().addTrack('midi', 'piano-sampler', 'Keys');
    const bass = s().addTrack('midi', 'piano-sampler', 'Bass');
    s().addMidiClip(keys, {
      id: 'heard',
      startTick: 0,
      events: [note(60)],
    } as MidiClip);
    s().addMidiClip(keys, {
      id: 'muted',
      startTick: 1920,
      events: [note(62)],
      muted: true,
    } as MidiClip);
    s().addMidiClip(bass, {
      id: 'all-muted',
      startTick: 0,
      events: [note(36)],
      muted: true,
    } as MidiClip);

    expect(await exportProjectMidi()).toBe(true);

    expect(h.exported!.map((t) => t.sequence.trackName)).toEqual(['Keys']);
    expect(h.exported![0].sequence.events.map((e) => e.note)).toEqual([60]);
  });

  it('writes no file when every clip is muted', async () => {
    const keys = s().addTrack('midi', 'piano-sampler', 'Keys');
    s().addMidiClip(keys, {
      id: 'muted',
      startTick: 0,
      events: [note(60)],
      muted: true,
    } as MidiClip);

    expect(await exportProjectMidi()).toBe(false);

    expect(h.exported).toBeNull();
    expect(h.downloads).toEqual([]);
  });

  it('names the file after the song, and after the track for one track', async () => {
    s().setProjectName('Night Drive!');
    const keys = s().addTrack('midi', 'piano-sampler', 'Keys');
    const bass = s().addTrack('midi', 'piano-sampler', 'Bass Line');
    s().addMidiClip(keys, {
      id: 'k',
      startTick: 0,
      events: [note(60)],
    } as MidiClip);
    s().addMidiClip(bass, {
      id: 'b',
      startTick: 0,
      events: [note(36)],
    } as MidiClip);

    await exportProjectMidi();
    await exportProjectMidi({ trackIds: [bass] });

    expect(h.downloads).toEqual([
      'night-drive.mid',
      'night-drive-bass-line.mid',
    ]);
    expect(h.exported!.map((t) => t.sequence.trackName)).toEqual(['Bass Line']);
  });

  it('puts a drum track on channel 10 and the others on 1, 2…', async () => {
    const keys = s().addTrack('midi', 'piano-sampler', 'Keys');
    const drums = s().addTrack('midi', 'drum-machine', 'Beat');
    const bass = s().addTrack('midi', 'piano-sampler', 'Bass');
    for (const id of [keys, drums, bass]) {
      s().addMidiClip(id, {
        id: `${id}-c`,
        startTick: 0,
        events: [note(40)],
      } as MidiClip);
    }

    await exportProjectMidi();

    expect(h.exported!.map((t) => [t.sequence.trackName, t.channel])).toEqual([
      ['Keys', 1],
      ['Beat', MIDI_DRUM_CHANNEL],
      ['Bass', 2],
    ]);
  });
});

describe('planProjectMidi', () => {
  it('wraps seventeen tracks round 1–16 without ever using 10', () => {
    const tracks = Array.from({ length: 17 }, (_, i) => bareTrack(`t${i}`));
    const plan = planProjectMidi(bareState(tracks))!;

    const channels = plan.tracks.map((t) => t.channel);
    expect(channels).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 1, 2,
    ]);
    // One MIDI track per editor track, even where two share a channel.
    expect(plan.tracks).toHaveLength(17);
  });

  it('knows a kit by its role too, and every kit shares channel 10', () => {
    const plan = planProjectMidi(
      bareState([
        bareTrack('a', 'piano-sampler', 'Drums'),
        bareTrack('b', 'piano-sampler', 'Piano'),
        bareTrack('c', 'drum-machine', 'Perc'),
      ]),
    )!;
    expect(plan.tracks.map((t) => t.channel)).toEqual([10, 1, 10]);
  });

  it('keeps only the asked-for tracks, in the project order', () => {
    const plan = planProjectMidi(
      bareState([bareTrack('a'), bareTrack('b'), bareTrack('c')]),
      { trackIds: ['c', 'a'] },
    )!;
    expect(plan.tracks.map((t) => t.sequence.trackName)).toEqual(['a', 'c']);
    expect(plan.tracks.map((t) => t.channel)).toEqual([1, 2]);
    expect(plan.filename).toBe('night-drive.mid');
    expect(plan.bpm).toBe(96);
    expect(plan.timeSignature).toEqual([3, 4]);
  });

  it('is null with no tracks, empty tracks or an empty selection', async () => {
    expect(planProjectMidi(bareState([]))).toBeNull();
    const empty = {
      ...bareTrack('e'),
      midiClips: [{ id: 'c', startTick: 0, events: [] }],
    } as unknown as Track;
    expect(planProjectMidi(bareState([empty]))).toBeNull();
    expect(
      planProjectMidi(bareState([bareTrack('a')]), { trackIds: ['nope'] }),
    ).toBeNull();
    expect(await buildProjectMidi(bareState([]))).toBeNull();
    expect(h.exported).toBeNull();
  });

  it('falls back to "mixdown" for a song without a name', () => {
    const plan = planProjectMidi({
      ...bareState([bareTrack('a', 'piano-sampler', '???')]),
      projectName: '',
    })!;
    expect(plan.filename).toBe('mixdown.mid');
    expect(
      planProjectMidi(
        { ...bareState([bareTrack('a', 'piano-sampler', '???')]) },
        { trackIds: ['a'] },
      )!.filename,
    ).toBe('night-drive-track.mid');
  });

  it('writes a file where drums play on channel 10 and shared channels keep both tracks', async () => {
    const real = await vi.importActual<typeof import('@/daw/midi/MidiFileIO')>(
      '@/daw/midi/MidiFileIO',
    );
    const tracks = [
      bareTrack('kit', 'drum-machine', 'Kit'),
      ...Array.from({ length: 16 }, (_, i) => bareTrack(`t${i}`)),
    ];
    const plan = planProjectMidi(bareState(tracks))!;
    const blob = real.exportMidiFile(plan.tracks, plan.bpm, plan.timeSignature);
    const read = real.importMidiFile(await blob.arrayBuffer());

    expect(read).toHaveLength(17);
    // importMidiFile numbers channels from 1, as the writer does.
    expect(read[0].trackName).toBe('Kit');
    expect(read[0].events[0].channel).toBe(10);
    expect(read.slice(1).map((t) => t.events[0].channel)).not.toContain(10);
    expect(read[16].events[0].channel).toBe(1);
  });
});
