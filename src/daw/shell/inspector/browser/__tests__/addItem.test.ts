/**
 * What + and a drop do with a Library item (milestone 2.14, plan §1.3).
 *
 * + makes a new track holding the item at bar 1: on the part's sound with
 * its role, one clip moved into the song's key, all one undo step. A keyless
 * empty song takes the first part's key. A groove at another tempo asks, and
 * the tempo change and the add are one step. At the track limit nothing
 * changes, no key or tempo either. A kit, a sound or an Oracle patch is the
 * new track's instrument from the start. A template opens through
 * openSession, never in a room. A drop lands on the lane it falls on when
 * the item suits it, at that bar, unless a collaborator holds the track. A
 * load that a new session overtook writes nothing, and a lesson's dock is
 * left alone.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MidiNoteEvent } from '@prism/engine';

const h = vi.hoisted(() => ({
  toasts: [] as Array<{ title?: string; description?: string }>,
  grooveCalls: [] as string[],
  loadEvents: null as null | ((id: string) => Promise<unknown>),
  openSession: vi.fn(async () => ({ status: 'opened' })),
  stopPreview: vi.fn(),
  /** The designed groove that plays a groove row, once loaded. */
  liveGroove: undefined as unknown,
}));

vi.mock('@/daw/shell/notice', () => ({
  notice: (t: { title?: string; description?: string }) => {
    h.toasts.push(t);
  },
}));
vi.mock('@/daw/midi/loadGrooveEvents', () => ({
  loadGrooveEvents: (id: string) => {
    h.grooveCalls.push(id);
    return h.loadEvents ? h.loadEvents(id) : Promise.resolve(null);
  },
}));
vi.mock('@/curriculum/engine/drumGrooves/registry', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  // No designed groove unless a test gives one: the clip's length is left
  // to the store.
  loadLiveGroove: async () => h.liveGroove,
}));
// The SERUM pack: nothing installed (its load resolves with no presets).
vi.mock('@/daw/oracle-synth/store/presets/packLoader', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  loadOraclePacks: async () => {},
}));
vi.mock('@/daw/session/openSession', () => ({ openSession: h.openSession }));
// The preview's audio isn't this file's; an add only stops it.
vi.mock('../preview', () => ({ stopPreview: h.stopPreview }));

import type { UserPresence } from '@/daw/collab/types';
import {
  patternTicks,
  type DrumGroove,
} from '@/curriculum/engine/drumGrooves/drumGroove';
import { listLiveParts } from '@/curriculum/engine/parts/registry';
import { partTicks } from '@/curriculum/engine/parts/part';
import { GROOVES } from '@/daw/data/groovesLibrary';
import { PRESETS } from '@/daw/data/instrumentPresets';
import { PROJECT_TEMPLATES } from '@/daw/data/projectTemplates';
import { shortKeyLabel } from '@/daw/harmony/clipKey';
import { DRUM_KIT_CONFIGS } from '@/daw/instruments/drumKits';
import { useSynthStore } from '@/daw/oracle-synth/store';
import { FACTORY_PRESETS } from '@/daw/oracle-synth/store/presets/factoryPresets';
import {
  getTrackSynthState,
  resetSynthTrackCache,
  synthTrackStateFromPreset,
} from '@/daw/oracle-synth/synthTrackState';
import { bumpSessionGeneration } from '@/daw/session/sessionGeneration';
import { useStore, type AllSlices } from '@/daw/store';
import {
  historyLabels,
  resetHistory,
  startHistory,
  undo,
} from '@/daw/store/history';
import { MAX_TOTAL_TRACKS } from '@/daw/store/tracksSlice';
import { addItem, addItemAsTrack, dropLibraryItem, fitsLane } from '../addItem';
import { useBrowserStore } from '../browserStore';
import {
  grooveItem,
  kitItem,
  partItem,
  studioPresetItem,
  synthPresetItem,
  templateItem,
} from '../items';
import { moveForSong, preparedEvents, scaleFit } from '../partInSong';

const s = () => useStore.getState();
const BAR = 1920;

/** A two-hit groove at Studio's 480 PPQ. */
const HITS: MidiNoteEvent[] = [
  { note: 36, velocity: 100, startTick: 0, durationTicks: 120, channel: 9 },
  { note: 38, velocity: 90, startTick: 480, durationTicks: 120, channel: 9 },
];

const parts = listLiveParts();
const partById = (id: string) => {
  const part = parts.find((p) => p.id === id);
  if (!part) throw new Error(`No part ${id}`);
  return part;
};
/** A C dorian trap bass on the 808 voice. */
const BASS = partItem(partById('hip-hop-l1-c27-c1-the-trap-bass-pattern-copy'));
/** A D dorian electric-piano part. */
const KEYS = partItem(partById('funk-l1-d1-1-lh-root-pattern-rh-funk-stab-1'));
/** Hip Hop 1, played at 60 BPM. */
const GROOVE = grooveItem(GROOVES.find((g) => g.id === 'groove-hiphop-1')!);
const C_MAJOR = { rootNote: 0, mode: 'ionian' };

let release: () => void = () => {};

/** Set the song up (unrecorded), then start recording edits. */
function song(patch: Partial<AllSlices> = {}) {
  release();
  useStore.setState(patch);
  resetHistory();
  release = startHistory();
}

const flush = () => new Promise((r) => setTimeout(r, 0));

/** Waits for the tempo question an add is asking. */
async function question() {
  for (let i = 0; i < 20 && !useBrowserStore.getState().question; i++) {
    await flush();
  }
  const q = useBrowserStore.getState().question;
  if (!q) throw new Error('No tempo question');
  return q;
}

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  useBrowserStore.setState({
    question: null,
    adding: [],
    preview: null,
    dragging: null,
    dragged: null,
  });
  resetSynthTrackCache();
  h.toasts = [];
  h.grooveCalls = [];
  h.loadEvents = async () => HITS;
  h.liveGroove = undefined;
  h.openSession.mockClear();
  h.stopPreview.mockClear();
  song();
});

afterEach(() => {
  release();
  release = () => {};
  resetHistory();
});

describe('+ on a part', () => {
  it('makes one track on its sound and role, with one clip at bar 1 in the song’s key', async () => {
    song(C_MAJOR);
    expect(await addItemAsTrack(BASS)).toBe(true);

    expect(s().tracks).toHaveLength(1);
    const track = s().tracks[0];
    expect(track).toMatchObject({
      type: 'midi',
      name: BASS.name,
      // The 808 bass, as an Instruments track: Synth Bass 1.
      instrument: 'soundfont',
      gmProgram: 38,
      trackRole: 'bass',
    });
    expect(track.midiClips).toHaveLength(1);
    const clip = track.midiClips[0];
    expect(clip.startTick).toBe(0);
    expect(clip.name).toBe(BASS.name);
    expect(clip.durationTicks).toBe(partTicks(BASS.part));

    // Moved into C major by the keys' move; whether its notes then sit on
    // the scale is what `fits` says.
    const move = moveForSong(BASS.part, { rootPc: 0, mode: 'ionian' });
    // By hand: C dorian's scale is B♭ major's; up 2 it is D dorian, C
    // major's scale exactly (the tonic's move, 0, leaves E♭ and B♭ off it).
    expect(BASS.key).toEqual({ tonic: 0, mode: 'dorian' });
    expect(move.shift).toBe(2);
    // Its first note (C2) comes up a tone, in whatever octave keeps the
    // bass in its register.
    const firstNote = BASS.part.notes[0].midi;
    expect((((clip.events[0].note - (firstNote + 2)) % 12) + 12) % 12).toBe(0);
    const want = preparedEvents(BASS.part, move.shift);
    expect(clip.events.map((e) => [e.note, e.startTick])).toEqual(
      want.map((e) => [e.note, e.startTick]),
    );
    const fit = scaleFit(
      clip.events.map((e) => ({
        midi: e.note,
        duration: e.durationTicks,
        velocity: e.velocity,
      })),
      { rootPc: 0, mode: 'ionian' },
    );
    expect(fit >= 0.9).toBe(move.fits);
    // The song's key is the student's: nothing written over it.
    expect(s()).toMatchObject(C_MAJOR);

    expect(s().selectedTrackId).toBe(track.id);
    expect(s().selectedClipId).toBe(clip.id);
    expect(h.stopPreview).toHaveBeenCalled();

    // One undo step takes it all away.
    expect(historyLabels()).toEqual([`Add ${BASS.name}`]);
    expect(undo()).toBe(true);
    expect(s().tracks).toHaveLength(0);
  });

  it('puts a sampled acoustic-guitar part on the stand-in soundfont guitar', async () => {
    const guitar = partItem(
      parts.find((p) => p.sound === 'sample:acoustic-guitar')!,
    );
    song(C_MAJOR);
    await addItemAsTrack(guitar);
    expect(s().tracks[0]).toMatchObject({
      instrument: 'soundfont',
      gmProgram: 27,
    });
  });

  it('gives a keyless empty song the part’s key, which undo takes back', async () => {
    expect(s().rootNote).toBeNull();
    expect(await addItemAsTrack(KEYS)).toBe(true);

    expect(s().rootNote).toBe(KEYS.key.tonic);
    expect(s().mode).toBe(KEYS.key.mode);
    // The part keeps its own key.
    expect(s().tracks[0].midiClips[0].events).toEqual(
      expect.arrayContaining(
        preparedEvents(KEYS.part, 0).map((e) =>
          expect.objectContaining({ note: e.note, startTick: e.startTick }),
        ),
      ),
    );
    const label = shortKeyLabel(KEYS.key.tonic, KEYS.key.mode);
    expect(h.toasts).toContainEqual(
      expect.objectContaining({ title: `Your song is now in ${label}` }),
    );

    expect(historyLabels()).toEqual([`Add ${KEYS.name}`]);
    undo();
    expect(s().tracks).toHaveLength(0);
    expect(s().rootNote).toBeNull();
  });

  it('writes no key in a song that has one', async () => {
    song(C_MAJOR);
    await addItemAsTrack(KEYS);
    expect(s()).toMatchObject(C_MAJOR);
    expect(h.toasts).toEqual([]);
  });
});

describe('+ on a groove', () => {
  it('adds at once at the song’s tempo, on its kit', async () => {
    song({ bpm: GROOVE.bpm! });
    expect(await addItemAsTrack(GROOVE)).toBe(true);

    expect(useBrowserStore.getState().question).toBeNull();
    expect(h.grooveCalls).toEqual([GROOVE.grooveId]);
    const track = s().tracks[0];
    expect(track).toMatchObject({
      instrument: 'drum-machine',
      drumKit: GROOVE.kit,
      trackRole: 'drums',
      name: GROOVE.name,
    });
    expect(track.midiClips).toHaveLength(1);
    expect(track.midiClips[0].startTick).toBe(0);
    expect(track.midiClips[0].events.map((e) => e.note)).toEqual([36, 38]);
    expect(s().bpm).toBe(GROOVE.bpm);
  });

  it('asks at another tempo: Change sets the tempo and adds, in one step', async () => {
    song({ bpm: 120 });
    const added = addItemAsTrack(GROOVE);
    const q = await question();
    expect(q).toMatchObject({
      itemId: GROOVE.id,
      itemBpm: GROOVE.bpm,
      songBpm: 120,
    });
    // Nothing is added while it waits.
    expect(s().tracks).toHaveLength(0);

    q.answer(true);
    expect(await added).toBe(true);
    expect(s().bpm).toBe(GROOVE.bpm);
    expect(s().tracks).toHaveLength(1);

    expect(historyLabels()).toEqual([`Add ${GROOVE.name}`]);
    undo();
    expect(s().bpm).toBe(120);
    expect(s().tracks).toHaveLength(0);
  });

  it('keeps the song’s tempo on Keep', async () => {
    song({ bpm: 120 });
    const added = addItemAsTrack(GROOVE);
    (await question()).answer(false);
    expect(await added).toBe(true);
    expect(s().bpm).toBe(120);
    expect(s().tracks).toHaveLength(1);
  });

  it('adds nothing on Cancel', async () => {
    song({ bpm: 120 });
    const added = addItemAsTrack(GROOVE);
    (await question()).answer(null);
    expect(await added).toBe(false);
    expect(s().bpm).toBe(120);
    expect(s().tracks).toHaveLength(0);
    expect(historyLabels()).toEqual([]);
  });

  it('says so and adds nothing when its notes don’t load', async () => {
    song({ bpm: GROOVE.bpm! });
    h.loadEvents = async () => null;
    expect(await addItemAsTrack(GROOVE)).toBe(false);
    expect(s().tracks).toHaveLength(0);
    expect(h.toasts).toContainEqual(
      expect.objectContaining({ title: 'That groove didn’t load' }),
    );
    expect(useBrowserStore.getState().adding).toEqual([]);
  });
});

describe('at the track limit', () => {
  function full() {
    useStore.setState(useStore.getInitialState(), true);
    for (let i = 0; i < MAX_TOTAL_TRACKS; i++) {
      s().addTrack('midi', 'soundfont', `Keys ${i}`);
    }
    useStore.setState({ rootNote: null, bpm: 120 });
    song();
  }

  it('adds no part and writes no key', async () => {
    full();
    const before = s().tracks;
    expect(await addItemAsTrack(KEYS)).toBe(false);
    expect(s().tracks).toBe(before);
    expect(s().rootNote).toBeNull();
    expect(h.toasts).toContainEqual(
      expect.objectContaining({ title: 'Track limit reached' }),
    );
    expect(historyLabels()).toEqual([]);
  });

  it('loads no groove and asks nothing', async () => {
    full();
    expect(await addItemAsTrack(GROOVE)).toBe(false);
    expect(h.grooveCalls).toEqual([]);
    expect(useBrowserStore.getState().question).toBeNull();
    expect(s().bpm).toBe(120);
    expect(s().tracks).toHaveLength(MAX_TOTAL_TRACKS);
  });
});

describe('a kit, a sound and a patch', () => {
  it('sets the kit in the write that makes the track', async () => {
    const kit = kitItem(DRUM_KIT_CONFIGS.find((k) => k.id === '808')!);
    const firstWrites: Array<string | undefined> = [];
    const stop = useStore.subscribe((state, prev) => {
      if (state.tracks.length > prev.tracks.length) {
        firstWrites.push(state.tracks[state.tracks.length - 1].drumKit);
      }
    });
    await addItemAsTrack(kit);
    stop();

    expect(firstWrites).toEqual(['808']);
    expect(s().tracks[0]).toMatchObject({
      instrument: 'drum-machine',
      drumKit: '808',
      trackRole: 'drums',
      name: kit.name,
    });
    expect(s().tracks[0].midiClips).toEqual([]);
  });

  it('makes a Studio sound the track’s instrument and program', async () => {
    const preset = PRESETS.find((p) => p.name === 'Brass Ensemble')!;
    await addItemAsTrack(studioPresetItem(preset));
    expect(s().tracks[0]).toMatchObject({
      instrument: 'soundfont',
      gmProgram: 61,
      presetName: 'Brass Ensemble',
      name: 'Brass Ensemble',
    });
  });

  it('seeds an Oracle factory patch for the new synth track', async () => {
    await addItemAsTrack(synthPresetItem('oracle', 'PAD'));
    const track = s().tracks[0];
    expect(track).toMatchObject({
      instrument: 'oracle-synth',
      presetName: 'PAD',
      trackRole: 'chords',
    });
    const pad = FACTORY_PRESETS.find((p) => p.name === 'PAD')!;
    expect(getTrackSynthState(track.id)).toEqual(
      synthTrackStateFromPreset(pad, s().bpm),
    );
  });
});

describe('a template', () => {
  const pop = templateItem(
    PROJECT_TEMPLATES.find((t) => t.id === 'project-pop')!,
  );

  it('opens through openSession and adds nothing', async () => {
    expect(await addItem(pop)).toBe(false);
    expect(h.openSession).toHaveBeenCalledWith(
      { kind: 'template', templateId: 'project-pop' },
      { source: 'library' },
    );
    expect(s().tracks).toHaveLength(0);
  });

  it('is refused in a room', async () => {
    song({ roomId: 'room-1' });
    expect(await addItem(pop)).toBe(false);
    expect(h.openSession).not.toHaveBeenCalled();
  });
});

describe('a drop', () => {
  let keys = '';
  let drums = '';

  beforeEach(() => {
    keys = s().addTrack('midi', 'soundfont', 'Keys');
    drums = s().addTrack('midi', 'drum-machine', 'Drums');
    song({ ...C_MAJOR, bpm: GROOVE.bpm!, selectedTrackId: null });
  });

  it('suits a part to a melodic lane and a groove to a drum lane', () => {
    const [k, d] = s().tracks;
    expect(fitsLane(KEYS, k)).toBe(true);
    expect(fitsLane(KEYS, d)).toBe(false);
    expect(fitsLane(GROOVE, d)).toBe(true);
    expect(fitsLane(GROOVE, k)).toBe(false);
  });

  it('puts a part on the lane it falls on, at that bar, keeping its sound', async () => {
    expect(await addItem(KEYS, { trackId: keys, tick: 2 * BAR })).toBe(true);
    expect(s().tracks).toHaveLength(2);
    const track = s().tracks.find((t) => t.id === keys)!;
    expect(track.instrument).toBe('soundfont');
    expect(track.name).toBe('Keys');
    expect(track.midiClips).toHaveLength(1);
    expect(track.midiClips[0].startTick).toBe(2 * BAR);
    expect(s().selectedTrackId).toBe(keys);
  });

  it('puts a groove on a drum lane', async () => {
    expect(await addItem(GROOVE, { trackId: drums, tick: BAR })).toBe(true);
    expect(s().tracks).toHaveLength(2);
    const track = s().tracks.find((t) => t.id === drums)!;
    expect(track.midiClips.map((c) => c.startTick)).toEqual([BAR]);
  });

  it('is refused on a lane a collaborator holds', async () => {
    song({
      remoteUsers: new Map([
        [
          7,
          {
            userId: 'sam',
            userName: 'Sam',
            selectedTrackId: keys,
          } as unknown as UserPresence,
        ],
      ]),
    });
    const before = s().tracks;
    expect(await addItem(KEYS, { trackId: keys, tick: BAR })).toBe(false);
    expect(s().tracks).toBe(before);
    expect(h.toasts).toContainEqual(
      expect.objectContaining({
        title: 'Track locked',
        description: 'Sam is editing this track',
      }),
    );
  });

  it('adds the row last dragged when the drop names it', async () => {
    useBrowserStore.getState().setDragging(KEYS);
    useBrowserStore.getState().setDragging(null);
    expect(await dropLibraryItem(GROOVE.id, { trackId: keys, tick: 0 })).toBe(
      false,
    );
    expect(await dropLibraryItem(KEYS.id, { trackId: keys, tick: BAR })).toBe(
      true,
    );
    const track = s().tracks.find((t) => t.id === keys)!;
    expect(track.midiClips.map((c) => c.startTick)).toEqual([BAR]);
  });

  it('makes a new track for a part dropped on a drum lane, at that bar', async () => {
    expect(await addItem(KEYS, { trackId: drums, tick: 3 * BAR })).toBe(true);
    expect(s().tracks).toHaveLength(3);
    expect(s().tracks.find((t) => t.id === drums)!.midiClips).toEqual([]);
    const made = s().tracks[2];
    expect(made.name).toBe(KEYS.name);
    expect(made).toMatchObject({ instrument: 'soundfont', gmProgram: 4 });
    expect(made.midiClips[0].startTick).toBe(3 * BAR);
  });
});

describe('what a load overtakes', () => {
  it('writes nothing when a new session opened during the load', async () => {
    song({ bpm: GROOVE.bpm! });
    h.loadEvents = async () => {
      bumpSessionGeneration('test');
      return HITS;
    };
    expect(await addItemAsTrack(GROOVE)).toBe(false);
    expect(s().tracks).toHaveLength(0);
    expect(historyLabels()).toEqual([]);
    expect(useBrowserStore.getState().adding).toEqual([]);
  });

  // The question can wait through an open of another project (a session
  // change also takes it down, BrowserPanel): its answer adds nothing there.
  it('writes nothing when a new session opened while the tempo question waited', async () => {
    song({ bpm: 120 });
    const added = addItemAsTrack(GROOVE);
    const q = await question();
    bumpSessionGeneration('test');
    q.answer(true);
    expect(await added).toBe(false);
    expect(s().tracks).toHaveLength(0);
    expect(s().bpm).toBe(120);
  });
});

describe('the dock after an add', () => {
  it.each([
    ['a part', () => KEYS, 'piano-roll'],
    ['a groove', () => GROOVE, 'piano-roll'],
    [
      'a kit',
      () => kitItem(DRUM_KIT_CONFIGS.find((k) => k.id === 'natural')!),
      'controls',
    ],
    ['a patch', () => synthPresetItem('oracle', 'BASS'), 'controls'],
  ] as const)('opens on what %s made', async (_, item, tab) => {
    song({ ...C_MAJOR, bpm: GROOVE.bpm!, channelStripTab: null });
    expect(await addItemAsTrack(item())).toBe(true);
    expect(s().channelStripTab).toBe(tab);
  });

  it('is left alone during a lesson', async () => {
    song({
      ...C_MAJOR,
      bpm: GROOVE.bpm!,
      channelStripTab: null,
      activeTutorialId: 'hiphop-build-the-beat',
    });
    expect(await addItemAsTrack(KEYS)).toBe(true);
    expect(await addItemAsTrack(GROOVE)).toBe(true);
    expect(s().channelStripTab).toBeNull();
  });
});

// Review fixes (2.14).
describe('what a waiting question and a load meet', () => {
  it('makes a new drum track when the lane it was dropped on went while the question waited', async () => {
    const keys = s().addTrack('midi', 'soundfont', 'Keys');
    const drums = s().addTrack('midi', 'drum-machine', 'Drums');
    song({ ...C_MAJOR, bpm: 120 });
    const added = addItem(GROOVE, { trackId: drums, tick: BAR });
    const q = await question();
    s().removeTrack(drums);
    expect(s().tracks.map((t) => t.id)).toEqual([keys]);

    q.answer(true);
    expect(await added).toBe(true);
    expect(s().bpm).toBe(GROOVE.bpm);
    expect(s().tracks).toHaveLength(2);
    const made = s().tracks[1];
    expect(made.id).not.toBe(drums);
    expect(made).toMatchObject({
      instrument: 'drum-machine',
      drumKit: GROOVE.kit,
      name: GROOVE.name,
    });
    expect(made.midiClips.map((c) => c.startTick)).toEqual([BAR]);

    // The tempo change and the new track are one step.
    expect(historyLabels().at(-1)).toBe(`Add ${GROOVE.name}`);
    undo();
    expect(s().bpm).toBe(120);
    expect(s().tracks.map((t) => t.id)).toEqual([keys]);
  });

  it('fills the key of a keyless song whose key lock was left on', async () => {
    // An undone key change can leave the lock on with no key.
    song({ rootNote: null, rootLocked: true });
    expect(await addItemAsTrack(KEYS)).toBe(true);
    expect(s().rootNote).toBe(KEYS.key.tonic);
    expect(s().mode).toBe(KEYS.key.mode);
    const label = shortKeyLabel(KEYS.key.tonic, KEYS.key.mode);
    expect(h.toasts).toContainEqual(
      expect.objectContaining({ title: `Your song is now in ${label}` }),
    );
  });

  it('claims no key it couldn’t set', async () => {
    song({ rootNote: null, setRootNote: () => {} });
    expect(await addItemAsTrack(KEYS)).toBe(true);
    expect(s().rootNote).toBeNull();
    expect(
      h.toasts.some((t) => t.title?.startsWith('Your song is now in')),
    ).toBe(false);
  });

  it('asks at the designed groove’s tempo and adds it on its kit', async () => {
    const designed: DrumGroove = {
      id: GROOVE.grooveId,
      name: GROOVE.name,
      status: 'live',
      timeSignature: [3, 4],
      feltBeats: 3,
      bars: 2,
      tempo: 120,
      tempoUnit: 'quarter',
      swing: 50,
      grid: '16n',
      kit: '808',
      padGains: {},
      humanize: { timing: 0, velocity: 0 },
      hits: [],
    };
    h.liveGroove = designed;
    // The row as listed before the designed groove loaded: the catalog's
    // tempo and kit.
    const listed = { ...GROOVE, bpm: 60, kit: 'natural' };
    song({ bpm: 100 });
    const added = addItemAsTrack(listed);
    const q = await question();
    expect(q).toMatchObject({ itemBpm: 120, songBpm: 100 });

    q.answer(true);
    expect(await added).toBe(true);
    expect(s().bpm).toBe(120);
    const track = s().tracks[0];
    expect(track.drumKit).toBe('808');
    expect(track.midiClips[0].durationTicks).toBe(patternTicks(designed));
  });

  it('makes no track for a SERUM patch that doesn’t load', async () => {
    useSynthStore.setState({ packPresets: [] });
    const patch = synthPresetItem('pack', 'Glass Pad', 'Pad');
    expect(await addItemAsTrack(patch)).toBe(false);
    expect(s().tracks).toHaveLength(0);
    expect(h.toasts).toContainEqual(
      expect.objectContaining({ title: 'That sound didn’t load' }),
    );
    expect(useBrowserStore.getState().adding).toEqual([]);
    expect(historyLabels()).toEqual([]);
  });

  it('cancels a waiting tempo question when a new session opens', async () => {
    song({ bpm: 120 });
    const added = addItemAsTrack(GROOVE);
    await question();
    bumpSessionGeneration('test');
    // Nobody answers: the new session's cancel resolves the add.
    expect(await added).toBe(false);
    expect(useBrowserStore.getState().question).toBeNull();
    expect(s().tracks).toHaveLength(0);
    expect(s().bpm).toBe(120);
    expect(historyLabels()).toEqual([]);
  });
});
