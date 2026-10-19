import { Midi } from '@tonejs/midi';
import { describe, expect, it } from 'vitest';
import type { MidiSequence } from '@prism/engine';
import { unisonToMidi } from '@/unison/converters/unisonToMidi';
import type { UnisonDocument } from '@/unison/types/schema';
import { exportMidiFile, importMidiFile, MIDI_FILE_PPQ } from '../MidiFileIO';

// ── MIDI files the Studio writes (milestone 2.15) ──────────────────────────
// Written at 480 ticks per quarter and read back with @tonejs/midi as any
// other program reads them: a note at bar 2 sounds at bar 2 (the old writer
// stamped 128 ppq on 480-ppq ticks, so files played 3.75 times slow), a
// velocity of 64 stays 64 (it came out as 81), and channels, metre and tempo
// are the ones asked for. Run:
// npx vitest run src/daw/midi/__tests__/MidiFileIO.test.ts

const seq = (
  trackName: string,
  events: [note: number, start: number, length: number, velocity: number][],
  ticksPerQuarterNote = 480,
): MidiSequence => ({
  ticksPerQuarterNote,
  trackName,
  events: events.map(([note, startTick, durationTicks, velocity]) => ({
    note,
    startTick,
    durationTicks,
    velocity,
    channel: 0,
  })),
});

const read = async (blob: Blob) => new Midi(await blob.arrayBuffer());

describe('exportMidiFile', () => {
  it('writes 480 ppq, so a note at bar 2 is at bar 2 in ticks and seconds', async () => {
    const blob = exportMidiFile(
      [
        {
          channel: 1,
          sequence: seq('Keys', [
            [60, 0, 480, 100],
            [64, 1920, 480, 100],
          ]),
        },
      ],
      96,
      [4, 4],
    );
    const midi = await read(blob);

    expect(blob.type).toBe('audio/midi');
    expect(midi.header.ppq).toBe(MIDI_FILE_PPQ);
    const [first, bar2] = midi.tracks[0].notes;
    // A quarter is 480 ticks.
    expect(first.durationTicks).toBe(480);
    expect(bar2.ticks).toBe(1920);
    // Four beats at 96 bpm: 2.5 s (the old files put it at 9.375 s).
    expect(bar2.time).toBeCloseTo(2.5, 6);
    expect(first.duration).toBeCloseTo(60 / 96, 6);
  });

  it('keeps velocities as they are', async () => {
    const velocities = [1, 40, 64, 100, 127];
    const midi = await read(
      exportMidiFile(
        [
          {
            channel: 1,
            sequence: seq(
              'Keys',
              velocities.map((v, i) => [60, i * 480, 240, v]),
            ),
          },
        ],
        120,
      ),
    );
    expect(
      midi.tracks[0].notes.map((n) => Math.round(n.velocity * 127)),
    ).toEqual(velocities);
    // importMidiFile reads them back the same.
    const back = importMidiFile(
      await exportMidiFile(
        [{ channel: 1, sequence: seq('K', [[60, 0, 240, 64]]) }],
        120,
      ).arrayBuffer(),
    );
    expect(back[0].events[0].velocity).toBe(64);
  });

  it('writes the channels, names, metre and tempo asked for', async () => {
    const midi = await read(
      exportMidiFile(
        [
          { channel: 1, sequence: seq('Keys', [[60, 0, 480, 90]]) },
          { channel: 10, sequence: seq('Drums', [[36, 0, 0, 110]]) },
          { channel: 1, sequence: seq('Pad', [[67, 0, 480, 70]]) },
          { channel: 16, sequence: seq('Lead', [[72, 0, 480, 80]]) },
        ],
        104,
        [6, 8],
      ),
    );

    // @tonejs/midi counts channels from 0.
    expect(midi.tracks.map((t) => [t.name, t.channel])).toEqual([
      ['Keys', 0],
      ['Drums', 9],
      ['Pad', 0],
      ['Lead', 15],
    ]);
    expect(midi.header.timeSignatures[0].timeSignature).toEqual([6, 8]);
    expect(midi.header.tempos[0].bpm).toBeCloseTo(104, 3);
  });

  it("rescales a sequence's own resolution to the file's", async () => {
    const midi = await read(
      exportMidiFile(
        [{ channel: 1, sequence: seq('Old', [[60, 96, 96, 100]], 96) }],
        120,
      ),
    );
    expect(midi.tracks[0].notes[0].ticks).toBe(480);
    expect(midi.tracks[0].notes[0].durationTicks).toBe(480);
  });
});

describe('unisonToMidi', () => {
  it('still round-trips notes, channels and timing', async () => {
    const doc = {
      metadata: { ticksPerQuarterNote: 480 },
      rhythm: { bpm: 90 },
      tracks: [
        {
          id: 'm',
          name: 'Melody',
          channel: 4,
          events: [
            { pitch: 72, velocity: 64, startTick: 0, durationTicks: 480 },
            { pitch: 74, velocity: 100, startTick: 1920, durationTicks: 960 },
          ],
        },
        {
          id: 'd',
          name: 'Drums',
          channel: 10,
          events: [
            { pitch: 36, velocity: 120, startTick: 960, durationTicks: 120 },
          ],
        },
      ],
    } as unknown as UnisonDocument;

    const back = importMidiFile(await unisonToMidi(doc).arrayBuffer());

    expect(back.map((t) => t.trackName)).toEqual(['Melody', 'Drums']);
    expect(back[0].events).toEqual([
      {
        note: 72,
        velocity: 64,
        startTick: 0,
        durationTicks: 480,
        channel: 4,
      },
      {
        note: 74,
        velocity: 100,
        startTick: 1920,
        durationTicks: 960,
        channel: 4,
      },
    ]);
    expect(back[1].events).toEqual([
      {
        note: 36,
        velocity: 120,
        startTick: 960,
        durationTicks: 120,
        channel: 10,
      },
    ]);
    expect(
      new Midi(await unisonToMidi(doc).arrayBuffer()).header.tempos[0].bpm,
    ).toBeCloseTo(90, 3);
  });

  it('writes the time signature (1.11 e2)', async () => {
    const doc = {
      metadata: { ticksPerQuarterNote: 480 },
      rhythm: {
        bpm: 120,
        timeSignatureNumerator: 3,
        timeSignatureDenominator: 4,
      },
      tracks: [
        {
          id: 'm',
          name: 'Melody',
          channel: 1,
          events: [
            { pitch: 72, velocity: 64, startTick: 0, durationTicks: 480 },
          ],
        },
      ],
    } as unknown as UnisonDocument;
    const midi = new Midi(await unisonToMidi(doc).arrayBuffer());
    expect(midi.header.timeSignatures[0].timeSignature).toEqual([3, 4]);
  });
});
