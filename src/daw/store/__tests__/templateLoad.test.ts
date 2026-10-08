// @vitest-environment jsdom
/**
 * Opening a project template is a load (decisions D4, D10). The dashboard
 * tile and the Library panel both open one through seedTemplate inside
 * replaceSession, which keeps the work it replaces. The template's project
 * must start from a new project's state, not from the one it replaces:
 * before, a Library click kept the last project's chords, key, markers,
 * metre, mastering, marks and cloud id, so a Save overwrote that project
 * with the template.
 *
 * - Every key a new project starts over with is at initialProjectState()'s
 *   value, but the template's own: its tracks (the registry's new-track
 *   defaults in the template's colours), tempo and genre settings.
 * - The session generation moves on once, before the store shows the
 *   template, and the template goes in as one store write.
 * - Prefs, the room identity, devices and the clipboard carry on.
 * - It never opens while a collab room is connected: its write goes past
 *   the collab middleware, so the room's doc would keep the old project, and
 *   the next edit's diff would delete it from the room. The Library panel
 *   refuses in a room first (and while a take records); the slice throws as
 *   the backstop.
 *
 * Run: npx vitest run src/daw/store/__tests__/templateLoad.test.ts
 */
import * as Y from 'yjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setBridge } from '@/daw/collab/collabMiddleware';
import {
  getYChordRegions,
  getYMarkers,
  getYTracks,
  hydrateDocFromStore,
} from '@/daw/collab/YjsDocManager';
import { ZustandYjsBridge } from '@/daw/collab/ZustandYjsBridge';
import { PROJECT_TEMPLATES } from '@/daw/data/projectTemplates';
import {
  PREF_KEYS,
  RESET_ON_NEW_KEYS,
  STORE_FIELDS,
  type StoreDataKey,
} from '@/daw/persistence/projectDocument/fields';
import { initialProjectState } from '@/daw/persistence/projectDocument/initialState';
import { initialTrackDefaults } from '@/daw/persistence/projectDocument/trackDefaults';
import {
  getSessionGeneration,
  onSessionGeneration,
} from '@/daw/session/sessionGeneration';
import { genreSettings } from '../genreSettings';
import { useStore } from '../index';

const s = () => useStore.getState();
const POP = PROJECT_TEMPLATES.find((t) => t.id === 'project-pop');
if (!POP) throw new Error('the Pop template is missing');

/** The keys a template sets itself; every other reset key starts over. */
const TEMPLATE_KEYS: readonly StoreDataKey[] = [
  'tracks',
  'nextColorIndex',
  'selectedTrackId',
  'bpm',
  'genre',
  'swing',
  'strumMode',
  'strumAmount',
  'rhythmName',
];

/** A project worked on: something in every corner a template must clear. */
function leaveAProjectBehind(): void {
  s().setProjectId('cloud-project-1');
  s().setProjectName('Blue Hour');
  s().setComposerName('Sam');
  const keys = s().addTrack('midi', 'piano-sampler', 'Keys');
  s().addMidiClip(keys, {
    id: 'verse',
    startTick: 0,
    events: [
      { note: 60, velocity: 90, startTick: 0, durationTicks: 480, channel: 0 },
    ],
  });
  s().setRootNote(2);
  s().toggleRootLock();
  s().setTimeSignature(3, 4);
  s().insertChordRegion(0, '1 maj', 'D maj');
  s().addMarker(1920, 'Bridge');
  s().addMasteringFx('compressor');
  s().setMasterVolume(0.3);
  s().setScoreSystemBreaks([4]);
  s().setScoreSpellings(['x|C#4']);
  s().setLoopRange(960, 3840);
  s().setLoopEnabled(true);
  s().setActiveTool('scissors');
  s().setTimelineZoom(3);
  s().setChannelStripTab('fx');
  s().setChordRecordMode('locked');
  s().setClipColorMode('prism');
  s().addChord('1 major');
}

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
});

afterEach(() => {
  setBridge(null);
  vi.restoreAllMocks();
});

describe('a template opened over a project', () => {
  it('starts every other key a new project resets from initialProjectState()', () => {
    leaveAProjectBehind();
    s().loadProjectTemplate(POP.id);

    const fresh = initialProjectState() as Record<string, unknown>;
    const state = s() as unknown as Record<string, unknown>;
    const leftOver = RESET_ON_NEW_KEYS.filter(
      (key) => !TEMPLATE_KEYS.includes(key),
    ).filter((key) => {
      try {
        expect(state[key]).toEqual(fresh[key]);
        return false;
      } catch {
        return true;
      }
    });
    expect(leftOver).toEqual([]);
    // Spelled out for the ones that used to stay.
    expect(s().projectId).toBeNull();
    expect(s().chordRegions).toEqual([]);
    expect(s().rootNote).toBeNull();
    expect(s().rootLocked).toBe(false);
    expect(s().markers).toEqual([]);
    expect(s().timeSignatureNumerator).toBe(4);
    expect(s().masteringFxChain).toEqual([]);
  });

  it("holds the template's tracks, tempo and genre", () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    leaveAProjectBehind();
    s().loadProjectTemplate(POP.id);

    const firstMidi = POP.tracks.findIndex((def) => def.type === 'midi');
    expect(s().tracks).toHaveLength(POP.tracks.length);
    s().tracks.forEach((track, i) => {
      const def = POP.tracks[i];
      expect(track).toStrictEqual({
        id: track.id,
        ...initialTrackDefaults(def.instrument, def.name),
        type: def.type,
        color: def.color,
        ...(i === firstMidi ? { recordArmed: true, monitoring: true } : {}),
      });
    });
    expect(s().selectedTrackId).toBe(s().tracks[firstMidi].id);
    expect(s().nextColorIndex).toBe(POP.tracks.length);
    expect(s().bpm).toBe(POP.bpm);
    expect(s()).toMatchObject(genreSettings(POP.genre));
  });

  it('applies the genre as choosing it in Prism does', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    s().loadProjectTemplate(POP.id);
    const viaTemplate = genreFields();
    s().selectGenre(POP.genre);
    expect(genreFields()).toEqual(viaTemplate);
  });

  it('moves the session generation on once, before the store shows it', () => {
    leaveAProjectBehind();
    const before = getSessionGeneration();
    const seen: string[] = [];
    const stop = onSessionGeneration((gen, reason) => {
      seen.push(`${gen} ${reason}: ${s().tracks.map((t) => t.name)}`);
    });
    const unsubscribe = useStore.subscribe(() => {
      seen.push(`write in ${getSessionGeneration()}`);
    });
    s().loadProjectTemplate(POP.id);
    stop();
    unsubscribe();

    expect(seen).toEqual([
      `${before + 1} template: Keys`,
      `write in ${before + 1}`,
    ]);
  });

  it('leaves prefs, the room identity, devices and the clipboard alone', () => {
    useStore.setState({
      metronomeEnabled: true,
      countInBars: 2,
      timelineSnapEnabled: false,
      chordRulerShowNotes: true,
      roomId: 'room-1',
      inputs: [{ id: 'kbd', name: 'Keys', type: 'input' }],
      clipboardClips: [{ id: 'copied', startTick: 0, events: [] }],
    });
    const before = s();
    s().loadProjectTemplate(POP.id);

    const carried = (Object.keys(STORE_FIELDS) as StoreDataKey[]).filter(
      (key) => !STORE_FIELDS[key].resetOnNew,
    );
    expect(carried).toEqual(expect.arrayContaining([...PREF_KEYS]));
    const moved = carried.filter((key) => s()[key] !== before[key]);
    expect(moved).toEqual([]);
  });

  it('changes nothing for a template that does not exist', () => {
    leaveAProjectBehind();
    const before = s();
    const generation = getSessionGeneration();
    s().loadProjectTemplate('project-nope');
    expect(s()).toBe(before);
    expect(getSessionGeneration()).toBe(generation);
  });

  it('opens every template with its own tracks and the first MIDI one armed', () => {
    for (const template of PROJECT_TEMPLATES) {
      leaveAProjectBehind();
      s().loadProjectTemplate(template.id);
      expect(s().tracks.map((t) => [t.name, t.instrument, t.color])).toEqual(
        template.tracks.map((def) => [def.name, def.instrument, def.color]),
      );
      const armed = s().tracks.filter((t) => t.recordArmed && t.monitoring);
      expect(armed.map((t) => t.id)).toEqual([s().selectedTrackId]);
      expect(armed[0]?.type).toBe('midi');
    }
  });
});

describe('a template that must not open', () => {
  it('throws while a collab room is connected, changing nothing', () => {
    leaveAProjectBehind();
    const syncToYjs = vi.fn();
    setBridge({
      suppressStoreToYjs: false,
      syncToYjs,
    } as unknown as ZustandYjsBridge);
    const before = s();
    const generation = getSessionGeneration();

    expect(() => s().loadProjectTemplate(POP.id)).toThrow(/collab room/);
    expect(s()).toBe(before);
    expect(getSessionGeneration()).toBe(generation);
    expect(syncToYjs).not.toHaveBeenCalled();
  });

  it("keeps a connected room's project whole through the next edit", () => {
    // The project everyone in the room shares.
    const keys = s().addTrack('midi', 'piano-sampler', 'Keys');
    s().addTrack('midi', 'bass-electric', 'Bass');
    s().insertChordRegion(0, '1 maj', 'C maj');
    s().addMarker(1920, 'Bridge');
    // Joined as CollabProvider joins one.
    const doc = new Y.Doc();
    hydrateDocFromStore(doc, s());
    const bridge = new ZustandYjsBridge(
      doc,
      (partial) => useStore.setState(partial),
      () => useStore.getState(),
      (listener) => useStore.subscribe(listener),
    );
    setBridge(bridge);
    bridge.startObserving();
    const room = () => ({
      tracks: getYTracks(doc)
        .toArray()
        .map((m) => m.get('name')),
      chords: getYChordRegions(doc).length,
      markers: getYMarkers(doc).length,
    });
    const shared = room();
    expect(shared).toEqual({ tracks: ['Keys', 'Bass'], chords: 1, markers: 1 });

    expect(() => s().loadProjectTemplate(POP.id)).toThrow();
    // An ordinary edit's diff runs from what the store holds. Had the
    // template gone in, it would have run from the template, which the room
    // never had, and deleted every track the room holds.
    s().updateTrack(keys, { volume: 0.5 });
    expect(room()).toEqual(shared);
    bridge.destroy();
  });

  it('opens over a room identity with no connection left', () => {
    // A student who stepped out of a room (to the dashboard, say) keeps its
    // identity until they leave it for good. No write can reach the room
    // then, and the dashboard's template tile must still open.
    leaveAProjectBehind();
    useStore.setState({ roomId: 'room-1' });
    s().loadProjectTemplate(POP.id);
    expect(s().tracks.map((t) => t.name)).toEqual(
      POP.tracks.map((def) => def.name),
    );
    expect(s().roomId).toBe('room-1');
  });
});

function genreFields() {
  const { genre, swing, strumMode, strumAmount, rhythmName } = s();
  return { genre, swing, strumMode, strumAmount, rhythmName };
}
