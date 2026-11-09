// @vitest-environment jsdom
import { Midi } from '@tonejs/midi';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Importing a MIDI file (1.11 e2) ────────────────────────────────────────
// The import used to keep only the notes (engine-hooks-30): no tempo, no
// metre, no sustain pedal, and every part a Synth track, drums included. A
// file that wasn't MIDI failed unheard from the menu and the picker, and a
// file with more parts than the track limit allows said "Track limit
// reached" and dropped the rest without a count (shell-26). Run:
// npx vitest run src/daw/midi/__tests__/importMidiToTracks.test.ts

const h = vi.hoisted(() => ({
  notices: [] as { title: string; description?: string; variant?: string }[],
}));
vi.mock('@/daw/shell/notice', () => ({
  notice: (n: { title: string; description?: string; variant?: string }) => {
    h.notices.push(n);
  },
}));

import { useStore } from '@/daw/store';
import {
  resetHistory,
  startHistory,
  undo,
  undoLabel,
} from '@/daw/store/history';
import { MAX_TOTAL_TRACKS } from '@/daw/store/tracksSlice';
import { readMidiFile } from '../MidiFileIO';
import {
  importMidiFileOrSay,
  importMidiToTracks,
  pickAndImportMidi,
} from '../importMidiToTracks';

const s = () => useStore.getState();
let release: () => void = () => {};

interface PartSpec {
  name: string;
  /** 0-based, as @tonejs/midi counts. */
  channel?: number;
  program?: number;
  notes?: [midi: number, ticks: number, durationTicks: number][];
  sustain?: [ticks: number, value: number][];
}

/** A .mid file at `ppq`, made with @tonejs/midi as another program would. */
function midiFile(
  parts: PartSpec[],
  opts: { bpm?: number; metre?: [number, number]; ppq?: number } = {},
): ArrayBuffer {
  const midi = new Midi();
  if (opts.bpm !== undefined) midi.header.setTempo(opts.bpm);
  if (opts.metre) {
    midi.header.timeSignatures.push({ ticks: 0, timeSignature: opts.metre });
  }
  midi.header.update();
  for (const part of parts) {
    const track = midi.addTrack();
    track.name = part.name;
    track.channel = part.channel ?? 0;
    track.instrument.number = part.program ?? 0;
    for (const [note, ticks, durationTicks] of part.notes ?? [[60, 0, 480]]) {
      track.addNote({ midi: note, ticks, durationTicks, velocity: 0.8 });
    }
    for (const [ticks, value] of part.sustain ?? []) {
      track.addCC({ number: 64, ticks, value: value / 127 });
    }
  }
  const bytes = midi.toArray();
  // @tonejs/midi always writes 480 ppq: the header's division (bytes 12–13)
  // is set here for a file at another resolution, its ticks kept as given.
  const ppq = opts.ppq ?? 480;
  bytes[12] = ppq >> 8;
  bytes[13] = ppq & 0xff;
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

const fileOf = (data: ArrayBuffer, name = 'song.mid') =>
  ({ name, arrayBuffer: async () => data }) as unknown as File;

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  resetHistory();
  release = startHistory();
  h.notices = [];
});

afterEach(() => {
  release();
  resetHistory();
});

describe('readMidiFile', () => {
  it('reads the tempo, metre, sustain pedal, program and drum parts', () => {
    const file = readMidiFile(
      midiFile(
        [
          {
            name: 'Piano',
            program: 4,
            sustain: [
              [0, 127],
              [960, 0],
            ],
          },
          { name: 'Kit', channel: 9, notes: [[36, 0, 120]] },
          { name: 'Empty', notes: [] },
        ],
        { bpm: 92, metre: [3, 4] },
      ),
    );
    expect(file.bpm).toBeCloseTo(92, 3);
    expect(file.timeSignature).toEqual([3, 4]);
    expect(file.parts.map((p) => p.sequence.trackName)).toEqual([
      'Piano',
      'Kit',
    ]);
    expect(file.parts.map((p) => [p.program, p.percussion])).toEqual([
      [4, false],
      [0, true],
    ]);
    expect(file.parts[0].sequence.ccEvents).toEqual([
      { tick: 0, controller: 64, value: 127, channel: 1 },
      { tick: 960, controller: 64, value: 0, channel: 1 },
    ]);
    expect(file.parts[1].sequence.events[0].channel).toBe(10);
  });

  it('says null for a file without tempo or metre', () => {
    const file = readMidiFile(midiFile([{ name: 'A' }]));
    expect(file.bpm).toBeNull();
    expect(file.timeSignature).toBeNull();
  });
});

describe('importMidiToTracks', () => {
  it("takes the file's tempo and metre into an empty project, in one undo", async () => {
    expect(s().bpm).not.toBe(92);
    await importMidiToTracks(
      midiFile([{ name: 'Lead' }], { bpm: 92, metre: [6, 8] }),
    );
    expect(s().bpm).toBe(92);
    expect([s().timeSignatureNumerator, s().timeSignatureDenominator]).toEqual([
      6, 8,
    ]);
    expect(h.notices).toHaveLength(1);
    expect(h.notices[0].description).toContain('92 BPM in 6/8');

    // One undo takes the tracks, the tempo and the metre back.
    const before = useStore.getInitialState();
    expect(undoLabel()).toBe('Import MIDI');
    undo();
    expect(s().tracks).toEqual([]);
    expect(s().bpm).toBe(before.bpm);
    expect(s().timeSignatureNumerator).toBe(before.timeSignatureNumerator);
  });

  it("keeps a begun project's tempo and metre and says what the file's were", async () => {
    const keys = s().addTrack('midi', 'soundfont', 'Keys');
    s().addMidiClip(keys, {
      id: 'k',
      startTick: 0,
      events: [
        {
          note: 60,
          velocity: 100,
          startTick: 0,
          durationTicks: 480,
          channel: 0,
        },
      ],
    });
    const bpm = s().bpm;
    await importMidiToTracks(
      midiFile([{ name: 'Lead' }], { bpm: 92, metre: [3, 4] }),
    );
    expect(s().bpm).toBe(bpm);
    expect(s().timeSignatureNumerator).toBe(4);
    expect(h.notices).toHaveLength(1);
    expect(h.notices[0].description).toBe(
      `The project keeps its ${bpm} BPM in 4/4; the file was in 92 BPM in 3/4.`,
    );
  });

  it('keeps the metre of a song that has sections but no clips', async () => {
    s().setTimeSignature(3, 4);
    useStore.setState({
      sections: [
        { id: 'v', type: 'verse', label: 'Verse', startTick: 0, endTick: 1440 },
      ] as ReturnType<typeof s>['sections'],
    });
    await importMidiToTracks(
      midiFile([{ name: 'Lead' }], { bpm: 92, metre: [6, 8] }),
    );
    expect(s().timeSignatureNumerator).toBe(3);
    expect(s().bpm).not.toBe(92);
  });

  it('keeps the tempo when the track limit lets nothing in', async () => {
    for (let i = 0; i < MAX_TOTAL_TRACKS; i++) {
      s().addTrack('midi', 'soundfont', `T${i}`);
    }
    const bpm = s().bpm;
    const added = await importMidiToTracks(
      midiFile([{ name: 'Lead' }], { bpm: 92, metre: [6, 8] }),
    );
    expect(added).toBe(0);
    expect(s().bpm).toBe(bpm);
    expect(s().timeSignatureNumerator).toBe(4);
  });

  it('puts the sustain pedal in the clip, rescaled to 480 ppq', async () => {
    await importMidiToTracks(
      midiFile(
        [
          {
            name: 'Piano',
            notes: [[60, 96, 96]],
            sustain: [
              [0, 127],
              [192, 0],
            ],
          },
        ],
        { ppq: 96 },
      ),
    );
    const clip = s().tracks[0].midiClips[0];
    expect(clip.events[0]).toMatchObject({
      startTick: 480,
      durationTicks: 480,
    });
    expect(clip.ccEvents).toEqual([
      { tick: 0, controller: 64, value: 127, channel: 1 },
      { tick: 960, controller: 64, value: 0, channel: 1 },
    ]);
  });

  it('makes a channel-10 part a drum-machine track', async () => {
    await importMidiToTracks(
      midiFile([
        { name: 'Bass', program: 33 },
        { name: 'Drums', channel: 9, notes: [[36, 0, 120]] },
      ]),
    );
    expect(s().tracks.map((t) => [t.name, t.instrument])).toEqual([
      ['Bass', 'oracle-synth'],
      ['Drums', 'drum-machine'],
    ]);
  });

  it('imports what fits and says how many parts were left out', async () => {
    for (let i = 0; i < MAX_TOTAL_TRACKS - 3; i++) {
      s().addTrack('midi', 'soundfont', `T${i}`);
    }
    const added = await importMidiToTracks(
      midiFile(
        Array.from({ length: 7 }, (_, i) => ({ name: `Part ${i + 1}` })),
      ),
    );
    expect(added).toBe(3);
    expect(s().tracks).toHaveLength(MAX_TOTAL_TRACKS);
    // One notice, not one per part.
    expect(h.notices).toHaveLength(1);
    expect(h.notices[0].title).toBe('Imported 3 tracks from the MIDI file');
    expect(h.notices[0].description).toContain("4 parts of 7 weren't imported");
    expect(h.notices[0].variant).toBe('destructive');
  });

  it('throws on a file that is not MIDI', async () => {
    await expect(
      importMidiToTracks(new TextEncoder().encode('not midi').buffer),
    ).rejects.toThrow();
  });
});

describe('importMidiFileOrSay', () => {
  it('says a bad file could not be read, and adds nothing', async () => {
    const bad = new TextEncoder().encode('RIFF....').buffer as ArrayBuffer;
    expect(await importMidiFileOrSay(fileOf(bad, 'broken.mid'))).toBe(0);
    expect(h.notices).toEqual([
      {
        title: 'That MIDI file couldn’t be read',
        description: 'broken.mid',
        variant: 'destructive',
      },
    ]);
    expect(s().tracks).toEqual([]);
  });

  it('is what the picker runs', async () => {
    const bad = new TextEncoder().encode('nope').buffer as ArrayBuffer;
    const click = vi
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(function (this: HTMLInputElement) {
        Object.defineProperty(this, 'files', {
          value: [fileOf(bad, 'picked.mid')],
        });
        this.dispatchEvent(new Event('change'));
      });
    pickAndImportMidi();
    await vi.waitFor(() =>
      expect(h.notices.map((n) => n.description)).toEqual(['picked.mid']),
    );
    click.mockRestore();
  });
});
