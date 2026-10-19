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
  writerArgs: null as unknown[] | null,
  downloads: [] as string[],
  notices: [] as string[],
}));
vi.mock('@/daw/midi/MidiFileIO', () => ({
  exportMidiFile: (tracks: MidiChannelSequence[], ...rest: unknown[]) => {
    h.exported = tracks;
    h.writerArgs = rest;
    return new Blob(['MThd']);
  },
}));
vi.mock('@/daw/shell/notice', () => ({
  notice: ({ title }: { title: string }) => {
    h.notices.push(title);
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
import { Midi } from '@tonejs/midi';
import {
  buildProjectMidi,
  exportProjectMidi,
  exportProjectMidiOrSay,
  MIDI_DRUM_CHANNEL,
  NO_MIDI_NOTES_NOTICE,
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
  h.writerArgs = null;
  h.downloads = [];
  h.notices = [];
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

// ── The file keeps the key, the metre and the sounds (1.11 e2) ─────────────
// Written with the real writer and read back with @tonejs/midi, as another
// program would read it: 480 ppq, clips at their places, the metre and the
// key signature, drums on channel 10, a General MIDI program per track and
// the sustain pedal. Project ▸ MIDI file and ⇧⌘E say when there's nothing
// to write, as the Export dialog does (ia-flows-11).

describe('the MIDI file, read back', () => {
  const real = () =>
    vi.importActual<typeof import('@/daw/midi/MidiFileIO')>(
      '@/daw/midi/MidiFileIO',
    );
  const writeAndRead = async (state: ProjectMidiState) => {
    const { exportMidiFile } = await real();
    const plan = planProjectMidi(state)!;
    const blob = exportMidiFile(
      plan.tracks,
      plan.bpm,
      plan.timeSignature,
      plan.key,
    );
    return new Midi(await blob.arrayBuffer());
  };

  it('keeps ppq, clip places, metre, key, drums on 10 and the programs', async () => {
    s().setBpm(92);
    s().setTimeSignature(6, 8);
    s().setRootNote(2); // D
    s().setMode('ionian');
    const keys = s().addTrack('midi', 'electric-piano', 'Keys');
    const drums = s().addTrack('midi', 'drum-machine', 'Beat');
    const bass = s().addTrack('midi', 'bass-electric', 'Bass', {
      bassVoice: 'fretless',
    });
    const synth = s().addTrack('midi', 'oracle-synth', 'Lead');
    // A clip at bar 3 (6/8: 1440 ticks a bar) with a note 240 ticks in.
    s().addMidiClip(keys, {
      id: 'k',
      startTick: 2880,
      events: [note(62, 240)],
      ccEvents: [
        { tick: 0, controller: 64, value: 127, channel: 0 },
        { tick: 480, controller: 64, value: 0, channel: 0 },
      ],
    } as MidiClip);
    s().addMidiClip(drums, {
      id: 'd',
      startTick: 0,
      events: [note(36)],
    } as MidiClip);
    s().addMidiClip(bass, {
      id: 'b',
      startTick: 1440,
      events: [note(38)],
    } as MidiClip);
    s().addMidiClip(synth, {
      id: 's',
      startTick: 0,
      events: [note(74)],
    } as MidiClip);

    const midi = await writeAndRead(s());

    expect(midi.header.ppq).toBe(480);
    expect(midi.header.tempos[0].bpm).toBeCloseTo(92, 3);
    expect(midi.header.timeSignatures[0].timeSignature).toEqual([6, 8]);
    // D major: two sharps, which @tonejs/midi names by its major key.
    expect(midi.header.keySignatures).toEqual([
      { ticks: 0, key: 'D', scale: 'major' },
    ]);
    const [k, d, b, l] = midi.tracks;
    expect(k.notes[0].ticks).toBe(2880 + 240);
    expect(b.notes[0].ticks).toBe(1440);
    expect(d.channel).toBe(9);
    expect(d.instrument.percussion).toBe(true);
    expect([k.channel, b.channel, l.channel]).toEqual([0, 1, 2]);
    // Electric Piano 1, Fretless Bass; the Oracle synth has no GM match.
    expect(k.instrument.number).toBe(4);
    expect(b.instrument.number).toBe(35);
    expect(l.instrument.number).toBe(0);
    // The sustain pedal, in song time.
    expect(
      k.controlChanges[64].map((cc) => [cc.ticks, Math.round(cc.value * 127)]),
    ).toEqual([
      [2880, 127],
      [2880 + 480, 0],
    ]);
  });

  it('writes a minor-third mode as minor with its parent signature', async () => {
    s().setRootNote(9); // A
    s().setMode('aeolian');
    const keys = s().addTrack('midi', 'piano-sampler', 'Keys');
    s().addMidiClip(keys, {
      id: 'k',
      startTick: 0,
      events: [note(57)],
    } as MidiClip);
    expect((await writeAndRead(s())).header.keySignatures[0]).toMatchObject({
      key: 'C',
      scale: 'minor',
    });

    // E♭ dorian takes D♭ major's five flats.
    s().setRootNote(3);
    s().setMode('dorian');
    expect((await writeAndRead(s())).header.keySignatures[0]).toMatchObject({
      key: 'Db',
      scale: 'minor',
    });
  });

  it('writes no key signature for a song without a key', async () => {
    s().setRootNote(null);
    const keys = s().addTrack('midi', 'piano-sampler', 'Keys');
    s().addMidiClip(keys, {
      id: 'k',
      startTick: 0,
      events: [note(60)],
    } as MidiClip);
    expect((await writeAndRead(s())).header.keySignatures).toEqual([]);
    expect(planProjectMidi(bareState([bareTrack('a')]))!.key).toBeNull();
  });

  it('hands the key to the writer from buildProjectMidi', async () => {
    s().setRootNote(5);
    s().setMode('ionian');
    const keys = s().addTrack('midi', 'piano-sampler', 'Keys');
    s().addMidiClip(keys, {
      id: 'k',
      startTick: 0,
      events: [note(60)],
    } as MidiClip);
    await buildProjectMidi(s());
    expect(h.writerArgs).toEqual([
      s().bpm,
      [4, 4],
      { rootNote: 5, mode: 'ionian' },
    ]);
  });
});

describe('exportProjectMidiOrSay', () => {
  it('says there is nothing to write, and writes nothing', async () => {
    expect(await exportProjectMidiOrSay()).toBe(false);
    expect(h.notices).toEqual([NO_MIDI_NOTES_NOTICE]);
    expect(h.downloads).toEqual([]);
  });

  it('says nothing when it writes a file', async () => {
    const keys = s().addTrack('midi', 'piano-sampler', 'Keys');
    s().addMidiClip(keys, {
      id: 'k',
      startTick: 0,
      events: [note(60)],
    } as MidiClip);
    expect(await exportProjectMidiOrSay()).toBe(true);
    expect(h.notices).toEqual([]);
    expect(h.downloads).toHaveLength(1);
  });

  it('is what ⇧⌘E runs', async () => {
    const { GLOBAL_HANDLERS } = await import('../globalCommands');
    await GLOBAL_HANDLERS['project.exportMidi']?.({} as KeyboardEvent);
    await vi.waitFor(() => expect(h.notices).toEqual([NO_MIDI_NOTES_NOTICE]));
  });
});
