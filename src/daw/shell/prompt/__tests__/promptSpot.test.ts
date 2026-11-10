/**
 * The spot a Studio prompt acts on (owner, 2026-10-23): a lane or section
 * right-clicked, else the loop, else the section under the playhead (or
 * eight bars from it, owner 2026-11-10); the song
 * section it is; a section the prompt names; and the song's other
 * progressions, for new chords to stand apart from.
 */
import { describe, expect, it } from 'vitest';
import type { SongSection } from '@/daw/model/sections';
import type { Track } from '@/daw/store/tracksSlice';
import {
  bassLineOf,
  otherProgressionsOf,
  partKeyOf,
  promptSpotOf,
  selectionOfDrag,
  spotForText,
  spotLabel,
  trackPartOf,
} from '../promptSpot';

const BAR = 1920;
const verse: SongSection = {
  id: 'v',
  type: 'verse',
  label: 'Verse',
  startTick: 0,
  endTick: 4 * BAR,
};
const chorus: SongSection = {
  id: 'c',
  type: 'chorus',
  label: 'Chorus',
  startTick: 4 * BAR,
  endTick: 8 * BAR,
};
const bridge: SongSection = {
  id: 'b',
  type: 'bridge',
  label: 'Bridge',
  startTick: 8 * BAR,
  endTick: 12 * BAR,
};

const base = {
  sections: [] as SongSection[],
  loopEnabled: false,
  loopStart: 0,
  loopEnd: 7680,
  selectedTrackId: 't1',
  timeSignatureNumerator: 4,
  timeSignatureDenominator: 4,
};
const ts = { timeSignatureNumerator: 4, timeSignatureDenominator: 4 };

describe('promptSpotOf', () => {
  it('is eight bars from the playhead’s bar, on the selected track', () => {
    expect(promptSpotOf(base, null, 5 * BAR + 300)).toEqual({
      startTick: 5 * BAR,
      lengthTicks: 8 * BAR,
      trackId: 't1',
      from: 'playhead',
      section: null,
    });
  });

  it('is the whole section under the playhead, up to sixteen bars', () => {
    const long: SongSection = { ...verse, endTick: 24 * BAR };
    expect(
      promptSpotOf({ ...base, sections: [verse, chorus] }, null, 5 * BAR + 300),
    ).toMatchObject({
      startTick: chorus.startTick,
      lengthTicks: 4 * BAR,
      from: 'playhead',
      section: chorus,
    });
    // Longer than sixteen bars: eight from the playhead's bar.
    expect(
      promptSpotOf({ ...base, sections: [long] }, null, 18 * BAR + 10),
    ).toMatchObject({
      startTick: 18 * BAR,
      lengthTicks: 8 * BAR,
      section: long,
    });
  });

  it('is the loop while it’s on', () => {
    const spot = promptSpotOf(
      { ...base, loopEnabled: true, loopStart: 2 * BAR, loopEnd: 10 * BAR },
      null,
      0,
    );
    expect(spot).toMatchObject({
      startTick: 2 * BAR,
      lengthTicks: 8 * BAR,
      from: 'loop',
    });
  });

  it('is a right-clicked lane’s bar, or a section’s whole length', () => {
    expect(
      promptSpotOf(base, { tick: 3 * BAR + 700, trackId: 't2' }, 0),
    ).toMatchObject({
      startTick: 3 * BAR,
      lengthTicks: 8 * BAR,
      trackId: 't2',
      from: 'lane',
    });
    expect(
      promptSpotOf(
        { ...base, sections: [verse, chorus] },
        { tick: chorus.startTick, trackId: null, lengthTicks: 4 * BAR },
        0,
      ),
    ).toMatchObject({
      startTick: 4 * BAR,
      lengthTicks: 4 * BAR,
      from: 'section',
      section: chorus,
    });
  });

  it('knows the section it starts in', () => {
    const spot = promptSpotOf(
      { ...base, sections: [verse, chorus] },
      null,
      5 * BAR,
    );
    expect(spot.section).toBe(chorus);
    expect(spotLabel(spot, ts)).toBe('Chorus · Bars 5–8');
  });
});

describe('a selection dragged out', () => {
  it('covers every bar the drag touches, whole, at least one', () => {
    expect(selectionOfDrag(2.5 * BAR, 4.5 * BAR, BAR, 't')).toEqual({
      startTick: 2 * BAR,
      endTick: 5 * BAR,
      trackId: 't',
    });
    expect(selectionOfDrag(4.5 * BAR, 2.5 * BAR, BAR, null)).toMatchObject({
      startTick: 2 * BAR,
      endTick: 5 * BAR,
    });
    expect(
      selectionOfDrag(3 * BAR + 10, 3 * BAR + 20, BAR, null),
    ).toMatchObject({
      startTick: 3 * BAR,
      endTick: 4 * BAR,
    });
  });

  it('is the spot over the loop and the playhead; a lane right-clicked wins', () => {
    const selected = { startTick: 8 * BAR, endTick: 10 * BAR, trackId: 't9' };
    const looping = {
      ...base,
      loopEnabled: true,
      loopStart: 0,
      loopEnd: 4 * BAR,
    };
    expect(promptSpotOf(looping, null, 0, selected)).toMatchObject({
      startTick: 8 * BAR,
      lengthTicks: 2 * BAR,
      trackId: 't9',
      from: 'selection',
    });
    expect(
      promptSpotOf(looping, { tick: BAR, trackId: 't2' }, 0, selected),
    ).toMatchObject({ from: 'lane', trackId: 't2' });
  });

  it('marks bars highlighted on a track, and keeps the mark on a section named', () => {
    const selected = { startTick: 0, endTick: 2 * BAR, trackId: 't9' };
    const spot = promptSpotOf(
      { ...base, sections: [verse, chorus] },
      null,
      0,
      selected,
    );
    expect(spot.highlighted).toBe(true);
    expect(
      spotForText(
        { ...base, sections: [verse, chorus], tracks: [], chordRegions: [] },
        spot,
        { type: 'chorus', isNew: false },
      ),
    ).toMatchObject({ section: chorus, trackId: 't9', highlighted: true });
    expect(
      promptSpotOf(base, null, 0, { ...selected, trackId: null }).highlighted,
    ).toBe(false);
    expect(promptSpotOf(base, null, 0).highlighted).toBeFalsy();
  });
});

describe('spotForText', () => {
  const state = {
    sections: [verse, chorus, bridge],
    tracks: [],
    chordRegions: [],
    ...ts,
  };

  it('takes a section the prompt names as the spot, on the spot’s track', () => {
    const spot = promptSpotOf({ ...base, sections: state.sections }, null, 0);
    expect(
      spotForText(state, spot, { type: 'bridge', isNew: false }),
    ).toMatchObject({
      startTick: 8 * BAR,
      lengthTicks: 4 * BAR,
      trackId: 't1',
      section: bridge,
    });
  });

  it('keeps the spot when it names none, or one the song hasn’t got', () => {
    const spot = promptSpotOf({ ...base, sections: state.sections }, null, 0);
    expect(spotForText(state, spot, null)).toBe(spot);
    expect(spotForText(state, spot, { type: 'outro', isNew: false })).toBe(
      spot,
    );
  });

  it('puts a new section after the song’s end, eight bars', () => {
    const spot = promptSpotOf({ ...base, sections: state.sections }, null, 0);
    expect(
      spotForText(state, spot, { type: 'chorus', isNew: true }),
    ).toMatchObject({
      startTick: 12 * BAR,
      lengthTicks: 8 * BAR,
      trackId: 't1',
      section: null,
    });
  });

  it('keeps bars dragged out for a new section', () => {
    const spot = promptSpotOf({ ...base, sections: state.sections }, null, 0, {
      startTick: 20 * BAR,
      endTick: 24 * BAR,
      trackId: null,
    });
    expect(spotForText(state, spot, { type: 'chorus', isNew: true })).toBe(
      spot,
    );
  });
});

describe('otherProgressionsOf', () => {
  const region = (name: string, bar: number) => ({
    id: name + bar,
    startTick: bar * BAR,
    endTick: (bar + 1) * BAR,
    name,
    noteName: name,
    color: [0, 0, 0] as [number, number, number],
  });
  const chordRegions = [
    region('Dm7', 0),
    region('G7', 1),
    region('Dm7', 2),
    region('G7', 3),
    region('B♭', 4),
    region('F', 5),
    region('F', 6),
    region('C', 7),
  ];

  it('is each other section’s chords, a repeat in a row once, in ASCII', () => {
    expect(
      otherProgressionsOf(
        { chordRegions, sections: [verse, chorus, bridge] },
        {
          startTick: bridge.startTick,
          lengthTicks: 4 * BAR,
        },
      ),
    ).toEqual([
      ['Dm7', 'G7', 'Dm7', 'G7'],
      ['Bb', 'F', 'C'],
    ]);
  });

  it('is the lane outside the spot in a song with no sections', () => {
    expect(
      otherProgressionsOf(
        { chordRegions, sections: [] },
        { startTick: 4 * BAR, lengthTicks: 4 * BAR },
      ),
    ).toEqual([['Dm7', 'G7', 'Dm7', 'G7']]);
  });
});

describe('trackPartOf', () => {
  const t = (over: object) => ({
    type: 'midi' as const,
    instrument: 'soundfont' as const,
    name: 'Track',
    trackRole: 'auto' as const,
    gmProgram: 0,
    ...over,
  });

  it('reads drums, bass and chords tracks', () => {
    expect(trackPartOf(t({ instrument: 'drum-machine' }))).toBe('drums');
    expect(trackPartOf(t({ gmProgram: 33 }))).toBe('bass');
    expect(trackPartOf(t({ name: 'Bass', instrument: 'oracle-synth' }))).toBe(
      'bass',
    );
    expect(trackPartOf(t({ trackRole: 'chords' }))).toBe('chords');
    expect(trackPartOf(t({ type: 'audio' }))).toBeNull();
  });
});

describe('partKeyOf', () => {
  const key = (over: object) => ({
    rootNote: null,
    mode: 'ionian',
    detectedKeyRootPc: null,
    detectedMode: null,
    chordRegions: [],
    ...over,
  });

  it('is the key center, else the key heard, else the ruler’s first chord', () => {
    expect(partKeyOf(key({ rootNote: 2, mode: 'dorian' }))).toEqual({
      tonicPc: 2,
      mode: 'dorian',
    });
    expect(
      partKeyOf(key({ detectedKeyRootPc: 9, detectedMode: 'aeolian' })),
    ).toEqual({
      tonicPc: 9,
      mode: 'aeolian',
    });
    const region = (noteName: string, bar: number) => ({
      id: noteName,
      startTick: bar * BAR,
      endTick: (bar + 1) * BAR,
      name: noteName,
      noteName,
      color: [0, 0, 0] as [number, number, number],
    });
    expect(
      partKeyOf(key({ chordRegions: [region('G', 1), region('E♭m7', 0)] })),
    ).toEqual({
      tonicPc: 3,
      mode: 'aeolian',
    });
    expect(partKeyOf(key({}))).toBeNull();
  });
});

describe('bassLineOf (owner, 2026-11-10: chords stand on the bass)', () => {
  const note = (startTick: number, n: number, durationTicks = 480) => ({
    note: n,
    velocity: 90,
    startTick,
    durationTicks,
  });
  const bassTrack = (events: ReturnType<typeof note>[], startTick = 0) =>
    ({
      id: 'bass',
      type: 'midi',
      name: 'Bass',
      trackRole: 'bass',
      instrument: 'soundfont',
      gmProgram: 33,
      midiClips: [{ id: 'c', startTick, events }],
      audioClips: [],
    }) as unknown as Track;
  const state = (tracks: Track[]) => ({ ...ts, tracks });

  it('reads a walking bass as its downbeats', () => {
    // A2 B2 C3 C#3 | D3 E3 F3 F#3: A, then D.
    const walk = [45, 47, 48, 49, 50, 52, 53, 54].map((n, i) =>
      note(i * 480, n),
    );
    expect(
      bassLineOf(state([bassTrack(walk)]), {
        startTick: 0,
        lengthTicks: 2 * BAR,
      }),
    ).toEqual([
      { tick: 0, pc: 9 },
      { tick: BAR, pc: 2 },
    ]);
  });

  it('reads a pickup before the bar line as the bar before’s', () => {
    // A9 … then a low B a sixteenth early, and F#2 on the downbeat.
    const line = [note(0, 45, 1800), note(BAR - 120, 35, 110), note(BAR, 42)];
    expect(
      bassLineOf(state([bassTrack(line)]), {
        startTick: 0,
        lengthTicks: 2 * BAR,
      }),
    ).toEqual([
      { tick: 0, pc: 9 },
      { tick: BAR, pc: 6 },
    ]);
  });

  it('hears a change at the half bar where a note holds it', () => {
    const twoFeel = [note(0, 36, 960), note(960, 43, 960), note(BAR, 41, BAR)];
    expect(
      bassLineOf(state([bassTrack(twoFeel)]), {
        startTick: 0,
        lengthTicks: 2 * BAR,
      }),
    ).toEqual([
      { tick: 0, pc: 0 },
      { tick: BAR / 2, pc: 7 },
      { tick: BAR, pc: 5 },
    ]);
  });

  it('reads from the spot’s start, and only bass tracks', () => {
    const bass = bassTrack([note(0, 40, BAR), note(BAR, 45, BAR)], 4 * BAR);
    const keys = {
      ...bass,
      id: 'k',
      name: 'Keys',
      trackRole: 'chords',
      gmProgram: 0,
    } as Track;
    expect(
      bassLineOf(state([keys, bass]), {
        startTick: 5 * BAR,
        lengthTicks: 2 * BAR,
      }),
    ).toEqual([{ tick: 0, pc: 9 }]);
  });
});
