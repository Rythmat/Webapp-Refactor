import { describe, expect, it } from 'vitest';
import type { MidiNoteEvent } from '@prism/engine';
import { DEFAULT_EFFECTS } from '@/daw/audio/EffectChain';
import { noteKey } from '@/daw/model/noteKeys';
import {
  TRACK_DOC_FIELDS,
  TRACK_FIELDS,
  trackFieldDefault,
} from '@/daw/persistence/projectDocument/fields';
import type { Track } from '@/daw/store/tracksSlice';
import type { ArrangementState } from '../arrangementEdits';
import { copyName, duplicateTrackEdit, type TrackMint } from '../trackEdits';

// ── Duplicate track (milestone 2.15) ───────────────────────────────────────
// The copy holds every field the document keeps about the track, read from
// the registry, so these checks walk TRACK_FIELDS rather than a list of
// their own: a field added there must be on the fully set track below (its
// type is Required<Track>) and is then checked like the rest.

const note = (id: string, midi: number, startTick: number): MidiNoteEvent => ({
  id,
  note: midi,
  velocity: 90,
  startTick,
  durationTicks: 240,
  channel: 0,
});

/**
 * A track with every field set, none at its default (so a copy that fell
 * back to a default would show). No track is both an audio track and a
 * synth, but the edit copies what it finds.
 */
const full: Required<Track> = {
  id: 'src',
  name: 'Lead',
  type: 'audio',
  instrument: 'oracle-synth',
  gmProgram: 42,
  color: '#123456',
  mute: true,
  solo: true,
  volume: 0.37,
  pan: -0.4,
  recordArmed: true,
  monitoring: true,
  midiInputId: 'keyboard-1',
  audioInputId: 'interface-1',
  audioInputChannel: { mode: 'stereo', left: 2, right: 3 },
  audioMidiSource: { enabled: true, sourceTrackId: 'gtr', mode: 'poly' },
  effects: {
    ...structuredClone(DEFAULT_EFFECTS),
    reverb: { ...structuredClone(DEFAULT_EFFECTS.reverb), enabled: true },
  },
  activeEffects: ['reverb', 'delay'],
  midiClips: [
    {
      id: 'm1',
      name: 'Riff',
      startTick: 1920,
      durationTicks: 3840,
      events: [note('n1', 60, 0), note('n2', 64, 480), note('n3', 67, 960)],
      ccEvents: [{ tick: 0, controller: 64, value: 127, channel: 0 }],
      muted: true,
    },
    { id: 'm2', startTick: 7680, events: [note('n4', 72, 0)] },
  ],
  audioClips: [
    {
      id: 'a1',
      startTick: 0,
      duration: 960,
      fadeInTicks: 10,
      fadeOutTicks: 20,
      assetId: 'asset-1',
      offsetSeconds: 0.5,
      gain: 0.7,
      name: 'Take',
      muted: true,
    },
  ],
  vocalChain: [{ type: 'eq', enabled: true, params: { low: 2 } }],
  guitarChain: [
    { type: 'amp', enabled: false, params: { gain: 5 }, namModelId: 'nam-1' },
  ],
  drumPads: { 36: { volume: 0.5, pan: 0.2 } },
  drumKit: '808',
  bassVoice: 'upright',
  samplerSample: {
    sampleId: 'smp',
    assetId: 'asset-2',
    rootNote: 'C4',
    attack: 0.01,
    release: 0.3,
    name: 'vox.wav',
  } as Track['samplerSample'] & object,
  organState: {
    drawbars: [8, 8, 8, 0, 0, 0, 0, 0, 0],
    clickLevel: 0.3,
    percEnabled: true,
    overdrive: 0.2,
    leslieEnabled: true,
    swellLevel: 0.9,
  } as unknown as NonNullable<Track['organState']>,
  presetName: 'Bright Lead',
  sends: { A: 0.4 },
  automation: {
    volume: [
      { tick: 0, value: 0.2 },
      { tick: 1920, value: 0.9 },
    ],
  },
  trackRole: 'melody',
  notationStaff: 'alto',
};

const other = (id: string, name: string): Track => ({
  ...structuredClone(full),
  id,
  name,
  midiClips: [],
  audioClips: [],
});

/** Freezes `value` and everything in it, so an edit that writes throws. */
function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

const k = (track: string, clip: string, tick: number, midi: number) =>
  noteKey(track, clip, tick, midi);

function state(over: Partial<ArrangementState> = {}): ArrangementState {
  return {
    tracks: [
      other('before', 'Bass'),
      structuredClone(full),
      other('after', 'Pad'),
    ],
    chordRegions: [],
    markers: [],
    sections: [],
    masterAutomation: {},
    loopStart: 0,
    loopEnd: 7680,
    bpm: 120,
    timeSignatureNumerator: 4,
    timeSignatureDenominator: 4,
    remoteUsers: new Map(),
    isRecording: false,
    leadSheetBars: null,
    leadSheetRepeats: [],
    measureRestMap: null,
    measureFermatas: null,
    measureRowSizes: null,
    scoreSystemBreaks: [],
    scorePageBreaks: [],
    scoreSystemRuns: [],
    scoreTextMarks: [],
    scoreArticulations: [
      `${k('src', 'm1', 0, 60)}|staccato`,
      `${k('before', 'x', 0, 50)}|accent`,
    ],
    scoreSlurs: [
      `${k('src', 'm1', 0, 60)}|${k('src', 'm1', 480, 64)}`,
      // One end on another track: the copy has only one of its notes.
      `${k('src', 'm2', 0, 72)}|${k('after', 'y', 0, 74)}`,
    ],
    scoreSpellings: [`${k('src', 'm1', 960, 67)}|Abb`],
    scoreSlashNotes: [k('src', 'm2', 0, 72)],
    scoreChordHidden: [],
    ...over,
  } as ArrangementState;
}

/** A mint that counts per kind, so ids are predictable. */
function counter(): TrackMint {
  const seen: Record<string, number> = {};
  return (kind) => {
    seen[kind] = (seen[kind] ?? 0) + 1;
    return `${kind}-new-${seen[kind]}`;
  };
}

function run(s = state()) {
  const made = duplicateTrackEdit(s, 'src', counter());
  if (!made) throw new Error('no edit');
  const tracks = made.edit.patch.tracks!;
  const copy = tracks.find((t) => t.id === made.newTrackId)!;
  return { ...made, tracks, copy };
}

const KEYS = Object.keys(TRACK_FIELDS) as (keyof Track)[];
/** Fields the copy has its own of: compared on their own below. */
const OWN = new Set<keyof Track>([
  'id',
  'name',
  'midiClips',
  'audioClips',
  'samplerSample',
]);

describe('duplicateTrackEdit', () => {
  it('has a fixture that sets every field away from its default', () => {
    for (const key of KEYS) {
      expect(full, key).toHaveProperty(key);
      expect(full[key], key).not.toEqual(trackFieldDefault(key));
    }
  });

  it('copies every document field of the source, deeply', () => {
    const { copy } = run();
    for (const key of TRACK_DOC_FIELDS) {
      if (OWN.has(key)) continue;
      expect(copy[key], key).toEqual(full[key]);
      if (full[key] !== null && typeof full[key] === 'object') {
        expect(copy[key], key).not.toBe(full[key]);
      }
    }
  });

  it('starts the per-user and session fields as a new track does', () => {
    const { copy } = run();
    const ctx = { instrument: full.instrument, name: copy.name };
    for (const key of KEYS) {
      if (TRACK_DOC_FIELDS.includes(key)) continue;
      const fresh = trackFieldDefault(key, ctx);
      if (fresh === undefined) expect(copy, key).not.toHaveProperty(key);
      else expect(copy[key], key).toEqual(fresh);
    }
    expect(copy.recordArmed).toBe(false);
    expect(copy.monitoring).toBe(false);
    expect(copy.midiInputId).toBeNull();
    expect(copy.audioInputId).toBeNull();
  });

  it('gives the live input of a live track the first channel, as a new track', () => {
    const live: Track = {
      ...other('src', 'Guitar'),
      type: 'audio',
      instrument: 'audio-input',
    };
    const { copy } = run(state({ tracks: [live] }));
    expect(copy.audioInputChannel).toEqual({ mode: 'mono', channel: 0 });
  });

  it('holds its keys in the order a new track does', () => {
    const { copy } = run();
    const order = KEYS.filter((key) => key in copy);
    expect(Object.keys(copy)).toEqual(order);
  });

  it('copies every clip and note under ids of their own', () => {
    const { copy, newTrackId } = run();
    expect(newTrackId).toBe('track-new-1');
    expect(copy.midiClips.map((c) => c.id)).toEqual([
      'clip-new-1',
      'clip-new-2',
    ]);
    expect(copy.audioClips.map((c) => c.id)).toEqual(['clip-new-3']);

    const sourceIds = new Set([
      full.id,
      ...full.midiClips.map((c) => c.id),
      ...full.audioClips.map((c) => c.id),
      ...full.midiClips.flatMap((c) => c.events.map((e) => e.id)),
    ]);
    const copyIds = [
      copy.id,
      ...copy.midiClips.map((c) => c.id),
      ...copy.audioClips.map((c) => c.id),
      ...copy.midiClips.flatMap((c) => c.events.map((e) => e.id)),
    ];
    expect(new Set(copyIds).size).toBe(copyIds.length);
    for (const id of copyIds) expect(sourceIds.has(id)).toBe(false);

    // Everything else in a clip is as it was, controllers included.
    const strip = (c: Track['midiClips'][number]) => ({
      ...c,
      id: '',
      events: c.events.map((e) => ({ ...e, id: '' })),
    });
    expect(copy.midiClips.map(strip)).toEqual(full.midiClips.map(strip));
    expect(copy.audioClips.map((c) => ({ ...c, id: '' }))).toEqual(
      full.audioClips.map((c) => ({ ...c, id: '' })),
    );
  });

  it('shares each audio clip’s audio with its copy', () => {
    const { edit } = run();
    expect(edit.sharedAudio).toEqual([{ from: 'a1', to: 'clip-new-3' }]);
  });

  it('gives the Chops sample an id of its own, and says whose audio it plays', () => {
    // Loading another sample on one track lets go of the old sample's key:
    // with one id between them, the other track would go silent.
    const { copy, sampleAudio } = run();
    expect(copy.samplerSample).toEqual({
      ...full.samplerSample,
      sampleId: 'sample-new-1',
    });
    expect(copy.samplerSample).not.toBe(full.samplerSample);
    expect(sampleAudio).toEqual({
      from: 'sampler:smp',
      to: 'sampler:sample-new-1',
    });
  });

  it('has no sample audio to copy for a track without a sample', () => {
    const plain: Track = { ...other('src', 'Keys') };
    delete plain.samplerSample;
    const { copy, sampleAudio } = run(state({ tracks: [plain] }));
    expect(copy).not.toHaveProperty('samplerSample');
    expect(sampleAudio).toBeNull();
  });

  it('names the copy, numbering it when the name is taken', () => {
    expect(run().copy.name).toBe('Lead copy');
    const s = state();
    const taken = state({
      tracks: [
        ...s.tracks,
        other('c1', 'Lead copy'),
        other('c2', 'Lead copy 2'),
      ],
    });
    expect(run(taken).copy.name).toBe('Lead copy 3');
    expect(copyName('Bass', [other('x', 'Bass copy 2')])).toBe('Bass copy');
  });

  it('numbers a copy of a copy from the same base', () => {
    const bass = other('b', 'Bass');
    const copy1 = other('b1', 'Bass copy');
    const copy2 = other('b2', 'Bass copy 2');
    expect(copyName('Bass copy', [bass, copy1])).toBe('Bass copy 2');
    expect(copyName('Bass copy 2', [bass, copy1, copy2])).toBe('Bass copy 3');
    expect(copyName('Bass copy', [bass, copy1, copy2])).toBe('Bass copy 3');
    expect(copyName('Bass', [bass, copy1, copy2])).toBe('Bass copy 3');
    // Only the end of the name counts.
    expect(copyName('copy', [])).toBe('copy copy');
    expect(copyName('Bass copy 2 mix', [])).toBe('Bass copy 2 mix copy');
  });

  it('puts the copy right after the source and leaves the rest as they were', () => {
    const s = state();
    const { tracks, newTrackId } = run(s);
    expect(tracks.map((t) => t.id)).toEqual([
      'before',
      'src',
      newTrackId,
      'after',
    ]);
    expect(tracks[0]).toBe(s.tracks[0]);
    expect(tracks[1]).toBe(s.tracks[1]);
    expect(tracks[3]).toBe(s.tracks[2]);
  });

  it('copies the Score marks of the copied notes', () => {
    const { edit, newTrackId: t } = run();
    const p = edit.patch;
    expect(p.scoreArticulations).toEqual([
      ...state().scoreArticulations,
      `${k(t, 'clip-new-1', 0, 60)}|staccato`,
    ]);
    // The slur with an end on another track isn't copied.
    expect(p.scoreSlurs).toEqual([
      ...state().scoreSlurs,
      `${k(t, 'clip-new-1', 0, 60)}|${k(t, 'clip-new-1', 480, 64)}`,
    ]);
    expect(p.scoreSpellings).toEqual([
      ...state().scoreSpellings,
      `${k(t, 'clip-new-1', 960, 67)}|Abb`,
    ]);
    expect(p.scoreSlashNotes).toEqual([
      ...state().scoreSlashNotes,
      k(t, 'clip-new-2', 0, 72),
    ]);
  });

  it('writes only the tracks when there are no marks to copy', () => {
    const { edit } = run(
      state({
        scoreArticulations: [],
        scoreSlurs: [],
        scoreSpellings: [],
        scoreSlashNotes: [],
      }),
    );
    expect(Object.keys(edit.patch)).toEqual(['tracks']);
  });

  it('leaves the input untouched', () => {
    const s = deepFreeze(state());
    const before = structuredClone({ ...s, remoteUsers: [] });
    expect(() => run(s)).not.toThrow();
    expect(structuredClone({ ...s, remoteUsers: [] })).toEqual(before);
  });

  it('a change to the copy never reaches the source', () => {
    const s = state();
    const { copy } = run(s);
    copy.effects.reverb.enabled = false;
    copy.automation!.volume[0].value = 1;
    copy.midiClips[0].events[0].velocity = 1;
    copy.midiClips[0].ccEvents![0].value = 0;
    expect(s.tracks[1]).toEqual(full);
  });

  it('is null for a track that isn’t there', () => {
    expect(duplicateTrackEdit(state(), 'nope', counter())).toBeNull();
  });
});
