import { describe, expect, it } from 'vitest';
import type { MidiNoteEvent } from '@prism/engine';
import type { Track } from '@/daw/store/tracksSlice';
import {
  buildScoreParts,
  ScorePartsCache,
  type ScoreBuildOptions,
} from './scoreParts';

// ── Score parts kept between builds (score-06) ──────────────────────────────
// Every Score edit rebuilt every part. With a ScorePartsCache a build reuses
// each part whose track's clips and marks, and the key, mode, metre and bar
// count, are what they were, and must always equal a build from scratch.

const BAR = 1920;

const ev = (note: number, startTick: number, durationTicks = 480) =>
  ({
    note,
    startTick,
    durationTicks,
    velocity: 100,
    channel: 0,
  }) as MidiNoteEvent;

const track = (
  id: string,
  instrument: string,
  events: MidiNoteEvent[],
  extra: Partial<Track> = {},
): Track =>
  ({
    id,
    name: id,
    type: 'midi',
    instrument,
    color: '#fff',
    trackRole: 'auto',
    volume: 0.8,
    midiClips: [{ id: `${id}-c`, startTick: 0, events }],
    audioClips: [],
    ...extra,
  }) as unknown as Track;

const lead = track('lead', 'piano-sampler', [
  ev(72, 0),
  ev(74, 480),
  ev(76, BAR, BAR + 480), // held over a barline
  ev(79, 3 * BAR),
]);
const bass = track('bass', 'bass-electric', [ev(40, 0, BAR), ev(43, BAR)]);
const drums = track('drums', 'drum-machine', [ev(36, 0), ev(38, 480)]);
const empty = track('empty', 'piano-sampler', []);

const base: Omit<ScoreBuildOptions, 'tracks'> = {
  rootNote: 2,
  mode: 'ionian',
  timeSignature: [4, 4],
};

/** A new track object with new clips: what an edit to its notes writes. */
const edited = (t: Track, events: MidiNoteEvent[]): Track => ({
  ...t,
  midiClips: [{ ...t.midiClips[0], events }],
});

describe('ScorePartsCache', () => {
  it('builds exactly what a build from scratch does, through a run of edits', () => {
    const cache = new ScorePartsCache();
    const steps: ScoreBuildOptions[] = [
      { ...base, tracks: [lead, bass, drums, empty] },
      { ...base, tracks: [edited(lead, [ev(60, 0)]), bass, drums, empty] },
      { ...base, rootNote: 5, mode: 'aeolian', tracks: [lead, bass, drums] },
      { ...base, timeSignature: [3, 4], tracks: [lead, bass, drums] },
      {
        ...base,
        slashNotes: new Set(['lead:lead-c:480:74']),
        tracks: [lead, bass],
      },
      {
        ...base,
        spellings: new Map([['bass:bass-c:0:40', 'Fb2']]),
        tracks: [lead, bass],
      },
      { ...base, minMeasures: 16, tracks: [bass, lead] },
      { ...base, tracks: [] },
    ];
    for (const step of steps) {
      expect(buildScoreParts({ ...step, cache })).toEqual(
        buildScoreParts(step),
      );
    }
  });

  it('hands back the same parts when nothing musical changed', () => {
    const cache = new ScorePartsCache();
    const first = buildScoreParts({
      ...base,
      tracks: [lead, bass, drums],
      cache,
    });
    // A fader move: a new tracks array and a new track object, same clips.
    const faded = { ...bass, volume: 0.2 };
    const again = buildScoreParts({
      ...base,
      tracks: [lead, faded, drums],
      cache,
    });
    expect(again).toBe(first);
  });

  it('rebuilds only the track whose notes changed', () => {
    const cache = new ScorePartsCache();
    const first = buildScoreParts({
      ...base,
      tracks: [lead, bass, drums],
      cache,
    });
    const next = buildScoreParts({
      ...base,
      tracks: [lead, edited(bass, [ev(41, 0, BAR), ev(43, BAR)]), drums],
      cache,
    });
    expect(next).not.toBe(first);
    expect(next[0]).toBe(first[0]);
    expect(next[1].score).not.toBe(first[1].score);
    expect(next[2]).toBe(first[2]);
  });

  it('rebuilds every part for a new key, mode, metre or song length', () => {
    const cache = new ScorePartsCache();
    let changes: Partial<ScoreBuildOptions> = {};
    let current = [lead, bass, drums];
    const scores = () =>
      buildScoreParts({ ...base, ...changes, tracks: current, cache }).map(
        (p) => p.score,
      );
    let before = scores();
    for (const next of [
      { rootNote: 7 },
      { rootNote: 7, mode: 'dorian' },
      {
        rootNote: 7,
        mode: 'dorian',
        timeSignature: [6, 8] as [number, number],
      },
    ]) {
      changes = next;
      const after = scores();
      after.forEach((score, i) => expect(score).not.toBe(before[i]));
      before = after;
    }
    // A note far past the end lengthens every part by the same bars.
    current = [
      edited(lead, [...lead.midiClips[0].events, ev(72, 20 * BAR)]),
      bass,
      drums,
    ];
    const longer = scores();
    longer.forEach((score, i) => {
      expect(score).not.toBe(before[i]);
      expect(score.measures.length).toBe(longer[0].measures.length);
    });
  });

  it('rebuilds only the track a slash note or pinned spelling belongs to', () => {
    const cache = new ScorePartsCache();
    const tracks = [lead, bass];
    const first = buildScoreParts({ ...base, tracks, cache });
    const slashed = buildScoreParts({
      ...base,
      tracks,
      slashNotes: new Set(['lead:lead-c:480:74']),
      cache,
    });
    expect(slashed[0].score).not.toBe(first[0].score);
    expect(slashed[1]).toBe(first[1]);

    const spelled = buildScoreParts({
      ...base,
      tracks,
      slashNotes: new Set(['lead:lead-c:480:74']),
      spellings: new Map([['bass:bass-c:0:40', 'Fb2']]),
      cache,
    });
    expect(spelled[0]).toBe(slashed[0]);
    expect(spelled[1].score).not.toBe(slashed[1].score);
  });

  it('keeps the score of a renamed or recoloured track', () => {
    const cache = new ScorePartsCache();
    const first = buildScoreParts({ ...base, tracks: [lead, bass], cache });
    const renamed = buildScoreParts({
      ...base,
      tracks: [{ ...lead, name: 'Melody', color: '#f00' }, bass],
      cache,
    });
    expect(renamed[0]).not.toBe(first[0]);
    expect(renamed[0]).toMatchObject({ name: 'Melody', color: '#f00' });
    expect(renamed[0].score).toBe(first[0].score);
  });

  it('rebuilds a track that becomes a kit, and forgets removed tracks', () => {
    const cache = new ScorePartsCache();
    const first = buildScoreParts({ ...base, tracks: [lead, bass], cache });
    const kit = buildScoreParts({
      ...base,
      tracks: [lead, { ...bass, instrument: 'drum-machine' } as Track],
      cache,
    });
    expect(kit[1].score.staves).toEqual(['percussion']);
    expect(kit[0]).toBe(first[0]);

    expect(buildScoreParts({ ...base, tracks: [lead], cache })).toHaveLength(1);
    const back = buildScoreParts({ ...base, tracks: [lead, bass], cache });
    expect(back[1].score).not.toBe(first[1].score);
    expect(back[1]).toEqual(first[1]);
  });
});
