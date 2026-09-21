import { describe, expect, it } from 'vitest';
import {
  copyMeasures,
  copyNotes,
  pasteNotes,
} from '@/daw/components/Score/scoreClipboard';
import type { Track } from '@/daw/store/tracksSlice';

const event = (note: number, startTick: number, durationTicks = 480) => ({
  note,
  startTick,
  durationTicks,
  velocity: 100,
  channel: 0,
});

const track = (id: string, events: ReturnType<typeof event>[]): Track =>
  ({
    id,
    name: id,
    type: 'midi',
    midiClips: [{ id: `${id}-clip`, startTick: 0, events }],
    audioClips: [],
  }) as unknown as Track;

const TRACKS = [
  track('lead', [event(72, 0), event(74, 480)]),
  track('bass', [event(48, 0), event(50, 1920)]),
];
const PART_INDEX = new Map([
  ['lead', 0],
  ['bass', 1],
]);
const TRACK_BY_PART = new Map([
  [0, 'lead'],
  [1, 'bass'],
]);

describe('copying notes', () => {
  it('stores them relative to the block corner', () => {
    const clip = copyNotes(
      TRACKS,
      ['lead:lead-clip:480:74', 'bass:bass-clip:1920:50'],
      PART_INDEX,
    );
    expect(clip).toMatchObject({ kind: 'notes', replace: false, partCount: 2 });
    expect(clip?.notes).toEqual([
      {
        partOffset: 0,
        tickOffset: 0,
        midi: 74,
        durationTicks: 480,
        velocity: 100,
      },
      {
        partOffset: 1,
        tickOffset: 1440,
        midi: 50,
        durationTicks: 480,
        velocity: 100,
      },
    ]);
  });

  it('returns nothing when the selection is empty', () => {
    expect(copyNotes(TRACKS, [], PART_INDEX)).toBeNull();
  });
});

describe('pasting notes', () => {
  it('lands the block under the target and keeps the shape', () => {
    const clip = copyNotes(TRACKS, ['lead:lead-clip:0:72'], PART_INDEX)!;
    const { writes, noteIds } = pasteNotes(
      clip,
      { partIndex: 1, tick: 960 },
      TRACKS,
      TRACK_BY_PART,
    );
    expect(writes).toHaveLength(1);
    expect(writes[0].trackId).toBe('bass');
    expect(writes[0].events.map((e) => `${e.startTick}:${e.note}`)).toEqual([
      '0:48',
      '960:72',
      '1920:50',
    ]);
    expect(noteIds).toEqual(['bass:bass-clip:960:72']);
  });

  it('adds notes without clearing when they were loose', () => {
    const clip = copyNotes(TRACKS, ['lead:lead-clip:0:72'], PART_INDEX)!;
    const { writes } = pasteNotes(
      clip,
      { partIndex: 0, tick: 480 },
      TRACKS,
      TRACK_BY_PART,
    );
    // The note already at 480 survives alongside the pasted one.
    expect(writes[0].events.filter((e) => e.startTick === 480)).toHaveLength(2);
  });

  it('clears the destination bar when whole measures were copied', () => {
    const clip = copyMeasures(
      TRACKS,
      ['lead:lead-clip:0:72', 'lead:lead-clip:480:74'],
      PART_INDEX,
      [{ partIndex: 0, measureIndex: 0 }],
      1920,
    )!;
    expect(clip.replace).toBe(true);
    expect(clip.span).toBe(1920);
    const { writes } = pasteNotes(
      clip,
      { partIndex: 1, tick: 1920 },
      TRACKS,
      TRACK_BY_PART,
    );
    // Bass bar 2 held a note at 1920; it is replaced by the copied bar.
    expect(writes[0].events.map((e) => `${e.startTick}:${e.note}`)).toEqual([
      '0:48',
      '1920:72',
      '2400:74',
    ]);
  });

  it('copies an empty bar as a way to clear one', () => {
    const clip = copyMeasures(
      TRACKS,
      [],
      PART_INDEX,
      [{ partIndex: 0, measureIndex: 2 }],
      1920,
    )!;
    expect(clip.notes).toEqual([]);
    const { writes } = pasteNotes(
      clip,
      { partIndex: 0, tick: 0 },
      TRACKS,
      TRACK_BY_PART,
    );
    expect(writes[0].events).toEqual([]);
  });
});
